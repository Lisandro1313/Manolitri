import db from '../db/index.js';

class RelationshipManager {
    // Valores iniciales de relación
    static DEFAULT_RELATIONSHIP = {
        confianza: 5,
        respeto: 5,
        miedo: 0,
        resentimiento: 0
    };

    // Obtener relación entre dos entidades
    getRelationship(fromId, toId, fromType = 'player', toType = 'player') {
        const rel = db.prepare(`
      SELECT * FROM relationships 
      WHERE from_id = ? AND to_id = ? AND from_type = ? AND to_type = ?
    `).get(fromId, toId, fromType, toType);

        if (!rel) return null;

        return {
            ...rel,
            valores: JSON.parse(rel.valores)
        };
    }

    // Crear o actualizar relación
    setRelationship(fromId, toId, valores, fromType = 'player', toType = 'player') {
        const existing = this.getRelationship(fromId, toId, fromType, toType);

        if (existing) {
            // Actualizar
            db.prepare(`
        UPDATE relationships 
        SET valores = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE from_id = ? AND to_id = ? AND from_type = ? AND to_type = ?
      `).run(JSON.stringify(valores), fromId, toId, fromType, toType);
        } else {
            // Crear nueva
            db.prepare(`
        INSERT INTO relationships (from_id, to_id, from_type, to_type, valores)
        VALUES (?, ?, ?, ?, ?)
      `).run(fromId, toId, fromType, toType, JSON.stringify(valores));
        }
    }

    // Modificar relación (sumar/restar valores)
    modifyRelationship(fromId, toId, cambios, fromType = 'player', toType = 'player') {
        let rel = this.getRelationship(fromId, toId, fromType, toType);

        if (!rel) {
            // Crear con valores por defecto
            rel = {
                valores: { ...RelationshipManager.DEFAULT_RELATIONSHIP }
            };
        }

        const newValores = { ...rel.valores };

        for (const [key, change] of Object.entries(cambios)) {
            if (newValores[key] !== undefined) {
                newValores[key] += change;
                newValores[key] = Math.max(0, Math.min(10, newValores[key]));
            }
        }

        this.setRelationship(fromId, toId, newValores, fromType, toType);
        return newValores;
    }

    // Obtener todas las relaciones de un jugador
    getPlayerRelationships(playerId) {
        const relationships = db.prepare(`
      SELECT * FROM relationships 
      WHERE (from_id = ? AND from_type = 'player') OR (to_id = ? AND to_type = 'player')
    `).all(playerId, playerId);

        return relationships.map(rel => ({
            ...rel,
            valores: JSON.parse(rel.valores)
        }));
    }

    // Calcular modificador de relación para una acción
    getRelationshipModifier(playerId, targetId, targetType = 'player') {
        const rel = this.getRelationship(playerId, targetId, 'player', targetType);

        if (!rel) return 0;

        let modifier = 0;
        const { confianza, respeto, miedo, resentimiento } = rel.valores;

        // Alta confianza ayuda
        if (confianza > 7) modifier += 2;

        // Alto respeto ayuda
        if (respeto > 7) modifier += 1;

        // Alto miedo puede ayudar en intimidación
        if (miedo > 7) modifier += 1;

        // Alto resentimiento perjudica
        if (resentimiento > 7) modifier -= 3;

        return modifier;
    }

    // Obtener reputación general de un jugador en una locación
    getLocationReputation(playerId, locationId) {
        // Obtener todos los jugadores y NPCs en la locación
        const playersInLocation = db.prepare('SELECT id FROM players WHERE lugar_actual = ?').all(locationId);
        const npcsInLocation = db.prepare('SELECT id FROM npcs WHERE lugar_actual = ?').all(locationId);

        let totalRespeto = 0;
        let totalMiedo = 0;
        let count = 0;

        // Sumar respeto y miedo de todos
        for (const player of playersInLocation) {
            if (player.id === playerId) continue;

            const rel = this.getRelationship(player.id, playerId, 'player', 'player');
            if (rel) {
                totalRespeto += rel.valores.respeto;
                totalMiedo += rel.valores.miedo;
                count++;
            }
        }

        for (const npc of npcsInLocation) {
            const rel = this.getRelationship(npc.id, playerId, 'npc', 'player');
            if (rel) {
                totalRespeto += rel.valores.respeto;
                totalMiedo += rel.valores.miedo;
                count++;
            }
        }

        if (count === 0) return { respeto: 5, miedo: 0, reputacion: 'desconocido' };

        const promedioRespeto = totalRespeto / count;
        const promedioMiedo = totalMiedo / count;

        let reputacion = 'neutral';
        if (promedioRespeto > 7) reputacion = 'respetado';
        else if (promedioRespeto < 3) reputacion = 'despreciado';
        else if (promedioMiedo > 7) reputacion = 'temido';

        return {
            respeto: promedioRespeto,
            miedo: promedioMiedo,
            reputacion
        };
    }

    // Propagar cambio de reputación (cuando haces algo público)
    propagateReputationChange(playerId, locationId, cambio) {
        const playersInLocation = db.prepare('SELECT id FROM players WHERE lugar_actual = ?').all(locationId);
        const npcsInLocation = db.prepare('SELECT id FROM npcs WHERE lugar_actual = ?').all(locationId);

        // Aplicar cambio a todos en la locación
        for (const player of playersInLocation) {
            if (player.id === playerId) continue;
            this.modifyRelationship(player.id, playerId, cambio, 'player', 'player');
        }

        for (const npc of npcsInLocation) {
            this.modifyRelationship(npc.id, playerId, cambio, 'npc', 'player');
        }
    }

    // Sistema de alianzas
    isAlly(playerId1, playerId2) {
        const rel = this.getRelationship(playerId1, playerId2);
        if (!rel) return false;

        return rel.valores.confianza > 7 && rel.valores.respeto > 6;
    }

    // Sistema de enemigos
    isEnemy(playerId1, playerId2) {
        const rel = this.getRelationship(playerId1, playerId2);
        if (!rel) return false;

        return rel.valores.resentimiento > 7 || (rel.valores.confianza < 3 && rel.valores.respeto < 3);
    }
}

export default new RelationshipManager();
