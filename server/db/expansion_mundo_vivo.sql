-- ========================================
-- EXPANSIÓN DE MUNDO VIVO: Nuevos NPCs y Locaciones
-- ========================================

-- ===== NUEVAS LOCACIONES =====

INSERT OR IGNORE INTO locations (id, nombre, descripcion, conexiones, peligro_nivel, recursos) VALUES

-- Ciudad vecina: Villa Esperanza (ciudad más grande)
('villa_esperanza_centro', 'Villa Esperanza - Centro', 
'Una ciudad vecina más grande que el refugio. El centro está parcialmente en ruinas pero hay señales de vida.', 
'["villa_esperanza_mercado", "villa_esperanza_residencias", "refugio_entrada"]', 
3, 
'{"comida": 30, "agua": 25, "medicina": 15, "armas": 20}'),

('villa_esperanza_mercado', 'Villa Esperanza - Mercado', 
'El antiguo mercado central ahora sirve como punto de intercambio entre supervivientes.', 
'["villa_esperanza_centro", "villa_esperanza_residencias"]', 
2, 
'{"comida": 40, "agua": 30, "medicina": 10, "armas": 5}'),

('villa_esperanza_residencias', 'Villa Esperanza - Residencias', 
'Edificios de apartamentos donde varios grupos de supervivientes han formado comunidades.', 
'["villa_esperanza_centro", "villa_esperanza_mercado"]', 
2, 
'{"comida": 20, "agua": 20, "medicina": 5, "armas": 10}'),

-- Campo: Granja abandonada (rural)
('granja_principal', 'Granja Los Álamos - Casa Principal', 
'Una granja abandonada a las afueras. La casa principal está en buen estado y ofrece refugio.', 
'["granja_granero", "granja_campos", "refugio_entrada"]', 
3, 
'{"comida": 50, "agua": 40, "medicina": 5, "armas": 15}'),

('granja_granero', 'Granja Los Álamos - Granero', 
'El granero almacena herramientas y algunos suministros. Ideal para esconderse.', 
'["granja_principal", "granja_campos"]', 
2, 
'{"comida": 35, "agua": 20, "medicina": 0, "armas": 25}'),

('granja_campos', 'Granja Los Álamos - Campos de Cultivo', 
'Campos extensos donde aún crecen algunos vegetales silvestres.', 
'["granja_principal", "granja_granero"]', 
2, 
'{"comida": 60, "agua": 30, "medicina": 0, "armas": 5}'),

-- Búnker militar (peligroso pero valioso)
('bunker_entrada', 'Búnker Militar - Entrada', 
'Un búnker militar subterráneo. La entrada está custodiada por supervivientes armados.', 
'["bunker_armeria", "bunker_viveres", "refugio_entrada"]', 
5, 
'{"comida": 15, "agua": 15, "medicina": 20, "armas": 60}'),

('bunker_armeria', 'Búnker Militar - Armería', 
'Armería militar con acceso restringido. Arsenal completo de armas y municiones.', 
'["bunker_entrada", "bunker_viveres"]', 
6, 
'{"comida": 5, "agua": 5, "medicina": 10, "armas": 80}'),

('bunker_viveres', 'Búnker Militar - Almacén de Víveres', 
'Almacén subterráneo con suministros de largo plazo en conserva.', 
'["bunker_entrada", "bunker_armeria"]', 
4, 
'{"comida": 70, "agua": 60, "medicina": 30, "armas": 20}');

-- ===== NUEVOS NPCs =====

-- VILLA ESPERANZA (8 NPCs)

INSERT OR IGNORE INTO npcs (id, nombre, lugar_actual, personalidad, rol_social, estado_emocional, memoria, estado) VALUES

-- Alberto: Carismático comerciante que coquetea con Roberta
('npc_alberto', 'Alberto', 'villa_esperanza_mercado',
'{"agresivo": 2, "amigable": 8, "cobarde": 1, "comerciante": 9, "lider": 6, "manipulador": 7, "protector": 3, "romantico": 9}',
'comerciante',
'{"miedo": 20, "confianza": 75, "esperanza": 80, "estres": 30}',
'[]',
'activo'),

