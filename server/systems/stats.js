import db from '../db/index.js';

class StatsManager {
    // Stats iniciales por defecto
    static DEFAULT_STATS = {
        // Físicos
        salud: 100,
        salud_max: 100,
        energia: 100,
        energia_max: 100,
        resistencia: 5,
        fuerza: 5,
        defensa: 5,
        velocidad: 5,
        // Sociales
        carisma: 5,
        empatia: 5,
        intimidacion: 5,
        astucia: 5,
        // Otros
        percepcion: 5,
        suerte: 5,
        estres: 0
    };

    static DEFAULT_EMOTIONS = {
        miedo: 3,
        confianza: 5,
        esperanza: 5,
        desesperacion: 2
    };

    // Obtener stats de jugador
    getPlayerStats(playerId) {
        const player = db.prepare('SELECT stats, estado_emocional FROM players WHERE id = ?').get(playerId);
        if (!player) return null;

        return {
            stats: JSON.parse(player.stats),
            emociones: JSON.parse(player.estado_emocional)
        };
    }

    // Actualizar stats
    updateStats(playerId, statsChanges) {
        const current = this.getPlayerStats(playerId);
        if (!current) return false;

        const newStats = { ...current.stats };

        // Aplicar cambios
        for (const [stat, change] of Object.entries(statsChanges)) {
            if (newStats[stat] !== undefined) {
                newStats[stat] += change;

                // Límites
                if (stat === 'salud') {
                    newStats[stat] = Math.max(0, Math.min(newStats.salud_max || 100, newStats[stat]));
                } else if (stat === 'energia') {
                    newStats[stat] = Math.max(0, Math.min(newStats.energia_max || 100, newStats[stat]));
                } else if (stat === 'estres') {
                    newStats[stat] = Math.max(0, Math.min(100, newStats[stat]));
                } else if (['salud_max', 'energia_max'].includes(stat)) {
                    newStats[stat] = Math.max(50, Math.min(200, newStats[stat]));
                } else {
                    // Stats de habilidad (1-20)
                    newStats[stat] = Math.max(1, Math.min(20, newStats[stat]));
                }
            }
        }

        db.prepare('UPDATE players SET stats = ? WHERE id = ?').run(JSON.stringify(newStats), playerId);
        return true;
    }

    // Actualizar emociones
    updateEmotions(playerId, emotionChanges) {
        const current = this.getPlayerStats(playerId);
        if (!current) return false;

        const newEmotions = { ...current.emociones };

        for (const [emotion, change] of Object.entries(emotionChanges)) {
            if (newEmotions[emotion] !== undefined) {
                newEmotions[emotion] += change;
                newEmotions[emotion] = Math.max(0, Math.min(10, newEmotions[emotion]));
            }
        }

        db.prepare('UPDATE players SET estado_emocional = ? WHERE id = ?').run(JSON.stringify(newEmotions), playerId);
        return true;
    }

    // Calcular modificador basado en emociones
    getEmotionalModifier(playerId) {
        const { emociones } = this.getPlayerStats(playerId);

        let modifier = 0;

        // Alta esperanza = bonificación
        if (emociones.esperanza > 7) modifier += 2;

        // Alto miedo = penalización
        if (emociones.miedo > 8) modifier -= 3;

        // Alta confianza = bonificación
        if (emociones.confianza > 7) modifier += 1;

        // Alta desesperación = penalización fuerte
        if (emociones.desesperacion > 8) modifier -= 4;

        return modifier;
    }

    // Verificar si el jugador cumple requisitos
    checkRequirement(playerId, requisito) {
        if (!requisito.stat) return true; // Sin requisito

        const { stats } = this.getPlayerStats(playerId);
        return stats[requisito.stat] >= requisito.minimo;
    }

    // Subir de nivel
    addExperience(playerId, xp) {
        const player = db.prepare('SELECT nivel, experiencia FROM players WHERE id = ?').get(playerId);
        if (!player) return;

        let newXP = player.experiencia + xp;
        let newLevel = player.nivel;

        // Sistema de nivel simple: cada 100 XP = 1 nivel
        while (newXP >= 100) {
            newXP -= 100;
            newLevel++;

            // Al subir nivel, mejora un stat aleatorio
            this.levelUpBonus(playerId);
        }

        db.prepare('UPDATE players SET nivel = ?, experiencia = ? WHERE id = ?').run(newLevel, newXP, playerId);

        return { nivel: newLevel, experiencia: newXP };
    }

    // Bonificación al subir nivel
    levelUpBonus(playerId) {
        const stats = ['resistencia', 'carisma', 'empatia', 'intimidacion', 'astucia'];
        const randomStat = stats[Math.floor(Math.random() * stats.length)];

        this.updateStats(playerId, { [randomStat]: 1 });
    }

    // Actualizar reputación
    updateReputation(playerId, change) {
        db.prepare('UPDATE players SET reputacion = reputacion + ? WHERE id = ?').run(change, playerId);
    }

    // Verificar si jugador está vivo
    isAlive(playerId) {
        const { stats } = this.getPlayerStats(playerId);
        return stats.salud > 0;
    }

    // Curar jugador
    heal(playerId, amount) {
        this.updateStats(playerId, { salud: amount });
    }

    // Causar daño
    damage(playerId, amount) {
        this.updateStats(playerId, { salud: -amount });
    }
}

export default new StatsManager();
