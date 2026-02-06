import survivalDB from '../db/survivalDB.js';
const db = survivalDB.db;

import npcRelationships from './npcRelations.js';
import narrativeEngine from './narrativeEngine.js';

/**
 * 🎯 SISTEMA DE MISIONES DINÁMICAS
 * 
 * Genera quests procedurales basadas en eventos del mundo:
 * - Ayudar en romances
 * - Mediar conflictos
 * - Investigar chismes y dramas
 * - Proteger NPCs vulnerables
 * - Facilitar encuentros
 */

class DynamicQuestSystem {
    constructor() {
        this.activeQuests = new Map(); // questId -> quest
        this.completedQuests = new Set();
        this.questGenerationCooldown = 120000; // 2 minutos entre generaciones
        this.lastGeneration = 0;
    }

    // ===== GENERAR QUEST BASADA EN EVENTOS =====
    generateQuestFromWorldState() {
        const now = Date.now();
        if (now - this.lastGeneration < this.questGenerationCooldown) {
            return null;
        }

        this.lastGeneration = now;

        // Obtener relaciones intensas para generar quests
        const intenseRels = npcRelationships.getIntenseRelationships(6);
        if (intenseRels.length === 0) return null;

        // Elegir una relación al azar
        const rel = intenseRels[Math.floor(Math.random() * intenseRels.length)];

        // Generar quest según el estado de la relación
        let quest = null;
        switch (rel.estado) {
            case 'amantes':
                quest = this.generateRomanceQuest(rel);
                break;
            case 'tension_sexual':
                quest = this.generateMatchmakerQuest(rel);
                break;
            case 'enemigos':
                quest = this.generateConflictMediationQuest(rel);
                break;
            case 'rivales':
                quest = this.generateRivalryQuest(rel);
                break;
            case 'celoso':
                quest = this.generateJealousyQuest(rel);
                break;
            case 'complejo':
                quest = this.generateInvestigationQuest(rel);
                break;
        }

        if (quest) {
            this.activeQuests.set(quest.id, quest);
            this.saveQuestToDB(quest);
        }

        return quest;
    }

    // ===== QUESTS DE ROMANCE =====
    generateRomanceQuest(rel) {
        const npcA = this.getNPCName(rel.npc_a_id);
        const npcB = this.getNPCName(rel.npc_b_id);

        const templates = [
            {
                title: `💕 Cita Romántica`,
                description: `${npcA} y ${npcB} están enamorados pero necesitan un lugar privado para su cita. Ayúdalos.`,
                objectives: [
                    { type: 'find_item', item: 'vino', required: 1 },
                    { type: 'find_item', item: 'flores', required: 1 },
                    { type: 'talk_to', npc: rel.npc_a_id }
                ],
                rewards: { xp: 100, reputacion: 15, oro: 50 },
                consequences: {
                    success: { atraccion: 10, amistad: 5 },
                    fail: { atraccion: -5 }
                }
            },
            {
                title: `💝 Regalo Especial`,
                description: `${npcA} quiere impresionar a ${npcB} con un regalo. Encuentra algo especial.`,
                objectives: [
                    { type: 'find_item', item: 'joya', required: 1 },
                    { type: 'deliver_to', npc: rel.npc_a_id, item: 'joya' }
                ],
                rewards: { xp: 80, reputacion: 10, oro: 40 },
                consequences: {
                    success: { atraccion: 8, respeto: 5 },
                    fail: { atraccion: -3 }
                }
            }
        ];

        const template = templates[Math.floor(Math.random() * templates.length)];

        return {
            id: `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'romance',
            ...template,
            npcsInvolved: [rel.npc_a_id, rel.npc_b_id],
            relationship: rel.id,
            createdAt: Date.now(),
            expiresAt: Date.now() + 600000, // 10 minutos
            status: 'active'
        };
    }

    // ===== QUESTS DE MATCHMAKER =====
    generateMatchmakerQuest(rel) {
        const npcA = this.getNPCName(rel.npc_a_id);
        const npcB = this.getNPCName(rel.npc_b_id);

        return {
            id: `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'matchmaker',
            title: `🔥 Cupido`,
            description: `Hay química entre ${npcA} y ${npcB} pero son orgullosos. Ayúdalos a confesar sus sentimientos.`,
            objectives: [
                { type: 'talk_to', npc: rel.npc_a_id },
                { type: 'talk_to', npc: rel.npc_b_id },
                { type: 'arrange_meeting', npcs: [rel.npc_a_id, rel.npc_b_id] }
            ],
            rewards: { xp: 120, reputacion: 20, oro: 60 },
            npcsInvolved: [rel.npc_a_id, rel.npc_b_id],
            relationship: rel.id,
            createdAt: Date.now(),
            expiresAt: Date.now() + 600000,
            status: 'active',
            consequences: {
                success: { atraccion: 15, amistad: 10 },
                fail: { rivalidad: 5 }
            }
        };
    }

