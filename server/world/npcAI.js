// =====================================================
// SISTEMA DE IA MEJORADA PARA NPCs
// =====================================================
// Decisiones autónomas basadas en:
// - Personalidad (traits JSON)
// - Relaciones con otros NPCs
// - Memoria de eventos recientes
// - Estado emocional y necesidades

import survivalDB from '../db/survivalDB.js';
import npcRelationships from './npcRelations.js';

const db = survivalDB.db;

class NpcAI {
    constructor() {
        this.npcMemories = new Map(); // npcId -> Array de eventos recordados
        this.npcGoals = new Map();    // npcId -> objetivo actual
        this.actionCooldowns = new Map(); // npcId -> timestamp

        this.MEMORY_SIZE = 20; // Recuerda últimos 20 eventos
        this.ACTION_COOLDOWN = 60000; // 1 minuto entre decisiones importantes
    }

    // ===== SISTEMA DE MEMORIA =====
    addMemory(npcId, memory) {
        if (!this.npcMemories.has(npcId)) {
            this.npcMemories.set(npcId, []);
        }

        const memories = this.npcMemories.get(npcId);
        memories.push({
            ...memory,
            timestamp: Date.now()
        });

        // Mantener solo los N recuerdos más recientes
        if (memories.length > this.MEMORY_SIZE) {
            memories.shift();
        }
    }

    getMemories(npcId, filter = null) {
        const memories = this.npcMemories.get(npcId) || [];
        if (!filter) return memories;

        return memories.filter(m => {
            if (filter.type && m.type !== filter.type) return false;
            if (filter.involvedNpc && m.involvedNpc !== filter.involvedNpc) return false;
            if (filter.since && m.timestamp < filter.since) return false;
            return true;
        });
    }

    // Recuerdos recientes influyen en decisiones
    hasRecentMemoryOf(npcId, type, withinMs = 300000) { // 5 minutos
        const memories = this.getMemories(npcId, {
            type,
            since: Date.now() - withinMs
        });
        return memories.length > 0;
    }

    // ===== SISTEMA DE OBJETIVOS =====
    setGoal(npcId, goal) {
        this.npcGoals.set(npcId, {
            ...goal,
            startedAt: Date.now()
        });
    }

    getGoal(npcId) {
        return this.npcGoals.get(npcId);
    }

    clearGoal(npcId) {
        this.npcGoals.delete(npcId);
    }

    // ===== TOMA DE DECISIONES AUTÓNOMA =====
    async makeDecision(npcId) {
        // Cooldown entre decisiones
        const lastAction = this.actionCooldowns.get(npcId) || 0;
        if (Date.now() - lastAction < this.ACTION_COOLDOWN) {
            return null;
        }

        const npc = this.getNpcData(npcId);
        if (!npc) return null;

        const personality = npc.personalidad || {};
        const currentLocation = npc.locacion_actual;

        // Evaluar posibles acciones ponderadas por personalidad
        const actions = [
            { type: 'move', weight: this.evaluateMoveWeight(npc, personality) },
            { type: 'interact', weight: this.evaluateInteractWeight(npc, personality) },
            { type: 'seek_romance', weight: this.evaluateRomanceWeight(npc, personality) },
            { type: 'avoid_enemy', weight: this.evaluateAvoidWeight(npc, personality) },
            { type: 'seek_friend', weight: this.evaluateSeekFriendWeight(npc, personality) },
            { type: 'confront', weight: this.evaluateConfrontWeight(npc, personality) },
            { type: 'rest', weight: this.evaluateRestWeight(npc, personality) }
        ];

        // Selección ponderada
        const action = this.weightedRandomChoice(actions);

        if (action) {
            this.actionCooldowns.set(npcId, Date.now());
            return await this.executeAction(npc, action.type);
        }

        return null;
    }

