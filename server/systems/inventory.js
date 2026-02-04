import db from '../db/index.js';
import statsManager from './stats.js';

class InventoryManager {
    // Obtener inventario completo de un jugador
    getPlayerInventory(playerId) {
        const items = db.prepare(`
      SELECT pi.*, i.*
      FROM player_inventory pi
      JOIN items i ON pi.item_id = i.id
      WHERE pi.player_id = ?
    `).all(playerId);

        return items.map(item => ({
            inventario_id: item.id,
            item_id: item.item_id,
            nombre: item.nombre,
            descripcion: item.descripcion,
            tipo: item.tipo,
            subtipo: item.subtipo,
            rareza: item.rareza,
            stats: item.stats ? JSON.parse(item.stats) : null,
            peso: item.peso,
            valor: item.valor,
            cantidad: item.cantidad,
            equipado: item.equipado,
            posicion_equipo: item.posicion_equipo,
            durabilidad: item.durabilidad,
            stackable: item.stackable,
            efecto: item.efecto ? JSON.parse(item.efecto) : null
        }));
    }

    // Agregar item al inventario
    addItem(playerId, itemId, cantidad = 1) {
        const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
        if (!item) return { success: false, error: 'Item no existe' };

        // Verificar peso
        const player = db.prepare('SELECT peso_actual, peso_maximo FROM players WHERE id = ?').get(playerId);
        const pesoTotal = player.peso_actual + (item.peso * cantidad);

        if (pesoTotal > player.peso_maximo) {
            return { success: false, error: 'No tienes suficiente espacio en el inventario' };
        }

        // Si es stackable, intentar agregar a stack existente
        if (item.stackable) {
            const existing = db.prepare(`
        SELECT * FROM player_inventory 
        WHERE player_id = ? AND item_id = ? AND equipado = 0
      `).get(playerId, itemId);

            if (existing) {
                const newCantidad = Math.min(existing.cantidad + cantidad, item.max_stack);
                const cantidadAgregada = newCantidad - existing.cantidad;

                db.prepare('UPDATE player_inventory SET cantidad = ? WHERE id = ?')
                    .run(newCantidad, existing.id);

                // Actualizar peso
                db.prepare('UPDATE players SET peso_actual = peso_actual + ? WHERE id = ?')
                    .run(item.peso * cantidadAgregada, playerId);

                return { success: true, cantidad: cantidadAgregada };
            }
        }

        // Agregar nuevo item
        db.prepare(`
      INSERT INTO player_inventory (player_id, item_id, cantidad)
      VALUES (?, ?, ?)
    `).run(playerId, itemId, cantidad);

        // Actualizar peso
        db.prepare('UPDATE players SET peso_actual = peso_actual + ? WHERE id = ?')
            .run(item.peso * cantidad, playerId);

        return { success: true, cantidad };
    }

    // Remover item del inventario
    removeItem(playerId, itemId, cantidad = 1) {
        const inventoryItem = db.prepare(`
      SELECT pi.*, i.peso
      FROM player_inventory pi
      JOIN items i ON pi.item_id = i.id
      WHERE pi.player_id = ? AND pi.item_id = ?
    `).get(playerId, itemId);

        if (!inventoryItem) return { success: false, error: 'No tienes ese item' };
        if (inventoryItem.cantidad < cantidad) return { success: false, error: 'No tienes suficiente cantidad' };

        const newCantidad = inventoryItem.cantidad - cantidad;

        if (newCantidad <= 0) {
            db.prepare('DELETE FROM player_inventory WHERE id = ?').run(inventoryItem.id);
        } else {
            db.prepare('UPDATE player_inventory SET cantidad = ? WHERE id = ?').run(newCantidad, inventoryItem.id);
        }

        // Actualizar peso
        db.prepare('UPDATE players SET peso_actual = peso_actual - ? WHERE id = ?')
            .run(inventoryItem.peso * cantidad, playerId);

        return { success: true };
    }

