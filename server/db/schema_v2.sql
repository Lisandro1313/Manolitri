-- ====================================
-- NUEVA BASE DE DATOS - MMO-lite RPG
-- ====================================

-- Tabla de cuentas de usuario
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);

-- Tabla de personajes (múltiples por cuenta)
CREATE TABLE IF NOT EXISTS characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  raza TEXT DEFAULT 'humano', -- humano, elfo, enano, orco
  clase TEXT DEFAULT 'guerrero', -- guerrero, mago, clerigo, picaro
  nivel INTEGER DEFAULT 1,
  experiencia INTEGER DEFAULT 0,
  
  -- Stats principales (D&D style)
  fuerza INTEGER DEFAULT 10,
  destreza INTEGER DEFAULT 10,
  constitucion INTEGER DEFAULT 10,
  inteligencia INTEGER DEFAULT 10,
  sabiduria INTEGER DEFAULT 10,
  carisma INTEGER DEFAULT 10,
  
  -- Recursos
  salud INTEGER DEFAULT 100,
  salud_max INTEGER DEFAULT 100,
  mana INTEGER DEFAULT 50,
  mana_max INTEGER DEFAULT 50,
  energia INTEGER DEFAULT 100,
  energia_max INTEGER DEFAULT 100,
  oro INTEGER DEFAULT 100,
  
  -- Inventario (JSON array)
  inventario TEXT DEFAULT '[]',
  
  -- Equipamiento
  equipo_arma TEXT, -- JSON: {id, nombre, stats}
  equipo_armadura TEXT,
  equipo_accesorio1 TEXT,
  equipo_accesorio2 TEXT,
  
  -- Ubicación actual
  zona_actual TEXT DEFAULT 'ciudad_inicio',
  
  -- Apariencia (JSON)
  apariencia TEXT DEFAULT '{"color_pelo": "castano", "color_ojos": "marron", "altura": "medio"}',
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_played DATETIME,
  
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  UNIQUE(account_id, nombre) -- No dos personajes con mismo nombre en misma cuenta
);

-- Tabla de zonas del mundo
CREATE TABLE IF NOT EXISTS zones (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT DEFAULT 'neutral', -- ciudad, bosque, dungeon_entrance, ruinas, pvp
  descripcion TEXT,
  nivel_minimo INTEGER DEFAULT 1,
  nivel_recomendado INTEGER DEFAULT 1,
  conexiones TEXT, -- JSON array de zone_ids conectados
  npcs TEXT, -- JSON array de NPCs en la zona
  pois TEXT, -- JSON array de Points of Interest
  eventos TEXT DEFAULT '[]', -- JSON array de eventos activos
  clima TEXT DEFAULT 'soleado'
);

-- Tabla de NPCs (definiciones globales)
CREATE TABLE IF NOT EXISTS npcs (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT DEFAULT 'neutral', -- comerciante, quest_giver, hostil, amigable
  raza TEXT,
  descripcion TEXT,
  dialogos TEXT, -- JSON de árbol de diálogos
  inventario TEXT, -- Para comerciantes
  quests TEXT, -- JSON array de quest IDs que da
  nivel INTEGER DEFAULT 1,
  hostil BOOLEAN DEFAULT 0
);

-- Tabla de parties (grupos temporales)
CREATE TABLE IF NOT EXISTS parties (
  id TEXT PRIMARY KEY,
  lider_character_id INTEGER NOT NULL,
  miembros TEXT, -- JSON array de character_ids
  max_miembros INTEGER DEFAULT 6,
  estado TEXT DEFAULT 'en_lobby', -- en_lobby, en_aventura, buscando_miembros
  zona_reunion TEXT,
  invitaciones TEXT DEFAULT '[]', -- JSON array de character_ids invitados
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lider_character_id) REFERENCES characters(id) ON DELETE CASCADE
);

-- Tabla de instancias de dungeons (temporales)
CREATE TABLE IF NOT EXISTS dungeon_instances (
  id TEXT PRIMARY KEY,
  party_id TEXT NOT NULL,
  dungeon_template_id TEXT NOT NULL,
  estado TEXT DEFAULT 'activa', -- activa, completada, fallida, abandonada
  
  -- Progreso
  sala_actual TEXT,
  salas_exploradas TEXT DEFAULT '[]', -- JSON array
  enemigos_derrotados INTEGER DEFAULT 0,
  cofres_abiertos INTEGER DEFAULT 0,
  
  -- Narrativa
  eventos_narrativa TEXT DEFAULT '[]', -- JSON array de eventos que sucedieron
  decisiones TEXT DEFAULT '[]', -- JSON array de decisiones tomadas
  
  -- Timestamps
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  
  FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE
);