    // ===== PONDERACIÓN DE ACCIONES POR PERSONALIDAD =====
    evaluateMoveWeight(npc, personality) {
        let weight = 30; // Base

        // Exploradores se mueven más
        if (personality.explorador >= 7) weight += 20;
        if (personality.aventurero >= 7) weight += 15;

        // Paranoicos evitan moverse
        if (personality.paranoico >= 7) weight -= 20;

        // Cobardes se mueven si hay peligro
        if (personality.cobarde >= 7) {
            const hasEnemyNearby = this.hasEnemyInLocation(npc.id, npc.locacion_actual);
            if (hasEnemyNearby) weight += 40;
        }

        return Math.max(0, weight);
    }

    evaluateInteractWeight(npc, personality) {
        let weight = 25;

        // Sociables interactúan más
        if (personality.carismatico >= 7) weight += 25;
        if (personality.amigable >= 7) weight += 20;

        // Tímidos evitan interacciones
        if (personality.timido >= 7) weight -= 20;
        if (personality.introvertido >= 7) weight -= 15;

        return Math.max(0, weight);
    }

    evaluateRomanceWeight(npc, personality) {
        let weight = 15;

        // Románticos buscan amor
        if (personality.romantico >= 8) weight += 40;
        if (personality.pasional >= 8) weight += 30;

        // Tímidos menos probable
        if (personality.timido >= 7) weight -= 20;

        // Si ya tiene pareja, menos peso
        const hasLover = this.hasActiveRomance(npc.id);
        if (hasLover) weight -= 25;

        return Math.max(0, weight);
    }

    evaluateAvoidWeight(npc, personality) {
        let weight = 10;

        const hasEnemies = this.hasEnemyInLocation(npc.id, npc.locacion_actual);
        if (!hasEnemies) return 0;

        // Cobardes huyen
        if (personality.cobarde >= 7) weight += 50;
        if (personality.pacifico >= 7) weight += 30;

        // Valientes no huyen
        if (personality.valiente >= 7) weight -= 30;
        if (personality.agresivo >= 7) weight -= 40;

        return Math.max(0, weight);
    }

    evaluateSeekFriendWeight(npc, personality) {
        let weight = 20;

        // Amigables buscan compañía
        if (personality.amigable >= 7) weight += 25;
        if (personality.leal >= 7) weight += 20;

        // Solitarios no
        if (personality.solitario >= 7) weight -= 30;

        return Math.max(0, weight);
    }

    evaluateConfrontWeight(npc, personality) {
        let weight = 5; // Bajo por defecto

        const hasRivals = this.hasRivalInLocation(npc.id, npc.locacion_actual);
        if (!hasRivals) return 0;

        // Agresivos confrontan
        if (personality.agresivo >= 8) weight += 45;
        if (personality.vengativo >= 8) weight += 40;
        if (personality.valiente >= 7) weight += 20;

        // Pacíficos evitan
        if (personality.pacifico >= 7) weight -= 30;
        if (personality.cobarde >= 7) weight -= 40;

        return Math.max(0, weight);
    }

    evaluateRestWeight(npc, personality) {
        let weight = 15;

        // Perezosos descansan más
        if (personality.perezoso >= 7) weight += 30;

        // Activos menos
        if (personality.activo >= 7) weight -= 20;
        if (personality.energico >= 7) weight -= 15;

        return Math.max(0, weight);
    }

    // ===== EJECUCIÓN DE ACCIONES =====
    async executeAction(npc, actionType) {
        const actions = {
            'move': () => this.actionMove(npc),
            'interact': () => this.actionInteract(npc),
            'seek_romance': () => this.actionSeekRomance(npc),
            'avoid_enemy': () => this.actionAvoidEnemy(npc),
            'seek_friend': () => this.actionSeekFriend(npc),
            'confront': () => this.actionConfront(npc),
            'rest': () => this.actionRest(npc)
        };

        const executor = actions[actionType];
        if (executor) {
            return await executor();
        }

        return null;
    }

