/**
 * MVP SURVIVAL ZOMBIE - Servidor Principal
 * Versión con persistencia y creación de personajes
 */

const express = require('express');
const path = require('path');
const survivalDB = require('./db/survivalDB');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ====================================
// ESTADO DEL MUNDO (en memoria)
// ====================================

const WORLD = {
    // Locaciones
    locations: {
        refugio: {
            id: 'refugio',
            nombre: 'Refugio Central',
            tipo: 'safe',
            descripcion: 'Un edificio fortificado. Hay gente aquí.',
            recursos: { comida: 20, medicinas: 5, armas: 2, materiales: 10 },
            zombies: 0,
            nivelRuido: 0,
            defensas: 50,
            conectado_a: ['supermercado', 'farmacia', 'casa_abandonada', 'hospital', 'comisaria']
        },
        supermercado: {
            id: 'supermercado',
            nombre: 'Supermercado Saqueado',
            tipo: 'loot',
            descripcion: 'Estantes vacíos, pero quizás quede algo. Huele a comida podrida.',
            recursos: { comida: 15, medicinas: 2, materiales: 5 },
            zombies: 3,
            nivelRuido: 0,
            conectado_a: ['refugio', 'hospital']
        },
        farmacia: {
            id: 'farmacia',
            nombre: 'Farmacia',
            tipo: 'loot',
            descripcion: 'La puerta está rota. Huele a muerte.',
            recursos: { medicinas: 10, comida: 1, materiales: 3 },
            zombies: 5,
            nivelRuido: 0,
            conectado_a: ['refugio']
        },
        casa_abandonada: {
            id: 'casa_abandonada',
            nombre: 'Casa Abandonada',
            tipo: 'loot',
            descripcion: 'Una casa de dos pisos. Silencio inquietante.',
            recursos: { comida: 8, armas: 1, materiales: 8 },
            zombies: 2,
            nivelRuido: 0,
            conectado_a: ['refugio']
        },
        hospital: {
            id: 'hospital',
            nombre: 'Hospital Abandonado',
            tipo: 'loot',
            descripcion: 'Corredores oscuros. Camillas volcadas. Muchos infectados.',
            recursos: { medicinas: 25, comida: 5, armas: 1, materiales: 10 },
            zombies: 12,
            nivelRuido: 0,
            conectado_a: ['refugio', 'supermercado']
        },
        comisaria: {
            id: 'comisaria',
            nombre: 'Comisaría',
            tipo: 'loot',
            descripcion: 'La estación de policía. Armería saqueada... ¿o no?',
            recursos: { armas: 8, medicinas: 3, comida: 2, materiales: 12 },
            zombies: 8,
            nivelRuido: 0,
            conectado_a: ['refugio']
        }
    },

    // NPCs con necesidades
    npcs: {
        dr_gomez: {
            id: 'dr_gomez',
            nombre: 'Dr. Gómez',
            rol: 'medico',
            locacion: 'refugio',
            salud: 80,
            hambre: 60,
            moral: 70,
            vivo: true,
            estado: 'activo',
            enMision: false,
            dialogo: 'Necesito medicinas urgente. María está grave.',
            dialogos: [
                'Necesito más suministros médicos.',
                'La situación está empeorando.',
                'Si consiguen medicinas, puedo hacer vendajes.',
                '¿Alguien ha visto antibióticos por ahí?',
                'Deberíamos enviar un equipo al hospital.',
                'No puedo hacer milagros sin medicinas.',
                'Cada día pierdo más pacientes...',
                'La infección se propaga rápido sin tratamiento.'
            ]
        },
        maria: {
            id: 'maria',
            nombre: 'María',
            rol: 'civil',
            locacion: 'refugio',
            salud: 30, // GRAVE
            hambre: 80,
            moral: 40,
            vivo: true,
            estado: 'activo',
            enMision: false,
            dialogo: '*tose sangre* Ayuda...',
            dialogos: [
                'Necesito descansar...',
                'Gracias por cuidarme.',
                'No sé cuánto más pueda aguantar.',
                'El Dr. Gómez hace lo que puede.',
                'Antes de esto, tenía una vida normal...',
                '¿Cómo llegó todo a ser así?',
                'Si sobrevivo, les deberé todo.',
                'Mi familia está... ya no está.'
            ]
        },
        capitan_rivas: {
            id: 'capitan_rivas',
            nombre: 'Capitán Rivas',
            rol: 'lider',
            locacion: 'refugio',
            salud: 100,
            hambre: 50,
            moral: 80,
            vivo: true,
            estado: 'activo',
            enMision: false,
            dialogo: 'Necesitamos comida. Y necesitamos que alguien explore.',
            dialogos: [
                'Hay que reforzar las defensas.',
                'Si no encontramos comida pronto, tendremos problemas.',
                'Voy a salir a explorar, cubran el refugio.',
                'Todos deben contribuir para sobrevivir.',
                'He visto hordas más grandes acercándose.',
                'Necesitamos un plan para el hospital.',
                '¿Alguien tiene experiencia militar aquí?',
                'La disciplina nos mantendrá vivos.',
                'No podemos quedarnos aquí para siempre.'
            ]
        },
        comerciante: {
            id: 'comerciante',
            nombre: 'Jorge el Comerciante',
            rol: 'comercio',
            locacion: 'refugio',
            salud: 90,
            hambre: 70,
            moral: 60,
            vivo: true,
            estado: 'activo',
            enMision: false,
            inventario: { comida: 5, medicinas: 2 },
            dialogo: 'Cambio recursos por favores.',
            dialogos: [
                'Tengo algunos suministros para comerciar.',
                'Todo tiene un precio en este mundo.',
                'Si me traen materiales, puedo conseguir más.',
                '¿Necesitas algo? Puedo hacer tratos.',
                'Conozco rutas seguras para comercio.',
                'Tengo contactos en otros refugios.',
                'El trueque es el nuevo dinero.',
                '¿Han oído de la zona militar? Hay armas ahí.'
            ]
        }
    },

    // Jugadores conectados
    players: {},

    // Quest cooperativa con votación
    questCooperativa: {
        activa: false,
        nombre: '',
        descripcion: '',
        opciones: [],
        votos: {}, // { opcion: [playerIds] }
        inicioPor: null,
        tiempoLimite: null,
        resultado: null
    },

    // Sistema de crafteo mejorado
    craftingRecipes: {
        vendaje: { materiales: 2, resultado: { tipo: 'medicinas', cantidad: 1 } },
        molotov: { materiales: 3, comida: 1, resultado: { tipo: 'armas', cantidad: 1 } },
        barricada: { materiales: 5, resultado: { tipo: 'defensa', cantidad: 10 } },
        trampa: { materiales: 4, armas: 1, resultado: { tipo: 'defensa', cantidad: 15 } },
        
        // NUEVAS RECETAS
        antibiotico: { medicinas: 2, materiales: 1, resultado: { tipo: 'medicinas_avanzadas', cantidad: 1 } },
        machete: { materiales: 6, armas: 1, resultado: { tipo: 'arma_melee', cantidad: 1 } },
        pistola_mejorada: { armas: 3, materiales: 5, resultado: { tipo: 'arma_fuerte', cantidad: 1 } },
        armadura_ligera: { materiales: 8, comida: 2, resultado: { tipo: 'armadura', cantidad: 1 } },
        botiquin: { medicinas: 3, materiales: 2, resultado: { tipo: 'kit_medico', cantidad: 1 } },
        explosivo: { materiales: 10, armas: 2, comida: 3, resultado: { tipo: 'bomba', cantidad: 1 } },
        radio: { materiales: 15, armas: 1, resultado: { tipo: 'comunicador', cantidad: 1 } },
        generador: { materiales: 20, armas: 3, resultado: { tipo: 'energia', cantidad: 1 } }
    },

    // Quests emergentes
    activeQuests: [],

    // Sistema de hordas
    nextHorde: null,
    hordeWarning: false,

    // Tipos de zombies especiales
    zombieTypes: {
        normal: { nombre: 'Zombie Normal', icono: '🧟', velocidad: 1, daño: 10, hp: 20 },
        corredor: { nombre: 'Corredor', icono: '🧟‍♂️', velocidad: 3, daño: 15, hp: 15 },
        gordo: { nombre: 'Gordo', icono: '🧟‍♀️', velocidad: 0.5, daño: 25, hp: 50 },
        gritón: { nombre: 'Gritón', icono: '😱', velocidad: 1, daño: 5, hp: 10, efecto: 'atrae_horda' }
    },

    // Eventos especiales que pueden ocurrir
    possibleEvents: [
        {
            id: 'viajero_herido',
            nombre: 'Viajero Herido',
            descripcion: 'Un sobreviviente herido pide asilo. Podría ser peligroso, pero parece tener suministros.',
            opciones: [
                { texto: 'Ayudarlo', costo: { medicinas: 2 }, recompensa: { comida: 5, moral: 20 }, riesgo: 0.1 },
                { texto: 'Rechazarlo', costo: {}, recompensa: { moral: -10 }, riesgo: 0 }
            ]
        },
        {
            id: 'suministros_aereos',
            nombre: 'Suministros Aéreos',
            descripcion: 'Viste un helicóptero lanzar una caja de suministros lejos. Pero hay humo... zombies irán ahí.',
            opciones: [
                { texto: 'Ir por los suministros', costo: {}, recompensa: { comida: 10, medicinas: 5, armas: 2 }, riesgo: 0.5 },
                { texto: 'Ignorar', costo: {}, recompensa: {}, riesgo: 0 }
            ]
        },
        {
            id: 'refugiados',
            nombre: 'Familia de Refugiados',
            descripcion: 'Una familia de 4 personas busca refugio. Consumirán comida, pero pueden ayudar a defender.',
            opciones: [
                { texto: 'Aceptarlos', costo: { comida: 8 }, recompensa: { defensas: 20, moral: 15 }, riesgo: 0 },
                { texto: 'Rechazarlos', costo: {}, recompensa: { moral: -20 }, riesgo: 0 }
            ]
        }
    ],

    // Eventos activos
    activeEvents: [],

    // Timer de simulación
    simulationTime: 0,
    lastUpdate: Date.now()
};

