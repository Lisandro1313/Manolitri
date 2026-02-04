# MANOLITRI - ARQUITECTURA V3

## Sistema Unificado y Escalable

### FILOSOFÍA

**TODO ES UN OBJETO CON PROPIEDADES**

- Cada sistema tiene responsabilidades claras
- Todo se comunica via eventos
- Estado centralizado y visible
- Escalable a 1000+ items/quests/NPCs

---

## 1. SISTEMA DE ITEMS (ItemSystem)

### Propiedades de un Item:

```javascript
{
  id: 'item_medicina',
  nombre: 'Medicina',
  tipo: 'consumible', // consumible, arma, armor, quest_item
  descripcion: 'Antibióticos del Dr. Gómez',
  stackable: true,
  max_stack: 10,
  valor: 50,
  propiedades: {
    cura: 50,
    quest_item: true // No se puede vender/tirar
  }
}
```

### Operaciones:

- `ItemSystem.give(playerId, itemId, cantidad)` → Da item, actualiza inventario
- `ItemSystem.remove(playerId, itemId, cantidad)` → Quita item
- `ItemSystem.has(playerId, itemId, cantidad)` → Verifica si tiene
- `ItemSystem.getInventory(playerId)` → Lista todo el inventario

### Eventos emitidos:

- `item.obtained` → {playerId, itemId, cantidad}
- `item.removed` → {playerId, itemId, cantidad}
- `item.used` → {playerId, itemId}

---

## 2. SISTEMA DE QUESTS (QuestSystem)

### Estados de una Quest:

```
not_started → offered → active → completed → failed
```

### Propiedades de una Quest:

```javascript
{
  id: 102,
  titulo: 'Medicina para Teresa',
  estado: 'active', // POR JUGADOR
  objetivos: [
    {
      id: 'obj_1',
      tipo: 'hablar_npc',
      target: 'npc_dr_gomez',
      completado: false
    },
    {
      id: 'obj_2',
      tipo: 'obtener_item',
      item: 'item_medicina',
      cantidad: 1,
      completado: false
    },
    {
      id: 'obj_3',
      tipo: 'entregar_item',
      npc: 'npc_ana',
      item: 'item_medicina',
      completado: false
    }
  ],
  recompensas: {
    oro: 100,
    exp: 200,
    items: []
  }
}
```

### Operaciones:

- `QuestSystem.offer(playerId, questId)` → Ofrece quest (NPC puede darla)
- `QuestSystem.accept(playerId, questId)` → Acepta quest
- `QuestSystem.updateObjective(playerId, questId, objectiveId)` → Marca objetivo completo
- `QuestSystem.canComplete(playerId, questId)` → ¿Puede entregar?
- `QuestSystem.complete(playerId, questId)` → Completa y da recompensas

### Eventos emitidos:

- `quest.offered` → {playerId, questId}
- `quest.accepted` → {playerId, questId}
- `quest.objective_completed` → {playerId, questId, objectiveId}
- `quest.ready_to_complete` → {playerId, questId} // Todos los obj completos
- `quest.completed` → {playerId, questId}

---

## 3. SISTEMA DE DIÁLOGOS CONDICIONALES

### Propiedades de un Diálogo:

```javascript
{
  id: 'ana_medicina_1',
  npc_id: 'npc_ana',
  texto: '¿Conseguiste la medicina?',
  conditions: {
    quest_state: {
      quest_id: 102,
      state: 'active',
      objective: 'obj_2', // Solo si completó obj 2
      completed: true
    },
    has_item: {
      item: 'item_medicina',
      cantidad: 1
    }
  },
  opciones: [
    {
      texto: '[Dar medicina]',
      requiere: {item: 'item_medicina'},
      accion: {
        tipo: 'entregar_item',
        item: 'item_medicina',
        quest: 102,
        objective: 'obj_3'
      },
      siguiente_dialogo: 'ana_medicina_gracias'
    },
    {
      texto: 'Todavía no la tengo',
      siguiente_dialogo: 'ana_medicina_apurate'
    }
  ]
}
```

### Operaciones:

- `DialogueSystem.getAvailableDialogue(npcId, playerId)` → Devuelve diálogo correcto según condiciones
- `DialogueSystem.executeAction(playerId, action)` → Ejecuta acción (entregar item, etc)

---

## 4. SISTEMA DE CONSECUENCIAS (ConsequenceSystem)