-- Tabla de templates de dungeons
CREATE TABLE IF NOT EXISTS dungeon_templates (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  nivel_minimo INTEGER DEFAULT 1,
  nivel_recomendado INTEGER DEFAULT 5,
  duracion_estimada INTEGER DEFAULT 30, -- minutos
  max_jugadores INTEGER DEFAULT 6,
  tipo TEXT DEFAULT 'pve', -- pve, pvp, raid
  
  -- Estructura (JSON)
  salas TEXT, -- Array de salas con descripción, enemigos, eventos
  jefe_final TEXT, -- JSON del boss
  
  -- Recompensas
  recompensas_oro_min INTEGER DEFAULT 50,
  recompensas_oro_max INTEGER DEFAULT 200,
  recompensas_xp INTEGER DEFAULT 100,
  recompensas_items TEXT, -- JSON array de posibles items
  
  dificultad TEXT DEFAULT 'normal' -- facil, normal, dificil, heroico
);

-- Tabla de quests
CREATE TABLE IF NOT EXISTS quests (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT DEFAULT 'main', -- main, side, diaria, evento
  nivel_minimo INTEGER DEFAULT 1,
  
  -- Requisitos
  requisitos TEXT DEFAULT '{}', -- JSON: {quests_previas: [], nivel: 1, items: []}
  
  -- Objetivos (JSON array)
  objetivos TEXT, -- [{tipo: 'matar', target: 'goblin', cantidad: 10, actual: 0}]
  
  -- Recompensas
  recompensa_oro INTEGER DEFAULT 0,
  recompensa_xp INTEGER DEFAULT 0,
  recompensa_items TEXT DEFAULT '[]', -- JSON array
  
  -- Diálogos
  dialogo_inicio TEXT,
  dialogo_progreso TEXT,
  dialogo_completado TEXT,
  
  -- NPC que da la quest
  npc_id TEXT,
  zona_inicio TEXT
);

-- Tabla de progreso de quests por personaje
CREATE TABLE IF NOT EXISTS character_quests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_id INTEGER NOT NULL,
  quest_id TEXT NOT NULL,
  estado TEXT DEFAULT 'en_progreso', -- en_progreso, completada, fallida, abandonada
  progreso TEXT, -- JSON con progreso de objetivos
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  FOREIGN KEY (quest_id) REFERENCES quests(id),
  UNIQUE(character_id, quest_id)
);

-- Tabla de items (definiciones globales)
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL, -- arma, armadura, consumible, quest_item, material
  subtipo TEXT, -- espada, pocion, etc
  descripcion TEXT,
  
  -- Stats
  nivel_requerido INTEGER DEFAULT 1,
  valor_oro INTEGER DEFAULT 1,
  stackable BOOLEAN DEFAULT 0,
  max_stack INTEGER DEFAULT 1,
  
  -- Propiedades (JSON)
  propiedades TEXT, -- {danio: 10, defensa: 5, cura: 50, etc}
  
  -- Rareza
  rareza TEXT DEFAULT 'comun', -- comun, poco_comun, raro, epico, legendario
  
  -- Visual
  icono TEXT,
  color TEXT DEFAULT '#FFFFFF'
);

-- Tabla de chat (logs temporales)
CREATE TABLE IF NOT EXISTS chat_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_id INTEGER,
  character_nombre TEXT,
  zona_id TEXT,
  tipo TEXT DEFAULT 'zona', -- zona, party, susurro, sistema
  mensaje TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL
);

-- Tabla de eventos globales del mundo
CREATE TABLE IF NOT EXISTS world_events (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT DEFAULT 'servidor', -- servidor, zona, estacional
  activo BOOLEAN DEFAULT 1,
  fecha_inicio DATETIME,
  fecha_fin DATETIME,
  zonas_afectadas TEXT, -- JSON array
  modificadores TEXT -- JSON: {xp: 2, drop_rate: 1.5}
);

-- ====================================
-- DATOS INICIALES
-- ====================================

-- Cuenta de prueba
INSERT OR IGNORE INTO accounts (id, username, password) VALUES 
(1, 'testuser', 'test123');

-- Personaje de prueba
INSERT OR IGNORE INTO characters (
  id, account_id, nombre, raza, clase, nivel, 
  zona_actual, oro, salud, salud_max
) VALUES (
  1, 1, 'Thorin', 'enano', 'guerrero', 1,
  'ciudad_inicio', 100, 100, 100
);

