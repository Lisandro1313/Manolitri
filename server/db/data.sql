-- ====================================
-- DATOS ADICIONALES - Zonas, Dungeons, Items
-- ====================================

-- Este archivo añade más zonas, dungeons completos y items al juego
-- Ejecutar DESPUÉS de schema_v2.sql

-- ====================================
-- ZONAS ADICIONALES
-- ====================================

INSERT OR IGNORE INTO zones (id, nombre, tipo, descripcion, nivel_recomendado, conexiones, npcs, pois) VALUES

-- Zona: Camino del Este
('camino_este', 'Camino del Este', 'camino', 
 'Un camino polvoriento que conecta la ciudad con las tierras fronterizas. Comerciantes y aventureros lo transitan frecuentemente.',
 2,
 '["ciudad_inicio", "aldea_piedra"]',
 '["mercader_viajero"]',
 '[
   {"id": "cruce", "nombre": "Cruce de Caminos", "tipo": "landmark"},
   {"id": "posada", "nombre": "Posada del Viajero", "tipo": "descanso"}
 ]'),

-- Zona: Aldea Piedra
('aldea_piedra', 'Aldea Piedra', 'aldea',
 'Una pequeña aldea minera. Los habitantes son trabajadores y desconfiados de extraños.',
 3,
 '["camino_este", "minas_abandonadas_entrada"]',
 '["alcalde_piedra", "minero_veterano"]',
 '[
   {"id": "tienda_minera", "nombre": "Herramientas y Suministros", "tipo": "comercio"},
   {"id": "mina_activa", "nombre": "Mina Norte", "tipo": "trabajo"}
 ]'),

-- Zona: Ruinas Antiguas
('ruinas_antiguas', 'Ruinas Antiguas', 'ruinas',
 'Los restos de una civilización perdida. Piedras cubiertas de musgo y símbolos extraños adornan el lugar.',
 5,
 '["bosque_verde"]',
 '[]',
 '[
   {"id": "dungeon_templo", "nombre": "Templo Olvidado", "tipo": "dungeon", "nivel": 5}
 ]'),

-- Zona: Entrada a Minas Abandonadas
('minas_abandonadas_entrada', 'Minas Abandonadas', 'dungeon_entrance',
 'Una antigua mina que fue cerrada hace años. Se rumorea que está infestada de criaturas oscuras.',
 4,
 '["aldea_piedra"]',
 '[]',
 '[
   {"id": "dungeon_minas", "nombre": "Minas Profundas", "tipo": "dungeon", "nivel": 4}
 ]'),

-- Zona: Puerto Marea
('puerto_marea', 'Puerto Marea', 'ciudad',
 'Una bulliciosa ciudad portuaria. El olor a sal y pescado impregna el aire.',
 3,
 '["camino_este"]',
 '["capitan_barco", "pescador_viejo", "comerciante_exotico"]',
 '[
   {"id": "muelle", "nombre": "Muelle Principal", "tipo": "social"},
   {"id": "mercado_puerto", "nombre": "Mercado del Puerto", "tipo": "comercio"},
   {"id": "taberna_marinero", "nombre": "La Sirena Cantarina", "tipo": "social"}
 ]');

-- ====================================
-- NPCs ADICIONALES
-- ====================================

INSERT OR IGNORE INTO npcs (id, nombre, tipo, raza, descripcion, nivel, hostil) VALUES

('mercader_viajero', 'Tomás el Viajero', 'comerciante', 'humano',
 'Un mercader que viaja entre ciudades vendiendo mercancías variadas.', 4, 0),

('alcalde_piedra', 'Alcalde Gregor', 'quest_giver', 'enano',
 'El alcalde de Aldea Piedra. Parece preocupado por algo.', 6, 0),

('minero_veterano', 'Magnus', 'quest_giver', 'enano',
 'Un viejo minero con muchas historias que contar.', 5, 0),

('capitan_barco', 'Capitana Elena', 'quest_giver', 'humano',
 'Una experimentada capitana de barco que busca tripulación aventurera.', 8, 0),

('pescador_viejo', 'Viejo Marino', 'neutral', 'humano',
 'Un pescador que pasa sus días en el muelle.', 3, 0),

('comerciante_exotico', 'Zahir', 'comerciante', 'humano',
 'Un comerciante de tierras lejanas con artículos exóticos.', 7, 0);

-- ====================================
-- DUNGEON: Cueva de Goblins (COMPLETO)
-- ====================================

