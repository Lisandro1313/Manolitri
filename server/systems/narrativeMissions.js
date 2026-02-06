// =====================================================
// SISTEMA DE MISIONES NARRATIVAS INTERACTIVAS
// =====================================================
// Misiones con historia paso a paso, decisiones con timer,
// modo solo o en grupo (votación), consecuencias reales

import survivalDB from '../db/survivalDB.js';
const db = survivalDB.db;

class NarrativeMissionSystem {
    constructor() {
        this.activeMissions = new Map(); // missionId -> mission state
        this.votingSessions = new Map(); // missionId -> voting data

        this.initializeSchema();
        this.loadMissionTemplates();
    }

    // ===== SCHEMA =====
    initializeSchema() {
        try {
            // Tabla de misiones activas
            db.exec(`
                CREATE TABLE IF NOT EXISTS narrative_missions (
                    id TEXT PRIMARY KEY,
                    template_id TEXT NOT NULL,
                    leader_id TEXT NOT NULL,
                    party_members TEXT, -- JSON array de player IDs
                    current_step INTEGER DEFAULT 0,
                    is_group BOOLEAN DEFAULT 0,
                    status TEXT DEFAULT 'active', -- active, completed, failed
                    consequences TEXT, -- JSON de efectos acumulados
                    started_at INTEGER DEFAULT (strftime('%s','now') * 1000),
                    completed_at INTEGER
                );

                CREATE TABLE IF NOT EXISTS mission_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    mission_id TEXT NOT NULL,
                    player_id TEXT NOT NULL,
                    step INTEGER,
                    choice TEXT,
                    timestamp INTEGER DEFAULT (strftime('%s','now') * 1000)
                );
            `);
            console.log('✅ Schema de misiones narrativas creado');
        } catch (error) {
            console.error('Error creando schema de misiones narrativas:', error);
        }
    }