// ====================================
// SIMULACIÓN DEL MUNDO (cada 10 seg)
// ====================================

setInterval(() => {
    WORLD.simulationTime++;
    const hora = (WORLD.simulationTime * 10) % 1440; // Minutos del día (0-1440)

    // NPCs pierden hambre y tienen rutinas
    Object.values(WORLD.npcs).forEach(npc => {
        if (!npc.vivo) return;

        npc.hambre = Math.max(0, npc.hambre - 2);

        // Rutina: dormir (0-360 = 0-6am)
        if (hora >= 0 && hora < 360) {
            npc.estado = 'durmiendo';
            npc.salud = Math.min(100, npc.salud + 2); // Recupera salud
        } else if (hora >= 360 && hora < 720) {
            npc.estado = 'trabajando';
        } else {
            npc.estado = 'activo';
        }

        // NPCs se alimentan automáticamente del refugio si tienen hambre
        if (npc.hambre < 30 && npc.locacion === 'refugio' && WORLD.locations.refugio.recursos.comida > 0) {
            WORLD.locations.refugio.recursos.comida -= 1;
            npc.hambre = Math.min(100, npc.hambre + 25);
            npc.moral += 5;
            console.log(`🍖 ${npc.nombre} comió del refugio`);
            broadcast({
                type: 'world:event',
                message: `🍖 ${npc.nombre} comió del refugio`,
                category: 'npc'
            });
        }

        // Moral baja si salud baja
        if (npc.salud < 30) {
            npc.moral = Math.max(0, npc.moral - 3);
        }

        // Muerte por inanición o heridas
        if (npc.salud <= 0) {
            npc.vivo = false;
            console.log(`💀 ${npc.nombre} ha muerto`);
            broadcast({ type: 'npc:died', npcId: npc.id, nombre: npc.nombre });
            broadcast({
                type: 'world:event',
                message: `💀 ${npc.nombre} ha fallecido`,
                category: 'death'
            });

            // Generar quest de funeral
            WORLD.activeQuests.push({
                id: `funeral_${npc.id}`,
                tipo: 'social',
                descripcion: `${npc.nombre} ha muerto. Deberías enterrarlo.`,
                recompensa: 'moral de grupo'
            });
        }
    });

    // NPCs HABLAN ENTRE ELLOS (cada 90 segundos - más frecuente)
    if (WORLD.simulationTime % 9 === 0 && Math.random() > 0.3) {
        const npcsVivos = Object.values(WORLD.npcs).filter(n => n.vivo && n.locacion === 'refugio' && !n.enMision);
        if (npcsVivos.length >= 2) {
            const npc1 = npcsVivos[Math.floor(Math.random() * npcsVivos.length)];
            const npc2 = npcsVivos.filter(n => n.id !== npc1.id)[Math.floor(Math.random() * (npcsVivos.length - 1))];

            if (npc2 && npc1.dialogos && npc2.dialogos) {
                const dialogo1 = npc1.dialogos[Math.floor(Math.random() * npc1.dialogos.length)];
                const dialogo2 = npc2.dialogos[Math.floor(Math.random() * npc2.dialogos.length)];

                broadcast({
                    type: 'world:event',
                    message: `💬 ${npc1.nombre}: "${dialogo1}"`,
                    category: 'npc'
                });

                setTimeout(() => {
                    broadcast({
                        type: 'world:event',
                        message: `💬 ${npc2.nombre}: "${dialogo2}"`,
                        category: 'npc'
                    });
                }, 2000);
            }
        }
    }

    // NPCs SALEN A SCAVENGEAR (solo si no están en misión)
    if (WORLD.simulationTime % 15 === 0) {
        const npcsDisponibles = Object.values(WORLD.npcs).filter(n =>
            n.vivo &&
            !n.enMision &&
            n.locacion === 'refugio' &&
            n.salud > 50 &&
            n.hambre > 30 &&
            (n.rol === 'lider' || n.rol === 'civil')
        );

        if (npcsDisponibles.length > 0 && Math.random() > 0.6) {
            const npc = npcsDisponibles[Math.floor(Math.random() * npcsDisponibles.length)];
            const locacionesLoot = Object.values(WORLD.locations).filter(l => l.tipo === 'loot' && l.zombies < 5);

            if (locacionesLoot.length > 0) {
                const destino = locacionesLoot[Math.floor(Math.random() * locacionesLoot.length)];
                npc.enMision = true;
                npc.misionDestino = destino.id;
                npc.misionTiempoRestante = 3; // 3 ticks (30 segundos)

                broadcast({
                    type: 'world:event',
                    message: `🏃 ${npc.nombre} salió a explorar ${destino.nombre}`,
                    category: 'npc'
                });

                console.log(`🎯 ${npc.nombre} en misión a ${destino.nombre}`);
            }
        }
    }

    // PROCESAR MISIONES DE NPCs
    Object.values(WORLD.npcs).forEach(npc => {
        if (!npc.vivo || !npc.enMision) return;

        npc.misionTiempoRestante--;

        if (npc.misionTiempoRestante <= 0) {
            // Misión completada
            const destino = WORLD.locations[npc.misionDestino];
            const encontrado = {};

            // NPCs encuentran recursos
            Object.keys(destino.recursos).forEach(recurso => {
                if (destino.recursos[recurso] > 0) {
                    const cantidad = Math.min(destino.recursos[recurso], Math.floor(Math.random() * 3) + 1);
                    if (cantidad > 0) {
                        encontrado[recurso] = cantidad;
                        destino.recursos[recurso] -= cantidad;
                        WORLD.locations.refugio.recursos[recurso] = (WORLD.locations.refugio.recursos[recurso] || 0) + cantidad;
                    }
                }
            });

            // Riesgo de daño
            if (destino.zombies > 0 && Math.random() < 0.3) {
                const danio = Math.floor(Math.random() * 20) + 10;
                npc.salud = Math.max(0, npc.salud - danio);
                broadcast({
                    type: 'world:event',
                    message: `⚠️ ${npc.nombre} fue atacado pero regresó (salud: ${npc.salud})`,
                    category: 'combat'
                });
            }

            const itemsStr = Object.entries(encontrado).map(([k, v]) => `${v} ${k}`).join(', ');
            broadcast({
                type: 'world:event',
                message: `✅ ${npc.nombre} regresó con: ${itemsStr || 'nada'}`,
                category: 'npc'
            });

            npc.enMision = false;
            npc.misionDestino = null;
            npc.misionTiempoRestante = 0;

            // Actualizar todos los clientes con nuevos recursos
            broadcast({
                type: 'refugio:recursos',
                recursos: WORLD.locations.refugio.recursos
            });
        }
    });

    // Zombies migran según ruido
    Object.values(WORLD.locations).forEach(loc => {
        // Decae el ruido con el tiempo
        loc.nivelRuido = Math.max(0, loc.nivelRuido - 2);

        // Migración aleatoria
        if (Math.random() > 0.7) {
            const change = Math.floor(Math.random() * 3) - 1;
            loc.zombies = Math.max(0, loc.zombies + change);
        }

        // Atraídos por ruido alto
        if (loc.nivelRuido > 50 && loc.zombies > 0) {
            loc.zombies += Math.floor(Math.random() * 3) + 1;
        }
    });

    // Sistema de hordas (cada 5 minutos de juego puede haber una)
    if (WORLD.simulationTime % 30 === 0 && !WORLD.nextHorde) {
        if (Math.random() > 0.6) {
            WORLD.nextHorde = WORLD.simulationTime + 10; // Llega en 100 segundos
            WORLD.hordeWarning = true;
            broadcast({
                type: 'horde:warning',
                message: '🚨 HORDA DETECTADA - Se acerca al refugio en 100 segundos',
                tiempo: 100
            });
            console.log('🚨 HORDA ACTIVADA');
        }
    }

    // Ejecutar horda
    if (WORLD.nextHorde && WORLD.simulationTime >= WORLD.nextHorde) {
        executeHorde();
        WORLD.nextHorde = null;
        WORLD.hordeWarning = false;
    }

    // Generar quest emergente si recursos bajos
    if (WORLD.simulationTime % 20 === 0) {
        const refugio = WORLD.locations.refugio;
        if (refugio.recursos.comida < 10 && !WORLD.activeQuests.find(q => q.tipo === 'recursos')) {
            WORLD.activeQuests.push({
                id: `comida_${Date.now()}`,
                tipo: 'recursos',
                descripcion: '⚠️ Comida baja en el refugio. Busca más.',
                objetivo: 10,
                actual: 0
            });
            broadcast({ type: 'quest:new', quest: WORLD.activeQuests[WORLD.activeQuests.length - 1] });
        }
    }

    // Generar EVENTO ESPECIAL aleatorio (cada ~3 minutos)
    if (WORLD.simulationTime % 18 === 0 && Math.random() > 0.6 && WORLD.activeEvents.length === 0) {
        const evento = WORLD.possibleEvents[Math.floor(Math.random() * WORLD.possibleEvents.length)];
        WORLD.activeEvents.push({
            ...evento,
            timestamp: WORLD.simulationTime,
            expiresIn: 5 // Expira en 50 segundos
        });

        broadcast({
            type: 'event:special',
            event: WORLD.activeEvents[0]
        });

        console.log(`🎭 EVENTO: ${evento.nombre}`);
    }

    // Expirar eventos
    WORLD.activeEvents = WORLD.activeEvents.filter(e => {
        if (WORLD.simulationTime - e.timestamp >= e.expiresIn) {
            broadcast({ type: 'event:expired', eventId: e.id });
            return false;
        }
        return true;
    });

    // QUEST COOPERATIVA - Se activa cada 4 minutos si hay 2+ jugadores
    const jugadoresOnline = Object.keys(WORLD.players).length;
    if (!WORLD.questCooperativa.activa && jugadoresOnline >= 2 && WORLD.simulationTime % 24 === 0 && Math.random() > 0.5) {
        const quests = [
            {
                nombre: '🏥 Expedición al Hospital',
                descripcion: 'El Dr. Gómez necesita suministros médicos urgentes. ¿Enviamos un equipo o esperamos?',
                opciones: ['Ir ahora', 'Esperar refuerzos', 'No ir']
            },
            {
                nombre: '🚁 Señal de Radio',
                descripcion: 'Captamos una señal de supervivientes en la zona militar. ¿Respondemos?',
                opciones: ['Responder y encontrarnos', 'Ignorar señal', 'Investigar primero']
            },
            {
                nombre: '👥 Grupo de Refugiados',
                descripcion: 'Un grupo de 5 personas pide entrar al refugio. Tienen comida pero están heridos.',
                opciones: ['Dejarlos entrar', 'Solo a los sanos', 'Rechazarlos']
            },
            {
                nombre: '⚠️ Defensa del Refugio',
                descripcion: 'Se aproxima una horda masiva. ¿Defendemos o evacuamos?',
                opciones: ['Defender aquí', 'Evacuar todos', 'Solo los fuertes']
            }
        ];

        const questSeleccionada = quests[Math.floor(Math.random() * quests.length)];

        WORLD.questCooperativa = {
            activa: true,
            nombre: questSeleccionada.nombre,
            descripcion: questSeleccionada.descripcion,
            opciones: questSeleccionada.opciones,
            votos: {},
            tiempoLimite: Date.now() + 60000 // 1 minuto para votar
        };

        // Inicializar votos
        questSeleccionada.opciones.forEach(opt => {
            WORLD.questCooperativa.votos[opt] = [];
        });

        broadcast({
            type: 'quest:cooperativa',
            quest: WORLD.questCooperativa
        });

        console.log(`🤝 QUEST COOPERATIVA: ${questSeleccionada.nombre}`);
    }

    // Resolver quest cooperativa cuando expire el tiempo
    if (WORLD.questCooperativa.activa && Date.now() >= WORLD.questCooperativa.tiempoLimite) {
        // Contar votos
        const resultados = {};
        Object.keys(WORLD.questCooperativa.votos).forEach(opcion => {
            resultados[opcion] = WORLD.questCooperativa.votos[opcion].length;
        });

        // Obtener ganadora
        const ganadora = Object.keys(resultados).reduce((a, b) => resultados[a] > resultados[b] ? a : b);

        WORLD.questCooperativa.resultado = ganadora;

        broadcast({
            type: 'quest:resultado',
            quest: WORLD.questCooperativa.nombre,
            opcionGanadora: ganadora,
            votos: resultados
        });

        console.log(`✅ Quest resuelta: ${ganadora} (${resultados[ganadora]} votos)`);

        // Aplicar consecuencias según la quest y decisión
        aplicarConsecuenciasQuest(WORLD.questCooperativa.nombre, ganadora);

        // Desactivar quest
        WORLD.questCooperativa.activa = false;
    }

    console.log(`⏰ Tick ${WORLD.simulationTime} | Hora: ${Math.floor(hora / 60)}:${hora % 60}`);
}, 10000);

