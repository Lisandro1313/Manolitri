-- MANOLITRI DATABASE SCHEMA

-- Tabla de jugadores
CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alias TEXT UNIQUE NOT NULL,
    lugar_actual TEXT NOT NULL DEFAULT 'hospital',
    nivel INTEGER DEFAULT 1,
    experiencia INTEGER DEFAULT 0,
    stats TEXT NOT NULL, -- JSON: {salud, salud_max, energia, energia_max, resistencia, fuerza, defensa, velocidad, carisma, empatia, intimidacion, astucia, percepcion, suerte, estres}
    estado_emocional TEXT NOT NULL, -- JSON: {miedo, confianza, esperanza, desesperacion}
    reputacion INTEGER DEFAULT 0,
    oro INTEGER DEFAULT 0,
    peso_actual INTEGER DEFAULT 0,
    peso_maximo INTEGER DEFAULT 100,
    en_combate INTEGER DEFAULT 0, -- 0=no, 1=si
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de locaciones
CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    conexiones TEXT NOT NULL, -- JSON: array de IDs de lugares conectados
    peligro_nivel INTEGER DEFAULT 1,
    recursos TEXT -- JSON: {comida, agua, medicinas, armas}
);

-- Tabla de relaciones (jugador-jugador y jugador-NPC)
CREATE TABLE IF NOT EXISTS relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_id TEXT NOT NULL, -- player_id o npc_id
    to_id TEXT NOT NULL,
    from_type TEXT NOT NULL, -- 'player' o 'npc'
    to_type TEXT NOT NULL,
    valores TEXT NOT NULL, -- JSON: {confianza, respeto, miedo, resentimiento}
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de NPCs
CREATE TABLE IF NOT EXISTS npcs (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    lugar_actual TEXT NOT NULL,
    personalidad TEXT NOT NULL, -- JSON: traits
    rol_social TEXT NOT NULL,
    estado_emocional TEXT NOT NULL, -- JSON
    memoria TEXT, -- JSON: array de eventos recordados
    estado TEXT DEFAULT 'activo' -- activo, herido, muerto
);

-- Tabla de eventos
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL, -- 'social', 'peligro', 'narrativo'
    lugar TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    opciones TEXT NOT NULL, -- JSON: array de opciones con requisitos
    estado TEXT DEFAULT 'activo', -- activo, resuelto, cancelado
    participantes TEXT, -- JSON: array de player_ids
    resultados TEXT, -- JSON: resultados por jugador
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME
);

-- Tabla de mensajes de chat
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lugar TEXT NOT NULL,
    autor_id TEXT NOT NULL,
    autor_tipo TEXT NOT NULL, -- 'player' o 'npc'
    mensaje TEXT NOT NULL,
    tipo TEXT DEFAULT 'chat', -- 'chat', 'accion', 'sistema'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de items
CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    tipo TEXT NOT NULL, -- 'arma', 'armadura', 'consumible', 'material', 'quest'
    subtipo TEXT, -- 'espada', 'pistola', 'vendaje', etc
    rareza TEXT DEFAULT 'comun', -- comun, poco_comun, raro, epico, legendario
    stats TEXT, -- JSON: bonificaciones que da
    peso INTEGER DEFAULT 1,
    valor INTEGER DEFAULT 0,
    stackable INTEGER DEFAULT 0, -- 0=no, 1=si (apilable)
    max_stack INTEGER DEFAULT 1,
    efecto TEXT, -- JSON: efectos al usar/equipar
    propiedades TEXT -- JSON: propiedades adicionales (quest_item, cura, etc)
);

-- Tabla de inventario de jugadores
CREATE TABLE IF NOT EXISTS player_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    item_id TEXT NOT NULL,
    cantidad INTEGER DEFAULT 1,
    equipado INTEGER DEFAULT 0, -- 0=no, 1=si
    posicion_equipo TEXT, -- 'mano_derecha', 'mano_izquierda', 'cabeza', 'torso', 'piernas', 'pies', 'accesorio'
    durabilidad INTEGER, -- para items degradables
    FOREIGN KEY (player_id) REFERENCES players(id),
    FOREIGN KEY (item_id) REFERENCES items(id)
);

-- Tabla de enemigos (tipos)
CREATE TABLE IF NOT EXISTS enemy_types (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    nivel INTEGER DEFAULT 1,
    stats TEXT NOT NULL, -- JSON: {salud, fuerza, defensa, velocidad}
    loot TEXT, -- JSON: array de {item_id, probabilidad, cantidad_min, cantidad_max}
    oro_min INTEGER DEFAULT 0,
    oro_max INTEGER DEFAULT 10,
    experiencia INTEGER DEFAULT 10,
    comportamiento TEXT DEFAULT 'agresivo' -- agresivo, defensivo, huye
);

-- Tabla de enemigos activos en el mundo
CREATE TABLE IF NOT EXISTS active_enemies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enemy_type_id TEXT NOT NULL,
    lugar TEXT NOT NULL,
    salud_actual INTEGER NOT NULL,
    en_combate_con INTEGER, -- player_id o NULL
    spawned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enemy_type_id) REFERENCES enemy_types(id)
);

-- Tabla de estado extendido de NPCs (para simulación)
CREATE TABLE IF NOT EXISTS npc_state (
    npc_id TEXT PRIMARY KEY,
    necesidades TEXT NOT NULL, -- JSON: {hambre, sed, cansancio, seguridad, social} (0-100)
    actividad_actual TEXT DEFAULT 'idle', -- idle, buscar_comida, buscar_agua, descansar, patrullar, comerciar, explorar, etc
    objetivo_actual TEXT, -- JSON: {tipo, ubicacion, item_id, etc}
    ultima_decision INTEGER DEFAULT 0, -- timestamp
    FOREIGN KEY (npc_id) REFERENCES npcs(id)
);

-- Tabla de quests/misiones
CREATE TABLE IF NOT EXISTS quests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    tipo TEXT NOT NULL, -- 'npc', 'jugador', 'sistema'
    creador_id TEXT, -- npc_id o player_id
    creador_tipo TEXT, -- 'npc' o 'player'
    objetivos TEXT NOT NULL, -- JSON: [{tipo: 'matar', objetivo: 'zombie', cantidad: 5}, {tipo: 'recolectar', item: 'agua', cantidad: 3}]
    recompensas TEXT NOT NULL, -- JSON: {oro: 50, experiencia: 100, items: [{id, cantidad}]}
    requisitos TEXT, -- JSON: {nivel_min, reputacion_min, etc}
    repetible INTEGER DEFAULT 0,
    activa INTEGER DEFAULT 1,
    ubicacion TEXT, -- donde está disponible la quest
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de quests de jugadores
CREATE TABLE IF NOT EXISTS player_quests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    quest_id INTEGER NOT NULL,
    estado TEXT DEFAULT 'activa', -- activa, completada, fallida, abandonada
    progreso TEXT, -- JSON: progreso de cada objetivo
    aceptada_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completada_at DATETIME,
    FOREIGN KEY (player_id) REFERENCES players(id),
    FOREIGN KEY (quest_id) REFERENCES quests(id)
);

-- Tabla de FLAGS - El historial narrativo del jugador
CREATE TABLE IF NOT EXISTS player_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    flag_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id),
    UNIQUE(player_id, flag_name)
);

-- Tabla de relaciones entre jugadores y NPCs
CREATE TABLE IF NOT EXISTS player_npc_relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    npc_id TEXT NOT NULL,
    relacion INTEGER DEFAULT 0, -- Valor de -100 a +100
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id),
    UNIQUE(player_id, npc_id)
);

-- Tabla de diálogos de NPCs
CREATE TABLE IF NOT EXISTS npc_dialogues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    npc_id TEXT NOT NULL,
    dialogo_id TEXT NOT NULL, -- identificador único del nodo de diálogo
    texto TEXT NOT NULL,
    condiciones TEXT, -- JSON: condiciones para que aparezca este diálogo
    opciones TEXT NOT NULL, -- JSON: array de opciones de respuesta
    consecuencias TEXT, -- JSON: qué pasa al elegir cada opción
    quest_relacionada INTEGER, -- ID de quest si este diálogo la inicia
    FOREIGN KEY (npc_id) REFERENCES npcs(id),
    FOREIGN KEY (quest_relacionada) REFERENCES quests(id)
);