-- Actualizar template con salas completas
UPDATE dungeon_templates SET salas = json('[
  {
    "nombre": "Entrada",
    "descripcion": "Una cueva oscura con antorchas parpadeantes. El suelo está cubierto de huesos y desperdicios.",
    "enemigos": [
      {
        "nombre": "Goblin Explorador",
        "salud": 25,
        "danio": 8,
        "descripcion": "Un pequeño goblin armado con una daga oxidada"
      },
      {
        "nombre": "Goblin Explorador",
        "salud": 25,
        "danio": 8,
        "descripcion": "Un pequeño goblin armado con una daga oxidada"
      }
    ]
  },
  {
    "nombre": "Túnel Serpenteante",
    "descripcion": "Un estrecho túnel que desciende hacia las profundidades. Se escuchan gruñidos a lo lejos.",
    "enemigos": [
      {
        "nombre": "Goblin Guerrero",
        "salud": 35,
        "danio": 12,
        "descripcion": "Un goblin más grande, con armadura de cuero"
      },
      {
        "nombre": "Lobo Salvaje",
        "salud": 30,
        "danio": 15,
        "descripcion": "Un lobo domesticado por los goblins"
      }
    ]
  },
  {
    "nombre": "Sala del Tesoro",
    "descripcion": "Una sala amplia con cofres esparcidos. ¡Pero algo se mueve entre las sombras!",
    "enemigos": [
      {
        "nombre": "Goblin Chamán",
        "salud": 40,
        "danio": 10,
        "descripcion": "Un goblin con túnica que lanza hechizos básicos"
      },
      {
        "nombre": "Goblin Guerrero",
        "salud": 35,
        "danio": 12,
        "descripcion": "Un goblin más grande, con armadura de cuero"
      }
    ],
    "cofre": true
  },
  {
    "nombre": "Guarida del Jefe",
    "descripcion": "Una caverna enorme con un trono improvisado. El líder de los goblins os espera.",
    "enemigos": [
      {
        "nombre": "Jefe Goblin Grok",
        "salud": 80,
        "danio": 18,
        "descripcion": "Un goblin enorme con una gran hacha. Es el líder de la tribu.",
        "jefe": true
      }
    ]
  }
]') WHERE id = 'cueva_goblins';

-- ====================================
-- DUNGEON: Minas Profundas
-- ====================================

INSERT OR IGNORE INTO dungeon_templates (
  id, nombre, descripcion, nivel_recomendado, max_jugadores,
  duracion_estimada, recompensas_oro_min, recompensas_oro_max,
  recompensas_xp, tipo, dificultad, salas
) VALUES (
  'minas_profundas', 'Minas Profundas',
  'Antiguas minas infestadas de esqueletos y espíritus de mineros caídos.',
  4, 5, 30, 120, 200, 300, 'pve', 'normal',
  json('[
    {
      "nombre": "Entrada Derrumbada",
      "descripcion": "El túnel de entrada está parcialmente derrumbado. Huesos blanqueados yacen entre los escombros.",
      "enemigos": [
        {
          "nombre": "Esqueleto Minero",
          "salud": 30,
          "danio": 10,
          "descripcion": "Los restos animados de un minero muerto hace tiempo"
        },
        {
          "nombre": "Esqueleto Minero",
          "salud": 30,
          "danio": 10,
          "descripcion": "Los restos animados de un minero muerto hace tiempo"
        }
      ]
    },
    {
      "nombre": "Túnel Principal",
      "descripcion": "Rieles oxidados serpentean por el suelo. Las vagonetas están volcadas y cubiertas de telarañas.",
      "enemigos": [
        {
          "nombre": "Araña Gigante",
          "salud": 45,
          "danio": 15,
          "descripcion": "Una araña del tamaño de un perro grande"
        }
      ]
    },
    {
      "nombre": "Cámara de los Caídos",
      "descripcion": "Una sala memorial donde los mineros enterraban a sus compañeros. Ahora, los muertos caminan.",
      "enemigos": [
        {
          "nombre": "Espectro Minero",
          "salud": 50,
          "danio": 18,
          "descripcion": "Un fantasma vengativo de un minero"
        },
        {
          "nombre": "Esqueleto Guerrero",
          "salud": 40,
          "danio": 16,
          "descripcion": "Un esqueleto con armadura completa"
        }
      ]
    },
    {
      "nombre": "El Pozo Profundo",
      "descripcion": "El final de la mina. Un enorme pozo desciende a la oscuridad. Una presencia maligna os espera.",
      "enemigos": [
        {
          "nombre": "Capataz Muerto Viviente",
          "salud": 100,
          "danio": 22,
          "descripcion": "El capataz que cerró la mina. Ahora es una criatura monstruosa.",
          "jefe": true
        }
      ]
    }
  ]')
);

-- ====================================
-- ITEMS ADICIONALES
-- ====================================

INSERT OR IGNORE INTO items (id, nombre, tipo, subtipo, descripcion, valor_oro, rareza, propiedades) VALUES

-- Armas
('daga_acero', 'Daga de Acero', 'arma', 'daga',
 'Una daga ligera y afilada.', 30, 'comun',
 '{"danio": 5, "velocidad": 1.5, "peso": "ligero"}'),

('hacha_guerra', 'Hacha de Guerra', 'arma', 'hacha_dos_manos',
 'Un hacha pesada que requiere dos manos.', 120, 'poco_comun',
 '{"danio": 18, "velocidad": 0.8, "peso": "pesado"}'),

('baston_mago', 'Bastón de Mago', 'arma', 'baston',
 'Un bastón tallado con runas místicas.', 150, 'poco_comun',
 '{"danio": 6, "poder_magico": 15, "velocidad": 1.0}'),