    // ===== TEMPLATES DE MISIONES =====
    loadMissionTemplates() {
        this.templates = {
            // NIVEL 1
            'almacen_oscuro': {
                id: 'almacen_oscuro',
                title: '🏚️ El Almacén Oscuro',
                description: 'Un viejo almacén abandonado. Podrían haber suministros... o zombies.',
                minLevel: 1,
                maxPartySize: 4,
                estimatedTime: '5-10 min',
                rewards: {
                    solo: { xp: 50, items: { lata: 2, agua: 1 } },
                    group: { xp: 35, items: { lata: 3, agua: 2 } }
                },
                steps: [
                    {
                        id: 0,
                        text: '🚪 Te acercas al almacén. La puerta está entreabierta, cruje con el viento. Está oscuro adentro.',
                        choices: [
                            { id: 'enter_careful', text: '👣 Entrar con cuidado', next: 1 },
                            { id: 'enter_fast', text: '🏃 Entrar rápidamente', next: 2 },
                            { id: 'knock', text: '✊ Tocar la puerta primero', next: 3 },
                            { id: 'retreat', text: '🔙 Mejor no arriesgarse', next: -1, effect: { fled: true } }
                        ],
                        timer: 25
                    },
                    {
                        id: 1,
                        text: '👀 Entras lentamente, mirando cada rincón. Escuchas un ruido en el pasillo del fondo...',
                        choices: [
                            { id: 'investigate', text: '🔦 Ir a investigar', next: 4 },
                            { id: 'ignore', text: '🤫 Ignorar y buscar suministros', next: 5 },
                            { id: 'hide', text: '📦 Esconderse detrás de cajas', next: 6 },
                            { id: 'leave', text: '🚪 Salir inmediatamente', next: -1, effect: { fled: true } }
                        ],
                        timer: 25
                    },
                    {
                        id: 2,
                        text: '💨 Entras rápidamente y haces ruido. ¡ZOMBIES! Escuchas gruñidos acercándose desde múltiples direcciones.',
                        choices: [
                            { id: 'fight', text: '⚔️ Prepararse para luchar', next: 7 },
                            { id: 'run', text: '🏃 Correr hacia la salida', next: 8 },
                            { id: 'barricade', text: '🚧 Buscar algo para barricarse', next: 9 },
                            { id: 'climb', text: '🪜 Trepar a un lugar alto', next: 10 }
                        ],
                        timer: 15,
                        danger: true
                    },
                    {
                        id: 3,
                        text: '✊ TOC TOC... El eco resuena dentro. Silencio. Luego, pasos arrastrándose hacia la puerta.',
                        choices: [
                            { id: 'wait', text: '⏳ Esperar a ver qué sale', next: 11 },
                            { id: 'weapon', text: '🔪 Preparar arma', next: 12 },
                            { id: 'run_now', text: '🏃 Correr AHORA', next: -1, effect: { fled: true } },
                            { id: 'peek', text: '👁️ Asomarse por la ventana', next: 13 }
                        ],
                        timer: 15,
                        danger: true
                    },
                    {
                        id: 4,
                        text: '🔦 Avanzas hacia el pasillo. Hay un zombie solitario de espaldas, no te ha visto.',
                        choices: [
                            { id: 'sneak_attack', text: '🗡️ Ataque silencioso', next: 14, effect: { success: 0.7 } },
                            { id: 'shoot', text: '🔫 Dispararle', next: 15, effect: { noise: true } },
                            { id: 'sneak_past', text: '🤫 Pasar sin que te vea', next: 16, effect: { success: 0.5 } },
                            { id: 'back_off', text: '🔙 Retroceder', next: 5 }
                        ],
                        timer: 25
                    },
                    {
                        id: 5,
                        text: '📦 Encuentras algunas cajas con suministros. Mientras revisas, escuchas gruñidos lejanos.',
                        choices: [
                            { id: 'take_all', text: '🎒 Llevar todo rápido', next: 17, effect: { loot: 'high', noise: true } },
                            { id: 'take_essential', text: '👜 Solo lo esencial', next: 18, effect: { loot: 'medium' } },
                            { id: 'leave_loot', text: '🏃 Salir sin nada', next: -1, effect: { fled: true } },
                            { id: 'set_trap', text: '🪤 Poner trampa y llevarse algo', next: 19, effect: { loot: 'medium' } }
                        ],
                        timer: 25
                    },
                    {
                        id: 6,
                        text: '📦 Te escondes. Los pasos se acercan... Un zombie pasa cerca pero no te detecta. Sigue de largo.',
                        choices: [
                            { id: 'stay_hidden', text: '🤫 Seguir escondido', next: 20 },
                            { id: 'follow', text: '👣 Seguirlo sigilosamente', next: 21 },
                            { id: 'search_now', text: '🔍 Buscar suministros ahora', next: 5 },
                            { id: 'escape', text: '🚪 Escapar mientras está lejos', next: -1, effect: { success: true } }
                        ],
                        timer: 25
                    },
                    {
                        id: 7,
                        text: '⚔️ ¡COMBATE! 3 zombies te rodean. Están débiles pero son varios.',
                        choices: [
                            { id: 'fight_defensive', text: '🛡️ Pelear defensivamente', next: 22, effect: { damage: 'low', stamina: 30 } },
                            { id: 'fight_aggressive', text: '⚔️ Ataque total', next: 23, effect: { damage: 'medium', kills: 3 } },
                            { id: 'use_item', text: '💣 Usar granada/bomba', next: 24, effect: { item: 'granada', kills: 3 } },
                            { id: 'desperate_run', text: '🏃💨 Correr desesperadamente', next: 8 }
                        ],
                        timer: 10,
                        critical: true
                    },
                    {
                        id: 8,
                        text: '🏃 Corres hacia la salida esquivando zombies. Uno te araña el brazo.',
                        choices: [
                            { id: 'keep_running', text: '💨 Seguir corriendo', next: -1, effect: { escaped: true, damage: 'low' } },
                            { id: 'push_shelves', text: '📦 Tirar estantes detrás', next: 25, effect: { damage: 'low' } },
                            { id: 'fight_way_out', text: '⚔️ Abrirse paso luchando', next: 26, effect: { damage: 'medium' } },
                            { id: 'hide_quick', text: '🚪 Esconderse en oficina', next: 27 }
                        ],
                        timer: 10,
                        critical: true
                    },
                    // ... más steps (hasta 30+)
                    {
                        id: 14,
                        text: '🗡️ Te acercas silenciosamente... ¡Éxito! Neutralizaste al zombie sin hacer ruido.',
                        choices: [
                            { id: 'continue_search', text: '🔍 Seguir explorando', next: 5 },
                            { id: 'leave_now', text: '🚪 Salir victorioso', next: -1, effect: { success: true, bonus: true } },
                            { id: 'check_zombie', text: '👀 Revisar el cuerpo', next: 28 },
                            { id: 'set_trap', text: '🪤 Poner trampa para otros', next: 29 }
                        ],
                        timer: 25
                    },
                    {
                        id: -1,
                        text: '✅ Misión completada.',
                        isFinal: true
                    }
                ]
            },

            // NIVEL 2
            'hospital_acto1': {
                id: 'hospital_acto1',
                title: '🏥 Hospital Abandonado - Acto 1',
                description: 'El hospital en ruinas. Se rumorea que hay medicinas... y horrores.',
                minLevel: 2,
                maxPartySize: 4,
                estimatedTime: '10-15 min',
                rewards: {
                    solo: { xp: 100, items: { medicina: 2, vendajes: 3 } },
                    group: { xp: 75, items: { medicina: 3, vendajes: 5 } }
                },
                steps: [
                    {
                        id: 0,
                        text: '🏥 El hospital se alza ante ti, ventanas rotas, puertas colgando. Un olor a muerte flota en el aire.',
                        choices: [
                            { id: 'main_entrance', text: '🚪 Entrada principal', next: 1 },
                            { id: 'emergency', text: '🚑 Entrada de emergencias', next: 2 },
                            { id: 'side_window', text: '🪟 Ventana lateral', next: 3 },
                            { id: 'scout_first', text: '👀 Rodear y observar primero', next: 4 }
                        ],
                        timer: 25
                    },
                    // ... más steps complejos
                ]
            },

            // NIVEL 1 - Simple
            'busqueda_basica': {
                id: 'busqueda_basica',
                title: '🔍 Búsqueda Básica',
                description: 'Recorre el área cercana en busca de suministros básicos.',
                minLevel: 1,
                maxPartySize: 2,
                estimatedTime: '3-5 min',
                rewards: {
                    solo: { xp: 25, items: { lata: 1 } },
                    group: { xp: 20, items: { lata: 2 } }
                },
                steps: [
                    {
                        id: 0,
                        text: '🌆 Sales a explorar. Ves un coche abandonado y una tienda con la puerta rota.',
                        choices: [
                            { id: 'car', text: '🚗 Revisar el coche', next: 1 },
                            { id: 'store', text: '🏪 Entrar a la tienda', next: 2 },
                            { id: 'both', text: '🔄 Revisar ambos', next: 3 },
                            { id: 'return', text: '🔙 Volver', next: -1, effect: { fled: true } }
                        ],
                        timer: 25
                    },
                    {
                        id: 1,
                        text: '🚗 El coche está vacío excepto... ¡una lata de comida en la guantera!',
                        choices: [
                            { id: 'take', text: '✅ Tomar y volver', next: -1, effect: { success: true, loot: { lata: 1 } } },
                            { id: 'check_store', text: '🏪 También revisar tienda', next: 2 },
                            { id: 'check_trunk', text: '🔓 Intentar abrir el baúl', next: 4 },
                            { id: 'leave', text: '🚶 Dejarlo y explorar más', next: 5 }
                        ],
                        timer: 25
                    },
                    {
                        id: 2,
                        text: '🏪 Entras a la tienda. Está saqueada pero ves algo brillando en el mostrador.',
                        choices: [
                            { id: 'grab', text: '👋 Agarrarlo rápido', next: -1, effect: { success: true, loot: { agua: 1 } } },
                            { id: 'careful', text: '🤫 Acercarse con cuidado', next: 6 },
                            { id: 'noise', text: '🔊 Hacer ruido para atraer zombies', next: 7 },
                            { id: 'back', text: '🔙 Mejor no', next: -1, effect: { fled: true } }
                        ],
                        timer: 15
                    },
                    {
                        id: -1,
                        text: '✅ Misión completada.',
                        isFinal: true
                    }
                ]
            }
        };

        console.log(`📖 ${Object.keys(this.templates).length} plantillas de misiones cargadas`);
    }