    // ===== QUESTS DE MEDIACIÓN =====
    generateConflictMediationQuest(rel) {
        const npcA = this.getNPCName(rel.npc_a_id);
        const npcB = this.getNPCName(rel.npc_b_id);

        return {
            id: `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'mediation',
            title: `⚖️ Pacificador`,
            description: `${npcA} y ${npcB} están al borde de matarse. Alguien necesita mediar antes de que sea tarde.`,
            objectives: [
                { type: 'talk_to', npc: rel.npc_a_id },
                { type: 'talk_to', npc: rel.npc_b_id },
                { type: 'mediate_conflict', npcs: [rel.npc_a_id, rel.npc_b_id], skillCheck: 'carisma', difficulty: 7 }
            ],
            rewards: { xp: 150, reputacion: 25, oro: 80 },
            npcsInvolved: [rel.npc_a_id, rel.npc_b_id],
            relationship: rel.id,
            createdAt: Date.now(),
            expiresAt: Date.now() + 600000,
            status: 'active',
            consequences: {
                success: { rivalidad: -20, respeto: 10 },
                fail: { rivalidad: 10, amistad: -10 }
            }
        };
    }

    // ===== QUESTS DE RIVALIDAD =====
    generateRivalryQuest(rel) {
        const npcA = this.getNPCName(rel.npc_a_id);
        const npcB = this.getNPCName(rel.npc_b_id);

        return {
            id: `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'rivalry',
            title: `🥊 Competencia`,
            description: `${npcA} y ${npcB} compiten constantemente. Organiza un desafío justo para resolver esto.`,
            objectives: [
                { type: 'organize_competition', npcs: [rel.npc_a_id, rel.npc_b_id] },
                { type: 'ensure_fairness' }
            ],
            rewards: { xp: 100, reputacion: 15, oro: 50 },
            npcsInvolved: [rel.npc_a_id, rel.npc_b_id],
            relationship: rel.id,
            createdAt: Date.now(),
            expiresAt: Date.now() + 600000,
            status: 'active',
            consequences: {
                success: { rivalidad: -10, respeto: 15 },
                fail: { rivalidad: 5 }
            }
        };
    }

    // ===== QUESTS DE CELOS =====
    generateJealousyQuest(rel) {
        const npcA = this.getNPCName(rel.npc_a_id);
        const npcB = this.getNPCName(rel.npc_b_id);

        return {
            id: `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'jealousy',
            title: `😒 Triángulo Amoroso`,
            description: `${npcA} está consumido por los celos hacia ${npcB}. Necesita ayuda para superarlo.`,
            objectives: [
                { type: 'talk_to', npc: rel.npc_a_id },
                { type: 'counsel', npc: rel.npc_a_id, skillCheck: 'empatia', difficulty: 6 },
                { type: 'distract', npc: rel.npc_a_id }
            ],
            rewards: { xp: 110, reputacion: 18, oro: 55 },
            npcsInvolved: [rel.npc_a_id, rel.npc_b_id],
            relationship: rel.id,
            createdAt: Date.now(),
            expiresAt: Date.now() + 600000,
            status: 'active',
            consequences: {
                success: { celos: -15, amistad: 10 },
                fail: { celos: 10 }
            }
        };
    }

    // ===== QUESTS DE INVESTIGACIÓN =====
    generateInvestigationQuest(rel) {
        const npcA = this.getNPCName(rel.npc_a_id);
        const npcB = this.getNPCName(rel.npc_b_id);

        return {
            id: `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'investigation',
            title: `🕵️ Drama Complejo`,
            description: `La relación entre ${npcA} y ${npcB} es un desastre. Investiga qué está pasando realmente.`,
            objectives: [
                { type: 'gather_info', npcs: [rel.npc_a_id, rel.npc_b_id] },
                { type: 'talk_to_witnesses', count: 3 },
                { type: 'uncover_truth' }
            ],
            rewards: { xp: 140, reputacion: 22, oro: 70 },
            npcsInvolved: [rel.npc_a_id, rel.npc_b_id],
            relationship: rel.id,
            createdAt: Date.now(),
            expiresAt: Date.now() + 600000,
            status: 'active',
            consequences: {
                success: { respeto: 15 },
                fail: { reputacion: -5 }
            }
        };
    }