('arco_largo', 'Arco Largo', 'arma', 'arco',
 'Un arco de madera de tejo para ataques a distancia.', 90, 'comun',
 '{"danio": 12, "rango": "largo", "velocidad": 1.1}'),

-- Armaduras
('armadura_placas', 'Armadura de Placas', 'armadura', 'pecho',
 'Armadura pesada de metal.', 200, 'poco_comun',
 '{"defensa": 15, "peso": "pesado"}'),

('tunica_mago', 'Túnica de Mago', 'armadura', 'pecho',
 'Túnica ligera que mejora el poder mágico.', 100, 'comun',
 '{"defensa": 3, "poder_magico": 10, "peso": "ligero"}'),

-- Consumibles
('pocion_salud', 'Poción de Salud', 'consumible', 'pocion',
 'Restaura 100 puntos de salud.', 50, 'comun',
 '{"cura": 100, "stackable": true, "max_stack": 20}'),

('pocion_mana', 'Poción de Maná', 'consumible', 'pocion',
 'Restaura 75 puntos de maná.', 40, 'comun',
 '{"restaura_mana": 75, "stackable": true, "max_stack": 20}'),

('pan', 'Pan Fresco', 'consumible', 'comida',
 'Comida básica que restaura energía.', 5, 'comun',
 '{"cura": 20, "restaura_energia": 30, "stackable": true, "max_stack": 50}'),

('antidoto', 'Antídoto', 'consumible', 'pocion',
 'Cura envenenamiento.', 30, 'comun',
 '{"cura_veneno": true, "stackable": true, "max_stack": 10}'),

-- Accesorios
('anillo_fuerza', 'Anillo de Fuerza', 'accesorio', 'anillo',
 'Un anillo que aumenta la fuerza.', 150, 'raro',
 '{"fuerza": 2}'),

('amuleto_proteccion', 'Amuleto de Protección', 'accesorio', 'amuleto',
 'Un amuleto que proporciona defensa adicional.', 180, 'raro',
 '{"defensa": 5, "resistencia_magica": 3}'),

-- Quest Items
('llave_herrumbrosa', 'Llave Herrumbrosa', 'quest_item', 'llave',
 'Una vieja llave encontrada en las minas.', 0, 'comun',
 '{"quest_item": true}'),

('cristal_poder', 'Cristal de Poder', 'quest_item', 'cristal',
 'Un cristal que brilla con energía arcana.', 0, 'epico',
 '{"quest_item": true}');

-- ====================================
-- QUESTS ADICIONALES
-- ====================================

INSERT OR IGNORE INTO quests (
  id, nombre, descripcion, tipo, nivel_minimo,
  objetivos, recompensa_oro, recompensa_xp,
  npc_id, zona_inicio
) VALUES

('problema_minas', 'Problema en las Minas',
 'El alcalde de Aldea Piedra está preocupado por extraños ruidos en las minas abandonadas.',
 'side', 3,
 '[
   {"tipo": "investigar", "lugar": "minas_abandonadas_entrada", "completado": false},
   {"tipo": "reportar", "npc": "alcalde_piedra", "completado": false}
 ]',
 80, 150,
 'alcalde_piedra', 'aldea_piedra'),

('leyenda_ruinas', 'La Leyenda de las Ruinas',
 'El viejo marino habla de un antiguo templo en las ruinas. Dice que guarda un tesoro.',
 'side', 5,
 '[
   {"tipo": "explorar", "lugar": "ruinas_antiguas", "completado": false},
   {"tipo": "obtener", "item": "cristal_poder", "cantidad": 1, "actual": 0}
 ]',
 200, 300,
 'pescador_viejo', 'puerto_marea'),

('suministros_puerto', 'Suministros para el Puerto',
 'La capitana Elena necesita suministros antes de zarpar.',
 'diaria', 3,
 '[
   {"tipo": "entregar", "item": "pan", "cantidad": 10, "actual": 0, "npc": "capitan_barco"}
 ]',
 50, 75,
 'capitan_barco', 'puerto_marea');

-- ====================================
-- EVENTOS GLOBALES (ejemplo)
-- ====================================

INSERT OR IGNORE INTO world_events (
  id, nombre, descripcion, tipo, activo,
  fecha_inicio, fecha_fin, zonas_afectadas, modificadores
) VALUES

('doble_xp_weekend', 'Fin de Semana de Doble XP',
 'Durante este fin de semana, ¡toda la experiencia ganada se duplica!',
 'servidor', 0,
 datetime('now'), datetime('now', '+3 days'),
 '[]',
 '{"xp": 2.0}');

-- ====================================
-- CREAR ÍNDICES ADICIONALES
-- ====================================

CREATE INDEX IF NOT EXISTS idx_items_tipo ON items(tipo);
CREATE INDEX IF NOT EXISTS idx_items_rareza ON items(rareza);
CREATE INDEX IF NOT EXISTS idx_quests_tipo ON quests(tipo);
CREATE INDEX IF NOT EXISTS idx_npcs_tipo ON npcs(tipo);
CREATE INDEX IF NOT EXISTS idx_zones_tipo ON zones(tipo);
