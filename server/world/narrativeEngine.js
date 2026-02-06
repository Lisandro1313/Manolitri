// Importar db desde survivalDB (que ya está inicializado)
import survivalDB from '../db/survivalDB.js';
const db = survivalDB.db;

import npcRelationships from './npcRelations.js';

/**
 * 🎬 MOTOR DE NARRATIVA EMERGENTE
 * 
 * Genera historias dinámicas entre NPCs sin intervención del jugador.
 * Sistema inspirado en AI Dungeon, Dwarf Fortress y The Sims.
 * 
 * TIPOS DE EVENTOS:
 * - Romances: Flirteos, citas, relaciones, infidelidades, rupturas
 * - Conflictos: Peleas, venganzas, traiciones, sabotajes
 * - Dramas: Chismes, secretos revelados, triángulos amorosos
 * - Actividades: Trabajo conjunto, conversaciones, ayuda mutua
 * - Emergentes: Eventos que surgen de combinación de relaciones
 */

class NarrativeEngine {
    constructor() {
        this.worldEvents = []; // Buffer de eventos del mundo
        this.maxEvents = 200; // Mantener últimos 200 eventos
    }

    // ===== GENERAR EVENTO NARRATIVO =====
    generateWorldEvent() {
        // Obtener NPCs activos
        const npcs = db.prepare(`
            SELECT * FROM npcs WHERE estado = 'activo'
        `).all();

        if (npcs.length < 2) return null;

        // Elegir tipo de evento basado en probabilidades
        const eventType = this.chooseEventType();

        switch (eventType) {
            case 'romance':
                return this.generateRomanceEvent(npcs);

            case 'conflict':
                return this.generateConflictEvent(npcs);

            case 'drama':
                return this.generateDramaEvent(npcs);

            case 'activity':
                return this.generateActivityEvent(npcs);

            case 'group':
                return this.generateGroupEvent(npcs);

            case 'revelation':
                return this.generateRevelationEvent(npcs);

            default:
                return this.generateRandomEvent(npcs);
        }
    }

    // ===== ELEGIR TIPO DE EVENTO =====
    chooseEventType() {
        const rand = Math.random();

        // Pesos ajustados para máximo drama
        if (rand < 0.25) return 'romance';      // 25% - Alto drama romántico
        if (rand < 0.45) return 'conflict';     // 20% - Peleas y conflictos
        if (rand < 0.60) return 'drama';        // 15% - Chismes y secretos
        if (rand < 0.75) return 'activity';     // 15% - Actividades mundanas
        if (rand < 0.85) return 'group';        // 10% - Eventos grupales
        if (rand < 0.95) return 'revelation';   // 10% - Revelaciones impactantes
        return 'random';                        // 5% - Aleatorio
    }

    // ===== EVENTOS DE ROMANCE =====
    generateRomanceEvent(npcs) {
        // Buscar relaciones con alta atracción o potencial romántico
        const romanticRels = npcRelationships.getRelationshipsByState('amantes')
            .concat(npcRelationships.getRelationshipsByState('tension_sexual'));

        // Si hay romances activos, 70% chance de evento sobre ellos
        if (romanticRels.length > 0 && Math.random() < 0.7) {
            const rel = romanticRels[Math.floor(Math.random() * romanticRels.length)];
            return npcRelationships.generateRelationshipEvent(rel.npc_a_id, rel.npc_b_id);
        }

        // Sino, intentar crear nueva atracción
        const npc1 = npcs[Math.floor(Math.random() * npcs.length)];
        const npc2 = npcs[Math.floor(Math.random() * npcs.length)];

        if (npc1.id === npc2.id) return null;

        // Verificar si ya tienen relación
        const rel = npcRelationships.getRelationship(npc1.id, npc2.id);

        // Si no hay atracción, chance de iniciar coqueteo
        if (rel.atraccion < 30 && Math.random() < 0.3) {
            npcRelationships.updateRelationship(npc1.id, npc2.id, {
                atraccion: 5,
                amistad: 2,
                evento: {
                    tipo: 'primer_contacto',
                    descripcion: 'Primer acercamiento romántico'
                }
            });

            return {
                tipo: 'coqueteo',
                descripcion: `😊 ${npc1.nombre} se acercó tímidamente a ${npc2.nombre} y empezaron a conversar. Hay chispas...`,
                npcs: [npc1.id, npc2.id],
                efectos: { atraccion: 5, amistad: 2 }
            };
        }

        return null;
    }