-- Tabla de tiendas (para comprar/vender)
CREATE TABLE IF NOT EXISTS shops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    npc_id TEXT NOT NULL,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL, -- 'general', 'armas', 'medico', 'negro'
    inventario TEXT NOT NULL, -- JSON: [{item_id, cantidad, precio_compra, precio_venta}]
    descuento_reputacion REAL DEFAULT 0, -- % descuento por reputación
    FOREIGN KEY (npc_id) REFERENCES npcs(id)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_players_lugar ON players(lugar_actual);
CREATE INDEX IF NOT EXISTS idx_players_combate ON players(en_combate);
CREATE INDEX IF NOT EXISTS idx_relationships_from ON relationships(from_id);
CREATE INDEX IF NOT EXISTS idx_relationships_to ON relationships(to_id);
CREATE INDEX IF NOT EXISTS idx_events_lugar ON events(lugar, estado);
CREATE INDEX IF NOT EXISTS idx_messages_lugar ON messages(lugar);
CREATE INDEX IF NOT EXISTS idx_npcs_lugar ON npcs(lugar_actual);
CREATE INDEX IF NOT EXISTS idx_inventory_player ON player_inventory(player_id);
CREATE INDEX IF NOT EXISTS idx_active_enemies_lugar ON active_enemies(lugar);
CREATE INDEX IF NOT EXISTS idx_player_quests_player ON player_quests(player_id);
CREATE INDEX IF NOT EXISTS idx_quests_ubicacion ON quests(ubicacion, activa);

-- Datos iniciales: Locaciones
INSERT OR IGNORE INTO locations (id, nombre, descripcion, conexiones, peligro_nivel, recursos) VALUES
('hospital', 'Hospital Abandonado', 'Un hospital en ruinas. Hay camillas volcadas, manchas oscuras en el suelo y un olor a humedad. Se escuchan gemidos lejanos.', '["mercado", "calle_sur", "morgue"]', 3, '{"medicinas": 5, "agua": 2}'),
('mercado', 'Mercado Central', 'Estantes vacíos, productos dispersos por el suelo. Algunas ventanas tapiadas. Hay un grupo de sobrevivientes aquí.', '["hospital", "refugio", "calle_norte", "plaza"]', 2, '{"comida": 8, "agua": 4}'),
('refugio', 'Refugio Comunitario', 'Un edificio fortificado donde la gente intenta organizarse. Hay fogatas, gente hablando en voz baja y una sensación de comunidad frágil.', '["mercado", "almacen"]', 1, '{"comida": 3, "agua": 3, "armas": 2}'),
('calle_norte', 'Calle Norte', 'Una calle desolada con autos abandonados y edificios saqueados. Peligroso pero potencialmente lleno de recursos.', '["mercado", "estacion_policia", "torre"]', 4, '{"comida": 2, "armas": 3}'),
('calle_sur', 'Calle Sur', 'Zona residencial destruida. Casas quemadas, escombros. Se oyen sonidos extraños.', '["hospital", "parque", "cementerio"]', 5, '{"agua": 1, "medicinas": 2}'),
('morgue', 'Morgue del Hospital', 'La morgue abandonada. Fría, oscura y llena de cajones oxidados. Hay un olor putrefacto insoportable.', '["hospital"]', 6, '{"medicinas": 3}'),
('plaza', 'Plaza Central', 'Una plaza antes hermosa, ahora llena de escombros y autos volcados. Un helicóptero estrellado ocupa el centro.', '["mercado", "banco", "biblioteca"]', 3, '{"comida": 4, "armas": 2}'),
('almacen', 'Almacén Industrial', 'Enorme almacén con cajas apiladas. Oscuro y laberíntico. Perfecto para emboscadas.', '["refugio", "fabrica"]', 4, '{"comida": 10, "agua": 5, "armas": 4}'),
('estacion_policia', 'Estación de Policía', 'Comisaría saqueada pero aún con arsenales sellados. Hay cadáveres de policías en el suelo.', '["calle_norte", "carcel"]', 5, '{"armas": 10, "municion": 8}'),
('torre', 'Torre de Comunicaciones', 'Alta torre con vista panorámica de la ciudad. Ideal para vigilancia pero difícil de defender.', '["calle_norte"]', 3, '{"agua": 1}'),
('parque', 'Parque Municipal', 'Naturaleza reclamando la ciudad. Árboles crecidos, pasto alto. Algunos animales salvajes rondan.', '["calle_sur", "lago"]', 2, '{"agua": 3, "comida": 2}'),
('cementerio', 'Cementerio Viejo', 'Tumbas abiertas desde adentro. Niebla perpetua. El lugar más peligroso de todos.', '["calle_sur"]', 8, '{"medicinas": 1}'),
('banco', 'Banco Central', 'Bóveda abierta y saqueada. Algunos billetes inútiles volando. Hay un grupo de saqueadores dentro.', '["plaza", "joyeria"]', 6, '{"oro": 50}'),
('biblioteca', 'Biblioteca Pública', 'Conocimiento preservado en un mundo caótico. Libros esparcidos, lugar silencioso y relativamente seguro.', '["plaza"]', 1, '{"agua": 2}'),
('fabrica', 'Fábrica Abandonada', 'Maquinaria oxidada, pasarelas metálicas. Llena de chatarra útil pero muy peligrosa.', '["almacen", "puerto"]', 5, '{"chatarra": 20, "armas": 3}'),
('carcel', 'Prisión Estatal', 'Celdas abiertas, prisioneros convertidos. Un laberinto mortal.', '["estacion_policia"]', 7, '{"armas": 5}'),
('lago', 'Lago Contaminado', 'Agua turbia y contaminada. Algunos pescados mutados. Zona tranquila pero tóxica.', '["parque", "muelle"]', 3, '{"agua": 10}'),
('joyeria', 'Joyería Saqueada', 'Vitrinas rotas, algunas joyas todavía brillan entre los escombros. Saqueadores frecuentan el área.', '["banco"]', 4, '{"oro": 30}'),
('puerto', 'Puerto Industrial', 'Barcos oxidados, contenedores apilados. Acceso al río. Ideal para escape pero lleno de peligros.', '["fabrica"]', 6, '{"comida": 6, "armas": 4}'),
('muelle', 'Muelle Pesquero', 'Botes pequeños, redes rotas. Huele a pescado podrido. Algunos sobrevivientes intentan pescar.', '["lago"]', 2, '{"comida": 5, "agua": 3}'),
('tunel', 'Túneles del Metro', 'Sistema de metro inundado parcialmente. Oscuro, claustrofóbico. Ecos perturbadores.', '["hospital", "plaza"]', 7, '{"agua": 2}'),
('aeropuerto', 'Aeropuerto Abandonado', 'Aviones estrellados, terminales vacías. Enorme y peligroso pero lleno de recursos.', '["calle_norte"]', 8, '{"comida": 15, "agua": 10, "armas": 8}');

