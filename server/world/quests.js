import db from '../db/index.js';
import inventoryManager from '../systems/inventory.js';
import statsManager from '../systems/stats.js';

class QuestManager {
    // Obtener quest por ID
    getQuest(questId) {
        const quest = db.prepare('SELECT * FROM quests WHERE id = ?').get(questId);
        if (!quest) return null;

        return {
            ...quest,
            objetivos: JSON.parse(quest.objetivos),
            recompensas: JSON.parse(quest.recompensas),
            requisitos: quest.requisitos ? JSON.parse(quest.requisitos) : null
        };
    }

    // Obtener quests disponibles en una ubicación
    getAvailableQuests(ubicacion, playerId) {
        const quests = db.prepare(`
      SELECT * FROM quests 
      WHERE ubicacion = ? AND activa = 1
    `).all(ubicacion);

        const available = [];

        for (const quest of quests) {
            const parsed = this.getQuest(quest.id);

            // Verificar si ya la tiene activa o completada (y no es repetible)
            const playerQuest = db.prepare(`
        SELECT * FROM player_quests 
        WHERE player_id = ? AND quest_id = ?
      `).get(playerId, quest.id);

            if (playerQuest && !parsed.repetible && playerQuest.estado === 'completada') {
                continue; // Ya la completó y no es repetible
            }

            if (playerQuest && playerQuest.estado === 'activa') {
                continue; // Ya la tiene activa
            }

            // Verificar requisitos
            if (parsed.requisitos) {
                if (!this.meetsRequirements(playerId, parsed.requisitos)) {
                    continue;
                }
            }

            available.push(parsed);
        }

        return available;
    }

    // Verificar si el jugador cumple requisitos
    meetsRequirements(playerId, requisitos) {
        const player = db.prepare('SELECT nivel, reputacion FROM players WHERE id = ?').get(playerId);

        if (requisitos.nivel_min && player.nivel < requisitos.nivel_min) {
            return false;
        }

        if (requisitos.reputacion_min && player.reputacion < requisitos.reputacion_min) {
            return false;
        }

        return true;
    }

    // Aceptar quest
    acceptQuest(playerId, questId) {
        const quest = this.getQuest(questId);
        if (!quest) return { success: false, error: 'Quest no existe' };

        // Verificar que no la tenga ya
        const existing = db.prepare(`
      SELECT * FROM player_quests 
      WHERE player_id = ? AND quest_id = ? AND estado = 'activa'
    `).get(playerId, questId);

        if (existing) return { success: false, error: 'Ya tienes esta quest activa' };

        // Verificar requisitos
        if (quest.requisitos && !this.meetsRequirements(playerId, quest.requisitos)) {
            return { success: false, error: 'No cumples los requisitos' };
        }

        // Inicializar progreso
        const progreso = quest.objetivos.map(obj => ({
            tipo: obj.tipo,
            objetivo: obj.objetivo || obj.item || obj.ubicacion,
            actual: 0,
            requerido: obj.cantidad
        }));

        // Crear player_quest
        db.prepare(`
      INSERT INTO player_quests (player_id, quest_id, estado, progreso)
      VALUES (?, ?, 'activa', ?)
    `).run(playerId, questId, JSON.stringify(progreso));

        return {
            success: true,
            quest,
            mensaje: `Quest aceptada: ${quest.titulo}`
        };
    }

    // Obtener quests activas del jugador
    getActiveQuests(playerId) {
        const playerQuests = db.prepare(`
      SELECT pq.*, q.*
      FROM player_quests pq
      JOIN quests q ON pq.quest_id = q.id
      WHERE pq.player_id = ? AND pq.estado = 'activa'
    `).all(playerId);

        return playerQuests.map(pq => ({
            player_quest_id: pq.id,
            quest_id: pq.quest_id,
            titulo: pq.titulo,
            descripcion: pq.descripcion,
            tipo: pq.tipo,
            objetivos: JSON.parse(pq.objetivos),
            progreso: JSON.parse(pq.progreso),
            recompensas: JSON.parse(pq.recompensas),
            aceptada_at: pq.aceptada_at
        }));
    }

    // Actualizar progreso de quest
    updateQuestProgress(playerId, tipo, objetivo, cantidad = 1) {
        const activeQuests = this.getActiveQuests(playerId);
        const completedQuests = [];

        for (const quest of activeQuests) {
            let updated = false;

            // Buscar objetivo que coincida
            for (let i = 0; i < quest.progreso.length; i++) {
                const prog = quest.progreso[i];

                if (prog.tipo === tipo && prog.objetivo === objetivo && prog.actual < prog.requerido) {
                    prog.actual = Math.min(prog.actual + cantidad, prog.requerido);
                    updated = true;
                }
            }

            if (updated) {
                // Guardar progreso actualizado
                db.prepare(`
          UPDATE player_quests 
          SET progreso = ? 
          WHERE player_id = ? AND quest_id = ?
        `).run(JSON.stringify(quest.progreso), playerId, quest.quest_id);

                // Verificar si se completó
                const allComplete = quest.progreso.every(p => p.actual >= p.requerido);
                if (allComplete) {
                    completedQuests.push(quest.quest_id);
                }
            }
        }

        return completedQuests;
    }