    actionMove(npc) {
        const personality = npc.personalidad || {};
        const currentLocation = npc.locacion_actual;

        // Obtener locaciones conectadas
        const connections = this.getLocationConnections(currentLocation);
        if (connections.length === 0) return null;

        // Elegir destino basado en personalidad
        let targetLocation = null;

        // Exploradores prefieren lugares nuevos
        if (personality.explorador >= 7) {
            const unvisited = connections.filter(loc =>
                !this.hasRecentMemoryOf(npc.id, 'visited', 600000) // 10 min
            );
            if (unvisited.length > 0) {
                targetLocation = unvisited[Math.floor(Math.random() * unvisited.length)];
            }
        }

        // Sociables van donde hay más gente
        if (!targetLocation && personality.carismatico >= 7) {
            targetLocation = this.getMostPopulatedLocation(connections);
        }

        // Por defecto: aleatorio
        if (!targetLocation) {
            targetLocation = connections[Math.floor(Math.random() * connections.length)];
        }

        // Ejecutar movimiento
        this.moveNpc(npc.id, targetLocation);
        this.addMemory(npc.id, { type: 'visited', location: targetLocation });

        return {
            action: 'move',
            npc: npc.id,
            from: currentLocation,
            to: targetLocation,
            description: `${npc.nombre} se movió a ${targetLocation}`
        };
    }

    actionInteract(npc) {
        const npcsInLocation = this.getNpcsInLocation(npc.locacion_actual, npc.id);
        if (npcsInLocation.length === 0) return null;

        // Elegir NPC para interactuar basado en relaciones
        const target = this.chooseInteractionTarget(npc.id, npcsInLocation);
        if (!target) return null;

        const relationship = npcRelationships.getRelationship(npc.id, target.id);
        const personality = npc.personalidad || {};

        // Tipo de interacción según personalidad y relación
        let interactionType = 'charla';

        if (relationship.estado === 'amantes' && personality.romantico >= 7) {
            interactionType = 'momento_romantico';
        } else if (relationship.estado === 'amigos' && personality.amigable >= 7) {
            interactionType = 'actividad_conjunta';
        } else if (relationship.estado === 'enemigos' && personality.agresivo >= 5) {
            interactionType = 'discusion';
        }

        this.addMemory(npc.id, {
            type: 'interaction',
            involvedNpc: target.id,
            interactionType
        });

        return {
            action: 'interact',
            npc: npc.id,
            target: target.id,
            type: interactionType,
            description: `${npc.nombre} interactuó con ${target.nombre} (${interactionType})`
        };
    }

    actionSeekRomance(npc) {
        const personality = npc.personalidad || {};

        // Buscar NPCs con alta atracción
        const potentialPartners = this.findPotentialPartners(npc.id);
        if (potentialPartners.length === 0) return null;

        const target = potentialPartners[0]; // Más atracción

        // Acción romántica según personalidad
        let action = 'flirtear';
        if (personality.romantico >= 9) action = 'declarar_amor';
        else if (personality.timido >= 7) action = 'miradas_timidas';

        this.addMemory(npc.id, {
            type: 'romance_attempt',
            involvedNpc: target.id,
            action
        });

        // Aumentar atracción ligeramente
        npcRelationships.updateRelationship(npc.id, target.id, {
            atraccion: 5,
            evento: { tipo: 'romance_attempt', action }
        });

        return {
            action: 'seek_romance',
            npc: npc.id,
            target: target.id,
            romanceAction: action,
            description: `${npc.nombre} intentó ${action} con ${target.nombre}`
        };
    }

    actionAvoidEnemy(npc) {
        // Huir a otra locación
        const connections = this.getLocationConnections(npc.locacion_actual);
        if (connections.length === 0) return null;

        // Elegir la más alejada de enemigos
        const safestLocation = connections[0]; // Simplificado

        this.moveNpc(npc.id, safestLocation);
        this.addMemory(npc.id, { type: 'fled', from: npc.locacion_actual });

        return {
            action: 'avoid_enemy',
            npc: npc.id,
            from: npc.locacion_actual,
            to: safestLocation,
            description: `${npc.nombre} huyó a ${safestLocation} para evitar conflictos`
        };
    }

