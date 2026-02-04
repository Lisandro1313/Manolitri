/**
 * EVENT BUS - Sistema centralizado de eventos
 * 
 * ARQUITECTURA:
 * 1. Cualquier acción del juego dispara un evento aquí
 * 2. Sistemas (quests, achievements, stats) se suscriben
 * 3. Cuando ocurre evento, todos los listeners reciben la data
 * 
 * EVENTOS SOPORTADOS:
 * - dialogue.completed: {playerId, npcId, dialogueId}
 * - dialogue.option_chosen: {playerId, npcId, dialogueId, optionId}
 * - item.obtained: {playerId, itemId, cantidad}
 * - item.used: {playerId, itemId}
 * - enemy.killed: {playerId, enemyId, enemyType}
 * - location.visited: {playerId, location}
 * - npc.relationship_changed: {playerId, npcId, change}
 * - player.level_up: {playerId, newLevel}
 * - quest.accepted: {playerId, questId}
 * - quest.completed: {playerId, questId}
 */

class EventBus {
    constructor() {
        this.listeners = new Map(); // evento -> array de callbacks
    }

    /**
     * Suscribirse a un evento
     * @param {string} eventName - Nombre del evento
     * @param {Function} callback - Función a ejecutar cuando ocurre el evento
     * @returns {Function} Función para cancelar la suscripción
     */
    on(eventName, callback) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }

        this.listeners.get(eventName).push(callback);

        // Devolver función para unsub
        return () => {
            const callbacks = this.listeners.get(eventName);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        };
    }

    /**
     * Disparar un evento
     * @param {string} eventName - Nombre del evento
     * @param {Object} data - Datos del evento
     */
    emit(eventName, data) {
        const callbacks = this.listeners.get(eventName);
        if (!callbacks || callbacks.length === 0) return;

        // Ejecutar todos los listeners
        for (const callback of callbacks) {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error en listener de evento ${eventName}:`, error);
            }
        }
    }

    /**
     * Remover todos los listeners de un evento
     * @param {string} eventName - Nombre del evento
     */
    off(eventName) {
        this.listeners.delete(eventName);
    }

    /**
     * Obtener estadísticas de eventos
     */
    getStats() {
        const stats = {};
        for (const [event, callbacks] of this.listeners.entries()) {
            stats[event] = callbacks.length;
        }
        return stats;
    }
}

// Singleton - una sola instancia para todo el servidor
const eventBus = new EventBus();

export default eventBus;