-- Roberta: Ingeniera atractiva, objeto de deseo de Alberto y Tomás
('npc_roberta', 'Roberta', 'villa_esperanza_centro',
'{"agresivo": 4, "amigable": 7, "cobarde": 2, "comerciante": 5, "lider": 7, "manipulador": 3, "protector": 6, "independiente": 9}',
'ingeniera',
'{"miedo": 30, "confianza": 70, "esperanza": 75, "estres": 40}',
'[]',
'activo'),

-- Tomás: Celoso rival de Alberto por Roberta
('npc_tomas', 'Tomás', 'villa_esperanza_centro',
'{"agresivo": 7, "amigable": 4, "cobarde": 3, "comerciante": 2, "lider": 5, "manipulador": 6, "protector": 8, "celoso": 9}',
'guardia',
'{"miedo": 40, "confianza": 50, "esperanza": 60, "estres": 70}',
'[]',
'activo'),

-- Lucía: Chismosa que sabe todos los secretos
('npc_lucia', 'Lucía', 'villa_esperanza_residencias',
'{"agresivo": 3, "amigable": 6, "cobarde": 5, "comerciante": 7, "lider": 4, "manipulador": 9, "protector": 2, "chismosa": 10}',
'informante',
'{"miedo": 50, "confianza": 60, "esperanza": 65, "estres": 55}',
'[]',
'activo'),

-- Raúl: Violento y temperamental, enemigo de José
('npc_raul', 'Raúl', 'villa_esperanza_centro',
'{"agresivo": 10, "amigable": 2, "cobarde": 1, "comerciante": 1, "lider": 6, "manipulador": 4, "protector": 3, "vengativo": 9}',
'matón',
'{"miedo": 20, "confianza": 40, "esperanza": 50, "estres": 80}',
'[]',
'activo'),

-- José: Víctima de Raúl, tímido y asustado
('npc_jose', 'José', 'villa_esperanza_residencias',
'{"agresivo": 1, "amigable": 7, "cobarde": 9, "comerciante": 5, "lider": 2, "manipulador": 1, "protector": 4, "sumiso": 9}',
'civil',
'{"miedo": 85, "confianza": 35, "esperanza": 40, "estres": 90}',
'[]',
'activo'),

-- Elena: Médica amable, amiga de Roberta
('npc_elena', 'Elena', 'villa_esperanza_residencias',
'{"agresivo": 2, "amigable": 9, "cobarde": 4, "comerciante": 3, "lider": 6, "manipulador": 2, "protector": 10, "compasiva": 10}',
'médica',
'{"miedo": 45, "confianza": 75, "esperanza": 80, "estres": 50}',
'[]',
'activo'),

-- Gabriel: Líder carismático de Villa Esperanza
('npc_gabriel', 'Gabriel', 'villa_esperanza_centro',
'{"agresivo": 5, "amigable": 7, "cobarde": 2, "comerciante": 6, "lider": 10, "manipulador": 5, "protector": 9, "justo": 8}',
'líder',
'{"miedo": 30, "confianza": 85, "esperanza": 90, "estres": 60}',
'[]',
'activo'),

-- GRANJA (4 NPCs)

-- Javier: Granjero solitario
('npc_javier', 'Javier', 'granja_principal',
'{"agresivo": 4, "amigable": 5, "cobarde": 3, "comerciante": 4, "lider": 3, "manipulador": 2, "protector": 7, "solitario": 9}',
'granjero',
'{"miedo": 40, "confianza": 50, "esperanza": 60, "estres": 45}',
'[]',
'activo'),