    // Equipar item
    equipItem(playerId, inventarioId) {
        const item = db.prepare(`
      SELECT pi.*, i.*
      FROM player_inventory pi
      JOIN items i ON pi.item_id = i.id
      WHERE pi.id = ? AND pi.player_id = ?
    `).get(inventarioId, playerId);

        if (!item) return { success: false, error: 'Item no encontrado' };
        if (item.tipo !== 'arma' && item.tipo !== 'armadura') {
            return { success: false, error: 'Este item no se puede equipar' };
        }

        // Determinar posición de equipo
        let posicion;
        if (item.tipo === 'arma') {
            posicion = 'mano_derecha';
        } else if (item.subtipo) {
            posicion = item.subtipo; // 'cabeza', 'torso', etc.
        }

        // Desequipar item en esa posición si existe
        db.prepare('UPDATE player_inventory SET equipado = 0, posicion_equipo = NULL WHERE player_id = ? AND posicion_equipo = ?')
            .run(playerId, posicion);

        // Equipar nuevo item
        db.prepare('UPDATE player_inventory SET equipado = 1, posicion_equipo = ? WHERE id = ?')
            .run(posicion, inventarioId);

        return { success: true, posicion };
    }

    // Desequipar item
    unequipItem(playerId, inventarioId) {
        db.prepare('UPDATE player_inventory SET equipado = 0, posicion_equipo = NULL WHERE id = ? AND player_id = ?')
            .run(inventarioId, playerId);
        return { success: true };
    }

    // Usar item consumible
    useItem(playerId, itemId) {
        const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
        if (!item) return { success: false, error: 'Item no existe' };
        if (item.tipo !== 'consumible') return { success: false, error: 'Este item no se puede usar' };

        // Verificar que el jugador tenga el item
        const hasItem = this.hasItem(playerId, itemId);
        if (!hasItem) return { success: false, error: 'No tienes ese item' };

        // Aplicar efectos
        const efecto = JSON.parse(item.efecto);

        if (efecto.curacion) {
            statsManager.updateStats(playerId, { salud: efecto.curacion });
        }
        if (efecto.energia) {
            statsManager.updateStats(playerId, { energia: efecto.energia });
        }
        if (efecto.estres) {
            statsManager.updateStats(playerId, { estres: efecto.estres });
        }

        // Remover item del inventario
        this.removeItem(playerId, itemId, 1);

        return { success: true, efecto };
    }

    // Verificar si jugador tiene un item
    hasItem(playerId, itemId, cantidad = 1) {
        const item = db.prepare(`
      SELECT SUM(cantidad) as total
      FROM player_inventory
      WHERE player_id = ? AND item_id = ?
    `).get(playerId, itemId);

        return item && item.total >= cantidad;
    }

    // Obtener stats totales con bonificaciones de equipo
    getTotalStats(playerId) {
        const baseStats = statsManager.getPlayerStats(playerId).stats;

        // Obtener items equipados
        const equippedItems = db.prepare(`
      SELECT i.stats
      FROM player_inventory pi
      JOIN items i ON pi.item_id = i.id
      WHERE pi.player_id = ? AND pi.equipado = 1
    `).all(playerId);

        const totalStats = { ...baseStats };

        // Sumar bonificaciones
        for (const item of equippedItems) {
            if (item.stats) {
                const itemStats = JSON.parse(item.stats);
                for (const [stat, value] of Object.entries(itemStats)) {
                    if (totalStats[stat] !== undefined) {
                        totalStats[stat] += value;
                    }
                }
            }
        }

        return totalStats;
    }

    // Obtener oro del jugador
    getGold(playerId) {
        const player = db.prepare('SELECT oro FROM players WHERE id = ?').get(playerId);
        return player ? player.oro : 0;
    }

    // Agregar oro
    addGold(playerId, cantidad) {
        db.prepare('UPDATE players SET oro = oro + ? WHERE id = ?').run(cantidad, playerId);
    }

    // Remover oro
    removeGold(playerId, cantidad) {
        const player = db.prepare('SELECT oro FROM players WHERE id = ?').get(playerId);
        if (player.oro < cantidad) return false;

        db.prepare('UPDATE players SET oro = oro - ? WHERE id = ?').run(cantidad, playerId);
        return true;
    }
}

export default new InventoryManager();
