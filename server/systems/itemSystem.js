/**
 * ITEM SYSTEM V3 - Sistema de items real y escalable
 * 
 * RESPONSABILIDADES:
 * - Dar items a jugadores (actualiza inventario)
 * - Quitar items (verifica existencia)
 * - Verificar si jugador tiene items
 * - Gestionar stacks
 * - Emitir eventos para quest system
 */

import db from '../db/index.js';
import eventBus from '../core/EventBus.js';

class ItemSystem {
    /**
     * Dar item a jugador
     */
    give(playerId, itemId, cantidad = 1) {
        // Verificar que el item existe
        const itemDef = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
        if (!itemDef) {
            console.error(`[ItemSystem] Item ${itemId} no existe`);
            return { success: false, error: 'Item no existe' };
        }

        // Verificar si ya tiene el item
        const existing = db.prepare(`
            SELECT * FROM player_inventory 
            WHERE player_id = ? AND item_id = ?
        `).get(playerId, itemId);

        if (existing) {
            // Actualizar cantidad
            const propiedades = JSON.parse(itemDef.propiedades || '{}');
            const maxStack = propiedades.max_stack || 999;
            const newCantidad = Math.min(existing.cantidad + cantidad, maxStack);

            db.prepare(`
                UPDATE player_inventory 
                SET cantidad = ? 
                WHERE player_id = ? AND item_id = ?
            `).run(newCantidad, playerId, itemId);
        } else {
            // Crear nuevo registro
            db.prepare(`
                INSERT INTO player_inventory (player_id, item_id, cantidad)
                VALUES (?, ?, ?)
            `).run(playerId, itemId, cantidad);
        }

        console.log(`[ItemSystem] ${playerId} obtuvo ${cantidad}x ${itemId}`);

        // Emitir evento
        eventBus.emit('item.obtained', {
            playerId,
            itemId,
            cantidad
        });

        return {
            success: true,
            item: itemDef,
            cantidad
        };
    }

    /**
     * Quitar item de jugador
     */
    remove(playerId, itemId, cantidad = 1) {
        const existing = db.prepare(`
            SELECT * FROM player_inventory 
            WHERE player_id = ? AND item_id = ?
        `).get(playerId, itemId);

        if (!existing || existing.cantidad < cantidad) {
            return { success: false, error: 'No tienes suficientes items' };
        }

        const newCantidad = existing.cantidad - cantidad;

        if (newCantidad <= 0) {
            // Eliminar completamente
            db.prepare(`
                DELETE FROM player_inventory 
                WHERE player_id = ? AND item_id = ?
            `).run(playerId, itemId);
        } else {
            // Reducir cantidad
            db.prepare(`
                UPDATE player_inventory 
                SET cantidad = ? 
                WHERE player_id = ? AND item_id = ?
            `).run(newCantidad, playerId, itemId);
        }

        console.log(`[ItemSystem] ${playerId} perdió ${cantidad}x ${itemId}`);

        // Emitir evento
        eventBus.emit('item.removed', {
            playerId,
            itemId,
            cantidad
        });

        return { success: true };
    }

    /**
     * Verificar si jugador tiene item
     */
    has(playerId, itemId, cantidad = 1) {
        const existing = db.prepare(`
            SELECT cantidad FROM player_inventory 
            WHERE player_id = ? AND item_id = ?
        `).get(playerId, itemId);

        return existing && existing.cantidad >= cantidad;
    }

    /**
     * Obtener cantidad de un item
     */
    getQuantity(playerId, itemId) {
        const existing = db.prepare(`
            SELECT cantidad FROM player_inventory 
            WHERE player_id = ? AND item_id = ?
        `).get(playerId, itemId);

        return existing ? existing.cantidad : 0;
    }

    /**
     * Obtener inventario completo del jugador
     */
    getInventory(playerId) {
        const items = db.prepare(`
            SELECT 
                pi.item_id,
                pi.cantidad,
                i.nombre,
                i.tipo,
                i.descripcion,
                i.propiedades
            FROM player_inventory pi
            JOIN items i ON pi.item_id = i.id
            WHERE pi.player_id = ?
        `).all(playerId);

        return items.map(item => ({
            ...item,
            propiedades: JSON.parse(item.propiedades || '{}')
        }));
    }

    /**
     * Usar un item (consumibles, etc)
     */
    use(playerId, itemId) {
        const itemDef = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
        if (!itemDef) return { success: false, error: 'Item no existe' };

        if (!this.has(playerId, itemId, 1)) {
            return { success: false, error: 'No tienes este item' };
        }

        const propiedades = JSON.parse(itemDef.propiedades || '{}');

        // Aplicar efectos según tipo
        if (itemDef.tipo === 'consumible') {
            // Curar, etc
            if (propiedades.cura) {
                // TODO: Aplicar curación cuando tengamos sistema de vida
            }

            // Consumir el item
            this.remove(playerId, itemId, 1);

            eventBus.emit('item.used', {
                playerId,
                itemId
            });

            return {
                success: true,
                mensaje: `Usaste ${itemDef.nombre}`
            };
        }

        return { success: false, error: 'Este item no se puede usar' };
    }
}

// Singleton
const itemSystem = new ItemSystem();

export default itemSystem;
