import db from '../db/index.js';
import questManager from './quests.js';
import relationshipManager from '../systems/relations.js';
import eventBus from '../core/EventBus.js';
import itemSystem from '../systems/itemSystem.js';
import dialogueEngine from '../systems/dialogueEngine.js';
import flagSystem from '../systems/flagSystem.js';

class NPCManager {
    // Obtener NPC por ID
    getNPC(npcId) {
        const npc = db.prepare('SELECT * FROM npcs WHERE id = ?').get(npcId);
        if (!npc) return null;

        return {
            ...npc,
            personalidad: JSON.parse(npc.personalidad),
            estado_emocional: JSON.parse(npc.estado_emocional),
            memoria: JSON.parse(npc.memoria || '[]')
        };
    }

    // Obtener todos los NPCs activos
    getAllActiveNPCs() {
        const npcs = db.prepare('SELECT * FROM npcs WHERE estado = ?').all('activo');
        return npcs.map(npc => this.getNPC(npc.id));
    }

    // Mover NPC a nueva locación
    moveNPC(npcId, newLocationId) {
        db.prepare('UPDATE npcs SET lugar_actual = ? WHERE id = ?').run(newLocationId, npcId);
    }

    // Actualizar estado emocional del NPC
    updateEmotionalState(npcId, emotions) {
        const emotionsJson = JSON.stringify(emotions);
        db.prepare('UPDATE npcs SET estado_emocional = ? WHERE id = ?').run(emotionsJson, npcId);
    }

    // Agregar memoria al NPC
    addMemory(npcId, memory) {
        const npc = this.getNPC(npcId);
        if (!npc) return;

        const memories = npc.memoria;
        memories.push({
            timestamp: new Date().toISOString(),
            ...memory
        });

        // Mantener solo las últimas 20 memorias
        if (memories.length > 20) {
            memories.shift();
        }

        db.prepare('UPDATE npcs SET memoria = ? WHERE id = ?').run(JSON.stringify(memories), npcId);
    }

    // Generar diálogo basado en personalidad y estado emocional
    generateDialogue(npcId, context) {
        const npc = this.getNPC(npcId);
        if (!npc) return null;

        // Sistema simple de diálogo basado en personalidad
        const { personalidad, estado_emocional } = npc;

        // Aquí puedes expandir con un sistema más complejo
        // Por ahora, retorna un diálogo básico
        return {
            npcId,
            nombre: npc.nombre,
            mensaje: `*${npc.nombre} te mira con ${estado_emocional.miedo > 7 ? 'miedo' : 'cautela'}*`,
            opciones: ['Hablar', 'Ignorar', 'Ayudar']
        };
    }

    // Reacción del NPC a una acción de jugador
    reactToAction(npcId, playerId, action) {
        const npc = this.getNPC(npcId);
        if (!npc) return null;

        // Agregar a memoria
        this.addMemory(npcId, {
            tipo: 'interaccion',
            playerId,
            accion: action
        });

        // Aquí puedes implementar lógica de reacción más compleja
        return {
            npcId,
            reaccion: 'positiva', // o 'negativa', 'neutral'
            mensaje: `${npc.nombre} responde a tu acción.`
        };
    }

    // Cambiar estado del NPC (activo, herido, muerto)
    updateStatus(npcId, newStatus) {
        db.prepare('UPDATE npcs SET estado = ? WHERE id = ?').run(newStatus, npcId);
    }

    // ========== NUEVO SISTEMA DE DIÁLOGOS (FLAG-BASED) ==========

    /**
     * Iniciar diálogo con NPC usando DialogueEngine
     * @param {string} npcId - ID del NPC
     * @param {number} playerId - ID del jugador
     * @returns {object|null} - Resultado del diálogo
     */
    startDialogueV2(npcId, playerId) {
        const npcData = dialogueEngine.getNPC(npcId);
        if (!npcData) {
            console.warn(`NPC ${npcId} no encontrado en DialogueEngine`);
            return null;
        }

        const dialogue = dialogueEngine.getDialogueForNPC(npcId, playerId);

        if (!dialogue) {
            return {
                npc: { id: npcId, nombre: npcData.nombre },
                dialogo: {
                    id: 'no_disponible',
                    texto: `${npcData.nombre} no tiene nada que decirte en este momento.`,
                    opciones: [
                        { texto: 'Adiós', consecuencias: {}, siguiente: null }
                    ]
                }
            };
        }

        return {
            npc: { id: npcId, nombre: npcData.nombre },
            dialogo: dialogue
        };
    }