    // Verificar y completar quest automáticamente
    checkQuestCompletion(playerId, questId) {
        const quest = this.getQuest(questId);
        if (!quest) return null;

        const playerQuest = db.prepare(`
      SELECT * FROM player_quests 
      WHERE player_id = ? AND quest_id = ? AND estado = 'activa'
    `).get(playerId, questId);

        if (!playerQuest) return null;

        const progreso = typeof playerQuest.progreso === 'string'
            ? JSON.parse(playerQuest.progreso)
            : playerQuest.progreso;

        if (!Array.isArray(progreso)) return null;

        const allComplete = progreso.every(p => p.actual >= p.requerido);

        if (allComplete) {
            return this.completeQuest(playerId, questId);
        }

        return null;
    }

    // Completar quest y dar recompensas
    completeQuest(playerId, questId) {
        const quest = this.getQuest(questId);
        if (!quest) return { success: false, error: 'Quest no existe' };

        const playerQuest = db.prepare(`
      SELECT * FROM player_quests 
      WHERE player_id = ? AND quest_id = ? AND estado = 'activa'
    `).get(playerId, questId);

        if (!playerQuest) return { success: false, error: 'No tienes esta quest activa' };

        const progreso = typeof playerQuest.progreso === 'string'
            ? JSON.parse(playerQuest.progreso)
            : playerQuest.progreso;

        const allComplete = progreso.every(p => p.actual >= p.requerido);

        if (!allComplete) return { success: false, error: 'No has completado todos los objetivos' };

        // Dar recompensas
        const recompensas = quest.recompensas;

        if (recompensas.oro) {
            db.prepare('UPDATE players SET oro = oro + ? WHERE id = ?').run(recompensas.oro, playerId);
        }

        if (recompensas.experiencia) {
            statsManager.addExperience(playerId, recompensas.experiencia);
        }

        if (recompensas.items) {
            for (const item of recompensas.items) {
                inventoryManager.addItem(playerId, item.id, item.cantidad);
            }
        }

        // Marcar como completada
        db.prepare(`
      UPDATE player_quests 
      SET estado = 'completada', completada_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(playerQuest.id);

        return {
            success: true,
            quest,
            recompensas,
            mensaje: `¡Quest completada: ${quest.titulo}!`
        };
    }

    // Abandonar quest
    abandonQuest(playerId, questId) {
        db.prepare(`
      UPDATE player_quests 
      SET estado = 'abandonada' 
      WHERE player_id = ? AND quest_id = ? AND estado = 'activa'
    `).run(playerId, questId);

        return { success: true };
    }

    // SISTEMA DE QUESTS CREADAS POR JUGADORES

    // Crear quest de jugador
    createPlayerQuest(playerId, titulo, descripcion, objetivos, recompensas, ubicacion) {
        // Verificar que el jugador tenga los items/oro de recompensa
        if (recompensas.oro && !inventoryManager.removeGold(playerId, recompensas.oro)) {
            return { success: false, error: 'No tienes suficiente oro para la recompensa' };
        }

        if (recompensas.items) {
            for (const item of recompensas.items) {
                if (!inventoryManager.removeItem(playerId, item.id, item.cantidad).success) {
                    return { success: false, error: 'No tienes todos los items para la recompensa' };
                }
            }
        }

        // Crear quest
        const result = db.prepare(`
      INSERT INTO quests (titulo, descripcion, tipo, creador_id, creador_tipo, objetivos, recompensas, requisitos, repetible, activa, ubicacion)
      VALUES (?, ?, 'jugador', ?, 'player', ?, ?, NULL, 0, 1, ?)
    `).run(titulo, descripcion, playerId, JSON.stringify(objetivos), JSON.stringify(recompensas), ubicacion);

        return {
            success: true,
            questId: result.lastInsertRowid,
            mensaje: '¡Quest creada! Los jugadores podrán aceptarla en tu ubicación.'
        };
    }

    // Obtener quests creadas por jugadores
    getPlayerCreatedQuests(ubicacion) {
        const quests = db.prepare(`
      SELECT q.*, p.alias as creador_alias
      FROM quests q
      JOIN players p ON q.creador_id = p.id
      WHERE q.tipo = 'jugador' AND q.ubicacion = ? AND q.activa = 1
    `).all(ubicacion);

        return quests.map(q => ({
            ...q,
            objetivos: JSON.parse(q.objetivos),
            recompensas: JSON.parse(q.recompensas)
        }));
    }

    // Cancelar quest de jugador (devuelve recompensas)
    cancelPlayerQuest(playerId, questId) {
        const quest = this.getQuest(questId);
        if (!quest || quest.tipo !== 'jugador' || quest.creador_id != playerId) {
            return { success: false, error: 'No puedes cancelar esta quest' };
        }

        // Devolver recompensas
        if (quest.recompensas.oro) {
            inventoryManager.addGold(playerId, quest.recompensas.oro);
        }

        if (quest.recompensas.items) {
            for (const item of quest.recompensas.items) {
                inventoryManager.addItem(playerId, item.id, item.cantidad);
            }
        }

        // Desactivar quest
        db.prepare('UPDATE quests SET activa = 0 WHERE id = ?').run(questId);

        return { success: true, mensaje: 'Quest cancelada y recompensas devueltas' };
    }
}

export default new QuestManager();
