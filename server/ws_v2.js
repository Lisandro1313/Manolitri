/**
 * WebSocket Server - Versión 2.0
 * Maneja comunicación en tiempo real con clientes
 */

const WebSocket = require('ws');

function setupWebSocket(server, managers) {
    const { zoneManager, characterManager, partyManager, instanceManager } = managers;

    const wss = new WebSocket.Server({ server });

    // Mapa de conexiones: { characterId: ws }
    const connections = new Map();

    // Mapa de ws -> characterId
    const wsToCharacter = new Map();

    console.log('🔌 WebSocket Server inicializado');

    // ====================================
    // FUNCIONES AUXILIARES
    // ====================================

    function sendToCharacter(characterId, message) {
        const ws = connections.get(characterId);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    function broadcast(message, excludeCharacterId = null) {
        connections.forEach((ws, characterId) => {
            if (characterId !== excludeCharacterId && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(message));
            }
        });
    }

    // ====================================
    // CONEXIÓN
    // ====================================

    wss.on('connection', (ws) => {
        console.log('🔗 Nueva conexión WebSocket');

        let characterId = null;
        let accountId = null;

        // ====================================
        // MENSAJES DEL CLIENTE
        // ====================================

        ws.on('message', async (data) => {
            try {
                const message = JSON.parse(data);
                const { type, payload } = message;

                // ====================================
                // AUTENTICACIÓN Y PERSONAJES
                // ====================================

                if (type === 'character:select') {
                    const { accountId: accId, characterId: charId } = payload;

                    const result = await characterManager.selectCharacter(accId, charId);

                    if (result.success) {
                        characterId = charId;
                        accountId = accId;

                        connections.set(characterId, ws);
                        wsToCharacter.set(ws, characterId);

                        // Añadir a zona actual
                        zoneManager.addPlayerToZone(characterId, result.character.zona_actual);

                        ws.send(JSON.stringify({
                            type: 'character:selected',
                            character: result.character,
                            zone: zoneManager.getZoneData(result.character.zona_actual)
                        }));

                        // Notificar a zona
                        zoneManager.broadcastToZone(result.character.zona_actual, {
                            type: 'zone:player_joined',
                            characterId,
                            characterName: result.character.nombre
                        }, { sendToCharacter }, characterId);

                        console.log(`✅ ${result.character.nombre} conectado`);
                    } else {
                        ws.send(JSON.stringify({
                            type: 'error',
                            error: result.error
                        }));
                    }
                    return;
                }

                if (type === 'character:create') {
                    const result = await characterManager.createCharacter(payload.accountId, payload);

                    ws.send(JSON.stringify({
                        type: result.success ? 'character:created' : 'error',
                        ...result
                    }));
                    return;
                }

                if (type === 'character:delete') {
                    const result = await characterManager.deleteCharacter(payload.accountId, payload.characterId);

                    ws.send(JSON.stringify({
                        type: result.success ? 'character:deleted' : 'error',
                        ...result
                    }));
                    return;
                }

                // ====================================
                // VERIFICAR AUTENTICACIÓN
                // ====================================

                if (!characterId) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        error: 'Debes seleccionar un personaje primero'
                    }));
                    return;
                }

                // ====================================
                // ZONAS Y MOVIMIENTO
                // ====================================

                if (type === 'zone:move') {
                    const result = await zoneManager.movePlayer(characterId, payload.targetZoneId, { sendToCharacter });

                    if (result.success) {
                        ws.send(JSON.stringify({
                            type: 'zone:moved',
                            zone: result.zone
                        }));
                    } else {
                        ws.send(JSON.stringify({
                            type: 'error',
                            error: result.error
                        }));
                    }
                    return;
                }

                if (type === 'zone:get_info') {
                    const zone = zoneManager.getPlayerZone(characterId);
                    const players = zoneManager.getPlayersInZone(zone.id);
                    const npcs = await zoneManager.getNPCsInZone(zone.id);
                    const connected = zoneManager.getConnectedZones(zone.id);

                    ws.send(JSON.stringify({
                        type: 'zone:info',
                        zone: zoneManager.getZoneData(zone.id),
                        players,
                        npcs,
                        connected_zones: connected
                    }));
                    return;
                }

                // ====================================
                // PARTY (GRUPOS)
                // ====================================

                if (type === 'party:create') {
                    const character = await characterManager.getCharacter(characterId);
                    const result = partyManager.createParty(characterId, character.nombre);

                    ws.send(JSON.stringify({
                        type: result.success ? 'party:created' : 'error',
                        ...result
                    }));
                    return;
                }

                if (type === 'party:invite') {
                    const inviter = await characterManager.getCharacter(characterId);
                    const party = partyManager.getPlayerParty(characterId);

                    if (!party) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            error: 'No estás en un grupo'
                        }));
                        return;
                    }

                    const result = partyManager.invitePlayer(
                        party.id,
                        payload.targetCharacterId,
                        payload.targetCharacterName,
                        characterId
                    );

                    if (result.success) {
                        // Enviar invitación al objetivo
                        sendToCharacter(payload.targetCharacterId, {
                            type: 'party:invite_received',
                            partyId: party.id,
                            inviter: inviter.nombre,
                            miembros_count: party.miembros_count
                        });

                        ws.send(JSON.stringify({
                            type: 'party:invited',
                            targetName: payload.targetCharacterName
                        }));
                    } else {
                        ws.send(JSON.stringify({
                            type: 'error',
                            error: result.error
                        }));
                    }
                    return;
                }

                if (type === 'party:accept') {
                    const character = await characterManager.getCharacter(characterId);
                    const result = partyManager.acceptInvite(payload.partyId, characterId, character.nombre);

                    if (result.success) {
                        // Notificar a todos los miembros del party
                        partyManager.broadcastToParty(payload.partyId, {
                            type: 'party:member_joined',
                            characterName: character.nombre,
                            party: result.party
                        }, { sendToCharacter });

                        ws.send(JSON.stringify({
                            type: 'party:joined',
                            party: result.party
                        }));
                    } else {
                        ws.send(JSON.stringify({
                            type: 'error',
                            error: result.error
                        }));
                    }
                    return;
                }

                if (type === 'party:leave') {
                    const party = partyManager.getPlayerParty(characterId);
                    const result = partyManager.leaveParty(characterId);

                    if (result.success) {
                        if (result.disbanded) {
                            ws.send(JSON.stringify({
                                type: 'party:disbanded'
                            }));
                        } else {
                            // Notificar a miembros restantes
                            partyManager.broadcastToParty(party.id, {
                                type: 'party:member_left',
                                characterId,
                                party: result.party
                            }, { sendToCharacter });

                            ws.send(JSON.stringify({
                                type: 'party:left'
                            }));
                        }
                    }
                    return;
                }

                if (type === 'party:kick') {
                    const party = partyManager.getPlayerParty(characterId);
                    const result = partyManager.kickPlayer(party.id, payload.targetCharacterId, characterId);

                    if (result.success) {
                        // Notificar al expulsado
                        sendToCharacter(result.kickedCharacterId, {
                            type: 'party:kicked'
                        });

                        // Notificar a los demás
                        partyManager.broadcastToParty(party.id, {
                            type: 'party:member_kicked',
                            kickedCharacterId: result.kickedCharacterId,
                            party: result.party
                        }, { sendToCharacter });

                        ws.send(JSON.stringify({
                            type: 'party:player_kicked',
                            party: result.party
                        }));
                    } else {
                        ws.send(JSON.stringify({
                            type: 'error',
                            error: result.error
                        }));
                    }
                    return;
                }

                // ====================================
                // AVENTURAS (INSTANCIAS)
                // ====================================

                if (type === 'adventure:start') {
                    const party = partyManager.getPlayerParty(characterId);

                    if (!party) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            error: 'No estás en un grupo'
                        }));
                        return;
                    }

                    if (party.lider !== characterId) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            error: 'Solo el líder puede iniciar aventuras'
                        }));
                        return;
                    }

                    // Crear instancia
                    const result = await instanceManager.createInstance(
                        party.id,
                        party.miembros,
                        payload.dungeonId
                    );

                    if (result.success) {
                        // Cambiar estado del party
                        partyManager.setPartyState(party.id, 'en_aventura');

                        // Notificar a todos los miembros
                        partyManager.broadcastToParty(party.id, {
                            type: 'adventure:started',
                            instance: result.instance
                        }, { sendToCharacter });
                    } else {
                        ws.send(JSON.stringify({
                            type: 'error',
                            error: result.error
                        }));
                    }
                    return;
                }

                if (type === 'adventure:action') {
                    const result = await instanceManager.processAction(
                        payload.instanceId,
                        characterId,
                        payload.action
                    );

                    if (result.success) {
                        // Obtener instancia actualizada
                        const instance = instanceManager.getInstanceData(payload.instanceId);

                        // Notificar a todo el party
                        const partyId = instance.party_id; // Obtener de instance
                        partyManager.broadcastToParty(partyId, {
                            type: 'adventure:update',
                            instance
                        }, { sendToCharacter });
                    } else {
                        ws.send(JSON.stringify({
                            type: 'error',
                            error: result.error
                        }));
                    }
                    return;
                }

                // ====================================
                // CHAT
                // ====================================

                if (type === 'chat:zone') {
                    const character = await characterManager.getCharacter(characterId);
                    const zone = zoneManager.getPlayerZone(characterId);

                    if (zone) {
                        zoneManager.broadcastToZone(zone.id, {
                            type: 'chat:message',
                            characterId,
                            characterName: character.nombre,
                            message: payload.message,
                            channel: 'zone'
                        }, { sendToCharacter });
                    }
                    return;
                }

                if (type === 'chat:party') {
                    const character = await characterManager.getCharacter(characterId);
                    const party = partyManager.getPlayerParty(characterId);

                    if (party) {
                        partyManager.broadcastToParty(party.id, {
                            type: 'chat:message',
                            characterId,
                            characterName: character.nombre,
                            message: payload.message,
                            channel: 'party'
                        }, { sendToCharacter });
                    }
                    return;
                }

                // ====================================
                // OTROS
                // ====================================

                if (type === 'ping') {
                    ws.send(JSON.stringify({ type: 'pong' }));
                    return;
                }

                console.warn('⚠️ Tipo de mensaje desconocido:', type);

            } catch (error) {
                console.error('❌ Error procesando mensaje:', error);
                ws.send(JSON.stringify({
                    type: 'error',
                    error: 'Error interno del servidor'
                }));
            }
        });

        // ====================================
        // DESCONEXIÓN
        // ====================================

        ws.on('close', () => {
            if (characterId) {
                // Remover de zona
                const zone = zoneManager.getPlayerZone(characterId);
                if (zone) {
                    zoneManager.broadcastToZone(zone.id, {
                        type: 'zone:player_left',
                        characterId
                    }, { sendToCharacter }, characterId);

                    zoneManager.removePlayerFromZone(characterId);
                }

                // Si está en party, notificar
                const party = partyManager.getPlayerParty(characterId);
                if (party) {
                    partyManager.broadcastToParty(party.id, {
                        type: 'party:member_disconnected',
                        characterId
                    }, { sendToCharacter });
                }

                // Remover de mapas
                characterManager.disconnectCharacter(characterId);
                connections.delete(characterId);
                wsToCharacter.delete(ws);

                console.log(`👋 Personaje ${characterId} desconectado`);
            }
        });

        ws.on('error', (error) => {
            console.error('❌ Error en WebSocket:', error);
        });
    });

    // Exponer función para enviar mensajes
    wss.sendToCharacter = sendToCharacter;
    wss.broadcast = broadcast;

    return wss;
}

module.exports = setupWebSocket;