    /**
     * Procesar respuesta del jugador usando DialogueEngine
     * @param {string} npcId - ID del NPC
     * @param {number} playerId - ID del jugador
     * @param {number} opcionIndex - Índice de la opción elegida
     * @param {string} currentDialogueId - ID del diálogo actual
     * @returns {object} - Resultado de la interacción
     */
    async processDialogueResponseV2(npcId, playerId, opcionIndex, currentDialogueId) {
        const npcData = dialogueEngine.getNPC(npcId);
        if (!npcData) {
            return { success: false, error: 'NPC no encontrado' };
        }

        // Si no viene dialogoId (problema del frontend), buscar el diálogo actual
        let dialogue;
        if (!currentDialogueId || currentDialogueId === 'undefined') {
            console.warn(`⚠️ dialogoId no proporcionado, buscando diálogo actual para ${npcId}`);
            dialogue = dialogueEngine.getDialogueForNPC(npcId, playerId);
        } else {
            // Obtener el diálogo actual por ID específico
            dialogue = dialogueEngine.getDialogueById(currentDialogueId, playerId);
        }

        if (!dialogue) {
            console.error(`Diálogo no encontrado o no cumple condiciones para player ${playerId}`);
            return { success: false, error: 'Diálogo no disponible' };
        }

        // Verificar que la opción existe
        if (!dialogue.opciones || !dialogue.opciones[opcionIndex]) {
            console.error(`Opción ${opcionIndex} inválida en diálogo ${dialogue.id || 'desconocido'}`);
            return { success: false, error: 'Opción inválida' };
        }

        const opcionElegida = dialogue.opciones[opcionIndex];

        // Ejecutar consecuencias
        const consecuenciasResult = await dialogueEngine.executeConsequences(
            opcionElegida.consecuencias,
            playerId
        );

        // Obtener jugador actualizado después de consecuencias
        const updatedPlayer = db.prepare(`
            SELECT id, alias, nivel, experiencia, oro, reputacion, stats, estado_emocional
            FROM players WHERE id = ?
        `).get(playerId);

        if (updatedPlayer) {
            updatedPlayer.stats = JSON.parse(updatedPlayer.stats || '{}');
            updatedPlayer.estado_emocional = JSON.parse(updatedPlayer.estado_emocional || '{}');
        }

        // Construir resultado
        const resultado = {
            success: true,
            npc: { id: npcId, nombre: npcData.nombre },
            opcionElegida: opcionElegida.texto,
            consecuencias: consecuenciasResult.messages,
            jugador: updatedPlayer,
            siguienteDialogo: null,
            fin: false
        };

        // Si hay siguiente diálogo, obtenerlo por ID
        if (opcionElegida.siguiente) {
            const nextDialogue = dialogueEngine.getDialogueById(opcionElegida.siguiente, playerId);
            resultado.siguienteDialogo = nextDialogue;
        } else {
            // Si no hay siguiente específico, buscar qué diálogo aplica ahora con el nuevo estado
            const nextDialogue = dialogueEngine.getDialogueForNPC(npcId, playerId);
            resultado.siguienteDialogo = nextDialogue;
        }

        // Si no hay siguiente diálogo, marcar como fin de conversación
        if (!resultado.siguienteDialogo) {
            resultado.fin = true;
        }

        // Emitir eventos
        eventBus.emit('dialogue.completed', {
            npcId,
            playerId,
            dialogueId: dialogue.id
        });

        eventBus.emit('dialogue.option_chosen', {
            npcId,
            playerId,
            dialogueId: dialogue.id,
            optionIndex: opcionIndex
        });

        return resultado;
    }

    // ========== SISTEMA DE DIÁLOGOS VIEJO (DEPRECADO) ==========

    // Iniciar diálogo con NPC
    startDialogue(npcId, playerId) {
        const npc = this.getNPC(npcId);
        if (!npc) return null;

        // Obtener diálogo inicial (saludo)
        const dialogue = this.getDialogue(npcId, `${npcId}_saludo`, playerId);

        if (!dialogue) {
            // Si no hay diálogo definido, crear uno genérico
            return {
                npc: { id: npcId, nombre: npc.nombre },
                dialogo: {
                    id: 'generico',
                    dialogo_id: 'generico',
                    texto: `Hola, soy ${npc.nombre}. No tengo mucho que decir ahora.`,
                    opciones: [
                        { texto: 'Adiós', siguiente: null }
                    ]
                }
            };
        }

        return {
            npc: { id: npcId, nombre: npc.nombre },
            dialogo: dialogue
        };
    }

