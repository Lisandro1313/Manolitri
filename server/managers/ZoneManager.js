/**
 * ZoneManager
 * Gestiona todas las zonas del mundo abierto:
 * - Carga zonas de la DB
 * - Rastrea jugadores en cada zona
 * - Maneja movimiento entre zonas
 * - Broadcast de mensajes/eventos por zona
 * - NPCs y POIs por zona
 */

const db = require('../db');

class ZoneManager {
    constructor() {
        // Mapa de zonas: { zoneId: { ...zoneData, players: [characterIds] } }
        this.zones = new Map();

        // Mapa de jugador -> zona: { characterId: zoneId }
        this.playerLocations = new Map();

        // Cache de NPCs por zona
        this.npcsByZone = new Map();
    }

    /**
     * Inicializar: Cargar todas las zonas de la DB
     */
    async initialize() {
        console.log('🌍 Inicializando ZoneManager...');

        const rows = await db.all('SELECT * FROM zones');

        for (const row of rows) {
            const zone = {
                id: row.id,
                nombre: row.nombre,
                tipo: row.tipo,
                descripcion: row.descripcion,
                nivel_minimo: row.nivel_minimo,
                nivel_recomendado: row.nivel_recomendado,
                conexiones: JSON.parse(row.conexiones || '[]'),
                npcs: JSON.parse(row.npcs || '[]'),
                pois: JSON.parse(row.pois || '[]'),
                eventos: JSON.parse(row.eventos || '[]'),
                clima: row.clima,
                players: [] // Jugadores actualmente en la zona
            };

            this.zones.set(zone.id, zone);
        }

        console.log(`✅ ${this.zones.size} zonas cargadas`);
    }

    /**
     * Obtener información de una zona
     */
    getZone(zoneId) {
        return this.zones.get(zoneId);
    }

    /**
     * Obtener todas las zonas
     */
    getAllZones() {
        return Array.from(this.zones.values()).map(z => ({
            id: z.id,
            nombre: z.nombre,
            tipo: z.tipo,
            nivel_recomendado: z.nivel_recomendado,
            jugadores_online: z.players.length
        }));
    }

    /**
     * Añadir jugador a una zona (al hacer login o moverse)
     */
    addPlayerToZone(characterId, zoneId) {
        const zone = this.zones.get(zoneId);

        if (!zone) {
            console.error(`❌ Zona ${zoneId} no existe`);
            return false;
        }

        // Si ya estaba en otra zona, removerlo
        const currentZone = this.playerLocations.get(characterId);
        if (currentZone && currentZone !== zoneId) {
            this.removePlayerFromZone(characterId);
        }

        // Añadir a nueva zona
        if (!zone.players.includes(characterId)) {
            zone.players.push(characterId);
        }

        this.playerLocations.set(characterId, zoneId);

        console.log(`🚶 Jugador ${characterId} entró a zona ${zone.nombre}`);
        return true;
    }

    /**
     * Remover jugador de su zona actual (logout o movimiento)
     */
    removePlayerFromZone(characterId) {
        const zoneId = this.playerLocations.get(characterId);

        if (!zoneId) return;

        const zone = this.zones.get(zoneId);
        if (zone) {
            zone.players = zone.players.filter(id => id !== characterId);
        }

        this.playerLocations.delete(characterId);

        console.log(`👋 Jugador ${characterId} salió de zona ${zoneId}`);
    }

    /**
     * Mover jugador de una zona a otra
     */
    async movePlayer(characterId, targetZoneId, wsServer) {
        const currentZoneId = this.playerLocations.get(characterId);
        const currentZone = currentZoneId ? this.zones.get(currentZoneId) : null;
        const targetZone = this.zones.get(targetZoneId);

        if (!targetZone) {
            return {
                success: false,
                error: 'Zona no existe'
            };
        }

        // Verificar que las zonas estén conectadas
        if (currentZone && !currentZone.conexiones.includes(targetZoneId)) {
            return {
                success: false,
                error: 'No puedes ir directamente a esa zona'
            };
        }

        // Actualizar DB
        await db.run(
            'UPDATE characters SET zona_actual = ? WHERE id = ?',
            [targetZoneId, characterId]
        );

        // Notificar a la zona actual que el jugador se va
        if (currentZone && wsServer) {
            this.broadcastToZone(currentZoneId, {
                type: 'zone:player_left',
                characterId,
                zoneName: currentZone.nombre
            }, wsServer, characterId);
        }

        // Mover jugador
        this.addPlayerToZone(characterId, targetZoneId);

        // Notificar a la nueva zona que llegó un jugador
        if (wsServer) {
            this.broadcastToZone(targetZoneId, {
                type: 'zone:player_joined',
                characterId,
                zoneName: targetZone.nombre
            }, wsServer, characterId);
        }

        return {
            success: true,
            zone: this.getZoneData(targetZoneId)
        };
    }