// Aplicar consecuencias de quest cooperativa
function aplicarConsecuenciasQuest(questNombre, decision) {
    const refugio = WORLD.locations.refugio;

    if (questNombre.includes('Hospital')) {
        if (decision === 'Ir ahora') {
            // Riesgo pero recompensa
            if (Math.random() > 0.4) {
                refugio.recursos.medicinas += 15;
                broadcast({ type: 'world:update', message: '✅ ¡Misión exitosa! +15 medicinas al refugio' });
            } else {
                // Alguien sale herido
                const jugadores = Object.values(WORLD.players);
                if (jugadores.length > 0) {
                    const herido = jugadores[Math.floor(Math.random() * jugadores.length)];
                    herido.salud = Math.max(10, herido.salud - 30);
                    broadcast({ type: 'world:update', message: `⚠️ ${herido.nombre} resultó herido en la misión` });
                }
            }
        } else if (decision === 'Esperar refuerzos') {
            // Más seguro, menos recompensa
            refugio.recursos.medicinas += 5;
            broadcast({ type: 'world:update', message: '✅ Esperaron y consiguieron algunas medicinas' });
        } else {
            // No hacer nada = NPCs pierden moral
            Object.values(WORLD.npcs).forEach(npc => {
                if (npc.vivo) npc.moral -= 10;
            });
            broadcast({ type: 'world:update', message: '😞 Los NPCs están desanimados por no actuar' });
        }
    } else if (questNombre.includes('Señal de Radio')) {
        if (decision === 'Responder y encontrarnos') {
            // 50% aliados, 50% trampa
            if (Math.random() > 0.5) {
                refugio.recursos.armas += 10;
                refugio.recursos.comida += 20;
                broadcast({ type: 'world:update', message: '🤝 ¡Aliados! +10 armas +20 comida' });
            } else {
                refugio.defensas = Math.max(0, refugio.defensas - 30);
                broadcast({ type: 'world:update', message: '💀 ¡Era una trampa! -30 defensas' });
            }
        } else if (decision === 'Investigar primero') {
            broadcast({ type: 'world:update', message: '🔍 Investigaron con cautela. Sin cambios.' });
        } else {
            broadcast({ type: 'world:update', message: '📻 Ignoraron la señal.' });
        }
    } else if (questNombre.includes('Refugiados')) {
        if (decision === 'Dejarlos entrar') {
            refugio.recursos.comida += 10;
            refugio.recursos.medicinas -= 5;
            Object.values(WORLD.npcs).forEach(npc => {
                if (npc.vivo) npc.moral += 15;
            });
            broadcast({ type: 'world:update', message: '❤️ Refugiados agradecidos. +10 comida, -5 medicinas, +moral' });
        } else if (decision === 'Solo a los sanos') {
            refugio.recursos.comida += 3;
            broadcast({ type: 'world:update', message: '😐 Dejaron entrar algunos. +3 comida' });
        } else {
            Object.values(WORLD.npcs).forEach(npc => {
                if (npc.vivo) npc.moral -= 20;
            });
            broadcast({ type: 'world:update', message: '😡 Los NPCs están molestos por rechazar refugiados. -moral' });
        }
    } else if (questNombre.includes('Defensa del Refugio')) {
        if (decision === 'Defender aquí') {
            refugio.defensas = Math.max(0, refugio.defensas - 50);
            Object.values(WORLD.npcs).forEach(npc => {
                if (npc.vivo) npc.moral += 20;
            });
            broadcast({ type: 'world:update', message: '🛡️ ¡Defendieron con éxito! -50 defensas, +moral' });
        } else if (decision === 'Evacuar todos') {
            // Pierden recursos pero todos sobreviven
            refugio.recursos.materiales = Math.floor(refugio.recursos.materiales / 2);
            broadcast({ type: 'world:update', message: '🏃 Evacuaron todos. Perdieron recursos pero están a salvo' });
        } else {
            // Solo los fuertes = algunos NPCs mueren
            const npcsDebiles = Object.values(WORLD.npcs).filter(n => n.vivo && n.salud < 50);
            if (npcsDebiles.length > 0) {
                const victima = npcsDebiles[0];
                victima.vivo = false;
                broadcast({ type: 'world:update', message: `💀 ${victima.nombre} no sobrevivió la evacuación selectiva` });
            }
        }
    }
}

