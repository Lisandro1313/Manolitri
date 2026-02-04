import flagSystem from './flagSystem.js';
import itemSystem from './itemSystem.js';
import db from '../db/index.js';

/**
 * DialogueEngine - Motor de diálogos condicionales
 * 
 * Lee definiciones JSON de diálogos y evalúa condiciones dinámicamente.
 * NO hardcodea lógica - todo se basa en flags, items, stats y relaciones.
 */

class DialogueEngine {
    constructor() {
        this.dialogues = new Map(); // id -> dialogue definition
        this.npcs = new Map(); // npc_id -> npc data
        this.initialized = false;
    }

    /**
     * Inicializa el motor con las definiciones de NPCs y diálogos
     * @param {object[]} npcsData - Array de definiciones de NPCs
     * @param {object[]} dialoguesData - Array de definiciones de diálogos
     */
    initialize(npcsData, dialoguesData) {
        try {
            // Cargar NPCs
            for (const npc of npcsData) {
                this.npcs.set(npc.id, npc);
            }

            // Cargar diálogos
            for (const dialogue of dialoguesData) {
                this.dialogues.set(dialogue.id, dialogue);
            }

            this.initialized = true;
            console.log(`✓ DialogueEngine inicializado: ${this.npcs.size} NPCs, ${this.dialogues.size} diálogos`);
        } catch (error) {
            console.error('Error al inicializar DialogueEngine:', error);
        }
    }

    /**
     * Obtiene el diálogo apropiado para un NPC según el estado del jugador
     * @param {string} npcId - ID del NPC
     * @param {number} playerId - ID del jugador
     * @returns {object|null} - Definición del diálogo o null
     */
    getDialogueForNPC(npcId, playerId) {
        if (!this.initialized) {
            console.error('DialogueEngine no inicializado');
            return null;
        }

        // Obtener todos los diálogos del NPC
        const npcDialogues = Array.from(this.dialogues.values())
            .filter(d => d.npc_id === npcId);

        if (npcDialogues.length === 0) {
            console.warn(`No hay diálogos para NPC: ${npcId}`);
            return null;
        }

        // Evaluar condiciones de cada diálogo y retornar el primero que cumpla
        for (const dialogue of npcDialogues) {
            if (this.evaluateConditions(dialogue.condiciones, playerId)) {
                return this.prepareDialogueOptions(dialogue, playerId);
            }
        }

        // Si ninguno cumple, retornar null
        console.warn(`Ningún diálogo cumple condiciones para ${npcId} (player ${playerId})`);
        return null;
    }

    /**
     * Obtiene un diálogo específico por ID
     * @param {string} dialogueId - ID del diálogo
     * @param {number} playerId - ID del jugador
     * @returns {object|null} - Definición del diálogo o null
     */
    getDialogueById(dialogueId, playerId) {
        if (!this.initialized) {
            console.error('DialogueEngine no inicializado');
            return null;
        }

        console.log(`🔍 Buscando diálogo: ${dialogueId} para player ${playerId}`);
        console.log(`📚 Diálogos disponibles:`, Array.from(this.dialogues.keys()));

        const dialogue = this.dialogues.get(dialogueId);
        if (!dialogue) {
            console.warn(`❌ Diálogo no encontrado: ${dialogueId}`);
            return null;
        }

        console.log(`✅ Diálogo encontrado:`, dialogue.texto);

        // Verificar que el jugador cumple condiciones
        if (!this.evaluateConditions(dialogue.condiciones, playerId)) {
            console.warn(`❌ Jugador ${playerId} no cumple condiciones para diálogo ${dialogueId}`);

            // Mostrar qué flags tiene el jugador
            const playerFlags = flagSystem.getAll(playerId);
            console.log(`🚩 Player flags:`, playerFlags);
            console.log(`📋 Condiciones requeridas:`, dialogue.condiciones);

            return null;
        }

        return this.prepareDialogueOptions(dialogue, playerId);
    }