-- Datos iniciales: NPCs
INSERT OR IGNORE INTO npcs (id, nombre, lugar_actual, personalidad, rol_social, estado_emocional, memoria) VALUES
-- 🏥 HOSPITAL ACT 1 - NPCs principales
('npc_ana', 'Ana', 'hospital', '{"compasiva": 8, "lider": 6, "desconfiada": 4}', 'Líder del hospital', '{"esperanza": 6, "miedo": 3, "determinacion": 7}', '[]'),
('npc_marco', 'Marco', 'hospital', '{"agresivo": 7, "leal": 5, "impulsivo": 8}', 'Guardia', '{"miedo": 5, "ira": 6, "lealtad": 4}', '[]'),
('npc_carlos', 'Carlos', 'hospital', '{"tactico": 8, "frio": 6, "calculador": 7}', 'Explorador herido', '{"determinacion": 8, "estres": 5}', '[]'),
('npc_sofia', 'Sofía', 'mercado', '{"comerciante": 9, "astuta": 8, "codiciosa": 6}', 'Vendedora', '{"esperanza": 5, "avaricia": 7}', '[]'),
-- Zona peligrosa
('npc_diego', 'Diego', 'calle_norte', '{"paranoico": 9, "superviviente": 8, "violento": 7}', 'Explorador solitario', '{"miedo": 8, "desesperacion": 6}', '[]'),
('npc_elena', 'Elena', 'plaza', '{"valiente": 8, "noble": 7, "protectora": 9}', 'Defensora', '{"esperanza": 7, "determinacion": 8}', '[]'),
('npc_roberto', 'Roberto', 'estacion_policia', '{"autoritario": 8, "corrupto": 5, "pragmatico": 7}', 'Ex-policía', '{"ira": 6, "control": 7}', '[]'),
-- Comerciantes
('npc_viktor', 'Viktor', 'almacen', '{"misterioso": 8, "comerciante": 9, "peligroso": 6}', 'Mercader de armas', '{"frio": 8, "calculador": 9}', '[]'),
('npc_teresa', 'Teresa', 'hospital', '{"desesperada": 9, "protectora": 8, "determinada": 7}', 'Madre desesperada', '{"miedo": 9, "desesperacion": 8, "amor_maternal": 10}', '[]'),
('npc_ramon', 'Ramón', 'muelle', '{"pescador": 8, "tranquilo": 7, "viejo": 9}', 'Pescador veterano', '{"nostalgia": 7, "resignacion": 6}', '[]'),
-- NPCs secundarios
('npc_lucia', 'Lucía', 'refugio', '{"asustada": 9, "empática": 7, "frágil": 6}', 'Enfermera', '{"miedo": 9, "esperanza": 2, "confusion": 7}', '[]'),
('npc_sofia', 'Sofía', 'mercado', '{"comerciante": 9, "astuta": 8, "codiciosa": 6}', 'Vendedora', '{"esperanza": 5, "avaricia": 7}', '[]'),
('npc_nina', 'Nina', 'refugio', '{"inocente": 9, "asustada": 8, "resiliente": 6}', 'Huérfana', '{"miedo": 9, "esperanza": 4}', '[]'),
('npc_dr_gomez', 'Dr. Gómez', 'hospital', '{"medico": 9, "corrupto": 7, "reservado": 8}', 'Médico corrupto', '{"codicia": 6, "cautela": 8}', '[]'),
('npc_isabella', 'Isabella', 'torre', '{"vigilante": 9, "observadora": 8, "callada": 7}', 'Francotiradora', '{"fria": 8, "alerta": 9}', '[]'),
('npc_padre_miguel', 'Padre Miguel', 'biblioteca', '{"religioso": 9, "compasivo": 8, "esperanzado": 7}', 'Sacerdote', '{"fe": 9, "empatia": 8}', '[]'),
-- Antagonistas y dudosos
('npc_snake', 'Snake', 'banco', '{"bandido": 9, "carismatico": 7, "peligroso": 8}', 'Líder de saqueadores', '{"ambicion": 9, "crueldad": 7}', '[]'),
('npc_maria', 'María', 'joyeria', '{"ladron": 8, "seductora": 7, "astuta": 9}', 'Ladrona de joyas', '{"codicia": 8, "astucia": 9}', '[]'),
('npc_brutus', 'Brutus', 'carcel', '{"brutal": 9, "lider": 7, "despiadado": 8}', 'Prisionero liberado', '{"ira": 9, "sed_poder": 8}', '[]'),
-- Supervivientes únicos
('npc_akira', 'Akira', 'fabrica', '{"ingeniero": 9, "genio": 8, "loco": 6}', 'Inventor loco', '{"obsesion": 9, "genialidad": 8}', '[]'),
('npc_luna', 'Luna', 'parque', '{"naturalista": 8, "salvaje": 7, "libre": 9}', 'Viviendo en la naturaleza', '{"paz": 7, "libertad": 9}', '[]'),
('npc_oscar', 'Óscar', 'puerto', '{"marinero": 8, "rudo": 7, "leal": 6}', 'Capitán de barco', '{"nostalgia": 6, "determinacion": 7}', '[]');

