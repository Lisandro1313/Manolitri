/**
 * QUEST SYSTEM V2 - Basado en eventos
 * 
 * FILOSOFÍA:
 * - Las quests NO se verifican manualmente
 * - Las quests se SUSCRIBEN a eventos
 * - Cuando ocurre el evento correcto, se auto-actualiza
 * - Cuando se completa, se auto-recompensa
 * 
 * ESCALABILIDAD:
 * - Crear 1000 quests = solo agregar JSON a la DB
 * - ZERO código custom por quest
 * - Sistema genérico maneja TODO
 */

import db from '../db/index.js';
import eventBus from '../core/EventBus.js';
import statsManager from './stats.js';

class QuestSystem {
    constructor() {
        this.initialized = false;
    }

    /**
     * Inicializar sistema - suscribirse a TODOS los eventos relevantes
     */
    initialize() {
        if (this.initialized) return;

        // DIÁLOGOS
        eventBus.on('dialogue.completed', (data) => {
            this.handleEvent('dialogue', data.playerId, {
                npcId: data.npcId,
                dialogueId: data.dialogueId
            });
        });

        eventBus.on('dialogue.option_chosen', (data) => {
            this.handleEvent('dialogue_choice', data.playerId, {
                npcId: data.npcId,
                dialogueId: data.dialogueId,
                optionId: data.optionId
            });
        });

        // ITEMS
        eventBus.on('item.obtained', (data) => {
            this.handleEvent('recolectar', data.playerId, {
                itemId: data.itemId,
                cantidad: data.cantidad
            });
        });

        // COMBATE
        eventBus.on('enemy.killed', (data) => {
            this.handleEvent('matar', data.playerId, {
                enemyType: data.enemyType,
                enemyId: data.enemyId
            });
        });

        // EXPLORACIÓN
        eventBus.on('location.visited', (data) => {
            this.handleEvent('explorar', data.playerId, {
                location: data.location
            });
        });

        // NPCs
        eventBus.on('npc.talked', (data) => {
            this.handleEvent('hablar_npc', data.playerId, {
                npcId: data.npcId
            });
        });

        this.initialized = true;
        console.log('✓ Quest System V2 inicializado - Escuchando eventos');
    }

    /**
     * Manejar un evento y actualizar quests relevantes
     */
    handleEvent(eventType, playerId, eventData) {
        // Obtener quests activas del jugador
        const activeQuests = db.prepare(`
            SELECT pq.*, q.objetivos, q.recompensas, q.titulo
            FROM player_quests pq
            JOIN quests q ON pq.quest_id = q.id
            WHERE pq.player_id = ? AND pq.estado = 'activa'
        `).all(playerId);

        for (const quest of activeQuests) {
            const objetivos = JSON.parse(quest.objetivos);
            const progreso = typeof quest.progreso === 'string'
                ? JSON.parse(quest.progreso)
                : quest.progreso;

            let updated = false;

            // Verificar cada objetivo
            for (let i = 0; i < objetivos.length; i++) {
                const objetivo = objetivos[i];
                const prog = progreso[i];

                // Si ya está completo, skip
                if (prog.actual >= prog.requerido) continue;

                // Verificar si este evento cumple el objetivo
                if (this.matchesObjective(objetivo, eventType, eventData)) {

                    // Para dialogue_multiple, rastrear NPCs únicos
                    if (objetivo.tipo === 'dialogo_multiple' || objetivo.tipo === 'dialogue_multiple') {
                        if (!prog.npcs_hablados) prog.npcs_hablados = [];
                        if (!prog.npcs_hablados.includes(eventData.npcId)) {
                            prog.npcs_hablados.push(eventData.npcId);
                            prog.actual = prog.npcs_hablados.length;
                            updated = true;
                        }
                    } else {
                        // Otros objetivos: incremento simple
                        prog.actual = Math.min(prog.actual + 1, prog.requerido);
                        updated = true;
                    }

                    if (updated) {
                        console.log(`[Quest] ${quest.titulo} - Progreso: ${prog.actual}/${prog.requerido}`);
                    }
                }
            }

            if (updated) {
                // Guardar progreso
                db.prepare('UPDATE player_quests SET progreso = ? WHERE id = ?')
                    .run(JSON.stringify(progreso), quest.id);

                // Verificar si se completó
                const allComplete = progreso.every(p => p.actual >= p.requerido);
                if (allComplete) {
                    this.completeQuest(playerId, quest.quest_id, quest.titulo, quest.recompensas);
                }
            }
        }
    }