    // ===== GESTIÓN DE QUESTS =====
    getActiveQuests() {
        // Limpiar quests expiradas
        const now = Date.now();
        for (const [id, quest] of this.activeQuests.entries()) {
            if (quest.expiresAt < now) {
                this.activeQuests.delete(id);
                this.updateQuestStatus(id, 'expired');
            }
        }

        return Array.from(this.activeQuests.values());
    }

    getQuestById(questId) {
        return this.activeQuests.get(questId);
    }

    acceptQuest(questId, playerId) {
        const quest = this.activeQuests.get(questId);
        if (!quest) return false;

        quest.estado = 'aceptada';
        quest.acceptedBy = playerId;
        quest.acceptedAt = Date.now();

        this.updateQuestStatus(questId, 'aceptada');
        return true;
    }

    completeQuest(questId, playerId, success = true) {
        const quest = this.activeQuests.get(questId);
        if (!quest) {
            return { success: false, message: 'Misión no encontrada' };
        }

        if (quest.estado !== 'aceptada') {
            return { success: false, message: 'Debes aceptar la misión primero' };
        }

        // Aplicar consecuencias a la relación
        if (quest.relationship && quest.consequences) {
            const changes = success ? quest.consequences.success : quest.consequences.fail;
            npcRelationships.updateRelationship(
                quest.npcsInvolved[0],
                quest.npcsInvolved[1],
                {
                    ...changes,
                    evento: {
                        tipo: 'quest_completed',
                        questId,
                        success,
                        playerId
                    }
                }
            );
        }

        // Marcar como completada
        this.activeQuests.delete(questId);
        this.completedQuests.add(questId);
        this.updateQuestStatus(questId, success ? 'completed' : 'failed');

        return {
            success: true,
            quest,
            rewards: success ? quest.rewards : null,
            message: success
                ? `✅ ¡Quest "${quest.title}" completada!`
                : `❌ Quest "${quest.title}" fallida.`
        };
    }

    // ===== BASE DE DATOS =====
    saveQuestToDB(quest) {
        try {
            const stmt = db.prepare(`
                INSERT OR REPLACE INTO dynamic_quests 
                (id, type, title, description, objectives, rewards, npcs_involved, created_at, expires_at, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                quest.id,
                quest.type,
                quest.title,
                quest.description,
                JSON.stringify(quest.objectives),
                JSON.stringify(quest.rewards),
                JSON.stringify(quest.npcsInvolved),
                quest.createdAt,
                quest.expiresAt,
                quest.status
            );
        } catch (error) {
            // Tabla no existe aún, se creará en próximo reinicio
            console.log('📝 Dynamic quests table will be created on next restart');
        }
    }

    updateQuestStatus(questId, status) {
        try {
            db.prepare(`UPDATE dynamic_quests SET status = ? WHERE id = ?`)
                .run(status, questId);
        } catch (error) {
            // Ignorar si la tabla no existe
        }
    }

    // ===== HELPERS =====
    getNPCName(npcId) {
        const npc = db.prepare('SELECT nombre FROM npcs WHERE id = ?').get(npcId);
        return npc ? npc.nombre : 'Desconocido';
    }

    // ===== GENERACIÓN AUTOMÁTICA =====
    autoGenerateQuests() {
        const quest = this.generateQuestFromWorldState();
        if (quest) {
            console.log(`🎯 Nueva quest generada: "${quest.title}"`);
            return quest;
        }
        return null;
    }
}

// Singleton
const dynamicQuests = new DynamicQuestSystem();
export default dynamicQuests;