-- Datos iniciales: Items
INSERT OR IGNORE INTO items (id, nombre, descripcion, tipo, subtipo, rareza, stats, peso, valor, stackable, max_stack, efecto, propiedades) VALUES
-- ARMAS CUERPO A CUERPO
('item_tubo', 'Tubo de metal', 'Un tubo oxidado pero sólido. Bueno para defensa básica.', 'arma', 'contundente', 'comun', '{"bonus_fuerza": 2}', 3, 10, 0, 1, NULL, NULL),
('item_cuchillo', 'Cuchillo de cocina', 'Afilado y manejable. Útil en combate cuerpo a cuerpo.', 'arma', 'corte', 'comun', '{"bonus_fuerza": 3}', 1, 15, 0, 1, NULL, NULL),
('item_bate', 'Bate de béisbol', 'Bate de aluminio. Golpea fuerte.', 'arma', 'contundente', 'poco_comun', '{"bonus_fuerza": 5}', 4, 30, 0, 1, NULL, NULL),
('item_machete', 'Machete', 'Hoja larga y afilada. Excelente para combate.', 'arma', 'corte', 'poco_comun', '{"bonus_fuerza": 6, "bonus_velocidad": 1}', 2, 45, 0, 1, NULL, NULL),
('item_hacha', 'Hacha de bombero', 'Hacha pesada y letal. Gran daño.', 'arma', 'corte', 'raro', '{"bonus_fuerza": 8}', 5, 60, 0, 1, NULL, NULL),
('item_katana', 'Katana', 'Espada japonesa perfectamente balanceada. Rápida y mortal.', 'arma', 'corte', 'epico', '{"bonus_fuerza": 10, "bonus_velocidad": 3}', 3, 150, 0, 1, NULL, NULL),
('item_sierra', 'Motosierra', 'Motosierra ruidosa pero devastadora. Requiere gasolina.', 'arma', 'especial', 'raro', '{"bonus_fuerza": 12}', 8, 100, 0, 1, '{"requiere": "item_gasolina"}', NULL),
-- ARMAS DE FUEGO
('item_pistola', 'Pistola 9mm', 'Arma de fuego básica. Requiere munición.', 'arma', 'fuego', 'raro', '{"bonus_fuerza": 15}', 2, 100, 0, 1, '{"requiere": "item_municion_9mm"}', NULL),
('item_escopeta', 'Escopeta', 'Gran daño a corta distancia. Lenta pero letal.', 'arma', 'fuego', 'raro', '{"bonus_fuerza": 20}', 5, 150, 0, 1, '{"requiere": "item_cartuchos"}', NULL),
('item_rifle', 'Rifle de asalto', 'Arma militar. Alto daño y cadencia.', 'arma', 'fuego', 'epico', '{"bonus_fuerza": 25, "bonus_velocidad": 2}', 4, 250, 0, 1, '{"requiere": "item_municion_rifle"}', NULL),
('item_francotirador', 'Rifle francotirador', 'Precisión extrema. Un disparo, una baja.', 'arma', 'fuego', 'legendario', '{"bonus_fuerza": 35, "bonus_percepcion": 5}', 6, 400, 0, 1, '{"requiere": "item_municion_rifle"}', NULL),
-- ARMADURAS
('item_chaleco', 'Chaleco improvisado', 'Tela gruesa y cartón. Algo de protección.', 'armadura', 'torso', 'comun', '{"bonus_defensa": 3}', 5, 20, 0, 1, NULL, NULL),
('item_casco', 'Casco de motociclista', 'Protege la cabeza de golpes.', 'armadura', 'cabeza', 'poco_comun', '{"bonus_defensa": 5}', 2, 35, 0, 1, NULL, NULL),
('item_botas', 'Botas militares', 'Botas reforzadas. Buena movilidad.', 'armadura', 'pies', 'poco_comun', '{"bonus_defensa": 2, "bonus_velocidad": 1}', 3, 30, 0, 1, NULL, NULL),
('item_guantes', 'Guantes tácticos', 'Protegen las manos sin perder destreza.', 'armadura', 'manos', 'comun', '{"bonus_defensa": 1, "bonus_fuerza": 1}', 1, 15, 0, 1, NULL, NULL),
('item_chaleco_antibalas', 'Chaleco antibalas', 'Protección seria contra armas de fuego.', 'armadura', 'torso', 'raro', '{"bonus_defensa": 15}', 8, 120, 0, 1, NULL, NULL),
('item_armadura_completa', 'Armadura táctica completa', 'Set completo de protección militar.', 'armadura', 'torso', 'epico', '{"bonus_defensa": 25, "bonus_resistencia": 3}', 15, 300, 0, 1, NULL, NULL),
-- CONSUMIBLES CURACIÓN
('item_vendaje', 'Vendaje', 'Cura heridas leves. +20 salud.', 'consumible', 'curacion', 'comun', NULL, 1, 10, 1, 5, '{"efecto_salud": 20}', NULL),
('item_botiquin', 'Botiquín médico', 'Kit completo de primeros auxilios. +50 salud.', 'consumible', 'curacion', 'poco_comun', NULL, 2, 40, 1, 3, '{"efecto_salud": 50}', NULL),
('item_antibioticos', 'Antibióticos', 'Medicina del Dr. Gómez. Item de quest.', 'consumible', 'medicina', 'poco_comun', NULL, 1, 75, 1, 5, '{"efecto_salud": 40}', '{"quest_item": true, "cura": 40}'),
('item_morfina', 'Morfina', 'Analgésico potente. +80 salud, -20 estrés.', 'consumible', 'curacion', 'raro', NULL, 1, 60, 1, 2, '{"efecto_salud": 80, "efecto_estres": -20}', NULL),
('item_adrenalina', 'Inyección de adrenalina', '+50 energía, +5 velocidad temporal.', 'consumible', 'buff', 'raro', NULL, 1, 50, 1, 3, '{"efecto_energia": 50, "buff_velocidad": 5, "duracion": 60}', NULL),
-- CONSUMIBLES ALIMENTOS
('item_agua', 'Botella de agua', 'Hidratación esencial. -10 estrés.', 'consumible', 'bebida', 'comun', NULL, 1, 5, 1, 10, '{"efecto_estres": -10}', NULL),
('item_comida', 'Comida enlatada', 'Comida preservada. +10 energía.', 'consumible', 'comida', 'comun', NULL, 1, 8, 1, 10, '{"efecto_energia": 10}', NULL),
('item_racion_militar', 'Ración militar', 'Comida de alta calidad. +30 energía.', 'consumible', 'comida', 'poco_comun', NULL, 2, 20, 1, 5, '{"efecto_energia": 30}', NULL),
('item_chocolate', 'Barra de chocolate', 'Energía rápida. +15 energía, -5 estrés.', 'consumible', 'comida', 'comun', NULL, 1, 10, 1, 5, '{"efecto_energia": 15, "efecto_estres": -5}', NULL),
('item_vitaminas', 'Multivitaminas', 'Suplemento nutricional. +5 resistencia temporal.', 'consumible', 'buff', 'poco_comun', NULL, 1, 25, 1, 3, '{"buff_resistencia": 5, "duracion": 300}', NULL),
-- MATERIALES Y RECURSOS
('item_municion_9mm', 'Munición 9mm', 'Balas para pistola.', 'material', 'municion', 'poco_comun', NULL, 1, 5, 1, 50, NULL, NULL),
('item_cartuchos', 'Cartuchos de escopeta', 'Munición para escopeta.', 'material', 'municion', 'poco_comun', NULL, 1, 8, 1, 30, NULL, NULL),
('item_municion_rifle', 'Munición 5.56', 'Balas para rifle.', 'material', 'municion', 'raro', NULL, 1, 10, 1, 50, NULL, NULL),
('item_chatarra', 'Chatarra', 'Metal oxidado. Útil para crafteo.', 'material', 'recurso', 'comun', NULL, 2, 2, 1, 20, NULL, NULL),
('item_tela', 'Tela', 'Retazos de ropa. Para crafteo.', 'material', 'recurso', 'comun', NULL, 1, 3, 1, 20, NULL, NULL),
('item_cuero', 'Cuero', 'Material resistente para armaduras.', 'material', 'recurso', 'poco_comun', NULL, 2, 8, 1, 10, NULL, NULL),
('item_electronica', 'Componentes electrónicos', 'Chips y cables. Para crafteo avanzado.', 'material', 'recurso', 'raro', NULL, 1, 15, 1, 10, NULL, NULL),
('item_gasolina', 'Bidón de gasolina', 'Combustible. Para vehículos y herramientas.', 'material', 'combustible', 'poco_comun', NULL, 5, 20, 1, 5, NULL, NULL),
('item_polvora', 'Pólvora', 'Explosivo básico. Peligroso pero útil.', 'material', 'explosivo', 'raro', NULL, 2, 30, 1, 10, NULL, NULL),
-- HERRAMIENTAS
('item_linterna', 'Linterna', 'Ilumina zonas oscuras. +2 percepción.', 'herramienta', 'utilidad', 'comun', '{"bonus_percepcion": 2}', 2, 15, 0, 1, NULL, NULL),
('item_binoculares', 'Binoculares', 'Para exploración. +5 percepción.', 'herramienta', 'utilidad', 'poco_comun', '{"bonus_percepcion": 5}', 2, 40, 0, 1, NULL, NULL),
('item_cuerda', 'Cuerda resistente', 'Útil para escalar y trapas.', 'herramienta', 'utilidad', 'comun', NULL, 3, 10, 1, 3, NULL, NULL),
('item_llave_inglesa', 'Llave inglesa', 'Herramienta y arma improvisada.', 'herramienta', 'utilidad', 'comun', '{"bonus_fuerza": 1}', 2, 8, 0, 1, NULL, NULL),
('item_kit_cerrajeria', 'Kit de ganzúas', 'Para abrir puertas y cajas cerradas.', 'herramienta', 'utilidad', 'raro', NULL, 1, 50, 0, 1, NULL, NULL),
-- ACCESORIOS
('item_mochila', 'Mochila grande', 'Aumenta capacidad de carga. +20kg peso máximo.', 'accesorio', 'equipamiento', 'poco_comun', '{"peso_max": 20}', 3, 50, 0, 1, NULL, NULL),
('item_radio', 'Radio portátil', 'Comunicación a distancia con otros jugadores.', 'accesorio', 'equipamiento', 'raro', '{"bonus_carisma": 2}', 2, 70, 0, 1, NULL, NULL),
('item_mascara_gas', 'Máscara de gas', 'Protección contra toxinas. +10 resistencia.', 'accesorio', 'equipamiento', 'raro', '{"bonus_resistencia": 10}', 3, 90, 0, 1, NULL, NULL),
('item_reloj', 'Reloj de pulsera', 'Marca el tiempo. +1 percepción.', 'accesorio', 'equipamiento', 'comun', '{"bonus_percepcion": 1}', 0, 10, 0, 1, NULL, NULL);

-- Datos iniciales: Tipos de enemigos
INSERT OR IGNORE INTO enemy_types (id, nombre, descripcion, nivel, stats, loot, oro_min, oro_max, experiencia, comportamiento) VALUES
('enemy_zombie_debil', 'Zombie Débil', 'Un zombie lento y descompuesto. Fácil de eliminar.', 1, '{"salud": 30, "fuerza": 5, "defensa": 1, "velocidad": 2}', '[{"item_id": "item_chatarra", "probabilidad": 0.3, "cantidad_min": 1, "cantidad_max": 2}]', 0, 5, 15, 'agresivo'),
('enemy_zombie', 'Zombie', 'Muerto viviente hambriento. Peligroso en grupo.', 2, '{"salud": 50, "fuerza": 8, "defensa": 2, "velocidad": 3}', '[{"item_id": "item_chatarra", "probabilidad": 0.4, "cantidad_min": 1, "cantidad_max": 3}, {"item_id": "item_vendaje", "probabilidad": 0.1, "cantidad_min": 1, "cantidad_max": 1}]', 2, 10, 25, 'agresivo'),
('enemy_zombie_fuerte', 'Zombie Mutado', 'Zombie más grande y fuerte. Muy peligroso.', 4, '{"salud": 100, "fuerza": 15, "defensa": 5, "velocidad": 4}', '[{"item_id": "item_chatarra", "probabilidad": 0.6, "cantidad_min": 2, "cantidad_max": 5}, {"item_id": "item_botiquin", "probabilidad": 0.15, "cantidad_min": 1, "cantidad_max": 1}]', 10, 25, 50, 'agresivo'),
('enemy_saqueador', 'Saqueador', 'Humano desesperado. Ataca por recursos.', 3, '{"salud": 60, "fuerza": 12, "defensa": 8, "velocidad": 6}', '[{"item_id": "item_municion_9mm", "probabilidad": 0.3, "cantidad_min": 2, "cantidad_max": 5}, {"item_id": "item_comida", "probabilidad": 0.4, "cantidad_min": 1, "cantidad_max": 2}, {"item_id": "item_cuchillo", "probabilidad": 0.2, "cantidad_min": 1, "cantidad_max": 1}]', 5, 20, 40, 'agresivo'),
('enemy_perro_salvaje', 'Perro Salvaje', 'Perro feroz en busca de comida. Rápido y agresivo.', 2, '{"salud": 40, "fuerza": 10, "defensa": 3, "velocidad": 8}', '[{"item_id": "item_tela", "probabilidad": 0.2, "cantidad_min": 1, "cantidad_max": 2}]', 0, 5, 20, 'agresivo');