    // Obtener un diálogo específico
    getDialogue(npcId, dialogoId, playerId) {
        const dialogue = db.prepare(`
            SELECT * FROM npc_dialogues 
            WHERE npc_id = ? AND dialogo_id = ?
        `).get(npcId, dialogoId);

        if (!dialogue) return null;

        const parsed = {
            ...dialogue,
            condiciones: dialogue.condiciones ? JSON.parse(dialogue.condiciones) : null,
            opciones: JSON.parse(dialogue.opciones),
            consecuencias: dialogue.consecuencias ? JSON.parse(dialogue.consecuencias) : null
        };

        // Verificar condiciones
        if (parsed.condiciones && !this.checkDialogueConditions(playerId, parsed.condiciones)) {
            return null;
        }

        // Filtrar opciones según condiciones
        parsed.opciones = parsed.opciones.filter(opcion => {
            if (!opcion.condicion) return true;
            return this.checkDialogueConditions(playerId, opcion.condicion);
        });

        return parsed;
    }

    // Verificar condiciones de diálogo
    checkDialogueConditions(playerId, condiciones) {
        if (condiciones.nivel_min) {
            const player = db.prepare('SELECT nivel FROM players WHERE id = ?').get(playerId);
            if (player.nivel < condiciones.nivel_min) return false;
        }

        if (condiciones.quest_completada) {
            const quest = db.prepare(`
                SELECT * FROM player_quests 
                WHERE player_id = ? AND quest_id = ? AND estado = 'completada'
            `).get(playerId, condiciones.quest_completada);
            if (!quest) return false;
        }

        if (condiciones.tiene_item) {
            const inventoryManager = require('../systems/inventory.js').default;
            if (!inventoryManager.hasItem(playerId, condiciones.tiene_item)) return false;
        }

        return true;
    }