function executeHorde() {
    const refugio = WORLD.locations.refugio;
    const hordeSize = Math.floor(Math.random() * 20) + 15;

    console.log(`🧟 HORDA DE ${hordeSize} ZOMBIES ATACANDO`);

    // Daño = zombies - defensas
    const danio = Math.max(0, hordeSize - refugio.defensas / 10);

    // NPCs pueden morir
    const npcsVivos = Object.values(WORLD.npcs).filter(n => n.vivo);
    if (danio > 10 && npcsVivos.length > 0 && Math.random() > 0.5) {
        const victima = npcsVivos[Math.floor(Math.random() * npcsVivos.length)];
        victima.vivo = false;
        victima.salud = 0;
        broadcast({
            type: 'horde:npc_killed',
            npcNombre: victima.nombre
        });
        console.log(`💀 ${victima.nombre} murió en la horda`);
    }

    // Daño a jugadores en refugio
    Object.values(WORLD.players).forEach(p => {
        if (p.locacion === 'refugio') {
            const playerDmg = Math.floor(Math.random() * danio * 5);
            p.salud = Math.max(0, p.salud - playerDmg);
        }
    });

    broadcast({
        type: 'horde:attacked',
        zombies: hordeSize,
        danio,
        message: `🧟 Horda de ${hordeSize} zombies atacó. Daño: ${danio}`
    });
}