-- Datos iniciales: Quests de NPCs
INSERT OR IGNORE INTO quests (id, titulo, descripcion, tipo, creador_id, creador_tipo, objetivos, recompensas, requisitos, repetible, activa, ubicacion) VALUES
-- Misiones iniciales (Nivel 1-2)
(1, 'Suministros médicos urgentes', 'Ana necesita medicinas para los heridos del refugio. Busca botiquines en el hospital.', 'npc', 'npc_ana', 'npc', '[{"tipo": "recolectar", "item": "item_botiquin", "cantidad": 3}]', '{"oro": 50, "experiencia": 100, "items": [{"id": "item_comida", "cantidad": 5}]}', '{"nivel_min": 1}', 0, 1, 'refugio'),
(2, 'Limpiar el mercado', 'Marco necesita ayuda para eliminar zombies del mercado. Mata 5 zombies.', 'npc', 'npc_marco', 'npc', '[{"tipo": "matar", "objetivo": "enemy_zombie", "cantidad": 5}]', '{"oro": 75, "experiencia": 150, "items": [{"id": "item_bate", "cantidad": 1}]}', '{"nivel_min": 2}', 1, 1, 'mercado'),
(3, 'Encuentra a mi hermano', 'Lucía busca a su hermano desaparecido. Explora la calle norte.', 'npc', 'npc_lucia', 'npc', '[{"tipo": "explorar", "ubicacion": "calle_norte", "cantidad": 1}]', '{"oro": 30, "experiencia": 80, "items": [{"id": "item_vendaje", "cantidad": 3}]}', '{"nivel_min": 1}', 0, 1, 'hospital'),
-- Misiones de exploración
(4, 'Reconocimiento del banco', 'Carlos necesita información sobre el estado del banco. Ve y explora la zona.', 'npc', 'npc_carlos', 'npc', '[{"tipo": "explorar", "ubicacion": "banco", "cantidad": 1}]', '{"oro": 100, "experiencia": 120}', '{"nivel_min": 3}', 0, 1, 'refugio'),
(5, 'Secretos de la biblioteca', 'Teresa cree que hay información valiosa en la biblioteca. Explórala completamente.', 'npc', 'npc_teresa', 'npc', '[{"tipo": "explorar", "ubicacion": "biblioteca", "cantidad": 1}]', '{"oro": 80, "experiencia": 150, "items": [{"id": "item_linterna", "cantidad": 1}]}', '{"nivel_min": 2}', 0, 1, 'biblioteca'),
-- Misiones de combate (Nivel 3-5)
(6, 'Plaga de perros salvajes', 'Diego necesita ayuda. Hay perros salvajes atacando sobrevivientes. Mata 8 perros.', 'npc', 'npc_diego', 'npc', '[{"tipo": "matar", "objetivo": "enemy_perro_salvaje", "cantidad": 8}]', '{"oro": 120, "experiencia": 200, "items": [{"id": "item_machete", "cantidad": 1}]}', '{"nivel_min": 3}', 1, 1, 'calle_norte'),
(7, 'Limpiar la estación de policía', 'Roberto quiere recuperar el arsenal de la estación. Elimina todos los zombies mutados.', 'npc', 'npc_roberto', 'npc', '[{"tipo": "matar", "objetivo": "enemy_zombie_fuerte", "cantidad": 3}]', '{"oro": 200, "experiencia": 300, "items": [{"id": "item_pistola", "cantidad": 1}, {"id": "item_municion_9mm", "cantidad": 20}]}', '{"nivel_min": 4}', 0, 1, 'estacion_policia'),
(8, 'Enfrentar a los saqueadores', 'Elena necesita que detengas a los saqueadores que atacan a civiles. Mata 10 saqueadores.', 'npc', 'npc_elena', 'npc', '[{"tipo": "matar", "objetivo": "enemy_saqueador", "cantidad": 10}]', '{"oro": 250, "experiencia": 400, "items": [{"id": "item_chaleco_antibalas", "cantidad": 1}]}', '{"nivel_min": 5}', 1, 1, 'plaza'),
-- Misiones de recolección
(9, 'Chatarra para el inventor', 'Akira necesita chatarra para sus inventos. Consigue 20 unidades de chatarra.', 'npc', 'npc_akira', 'npc', '[{"tipo": "recolectar", "item": "item_chatarra", "cantidad": 20}]', '{"oro": 150, "experiencia": 180}', '{"nivel_min": 2}', 1, 1, 'fabrica'),
(10, 'Comida para el refugio', 'Ana necesita más comida. Trae 15 comidas enlatadas al refugio.', 'npc', 'npc_ana', 'npc', '[{"tipo": "recolectar", "item": "item_comida", "cantidad": 15}]', '{"oro": 100, "experiencia": 150, "items": [{"id": "item_mochila", "cantidad": 1}]}', '{"nivel_min": 2}', 1, 1, 'refugio'),
(11, 'Munición para los guardias', 'Marco necesita munición para defender el mercado. Consigue 50 balas 9mm.', 'npc', 'npc_marco', 'npc', '[{"tipo": "recolectar", "item": "item_municion_9mm", "cantidad": 50}]', '{"oro": 200, "experiencia": 220}', '{"nivel_min": 3}', 1, 1, 'mercado'),
-- Misiones peligrosas (Nivel 6+)
(12, 'Infiltrar la prisión', 'Carlos planea un ataque a la prisión. Explora primero y reporta.', 'npc', 'npc_carlos', 'npc', '[{"tipo": "explorar", "ubicacion": "carcel", "cantidad": 1}]', '{"oro": 300, "experiencia": 500}', '{"nivel_min": 6}', 0, 1, 'refugio'),
(13, 'Asaltar el aeropuerto', 'El aeropuerto tiene recursos invaluables pero está infestado. Explóralo.', 'npc', 'npc_carlos', 'npc', '[{"tipo": "explorar", "ubicacion": "aeropuerto", "cantidad": 1}]', '{"oro": 400, "experiencia": 600, "items": [{"id": "item_rifle", "cantidad": 1}]}', '{"nivel_min": 7}', 0, 1, 'refugio'),
(14, 'Limpiar el cementerio', 'El lugar más peligroso. Nadie ha sobrevivido. Prueba tu valía eliminando 5 zombies mutados allí.', 'npc', 'npc_isabella', 'npc', '[{"tipo": "matar", "objetivo": "enemy_zombie_fuerte", "cantidad": 5}]', '{"oro": 500, "experiencia": 800, "items": [{"id": "item_katana", "cantidad": 1}]}', '{"nivel_min": 8}', 0, 1, 'torre'),
-- Misiones de comercio
(15, 'Negocio con Viktor', 'Viktor te ofrece un trato. Trae componentes electrónicos y te venderá armas.', 'npc', 'npc_viktor', 'npc', '[{"tipo": "recolectar", "item": "item_electronica", "cantidad": 10}]', '{"oro": 300, "experiencia": 250, "items": [{"id": "item_escopeta", "cantidad": 1}]}', '{"nivel_min": 4}', 0, 1, 'almacen'),
-- Misiones especiales
(16, 'Proteger a Nina', 'Nina es una niña sola. Marco dice que deberías llevarla al refugio desde el mercado.', 'npc', 'npc_marco', 'npc', '[{"tipo": "explorar", "ubicacion": "refugio", "cantidad": 1}]', '{"oro": 50, "experiencia": 200}', '{"nivel_min": 1}', 0, 1, 'mercado'),
(17, 'El plan del Padre Miguel', 'El padre tiene un plan para reunir a los sobrevivientes. Necesita tu ayuda explorando ubicaciones clave.', 'npc', 'npc_padre_miguel', 'npc', '[{"tipo": "explorar", "ubicacion": "plaza", "cantidad": 1}, {"tipo": "explorar", "ubicacion": "mercado", "cantidad": 1}]', '{"oro": 150, "experiencia": 300}', '{"nivel_min": 3}', 0, 1, 'biblioteca'),

