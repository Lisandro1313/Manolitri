/**
 * InstanceManager
 * Gestiona instancias de dungeons/aventuras:
 * - Crear instancias temporales para parties
 * - Procesar acciones en aventuras (exploración, combate, decisiones)
 * - Sistema de narrativa tipo D&D
 * - Finalizar aventuras y dar recompensas
 */

const db = require('../db');
const EventEmitter = require('events');

class InstanceManager extends EventEmitter {
    constructor() {
        super();

        // Instancias activas: { instanceId: instanceData }
        this.instances = new Map();

        // Mapa de party -> instancia: { partyId: instanceId }
        this.partyInstances = new Map();

        // Templates de dungeons (se cargarán de DB)
        this.dungeonTemplates = new Map();
    }

    /**
     * Inicializar: Cargar templates de dungeons
     */
    async initialize() {
        console.log('🗺️ Inicializando InstanceManager...');

        const rows = await db.all('SELECT * FROM dungeon_templates');

        for (const row of rows) {
            const template = {
                id: row.id,
                nombre: row.nombre,
                descripcion: row.descripcion,
                nivel_minimo: row.nivel_minimo,
                nivel_recomendado: row.nivel_recomendado,
                duracion_estimada: row.duracion_estimada,
                max_jugadores: row.max_jugadores,
                tipo: row.tipo,
                salas: JSON.parse(row.salas || '[]'),
                jefe_final: JSON.parse(row.jefe_final || '{}'),
                recompensas: {
                    oro_min: row.recompensas_oro_min,
                    oro_max: row.recompensas_oro_max,
                    xp: row.recompensas_xp,
                    items: JSON.parse(row.recompensas_items || '[]')
                },
                dificultad: row.dificultad
            };

            this.dungeonTemplates.set(template.id, template);
        }

        console.log(`✅ ${this.dungeonTemplates.size} dungeons cargados`);
    }

    /**
     * Crear nueva instancia de dungeon para un party
     */
    async createInstance(partyId, partyMembers, dungeonTemplateId) {
        // Verificar que el party no esté ya en una aventura
        if (this.partyInstances.has(partyId)) {
            return {
                success: false,
                error: 'El grupo ya está en una aventura'
            };
        }

        // Obtener template
        const template = this.dungeonTemplates.get(dungeonTemplateId);

        if (!template) {
            return {
                success: false,
                error: 'Dungeon no encontrado'
            };
        }

        // Verificar número de jugadores
        if (partyMembers.length > template.max_jugadores) {
            return {
                success: false,
                error: `Demasiados jugadores (máximo ${template.max_jugadores})`
            };
        }

        const instanceId = `instance_${Date.now()}_${partyId}`;

        // Crear instancia
        const instance = {
            id: instanceId,
            party_id: partyId,
            dungeon_template_id: dungeonTemplateId,
            template,
            estado: 'activa',
            jugadores: partyMembers.map(m => ({
                id: m.id,
                nombre: m.nombre,
                salud: 100,
                salud_max: 100,
                mana: 50,
                mana_max: 50,
                estado: 'activo' // activo, muerto, incapacitado
            })),
            progreso: {
                sala_actual: 0, // Índice de sala actual
                salas_exploradas: [],
                enemigos_derrotados: 0,
                cofres_abiertos: 0,
                turnos: 0
            },
            narrativa: [],
            combate_activo: null, // Datos del combate si hay uno activo
            decisiones: [],
            started_at: new Date()
        };

        this.instances.set(instanceId, instance);
        this.partyInstances.set(partyId, instanceId);

        // Guardar en DB
        await db.run(`
      INSERT INTO dungeon_instances (
        id, party_id, dungeon_template_id, sala_actual
      ) VALUES (?, ?, ?, ?)
    `, [instanceId, partyId, dungeonTemplateId, 0]);

        // Generar narrativa inicial
        this.addNarrative(instanceId, {
            tipo: 'inicio',
            texto: `🗺️ **${template.nombre}**\n\n${template.descripcion}\n\n¡La aventura comienza!`,
            timestamp: new Date()
        });

        // Describir primera sala
        this.describeCurrentRoom(instanceId);

        console.log(`🎭 Instancia ${instanceId} creada para party ${partyId} (${template.nombre})`);

        return {
            success: true,
            instance: this.getInstanceData(instanceId)
        };
    }