    actionSeekFriend(npc) {
        // Buscar amigos
        const friends = this.findFriends(npc.id);
        if (friends.length === 0) return null;

        const friend = friends[Math.floor(Math.random() * friends.length)];

        // Mejorar relación
        npcRelationships.updateRelationship(npc.id, friend.id, {
            amistad: 5,
            evento: { tipo: 'friendly_interaction' }
        });

        this.addMemory(npc.id, {
            type: 'friendship',
            involvedNpc: friend.id
        });

        return {
            action: 'seek_friend',
            npc: npc.id,
            friend: friend.id,
            description: `${npc.nombre} pasó tiempo con su amigo ${friend.nombre}`
        };
    }

    actionConfront(npc) {
        const rivals = this.getRivalsInLocation(npc.id, npc.locacion_actual);
        if (rivals.length === 0) return null;

        const rival = rivals[0];
        const personality = npc.personalidad || {};

        // Confrontación según personalidad
        let confrontType = 'discusion';
        if (personality.agresivo >= 9) confrontType = 'pelea';
        else if (personality.vengativo >= 8) confrontType = 'amenaza';

        // Empeorar relación
        npcRelationships.updateRelationship(npc.id, rival.id, {
            rivalidad: 10,
            respeto: personality.honorable >= 7 ? 5 : -5,
            evento: { tipo: 'confrontation', confrontType }
        });

        this.addMemory(npc.id, {
            type: 'confrontation',
            involvedNpc: rival.id,
            confrontType
        });

        return {
            action: 'confront',
            npc: npc.id,
            rival: rival.id,
            type: confrontType,
            description: `${npc.nombre} confrontó a ${rival.nombre} (${confrontType})`
        };
    }

    actionRest(npc) {
        this.addMemory(npc.id, { type: 'rest', location: npc.locacion_actual });

        return {
            action: 'rest',
            npc: npc.id,
            location: npc.locacion_actual,
            description: `${npc.nombre} descansó en ${npc.locacion_actual}`
        };
    }

    // ===== UTILIDADES =====
    weightedRandomChoice(choices) {
        const totalWeight = choices.reduce((sum, c) => sum + c.weight, 0);
        if (totalWeight === 0) return null;

        let random = Math.random() * totalWeight;

        for (const choice of choices) {
            random -= choice.weight;
            if (random <= 0) return choice;
        }

        return choices[choices.length - 1];
    }

    getNpcData(npcId) {
        try {
            const npc = db.prepare(`
                SELECT n.*, ns.* 
                FROM npcs n
                LEFT JOIN npc_state ns ON n.id = ns.npc_id
                WHERE n.id = ?
            `).get(npcId);

            if (npc && npc.personalidad && typeof npc.personalidad === 'string') {
                npc.personalidad = JSON.parse(npc.personalidad);
            }

            return npc;
        } catch (error) {
            console.error(`Error obteniendo NPC ${npcId}:`, error);
            return null;
        }
    }

    getNpcsInLocation(locationId, excludeId = null) {
        try {
            const npcs = db.prepare(`
                SELECT n.*, ns.locacion_actual
                FROM npcs n
                LEFT JOIN npc_state ns ON n.id = ns.npc_id
                WHERE ns.locacion_actual = ? AND n.estado = 'activo'
                ${excludeId ? 'AND n.id != ?' : ''}
            `).all(excludeId ? [locationId, excludeId] : [locationId]);

            return npcs.map(npc => {
                if (npc.personalidad && typeof npc.personalidad === 'string') {
                    npc.personalidad = JSON.parse(npc.personalidad);
                }
                return npc;
            });
        } catch (error) {
            return [];
        }
    }