-- Carmen: Veterinaria que ayuda en la granja
('npc_carmen', 'Carmen', 'granja_granero',
'{"agresivo": 2, "amigable": 8, "cobarde": 4, "comerciante": 5, "lider": 5, "manipulador": 3, "protector": 8, "cariñosa": 9}',
'veterinaria',
'{"miedo": 50, "confianza": 65, "esperanza": 70, "estres": 55}',
'[]',
'activo'),

-- Diego: Mecánico rudo pero noble
('npc_diego', 'Diego', 'granja_granero',
'{"agresivo": 6, "amigable": 6, "cobarde": 2, "comerciante": 4, "lider": 5, "manipulador": 3, "protector": 7, "leal": 8}',
'mecánico',
'{"miedo": 35, "confianza": 60, "esperanza": 65, "estres": 50}',
'[]',
'activo'),

-- Martina: Exploradora audaz
('npc_martina', 'Martina', 'granja_campos',
'{"agresivo": 7, "amigable": 6, "cobarde": 1, "comerciante": 5, "lider": 7, "manipulador": 4, "protector": 6, "aventurera": 10}',
'exploradora',
'{"miedo": 25, "confianza": 75, "esperanza": 80, "estres": 40}',
'[]',
'activo'),

-- BÚNKER MILITAR (3 NPCs)

-- Comandante Rojas: Líder militar autoritario
('npc_rojas', 'Comandante Rojas', 'bunker_entrada',
'{"agresivo": 8, "amigable": 3, "cobarde": 1, "comerciante": 2, "lider": 10, "manipulador": 7, "protector": 6, "autoritario": 10}',
'comandante militar',
'{"miedo": 20, "confianza": 70, "esperanza": 60, "estres": 75}',
'[]',
'activo'),

-- Sargento Patricia: Militar leal pero cuestiona órdenes
('npc_patricia', 'Sargento Patricia', 'bunker_armeria',
'{"agresivo": 7, "amigable": 6, "cobarde": 2, "comerciante": 3, "lider": 7, "manipulador": 4, "protector": 9, "honorable": 9}',
'militar',
'{"miedo": 35, "confianza": 70, "esperanza": 70, "estres": 60}',
'[]',
'activo'),

-- Técnico Samuel: Genio informático paranoico
('npc_samuel', 'Samuel', 'bunker_viveres',
'{"agresivo": 2, "amigable": 4, "cobarde": 7, "comerciante": 5, "lider": 2, "manipulador": 6, "protector": 3, "paranoico": 10}',
'técnico',
'{"miedo": 75, "confianza": 40, "esperanza": 50, "estres": 85}',
'[]',
'activo');

-- ===== INICIALIZAR ESTADO DE NUEVOS NPCs =====