    /**
     * Describir sala actual
     */
    describeCurrentRoom(instanceId) {
        const instance = this.instances.get(instanceId);

        if (!instance) return;

        const salaIndex = instance.progreso.sala_actual;
        const sala = instance.template.salas[salaIndex];

        if (!sala) {
            // No hay más salas, el dungeon está completo
            this.completeInstance(instanceId);
            return;
        }

        this.addNarrative(instanceId, {
            tipo: 'sala',
            texto: `📍 **${sala.nombre}**\n\n${sala.descripcion}`,
            sala: salaIndex
        });

        // Si hay enemigos, iniciar combate
        if (sala.enemigos && sala.enemigos.length > 0) {
            this.startCombat(instanceId, sala.enemigos);
        }
    }

    /**
     * Iniciar combate
     */
    startCombat(instanceId, enemigos) {
        const instance = this.instances.get(instanceId);

        if (!instance) return;

        instance.combate_activo = {
            enemigos: enemigos.map((e, idx) => ({
                id: `enemy_${idx}`,
                ...e,
                salud_actual: e.salud,
                estado: 'vivo'
            })),
            turno_actual: 0,
            orden_turnos: [], // Se calculará por iniciativa
            turno_de: null
        };

        // Calcular orden de turnos (jugadores + enemigos por iniciativa)
        const participantes = [
            ...instance.jugadores.map(j => ({ tipo: 'jugador', id: j.id, nombre: j.nombre, iniciativa: Math.floor(Math.random() * 20) + 1 })),
            ...instance.combate_activo.enemigos.map(e => ({ tipo: 'enemigo', id: e.id, nombre: e.nombre, iniciativa: Math.floor(Math.random() * 20) + 1 }))
        ];

        participantes.sort((a, b) => b.iniciativa - a.iniciativa);

        instance.combate_activo.orden_turnos = participantes;
        instance.combate_activo.turno_de = participantes[0];

        const enemigosNombres = enemigos.map(e => e.nombre).join(', ');

        this.addNarrative(instanceId, {
            tipo: 'combate_inicio',
            texto: `⚔️ **¡COMBATE!**\n\n${enemigosNombres} os atacan!\n\n🎲 Orden de iniciativa:\n${participantes.map(p => `- ${p.nombre} (${p.iniciativa})`).join('\n')}`
        });
    }

    /**
     * Procesar acción de jugador
     */
    async processAction(instanceId, characterId, action) {
        const instance = this.instances.get(instanceId);

        if (!instance) {
            return { success: false, error: 'Instancia no encontrada' };
        }

        if (instance.estado !== 'activa') {
            return { success: false, error: 'Esta aventura ya finalizó' };
        }

        const jugador = instance.jugadores.find(j => j.id === characterId);

        if (!jugador) {
            return { success: false, error: 'No estás en esta aventura' };
        }

        // Si hay combate activo
        if (instance.combate_activo) {
            return this.processCombatAction(instanceId, characterId, jugador, action);
        }

        // Acciones fuera de combate
        switch (action.tipo) {
            case 'explorar':
                return this.exploreNextRoom(instanceId);

            case 'abrir_cofre':
                return this.openChest(instanceId, characterId);

            case 'decision':
                return this.makeDecision(instanceId, characterId, action.opcion);

            default:
                return { success: false, error: 'Acción desconocida' };
        }
    }

