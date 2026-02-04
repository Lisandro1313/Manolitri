import db from '../db/index.js';
import enemyManager from './enemies.js';

class LocationManager {
    // Obtener todas las locaciones
    getAllLocations() {
        return db.prepare('SELECT * FROM locations').all();
    }

    // Obtener una locación por ID
    getLocation(locationId) {
        const location = db.prepare('SELECT * FROM locations WHERE id = ?').get(locationId);
        if (!location) return null;

        // Parsear JSON
        location.conexiones = JSON.parse(location.conexiones);
        location.recursos = JSON.parse(location.recursos);

        return location;
    }

    // Obtener jugadores en una locación
    getPlayersInLocation(locationId) {
        const players = db.prepare('SELECT id, alias, nivel, reputacion FROM players WHERE lugar_actual = ?').all(locationId);
        return players;
    }

    // Obtener NPCs en una locación
    getNPCsInLocation(locationId) {
        const npcs = db.prepare('SELECT * FROM npcs WHERE lugar_actual = ? AND estado = ?').all(locationId, 'activo');
        return npcs.map(npc => ({
            ...npc,
            personalidad: JSON.parse(npc.personalidad),
            estado_emocional: JSON.parse(npc.estado_emocional),
            memoria: JSON.parse(npc.memoria || '[]')
        }));
    }

    // Mover jugador a nueva locación
    movePlayer(playerId, newLocationId) {
        const location = this.getLocation(newLocationId);
        if (!location) return { success: false, error: 'Locación no existe' };

        db.prepare('UPDATE players SET lugar_actual = ? WHERE id = ?').run(newLocationId, playerId);
        return { success: true, location };
    }

    // Obtener estado completo de una locación
    getLocationState(locationId) {
        const location = this.getLocation(locationId);
        if (!location) return null;

        return {
            ...location,
            jugadores: this.getPlayersInLocation(locationId),
            npcs: this.getNPCsInLocation(locationId),
            eventos: this.getActiveEvents(locationId),
            enemigos: enemyManager.getEnemiesInLocation(locationId)
        };
    }

    // Obtener eventos activos en locación
    getActiveEvents(locationId) {
        const events = db.prepare('SELECT * FROM events WHERE lugar = ? AND estado = ?').all(locationId, 'activo');
        return events.map(event => ({
            ...event,
            opciones: JSON.parse(event.opciones),
            participantes: JSON.parse(event.participantes || '[]'),
            resultados: JSON.parse(event.resultados || '{}')
        }));
    }
}

export default new LocationManager();