    // ===== OBTENER MISIONES DISPONIBLES =====
    getAvailableMissions(playerLevel) {
        return Object.values(this.templates)
            .filter(mission => mission.minLevel <= playerLevel)
            .map(mission => ({
                id: mission.id,
                title: mission.title,
                description: mission.description,
                minLevel: mission.minLevel,
                maxPartySize: mission.maxPartySize,
                estimatedTime: mission.estimatedTime,
                rewards: mission.rewards
            }));
    }

    // ===== INICIAR MISIÓN =====
    startMission(templateId, leaderId, isGroup = false, partyMembers = []) {
        const template = this.templates[templateId];
        if (!template) return { success: false, message: 'Misión no encontrada' };

        const missionId = `${templateId}_${Date.now()}`;

        const mission = {
            id: missionId,
            templateId: template.id,
            template: template,
            leaderId,
            partyMembers: isGroup ? partyMembers : [leaderId],
            isGroup,
            currentStep: 0,
            status: 'active',
            consequences: {
                health: 0,
                items_gained: {},
                items_lost: {},
                kills: 0
            },
            startedAt: Date.now()
        };

        // Guardar en memoria
        this.activeMissions.set(missionId, mission);

        // Guardar en DB
        try {
            db.prepare(`
                INSERT INTO narrative_missions (id, template_id, leader_id, party_members, is_group)
                VALUES (?, ?, ?, ?, ?)
            `).run(
                missionId,
                templateId,
                leaderId,
                JSON.stringify(partyMembers),
                isGroup ? 1 : 0
            );
        } catch (error) {
            console.error('Error guardando misión:', error);
        }

        return {
            success: true,
            mission: {
                id: missionId,
                title: template.title,
                currentStep: this.getCurrentStepData(mission),
                isGroup,
                partyMembers
            }
        };
    }