-- 🏥 HOSPITAL ACT 1 - MISIONES NARRATIVAS
(100, 'Bienvenido al Hospital', 'Habla con Ana, la líder del hospital, para entender la situación.', 'narrativa', 'sistema', 'sistema', '[{"tipo": "dialogo", "npc": "npc_ana", "dialogo_id": "npc_ana_saludo", "cantidad": 1}]', '{"oro": 20, "experiencia": 50}', '{"nivel_min": 1}', 0, 1, 'hospital'),

(101, 'Conoce a los Supervivientes', 'Habla con todos los NPCs del hospital (Ana, Dr. Gómez, Marco, Teresa, Carlos).', 'narrativa', 'sistema', 'sistema', '[{"tipo": "dialogo_multiple", "npcs": ["npc_ana", "npc_dr_gomez", "npc_marco", "npc_teresa", "npc_carlos"], "cantidad": 5}]', '{"oro": 50, "experiencia": 100}', '{"nivel_min": 1}', 0, 1, 'hospital'),

(102, 'La Decisión de Vida o Muerte', 'Ana te pide ayuda para decidir entre salvar al hijo de Teresa o a Carlos. Toma una decisión.', 'narrativa', 'npc_ana', 'npc', '[{"tipo": "dialogo", "npc": "npc_ana", "dialogo_ids": ["npc_ana_salvar_teresa", "npc_ana_salvar_carlos"], "cantidad": 1}]', '{"oro": 100, "experiencia": 200}', '{"nivel_min": 1}', 0, 1, 'hospital'),

(103, 'El Secreto del Doctor', 'El Dr. Gómez esconde medicinas. Consigue medicina extra de él por cualquier medio.', 'narrativa', 'npc_dr_gomez', 'npc', '[{"tipo": "dialogo", "npc": "npc_dr_gomez", "dialogo_ids": ["npc_dr_gomez_oro", "npc_dr_gomez_intimidar", "npc_dr_gomez_favor"], "cantidad": 1}]', '{"oro": 75, "experiencia": 150}', '{"nivel_min": 1}', 0, 1, 'hospital'),

(104, 'La Culpa de Marco', 'Marco carga con la culpa de haber matado a un niño. Ayúdalo a lidiar con su trauma.', 'narrativa', 'npc_marco', 'npc', '[{"tipo": "dialogo", "npc": "npc_marco", "dialogo_ids": ["npc_marco_validacion", "npc_marco_empatia"], "cantidad": 1}]', '{"oro": 50, "experiencia": 120}', '{"nivel_min": 1}', 0, 1, 'hospital'),

(105, 'Primer Día en el Apocalipsis', 'Explora el Hospital Abandonado y familiarízate con la zona.', 'narrativa', 'sistema', 'sistema', '[{"tipo": "explorar", "ubicacion": "hospital", "cantidad": 1}]', '{"oro": 30, "experiencia": 80}', '{"nivel_min": 1}', 0, 1, 'hospital');

-- ==========================================
-- 🏥 HOSPITAL - ACTO 1: DIÁLOGOS QUE IMPORTAN
-- ==========================================
-- Sistema de consecuencias: Cada decisión cambia el mundo
-- Los NPCs recuerdan y el juego reacciona

-- ==================================================
-- ANA - Líder del Hospital (Conflicto: Liderazgo)
-- ==================================================
INSERT OR IGNORE INTO npc_dialogues (npc_id, dialogo_id, texto, condiciones, opciones, consecuencias, quest_relacionada) VALUES
('npc_ana', 'npc_ana_saludo', 'Bienvenido. Soy Ana, dirijo este lugar. Las cosas están... complicadas. Tenemos dos pacientes críticos y solo medicina para uno. Necesito que me ayudes a decidir.', NULL, '[
  {"texto": "¿Quiénes son los pacientes?", "siguiente": "npc_ana_pacientes"},
  {"texto": "Yo decido quién vive", "siguiente": "npc_ana_autoritario"},
  {"texto": "¿Y si conseguimos más medicina?", "siguiente": "npc_ana_medicina"},
  {"texto": "No es mi problema", "siguiente": "npc_ana_rechazo"}
]', NULL, NULL),

('npc_ana', 'npc_ana_pacientes', 'Teresa, una madre desesperada. Su hijo necesita antibióticos urgentes. Y Carlos, un explorador herido que dice conocer la ubicación de un gran alijo de suministros. Solo puedo salvar a uno.', NULL, '[
  {"texto": "Salva al niño de Teresa", "siguiente": "npc_ana_salvar_teresa"},
  {"texto": "Salva a Carlos por la información", "siguiente": "npc_ana_salvar_carlos"},
  {"texto": "Déjame buscar más medicina", "siguiente": "npc_ana_medicina"}
]', NULL, NULL),

('npc_ana', 'npc_ana_autoritario', '*Frunce el ceño* Entiendo que quieras ayudar, pero esto no es una dictadura. Si quieres participar, hazlo con respeto.', NULL, '[
  {"texto": "Perdón, tienes razón", "siguiente": "npc_ana_saludo"},
  {"texto": "Alguien tiene que tomar el control", "siguiente": null}
]', '{"ana_estado": "desconfiada", "reputacion": -5}', NULL),

('npc_ana', 'npc_ana_medicina', 'El Dr. Gómez es quien controla los suministros... pero es reservado. Si pudieras convencerlo de compartir lo que tiene escondido, salvaríamos a ambos.', NULL, '[
  {"texto": "Hablaré con él", "siguiente": null},
  {"texto": "Prefiero no meterme", "siguiente": "npc_ana_pacientes"}
]', '{"quest": "buscar_dr_gomez"}', NULL),

('npc_ana', 'npc_ana_rechazo', '*Te mira con decepción* Entiendo. No todos tienen el estómago para estas decisiones. Pero aquí todos debemos cargar con algo.', NULL, '[
  {"texto": "Está bien, ayudaré", "siguiente": "npc_ana_saludo"},
  {"texto": "Adiós", "siguiente": null}
]', '{"ana_estado": "decepcionada"}', NULL),

('npc_ana', 'npc_ana_salvar_teresa', 'De acuerdo. Salvaremos al niño. Carlos... lo siento. *Pausa* Espero que esto sea lo correcto.', NULL, '[
  {"texto": "Lo es", "siguiente": null}
]', '{"teresa_estado": "agradecida", "carlos_estado": "moribundo", "ana_relacion": 10}', NULL),

('npc_ana', 'npc_ana_salvar_carlos', 'Entiendo tu lógica. La información puede salvar más vidas después. Pero... Teresa no lo tomará bien.', NULL, '[
  {"texto": "Es la decisión correcta", "siguiente": null}
]', '{"carlos_estado": "vivo_agradecido", "teresa_estado": "traicionada", "ana_relacion": 5}', NULL);

-- ==================================================
-- DR. GÓMEZ - Médico Corrupto (Conflicto: Corrupción)
-- ==================================================
INSERT OR IGNORE INTO npc_dialogues (npc_id, dialogo_id, texto, condiciones, opciones, consecuencias, quest_relacionada) VALUES
('npc_dr_gomez', 'npc_dr_gomez_saludo', '*Te observa con desconfianza* Ah, tú... el nuevo. ¿Qué quieres?', NULL, '[
  {"texto": "Necesito medicina extra", "siguiente": "npc_dr_gomez_propuesta"},
  {"texto": "Solo quería conocerte", "siguiente": "npc_dr_gomez_desconfianza"},
  {"texto": "Nada, perdón", "siguiente": null}
]', NULL, NULL),

('npc_dr_gomez', 'npc_dr_gomez_propuesta', 'Ah, medicina "extra"... Mira, tengo algo guardado. Pero no es gratis. 500 de oro, o un favor grande. Tú eliges.', NULL, '[
  {"texto": "¿Qué tipo de favor?", "siguiente": "npc_dr_gomez_favor"},
  {"texto": "Te voy a denunciar con Ana", "siguiente": "npc_dr_gomez_amenaza"},
  {"texto": "Acepto el trato por oro", "siguiente": "npc_dr_gomez_oro"},
  {"texto": "[Intimidar] Dame la medicina o te rompo la cara", "siguiente": "npc_dr_gomez_intimidar", "condicion": {"stat": "intimidacion", "minimo": 7}}
]', NULL, NULL),