// Sistema de XP y Nivel
function giveXP(player, amount, ws) {
    player.xp += amount;

    ws.send(JSON.stringify({
        type: 'xp:gained',
        amount,
        xp: player.xp,
        xpMax: player.xpParaSiguienteNivel
    }));

    // Subir de nivel
    while (player.xp >= player.xpParaSiguienteNivel) {
        player.xp -= player.xpParaSiguienteNivel;
        player.nivel++;
        player.xpParaSiguienteNivel = Math.floor(player.xpParaSiguienteNivel * 1.5);

        // Bonificaciones por nivel
        player.salud = 100; // Heal completo
        player.hambre = 100;

        ws.send(JSON.stringify({
            type: 'level:up',
            nivel: player.nivel,
            xpMax: player.xpParaSiguienteNivel
        }));

        broadcast({
            type: 'world:event',
            message: `⭐ ${player.nombre} subió a nivel ${player.nivel}!`,
            category: 'success'
        });
    }
}

// ====================================
// API REST - AUTH Y PERSONAJES
// ====================================

// Registro
app.post('/api/auth/register', (req, res) => {
    const { username, password } = req.body;
    const result = survivalDB.crearUsuario(username, password);
    res.json(result);
});

// Login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = survivalDB.loginUsuario(username, password);

    if (user) {
        const personajes = survivalDB.obtenerPersonajes(user.id);
        res.json({ success: true, user, personajes });
    } else {
        res.json({ success: false, error: 'Credenciales inválidas' });
    }
});

// Crear personaje
app.post('/api/personaje/crear', (req, res) => {
    const { usuarioId, nombre, clase, atributos, avatar, color } = req.body;

    const result = survivalDB.crearPersonaje(usuarioId, {
        nombre,
        clase,
        ...atributos,
        avatar,
        color
    });

    if (result.success) {
        const personaje = survivalDB.obtenerPersonaje(result.id);
        res.json({ success: true, personaje });
    } else {
        res.json(result);
    }
});

// Obtener personajes de un usuario
app.get('/api/personajes/:usuarioId', (req, res) => {
    const personajes = survivalDB.obtenerPersonajes(req.params.usuarioId);
    res.json({ personajes });
});

// Cargar personaje en el mundo
app.post('/api/personaje/load', (req, res) => {
    const { personajeId } = req.body;
    const personaje = survivalDB.obtenerPersonaje(personajeId);

    if (!personaje) {
        return res.json({ success: false, error: 'Personaje no encontrado' });
    }

    const playerId = `player_${personajeId}_${Date.now()}`;

    WORLD.players[playerId] = {
        id: playerId,
        dbId: personajeId,
        nombre: personaje.nombre,
        clase: personaje.clase,
        nivel: personaje.nivel,
        xp: personaje.xp,
        xpParaSiguienteNivel: personaje.xp_siguiente_nivel,
        salud: personaje.salud,
        hambre: personaje.hambre,
        locacion: personaje.locacion,
        inventario: personaje.inventario,
        skills: personaje.skills,
        avatar: personaje.avatar,
        color: personaje.color,
        atributos: {
            fuerza: personaje.fuerza,
            resistencia: personaje.resistencia,
            agilidad: personaje.agilidad,
            inteligencia: personaje.inteligencia
        },
        cooldowns: {
            scavenge: 0,
            craft: 0,
            shoot: 0
        }
    };

    res.json({ success: true, player: WORLD.players[playerId] });
});

app.get('/api/world', (req, res) => {
    res.json({
        locations: WORLD.locations,
        npcs: WORLD.npcs,
        time: WORLD.simulationTime
    });
});

// ====================================
// WEBSOCKET
// ====================================

const WebSocket = require('ws');
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

const connections = new Map(); // playerId -> ws

