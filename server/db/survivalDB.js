/**
 * Database Manager para Survival Zombie
 * Maneja persistencia de usuarios y personajes
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'survival.db');
const db = new Database(dbPath);

// Cargar y ejecutar schema
const schemaPath = path.join(__dirname, 'survival_schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

// Cargar expansión de mundo vivo (NPCs + Locaciones + Relaciones)
const expansionPath = path.join(__dirname, 'expansion_mundo_vivo.sql');
if (fs.existsSync(expansionPath)) {
    try {
        const expansion = fs.readFileSync(expansionPath, 'utf8');
        db.exec(expansion);
        console.log('✅ Expansión de Mundo Vivo cargada');
    } catch (err) {
        console.error('❌ Error cargando expansión:', err.message);
    }
}

console.log('✅ Base de datos inicializada');

// ===== USUARIOS =====

function crearUsuario(username, password) {
    try {
        const stmt = db.prepare('INSERT INTO usuarios (username, password) VALUES (?, ?)');
        const result = stmt.run(username, password);
        return { success: true, id: result.lastInsertRowid };
    } catch (err) {
        return { success: false, error: 'Usuario ya existe' };
    }
}

function loginUsuario(username, password) {
    const stmt = db.prepare('SELECT * FROM usuarios WHERE username = ? AND password = ?');
    const user = stmt.get(username, password);
    return user || null;
}

// ===== PERSONAJES =====

function crearPersonaje(usuarioId, datos) {
    const {
        nombre,
        clase,
        fuerza = 5,
        resistencia = 5,
        agilidad = 5,
        inteligencia = 5,
        avatar = '👤',
        color = '#00ff00'
    } = datos;

    // Aplicar bonificaciones de clase
    const bonuses = {
        soldado: { fuerza: 2, combate: 2 },
        medico: { inteligencia: 2, medicina: 2 },
        ingeniero: { inteligencia: 1, mecanica: 3 },
        superviviente: { agilidad: 1, supervivencia: 2, sigilo: 1 }
    };

    const bonus = bonuses[clase] || {};
    const finalFuerza = fuerza + (bonus.fuerza || 0);
    const finalResistencia = resistencia + (bonus.resistencia || 0);
    const finalAgilidad = agilidad + (bonus.agilidad || 0);
    const finalInteligencia = inteligencia + (bonus.inteligencia || 0);

    // Skills base según clase
    const skills = {
        combate: 1 + (bonus.combate || 0),
        medicina: 1 + (bonus.medicina || 0),
        sigilo: 1 + (bonus.sigilo || 0),
        supervivencia: 1 + (bonus.supervivencia || 0),
        mecanica: 1 + (bonus.mecanica || 0)
    };

    const stmt = db.prepare(`
        INSERT INTO personajes 
        (usuario_id, nombre, clase, fuerza, resistencia, agilidad, inteligencia, avatar, color, skills)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
        const result = stmt.run(
            usuarioId,
            nombre,
            clase,
            finalFuerza,
            finalResistencia,
            finalAgilidad,
            finalInteligencia,
            avatar,
            color,
            JSON.stringify(skills)
        );

        // Crear estadísticas
        const statsStmt = db.prepare('INSERT INTO estadisticas (personaje_id) VALUES (?)');
        statsStmt.run(result.lastInsertRowid);

        return { success: true, id: result.lastInsertRowid };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

function obtenerPersonajes(usuarioId) {
    const stmt = db.prepare('SELECT * FROM personajes WHERE usuario_id = ? ORDER BY ultima_conexion DESC');
    return stmt.all(usuarioId);
}

function obtenerPersonaje(personajeId) {
    const stmt = db.prepare('SELECT * FROM personajes WHERE id = ?');
    const personaje = stmt.get(personajeId);

    if (personaje) {
        personaje.inventario = JSON.parse(personaje.inventario);
        personaje.skills = JSON.parse(personaje.skills);
    }

    return personaje;
}

function guardarProgreso(personajeId, datos) {
    const {
        nivel,
        xp,
        xp_siguiente_nivel,
        salud,
        hambre,
        locacion,
        inventario,
        skills
    } = datos;

    const stmt = db.prepare(`
        UPDATE personajes 
        SET nivel = ?, xp = ?, xp_siguiente_nivel = ?, salud = ?, hambre = ?, 
            locacion = ?, inventario = ?, skills = ?, ultima_conexion = CURRENT_TIMESTAMP
        WHERE id = ?
    `);

    stmt.run(
        nivel,
        xp,
        xp_siguiente_nivel,
        salud,
        hambre,
        locacion,
        JSON.stringify(inventario),
        JSON.stringify(skills),
        personajeId
    );
}

function actualizarEstadisticas(personajeId, stats) {
    const campos = Object.keys(stats).map(k => `${k} = ${k} + ?`).join(', ');
    const valores = Object.values(stats);

    const stmt = db.prepare(`UPDATE estadisticas SET ${campos} WHERE personaje_id = ?`);
    stmt.run(...valores, personajeId);
}

function obtenerEstadisticas(personajeId) {
    const stmt = db.prepare('SELECT * FROM estadisticas WHERE personaje_id = ?');
    return stmt.get(personajeId);
}

module.exports = {
    crearUsuario,
    loginUsuario,
    crearPersonaje,
    obtenerPersonajes,
    obtenerPersonaje,
    guardarProgreso,
    actualizarEstadisticas,
    obtenerEstadisticas,
    db
};