    // ===== EVENTOS DE CONFLICTO =====
    generateConflictEvent(npcs) {
        // Buscar relaciones con alta rivalidad
        const conflicts = npcRelationships.getRelationshipsByState('enemigos')
            .concat(npcRelationships.getRelationshipsByState('rivales'));

        // Si hay conflictos activos, 80% chance de escalar
        if (conflicts.length > 0 && Math.random() < 0.8) {
            const rel = conflicts[Math.floor(Math.random() * conflicts.length)];
            return npcRelationships.generateRelationshipEvent(rel.npc_a_id, rel.npc_b_id);
        }

        // Crear nuevo conflicto aleatorio
        const npc1 = npcs[Math.floor(Math.random() * npcs.length)];
        const npc2 = npcs[Math.floor(Math.random() * npcs.length)];

        if (npc1.id === npc2.id) return null;

        const conflictTypes = [
            {
                tipo: 'discusion',
                descripcion: `💢 ${npc1.nombre} y ${npc2.nombre} discutieron acaloradamente por un malentendido.`,
                efectos: { rivalidad: 5, amistad: -3 }
            },
            {
                tipo: 'insulto',
                descripcion: `🗣️ ${npc1.nombre} insultó a ${npc2.nombre} frente a otros. La tensión aumenta.`,
                efectos: { rivalidad: 8, respeto: -5 }
            },
            {
                tipo: 'empujon',
                descripcion: `👊 ${npc1.nombre} empujó bruscamente a ${npc2.nombre}. Casi llegan a los golpes.`,
                efectos: { rivalidad: 10, amistad: -8 }
            },
            {
                tipo: 'robo',
                descripcion: `🤐 ${npc1.nombre} acusó a ${npc2.nombre} de robarle algo. La desconfianza crece.`,
                efectos: { rivalidad: 7, respeto: -6, amistad: -5 }
            }
        ];

        const event = conflictTypes[Math.floor(Math.random() * conflictTypes.length)];

        // Actualizar relación
        npcRelationships.updateRelationship(npc1.id, npc2.id, {
            ...event.efectos,
            evento: {
                tipo: event.tipo,
                descripcion: event.descripcion
            }
        });

        return {
            ...event,
            npcs: [npc1.id, npc2.id]
        };
    }

    // ===== EVENTOS DE DRAMA =====
    generateDramaEvent(npcs) {
        // Chismes, secretos, triangulaciones
        const npc1 = npcs[Math.floor(Math.random() * npcs.length)];
        const npc2 = npcs[Math.floor(Math.random() * npcs.length)];
        const npc3 = npcs[Math.floor(Math.random() * npcs.length)];

        if (npc1.id === npc2.id || npc2.id === npc3.id || npc1.id === npc3.id) return null;

        const dramaTypes = [
            {
                tipo: 'chisme',
                descripcion: `🗣️💬 ${npc1.nombre} le contó a ${npc2.nombre} un secreto sobre ${npc3.nombre}. Los rumores vuelan...`,
                efectos: { npc1: { amistad: 2 }, npc3: { rivalidad: 3 } }
            },
            {
                tipo: 'triangulo',
                descripcion: `😈💔 ${npc1.nombre} está interesado/a en ${npc2.nombre}, pero ${npc2.nombre} solo tiene ojos para ${npc3.nombre}. Drama asegurado.`,
                efectos: { npc1: { celos: 8, atraccion: 5 }, npc3: { rivalidad: 5 } }
            },
            {
                tipo: 'secreto_revelado',
                descripcion: `😱 ${npc1.nombre} descubrió algo comprometedor sobre ${npc2.nombre} y se lo contó a ${npc3.nombre}.`,
                efectos: { npc2: { respeto: -10 }, npc1: { amistad: 3 } }
            },
            {
                tipo: 'mentira',
                descripcion: `🤥 ${npc1.nombre} le mintió a ${npc2.nombre} sobre ${npc3.nombre}. Cuando se descubra será catastrófico.`,
                efectos: { npc2: { respeto: -5 }, npc1: { rivalidad: 4 } }
            },
            {
                tipo: 'celos_publicos',
                descripcion: `😠💢 ${npc1.nombre} hizo una escena de celos al ver a ${npc2.nombre} con ${npc3.nombre}. Todos se enteraron.`,
                efectos: { npc1: { celos: 10, respeto: -5 }, npc2: { atraccion: -5 } }
            }
        ];

        const event = dramaTypes[Math.floor(Math.random() * dramaTypes.length)];

        // Actualizar relaciones involucradas
        if (event.efectos.npc1) {
            npcRelationships.updateRelationship(npc1.id, npc2.id, event.efectos.npc1);
        }
        if (event.efectos.npc3) {
            npcRelationships.updateRelationship(npc1.id, npc3.id, event.efectos.npc3);
        }
        if (event.efectos.npc2) {
            npcRelationships.updateRelationship(npc2.id, npc3.id, event.efectos.npc2);
        }

        return {
            ...event,
            npcs: [npc1.id, npc2.id, npc3.id]
        };
    }