('npc_dr_gomez', 'npc_dr_gomez_favor', 'Marco, el guardia, sospecha de mí. Necesito que lo... distraigas. Manténlo ocupado mientras muevo algunas cosas. ¿Trato?', NULL, '[
  {"texto": "Está bien, lo haré", "siguiente": null},
  {"texto": "No, eso es demasiado", "siguiente": "npc_dr_gomez_propuesta"}
]', '{"gomez_estado": "comerciando", "quest": "distraer_marco"}', NULL),

('npc_dr_gomez', 'npc_dr_gomez_amenaza', '*Sonríe fríamente* ¿Ah sí? Adelante. Pero sin mí, este hospital colapsa en dos días. Ana lo sabe. ¿Seguro que quieres jugar así?', NULL, '[
  {"texto": "Tienes razón, olvidemos esto", "siguiente": "npc_dr_gomez_saludo"},
  {"texto": "Lo haré de todos modos", "siguiente": null}
]', '{"gomez_estado": "amenazante", "quest": "denunciar_gomez"}', NULL),

('npc_dr_gomez', 'npc_dr_gomez_oro', 'Perfecto. Negocios son negocios. *Te entrega medicina* Un placer hacer tratos contigo.', '{"oro_minimo": 500}', '[
  {"texto": "Gracias", "siguiente": null}
]', '{"gomez_estado": "comerciando", "oro": -500, "item": "item_antibioticos"}', NULL),

('npc_dr_gomez', 'npc_dr_gomez_intimidar', '*Retrocede asustado* ¡Está bien, está bien! Toma la maldita medicina. Pero te arrepentirás...', NULL, '[
  {"texto": "Eso pensé", "siguiente": null}
]', '{"gomez_estado": "humillado", "item": "item_antibioticos", "gomez_relacion": -20}', NULL),

('npc_dr_gomez', 'npc_dr_gomez_desconfianza', 'No soy de los que "conocen gente". Si no necesitas nada, vete.', NULL, '[
  {"texto": "Como quieras", "siguiente": null}
]', NULL, NULL);

-- ==================================================
-- MARCO - Guardia Moral (Conflicto: Justicia vs Culpa)
-- ==================================================
INSERT OR IGNORE INTO npc_dialogues (npc_id, dialogo_id, texto, condiciones, opciones, consecuencias, quest_relacionada) VALUES
('npc_marco', 'npc_marco_saludo', '*Te observa seriamente* Marco. Guardo este lugar. Si buscas problemas, estás hablando con la persona equivocada.', NULL, '[
  {"texto": "Solo quiero hablar", "siguiente": "npc_marco_charla"},
  {"texto": "¿Qué tan grave está la situación?", "siguiente": "npc_marco_situacion"},
  {"texto": "Entendido", "siguiente": null}
]', NULL, NULL),

('npc_marco', 'npc_marco_charla', '*Suspira* Hace tres días... tuve que eliminar a un niño infectado. No había opción. ¿Hice bien?', NULL, '[
  {"texto": "Hiciste lo correcto", "siguiente": "npc_marco_validacion"},
  {"texto": "Eso fue asesinato", "siguiente": "npc_marco_culpa"},
  {"texto": "Depende... ¿estaba realmente infectado?", "siguiente": "npc_marco_duda"},
  {"texto": "[Empatía] Nadie debería cargar con eso solo", "siguiente": "npc_marco_empatia", "condicion": {"stat": "empatia", "minimo": 6}}
]', NULL, NULL),

('npc_marco', 'npc_marco_validacion', 'Gracias... necesitaba escuchar eso. *Se relaja* Si necesitas algo, cuenta conmigo.', NULL, '[
  {"texto": "Gracias, Marco", "siguiente": null}
]', '{"marco_estado": "validado", "marco_relacion": 15, "marco_lealtad": "player"}', NULL),

('npc_marco', 'npc_marco_culpa', '*Se tensa* Vete. No necesito que me juzgues.', NULL, '[
  {"texto": "Como quieras", "siguiente": null}
]', '{"marco_estado": "culpable", "marco_relacion": -10}', NULL),

('npc_marco', 'npc_marco_duda', '*Pausa larga* ...No lo sé. Eso es lo que me mata. ¿Y si me equivoqué?', NULL, '[
  {"texto": "Hiciste lo que pudiste", "siguiente": "npc_marco_validacion"},
  {"texto": "Entonces cargarás con eso", "siguiente": "npc_marco_culpa"}
]', NULL, NULL),

('npc_marco', 'npc_marco_empatia', '*Te mira agradecido* Gracias... Eres de los buenos. Si alguna vez necesitas ayuda, yo estaré ahí.', NULL, '[
  {"texto": "Cuenta conmigo también", "siguiente": null}
]', '{"marco_estado": "vulnerable", "marco_relacion": 20, "marco_lealtad": "player"}', NULL),

('npc_marco', 'npc_marco_situacion', 'Tensa. El Dr. Gómez esconde suministros. Ana lo sabe pero no actúa. Si no hacemos algo, habrá caos.', NULL, '[
  {"texto": "¿Qué propones?", "siguiente": "npc_marco_propuesta"},
  {"texto": "No es asunto mío", "siguiente": null}
]', NULL, NULL),

('npc_marco', 'npc_marco_propuesta', 'Puedo "resolver" el problema del Dr. Gómez. Pero necesito que Ana me dé luz verde. O tú.', NULL, '[
  {"texto": "No, eso es extremo", "siguiente": null},
  {"texto": "Hazlo", "siguiente": "npc_marco_ejecutar"}
]', NULL, NULL),

('npc_marco', 'npc_marco_ejecutar', '*Asiente* Entendido. Será rápido. *Se aleja*', NULL, '[
  {"texto": "...", "siguiente": null}
]', '{"gomez_estado": "muerto", "marco_estado": "justiciero", "quest": "marco_ejecuta_gomez"}', NULL);

-- ==================================================
-- TERESA - Madre Desesperada (Conflicto: Supervivencia)
-- ==================================================
INSERT OR IGNORE INTO npc_dialogues (npc_id, dialogo_id, texto, condiciones, opciones, consecuencias, quest_relacionada) VALUES
('npc_teresa', 'npc_teresa_saludo', '*Se acerca llorando* Por favor... por favor, mi hijo se muere. Necesita antibióticos. Tú tienes influencia aquí. ¡Haz algo!', NULL, '[
  {"texto": "Voy a ayudarte", "siguiente": "npc_teresa_promesa"},
  {"texto": "No puedo prometer nada", "siguiente": "npc_teresa_neutral"},
  {"texto": "Carlos es más importante", "siguiente": "npc_teresa_traicion"},
  {"texto": "Dame algo a cambio", "siguiente": "npc_teresa_intercambio"}
]', NULL, NULL),

('npc_teresa', 'npc_teresa_promesa', 'Gracias... gracias... Te debo todo. No olvidaré esto. *Te abraza*', NULL, '[
  {"texto": "Haré lo que pueda", "siguiente": null}
]', '{"teresa_estado": "esperanzada", "teresa_relacion": 15, "quest": "salvar_hijo_teresa"}', NULL),

('npc_teresa', 'npc_teresa_neutral', '...Entiendo. Haré lo que sea necesario. Con o sin tu ayuda.', NULL, '[
  {"texto": "Lo siento", "siguiente": null}
]', '{"teresa_estado": "desesperada"}', NULL),

('npc_teresa', 'npc_teresa_traicion', '*Te mira con odio* Maldito seas. Espero que nunca tengas que ver morir a alguien que amas. *Se aleja*', NULL, '[
  {"texto": "...", "siguiente": null}
]', '{"teresa_estado": "traicionada", "teresa_relacion": -30, "teresa_venganza": true}', NULL),

('npc_teresa', 'npc_teresa_intercambio', '*Saca un relicario familiar* Esto... es lo único valioso que me queda. Por favor.', NULL, '[
  {"texto": "Acepto, te ayudaré", "siguiente": "npc_teresa_promesa"},
  {"texto": "No, quédate con eso", "siguiente": "npc_teresa_neutral"}
]', '{"item": "relicario_teresa"}', NULL);

