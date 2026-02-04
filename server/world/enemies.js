import db from '../db/index.js';

class EnemyManager {
    // Obtener tipo de enemigo
    getEnemyType(enemyTypeId) {
        const enemy = db.prepare('SELECT * FROM enemy_types WHERE id = ?').get(enemyTypeId);
        if (!enemy) return null;

        return {
            ...enemy,
            stats: JSON.parse(enemy.stats),
            loot: JSON.parse(enemy.loot)
        };
    }

    // Obtener todos los tipos de enemigos
    getAllEnemyTypes() {
        const enemies = db.prepare('SELECT * FROM enemy_types').all();
        return enemies.map(e => ({
            ...e,
            stats: JSON.parse(e.stats),
            loot: JSON.parse(e.loot)
        }));
    }

    // Spawnear enemigo en una locación
    spawnEnemy(enemyTypeId, lugar) {
        const enemyType = this.getEnemyType(enemyTypeId);
        if (!enemyType) return null;

        const result = db.prepare(`
      INSERT INTO active_enemies (enemy_type_id, lugar, salud_actual)
      VALUES (?, ?, ?)
    `).run(enemyTypeId, lugar, enemyType.stats.salud);

        return {
            id: result.lastInsertRowid,
            ...enemyType,
            salud_actual: enemyType.stats.salud,
            lugar
        };
    }

    // Obtener enemigos activos en una locación
    getEnemiesInLocation(lugar) {
        const enemies = db.prepare(`
      SELECT ae.*, et.*
      FROM active_enemies ae
      JOIN enemy_types et ON ae.enemy_type_id = et.id
      WHERE ae.lugar = ?
    `).all(lugar);

        return enemies.map(e => ({
            id: e.id,
            enemy_type_id: e.enemy_type_id,
            nombre: e.nombre,
            descripcion: e.descripcion,
            nivel: e.nivel,
            stats: JSON.parse(e.stats),
            salud_actual: e.salud_actual,
            en_combate_con: e.en_combate_con,
            lugar: e.lugar,
            comportamiento: e.comportamiento,
            loot: JSON.parse(e.loot),
            oro_min: e.oro_min,
            oro_max: e.oro_max,
            experiencia: e.experiencia
        }));
    }

    // Obtener enemigo activo por ID
    getActiveEnemy(enemyId) {
        const enemy = db.prepare(`
      SELECT ae.*, et.*
      FROM active_enemies ae
      JOIN enemy_types et ON ae.enemy_type_id = et.id
      WHERE ae.id = ?
    `).get(enemyId);

        if (!enemy) return null;

        return {
            id: enemy.id,
            enemy_type_id: enemy.enemy_type_id,
            nombre: enemy.nombre,
            descripcion: enemy.descripcion,
            nivel: enemy.nivel,
            stats: JSON.parse(enemy.stats),
            salud_actual: enemy.salud_actual,
            en_combate_con: enemy.en_combate_con,
            lugar: enemy.lugar,
            comportamiento: enemy.comportamiento,
            loot: JSON.parse(enemy.loot),
            oro_min: enemy.oro_min,
            oro_max: enemy.oro_max,
            experiencia: enemy.experiencia
        };
    }

    // Marcar enemigo como en combate
    setInCombat(enemyId, playerId) {
        db.prepare('UPDATE active_enemies SET en_combate_con = ? WHERE id = ?')
            .run(playerId, enemyId);
    }

    // Actualizar salud del enemigo
    updateEnemyHealth(enemyId, newHealth) {
        db.prepare('UPDATE active_enemies SET salud_actual = ? WHERE id = ?')
            .run(newHealth, enemyId);

        // Si murió, eliminarlo
        if (newHealth <= 0) {
            this.removeEnemy(enemyId);
            return true; // enemigo muerto
        }
        return false;
    }

    // Eliminar enemigo
    removeEnemy(enemyId) {
        db.prepare('DELETE FROM active_enemies WHERE id = ?').run(enemyId);
    }

    // Generar loot al matar enemigo
    generateLoot(enemy) {
        const loot = [];

        // Generar oro
        const oro = Math.floor(Math.random() * (enemy.oro_max - enemy.oro_min + 1)) + enemy.oro_min;

        // Generar items
        for (const lootItem of enemy.loot) {
            const rand = Math.random();
            if (rand <= lootItem.probabilidad) {
                const cantidad = Math.floor(Math.random() * (lootItem.cantidad_max - lootItem.cantidad_min + 1)) + lootItem.cantidad_min;
                loot.push({
                    item_id: lootItem.item_id,
                    cantidad
                });
            }
        }

        return { oro, items: loot, experiencia: enemy.experiencia };
    }

    // Sistema de spawn automático
    autoSpawnEnemies() {
        const locations = [
            { id: 'hospital', peligro: 3 },
            { id: 'calle_norte', peligro: 4 },
            { id: 'calle_sur', peligro: 5 }
        ];

        for (const location of locations) {
            const currentEnemies = this.getEnemiesInLocation(location.id);
            const maxEnemies = location.peligro;

            // Si hay menos enemigos del máximo, spawnear más
            if (currentEnemies.length < maxEnemies) {
                const enemyTypes = this.getSpawnableEnemiesForLocation(location);
                if (enemyTypes.length > 0) {
                    const randomEnemy = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
                    this.spawnEnemy(randomEnemy, location.id);
                }
            }
        }
    }

    // Obtener enemigos que pueden spawnear en una locación
    getSpawnableEnemiesForLocation(location) {
        const enemyPool = {
            'hospital': ['enemy_zombie_debil', 'enemy_zombie', 'enemy_zombie_fuerte'],
            'calle_norte': ['enemy_zombie', 'enemy_saqueador', 'enemy_perro_salvaje'],
            'calle_sur': ['enemy_zombie', 'enemy_zombie_fuerte', 'enemy_perro_salvaje'],
            'mercado': ['enemy_zombie_debil', 'enemy_zombie'],
            'refugio': [] // Sin spawn en refugio
        };

        return enemyPool[location.id] || [];
    }

    // Iniciar sistema de spawn automático
    startAutoSpawn() {
        // Spawn inicial
        this.autoSpawnEnemies();

        // Spawn cada 2-3 minutos
        setInterval(() => {
            this.autoSpawnEnemies();
        }, Math.random() * 60000 + 120000); // 2-3 minutos

        console.log('✓ Sistema de spawn de enemigos iniciado');
    }
}

export default new EnemyManager();