    // ===== EVENTOS DE ACTIVIDAD =====
    generateActivityEvent(npcs) {
        const npc1 = npcs[Math.floor(Math.random() * npcs.length)];
        const npc2 = npcs[Math.floor(Math.random() * npcs.length)];

        if (npc1.id === npc2.id) return null;

        const activities = [
            {
                tipo: 'colaboracion',
                descripcion: `🤝 ${npc1.nombre} y ${npc2.nombre} trabajaron juntos reparando algo. Buen trabajo en equipo.`,
                efectos: { amistad: 4, respeto: 3 }
            },
            {
                tipo: 'charla',
                descripcion: `💬 ${npc1.nombre} y ${npc2.nombre} tuvieron una larga conversación sobre sus vidas antes del apocalipsis.`,
                efectos: { amistad: 5, respeto: 2 }
            },
            {
                tipo: 'ayuda',
                descripcion: `💪 ${npc1.nombre} ayudó a ${npc2.nombre} con una tarea difícil sin pedir nada a cambio.`,
                efectos: { amistad: 6, respeto: 5 }
            },
            {
                tipo: 'comida_compartida',
                descripcion: `🍽️ ${npc1.nombre} compartió su comida con ${npc2.nombre}. Pequeños gestos que importan.`,
                efectos: { amistad: 3 }
            },
            {
                tipo: 'risa',
                descripcion: `😂 ${npc1.nombre} hizo reír a ${npc2.nombre} con un chiste. Un momento de alegría en tiempos oscuros.`,
                efectos: { amistad: 4 }
            }
        ];

        const event = activities[Math.floor(Math.random() * activities.length)];

        npcRelationships.updateRelationship(npc1.id, npc2.id, {
            ...event.efectos,
            evento: {
                tipo: event.tipo,
                descripcion: event.descripcion
            }
        });

        return {
            ...event,
            npcs: [npc1.id, npc2.id]
        };
    }

    // ===== EVENTOS GRUPALES =====
    generateGroupEvent(npcs) {
        // Eventos que involucran múltiples NPCs
        const group = npcs.slice(0, Math.min(4, Math.floor(Math.random() * 3) + 2));
        const names = group.map(n => n.nombre).join(', ');

        const groupEvents = [
            {
                tipo: 'reunion',
                descripcion: `👥 ${names} se reunieron para discutir el futuro del refugio. Hubo tensión pero tomaron decisiones.`,
                efectos: {}
            },
            {
                tipo: 'fiesta',
                descripcion: `🎉 ${names} organizaron una pequeña celebración. Música, risas y olvido momentáneo del apocalipsis.`,
                efectos: {}
            },
            {
                tipo: 'pelea_grupal',
                descripcion: `💥👊 Una pelea grupal estalló entre ${names}. Fue un caos total hasta que los separaron.`,
                efectos: {}
            },
            {
                tipo: 'discovery',
                descripcion: `🔍 ${names} encontraron algo interesante explorando juntos el refugio.`,
                efectos: {}
            }
        ];

        const event = groupEvents[Math.floor(Math.random() * groupEvents.length)];

        return {
            ...event,
            npcs: group.map(n => n.id)
        };
    }