-- Zonas iniciales
INSERT OR IGNORE INTO zones (id, nombre, tipo, descripcion, nivel_recomendado, conexiones, npcs, pois) VALUES
('ciudad_inicio', 'Ciudad Inicio', 'ciudad', 
 'Una bulliciosa ciudad amurallada, punto de partida para aventureros novatos.', 
 1,
 '["bosque_verde", "camino_este"]',
 '["comerciante_general", "herrero_juan", "maestra_gremio"]',
 '[
   {"id": "tienda", "nombre": "Tienda General", "tipo": "comercio"},
   {"id": "herreria", "nombre": "Herrería", "tipo": "comercio"},
   {"id": "taberna", "nombre": "La Taberna del Aventurero", "tipo": "social"},
   {"id": "gremio", "nombre": "Gremio de Aventureros", "tipo": "quests"}
 ]'),

('bosque_verde', 'Bosque Verde', 'bosque',
 'Un frondoso bosque lleno de vida... y peligros menores.',
 2,
 '["ciudad_inicio", "cueva_goblins_entrada"]',
 '["npc_cazador"]',
 '[
   {"id": "claro", "nombre": "Claro del Bosque", "tipo": "descanso"},
   {"id": "lago", "nombre": "Lago Cristalino", "tipo": "recurso"}
 ]'),

('cueva_goblins_entrada', 'Entrada a la Cueva de Goblins', 'dungeon_entrance',
 'Una oscura entrada a una cueva. Se escuchan gruñidos en el interior.',
 3,
 '["bosque_verde"]',
 '[]',
 '[
   {"id": "dungeon_cueva_goblins", "nombre": "Cueva de Goblins", "tipo": "dungeon", "nivel": 3}
 ]');

-- NPCs
INSERT OR IGNORE INTO npcs (id, nombre, tipo, raza, descripcion, nivel, hostil) VALUES
('comerciante_general', 'Marta la Comerciante', 'comerciante', 'humano',
 'Una amable comerciante que vende provisiones básicas.', 5, 0),

('herrero_juan', 'Juan el Herrero', 'comerciante', 'enano',
 'Un fornido herrero que puede crear y mejorar armas.', 8, 0),

('maestra_gremio', 'Elara', 'quest_giver', 'elfo',
 'La maestra del gremio de aventureros. Siempre tiene trabajos disponibles.', 10, 0);

-- Items básicos
INSERT OR IGNORE INTO items (id, nombre, tipo, subtipo, descripcion, valor_oro, rareza, propiedades) VALUES
('espada_basica', 'Espada de Hierro', 'arma', 'espada_una_mano', 
 'Una espada básica pero confiable.', 50, 'comun',
 '{"danio": 8, "velocidad": 1.2}'),

('pocion_salud_menor', 'Poción de Salud Menor', 'consumible', 'pocion',
 'Restaura 50 puntos de salud.', 20, 'comun',
 '{"cura": 50, "stackable": true, "max_stack": 20}'),

('armadura_cuero', 'Armadura de Cuero', 'armadura', 'pecho',
 'Armadura ligera hecha de cuero tratado.', 80, 'comun',
 '{"defensa": 5, "peso": "ligero"}');

-- Dungeon template de ejemplo
INSERT OR IGNORE INTO dungeon_templates (
  id, nombre, descripcion, nivel_recomendado, max_jugadores,
  duracion_estimada, recompensas_oro_min, recompensas_oro_max,
  recompensas_xp, tipo, dificultad
) VALUES (
  'cueva_goblins', 'Cueva de Goblins', 
  'Una red de túneles infestada de goblins. Ideal para aventureros novatos.',
  3, 4, 20, 80, 150, 200, 'pve', 'normal'
);

-- Quest de ejemplo
INSERT OR IGNORE INTO quests (
  id, nombre, descripcion, tipo, nivel_minimo,
  objetivos, recompensa_oro, recompensa_xp,
  npc_id, zona_inicio
) VALUES (
  'primera_mision', 'Limpieza de Goblins',
  'Los goblins del bosque están atacando los caminos. Elimina 5 de ellos.',
  'main', 1,
  '[{"tipo": "matar", "target": "goblin", "cantidad": 5, "actual": 0}]',
  50, 100,
  'maestra_gremio', 'ciudad_inicio'
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_characters_account ON characters(account_id);
CREATE INDEX IF NOT EXISTS idx_characters_zone ON characters(zona_actual);
CREATE INDEX IF NOT EXISTS idx_parties_lider ON parties(lider_character_id);
CREATE INDEX IF NOT EXISTS idx_dungeon_instances_party ON dungeon_instances(party_id);
CREATE INDEX IF NOT EXISTS idx_character_quests_character ON character_quests(character_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_zone ON chat_logs(zona_id);