    /**
     * Obtener zona actual de un jugador
     */
    getPlayerZone(characterId) {
        const zoneId = this.playerLocations.get(characterId);
        return zoneId ? this.zones.get(zoneId) : null;
    }

    /**
     * Obtener todos los jugadores en una zona
     */
    getPlayersInZone(zoneId) {
        const zone = this.zones.get(zoneId);
        return zone ? zone.players : [];
    }

    /**
     * Obtener datos completos de una zona (para enviar al cliente)
     */
    getZoneData(zoneId) {
        const zone = this.zones.get(zoneId);

        if (!zone) return null;

        return {
            id: zone.id,
            nombre: zone.nombre,
            tipo: zone.tipo,
            descripcion: zone.descripcion,
            nivel_recomendado: zone.nivel_recomendado,
            conexiones: zone.conexiones,
            npcs: zone.npcs,
            pois: zone.pois,
            clima: zone.clima,
            jugadores_count: zone.players.length
        };
    }

    /**
     * Broadcast mensaje a todos los jugadores en una zona
     * @param {string} zoneId - ID de la zona
     * @param {object} message - Mensaje a enviar
     * @param {object} wsServer - Servidor WebSocket
     * @param {number} excludeCharacterId - No enviar a este jugador (opcional)
     */
    broadcastToZone(zoneId, message, wsServer, excludeCharacterId = null) {
        const zone = this.zones.get(zoneId);

        if (!zone || !wsServer) return;

        const players = excludeCharacterId
            ? zone.players.filter(id => id !== excludeCharacterId)
            : zone.players;

        // Enviar mensaje a cada jugador en la zona
        players.forEach(characterId => {
            wsServer.sendToCharacter(characterId, message);
        });
    }

    /**
     * Obtener NPCs de una zona (con datos completos de la DB)
     */
    async getNPCsInZone(zoneId) {
        const zone = this.zones.get(zoneId);

        if (!zone) return [];

        // Si ya están en cache, devolverlos
        if (this.npcsByZone.has(zoneId)) {
            return this.npcsByZone.get(zoneId);
        }

        // Cargar NPCs de la DB
        const npcIds = zone.npcs;
        const npcs = [];

        for (const npcId of npcIds) {
            const npc = await db.get('SELECT * FROM npcs WHERE id = ?', [npcId]);
            if (npc) {
                npcs.push({
                    id: npc.id,
                    nombre: npc.nombre,
                    tipo: npc.tipo,
                    raza: npc.raza,
                    descripcion: npc.descripcion,
                    nivel: npc.nivel,
                    hostil: npc.hostil === 1
                });
            }
        }

        // Guardar en cache
        this.npcsByZone.set(zoneId, npcs);

        return npcs;
    }

    /**
     * Obtener zonas conectadas a una zona
     */
    getConnectedZones(zoneId) {
        const zone = this.zones.get(zoneId);

        if (!zone) return [];

        return zone.conexiones.map(connId => {
            const connZone = this.zones.get(connId);
            return connZone ? {
                id: connZone.id,
                nombre: connZone.nombre,
                tipo: connZone.tipo,
                nivel_recomendado: connZone.nivel_recomendado
            } : null;
        }).filter(z => z !== null);
    }

    /**
     * Verificar si un jugador puede entrar a una zona (por nivel)
     */
    canEnterZone(playerLevel, zoneId) {
        const zone = this.zones.get(zoneId);

        if (!zone) return false;

        return playerLevel >= zone.nivel_minimo;
    }

    /**
     * Obtener estadísticas de todas las zonas
     */
    getStats() {
        const stats = {
            total_zones: this.zones.size,
            total_players_online: this.playerLocations.size,
            zones_by_type: {},
            most_populated: []
        };

        // Contar por tipo
        this.zones.forEach(zone => {
            stats.zones_by_type[zone.tipo] = (stats.zones_by_type[zone.tipo] || 0) + 1;
        });

        // Zonas más pobladas
        const sortedZones = Array.from(this.zones.values())
            .sort((a, b) => b.players.length - a.players.length)
            .slice(0, 5);

        stats.most_populated = sortedZones.map(z => ({
            nombre: z.nombre,
            jugadores: z.players.length
        }));

        return stats;
    }
}

// Singleton
const zoneManager = new ZoneManager();

module.exports = zoneManager;