    // ===== EVENTOS DE REVELACIÓN =====
    generateRevelationEvent(npcs) {
        const npc = npcs[Math.floor(Math.random() * npcs.length)];
        const npcData = JSON.parse(db.prepare('SELECT personalidad FROM npcs WHERE id = ?').get(npc.id).personalidad);

        const revelations = [
            {
                tipo: 'secreto_pasado',
                descripcion: `😨 ${npc.nombre} reveló algo oscuro de su pasado. Nadie esperaba eso...`,
                efectos: {}
            },
            {
                tipo: 'habilidad_oculta',
                descripcion: `✨ ${npc.nombre} demostró una habilidad que nadie sabía que tenía. Todos quedaron impresionados.`,
                efectos: {}
            },
            {
                tipo: 'confession',
                descripcion: `💔 ${npc.nombre} confesó algo que ha estado ocultando. Las consecuencias serán graves.`,
                efectos: {}
            },
            {
                tipo: 'cambio_personalidad',
                descripcion: `🔄 ${npc.nombre} está actuando diferente últimamente. Algo cambió en su interior.`,
                efectos: {}
            }
        ];

        const event = revelations[Math.floor(Math.random() * revelations.length)];

        return {
            ...event,
            npcs: [npc.id]
        };
    }

    // ===== EVENTO ALEATORIO =====
    generateRandomEvent(npcs) {
        const npc = npcs[Math.floor(Math.random() * npcs.length)];
        const location = db.prepare('SELECT nombre FROM locations WHERE id = ?').get(npc.lugar_actual);

        const randomEvents = [
            `🚶 ${npc.nombre} camina solo/a por ${location?.nombre || 'el refugio'} perdido/a en sus pensamientos.`,
            `😔 ${npc.nombre} se ve preocupado/a. Algo lo/la está atormentando.`,
            `💤 ${npc.nombre} se quedó dormido/a en un lugar inesperado del refugio.`,
            `🔧 ${npc.nombre} está reparando algo que se rompió hace días.`,
            `📝 ${npc.nombre} escribió algo en su diario personal. ¿Qué secretos guarda?`
        ];

        return {
            tipo: 'random',
            descripcion: randomEvents[Math.floor(Math.random() * randomEvents.length)],
            npcs: [npc.id],
            efectos: {}
        };
    }

    // ===== REGISTRAR EVENTO EN EL MUNDO =====
    logWorldEvent(event) {
        if (!event) return;

        const worldEvent = {
            timestamp: Date.now(),
            ...event
        };

        this.worldEvents.push(worldEvent);

        // Mantener solo últimos N eventos
        if (this.worldEvents.length > this.maxEvents) {
            this.worldEvents.shift();
        }

        // También guardar en DB para persistencia
        db.prepare(`
            INSERT INTO world_events (timestamp, tipo, descripcion, npcs_involucrados)
            VALUES (?, ?, ?, ?)
        `).run(
            worldEvent.timestamp,
            worldEvent.tipo,
            worldEvent.descripcion,
            JSON.stringify(worldEvent.npcs || [])
        );
    }

    // ===== OBTENER EVENTOS RECIENTES =====
    getRecentEvents(limit = 50) {
        return db.prepare(`
            SELECT * FROM world_events
            ORDER BY timestamp DESC
            LIMIT ?
        `).all(limit).map(e => ({
            ...e,
            npcs_involucrados: JSON.parse(e.npcs_involucrados || '[]')
        }));
    }

    // ===== OBTENER ESTADÍSTICAS DEL MUNDO =====
    getWorldStats() {
        const stats = {
            totalEventos: this.worldEvents.length,
            romances: this.worldEvents.filter(e => ['romance', 'coqueteo', 'tension'].includes(e.tipo)).length,
            conflictos: this.worldEvents.filter(e => ['pelea', 'discusion', 'conflicto'].includes(e.tipo)).length,
            dramas: this.worldEvents.filter(e => ['chisme', 'triangulo', 'secreto_revelado'].includes(e.tipo)).length,
            actividades: this.worldEvents.filter(e => e.tipo === 'colaboracion' || e.tipo === 'charla').length
        };

        return stats;
    }
}

// Singleton
const narrativeEngine = new NarrativeEngine();
export default narrativeEngine;
