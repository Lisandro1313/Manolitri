import db from '../db/index.js';

/**
 * FlagSystem - Sistema de flags para tracking de estado narrativo
 * 
 * Las flags son el historial del jugador - nunca se hardcodea lógica.
 * Todo diálogo, quest y consecuencia lee/escribe flags.
 */

class FlagSystem {
    constructor() {
        this.initialized = false;
    }

    /**
     * Inicializa el sistema y crea tabla si no existe
     */
    initialize() {
        if (this.initialized) return;

        try {
            // La tabla se crea en schema.sql, pero verificamos
            const tableExists = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='player_flags'
      `).get();

            if (!tableExists) {
                console.warn('⚠️  Tabla player_flags no existe - ejecutar schema.sql actualizado');
            }

            this.initialized = true;
            console.log('✓ Flag System inicializado');
        } catch (error) {
            console.error('Error al inicializar FlagSystem:', error);
        }
    }

    /**
     * Setea una flag para un jugador
     * @param {number} playerId - ID del jugador
     * @param {string} flagName - Nombre de la flag
     * @returns {boolean} - True si se seteó correctamente
     */
    set(playerId, flagName) {
        try {
            // Verificar si ya existe
            const exists = this.has(playerId, flagName);
            if (exists) {
                return true; // Ya existe, no hacer nada
            }

            const stmt = db.prepare(`
        INSERT INTO player_flags (player_id, flag_name, created_at)
        VALUES (?, ?, datetime('now'))
      `);

            stmt.run(playerId, flagName);

            console.log(`🚩 Flag seteada: ${flagName} (player ${playerId})`);
            return true;
        } catch (error) {
            console.error(`Error al setear flag ${flagName}:`, error);
            return false;
        }
    }

    /**
     * Setea múltiples flags a la vez
     * @param {number} playerId - ID del jugador
     * @param {string[]} flagNames - Array de nombres de flags
     * @returns {boolean} - True si todas se setearon correctamente
     */
    setMany(playerId, flagNames) {
        if (!Array.isArray(flagNames)) return false;

        let success = true;
        for (const flagName of flagNames) {
            if (!this.set(playerId, flagName)) {
                success = false;
            }
        }
        return success;
    }

    /**
     * Verifica si un jugador tiene una flag
     * @param {number} playerId - ID del jugador
     * @param {string} flagName - Nombre de la flag
     * @returns {boolean}
     */
    has(playerId, flagName) {
        try {
            const stmt = db.prepare(`
        SELECT 1 FROM player_flags 
        WHERE player_id = ? AND flag_name = ?
        LIMIT 1
      `);

            const result = stmt.get(playerId, flagName);
            return !!result;
        } catch (error) {
            console.error(`Error al verificar flag ${flagName}:`, error);
            return false;
        }
    }

    /**
     * Verifica si un jugador tiene TODAS las flags requeridas
     * @param {number} playerId - ID del jugador
     * @param {string[]} flagNames - Array de flags requeridas
     * @returns {boolean}
     */
    hasAll(playerId, flagNames) {
        if (!Array.isArray(flagNames) || flagNames.length === 0) {
            return true; // Sin requisitos = cumple
        }

        for (const flagName of flagNames) {
            if (!this.has(playerId, flagName)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Verifica si un jugador NO tiene ninguna de las flags prohibidas
     * @param {number} playerId - ID del jugador
     * @param {string[]} flagNames - Array de flags prohibidas
     * @returns {boolean} - True si NO tiene ninguna
     */
    hasNone(playerId, flagNames) {
        if (!Array.isArray(flagNames) || flagNames.length === 0) {
            return true; // Sin prohibiciones = cumple
        }

        for (const flagName of flagNames) {
            if (this.has(playerId, flagName)) {
                return false; // Tiene una prohibida
            }
        }
        return true; // No tiene ninguna prohibida
    }

    /**
     * Obtiene todas las flags de un jugador
     * @param {number} playerId - ID del jugador
     * @returns {string[]} - Array de nombres de flags
     */
    getAll(playerId) {
        try {
            const stmt = db.prepare(`
        SELECT flag_name FROM player_flags 
        WHERE player_id = ?
        ORDER BY created_at ASC
      `);

            const results = stmt.all(playerId);
            return results.map(r => r.flag_name);
        } catch (error) {
            console.error('Error al obtener flags:', error);
            return [];
        }
    }

    /**
     * Remueve una flag (usar con cuidado - normalmente flags no se borran)
     * @param {number} playerId - ID del jugador
     * @param {string} flagName - Nombre de la flag
     * @returns {boolean}
     */
    remove(playerId, flagName) {
        try {
            const stmt = db.prepare(`
        DELETE FROM player_flags 
        WHERE player_id = ? AND flag_name = ?
      `);

            const result = stmt.run(playerId, flagName);

            if (result.changes > 0) {
                console.log(`🚩 Flag removida: ${flagName} (player ${playerId})`);
                return true;
            }
            return false;
        } catch (error) {
            console.error(`Error al remover flag ${flagName}:`, error);
            return false;
        }
    }

    /**
     * Obtiene estadísticas de flags para debug
     * @param {number} playerId - ID del jugador
     * @returns {object}
     */
    getStats(playerId) {
        const flags = this.getAll(playerId);
        return {
            playerId,
            totalFlags: flags.length,
            flags: flags
        };
    }

    /**
     * Limpia todas las flags de un jugador (usar solo para testing)
     * @param {number} playerId - ID del jugador
     */
    clearAll(playerId) {
        try {
            const stmt = db.prepare(`
        DELETE FROM player_flags WHERE player_id = ?
      `);
            stmt.run(playerId);
            console.log(`🚩 Todas las flags limpiadas (player ${playerId})`);
        } catch (error) {
            console.error('Error al limpiar flags:', error);
        }
    }
}

// Exportar singleton
const flagSystem = new FlagSystem();
export default flagSystem;