    // ===== OBTENER PASO ACTUAL =====
    getCurrentStepData(mission) {
        const step = mission.template.steps.find(s => s.id === mission.currentStep);
        if (!step) return null;

        return {
            stepId: step.id,
            text: step.text,
            choices: step.choices,
            timer: step.timer || 30,
            danger: step.danger || false,
            critical: step.critical || false,
            isFinal: step.isFinal || false
        };
    }

    // ===== HACER ELECCIÓN (SOLO) =====
    makeChoice(missionId, playerId, choiceId) {
        const mission = this.activeMissions.get(missionId);
        if (!mission) return { success: false, message: 'Misión no encontrada' };
        if (mission.status !== 'active') return { success: false, message: 'Misión no activa' };

        const currentStep = mission.template.steps.find(s => s.id === mission.currentStep);
        if (!currentStep) return { success: false, message: 'Paso no encontrado' };

        const choice = currentStep.choices.find(c => c.id === choiceId);
        if (!choice) return { success: false, message: 'Elección no válida' };

        // Registrar elección
        this.recordChoice(missionId, playerId, mission.currentStep, choiceId);

        // Aplicar efectos
        if (choice.effect) {
            this.applyEffects(mission, choice.effect);
        }

        // Avanzar al siguiente paso
        const nextStepId = choice.next;

        if (nextStepId === -1 || currentStep.isFinal) {
            // Misión terminada
            return this.completeMission(missionId);
        }

        mission.currentStep = nextStepId;
        const nextStep = this.getCurrentStepData(mission);

        return {
            success: true,
            nextStep,
            effects: choice.effect || null
        };
    }

    // ===== INICIAR VOTACIÓN (GRUPO) =====
    startVoting(missionId, stepId) {
        const mission = this.activeMissions.get(missionId);
        if (!mission || !mission.isGroup) return;

        const step = mission.template.steps.find(s => s.id === stepId);
        if (!step) return;

        const votingSession = {
            missionId,
            stepId,
            choices: step.choices.map(c => c.id),
            votes: new Map(), // playerId -> choiceId
            startedAt: Date.now(),
            timer: step.timer || 20
        };

        this.votingSessions.set(missionId, votingSession);

        // Auto-resolver después del timer
        setTimeout(() => {
            this.resolveVoting(missionId);
        }, votingSession.timer * 1000);

        return votingSession;
    }

    // ===== VOTAR (GRUPO) =====
    vote(missionId, playerId, choiceId) {
        const voting = this.votingSessions.get(missionId);
        if (!voting) return { success: false, message: 'No hay votación activa' };

        const mission = this.activeMissions.get(missionId);
        if (!mission.partyMembers.includes(playerId)) {
            return { success: false, message: 'No eres parte del grupo' };
        }

        voting.votes.set(playerId, choiceId);

        return {
            success: true,
            votesCount: voting.votes.size,
            totalMembers: mission.partyMembers.length
        };
    }

