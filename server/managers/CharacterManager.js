/**
 * CharacterManager
 * Gestiona múltiples personajes por cuenta:
 * - Crear nuevos personajes
 * - Listar personajes de una cuenta
 * - Seleccionar personaje activo
 * - Borrar personajes
 * - Actualizar stats y progreso
 */

const db = require('../db');

class CharacterManager {
    constructor() {
        // Mapa de personajes activos en línea: { characterId: characterData }
        this.activeCharacters = new Map();

        // Mapa de cuenta -> personaje activo: { accountId: characterId }
        this.accountActiveCharacter = new Map();

        // Razas disponibles
        this.races = {
            humano: { nombre: 'Humano', bonificaciones: { carisma: 1 } },
            elfo: { nombre: 'Elfo', bonificaciones: { destreza: 2 } },
            enano: { nombre: 'Enano', bonificaciones: { constitucion: 2 } },
            orco: { nombre: 'Orco', bonificaciones: { fuerza: 2 } }
        };

        // Clases disponibles
        this.classes = {
            guerrero: {
                nombre: 'Guerrero',
                salud_base: 120,
                mana_base: 30,
                stats_base: { fuerza: 15, constitucion: 14, destreza: 10 }
            },
            mago: {
                nombre: 'Mago',
                salud_base: 80,
                mana_base: 100,
                stats_base: { inteligencia: 16, sabiduria: 12, destreza: 8 }
            },
            clerigo: {
                nombre: 'Clérigo',
                salud_base: 100,
                mana_base: 70,
                stats_base: { sabiduria: 15, constitucion: 12, carisma: 12 }
            },
            picaro: {
                nombre: 'Pícaro',
                salud_base: 90,
                mana_base: 50,
                stats_base: { destreza: 16, inteligencia: 11, carisma: 10 }
            }
        };
    }

