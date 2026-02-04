/**
 * Database Module - CommonJS version con Promises
 * Usa better-sqlite3 con wrappers async para compatibilidad
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../../manolitri_v2.db');
const db = new Database(dbPath);

// Habilitar foreign keys
db.pragma('foreign_keys = ON');

// Wrapper para promisificar operaciones
const dbAsync = {
    // SELECT que devuelve una fila
    get(sql, params = []) {
        return Promise.resolve(db.prepare(sql).get(params));
    },

    // SELECT que devuelve todas las filas
    all(sql, params = []) {
        return Promise.resolve(db.prepare(sql).all(params));
    },

    // INSERT, UPDATE, DELETE
    run(sql, params = []) {
        return Promise.resolve(db.prepare(sql).run(params));
    },

    // Cerrar base de datos
    close() {
        return Promise.resolve(db.close());
    }
};

// Inicializar base de datos
async function initialize() {
    console.log('📦 Inicializando base de datos...');

    try {
        // Cargar schema principal
        const schemaPath = path.join(__dirname, 'schema_v2.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        db.exec(schema);
        console.log('✓ Schema cargado');

        // Cargar datos adicionales
        const dataPath = path.join(__dirname, 'data.sql');
        if (fs.existsSync(dataPath)) {
            const data = fs.readFileSync(dataPath, 'utf-8');
            db.exec(data);
            console.log('✓ Datos adicionales cargados');
        }

        console.log('✅ Base de datos inicializada correctamente');

    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
        throw error;
    }
}

module.exports = {
    ...dbAsync,
    initialize
};