    // Elegir opción de diálogo
    chooseDialogueOption(npcId, dialogoId, opcionIndex, playerId) {
        const dialogue = this.getDialogue(npcId, dialogoId, playerId);
        if (!dialogue) return { success: false, error: 'Diálogo no encontrado' };

        const opcion = dialogue.opciones[opcionIndex];
        if (!opcion) return { success: false, error: 'Opción inválida' };

        let resultado = {
            success: true,
            texto: opcion.texto,
            consecuenciasAplicadas: []
        };

        // APLICAR CONSECUENCIAS DEL DIÁLOGO
        if (dialogue.consecuencias) {
            const consecuencias = dialogue.consecuencias;

            // Cambiar estados de NPCs
            const updateNpcEstado = (npcId, nuevoEstado, nombre) => {
                const npc = db.prepare('SELECT estado_emocional FROM npcs WHERE id = ?').get(npcId);
                if (npc) {
                    const estado = JSON.parse(npc.estado_emocional || '{}');
                    estado.estado = nuevoEstado;
                    db.prepare('UPDATE npcs SET estado_emocional = ? WHERE id = ?')
                        .run(JSON.stringify(estado), npcId);
                    resultado.consecuenciasAplicadas.push(`${nombre}: ${nuevoEstado}`);
                }
            };

            if (consecuencias.ana_estado) updateNpcEstado('npc_ana', consecuencias.ana_estado, 'Ana');
            if (consecuencias.teresa_estado) updateNpcEstado('npc_teresa', consecuencias.teresa_estado, 'Teresa');
            if (consecuencias.carlos_estado) updateNpcEstado('npc_carlos', consecuencias.carlos_estado, 'Carlos');
            if (consecuencias.marco_estado) updateNpcEstado('npc_marco', consecuencias.marco_estado, 'Marco');
            if (consecuencias.gomez_estado) updateNpcEstado('npc_dr_gomez', consecuencias.gomez_estado, 'Dr. Gómez');

            // Cambiar reputación del jugador
            if (consecuencias.reputacion) {
                db.prepare('UPDATE players SET reputacion = reputacion + ? WHERE id = ?')
                    .run(consecuencias.reputacion, playerId);
                resultado.consecuenciasAplicadas.push(`Reputación ${consecuencias.reputacion > 0 ? '+' : ''}${consecuencias.reputacion}`);
            }

            // Cambiar oro
            if (consecuencias.oro) {
                db.prepare('UPDATE players SET oro = oro + ? WHERE id = ?')
                    .run(consecuencias.oro, playerId);
                resultado.consecuenciasAplicadas.push(`Oro ${consecuencias.oro > 0 ? '+' : ''}${consecuencias.oro}`);
            }

            // Dar items
            if (consecuencias.item) {
                const itemId = consecuencias.item;
                const cantidad = consecuencias.item_cantidad || 1;
                const result = itemSystem.give(playerId, itemId, cantidad);
                if (result.success) {
                    resultado.consecuenciasAplicadas.push(`Item obtenido: ${itemId}`);
                }
            }

            // Dar múltiples items
            if (consecuencias.items && Array.isArray(consecuencias.items)) {
                for (const item of consecuencias.items) {
                    const itemId = item.id || item.item_id;
                    const cantidad = item.cantidad || 1;
                    const result = itemSystem.give(playerId, itemId, cantidad);
                    if (result.success) {
                        resultado.consecuenciasAplicadas.push(`Item obtenido: ${itemId}`);
                    }
                }
            }

            // Agregar quest
            if (consecuencias.quest) {
                resultado.consecuenciasAplicadas.push(`Quest: ${consecuencias.quest}`);
            }

            // Relaciones con NPCs
            if (consecuencias.ana_relacion) {
                resultado.consecuenciasAplicadas.push(`Relación con Ana ${consecuencias.ana_relacion > 0 ? '+' : ''}${consecuencias.ana_relacion}`);
            }
            if (consecuencias.teresa_relacion) {
                resultado.consecuenciasAplicadas.push(`Relación con Teresa ${consecuencias.teresa_relacion > 0 ? '+' : ''}${consecuencias.teresa_relacion}`);
            }
            if (consecuencias.carlos_relacion) {
                resultado.consecuenciasAplicadas.push(`Relación con Carlos ${consecuencias.carlos_relacion > 0 ? '+' : ''}${consecuencias.carlos_relacion}`);
            }
            if (consecuencias.marco_relacion) {
                resultado.consecuenciasAplicadas.push(`Relación con Marco ${consecuencias.marco_relacion > 0 ? '+' : ''}${consecuencias.marco_relacion}`);
            }
            if (consecuencias.gomez_relacion) {
                resultado.consecuenciasAplicadas.push(`Relación con Dr. Gómez ${consecuencias.gomez_relacion > 0 ? '+' : ''}${consecuencias.gomez_relacion}`);
            }
        }

        // Acciones especiales
        if (opcion.accion === 'aceptar_quest' && opcion.quest_id) {
            const questResult = questManager.acceptQuest(playerId, opcion.quest_id);
            resultado.questAceptada = questResult.success;
            resultado.quest = questResult.quest;
        }

        // Siguiente diálogo
        if (opcion.siguiente) {
            resultado.siguienteDialogo = this.getDialogue(npcId, opcion.siguiente, playerId);
        } else {
            resultado.fin = true;
        }

        // Agregar memoria al NPC
        this.addMemory(npcId, {
            tipo: 'dialogo',
            playerId,
            dialogoId,
            opcionElegida: opcionIndex,
            consecuencias: dialogue.consecuencias
        });

        // EMITIR EVENTOS (Quest System V2 los escucha automáticamente)
        eventBus.emit('dialogue.completed', {
            playerId,
            npcId,
            dialogueId: dialogoId
        });

        eventBus.emit('dialogue.option_chosen', {
            playerId,
            npcId,
            dialogueId: dialogoId,
            optionId: opcionIndex
        });

        eventBus.emit('npc.talked', {
            playerId,
            npcId
        });

        // Nota: item.obtained se emite automáticamente desde itemSystem.give()

        return resultado;
    }

    // Sistema de diálogo aleatorio/contextual
    generateContextualDialogue(npcId, playerId, contexto) {
        const npc = this.getNPC(npcId);
        if (!npc) return null;

        const relacion = relationshipManager.getRelationship(npcId, playerId, 'npc', 'player');

        // Generar diálogo basado en personalidad, relación y contexto
        let mensaje = '';

        if (contexto === 'saludo') {
            if (relacion && relacion.valores.confianza > 7) {
                mensaje = `¡${npc.nombre} te saluda calurosamente!`;
            } else if (relacion && relacion.valores.miedo > 7) {
                mensaje = `${npc.nombre} se aleja nerviosamente...`;
            } else {
                mensaje = `${npc.nombre} te saluda con cautela.`;
            }
        }

        return {
            npcId,
            npcNombre: npc.nombre,
            mensaje,
            opciones: ['Hablar', 'Comerciar', 'Despedirse']
        };
    }
}

export default new NPCManager();