    /**
     * Crear nuevo personaje para una cuenta
     */
    async createCharacter(accountId, data) {
        const { nombre, raza, clase, apariencia } = data;

        // Validaciones
        if (!nombre || nombre.length < 3 || nombre.length > 20) {
            return { success: false, error: 'Nombre inválido (3-20 caracteres)' };
        }

        if (!this.races[raza]) {
            return { success: false, error: 'Raza inválida' };
        }

        if (!this.classes[clase]) {
            return { success: false, error: 'Clase inválida' };
        }

        // Verificar que no exista otro personaje con ese nombre en la misma cuenta
        const existing = await db.get(
            'SELECT id FROM characters WHERE account_id = ? AND nombre = ?',
            [accountId, nombre]
        );

        if (existing) {
            return { success: false, error: 'Ya tienes un personaje con ese nombre' };
        }

        // Verificar límite de personajes por cuenta (ej: 5 máximo)
        const count = await db.get(
            'SELECT COUNT(*) as total FROM characters WHERE account_id = ?',
            [accountId]
        );

        if (count.total >= 5) {
            return { success: false, error: 'Límite de personajes alcanzado (máximo 5)' };
        }

        // Calcular stats iniciales
        const classData = this.classes[clase];
        const raceData = this.races[raza];

        const stats = {
            fuerza: (classData.stats_base.fuerza || 10) + (raceData.bonificaciones.fuerza || 0),
            destreza: (classData.stats_base.destreza || 10) + (raceData.bonificaciones.destreza || 0),
            constitucion: (classData.stats_base.constitucion || 10) + (raceData.bonificaciones.constitucion || 0),
            inteligencia: (classData.stats_base.inteligencia || 10) + (raceData.bonificaciones.inteligencia || 0),
            sabiduria: (classData.stats_base.sabiduria || 10) + (raceData.bonificaciones.sabiduria || 0),
            carisma: (classData.stats_base.carisma || 10) + (raceData.bonificaciones.carisma || 0)
        };

        const saludMax = classData.salud_base;
        const manaMax = classData.mana_base;

        // Apariencia por defecto si no se proporciona
        const defaultApariencia = {
            color_pelo: 'castano',
            color_ojos: 'marron',
            altura: 'medio',
            descripcion: ''
        };

        const finalApariencia = apariencia ? { ...defaultApariencia, ...apariencia } : defaultApariencia;

        // Insertar en DB
        const result = await db.run(`
      INSERT INTO characters (
        account_id, nombre, raza, clase,
        fuerza, destreza, constitucion, inteligencia, sabiduria, carisma,
        salud, salud_max, mana, mana_max,
        apariencia, last_played
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
            accountId, nombre, raza, clase,
            stats.fuerza, stats.destreza, stats.constitucion,
            stats.inteligencia, stats.sabiduria, stats.carisma,
            saludMax, saludMax, manaMax, manaMax,
            JSON.stringify(finalApariencia)
        ]);

        const character = await this.getCharacter(result.lastID);

        console.log(`✨ Nuevo personaje creado: ${nombre} (${raza} ${clase})`);

        return {
            success: true,
            character
        };
    }

    /**
     * Obtener un personaje por ID
     */
    async getCharacter(characterId) {
        const row = await db.get('SELECT * FROM characters WHERE id = ?', [characterId]);

        if (!row) return null;

        return this.formatCharacter(row);
    }

    /**
     * Formatear datos de personaje desde DB
     */
    formatCharacter(row) {
        return {
            id: row.id,
            account_id: row.account_id,
            nombre: row.nombre,
            raza: row.raza,
            clase: row.clase,
            nivel: row.nivel,
            experiencia: row.experiencia,
            stats: {
                fuerza: row.fuerza,
                destreza: row.destreza,
                constitucion: row.constitucion,
                inteligencia: row.inteligencia,
                sabiduria: row.sabiduria,
                carisma: row.carisma
            },
            salud: row.salud,
            salud_max: row.salud_max,
            mana: row.mana,
            mana_max: row.mana_max,
            energia: row.energia,
            energia_max: row.energia_max,
            oro: row.oro,
            inventario: JSON.parse(row.inventario || '[]'),
            equipo: {
                arma: row.equipo_arma ? JSON.parse(row.equipo_arma) : null,
                armadura: row.equipo_armadura ? JSON.parse(row.equipo_armadura) : null,
                accesorio1: row.equipo_accesorio1 ? JSON.parse(row.equipo_accesorio1) : null,
                accesorio2: row.equipo_accesorio2 ? JSON.parse(row.equipo_accesorio2) : null
            },
            zona_actual: row.zona_actual,
            apariencia: JSON.parse(row.apariencia || '{}'),
            created_at: row.created_at,
            last_played: row.last_played
        };
    }

    /**
     * Listar todos los personajes de una cuenta
     */
    async getCharactersByAccount(accountId) {
        const rows = await db.all(
            'SELECT * FROM characters WHERE account_id = ? ORDER BY last_played DESC',
            [accountId]
        );

        return rows.map(row => this.formatCharacter(row));
    }

    /**
     * Seleccionar personaje activo para jugar
     */
    async selectCharacter(accountId, characterId) {
        const character = await this.getCharacter(characterId);

        if (!character) {
            return { success: false, error: 'Personaje no encontrado' };
        }

        if (character.account_id !== accountId) {
            return { success: false, error: 'Este personaje no te pertenece' };
        }

        // Actualizar last_played
        await db.run(
            'UPDATE characters SET last_played = CURRENT_TIMESTAMP WHERE id = ?',
            [characterId]
        );

        // Guardar como personaje activo
        this.activeCharacters.set(characterId, character);
        this.accountActiveCharacter.set(accountId, characterId);

        console.log(`🎮 ${character.nombre} seleccionado para cuenta ${accountId}`);

        return {
            success: true,
            character
        };
    }

    /**
     * Borrar personaje
     */
    async deleteCharacter(accountId, characterId) {
        const character = await this.getCharacter(characterId);

        if (!character) {
            return { success: false, error: 'Personaje no encontrado' };
        }

        if (character.account_id !== accountId) {
            return { success: false, error: 'Este personaje no te pertenece' };
        }

        // Remover de activos
        this.activeCharacters.delete(characterId);
        if (this.accountActiveCharacter.get(accountId) === characterId) {
            this.accountActiveCharacter.delete(accountId);
        }

        // Borrar de DB (CASCADE borrará quests asociadas, etc)
        await db.run('DELETE FROM characters WHERE id = ?', [characterId]);

        console.log(`🗑️ Personaje ${character.nombre} eliminado`);

        return { success: true };
    }

    /**
     * Actualizar stats de personaje
     */
    async updateCharacter(characterId, updates) {
        const fields = [];
        const values = [];

        // Solo actualizar campos permitidos
        const allowedFields = [
            'salud', 'mana', 'energia', 'oro', 'experiencia', 'nivel',
            'zona_actual', 'inventario', 'equipo_arma', 'equipo_armadura'
        ];

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                fields.push(`${key} = ?`);

                // Si es objeto/array, convertir a JSON
                if (typeof value === 'object') {
                    values.push(JSON.stringify(value));
                } else {
                    values.push(value);
                }
            }
        }

        if (fields.length === 0) return;

        values.push(characterId);

        await db.run(
            `UPDATE characters SET ${fields.join(', ')} WHERE id = ?`,
            values
        );

        // Actualizar en memoria si está activo
        if (this.activeCharacters.has(characterId)) {
            const character = await this.getCharacter(characterId);
            this.activeCharacters.set(characterId, character);
        }
    }

    /**
     * Dar experiencia y manejar subidas de nivel
     */
    async giveExperience(characterId, xp) {
        const character = await this.getCharacter(characterId);

        if (!character) return null;

        character.experiencia += xp;

        // Sistema de niveles: 100 XP por nivel
        const xpPorNivel = 100;
        const leveledUp = [];

        while (character.experiencia >= xpPorNivel * character.nivel) {
            character.nivel++;

            // Subir stats al subir nivel
            character.salud_max += 10;
            character.mana_max += 5;
            character.salud = character.salud_max;
            character.mana = character.mana_max;

            leveledUp.push(character.nivel);

            console.log(`🎉 ${character.nombre} subió a nivel ${character.nivel}`);
        }

        // Actualizar DB
        await this.updateCharacter(characterId, {
            experiencia: character.experiencia,
            nivel: character.nivel,
            salud: character.salud,
            salud_max: character.salud_max,
            mana: character.mana,
            mana_max: character.mana_max
        });

        return {
            newXP: character.experiencia,
            newLevel: character.nivel,
            leveledUp: leveledUp.length > 0,
            levels: leveledUp
        };
    }

    /**
     * Obtener personaje activo de una cuenta
     */
    getActiveCharacter(accountId) {
        const characterId = this.accountActiveCharacter.get(accountId);
        return characterId ? this.activeCharacters.get(characterId) : null;
    }

    /**
     * Desconectar personaje (logout)
     */
    disconnectCharacter(characterId) {
        const character = this.activeCharacters.get(characterId);

        if (character) {
            this.activeCharacters.delete(characterId);
            this.accountActiveCharacter.delete(character.account_id);

            console.log(`👋 ${character.nombre} se desconectó`);
        }
    }

    /**
     * Obtener información de razas y clases disponibles
     */
    getCharacterOptions() {
        return {
            races: Object.entries(this.races).map(([id, data]) => ({
                id,
                nombre: data.nombre,
                bonificaciones: data.bonificaciones
            })),
            classes: Object.entries(this.classes).map(([id, data]) => ({
                id,
                nombre: data.nombre,
                salud_base: data.salud_base,
                mana_base: data.mana_base,
                descripcion: `Stats base: ${Object.entries(data.stats_base).map(([k, v]) => `${k}:${v}`).join(', ')}`
            }))
        };
    }

    /**
     * Obtener estadísticas generales
     */
    getStats() {
        return {
            characters_online: this.activeCharacters.size,
            accounts_online: this.accountActiveCharacter.size
        };
    }
}

// Singleton
const characterManager = new CharacterManager();

module.exports = characterManager;