    /**
     * Procesar acción de combate
     */
    processCombatAction(instanceId, characterId, jugador, action) {
        const instance = this.instances.get(instanceId);
        const combate = instance.combate_activo;

        // Verificar que sea su turno
        if (combate.turno_de.tipo !== 'jugador' || combate.turno_de.id !== characterId) {
            return { success: false, error: 'No es tu turno' };
        }

        let resultado = '';

        switch (action.tipo) {
            case 'atacar':
                const objetivo = combate.enemigos.find(e => e.id === action.objetivo);

                if (!objetivo || objetivo.estado !== 'vivo') {
                    return { success: false, error: 'Objetivo inválido' };
                }

                // Calcular daño (simplificado)
                const danio = Math.floor(Math.random() * 15) + 5;
                objetivo.salud_actual -= danio;

                resultado = `⚔️ **${jugador.nombre}** ataca a **${objetivo.nombre}** por **${danio}** de daño`;

                if (objetivo.salud_actual <= 0) {
                    objetivo.salud_actual = 0;
                    objetivo.estado = 'muerto';
                    resultado += `\n💀 ¡${objetivo.nombre} ha sido derrotado!`;
                    instance.progreso.enemigos_derrotados++;
                } else {
                    resultado += `\n❤️ ${objetivo.nombre}: ${objetivo.salud_actual}/${objetivo.salud} HP`;
                }
                break;

            case 'defender':
                resultado = `🛡️ **${jugador.nombre}** se defiende (reduce daño recibido)`;
                jugador.defendiendo = true;
                break;

            case 'habilidad':
                resultado = `✨ **${jugador.nombre}** usa una habilidad`;
                // Implementar habilidades específicas
                break;

            default:
                return { success: false, error: 'Acción de combate inválida' };
        }

        this.addNarrative(instanceId, { tipo: 'combate_accion', texto: resultado });

        // Verificar si todos los enemigos murieron
        const enemigosVivos = combate.enemigos.filter(e => e.estado === 'vivo');

        if (enemigosVivos.length === 0) {
            this.endCombat(instanceId, true);
            return { success: true, combate_terminado: true };
        }

        // Avanzar turno
        this.nextTurn(instanceId);

        return { success: true };
    }

    /**
     * Avanzar al siguiente turno
     */
    nextTurn(instanceId) {
        const instance = this.instances.get(instanceId);
        const combate = instance.combate_activo;

        combate.turno_actual = (combate.turno_actual + 1) % combate.orden_turnos.length;
        combate.turno_de = combate.orden_turnos[combate.turno_actual];

        // Si es turno de enemigo, hacerlo actuar automáticamente
        if (combate.turno_de.tipo === 'enemigo') {
            setTimeout(() => this.enemyTurn(instanceId), 1000);
        }
    }

    /**
     * Turno de enemigo (IA simple)
     */
    enemyTurn(instanceId) {
        const instance = this.instances.get(instanceId);
        const combate = instance.combate_activo;
        const enemigo = combate.enemigos.find(e => e.id === combate.turno_de.id);

        if (!enemigo || enemigo.estado !== 'vivo') {
            this.nextTurn(instanceId);
            return;
        }

        // Elegir objetivo aleatorio
        const jugadoresVivos = instance.jugadores.filter(j => j.estado === 'activo');

        if (jugadoresVivos.length === 0) {
            this.endCombat(instanceId, false);
            return;
        }

        const objetivo = jugadoresVivos[Math.floor(Math.random() * jugadoresVivos.length)];

        // Atacar
        const danio = Math.floor(Math.random() * enemigo.danio) + 1;
        objetivo.salud -= danio;

        let texto = `🗡️ **${enemigo.nombre}** ataca a **${objetivo.nombre}** por **${danio}** de daño`;

        if (objetivo.salud <= 0) {
            objetivo.salud = 0;
            objetivo.estado = 'muerto';
            texto += `\n💀 ¡${objetivo.nombre} ha caído!`;
        } else {
            texto += `\n❤️ ${objetivo.nombre}: ${objetivo.salud}/${objetivo.salud_max} HP`;
        }

        this.addNarrative(instanceId, { tipo: 'combate_accion', texto });

        // Verificar si todos los jugadores murieron
        const jugadoresVivos2 = instance.jugadores.filter(j => j.estado === 'activo');

        if (jugadoresVivos2.length === 0) {
            this.endCombat(instanceId, false);
            return;
        }

        this.nextTurn(instanceId);
    }

    /**
     * Finalizar combate
     */
    endCombat(instanceId, victoria) {
        const instance = this.instances.get(instanceId);

        if (victoria) {
            this.addNarrative(instanceId, {
                tipo: 'combate_fin',
                texto: `🎉 **¡VICTORIA!**\n\nHabéis derrotado a vuestros enemigos.`
            });
            instance.combate_activo = null;
        } else {
            this.addNarrative(instanceId, {
                tipo: 'combate_fin',
                texto: `💀 **DERROTA**\n\nTodo el grupo ha caído...`
            });
            this.failInstance(instanceId);
        }
    }

