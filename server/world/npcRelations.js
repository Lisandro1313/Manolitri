// Importar db desde survivalDB (que ya está inicializado)
import survivalDB from '../db/survivalDB.js';
const db = survivalDB.db;

/**
 * 🧠 SISTEMA DE RELACIONES ENTRE NPCs - Red Dead Redemption Style
 * 
 * Los NPCs tienen relaciones complejas entre ellos:
 * - Atracción romántica (pueden enamorarse, coquetear, tener affaires)
 * - Rivalidades y odio (peleas, venganzas, conflictos)
 * - Amistades (aliados, confidentes, camaradería)
 * - Celos (triangulaciones amorosas, envidia)
 * - Lealtad/Traición (alianzas que se rompen)
 * 
 * Las relaciones EVOLUCIONAN basadas en:
 * - Personalidad de cada NPC
 * - Historial de interacciones
 * - Eventos del mundo
 * - Influencia de otros NPCs
 */

class NPCRelationshipSystem {
    constructor() {
        this.initializeSchema();
    }

    // ===== INICIALIZAR TABLA =====
    initializeSchema() {
        db.exec(`
            CREATE TABLE IF NOT EXISTS npc_relationships (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                npc_a_id TEXT NOT NULL,
                npc_b_id TEXT NOT NULL,
                
                -- DIMENSIONES DE RELACIÓN (0-100)
                amistad INTEGER DEFAULT 50,        -- Amistad/Confianza
                atraccion INTEGER DEFAULT 0,       -- Atracción romántica
                respeto INTEGER DEFAULT 50,        -- Respeto/Admiración
                rivalidad INTEGER DEFAULT 0,       -- Competencia/Odio
                celos INTEGER DEFAULT 0,           -- Envidia/Celos
                
                -- ESTADO DE LA RELACIÓN
                estado TEXT DEFAULT 'neutral',     -- neutral, amigos, amantes, enemigos, rivales
                historia TEXT DEFAULT '[]',        -- JSON array de eventos
                
                -- METADATOS
                ultima_interaccion INTEGER,       -- Timestamp
                intensidad INTEGER DEFAULT 1,     -- Qué tan activa es la relación (1-10)
                
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(npc_a_id, npc_b_id)
            );

            CREATE INDEX IF NOT EXISTS idx_npc_rel_a ON npc_relationships(npc_a_id);
            CREATE INDEX IF NOT EXISTS idx_npc_rel_b ON npc_relationships(npc_b_id);
            CREATE INDEX IF NOT EXISTS idx_npc_rel_estado ON npc_relationships(estado);
        `);
    }

    // ===== OBTENER O CREAR RELACIÓN =====
    getRelationship(npcA, npcB) {
        // Normalizar orden (siempre menor ID primero)
        const [id1, id2] = [npcA, npcB].sort();

        let rel = db.prepare(`
            SELECT * FROM npc_relationships 
            WHERE npc_a_id = ? AND npc_b_id = ?
        `).get(id1, id2);

        if (!rel) {
            // Crear nueva relación con valores base
            db.prepare(`
                INSERT INTO npc_relationships (npc_a_id, npc_b_id)
                VALUES (?, ?)
            `).run(id1, id2);

            rel = this.getRelationship(id1, id2);
        }

        return {
            ...rel,
            historia: JSON.parse(rel.historia || '[]')
        };
    }

    // ===== ACTUALIZAR RELACIÓN =====
    updateRelationship(npcA, npcB, changes) {
        const [id1, id2] = [npcA, npcB].sort();
        const rel = this.getRelationship(id1, id2);

        // Aplicar cambios a dimensiones
        const updates = {
            amistad: this.clamp(rel.amistad + (changes.amistad || 0)),
            atraccion: this.clamp(rel.atraccion + (changes.atraccion || 0)),
            respeto: this.clamp(rel.respeto + (changes.respeto || 0)),
            rivalidad: this.clamp(rel.rivalidad + (changes.rivalidad || 0)),
            celos: this.clamp(rel.celos + (changes.celos || 0)),
            ultima_interaccion: Date.now()
        };

        // Determinar nuevo estado basado en dimensiones
        updates.estado = this.calculateRelationshipState(updates);

        // Calcular intensidad (qué tan dramática es la relación)
        updates.intensidad = this.calculateIntensity(updates);

        // Registrar evento en historia
        if (changes.evento) {
            const historia = rel.historia;
            historia.push({
                timestamp: Date.now(),
                ...changes.evento
            });

            // Mantener últimos 30 eventos
            if (historia.length > 30) historia.shift();
            updates.historia = JSON.stringify(historia);
        }

        // Actualizar en DB
        const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(updates), id1, id2];

        db.prepare(`
            UPDATE npc_relationships 
            SET ${setClause}, updated_at = CURRENT_TIMESTAMP
            WHERE npc_a_id = ? AND npc_b_id = ?
        `).run(...values);

