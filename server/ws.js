import { WebSocketServer } from 'ws';
import db from './db/index.js';
import locationManager from './world/locations.js';
import eventManager from './world/events.js';
import npcManager from './world/npcs.js';
import statsManager from './systems/stats.js';
import enemyManager from './world/enemies.js';
import combatManager from './systems/combat.js';
import inventoryManager from './systems/inventory.js';
import questManager from './world/quests.js';
import worldSimulation from './world/simulation.js';
import itemSystem from './systems/itemSystem.js';
import globalEvents from './world/globalEvents.js';

class GameWebSocket {
    constructor() {
        this.clients = new Map(); // Map de playerId -> ws
        this.wss = null;
    }

    initialize(server) {
        this.wss = new WebSocketServer({ server });

        this.wss.on('connection', (ws) => {
            console.log('Nueva conexión WebSocket');

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleMessage(ws, message);
                } catch (error) {
                    console.error('Error procesando mensaje:', error);
                    ws.send(JSON.stringify({ tipo: 'error', mensaje: 'Mensaje inválido' }));
                }
            });

            ws.on('close', () => {
                // Remover cliente
                for (const [playerId, client] of this.clients.entries()) {
                    if (client === ws) {
                        this.clients.delete(playerId);
                        console.log(`Jugador ${playerId} desconectado`);
                        break;
                    }
                }
            });
        });

        console.log('✓ WebSocket servidor inicializado');
    }

    handleMessage(ws, message) {
        const { tipo, data } = message;

        switch (tipo) {
            case 'login':
                this.handleLogin(ws, data);
                break;

            case 'chat':
                this.handleChat(ws, data);
                break;

            case 'mover':
                this.handleMove(ws, data);
                break;

            case 'accion_evento':
                this.handleEventAction(ws, data);
                break;

            case 'accion_social':
                this.handleSocialAction(ws, data);
                break;

            case 'solicitar_estado':
                this.handleRequestState(ws, data);
                break;

            // ===== COMBATE DESACTIVADO TEMPORALMENTE =====
            // case 'iniciar_combate':
            //     this.handleStartCombat(ws, data);
            //     break;

            // case 'atacar':
            //     this.handleAttack(ws, data);
            //     break;

            // case 'huir':
            // case 'huir_combate':
            //     this.handleFlee(ws, data);
            //     break;

            // ===== INVENTARIO DESACTIVADO TEMPORALMENTE =====
            // case 'obtener_inventario':
            //     this.handleGetInventory(ws, data);
            //     break;

            // case 'equipar_item':
            //     this.handleEquipItem(ws, data);
            //     break;

            // case 'usar_item':
            //     this.handleUseItem(ws, data);
            //     break;

            // Quests
            case 'obtener_misiones':
            case 'obtener_quests':
                this.handleGetQuests(ws, data);
                break;

            case 'aceptar_mision':
            case 'aceptar_quest':
                this.handleAcceptQuest(ws, data);
                break;

            case 'completar_mision':
            case 'completar_quest':
                this.handleCompleteQuest(ws, data);
                break;

            case 'crear_mision_jugador':
            case 'crear_quest_jugador':
                this.handleCreatePlayerQuest(ws, data);
                break;

            // NPCs
            case 'hablar_npc':
                this.handleTalkToNPC(ws, data);
                break;

            case 'responder_dialogo':
                this.handleDialogueResponse(ws, data);
                break;

            // Inventario
            case 'obtener_inventario':
                this.handleGetInventory(ws, data);
                break;

            // Simulación del mundo
            case 'obtener_estado_mundo':
                this.handleGetWorldState(ws, data);
                break;

            case 'solicitar_datos_jugador':
                this.handleRefreshPlayerData(ws, data);
                break;

            default:
                ws.send(JSON.stringify({ tipo: 'error', mensaje: 'Tipo de mensaje desconocido' }));
        }
    }

    // LOGIN
    handleLogin(ws, data) {
        const { alias } = data;

        if (!alias || alias.length < 3) {
            ws.send(JSON.stringify({ tipo: 'error', mensaje: 'Alias debe tener al menos 3 caracteres' }));
            return;
        }

        // Buscar o crear jugador
        let player = db.prepare('SELECT * FROM players WHERE alias = ?').get(alias);

        if (!player) {
            // Crear nuevo jugador
            const result = db.prepare(`
        INSERT INTO players (alias, lugar_actual, stats, estado_emocional)
        VALUES (?, 'hospital', ?, ?)
      `).run(
                alias,
                JSON.stringify(statsManager.constructor.DEFAULT_STATS),
                JSON.stringify(statsManager.constructor.DEFAULT_EMOTIONS)
            );

            player = db.prepare('SELECT * FROM players WHERE id = ?').get(result.lastInsertRowid);

            // Dar misiones iniciales del Hospital Act 1
            const initialQuests = [100, 101, 105]; // Bienvenido, Conoce a los Supervivientes, Primer Día
            initialQuests.forEach(questId => {
                db.prepare(`
                    INSERT OR IGNORE INTO player_quests (player_id, quest_id, estado, progreso)
                    VALUES (?, ?, 'activa', '{}')
                `).run(player.id, questId);
            });
        }

        // Actualizar last_seen
        db.prepare('UPDATE players SET last_seen = CURRENT_TIMESTAMP WHERE id = ?').run(player.id);

        // Registrar cliente
        this.clients.set(player.id, ws);

        // Parsear JSON
        player.stats = JSON.parse(player.stats);
        player.estado_emocional = JSON.parse(player.estado_emocional);

        // Enviar confirmación
        ws.send(JSON.stringify({
            tipo: 'login_exitoso',
            jugador: player
        }));

        // Enviar estado de locación
        const locationState = locationManager.getLocationState(player.lugar_actual);
        ws.send(JSON.stringify({
            tipo: 'estado_lugar',
            lugar: locationState
        }));

        // Notificar a otros en el lugar
        this.broadcastToLocation(player.lugar_actual, {
            tipo: 'jugador_entro',
            jugador: { id: player.id, alias: player.alias }
        }, player.id);

        // 🚨 VERIFICAR EVENTOS GLOBALES
        setTimeout(() => {
            const eventoGlobal = globalEvents.checkActiveGlobalEvents(player.id);
            if (eventoGlobal) {
                console.log(`🚨 Evento global detectado para ${player.alias}`);

                if (eventoGlobal.tipo === 'consulta_privada') {
                    // Ana consulta en privado
                    ws.send(JSON.stringify({
                        tipo: 'dialogo',
                        npc: eventoGlobal.npc,
                        dialogo: eventoGlobal.dialogo
                    }));
                } else if (eventoGlobal.tipo === 'anuncio_publico') {
                    // Anuncio público
                    ws.send(JSON.stringify({
                        tipo: 'evento_global',
                        mensaje: eventoGlobal.mensaje,
                        dialogo_siguiente: eventoGlobal.dialogo_siguiente
                    }));
                }
            }
        }, 2000); // 2 segundos después del login
    }

    // CHAT
    handleChat(ws, data) {
        const { playerId, mensaje } = data;

        const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
        if (!player) return;

        // Guardar mensaje
        db.prepare(`
      INSERT INTO messages (lugar, autor_id, autor_tipo, mensaje, tipo)
      VALUES (?, ?, 'player', ?, 'chat')
    `).run(player.lugar_actual, playerId, mensaje);

        // Broadcast a todos en el lugar
        this.broadcastToLocation(player.lugar_actual, {
            tipo: 'mensaje_chat',
            autor: player.alias,
            mensaje,
            timestamp: new Date().toISOString()
        });
    }

    // MOVER A OTRO LUGAR
    handleMove(ws, data) {
        const { playerId, destinoId } = data;

        const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
        if (!player) return;

        const lugarActual = locationManager.getLocation(player.lugar_actual);

        // Verificar que el destino esté conectado
        if (!lugarActual.conexiones.includes(destinoId)) {
            ws.send(JSON.stringify({ tipo: 'error', mensaje: 'No puedes ir a ese lugar desde aquí' }));
            return;
        }

        // Notificar salida
        this.broadcastToLocation(player.lugar_actual, {
            tipo: 'jugador_salio',
            jugador: { id: player.id, alias: player.alias },
            destino: destinoId
        }, playerId);

        // Mover jugador
        const result = locationManager.movePlayer(playerId, destinoId);

        if (result.success) {
            // Enviar nuevo estado
            const locationState = locationManager.getLocationState(destinoId);
            ws.send(JSON.stringify({
                tipo: 'movimiento_exitoso',
                lugar: locationState
            }));

            // Notificar entrada
            this.broadcastToLocation(destinoId, {
                tipo: 'jugador_entro',
                jugador: { id: player.id, alias: player.alias }
            }, playerId);
        }
    }

    // ACCIÓN EN EVENTO
    async handleEventAction(ws, data) {
        const { playerId, eventoId, accionIndex } = data;

        const result = eventManager.playerChooseAction(eventoId, playerId, accionIndex);

        if (!result.success) {
            ws.send(JSON.stringify({ tipo: 'error', mensaje: result.error }));
            return;
        }

        // Enviar confirmación
        ws.send(JSON.stringify({
            tipo: 'accion_registrada',
            eventoId,
            accion: result.accion
        }));

        // Notificar a otros en el lugar
        const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
        this.broadcastToLocation(player.lugar_actual, {
            tipo: 'jugador_actuo',
            jugador: player.alias,
            eventoId
        }, playerId);
    }

    // ACCIÓN SOCIAL
    async handleSocialAction(ws, data) {
        const { playerId, targetId, targetType, accionTipo } = data;

        // Implementar lógica de acción social
        // Por ahora, enviar confirmación
        ws.send(JSON.stringify({
            tipo: 'accion_social_resultado',
            mensaje: 'Acción social procesada'
        }));
    }

    // SOLICITAR ESTADO ACTUAL
    handleRequestState(ws, data) {
        const { playerId } = data;

        const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
        if (!player) return;

        const locationState = locationManager.getLocationState(player.lugar_actual);

        ws.send(JSON.stringify({
            tipo: 'estado_lugar',
            lugar: locationState
        }));
    }

    // BROADCAST A UNA LOCACIÓN
    broadcastToLocation(locationId, message, excludePlayerId = null) {
        const playersInLocation = db.prepare('SELECT id FROM players WHERE lugar_actual = ?').all(locationId);

        for (const player of playersInLocation) {
            if (player.id === excludePlayerId) continue;

            const ws = this.clients.get(player.id);
            if (ws && ws.readyState === 1) { // 1 = OPEN
                ws.send(JSON.stringify(message));
            }
        }
    }

    // BROADCAST GLOBAL
    broadcastGlobal(message) {
        for (const ws of this.clients.values()) {
            if (ws.readyState === 1) {
                ws.send(JSON.stringify(message));
            }
        }
    }

    // ===== COMBATE =====

    handleStartCombat(ws, data) {
        const { playerId, enemyId } = data;
        const result = combatManager.startCombat(playerId, enemyId);

        if (!result.success) {
            ws.send(JSON.stringify({ tipo: 'error', mensaje: result.error }));
            return;
        }

        ws.send(JSON.stringify({
            tipo: 'combate_iniciado',
            enemy: result.enemy,
            mensaje: result.mensaje
        }));

        // Notificar a otros en el lugar
        const player = db.prepare('SELECT lugar_actual FROM players WHERE id = ?').get(playerId);
        this.broadcastToLocation(player.lugar_actual, {
            tipo: 'jugador_entro_combate',
            playerId,
            enemyId
        }, playerId);
    }

    async handleAttack(ws, data) {
        const { playerId, enemyId } = data;
        const result = await combatManager.attackEnemy(playerId, enemyId);

        if (!result.success) {
            ws.send(JSON.stringify({ tipo: 'error', mensaje: result.error }));
            return;
        }

        // Actualizar stats del jugador
        const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
        const updatedPlayer = {
            ...player,
            stats: JSON.parse(player.stats),
            estado_emocional: JSON.parse(player.estado_emocional)
        };

        ws.send(JSON.stringify({
            tipo: 'resultado_ataque',
            ...result,
            playerStats: updatedPlayer.stats
        }));

        // Si el enemigo murió, notificar a todos y actualizar estado
        if (result.enemyDied) {
            this.broadcastToLocation(player.lugar_actual, {
                tipo: 'enemigo_muerto',
                enemyId,
                playerId
            }, playerId);
            this.handleRequestState(ws, { playerId });
        }

        // Si el jugador murió
        if (result.playerDied) {
            // Mover al refugio
            db.prepare('UPDATE players SET lugar_actual = ? WHERE id = ?').run('refugio', playerId);
            this.handleRequestState(ws, { playerId });
        }
    }

    handleFlee(ws, data) {
        const { playerId, enemyId } = data;
        const result = combatManager.fleeCombat(playerId, enemyId);

        ws.send(JSON.stringify({
            tipo: 'resultado_huida',
            ...result
        }));

        if (result.escaped) {
            this.handleRequestState(ws, { playerId });
        }
    }

    // ===== INVENTARIO =====

    handleGetInventory(ws, data) {
        const { playerId } = data;
        const inventory = inventoryManager.getPlayerInventory(playerId);
        const gold = inventoryManager.getGold(playerId);
        const player = db.prepare('SELECT peso_actual, peso_maximo FROM players WHERE id = ?').get(playerId);

        ws.send(JSON.stringify({
            tipo: 'inventario',
            items: inventory,
            oro: gold,
            peso_actual: player.peso_actual,
            peso_maximo: player.peso_maximo
        }));
    }

    handleEquipItem(ws, data) {
        const { playerId, inventarioId } = data;
        const result = inventoryManager.equipItem(playerId, inventarioId);

        if (!result.success) {
            ws.send(JSON.stringify({ tipo: 'error', mensaje: result.error }));
            return;
        }

        ws.send(JSON.stringify({
            tipo: 'item_equipado',
            mensaje: 'Item equipado correctamente'
        }));

        this.handleGetInventory(ws, { playerId });
    }

    handleUseItem(ws, data) {
        const { playerId, itemId } = data;
        const result = inventoryManager.useItem(playerId, itemId);

        if (!result.success) {
            ws.send(JSON.stringify({ tipo: 'error', mensaje: result.error }));
            return;
        }

        // Actualizar stats
        const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
        const updatedPlayer = {
            ...player,
            stats: JSON.parse(player.stats)
        };

        ws.send(JSON.stringify({
            tipo: 'item_usado',
            efecto: result.efecto,
            playerStats: updatedPlayer.stats
        }));

        this.handleGetInventory(ws, { playerId });
    }

    // ===== QUESTS =====

    handleGetQuests(ws, data) {
        const { playerId } = data;
        const player = db.prepare('SELECT lugar_actual FROM players WHERE id = ?').get(playerId);

        const available = questManager.getAvailableQuests(player.lugar_actual, playerId);
        const active = questManager.getActiveQuests(playerId);

        ws.send(JSON.stringify({
            tipo: 'quests',
            disponibles: available,
            activas: active
        }));
    }

    handleAcceptQuest(ws, data) {
        const { playerId, questId } = data;
        const result = questManager.acceptQuest(playerId, questId);

        if (!result.success) {
            ws.send(JSON.stringify({ tipo: 'error', mensaje: result.error }));
            return;
        }

        ws.send(JSON.stringify({
            tipo: 'quest_aceptada',
            quest: result.quest,
            mensaje: result.mensaje
        }));

        this.handleGetQuests(ws, { playerId });
    }

    handleCompleteQuest(ws, data) {
        const { playerId, questId } = data;
        const result = questManager.completeQuest(playerId, questId);

        if (!result.success) {
            ws.send(JSON.stringify({ tipo: 'error', mensaje: result.error }));
            return;
        }

        ws.send(JSON.stringify({
            tipo: 'quest_completada',
            quest: result.quest,
            recompensas: result.recompensas,
            mensaje: result.mensaje
        }));

        // Actualizar jugador
        this.handleRequestState(ws, { playerId });
        this.handleGetQuests(ws, { playerId });
    }

    handleCreatePlayerQuest(ws, data) {
        const { playerId, titulo, descripcion, objetivos, recompensas, ubicacion } = data;
        const result = questManager.createPlayerQuest(playerId, titulo, descripcion, objetivos, recompensas, ubicacion);

        if (!result.success) {
            ws.send(JSON.stringify({ tipo: 'error', mensaje: result.error }));
            return;
        }

        ws.send(JSON.stringify({
            tipo: 'quest_creada',
            questId: result.questId,
            mensaje: result.mensaje
        }));

        // Notificar a jugadores en la ubicación
        this.broadcastToLocation(ubicacion, {
            tipo: 'nueva_quest_disponible',
            questId: result.questId
        }, playerId);
    }

    // ===== NPCs Y DIÁLOGOS =====

    // ===== DIÁLOGOS (NUEVO SISTEMA FLAG-BASED) =====

    handleTalkToNPC(ws, data) {
        const { playerId, npcId } = data;

        // Usar nuevo sistema DialogueEngine
        const dialogue = npcManager.startDialogueV2(npcId, playerId);

        if (!dialogue) {
            // NPC existe en DB pero no tiene diálogos definidos aún
            const npcData = db.prepare('SELECT * FROM npcs WHERE id = ?').get(npcId);
            if (npcData) {
                ws.send(JSON.stringify({
                    tipo: 'dialogo',
                    npc: { id: npcId, nombre: npcData.nombre },
                    dialogo: {
                        id: 'generico',
                        texto: `${npcData.nombre} no tiene nada que decir en este momento.`,
                        opciones: [{ texto: 'Adiós', consecuencias: {}, siguiente: null }]
                    }
                }));
            } else {
                ws.send(JSON.stringify({ tipo: 'error', mensaje: 'NPC no encontrado' }));
            }
            return;
        }

        ws.send(JSON.stringify({
            tipo: 'dialogo',
            ...dialogue
        }));
    }

    async handleDialogueResponse(ws, data) {
        const { playerId, npcId, dialogoId, opcionIndex } = data;

        console.log(`📝 Procesando respuesta de diálogo:`, {
            playerId,
            npcId,
            dialogoId,
            opcionIndex
        });

        // Usar nuevo sistema DialogueEngine
        const result = await npcManager.processDialogueResponseV2(
            npcId,
            playerId,
            opcionIndex,
            dialogoId
        );

        if (!result.success) {
            console.error(`❌ Error procesando diálogo: ${result.error}`);
            ws.send(JSON.stringify({ tipo: 'error', mensaje: result.error || 'Error al procesar diálogo' }));
            return;
        }

        console.log(`✅ Diálogo procesado correctamente`);

        ws.send(JSON.stringify({
            tipo: 'dialogo_respuesta',
            ...result
        }));

        // Si hay consecuencias que afectan quests, actualizar inventario
        if (result.consecuencias && result.consecuencias.length > 0) {
            this.handleGetInventory(ws, { playerId });
        }
    }

    // ===== INVENTARIO =====

    handleGetInventory(ws, data) {
        const { playerId } = data;

        if (!playerId) {
            ws.send(JSON.stringify({ tipo: 'error', mensaje: 'Player ID requerido' }));
            return;
        }

        const inventario = itemSystem.getInventory(playerId);

        ws.send(JSON.stringify({
            tipo: 'inventario',
            items: inventario
        }));
    }

    // ===== SIMULACIÓN DEL MUNDO =====

    handleGetWorldState(ws, data) {
        const worldState = worldSimulation.getWorldState();

        ws.send(JSON.stringify({
            tipo: 'estado_mundo',
            mundo: worldState
        }));
    }
}

export default new GameWebSocket();