function broadcast(message, excludePlayerId = null) {
    connections.forEach((ws, pid) => {
        if (pid !== excludePlayerId && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    });
}

wss.on('connection', (ws) => {
    let playerId = null;

    ws.on('message', (data) => {
        const msg = JSON.parse(data);

        // LOGIN
        if (msg.type === 'login') {
            playerId = msg.playerId;
            connections.set(playerId, ws);

            ws.send(JSON.stringify({
                type: 'world:state',
                world: WORLD
            }));

            // Verificar que el jugador existe en WORLD.players
            if (WORLD.players[playerId]) {
                broadcast({
                    type: 'player:joined',
                    playerId,
                    nombre: WORLD.players[playerId].nombre
                }, playerId);

                broadcast({
                    type: 'world:event',
                    message: `👤 ${WORLD.players[playerId].nombre} se unió al servidor`,
                    category: 'player'
                });
            }

            return;
        }

        if (!playerId) return;

        const player = WORLD.players[playerId];
        
        // Verificar que el jugador existe
        if (!player) {
            ws.send(JSON.stringify({ 
                type: 'error', 
                error: 'Jugador no encontrado. Recarga la página.' 
            }));
            return;
        }

        // MOVERSE
        if (msg.type === 'move') {
            const target = WORLD.locations[msg.targetId];

            if (!target) {
                ws.send(JSON.stringify({ type: 'error', error: 'Locación inválida' }));
                return;
            }

            const current = WORLD.locations[player.locacion];
            if (!current.conectado_a.includes(msg.targetId)) {
                ws.send(JSON.stringify({ type: 'error', error: 'No puedes ir ahí directamente' }));
                return;
            }

            player.locacion = msg.targetId;

            ws.send(JSON.stringify({
                type: 'moved',
                location: target
            }));

            broadcast({ type: 'player:moved', playerId, locacion: msg.targetId, nombre: player.nombre }, playerId);
            broadcast({
                type: 'world:event',
                message: `🚶 ${player.nombre} fue a ${target.nombre}`,
                category: 'player'
            });

            return;
        }

        // SCAVENGEAR (buscar recursos)
        if (msg.type === 'scavenge') {
            // Cooldown check
            if (player.cooldowns.scavenge && Date.now() < player.cooldowns.scavenge) {
                const segundos = Math.ceil((player.cooldowns.scavenge - Date.now()) / 1000);
                ws.send(JSON.stringify({ type: 'error', error: `Espera ${segundos}s antes de buscar de nuevo` }));
                return;
            }

            const loc = WORLD.locations[player.locacion];

            if (loc.tipo !== 'loot') {
                ws.send(JSON.stringify({ type: 'error', error: 'No hay nada que buscar aquí' }));
                return;
            }

            // Hay zombies? Riesgo de daño
            if (loc.zombies > 0) {
                // Skill de sigilo reduce riesgo
                const riesgo = Math.max(0.1, 0.4 - (player.skills.sigilo * 0.05));
                if (Math.random() < riesgo) {
                    const danio = Math.floor(Math.random() * 15) + 10;
                    player.salud -= danio;
                    ws.send(JSON.stringify({
                        type: 'combat',
                        message: '🧟 ¡Un zombie te atacó!',
                        damage: danio,
                        salud: player.salud
                    }));

                    // Aumenta ruido
                    loc.nivelRuido += 20;
                }
            }

            // Encontrar recursos (skill de supervivencia mejora loot)
            const found = {};
            Object.keys(loc.recursos).forEach(recurso => {
                if (loc.recursos[recurso] <= 0) return; // Skip si no hay recursos

                const bonus = Math.floor(player.skills.supervivencia / 2);
                const cantidad = Math.min(
                    loc.recursos[recurso],
                    Math.floor(Math.random() * (3 + bonus)) + 1
                );
                if (cantidad > 0) {
                    found[recurso] = cantidad;
                    player.inventario[recurso] = (player.inventario[recurso] || 0) + cantidad;
                    loc.recursos[recurso] -= cantidad;
                }
            });

            ws.send(JSON.stringify({
                type: 'scavenge:result',
                found,
                inventario: player.inventario
            }));

            // Subir skill
            player.skills.supervivencia = Math.min(10, player.skills.supervivencia + 0.1);

            // Ganar XP
            const xpGanado = 10 + Object.values(found).reduce((a, b) => a + b, 0) * 2;
            giveXP(player, xpGanado, ws);

            // Cooldown de 3 segundos
            player.cooldowns.scavenge = Date.now() + 3000;
            return;
        }

        // CRAFTEAR
        if (msg.type === 'craft') {
            // Cooldown check
            if (player.cooldowns.craft && Date.now() < player.cooldowns.craft) {
                const segundos = Math.ceil((player.cooldowns.craft - Date.now()) / 1000);
                ws.send(JSON.stringify({ type: 'error', error: `Espera ${segundos}s antes de craftear de nuevo` }));
                return;
            }

            const recipe = WORLD.craftingRecipes[msg.item];

            if (!recipe) {
                ws.send(JSON.stringify({ type: 'error', error: 'Receta inválida' }));
                return;
            }

            // Verificar materiales
            let canCraft = true;
            Object.keys(recipe).forEach(mat => {
                if (mat === 'resultado') return;
                if (!player.inventario[mat] || player.inventario[mat] < recipe[mat]) {
                    canCraft = false;
                }
            });

            if (!canCraft) {
                ws.send(JSON.stringify({ type: 'error', error: 'No tienes suficientes materiales' }));
                return;
            }

            // Consumir materiales
            Object.keys(recipe).forEach(mat => {
                if (mat === 'resultado') return;
                player.inventario[mat] -= recipe[mat];
            });

            // Crear item
            const resultado = recipe.resultado;
            if (resultado.tipo === 'defensa') {
                WORLD.locations.refugio.defensas += resultado.cantidad;
                ws.send(JSON.stringify({
                    type: 'craft:success',
                    item: msg.item,
                    defensas: WORLD.locations.refugio.defensas,
                    inventario: player.inventario
                }));
            } else {
                player.inventario[resultado.tipo] = (player.inventario[resultado.tipo] || 0) + resultado.cantidad;
                ws.send(JSON.stringify({
                    type: 'craft:success',
                    item: msg.item,
                    inventario: player.inventario
                }));
            }

            // Subir skill mecánica
            player.skills.mecanica = Math.min(10, player.skills.mecanica + 0.2);

            // Ganar XP
            giveXP(player, 15, ws);

            // Cooldown de 2 segundos
            player.cooldowns.craft = Date.now() + 2000;

            return;
        }

        // DISPARAR (mata zombies pero atrae más)
        // COMBATE MEJORADO
        if (msg.type === 'attack') {
            const tipoAtaque = msg.attackType || 'shoot'; // shoot, melee, stealth
            
            // Cooldown check
            if (player.cooldowns.shoot && Date.now() < player.cooldowns.shoot) {
                const segundos = Math.ceil((player.cooldowns.shoot - Date.now()) / 1000);
                ws.send(JSON.stringify({ type: 'error', error: `Espera ${segundos}s antes de atacar de nuevo` }));
                return;
            }

            const loc = WORLD.locations[player.locacion];

            if (loc.zombies === 0) {
                ws.send(JSON.stringify({ type: 'error', error: 'No hay zombies aquí' }));
                return;
            }

            let resultado = { killed: 0, critico: false, loot: {}, ruido: 0, danio: 0 };

            // DISPARO (usa arma, alto daño, mucho ruido)
            if (tipoAtaque === 'shoot') {
                if (!player.inventario.armas || player.inventario.armas < 1) {
                    ws.send(JSON.stringify({ type: 'error', error: 'No tienes armas' }));
                    return;
                }
                player.inventario.armas -= 1;
                
                // Daño base + skill
                resultado.danio = 30 + Math.floor(player.skills.combate * 3);
                resultado.ruido = 60;
                
                // Chance de crítico (20% + agilidad)
                if (Math.random() < 0.2 + (player.atributos.agilidad / 100)) {
                    resultado.critico = true;
                    resultado.danio *= 2;
                }
            }
            // MELEE (sin arma, daño medio, poco ruido)
            else if (tipoAtaque === 'melee') {
                // Daño = fuerza + skill
                resultado.danio = 15 + player.atributos.fuerza + Math.floor(player.skills.combate * 2);
                resultado.ruido = 20;
                
                // Chance de crítico
                if (Math.random() < 0.15 + (player.atributos.fuerza / 100)) {
                    resultado.critico = true;
                    resultado.danio *= 1.5;
                }
            }
            // SIGILO (requiere skill, 1 kill silencioso o falla)
            else if (tipoAtaque === 'stealth') {
                const chanceExito = 0.3 + (player.skills.supervivencia / 20) + (player.atributos.agilidad / 50);
                
                if (Math.random() < chanceExito) {
                    resultado.killed = 1;
                    resultado.danio = 999; // Instakill
                    resultado.ruido = 0;
                } else {
                    // Falla = te detectan, recibes daño
                    player.salud = Math.max(0, player.salud - 15);
                    ws.send(JSON.stringify({
                        type: 'combat:result',
                        killed: 0,
                        critico: false,
                        falloSigilo: true,
                        remaining: loc.zombies,
                        loot: {},
                        inventario: player.inventario
                    }));
                    return;
                }
            }

            // Calcular kills basado en daño
            if (resultado.killed === 0) {
                resultado.killed = Math.min(loc.zombies, Math.floor(resultado.danio / 25));
            }
            loc.zombies -= resultado.killed;
            loc.nivelRuido += resultado.ruido;

            // LOOT de zombies muertos
            if (resultado.killed > 0) {
                for (let i = 0; i < resultado.killed; i++) {
                    // 30% chance de loot
                    if (Math.random() < 0.3) {
                        const lootTable = [
                            { tipo: 'comida', chance: 0.4, cantidad: 1 },
                            { tipo: 'medicinas', chance: 0.2, cantidad: 1 },
                            { tipo: 'armas', chance: 0.15, cantidad: 1 },
                            { tipo: 'materiales', chance: 0.25, cantidad: 2 }
                        ];
                        
                        const roll = Math.random();
                        let acum = 0;
                        for (const item of lootTable) {
                            acum += item.chance;
                            if (roll < acum) {
                                resultado.loot[item.tipo] = (resultado.loot[item.tipo] || 0) + item.cantidad;
                                player.inventario[item.tipo] = (player.inventario[item.tipo] || 0) + item.cantidad;
                                break;
                            }
                        }
                    }
                }
            }

            ws.send(JSON.stringify({
                type: 'combat:result',
                killed: resultado.killed,
                critico: resultado.critico,
                remaining: loc.zombies,
                loot: resultado.loot,
                tipoAtaque,
                inventario: player.inventario
            }));

            // Subir skill combate
            player.skills.combate = Math.min(10, player.skills.combate + (resultado.killed * 0.2));

            // Ganar XP
            const xpBase = tipoAtaque === 'stealth' ? 15 : 8;
            giveXP(player, resultado.killed * xpBase, ws);

            // Cooldown (sigilo es más rápido)
            player.cooldowns.shoot = Date.now() + (tipoAtaque === 'stealth' ? 2000 : 4000);

            broadcast({
                type: 'world:event',
                message: `⚔️ ${player.nombre} eliminó ${resultado.killed} zombies en ${loc.nombre}${resultado.critico ? ' ¡CRÍTICO!' : ''}`,
                category: 'combat'
            });

            return;
        }

        // DAR ITEM A NPC
        if (msg.type === 'give') {
            const npc = WORLD.npcs[msg.npcId];
            const item = msg.item;
            const cantidad = msg.cantidad || 1;

            if (!npc || !npc.vivo) {
                ws.send(JSON.stringify({ type: 'error', error: 'NPC no disponible' }));
                return;
            }

            if (!player.inventario[item] || player.inventario[item] < cantidad) {
                ws.send(JSON.stringify({ type: 'error', error: 'No tienes suficiente' }));
                return;
            }

            player.inventario[item] -= cantidad;

            // Efectos según item
            if (item === 'comida') {
                npc.hambre = Math.min(100, npc.hambre + 30 * cantidad);
                npc.moral += 10;
            } else if (item === 'medicinas') {
                npc.salud = Math.min(100, npc.salud + 40 * cantidad);
                npc.moral += 15;
            }

            ws.send(JSON.stringify({
                type: 'give:success',
                npc: npc.nombre,
                item,
                cantidad,
                npcState: npc,
                inventario: player.inventario
            }));

            broadcast({
                type: 'npc:updated',
                npcId: npc.id,
                npc
            }, playerId);

            return;
        }

        // COMERCIAR con Jorge
        if (msg.type === 'trade') {
            const npc = WORLD.npcs.comerciante;

            if (!npc || !npc.vivo) {
                ws.send(JSON.stringify({ type: 'error', error: 'Jorge no está disponible' }));
                return;
            }

            const { ofreces, pides } = msg; // {ofreces: {item, cant}, pides: {item, cant}}

            // Validar que jugador tiene lo que ofrece
            if (!player.inventario[ofreces.item] || player.inventario[ofreces.item] < ofreces.cant) {
                ws.send(JSON.stringify({ type: 'error', error: 'No tienes suficiente para comerciar' }));
                return;
            }

            // Validar que Jorge tiene lo que pides
            if (!npc.inventario[pides.item] || npc.inventario[pides.item] < pides.cant) {
                ws.send(JSON.stringify({ type: 'error', error: 'Jorge no tiene eso' }));
                return;
            }

            // Realizar intercambio
            player.inventario[ofreces.item] -= ofreces.cant;
            player.inventario[pides.item] = (player.inventario[pides.item] || 0) + pides.cant;
            npc.inventario[ofreces.item] = (npc.inventario[ofreces.item] || 0) + ofreces.cant;
            npc.inventario[pides.item] -= pides.cant;

            ws.send(JSON.stringify({
                type: 'trade:success',
                message: `Intercambiaste ${ofreces.cant} ${ofreces.item} por ${pides.cant} ${pides.item}`,
                inventario: player.inventario,
                comercianteInventario: npc.inventario
            }));

            return;
        }

        // RESPONDER A EVENTO ESPECIAL
        if (msg.type === 'event:respond') {
            const evento = WORLD.activeEvents.find(e => e.id === msg.eventId);

            if (!evento) {
                ws.send(JSON.stringify({ type: 'error', error: 'Evento no disponible' }));
                return;
            }

            const opcion = evento.opciones[msg.opcionIndex];

            // Verificar costo
            let canAfford = true;
            Object.keys(opcion.costo).forEach(recurso => {
                if (recurso === 'moral' || recurso === 'defensas') {
                    // Estos se verifican en el refugio
                    return;
                }
                const total = player.inventario[recurso] || 0;
                if (total < opcion.costo[recurso]) {
                    canAfford = false;
                }
            });

            if (!canAfford) {
                ws.send(JSON.stringify({ type: 'error', error: 'No tienes suficientes recursos' }));
                return;
            }

            // Aplicar costo
            Object.keys(opcion.costo).forEach(recurso => {
                if (recurso === 'moral' || recurso === 'defensas') return;
                player.inventario[recurso] -= opcion.costo[recurso];
            });

            // Aplicar recompensas o consecuencias
            let resultado = `Elegiste: ${opcion.texto}. `;

            // Riesgo (puede salir mal)
            if (Math.random() < opcion.riesgo) {
                resultado += '¡Algo salió MAL! ';
                player.salud -= 20;
                broadcast({
                    type: 'event:bad_outcome',
                    message: `${player.nombre} tomó una decisión arriesgada y salió mal...`
                });
            } else {
                // Aplicar recompensas
                Object.keys(opcion.recompensa).forEach(recurso => {
                    if (recurso === 'moral') {
                        Object.values(WORLD.npcs).forEach(n => {
                            if (n.vivo) n.moral = Math.max(0, Math.min(100, n.moral + opcion.recompensa[recurso]));
                        });
                    } else if (recurso === 'defensas') {
                        WORLD.locations.refugio.defensas += opcion.recompensa[recurso];
                    } else {
                        player.inventario[recurso] = (player.inventario[recurso] || 0) + opcion.recompensa[recurso];
                    }
                });
                resultado += 'Todo salió bien.';
                
                // XP POR COMPLETAR EVENTO
                const xpGanado = 25;
                player.xp += xpGanado;
                
                ws.send(JSON.stringify({
                    type: 'xp:gained',
                    amount: xpGanado,
                    xp: player.xp,
                    xpMax: player.xpParaSiguienteNivel
                }));
                
                // Verificar nivel
                if (player.xp >= player.xpParaSiguienteNivel) {
                    player.nivel++;
                    player.xp = 0;
                    player.xpParaSiguienteNivel = Math.floor(player.xpParaSiguienteNivel * 1.5);
                    ws.send(JSON.stringify({
                        type: 'level:up',
                        nivel: player.nivel,
                        xpMax: player.xpParaSiguienteNivel
                    }));
                }
                
                // Si el evento es de REFUGIADOS, agregar NPC dinámico
                if (evento.id === 'refugiados' && msg.opcionIndex === 0) {
                    const nombres = ['Ana', 'Pedro', 'Luis', 'Carmen', 'Miguel', 'Sofia', 'Carlos', 'Elena'];
                    const apellidos = ['García', 'López', 'Martínez', 'Rodríguez', 'González', 'Fernández'];
                    const nombreCompleto = `${nombres[Math.floor(Math.random() * nombres.length)]} ${apellidos[Math.floor(Math.random() * apellidos.length)]}`;
                    
                    const npcId = `refugiado_${Date.now()}`;
                    WORLD.npcs[npcId] = {
                        id: npcId,
                        nombre: nombreCompleto,
                        rol: 'refugiado',
                        locacion: 'refugio',
                        salud: 80,
                        hambre: 60,
                        moral: 70,
                        vivo: true,
                        estado: 'activo',
                        enMision: false,
                        dialogo: `Gracias por aceptarnos, ${player.nombre}. No te defraudaremos.`,
                        dialogos: [
                            'Venimos de muy lejos...',
                            'No teníamos a dónde ir.',
                            'Ayudaremos en lo que podamos.',
                            'Mi familia está a salvo gracias a ti.',
                            '¿Creen que sobreviviremos a esto?',
                            'Extraño cómo era el mundo antes.',
                            'Cada día es una nueva oportunidad.',
                            'Gracias por darnos una segunda oportunidad.'
                        ]
                    };
                    
                    broadcast({
                        type: 'world:event',
                        message: `👥 ${nombreCompleto} se unió al refugio`,
                        category: 'npc'
                    });
                }
            }

            // Remover evento
            WORLD.activeEvents = WORLD.activeEvents.filter(e => e.id !== msg.eventId);

            ws.send(JSON.stringify({
                type: 'event:resolved',
                resultado,
                inventario: player.inventario
            }));

            broadcast({
                type: 'event:resolved_broadcast',
                playerId,
                eventId: msg.eventId
            }, playerId);

            return;
        }

        // HABLAR CON NPC
        if (msg.type === 'talk') {
            const npc = WORLD.npcs[msg.npcId];

            if (!npc || !npc.vivo) {
                ws.send(JSON.stringify({ type: 'error', error: 'NPC no disponible' }));
                return;
            }

            ws.send(JSON.stringify({
                type: 'dialogue',
                npc: npc.nombre,
                text: npc.dialogo,
                npcState: { salud: npc.salud, hambre: npc.hambre, moral: npc.moral }
            }));

            return;
        }

        // VOTAR EN QUEST COOPERATIVA
        if (msg.type === 'quest:vote') {
            if (!WORLD.questCooperativa.activa) {
                ws.send(JSON.stringify({ type: 'error', error: 'No hay quest activa' }));
                return;
            }

            const opcion = msg.opcion;
            if (!WORLD.questCooperativa.opciones.includes(opcion)) {
                ws.send(JSON.stringify({ type: 'error', error: 'Opción inválida' }));
                return;
            }

            // Remover voto anterior si existe
            Object.keys(WORLD.questCooperativa.votos).forEach(opt => {
                WORLD.questCooperativa.votos[opt] = WORLD.questCooperativa.votos[opt].filter(id => id !== playerId);
            });

            // Agregar nuevo voto
            if (!WORLD.questCooperativa.votos[opcion]) {
                WORLD.questCooperativa.votos[opcion] = [];
            }
            WORLD.questCooperativa.votos[opcion].push(playerId);

            ws.send(JSON.stringify({
                type: 'quest:voted',
                opcion,
                message: `Votaste por: ${opcion}`
            }));

            broadcast({
                type: 'quest:votes_update',
                votos: WORLD.questCooperativa.votos
            });

            return;
        }

        // CHAT
        if (msg.type === 'chat') {
            const chatMessage = {
                type: 'chat:message',
                playerId,
                nombre: player.nombre,
                avatar: player.avatar,
                color: player.color,
                mensaje: msg.mensaje,
                timestamp: Date.now()
            };

            broadcast(chatMessage);
            
            return;
        }
    });

    ws.on('close', () => {
        if (playerId) {
            const player = WORLD.players[playerId];

            // Guardar progreso en DB si tiene dbId
            if (player && player.dbId) {
                survivalDB.guardarProgreso(player.dbId, {
                    nivel: player.nivel,
                    xp: player.xp,
                    xp_siguiente_nivel: player.xpParaSiguienteNivel,
                    salud: player.salud,
                    hambre: player.hambre,
                    locacion: player.locacion,
                    inventario: player.inventario,
                    skills: player.skills
                });
                console.log(`💾 Progreso guardado para ${player.nombre}`);
            }

            connections.delete(playerId);
            delete WORLD.players[playerId];
            broadcast({ type: 'player:left', playerId });
            console.log(`👋 ${playerId} desconectado`);
        }
    });
});

// ====================================
// INICIAR
// ====================================

server.listen(PORT, () => {
    console.log(`
🧟 SURVIVAL ZOMBIE MVP
═══════════════════════════════════
🌐 http://localhost:${PORT}
🔌 WebSocket activo
⏰ Simulación cada 10 segundos
═══════════════════════════════════
`);
    console.log('📍 Locaciones:', Object.keys(WORLD.locations).length);
    console.log('👥 NPCs:', Object.keys(WORLD.npcs).length);
    console.log('\n✨ Servidor listo. ¡Sobrevive!\n');
});
