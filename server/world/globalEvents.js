import db from '../db/index.js';
import flagSystem from '../systems/flagSystem.js';
import dialogueEngine from '../systems/dialogueEngine.js';

/**
 * GlobalEvents - Gestiona eventos narrativos globales que afectan a todos
 */

class GlobalEvents {
    constructor() {
        this.activeGlobalEvent = null;
    }

    /**
     * Verifica si debe gatillarse el evento de racionamiento
     * @param {number} playerId 
     * @returns {boolean}
     */
    shouldTriggerRacionamiento(playerId) {
        // No gatillar si ya se inició
        if (flagSystem.has(playerId, 'evento_racionamiento_iniciado')) {
            return false;
        }

        // Gatillar si completó la quest 103 (medicina de Teresa)
        if (flagSystem.has(playerId, 'quest_103_completed')) {
            return true;
        }

        // O si han pasado 3 días desde el primer login (placeholder)
        const player = db.prepare('SELECT created_at FROM players WHERE id = ?').get(playerId);
        if (player) {
            const createdAt = new Date(player.created_at);
            const now = new Date();
            const daysSince = (now - createdAt) / (1000 * 60 * 60 * 24);
            return daysSince >= 3;
        }

        return false;
    }

    /**
     * Gatilla el evento de racionamiento
     * @param {number} playerId 
     * @returns {object}
     */
    triggerRacionamiento(playerId) {
        console.log(`🚨 Gatillando evento de racionamiento para player ${playerId}`);

        // Marcar el flag
        flagSystem.set(playerId, 'evento_racionamiento_iniciado');

        // Verificar si Ana confía en el jugador (consulta privada)
        const relacion = this.getRelacion(playerId, 'npc_ana');

        if (relacion >= 10) {
            // Ana te consulta primero
            const dialogo = dialogueEngine.getDialogueById('evento_racionamiento_consulta_ana', playerId);
            return {
                tipo: 'consulta_privada',
                npc: dialogueEngine.getNPC('npc_ana'),
                dialogo
            };
        } else {
            // Anuncio público directo - Ana no te consulta
            return {
                tipo: 'anuncio_publico',
                mensaje: 'Ana reúne a todos en el refugio. Va a anunciar algo importante.',
                dialogo_siguiente: 'evento_racionamiento_decision'
            };
        }
    }

    /**
     * Obtiene la relación con un NPC
     * @param {number} playerId 
     * @param {string} npcId 
     * @returns {number}
     */
    getRelacion(playerId, npcId) {
        try {
            const stmt = db.prepare(`
                SELECT relacion FROM player_npc_relations 
                WHERE player_id = ? AND npc_id = ?
            `);
            const result = stmt.get(playerId, npcId);
            return result ? result.relacion : 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Verifica si hay algún evento global activo para el jugador
     * @param {number} playerId 
     * @returns {object|null}
     */
    checkActiveGlobalEvents(playerId) {
        // Verificar evento de racionamiento
        if (this.shouldTriggerRacionamiento(playerId)) {
            return this.triggerRacionamiento(playerId);
        }

        // Aquí se pueden agregar más eventos globales en el futuro
        // if (this.shouldTriggerInvasion(playerId)) { ... }

        return null;
    }

    /**
     * Obtiene el estado del evento de racionamiento para un jugador
     * @param {number} playerId 
     * @returns {object}
     */
    getRacionamientoState(playerId) {
        return {
            iniciado: flagSystem.has(playerId, 'evento_racionamiento_iniciado'),
            resuelto: flagSystem.has(playerId, 'evento_racionamiento_resuelto'),
            decision: this.getPlayerDecision(playerId),
            consecuencias: this.getConsequences(playerId)
        };
    }

    /**
     * Obtiene la decisión que tomó el jugador
     * @param {number} playerId 
     * @returns {string|null}
     */
    getPlayerDecision(playerId) {
        if (flagSystem.has(playerId, 'player_apoyo_ana_publico')) return 'apoyo_ana';
        if (flagSystem.has(playerId, 'player_apoyo_gomez_publico')) return 'apoyo_gomez';
        if (flagSystem.has(playerId, 'player_propuso_huida')) return 'propuso_huida';
        if (flagSystem.has(playerId, 'player_revelo_secreto_gomez')) return 'revelo_secreto';
        if (flagSystem.has(playerId, 'player_silencio_evento')) return 'silencio';
        return null;
    }

    /**
     * Obtiene las consecuencias del evento
     * @param {number} playerId 
     * @returns {object}
     */
    getConsequences(playerId) {
        return {
            gomez_arrestado: flagSystem.has(playerId, 'gomez_arrestado'),
            gomez_ejecutado: flagSystem.has(playerId, 'gomez_ejecutado'),
            gomez_expulsado: flagSystem.has(playerId, 'gomez_expulsado'),
            gomez_perdonado: flagSystem.has(playerId, 'gomez_perdonado'),
            ana_autoridad_reforzada: flagSystem.has(playerId, 'ana_autoridad_reforzada'),
            refugio_dividido: flagSystem.has(playerId, 'refugio_dividido'),
            nina_abandono_refugio: flagSystem.has(playerId, 'nina_abandono_refugio'),
            refugio_autoritario: flagSystem.has(playerId, 'refugio_autoritario')
        };
    }

    /**
     * Crea notificación de evento global
     * @param {number} playerId 
     * @param {string} mensaje 
     */
    notifyGlobalEvent(playerId, mensaje) {
        db.prepare(`
            INSERT INTO messages (lugar, autor_id, autor_tipo, mensaje, tipo)
            VALUES ('refugio', 'sistema', 'sistema', ?, 'evento_global')
        `).run(mensaje);
    }
}

export default new GlobalEvents();
