/**
 * Database Module - ES Module version con Promises
 * Usa better-sqlite3 con wrappers async para compatibilidad
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    // Ejecutar SQL directo (para CREATE TABLE, etc)
    exec(sql) {
        return Promise.resolve(db.exec(sql));
    },

    // Preparar statement (para uso avanzado)
    prepare(sql) {
        return db.prepare(sql);
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
        // Cargar schema principal (con todas las tablas para mundo vivo)
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        db.exec(schema);
        console.log('✓ Schema cargado (locations, npcs, relationships, world_events)');

        // schema.sql ya incluye datos iniciales, no necesitamos data.sql
        // const dataPath = path.join(__dirname, 'data.sql');
        // if (fs.existsSync(dataPath)) {
        //     const data = fs.readFileSync(dataPath, 'utf-8');
        //     db.exec(data);
        //     console.log('✓ Datos adicionales cargados');
        // }

        // Cargar expansión de mundo vivo (NPCs + Locaciones + Relaciones)
        const expansionPath = path.join(__dirname, 'expansion_mundo_vivo.sql');
        if (fs.existsSync(expansionPath)) {
            const expansion = fs.readFileSync(expansionPath, 'utf-8');
            db.exec(expansion);
            console.log('✓ Expansión de Mundo Vivo cargada (15 NPCs, 9 locaciones, relaciones)');
        }

        console.log('✅ Base de datos inicializada correctamente');

    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
        throw error;
    }
}

export default dbAsync;
export { initialize };