    // ===== RESOLVER VOTACIÓN =====
    resolveVoting(missionId) {
        const voting = this.votingSessions.get(missionId);
        if (!voting) return;

        // Contar votos
        const voteCounts = new Map();
        for (const choiceId of voting.votes.values()) {
            voteCounts.set(choiceId, (voteCounts.get(choiceId) || 0) + 1);
        }

        // Encontrar ganador (mayoría)
        let winningChoice = null;
        let maxVotes = 0;
        for (const [choiceId, count] of voteCounts.entries()) {
            if (count > maxVotes) {
                maxVotes = count;
                winningChoice = choiceId;
            }
        }

        // Si nadie votó, elegir aleatoriamente
        if (!winningChoice && voting.choices.length > 0) {
            winningChoice = voting.choices[Math.floor(Math.random() * voting.choices.length)];
        }

        // Aplicar elección ganadora
        const mission = this.activeMissions.get(missionId);
        if (mission) {
            this.makeChoice(missionId, mission.leaderId, winningChoice);
        }

        // Limpiar votación
        this.votingSessions.delete(missionId);

        return { winningChoice, votes: voteCounts };
    }

    // ===== APLICAR EFECTOS =====
    applyEffects(mission, effect) {
        if (effect.damage) {
            const damageMap = { low: 10, medium: 25, high: 50 };
            mission.consequences.health -= damageMap[effect.damage] || 0;
        }

        if (effect.loot) {
            if (typeof effect.loot === 'object') {
                Object.entries(effect.loot).forEach(([item, qty]) => {
                    mission.consequences.items_gained[item] =
                        (mission.consequences.items_gained[item] || 0) + qty;
                });
            }
        }

        if (effect.kills) {
            mission.consequences.kills += effect.kills;
        }

        if (effect.fled) {
            mission.consequences.fled = true;
        }
    }

    // ===== COMPLETAR MISIÓN =====
    completeMission(missionId) {
        const mission = this.activeMissions.get(missionId);
        if (!mission) return { success: false };

        mission.status = 'completed';
        mission.completedAt = Date.now();

        // Calcular recompensas
        const baseRewards = mission.isGroup ?
            mission.template.rewards.group :
            mission.template.rewards.solo;

        const finalRewards = {
            xp: baseRewards.xp,
            items: { ...baseRewards.items, ...mission.consequences.items_gained },
            health: mission.consequences.health,
            kills: mission.consequences.kills
        };

        // Actualizar DB
        try {
            db.prepare(`
                UPDATE narrative_missions 
                SET status = ?, completed_at = ?, consequences = ?
                WHERE id = ?
            `).run(
                'completed',
                mission.completedAt,
                JSON.stringify(mission.consequences),
                missionId
            );
        } catch (error) {
            console.error('Error actualizando misión:', error);
        }

        // Limpiar
        this.activeMissions.delete(missionId);

        return {
            success: true,
            completed: true,
            rewards: finalRewards,
            consequences: mission.consequences,
            summary: this.generateSummary(mission)
        };
    }

    // ===== REGISTRAR ELECCIÓN =====
    recordChoice(missionId, playerId, step, choiceId) {
        try {
            db.prepare(`
                INSERT INTO mission_history (mission_id, player_id, step, choice)
                VALUES (?, ?, ?, ?)
            `).run(missionId, playerId, step, choiceId);
        } catch (error) {
            console.error('Error registrando elección:', error);
        }
    }

    // ===== GENERAR RESUMEN =====
    generateSummary(mission) {
        const duration = Math.floor((mission.completedAt - mission.startedAt) / 1000);

        return {
            title: mission.template.title,
            duration: `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`,
            mode: mission.isGroup ? 'Grupo' : 'Solo',
            players: mission.partyMembers.length,
            kills: mission.consequences.kills,
            fled: mission.consequences.fled || false
        };
    }

    // ===== OBTENER MISIÓN ACTIVA =====
    getActiveMission(playerId) {
        for (const [missionId, mission] of this.activeMissions.entries()) {
            if (mission.partyMembers.includes(playerId) && mission.status === 'active') {
                return {
                    id: missionId,
                    title: mission.template.title,
                    currentStep: this.getCurrentStepData(mission),
                    isGroup: mission.isGroup,
                    partyMembers: mission.partyMembers,
                    isLeader: mission.leaderId === playerId,
                    voting: this.votingSessions.get(missionId) || null
                };
            }
        }
        return null;
    }
}

// Singleton
const narrativeMissions = new NarrativeMissionSystem();
export default narrativeMissions;
