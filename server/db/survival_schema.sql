-- SCHEMA PARA SURVIVAL ZOMBIE CON PERSISTENCIA

-- Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Personajes
CREATE TABLE IF NOT EXISTS personajes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    clase TEXT NOT NULL, -- soldado, medico, ingeniero, superviviente
    nivel INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    xp_siguiente_nivel INTEGER DEFAULT 100,
    
    -- Stats
    salud INTEGER DEFAULT 100,
    hambre INTEGER DEFAULT 100,
    locacion TEXT DEFAULT 'refugio',
    
    -- Atributos base (1-10)
    fuerza INTEGER DEFAULT 5,
    resistencia INTEGER DEFAULT 5,
    agilidad INTEGER DEFAULT 5,
    inteligencia INTEGER DEFAULT 5,
    
    -- Apariencia
    avatar TEXT DEFAULT '👤',
    color TEXT DEFAULT '#00ff00',
    
    -- Inventario JSON
    inventario TEXT DEFAULT '{"comida":2,"medicinas":1,"armas":0,"materiales":5}',
    
    -- Skills JSON
    skills TEXT DEFAULT '{"combate":1,"medicina":1,"sigilo":1,"supervivencia":1,"mecanica":1}',
    
    -- Estado
    vivo INTEGER DEFAULT 1,
    ultima_conexion DATETIME DEFAULT CURRENT_TIMESTAMP,
    tiempo_jugado INTEGER DEFAULT 0, -- minutos
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Historial de acciones (para estadísticas)
CREATE TABLE IF NOT EXISTS estadisticas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    personaje_id INTEGER NOT NULL,
    zombies_matados INTEGER DEFAULT 0,
    recursos_encontrados INTEGER DEFAULT 0,
    items_crafteados INTEGER DEFAULT 0,
    veces_muerto INTEGER DEFAULT 0,
    misiones_completadas INTEGER DEFAULT 0,
    
    FOREIGN KEY (personaje_id) REFERENCES personajes(id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_personajes_usuario ON personajes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_personajes_nombre ON personajes(nombre);
-- ========================================
-- TABLAS PARA SISTEMA DE MUNDO VIVO
-- ========================================

-- NPCs
CREATE TABLE IF NOT EXISTS npcs (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    lugar_actual TEXT NOT NULL,
    personalidad TEXT NOT NULL, -- JSON: traits
    rol_social TEXT NOT NULL,
    estado_emocional TEXT NOT NULL, -- JSON
    memoria TEXT DEFAULT '[]', -- JSON: array de eventos recordados
    estado TEXT DEFAULT 'activo', -- activo, herido, muerto
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Estado de NPCs para simulación
CREATE TABLE IF NOT EXISTS npc_state (
    npc_id TEXT PRIMARY KEY,
    necesidades TEXT DEFAULT '{"hambre": 70, "sed": 70, "cansancio": 50, "seguridad": 70, "social": 70}', -- JSON
    actividad_actual TEXT DEFAULT 'descansar',
    objetivo_actual TEXT,
    ultima_decision INTEGER DEFAULT 0, -- Timestamp
    FOREIGN KEY (npc_id) REFERENCES npcs(id)
);

-- Locaciones
CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    conexiones TEXT NOT NULL, -- JSON: array de IDs conectados
    peligro_nivel INTEGER DEFAULT 1,
    recursos TEXT DEFAULT '{}' -- JSON: {comida, agua, medicina, armas}
);

-- Eventos del mundo (feed de noticias)
CREATE TABLE IF NOT EXISTS world_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    tipo TEXT NOT NULL, -- romance, pelea, drama, actividad, etc
    descripcion TEXT NOT NULL,
    npcs_involucrados TEXT DEFAULT '[]', -- JSON array de NPC IDs
    location_id TEXT,
    intensidad INTEGER DEFAULT 1,
    leido_por TEXT DEFAULT '[]', -- JSON array de player IDs que ya lo vieron
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Relaciones entre NPCs
CREATE TABLE IF NOT EXISTS npc_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    npc_a_id TEXT NOT NULL,
    npc_b_id TEXT NOT NULL,
    
    -- DIMENSIONES DE RELACIÓN (0-100)
    amistad INTEGER DEFAULT 50,
    atraccion INTEGER DEFAULT 0,
    respeto INTEGER DEFAULT 50,
    rivalidad INTEGER DEFAULT 0,
    celos INTEGER DEFAULT 0,
    
    -- ESTADO DE LA RELACIÓN
    estado TEXT DEFAULT 'neutral',
    historia TEXT DEFAULT '[]',
    
    -- METADATOS
    ultima_interaccion INTEGER,
    intensidad INTEGER DEFAULT 1,
    
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(npc_a_id, npc_b_id)
);

-- Índices para mundo vivo
CREATE INDEX IF NOT EXISTS idx_world_events_timestamp ON world_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_world_events_tipo ON world_events(tipo);
CREATE INDEX IF NOT EXISTS idx_npc_rel_a ON npc_relationships(npc_a_id);
CREATE INDEX IF NOT EXISTS idx_npc_rel_b ON npc_relationships(npc_b_id);
CREATE INDEX IF NOT EXISTS idx_npc_rel_estado ON npc_relationships(estado);
CREATE INDEX IF NOT EXISTS idx_npc_rel_intensidad ON npc_relationships(intensidad DESC);

-- Quests dinámicas generadas por eventos del mundo
CREATE TABLE IF NOT EXISTS dynamic_quests (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL, -- romance, mediation, rivalry, jealousy, investigation
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    objectives TEXT NOT NULL, -- JSON array
    rewards TEXT NOT NULL, -- JSON {xp, reputacion, oro}
    npcs_involved TEXT NOT NULL, -- JSON array de NPC IDs
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    status TEXT DEFAULT 'active', -- active, completed, failed, expired
    completed_by TEXT DEFAULT '[]' -- JSON array de player IDs que la completaron
);

CREATE INDEX IF NOT EXISTS idx_dynamic_quests_status ON dynamic_quests(status);
CREATE INDEX IF NOT EXISTS idx_dynamic_quests_expires ON dynamic_quests(expires_at);
