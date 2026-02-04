import db from '../db/index.js';
import enemyManager from '../world/enemies.js';
import inventoryManager from './inventory.js';
import statsManager from './stats.js';

class CombatManager {
    // Iniciar combate entre jugador y enemigo
    startCombat(playerId, enemyId) {
        const enemy = enemyManager.getActiveEnemy(enemyId);
        if (!enemy) return { success: false, error: 'Enemigo no encontrado' };

        if (enemy.en_combate_con && enemy.en_combate_con !== playerId) {
            return { success: false, error: 'Ese enemigo ya está en combate' };
        }

        // Marcar jugador en combate
        db.prepare('UPDATE players SET en_combate = 1 WHERE id = ?').run(playerId);

        // Marcar enemigo en combate
        enemyManager.setInCombat(enemyId, playerId);

        return {
            success: true,
            enemy,
            mensaje: `¡Combate iniciado con ${enemy.nombre}!`
        };
    }

    // Atacar enemigo
    async attackEnemy(playerId, enemyId) {
        const enemy = enemyManager.getActiveEnemy(enemyId);
        if (!enemy) return { success: false, error: 'Enemigo no encontrado' };

        // Obtener stats del jugador (con bonificaciones de equipo)
        const playerStats = await inventoryManager.getTotalStats(playerId);

        // Calcular daño del jugador
        const baseDamage = playerStats.fuerza;
        const critChance = playerStats.suerte / 100;
        const isCrit = Math.random() < critChance;
        const damageMultiplier = isCrit ? 2 : 1;
        const randomFactor = 0.8 + (Math.random() * 0.4); // 80% - 120%

        let playerDamage = Math.floor(baseDamage * damageMultiplier * randomFactor);

        // Defensa del enemigo reduce daño
        playerDamage = Math.max(1, playerDamage - enemy.stats.defensa);

        // Aplicar daño al enemigo
        const newEnemyHealth = enemy.salud_actual - playerDamage;
        const enemyDied = enemyManager.updateEnemyHealth(enemyId, newEnemyHealth);

        let resultado = {
            success: true,
            playerDamage,
            isCrit,
            enemyHealth: Math.max(0, newEnemyHealth),
            enemyDied
        };

        // Si el enemigo murió
        if (enemyDied) {
            const loot = enemyManager.generateLoot(enemy);

            // Dar recompensas
            if (loot.oro > 0) {
                inventoryManager.addGold(playerId, loot.oro);
            }

            for (const item of loot.items) {
                inventoryManager.addItem(playerId, item.item_id, item.cantidad);
            }

            statsManager.addExperience(playerId, loot.experiencia);

            // Terminar combate
            db.prepare('UPDATE players SET en_combate = 0 WHERE id = ?').run(playerId);

            resultado.loot = loot;
            resultado.mensaje = `¡Has derrotado a ${enemy.nombre}!`;
            return resultado;
        }

        // Contraataque del enemigo
        const enemyDamage = this.calculateEnemyDamage(enemy, playerStats);
        statsManager.updateStats(playerId, { salud: -enemyDamage });

        // Verificar si el jugador murió
        const playerStats2 = statsManager.getPlayerStats(playerId);
        if (playerStats2.stats.salud <= 0) {
            this.playerDeath(playerId);
            resultado.playerDied = true;
            resultado.mensaje = `Has sido derrotado por ${enemy.nombre}...`;
        }

        resultado.enemyDamage = enemyDamage;
        return resultado;
    }

    // Calcular daño del enemigo
    calculateEnemyDamage(enemy, playerStats) {
        const baseDamage = enemy.stats.fuerza;
        const randomFactor = 0.8 + (Math.random() * 0.4);
        let damage = Math.floor(baseDamage * randomFactor);

        // Defensa del jugador reduce daño
        damage = Math.max(1, damage - (playerStats.defensa || 5));

        return damage;
    }

    // Huir del combate
    async fleeCombat(playerId, enemyId) {
        const playerStats = statsManager.getPlayerStats(playerId);
        const enemy = enemyManager.getActiveEnemy(enemyId);

        if (!enemy) return { success: false, error: 'Enemigo no encontrado' };

        // Chance de escape basada en velocidad
        const fleeChance = Math.min(0.9, (playerStats.stats.velocidad || 5) / ((playerStats.stats.velocidad || 5) + enemy.stats.velocidad));
        const escaped = Math.random() < fleeChance;

        if (escaped) {
            // Terminar combate
            db.prepare('UPDATE players SET en_combate = 0 WHERE id = ?').run(playerId);
            db.prepare('UPDATE active_enemies SET en_combate_con = NULL WHERE id = ?').run(enemyId);

            return {
                success: true,
                escaped: true,
                mensaje: '¡Lograste escapar!'
            };
        } else {
            // Intento fallido - el enemigo ataca
            const playerStatsTotal = await inventoryManager.getTotalStats(playerId);
            const enemyDamage = this.calculateEnemyDamage(enemy, playerStatsTotal);
            statsManager.updateStats(playerId, { salud: -enemyDamage });

            return {
                success: true,
                escaped: false,
                enemyDamage,
                mensaje: '¡No pudiste escapar! El enemigo te alcanzó.'
            };
        }
    }

    // Muerte del jugador
    playerDeath(playerId) {
        // Terminar combate
        db.prepare('UPDATE players SET en_combate = 0 WHERE id = ?').run(playerId);

        // Penalización por muerte
        const player = db.prepare('SELECT oro FROM players WHERE id = ?').get(playerId);
        const goldLost = Math.floor(player.oro * 0.2); // Pierde 20% del oro

        db.prepare('UPDATE players SET oro = oro - ? WHERE id = ?').run(goldLost, playerId);

        // Revivir con poca salud
        statsManager.updateStats(playerId, { salud: 1000 }); // Resetea a máximo primero
        const playerStats = statsManager.getPlayerStats(playerId);
        const newHealth = Math.floor(playerStats.stats.salud_max * 0.3);
        statsManager.updateStats(playerId, { salud: -(playerStats.stats.salud - newHealth) });

        // Aumentar estrés
        statsManager.updateStats(playerId, { estres: 30 });

        return {
            goldLost,
            mensaje: 'Has sido derrotado. Perdiste parte de tu oro y te recuperas en el refugio.'
        };
    }

    // Defender (reduce daño recibido el próximo turno)
    defend(playerId) {
        // Esto se puede implementar con un sistema de turnos más complejo
        // Por ahora, simplemente termina el combate y da un bonus temporal
        return {
            success: true,
            mensaje: 'Te preparas para defender el próximo ataque'
        };
    }

    // Usar item en combate
    async useCombatItem(playerId, itemId) {
        const result = await inventoryManager.useItem(playerId, itemId);
        return result;
    }

    // Verificar si jugador está en combate
    isInCombat(playerId) {
        const player = db.prepare('SELECT en_combate FROM players WHERE id = ?').get(playerId);
        return player && player.en_combate === 1;
    }

    // Terminar combate forzosamente (si jugador se desconecta, etc)
    endCombat(playerId) {
        db.prepare('UPDATE players SET en_combate = 0 WHERE id = ?').run(playerId);
        db.prepare('UPDATE active_enemies SET en_combate_con = NULL WHERE en_combate_con = ?').run(playerId);
    }
}

export default new CombatManager();