INSERT OR IGNORE INTO npc_state (npc_id, necesidades, actividad_actual, objetivo_actual, ultima_decision) VALUES
('npc_alberto', '{"hambre": 70, "sed": 75, "cansancio": 40, "seguridad": 80, "social": 85}', 'comerciar', 'coquetear_roberta', 0),
('npc_roberta', '{"hambre": 75, "sed": 80, "cansancio": 45, "seguridad": 75, "social": 70}', 'trabajar', 'reparar_generador', 0),
('npc_tomas', '{"hambre": 65, "sed": 70, "cansancio": 50, "seguridad": 70, "social": 50}', 'patrullar', 'vigilar_roberta', 0),
('npc_lucia', '{"hambre": 70, "sed": 75, "cansancio": 55, "seguridad": 65, "social": 90}', 'socializar', 'recopilar_chismes', 0),
('npc_raul', '{"hambre": 60, "sed": 65, "cansancio": 40, "seguridad": 70, "social": 40}', 'patrullar', 'buscar_pelea', 0),
('npc_jose', '{"hambre": 55, "sed": 60, "cansancio": 60, "seguridad": 30, "social": 35}', 'esconderse', 'evitar_raul', 0),
('npc_elena', '{"hambre": 75, "sed": 80, "cansancio": 50, "seguridad": 70, "social": 75}', 'curar', 'ayudar_heridos', 0),
('npc_gabriel', '{"hambre": 70, "sed": 75, "cansancio": 55, "seguridad": 75, "social": 80}', 'liderar', 'organizar_comunidad', 0),
('npc_javier', '{"hambre": 70, "sed": 75, "cansancio": 50, "seguridad": 60, "social": 30}', 'trabajar', 'cultivar_campos', 0),
('npc_carmen', '{"hambre": 75, "sed": 80, "cansancio": 45, "seguridad": 65, "social": 65}', 'cuidar_animales', 'veterinaria', 0),
('npc_diego', '{"hambre": 70, "sed": 70, "cansancio": 50, "seguridad": 70, "social": 55}', 'reparar', 'mecánica', 0),
('npc_martina', '{"hambre": 65, "sed": 70, "cansancio": 40, "seguridad": 75, "social": 60}', 'explorar', 'mapear_zona', 0),
('npc_rojas', '{"hambre": 75, "sed": 80, "cansancio": 50, "seguridad": 85, "social": 60}', 'comandar', 'mantener_orden', 0),
('npc_patricia', '{"hambre": 70, "sed": 75, "cansancio": 45, "seguridad": 80, "social": 65}', 'patrullar', 'vigilancia', 0),
('npc_samuel', '{"hambre": 60, "sed": 65, "cansancio": 60, "seguridad": 50, "social": 30}', 'trabajar', 'hackear_sistema', 0);

-- ===== RELACIONES INICIALES PRE-PROGRAMADAS =====

-- Triángulo amoroso: Alberto → Roberta ← Tomás
INSERT OR IGNORE INTO npc_relationships (npc_a_id, npc_b_id, amistad, atraccion, respeto, rivalidad, celos, estado, intensidad) VALUES
('npc_alberto', 'npc_roberta', 55, 75, 70, 5, 10, 'amantes', 8),
('npc_roberta', 'npc_tomas', 50, 30, 60, 15, 5, 'neutral', 4),
('npc_alberto', 'npc_tomas', 30, 0, 40, 70, 60, 'rivales', 9);

-- Conflicto: Raúl vs José
INSERT OR IGNORE INTO npc_relationships (npc_a_id, npc_b_id, amistad, atraccion, respeto, rivalidad, celos, estado, intensidad) VALUES
('npc_jose', 'npc_raul', 10, 0, 20, 80, 5, 'enemigos', 9);

-- Amistad: Roberta y Elena
INSERT OR IGNORE INTO npc_relationships (npc_a_id, npc_b_id, amistad, atraccion, respeto, rivalidad, celos, estado, intensidad) VALUES
('npc_elena', 'npc_roberta', 85, 0, 75, 0, 0, 'amigos', 7);

-- Lucía conoce a todos (chismosa)
INSERT OR IGNORE INTO npc_relationships (npc_a_id, npc_b_id, amistad, atraccion, respeto, rivalidad, celos, estado, intensidad) VALUES
('npc_alberto', 'npc_lucia', 60, 0, 50, 10, 0, 'neutral', 4),
('npc_lucia', 'npc_roberta', 55, 0, 55, 20, 15, 'complejo', 6),
('npc_lucia', 'npc_tomas', 50, 0, 45, 15, 5, 'neutral', 3);

-- Granja: Carmen y Diego (posible romance futuro)
INSERT OR IGNORE INTO npc_relationships (npc_a_id, npc_b_id, amistad, atraccion, respeto, rivalidad, celos, estado, intensidad) VALUES
('npc_carmen', 'npc_diego', 60, 40, 65, 0, 0, 'tension_sexual', 5);

-- Militar: Patricia cuestiona a Rojas
INSERT OR IGNORE INTO npc_relationships (npc_a_id, npc_b_id, amistad, atraccion, respeto, rivalidad, celos, estado, intensidad) VALUES
('npc_patricia', 'npc_rojas', 45, 0, 60, 35, 0, 'rivales', 6);