    /**
     * Explorar siguiente sala
     */
    exploreNextRoom(instanceId) {
        const instance = this.instances.get(instanceId);

        if (instance.combate_activo) {
            return { success: false, error: 'Estás en combate' };
        }

        instance.progreso.sala_actual++;
        instance.progreso.salas_exploradas.push(instance.progreso.sala_actual);
        instance.progreso.turnos++;

        this.describeCurrentRoom(instanceId);

        return { success: true };
    }

    /**
     * Completar instancia exitosamente
     */
    async completeInstance(instanceId) {
        const instance = this.instances.get(instanceId);

        if (!instance) return;

        instance.estado = 'completada';

        // Calcular recompensas
        const recompensas = this.calculateRewards(instance);

        this.addNarrative(instanceId, {
            tipo: 'fin',
            texto: `🏆 **¡AVENTURA COMPLETADA!**\n\n**Recompensas:**\n- 💰 ${recompensas.oro} oro\n- ⚡ ${recompensas.xp} XP\n${recompensas.items.length > 0 ? `- 🎁 Items: ${recompensas.items.map(i => i.nombre).join(', ')}` : ''}`
        });

        // Actualizar DB
        await db.run(`
      UPDATE dungeon_instances 
      SET estado = 'completada', completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [instanceId]);

        console.log(`✅ Instancia ${instanceId} completada`);

        // Emitir evento para dar recompensas
        this.emit('instance:completed', {
            instanceId,
            partyId: instance.party_id,
            jugadores: instance.jugadores,
            recompensas
        });

        // Limpiar después de 30 segundos
        setTimeout(() => this.cleanupInstance(instanceId), 30000);
    }

    /**
     * Fallar instancia
     */
    async failInstance(instanceId) {
        const instance = this.instances.get(instanceId);

        if (!instance) return;

        instance.estado = 'fallida';

        await db.run(`
      UPDATE dungeon_instances 
      SET estado = 'fallida', completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [instanceId]);

        console.log(`❌ Instancia ${instanceId} fallida`);

        setTimeout(() => this.cleanupInstance(instanceId), 30000);
    }

    /**
     * Calcular recompensas
     */
    calculateRewards(instance) {
        const template = instance.template;

        return {
            oro: Math.floor(Math.random() * (template.recompensas.oro_max - template.recompensas.oro_min + 1)) + template.recompensas.oro_min,
            xp: template.recompensas.xp,
            items: [] // Implementar sistema de loot
        };
    }

    /**
     * Limpiar instancia de memoria
     */
    cleanupInstance(instanceId) {
        const instance = this.instances.get(instanceId);

        if (instance) {
            this.partyInstances.delete(instance.party_id);
            this.instances.delete(instanceId);
            console.log(`🧹 Instancia ${instanceId} limpiada`);
        }
    }

    /**
     * Añadir evento narrativo
     */
    addNarrative(instanceId, evento) {
        const instance = this.instances.get(instanceId);

        if (instance) {
            evento.timestamp = new Date();
            instance.narrativa.push(evento);

            // Limitar a últimos 50 eventos
            if (instance.narrativa.length > 50) {
                instance.narrativa.shift();
            }
        }
    }

    /**
     * Obtener datos de instancia (para enviar al cliente)
     */
    getInstanceData(instanceId) {
        const instance = this.instances.get(instanceId);

        if (!instance) return null;

        return {
            id: instance.id,
            dungeon_nombre: instance.template.nombre,
            estado: instance.estado,
            jugadores: instance.jugadores,
            progreso: instance.progreso,
            narrativa: instance.narrativa.slice(-10), // Últimos 10 eventos
            combate_activo: instance.combate_activo,
            duracion_estimada: instance.template.duracion_estimada
        };
    }

    /**
     * Obtener dungeons disponibles
     */
    getAvailableDungeons() {
        return Array.from(this.dungeonTemplates.values()).map(t => ({
            id: t.id,
            nombre: t.nombre,
            descripcion: t.descripcion,
            nivel_recomendado: t.nivel_recomendado,
            duracion_estimada: t.duracion_estimada,
            max_jugadores: t.max_jugadores,
            dificultad: t.dificultad
        }));
    }

    getStats() {
        return {
            instances_activas: this.instances.size,
            dungeons_disponibles: this.dungeonTemplates.size
        };
    }
}

// Singleton
const instanceManager = new InstanceManager();

module.exports = instanceManager;