    getLocationConnections(locationId) {
        try {
            const location = db.prepare('SELECT conexiones FROM locations WHERE id = ?').get(locationId);
            if (location && location.conexiones) {
                return JSON.parse(location.conexiones);
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    getMostPopulatedLocation(locations) {
        let maxPop = -1;
        let target = null;

        for (const loc of locations) {
            const count = this.getNpcsInLocation(loc).length;
            if (count > maxPop) {
                maxPop = count;
                target = loc;
            }
        }

        return target || locations[0];
    }

    moveNpc(npcId, newLocation) {
        try {
            db.prepare(`
                UPDATE npc_state 
                SET locacion_actual = ?, updated_at = ?
                WHERE npc_id = ?
            `).run(newLocation, Date.now(), npcId);
        } catch (error) {
            console.error(`Error moviendo NPC ${npcId}:`, error);
        }
    }

    chooseInteractionTarget(npcId, candidates) {
        if (candidates.length === 0) return null;

        // Ponderar por relación
        const scored = candidates.map(candidate => {
            const rel = npcRelationships.getRelationship(npcId, candidate.id);
            let score = 10;

            // Amigos/amantes = más probable
            if (rel.estado === 'amantes') score += 50;
            else if (rel.estado === 'amigos') score += 30;
            else if (rel.estado === 'tension_sexual') score += 25;

            // Enemigos = menos probable (pero posible para drama)
            else if (rel.estado === 'enemigos') score -= 20;
            else if (rel.estado === 'rivales') score -= 10;

            return { npc: candidate, score: Math.max(0, score) };
        });

        return this.weightedRandomChoice(
            scored.map(s => ({ ...s.npc, weight: s.score }))
        );
    }

    hasActiveRomance(npcId) {
        const relationships = npcRelationships.getRelationshipsByNpc(npcId);
        return relationships.some(r => r.estado === 'amantes');
    }

    hasEnemyInLocation(npcId, locationId) {
        const npcsHere = this.getNpcsInLocation(locationId, npcId);
        return npcsHere.some(npc => {
            const rel = npcRelationships.getRelationship(npcId, npc.id);
            return rel.estado === 'enemigos';
        });
    }

    hasRivalInLocation(npcId, locationId) {
        const npcsHere = this.getNpcsInLocation(locationId, npcId);
        return npcsHere.some(npc => {
            const rel = npcRelationships.getRelationship(npcId, npc.id);
            return rel.estado === 'rivales' || rel.estado === 'enemigos';
        });
    }

    getRivalsInLocation(npcId, locationId) {
        const npcsHere = this.getNpcsInLocation(locationId, npcId);
        return npcsHere.filter(npc => {
            const rel = npcRelationships.getRelationship(npcId, npc.id);
            return rel.estado === 'rivales' || rel.estado === 'enemigos';
        });
    }

    findPotentialPartners(npcId) {
        const allRelationships = npcRelationships.getRelationshipsByNpc(npcId);

        const potential = allRelationships
            .filter(r => r.atraccion >= 40 && r.estado !== 'enemigos')
            .sort((a, b) => b.atraccion - a.atraccion);

        return potential.map(r => {
            const partnerId = r.npc1_id === npcId ? r.npc2_id : r.npc1_id;
            return this.getNpcData(partnerId);
        }).filter(Boolean);
    }

    findFriends(npcId) {
        const allRelationships = npcRelationships.getRelationshipsByNpc(npcId);

        const friends = allRelationships
            .filter(r => r.estado === 'amigos' || r.amistad >= 60);

        return friends.map(r => {
            const friendId = r.npc1_id === npcId ? r.npc2_id : r.npc1_id;
            return this.getNpcData(friendId);
        }).filter(Boolean);
    }

    // ===== DECISIONES PARA TODOS LOS NPCs =====
    async makeAllDecisions() {
        try {
            const activeNpcs = db.prepare(`
                SELECT n.id 
                FROM npcs n
                WHERE n.estado = 'activo'
            `).all();

            const decisions = [];

            for (const npc of activeNpcs) {
                const decision = await this.makeDecision(npc.id);
                if (decision) {
                    decisions.push(decision);
                }
            }

            return decisions;
        } catch (error) {
            console.error('Error en decisiones de NPCs:', error);
            return [];
        }
    }

    // ===== ESTADÍSTICAS =====
    getAIStats() {
        return {
            npcsWithMemories: this.npcMemories.size,
            totalMemories: Array.from(this.npcMemories.values()).reduce((sum, m) => sum + m.length, 0),
            activeGoals: this.npcGoals.size
        };
    }
}

// Singleton
const npcAI = new NpcAI();
export default npcAI;