-- Teresa - Si robó medicina
INSERT OR IGNORE INTO npc_dialogues (npc_id, dialogo_id, texto, condiciones, opciones, consecuencias, quest_relacionada) VALUES
('npc_teresa', 'npc_teresa_robo', '*Capturada por Marco* Lo siento... lo siento... pero mi hijo...', '{"teresa_estado": "ladrona"}', '[
  {"texto": "[A Ana] Déjenla ir", "siguiente": "npc_teresa_perdon"},
  {"texto": "[A Ana] Enciérrenla", "siguiente": "npc_teresa_carcel"},
  {"texto": "[A Marco] Ejecútala como ejemplo", "siguiente": "npc_teresa_ejecucion"},
  {"texto": "Yo me hago responsable", "siguiente": "npc_teresa_responsable"}
]', NULL, NULL),

('npc_teresa', 'npc_teresa_perdon', '*Te mira agradecida* No... no sé cómo pagarte esto...', NULL, '[
  {"texto": "Cuida a tu hijo", "siguiente": null}
]', '{"teresa_estado": "agradecida", "teresa_relacion": 30, "ana_estado": "blanda"}', NULL),

('npc_teresa', 'npc_teresa_carcel', '*Grita* ¡Nooo! ¡Mi hijo! ¡POR FAVOR!', NULL, '[
  {"texto": "Lo siento", "siguiente": null}
]', '{"teresa_estado": "encarcelada", "hijo_teresa": "muerto", "teresa_venganza": true}', NULL),

('npc_teresa', 'npc_teresa_ejecucion', '*Marco la ejecuta rápidamente*', NULL, '[
  {"texto": "...", "siguiente": null}
]', '{"teresa_estado": "muerta", "hijo_teresa": "muerto", "marco_estado": "justiciero", "hospital_moral": "cruel"}', NULL),

('npc_teresa', 'npc_teresa_responsable', '*Ana te mira seriamente* De acuerdo. Pero esto afecta tu reputación aquí.', NULL, '[
  {"texto": "Lo acepto", "siguiente": null}
]', '{"teresa_estado": "libre", "reputacion": -10, "teresa_relacion": 25}', NULL);

-- ==================================================
-- CARLOS - Explorador Herido (Conflicto: Chantaje)
-- ==================================================
INSERT OR IGNORE INTO npc_dialogues (npc_id, dialogo_id, texto, condiciones, opciones, consecuencias, quest_relacionada) VALUES
('npc_carlos', 'npc_carlos_saludo', '*Tosiendo sangre* Sé dónde hay un alijo enorme... pero solo lo diré si me operas primero. Si muero, ese secreto se va conmigo.', NULL, '[
  {"texto": "Te salvaré", "siguiente": "npc_carlos_salvado"},
  {"texto": "No negocio con chantajistas", "siguiente": "npc_carlos_rechazo"},
  {"texto": "[Intimidar] Dime ya o te dejo morir", "siguiente": "npc_carlos_amenaza", "condicion": {"stat": "intimidacion", "minimo": 7}},
  {"texto": "¿Y si salvo al hijo de Teresa?", "siguiente": "npc_carlos_furia"}
]', NULL, NULL),

('npc_carlos', 'npc_carlos_salvado', '*Sonríe débilmente* Sabía que eras inteligente. El alijo está en el antiguo almacén portuario, edificio 7. Código: 4829. *Tose* Vale la pena...', NULL, '[
  {"texto": "Descansa ahora", "siguiente": null}
]', '{"carlos_estado": "vivo_agradecido", "carlos_relacion": 20, "quest": "alijo_puerto"}', NULL),

('npc_carlos', 'npc_carlos_rechazo', '*Te mira con desprecio* Entonces te mueres sin ese alijo. Idiota. *Se debilita más*', NULL, '[
  {"texto": "Como quieras", "siguiente": null}
]', '{"carlos_estado": "moribundo"}', NULL),

('npc_carlos', 'npc_carlos_amenaza', '*Asustado* ¡Está bien, está bien! Edificio 7 del puerto, código 4829. *Te maldice* ...Espero que te maten allí...', NULL, '[
  {"texto": "Gracias", "siguiente": null}
]', '{"carlos_estado": "moribundo", "carlos_relacion": -20, "quest": "alijo_puerto"}', NULL),

('npc_carlos', 'npc_carlos_furia', '*Furioso* ¡¿QUÉ?! ¡Un maldito NIÑO sobre MÍ! ¡Púdrete! *Gira la cabeza*', NULL, '[
  {"texto": "...", "siguiente": null}
]', '{"carlos_estado": "furioso", "carlos_cierra_trato": true}', NULL);

-- Carlos - Si muere
INSERT OR IGNORE INTO npc_dialogues (npc_id, dialogo_id, texto, condiciones, opciones, consecuencias, quest_relacionada) VALUES
('npc_carlos', 'npc_carlos_muerte', '*Último aliento* ...El puerto... edificio... 7... *Muere*', '{"carlos_estado": "moribundo", "dias_pasados": 2}', '[
  {"texto": "Descansa en paz", "siguiente": null}
]', '{"carlos_estado": "muerto", "alijo_perdido": true}', NULL);

-- Datos iniciales: Tiendas (DESACTIVADAS EN MODO FOCUS)
INSERT OR IGNORE INTO shops (npc_id, nombre, tipo, inventario, descuento_reputacion) VALUES
-- Tienda general (Sofía - Mercado)
('npc_sofia', 'Tienda de Sofia', 'general', '[
  {"item_id": "item_agua", "cantidad": 50, "precio_compra": 8, "precio_venta": 3},
  {"item_id": "item_comida", "cantidad": 40, "precio_compra": 12, "precio_venta": 5},
  {"item_id": "item_vendaje", "cantidad": 20, "precio_compra": 15, "precio_venta": 6},
  {"item_id": "item_cuerda", "cantidad": 10, "precio_compra": 15, "precio_venta": 8},
  {"item_id": "item_linterna", "cantidad": 5, "precio_compra": 25, "precio_venta": 10},
  {"item_id": "item_tubo", "cantidad": 8, "precio_compra": 15, "precio_venta": 5},
  {"item_id": "item_cuchillo", "cantidad": 6, "precio_compra": 25, "precio_venta": 10}
]', 0.05),
-- Mercado negro de armas (Viktor - Almacén)
('npc_viktor', 'Arsenal de Viktor', 'armas', '[
  {"item_id": "item_pistola", "cantidad": 3, "precio_compra": 180, "precio_venta": 80},
  {"item_id": "item_escopeta", "cantidad": 2, "precio_compra": 250, "precio_venta": 120},
  {"item_id": "item_rifle", "cantidad": 1, "precio_compra": 400, "precio_venta": 200},
  {"item_id": "item_municion_9mm", "cantidad": 100, "precio_compra": 8, "precio_venta": 3},
  {"item_id": "item_cartuchos", "cantidad": 50, "precio_compra": 12, "precio_venta": 5},
  {"item_id": "item_municion_rifle", "cantidad": 50, "precio_compra": 15, "precio_venta": 7},
  {"item_id": "item_machete", "cantidad": 4, "precio_compra": 70, "precio_venta": 35},
  {"item_id": "item_hacha", "cantidad": 3, "precio_compra": 90, "precio_venta": 45},
  {"item_id": "item_chaleco_antibalas", "cantidad": 2, "precio_compra": 200, "precio_venta": 100}
]', 0),
-- Suministros médicos (Dr. Gómez - Hospital)
('npc_dr_gomez', 'Suministros Medicos', 'medico', '[
  {"item_id": "item_vendaje", "cantidad": 30, "precio_compra": 12, "precio_venta": 8},
  {"item_id": "item_botiquin", "cantidad": 15, "precio_compra": 60, "precio_venta": 30},
  {"item_id": "item_morfina", "cantidad": 8, "precio_compra": 90, "precio_venta": 50},
  {"item_id": "item_adrenalina", "cantidad": 5, "precio_compra": 80, "precio_venta": 40},
  {"item_id": "item_vitaminas", "cantidad": 10, "precio_compra": 40, "precio_venta": 20}
]', 0.10);