        return this.getRelationship(id1, id2);
    }

    // ===== CALCULAR ESTADO DE RELACIÓN =====
    calculateRelationshipState(dims) {
        const { amistad, atraccion, respeto, rivalidad, celos } = dims;

        // AMANTES: Alta atracción + amistad decente
        if (atraccion > 70 && amistad > 50) {
            return 'amantes';
        }

        // TENSIÓN SEXUAL: Alta atracción pero amistad baja (drama potencial)
        if (atraccion > 60 && amistad < 40) {
            return 'tension_sexual';
        }

        // ENEMIGOS: Alta rivalidad
        if (rivalidad > 70) {
            return 'enemigos';
        }

        // RIVALES: Rivalidad media + respeto alto (competencia sana)
        if (rivalidad > 40 && respeto > 60) {
            return 'rivales';
        }

        // AMIGOS: Alta amistad + respeto
        if (amistad > 70 && respeto > 60) {
            return 'amigos';
        }

        // CELOS INTENSOS: Celos altos (triangulación)
        if (celos > 70) {
            return 'celoso';
        }

        // COMPLEJO: Alta en múltiples dimensiones (relación dramática)
        const activeCount = [amistad, atraccion, rivalidad, celos].filter(v => v > 60).length;
        if (activeCount >= 2) {
            return 'complejo';
        }

        return 'neutral';
    }

    // ===== CALCULAR INTENSIDAD =====
    calculateIntensity(dims) {
        // Suma de desviaciones del neutral (50)
        const deviations = [
            Math.abs(dims.amistad - 50),
            Math.abs(dims.atraccion),
            Math.abs(dims.respeto - 50),
            Math.abs(dims.rivalidad),
            Math.abs(dims.celos)
        ];

        const totalDeviation = deviations.reduce((a, b) => a + b, 0);
        return Math.min(10, Math.floor(totalDeviation / 25) + 1);
    }

    // ===== OBTENER RELACIONES DE UN NPC =====
    getNPCRelationships(npcId) {
        const rels = db.prepare(`
            SELECT * FROM npc_relationships
            WHERE npc_a_id = ? OR npc_b_id = ?
            ORDER BY intensidad DESC, updated_at DESC
        `).all(npcId, npcId);

        return rels.map(rel => ({
            ...rel,
            otherNPC: rel.npc_a_id === npcId ? rel.npc_b_id : rel.npc_a_id,
            historia: JSON.parse(rel.historia || '[]')
        }));
    }

    // ===== ALIAS PARA COMPATIBILIDAD CON NPCAI =====
    getRelationshipsByNpc(npcId) {
        return this.getNPCRelationships(npcId);
    }

    // ===== OBTENER RELACIONES INTENSAS =====
    getIntenseRelationships(minIntensity = 5) {
        return db.prepare(`
            SELECT * FROM npc_relationships
            WHERE intensidad >= ?
            ORDER BY intensidad DESC, updated_at DESC
            LIMIT 20
        `).all(minIntensity).map(rel => ({
            ...rel,
            historia: JSON.parse(rel.historia || '[]')
        }));
    }

    // ===== OBTENER RELACIONES POR ESTADO =====
    getRelationshipsByState(estado) {
        return db.prepare(`
            SELECT * FROM npc_relationships
            WHERE estado = ?
            ORDER BY intensidad DESC
        `).all(estado).map(rel => ({
            ...rel,
            historia: JSON.parse(rel.historia || '[]')
        }));
    }

    // ===== GENERAR EVENTO DE RELACIÓN =====
    generateRelationshipEvent(npcA, npcB) {
        const rel = this.getRelationship(npcA, npcB);
        const npcAData = this.getNPCData(npcA);
        const npcBData = this.getNPCData(npcB);

        if (!npcAData || !npcBData) return null;

        // Generar evento basado en estado de relación
        switch (rel.estado) {
            case 'amantes':
                return this.generateRomanceEvent(npcA, npcB, rel, npcAData, npcBData);

            case 'tension_sexual':
                return this.generateTensionEvent(npcA, npcB, rel, npcAData, npcBData);

            case 'enemigos':
                return this.generateConflictEvent(npcA, npcB, rel, npcAData, npcBData);

            case 'rivales':
                return this.generateRivalryEvent(npcA, npcB, rel, npcAData, npcBData);

            case 'celoso':
                return this.generateJealousyEvent(npcA, npcB, rel, npcAData, npcBData);

            case 'amigos':
                return this.generateFriendshipEvent(npcA, npcB, rel, npcAData, npcBData);

            case 'complejo':
                return this.generateComplexEvent(npcA, npcB, rel, npcAData, npcBData);

            default:
                return this.generateNeutralEvent(npcA, npcB, rel, npcAData, npcBData);
        }
    }

    // ===== EVENTOS DE ROMANCE =====
    generateRomanceEvent(npcA, npcB, rel, dataA, dataB) {
        const events = [
            {
                tipo: 'romance',
                descripcion: `💕 ${dataA.nombre} y ${dataB.nombre} fueron vistos caminando juntos de la mano por ${this.getLocationName(dataA.lugar_actual)}`,
                efectos: { amistad: 5, atraccion: 3 }
            },
            {
                tipo: 'romance',
                descripcion: `💋 ${dataA.nombre} le susurró algo al oído a ${dataB.nombre}. Se sonrojaron y se alejaron juntos...`,
                efectos: { atraccion: 5, intensidad: 1 }
            },
            {
                tipo: 'romance',
                descripcion: `🌹 ${dataA.nombre} le regaló algo especial a ${dataB.nombre}. La química es innegable.`,
                efectos: { amistad: 3, atraccion: 2, respeto: 2 }
            },
            {
                tipo: 'romance_intimate',
                descripcion: `😏 ${dataA.nombre} y ${dataB.nombre} se fueron juntos al dormitorio. Nadie los ha visto en horas...`,
                efectos: { atraccion: 8, intensidad: 2 }
            },
            {
                tipo: 'romance',
                descripcion: `💑 ${dataA.nombre} no puede dejar de mirar a ${dataB.nombre}. Están completamente enamorados.`,
                efectos: { atraccion: 2 }
            }
        ];

        return events[Math.floor(Math.random() * events.length)];
    }

    // ===== EVENTOS DE CONFLICTO =====
    generateConflictEvent(npcA, npcB, rel, dataA, dataB) {
        const events = [
            {
                tipo: 'pelea',
                descripcion: `💥 ¡${dataA.nombre} le pegó a ${dataB.nombre} en la nuca! ${dataB.nombre} cayó al suelo aturdido.`,
                efectos: { rivalidad: 10, respeto: -5, amistad: -10 }
            },
            {
                tipo: 'pelea',
                descripcion: `🗡️ ${dataA.nombre} y ${dataB.nombre} se enfrentaron violentamente. Hubo que separarlos.`,
                efectos: { rivalidad: 8, intensidad: 2 }
            },
            {
                tipo: 'conflicto',
                descripcion: `😠 ${dataA.nombre} gritó insultos contra ${dataB.nombre} frente a todos. La tensión es palpable.`,
                efectos: { rivalidad: 5, respeto: -8 }
            },
            {
                tipo: 'amenaza',
                descripcion: `👿 ${dataA.nombre} amenazó en voz baja a ${dataB.nombre}: "Esto no se queda así..."`,
                efectos: { rivalidad: 7, intensidad: 1 }
            },
            {
                tipo: 'sabotaje',
                descripcion: `🔪 ${dataA.nombre} saboteó el equipo de ${dataB.nombre}. La guerra ha comenzado.`,
                efectos: { rivalidad: 12, amistad: -15 }
            }
        ];

        return events[Math.floor(Math.random() * events.length)];
    }

    // ===== EVENTOS DE CELOS =====
    generateJealousyEvent(npcA, npcB, rel, dataA, dataB) {
        const events = [
            {
                tipo: 'celos',
                descripcion: `😒 ${dataA.nombre} vio a ${dataB.nombre} hablando con alguien más y se puso celoso/a visiblemente.`,
                efectos: { celos: 5, rivalidad: 3 }
            },
            {
                tipo: 'celos',
                descripcion: `💔 ${dataA.nombre} espía constantemente a ${dataB.nombre}. Los celos lo/la están consumiendo.`,
                efectos: { celos: 8, intensidad: 1 }
            },
            {
                tipo: 'triangulo',
                descripcion: `😈 ${dataA.nombre} trató de sabotear una relación de ${dataB.nombre} por pura envidia.`,
                efectos: { celos: 10, rivalidad: 5, amistad: -10 }
            }
        ];

        return events[Math.floor(Math.random() * events.length)];
    }

    // ===== EVENTOS DE TENSIÓN SEXUAL =====
    generateTensionEvent(npcA, npcB, rel, dataA, dataB) {
        const events = [
            {
                tipo: 'tension',
                descripcion: `🔥 ${dataA.nombre} y ${dataB.nombre} se miraron intensamente... hay química pero también conflicto.`,
                efectos: { atraccion: 3, rivalidad: 2 }
            },
            {
                tipo: 'tension',
                descripcion: `😏 ${dataA.nombre} coqueteó con ${dataB.nombre}, quien respondió con sarcasmo. Amor-odio puro.`,
                efectos: { atraccion: 5, rivalidad: 3, intensidad: 1 }
            },
            {
                tipo: 'tension_explosive',
                descripcion: `💥💋 ${dataA.nombre} y ${dataB.nombre} discutieron acaloradamente y casi se besan. Drama total.`,
                efectos: { atraccion: 8, rivalidad: 5, intensidad: 2 }
            }
        ];

        return events[Math.floor(Math.random() * events.length)];
    }

    // ===== EVENTOS DE AMISTAD =====
    generateFriendshipEvent(npcA, npcB, rel, dataA, dataB) {
        const events = [
            {
                tipo: 'amistad',
                descripcion: `🤝 ${dataA.nombre} y ${dataB.nombre} compartieron una conversación profunda. Su amistad se fortalece.`,
                efectos: { amistad: 5, respeto: 3 }
            },
            {
                tipo: 'amistad',
                descripcion: `💪 ${dataA.nombre} defendió a ${dataB.nombre} cuando alguien lo/la criticó. Lealtad verdadera.`,
                efectos: { amistad: 8, respeto: 5 }
            },
            {
                tipo: 'apoyo',
                descripcion: `🫂 ${dataA.nombre} consoló a ${dataB.nombre} en un momento difícil. Son como hermanos/as.`,
                efectos: { amistad: 6, respeto: 4 }
            }
        ];

        return events[Math.floor(Math.random() * events.length)];
    }

    // ===== EVENTOS COMPLEJOS =====
    generateComplexEvent(npcA, npcB, rel, dataA, dataB) {
        const events = [
            {
                tipo: 'drama',
                descripcion: `🎭 La relación entre ${dataA.nombre} y ${dataB.nombre} es un caos total. Nadie entiende qué sienten realmente.`,
                efectos: { intensidad: 2 }
            },
            {
                tipo: 'confusion',
                descripcion: `❓ ${dataA.nombre} y ${dataB.nombre} parecen amarse y odiarse al mismo tiempo. Es complicado...`,
                efectos: { atraccion: 2, rivalidad: 2, intensidad: 1 }
            }
        ];

        return events[Math.floor(Math.random() * events.length)];
    }

    // ===== EVENTOS NEUTRALES =====
    generateNeutralEvent(npcA, npcB, rel, dataA, dataB) {
        const events = [
            {
                tipo: 'encuentro',
                descripcion: `👋 ${dataA.nombre} y ${dataB.nombre} se cruzaron e intercambiaron saludos cordiales.`,
                efectos: { amistad: 1 }
            },
            {
                tipo: 'charla',
                descripcion: `💬 ${dataA.nombre} y ${dataB.nombre} conversaron brevemente sobre el clima.`,
                efectos: { amistad: 1 }
            }
        ];

        return events[Math.floor(Math.random() * events.length)];
    }

    // ===== EVENTOS DE RIVALIDAD =====
    generateRivalryEvent(npcA, npcB, rel, dataA, dataB) {
        const events = [
            {
                tipo: 'rivalidad',
                descripcion: `⚔️ ${dataA.nombre} y ${dataB.nombre} compitieron por quién es mejor. Hay respeto mutuo pero quieren ganar.`,
                efectos: { rivalidad: 3, respeto: 2 }
            },
            {
                tipo: 'desafio',
                descripcion: `🎯 ${dataA.nombre} desafió a ${dataB.nombre} públicamente. La competencia está en su punto máximo.`,
                efectos: { rivalidad: 5, respeto: 3, intensidad: 1 }
            }
        ];

        return events[Math.floor(Math.random() * events.length)];
    }

    // ===== HELPERS =====
    clamp(value, min = 0, max = 100) {
        return Math.max(min, Math.min(max, value));
    }

    getNPCData(npcId) {
        return db.prepare('SELECT * FROM npcs WHERE id = ?').get(npcId);
    }

    getLocationName(locationId) {
        const loc = db.prepare('SELECT nombre FROM locations WHERE id = ?').get(locationId);
        return loc ? loc.nombre : 'el refugio';
    }

    // ===== DECAIMIENTO NATURAL =====
    decayAllRelationships() {
        // Las relaciones decaen gradualmente hacia neutral si no hay interacción
        db.prepare(`
            UPDATE npc_relationships
            SET 
                amistad = CASE 
                    WHEN amistad > 50 THEN MAX(50, amistad - 1)
                    WHEN amistad < 50 THEN MIN(50, amistad + 1)
                    ELSE amistad
                END,
                atraccion = MAX(0, atraccion - 1),
                rivalidad = MAX(0, rivalidad - 1),
                celos = MAX(0, celos - 1),
                updated_at = CURRENT_TIMESTAMP
            WHERE (julianday('now') - julianday(datetime(ultima_interaccion/1000, 'unixepoch'))) > 0.5
        `).run();
    }
}

// Singleton
const npcRelationships = new NPCRelationshipSystem();
export default npcRelationships;