### UN SOLO LUGAR para aplicar consecuencias:

```javascript
ConsequenceSystem.apply(playerId, consecuencias) {
  // Items
  if (consecuencias.items_add) {
    ItemSystem.give(playerId, ...);
  }
  if (consecuencias.items_remove) {
    ItemSystem.remove(playerId, ...);
  }

  // Quests
  if (consecuencias.quest_complete_objective) {
    QuestSystem.updateObjective(...);
  }

  // Relaciones
  if (consecuencias.relacion) {
    RelationshipSystem.change(...);
  }

  // Stats
  if (consecuencias.oro) {
    StatsSystem.addGold(...);
  }

  // Estados de NPCs
  if (consecuencias.npc_state) {
    NPCSystem.setState(...);
  }
}
```

---

## 5. UI SYSTEM

### Paneles necesarios:

1. **Inventario**: Lista de items con cantidades
2. **Quests**:
   - Activas con progreso de objetivos
   - Completadas
   - Disponibles
3. **Relaciones**:
   - Lista de NPCs conocidos
   - Barra de relación (-100 a +100)
   - Estado emocional actual
4. **Stats**:
   - Reputación global
   - Nivel / EXP
   - Oro

---

## FLUJO EJEMPLO: "Medicina para Teresa"

### 1. Ana ofrece quest

```
Player habla con Ana
→ DialogueSystem verifica condiciones
→ Ana dice: "Teresa necesita medicina, habla con Dr. Gómez"
→ [Opción: Aceptar quest]
→ QuestSystem.accept(playerId, 102)
→ Quest estado = 'active', objetivo 1 = 'hablar con Dr. Gómez'
```

### 2. Player habla con Dr. Gómez

```
Player habla con Dr. Gómez
→ DialogueSystem verifica: quest 102 active, objetivo 1 no completo
→ Dr. Gómez: opciones [Pagar 500 oro / Intimidar / Favor]
→ Player elige: Intimidar
→ ConsequenceSystem.apply({
    items_add: [{id: 'item_medicina', cantidad: 1}],
    quest_complete_objective: {quest: 102, obj: 'obj_1'},
    npc_state: {npc: 'npc_dr_gomez', estado: 'humillado'},
    relacion: {npc: 'npc_dr_gomez', change: -20}
  })
→ EventBus.emit('item.obtained', ...)
→ QuestSystem escucha → marca obj_2 completo (obtener medicina)
→ Quest ahora: obj_1 ✓, obj_2 ✓, obj_3 pendiente
```

### 3. Player vuelve con Ana

```
Player habla con Ana
→ DialogueSystem verifica:
   - quest 102 active ✓
   - tiene item_medicina ✓
→ Ana: "¿Conseguiste la medicina?"
→ [Opción: Dar medicina] ← DISPONIBLE
→ Player da medicina
→ ConsequenceSystem.apply({
    items_remove: [{id: 'item_medicina', cantidad: 1}],
    quest_complete_objective: {quest: 102, obj: 'obj_3'}
  })
→ QuestSystem detecta todos los obj completos
→ QuestSystem.complete(playerId, 102)
→ Recompensas: +200 EXP, +100 oro
→ Notificación: "¡Quest completada!"
```

---

## PRIORIDADES DE IMPLEMENTACIÓN

### FASE 1 (AHORA):

1. ItemSystem básico (dar/quitar/verificar items)
2. Inventario en DB (tabla player_inventory)
3. Diálogos condicionales (verificar items/quest state)
4. Sistema de "entregar item" en diálogos

### FASE 2:

1. UI de inventario
2. UI de relaciones
3. Quest objectives tracking visible
4. Notificaciones de progreso

### FASE 3:

1. Sistema de combate escalable
2. Sistema de crafting
3. Economía dinámica
4. Sistema de facciones

---

## RESULTADO FINAL

**Crear una quest nueva = Solo JSON en la DB**

```sql
INSERT INTO quests VALUES (
  106,
  'Nueva Quest',
  'Descripción',
  'narrativa',
  '[
    {"tipo": "hablar_npc", "target": "npc_x"},
    {"tipo": "obtener_item", "item": "item_y", "cantidad": 5},
    {"tipo": "entregar_item", "npc": "npc_z", "item": "item_y"}
  ]',
  '{"oro": 100, "exp": 200}',
  ...
);
```

**Sin código custom. Todo automático.**