    /**
     * Evalúa si un jugador cumple las condiciones de un diálogo
     * @param {object} condiciones - Objeto de condiciones
     * @param {number} playerId - ID del jugador
     * @returns {boolean}
     */
    evaluateConditions(condiciones, playerId) {
        if (!condiciones) return true;

        // Verificar flags requeridas
        if (condiciones.flags_required && condiciones.flags_required.length > 0) {
            if (!flagSystem.hasAll(playerId, condiciones.flags_required)) {
                return false;
            }
        }

        // Verificar flags prohibidas
        if (condiciones.flags_forbidden && condiciones.flags_forbidden.length > 0) {
            if (!flagSystem.hasNone(playerId, condiciones.flags_forbidden)) {
                return false;
            }
        }

        // Verificar item requerido
        if (condiciones.has_item) {
            if (!itemSystem.has(playerId, condiciones.has_item, 1)) {
                return false;
            }
        }

        // Verificar stats mínimos
        if (condiciones.stat_checks) {
            const player = this.getPlayerStats(playerId);
            if (!player) return false;

            for (const [stat, minValue] of Object.entries(condiciones.stat_checks)) {
                if (!player.stats || player.stats[stat] < minValue) {
                    return false;
                }
            }
        }

        // Verificar relación mínima
        if (condiciones.relacion_minima) {
            for (const [npcId, minValue] of Object.entries(condiciones.relacion_minima)) {
                const relacion = this.getRelacion(playerId, npcId);
                if (relacion < minValue) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Prepara las opciones de un diálogo filtrando las que el jugador puede ver
     * @param {object} dialogue - Definición del diálogo
     * @param {number} playerId - ID del jugador
     * @returns {object} - Diálogo con opciones filtradas
     */
    prepareDialogueOptions(dialogue, playerId) {
        const preparedDialogue = { ...dialogue };

        if (!dialogue.opciones) {
            preparedDialogue.opciones = [];
            return preparedDialogue;
        }

        // Filtrar opciones que el jugador puede ver
        preparedDialogue.opciones = dialogue.opciones.filter(opcion => {
            // Si la opción tiene stat_check, verificar
            if (opcion.stat_check) {
                const player = this.getPlayerStats(playerId);
                if (!player || !player.stats) return false;

                for (const [stat, minValue] of Object.entries(opcion.stat_check)) {
                    if (player.stats[stat] < minValue) {
                        return false; // No mostrar esta opción
                    }
                }
            }

            // Si la opción tiene condiciones propias, evaluarlas
            if (opcion.condiciones) {
                return this.evaluateConditions(opcion.condiciones, playerId);
            }

            return true;
        });

        return preparedDialogue;
    }

    /**
     * Ejecuta las consecuencias de una opción de diálogo
     * @param {object} consecuencias - Objeto de consecuencias
     * @param {number} playerId - ID del jugador
     * @returns {object} - Resultado de las consecuencias
     */
    async executeConsequences(consecuencias, playerId) {
        const result = {
            success: true,
            messages: [],
            nextDialogue: null
        };

        if (!consecuencias) return result;

        try {
            // Setear flags
            if (consecuencias.set_flags && Array.isArray(consecuencias.set_flags)) {
                flagSystem.setMany(playerId, consecuencias.set_flags);
                result.messages.push(`Flags seteadas: ${consecuencias.set_flags.join(', ')}`);
            }

            // Remover flags
            if (consecuencias.remove_flags && Array.isArray(consecuencias.remove_flags)) {
                for (const flag of consecuencias.remove_flags) {
                    flagSystem.remove(playerId, flag);
                }
                result.messages.push(`Flags removidas: ${consecuencias.remove_flags.join(', ')}`);
            }

            // Dar items
            if (consecuencias.give_item) {
                const { id, cantidad } = consecuencias.give_item;
                itemSystem.give(playerId, id, cantidad || 1);
                result.messages.push(`Item obtenido: ${id} (${cantidad || 1})`);
            }

            // Remover items
            if (consecuencias.remove_item) {
                const { id, cantidad } = consecuencias.remove_item;
                const removed = itemSystem.remove(playerId, id, cantidad || 1);
                if (removed) {
                    result.messages.push(`Item removido: ${id} (${cantidad || 1})`);
                } else {
                    result.success = false;
                    result.messages.push(`Error: No tienes suficiente ${id}`);
                }
            }

            // Modificar relaciones
            if (consecuencias.modificar_relacion) {
                for (const [npcId, cambio] of Object.entries(consecuencias.modificar_relacion)) {
                    this.modifyRelacion(playerId, npcId, cambio);
                    result.messages.push(`Relación con ${npcId}: ${cambio > 0 ? '+' : ''}${cambio}`);
                }
            }

            // Dar experiencia con subida de nivel
            if (consecuencias.give_xp) {
                const levelUpResult = this.giveExperience(playerId, consecuencias.give_xp);
                result.messages.push(`+${consecuencias.give_xp} XP`);
                if (levelUpResult && levelUpResult.leveledUp) {
                    result.messages.push(`¡SUBISTE A NIVEL ${levelUpResult.newLevel}!`);
                }
            }

            // Iniciar quest
            if (consecuencias.start_quest) {
                // TODO: Integrar con QuestSystem cuando lo reescribamos
                flagSystem.set(playerId, `quest_${consecuencias.start_quest}_active`);
                result.messages.push(`Nueva quest: ${consecuencias.start_quest}`);
            }

            // Completar quest
            if (consecuencias.complete_quest) {
                // TODO: Integrar con QuestSystem cuando lo reescribamos
                flagSystem.set(playerId, `quest_${consecuencias.complete_quest}_completed`);
                result.messages.push(`Quest completada: ${consecuencias.complete_quest}`);
            }

            // Siguiente diálogo
            if (consecuencias.siguiente) {
                result.nextDialogue = consecuencias.siguiente;
            }

        } catch (error) {
            console.error('Error al ejecutar consecuencias:', error);
            result.success = false;
            result.messages.push('Error al ejecutar consecuencias');
        }

        return result;
    }

    /**
     * Obtiene stats del jugador desde la DB
     * @param {number} playerId
     * @returns {object|null}
     */
    getPlayerStats(playerId) {
        try {
            const stmt = db.prepare('SELECT stats FROM players WHERE id = ?');
            const result = stmt.get(playerId);

            if (!result) return null;

            return {
                stats: result.stats ? JSON.parse(result.stats) : {}
            };
        } catch (error) {
            console.error('Error al obtener stats del jugador:', error);
            return null;
        }
    }

    /**
     * Obtiene la relación entre jugador y NPC
     * @param {number} playerId
     * @param {string} npcId
     * @returns {number} - Valor de relación (default 0)
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
            // Si la tabla no existe, retornar 0
            return 0;
        }
    }

    /**
     * Modifica la relación entre jugador y NPC
     * @param {number} playerId
     * @param {string} npcId
     * @param {number} cambio - Cambio en la relación (+/-)
     */
    modifyRelacion(playerId, npcId, cambio) {
        try {
            // Verificar si existe la relación
            const current = this.getRelacion(playerId, npcId);
            const newValue = current + cambio;

            const stmt = db.prepare(`
        INSERT INTO player_npc_relations (player_id, npc_id, relacion)
        VALUES (?, ?, ?)
        ON CONFLICT(player_id, npc_id) 
        DO UPDATE SET relacion = ?
      `);

            stmt.run(playerId, npcId, newValue, newValue);
            console.log(`💬 Relación ${npcId}: ${current} → ${newValue}`);
        } catch (error) {
            console.error('Error al modificar relación:', error);
        }
    }

    /**
     * Da experiencia al jugador y sube niveles automáticamente
     * @param {number} playerId
     * @param {number} xp
     * @returns {object} - { leveledUp: boolean, newLevel: number }
     */
    giveExperience(playerId, xp) {
        try {
            const player = db.prepare('SELECT nivel, experiencia FROM players WHERE id = ?').get(playerId);
            if (!player) return { leveledUp: false };

            let newXP = player.experiencia + xp;
            let newLevel = player.nivel;
            let leveledUp = false;

            // Sistema de nivel: cada 100 XP = 1 nivel
            while (newXP >= 100) {
                newXP -= 100;
                newLevel++;
                leveledUp = true;
                console.log(`🎉 Jugador ${playerId} subió a nivel ${newLevel}`);
            }

            db.prepare('UPDATE players SET nivel = ?, experiencia = ? WHERE id = ?')
                .run(newLevel, newXP, playerId);

            return { leveledUp, newLevel, newXP };
        } catch (error) {
            console.error('Error al dar experiencia:', error);
            return { leveledUp: false };
        }
    }

    /**
     * Obtiene datos del NPC
     * @param {string} npcId
     * @returns {object|null}
     */
    getNPC(npcId) {
        return this.npcs.get(npcId) || null;
    }

    /**
     * Obtiene estadísticas del motor para debug
     */
    getStats() {
        return {
            initialized: this.initialized,
            totalNPCs: this.npcs.size,
            totalDialogues: this.dialogues.size,
            npcs: Array.from(this.npcs.keys()),
            dialogues: Array.from(this.dialogues.keys())
        };
    }
}

// Exportar singleton
const dialogueEngine = new DialogueEngine();
export default dialogueEngine;