    /**
     * Verificar si un evento cumple un objetivo
     */
    matchesObjective(objetivo, eventType, eventData) {
        // Mapeo de tipos de objetivo a tipos de evento
        const typeMap = {
            'dialogue': 'dialogue',
            'dialogo': 'dialogue', // soporte alternativo
            'dialogo_choice': 'dialogue_choice',
            'recolectar': 'recolectar',
            'matar': 'matar',
            'explorar': 'explorar',
            'hablar_npc': 'hablar_npc',
            'dialogue_multiple': 'hablar_npc',
            'dialogo_multiple': 'hablar_npc'
        };

        if (typeMap[objetivo.tipo] !== eventType) return false;

        // Verificaciones específicas por tipo
        switch (objetivo.tipo) {
            case 'dialogue':
            case 'dialogo':
                // Soporte para dialogo_id único O dialogo_ids (array)
                if (objetivo.dialogo_id) {
                    return eventData.dialogueId === objetivo.dialogo_id;
                } else if (objetivo.dialogo_ids && Array.isArray(objetivo.dialogo_ids)) {
                    return objetivo.dialogo_ids.includes(eventData.dialogueId);
                }
                return false;

            case 'dialogo_choice':
                return eventData.dialogueId === objetivo.dialogo_id &&
                    eventData.optionId === objetivo.opcion_id;

            case 'hablar_npc':
                return eventData.npcId === objetivo.npc || eventData.npcId === objetivo.npc_id;

            case 'dialogue_multiple':
            case 'dialogo_multiple':
                // Hablar con múltiples NPCs - verificar si este NPC es parte del objetivo
                const npcList = objetivo.npcs || objetivo.npc_ids || [];
                return npcList.includes(eventData.npcId);

            case 'recolectar':
                return eventData.itemId === objetivo.item;

            case 'matar':
                return eventData.enemyType === objetivo.objetivo;

            case 'explorar':
                return eventData.location === objetivo.ubicacion;

            default:
                return false;
        }
    }

    /**
     * Completar quest automáticamente
     */
    completeQuest(playerId, questId, titulo, recompensasJson) {
        const recompensas = JSON.parse(recompensasJson);

        // Dar recompensas
        if (recompensas.oro) {
            db.prepare('UPDATE players SET oro = oro + ? WHERE id = ?')
                .run(recompensas.oro, playerId);
        }

        if (recompensas.experiencia) {
            statsManager.addExperience(playerId, recompensas.experiencia);
        }

        if (recompensas.items) {
            for (const item of recompensas.items) {
                // TODO: agregar al inventario cuando esté habilitado
            }
        }

        // Marcar como completada
        db.prepare(`
            UPDATE player_quests 
            SET estado = 'completada', completada_at = CURRENT_TIMESTAMP 
            WHERE player_id = ? AND quest_id = ?
        `).run(playerId, questId);

        console.log(`✓ Quest completada: ${titulo} (Jugador: ${playerId})`);

        // Emitir evento de quest completada
        eventBus.emit('quest.completed', {
            playerId,
            questId,
            titulo,
            recompensas
        });

        // TODO: Enviar notificación al jugador via WebSocket
    }

    /**
     * Aceptar quest (mantener para compatibilidad)
     */
    acceptQuest(playerId, questId) {
        const quest = db.prepare('SELECT * FROM quests WHERE id = ?').get(questId);
        if (!quest) return { success: false, error: 'Quest no existe' };

        const objetivos = JSON.parse(quest.objetivos);

        // Inicializar progreso
        const progreso = objetivos.map(obj => ({
            tipo: obj.tipo,
            objetivo: obj.objetivo || obj.item || obj.ubicacion || obj.npc_id || obj.dialogo_id,
            actual: 0,
            requerido: obj.cantidad || 1
        }));

        // Crear player_quest
        db.prepare(`
            INSERT INTO player_quests (player_id, quest_id, estado, progreso)
            VALUES (?, ?, 'activa', ?)
        `).run(playerId, questId, JSON.stringify(progreso));

        eventBus.emit('quest.accepted', { playerId, questId });

        return { success: true, quest, mensaje: `Quest aceptada: ${quest.titulo}` };
    }

    /**
     * Obtener quests activas del jugador
     */
    getActiveQuests(playerId) {
        const quests = db.prepare(`
            SELECT pq.*, q.titulo, q.descripcion, q.objetivos, q.recompensas
            FROM player_quests pq
            JOIN quests q ON pq.quest_id = q.id
            WHERE pq.player_id = ? AND pq.estado = 'activa'
        `).all(playerId);

        return quests.map(q => ({
            ...q,
            objetivos: JSON.parse(q.objetivos),
            progreso: typeof q.progreso === 'string' ? JSON.parse(q.progreso) : q.progreso,
            recompensas: JSON.parse(q.recompensas)
        }));
    }
}

// Singleton
const questSystem = new QuestSystem();

export default questSystem;
