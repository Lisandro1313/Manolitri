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
