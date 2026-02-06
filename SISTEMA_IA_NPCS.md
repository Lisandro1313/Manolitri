# 🤖 SISTEMA DE IA MEJORADA PARA NPCs

## 🎯 Visión General

Sistema de inteligencia artificial que permite a los NPCs tomar **decisiones autónomas** basadas en su personalidad, relaciones con otros NPCs, memoria de eventos pasados y estado emocional. Los NPCs ahora viven sus propias vidas de forma completamente independiente.

## 🧠 Arquitectura del Sistema

### Sistema de Memoria

Cada NPC mantiene una **memoria de hasta 20 eventos recientes**:

```javascript
{
    type: 'interaction',          // Tipo de memoria
    involvedNpc: 'roberta',       // NPC involucrado
    timestamp: 1234567890,        // Cuándo ocurrió
    interactionType: 'charla'     // Detalles específicos
}
```

**Tipos de memoria:**

- `visited` - Lugares visitados
- `interaction` - Interacciones con otros NPCs
- `romance_attempt` - Intentos románticos
- `fled` - Huidas de enemigos
- `confrontation` - Confrontaciones
- `friendship` - Momentos de amistad
- `rest` - Descansos

### Sistema de Objetivos

NPCs pueden tener objetivos a largo plazo:

```javascript
{
    type: 'seek_romance',
    target: 'roberta',
    startedAt: timestamp
}
```

### Cooldowns de Acciones

Para evitar spam de decisiones: **1 minuto** entre decisiones importantes.

## 🎭 7 Tipos de Acciones Autónomas

### 1. 🚶 MOVERSE (Move)

**Descripción:** El NPC decide cambiar de locación.

**Ponderación por Personalidad:**

```javascript
Base: 30
+ Explorador ≥7: +20
+ Aventurero ≥7: +15
- Paranoico ≥7: -20
+ Cobarde ≥7 (con enemigo cerca): +40
```

**Lógica de Decisión:**

1. **Exploradores** prefieren lugares no visitados recientemente
2. **Carismáticos** van donde hay más gente
3. **Cobardes** huyen si hay enemigos
4. Por defecto: locación aleatoria conectada

**Ejemplo:**

```
🚶 Alberto se movió de Villa Esperanza Centro a Villa Esperanza Mercado
```

### 2. 💬 INTERACTUAR (Interact)

**Descripción:** El NPC inicia una interacción con otro NPC en su locación.

**Ponderación por Personalidad:**

```javascript
Base: 25
+ Carismático ≥7: +25
+ Amigable ≥7: +20
- Tímido ≥7: -20
- Introvertido ≥7: -15
```

**Tipos de Interacción:**

- **Momento romántico** - Si amantes + romántico
- **Actividad conjunta** - Si amigos + amigable
- **Discusión** - Si enemigos + agresivo
- **Charla** - Por defecto

**Elección de Target:**

- Amantes: +50 probabilidad
- Amigos: +30
- Tensión sexual: +25
- Enemigos: -20
- Rivales: -10

**Ejemplo:**

```
💬 Lucía interactuó con Elena (actividad_conjunta)
```

### 3. 💕 BUSCAR ROMANCE (Seek Romance)

**Descripción:** El NPC intenta avanzar una relación romántica.

**Ponderación por Personalidad:**

```javascript
Base: 15
+ Romántico ≥8: +40
+ Pasional ≥8: +30
- Tímido ≥7: -20
- Ya tiene pareja: -25
```

**Acciones Románticas:**

- **Declarar amor** - Si romántico ≥9
- **Flirtear** - Por defecto
- **Miradas tímidas** - Si tímido ≥7

**Efecto:**

- Atracción +5 en la relación
- Genera memoria `romance_attempt`
- Puede generar eventos narrativos posteriores

**Ejemplo:**

```
💕 Alberto intentó flirtear con Roberta
```

### 4. 🏃 EVITAR ENEMIGO (Avoid Enemy)

**Descripción:** El NPC huye de una locación donde hay enemigos.

**Ponderación por Personalidad:**

```javascript
Base: 10
Solo si hay enemigos presentes
+ Cobarde ≥7: +50
+ Pacífico ≥7: +30
- Valiente ≥7: -30
- Agresivo ≥7: -40
```

**Lógica:**

1. Verifica si hay NPCs con relación "enemigos" en la locación
2. Si hay, elige una locación conectada (idealmente más segura)
3. Se mueve inmediatamente

**Ejemplo:**

```
🏃 José huyó de Granja Los Álamos Granero para evitar conflictos
```

### 5. 🤝 BUSCAR AMIGO (Seek Friend)

**Descripción:** El NPC busca pasar tiempo con sus amigos.

**Ponderación por Personalidad:**

```javascript
Base: 20
+ Amigable ≥7: +25
+ Leal ≥7: +20
- Solitario ≥7: -30
```

**Lógica:**

1. Identifica NPCs con relación "amigos" o amistad ≥60
2. Elige uno al azar
3. Mejora la relación (amistad +5)

**Ejemplo:**

```
🤝 Elena pasó tiempo con su amiga Roberta
```

### 6. ⚔️ CONFRONTAR (Confront)

**Descripción:** El NPC confronta a un rival o enemigo.

**Ponderación por Personalidad:**

```javascript
Base: 5 (bajo por defecto)
Solo si hay rivales/enemigos presentes
+ Agresivo ≥8: +45
+ Vengativo ≥8: +40
+ Valiente ≥7: +20
- Pacífico ≥7: -30
- Cobarde ≥7: -40
```

**Tipos de Confrontación:**

- **Pelea** - Si agresivo ≥9
- **Amenaza** - Si vengativo ≥8
- **Discusión** - Por defecto

**Efectos:**

- Rivalidad +10
- Respeto +5 (si honorable ≥7) o -5
- Genera memoria `confrontation`

**Ejemplo:**

```
⚔️ Raúl confrontó a José (pelea)
```

### 7. 😴 DESCANSAR (Rest)

**Descripción:** El NPC se queda en su locación actual descansando.

**Ponderación por Personalidad:**

```javascript
Base: 15
+ Perezoso ≥7: +30
- Activo ≥7: -20
- Enérgico ≥7: -15
```

**Ejemplo:**

```
😴 Samuel descansó en Búnker Militar Víveres
```

## 📊 Sistema de Ponderación

### Cómo Funciona

Cada tick, el sistema:

1. **Evalúa todas las acciones posibles** para cada NPC
2. **Calcula peso** (weight) para cada acción basado en personalidad
3. **Selección ponderada aleatoria** - acciones con mayor peso tienen más probabilidad

```javascript
// Ejemplo de decisión
actions = [
  { type: "move", weight: 45 }, // 45% probabilidad
  { type: "interact", weight: 30 }, // 30% probabilidad
  { type: "seek_romance", weight: 55 }, // 55% probabilidad ← Elegida
  { type: "rest", weight: 15 }, // 15% probabilidad
];

// Alberto es muy romántico (9), así que seek_romance tiene más peso
```

### Traits de Personalidad Considerados (20+)

#### Movimiento

- `explorador`, `aventurero`, `paranoico`, `cobarde`

#### Social

- `carismatico`, `amigable`, `timido`, `introvertido`, `solitario`

#### Romance

- `romantico`, `pasional`

#### Conflicto

- `agresivo`, `vengativo`, `valiente`, `pacifico`, `cobarde`, `honorable`

#### Energía

- `perezoso`, `activo`, `energico`, `leal`

## 🔄 Flujo de Ejecución

### En Cada Tick de Simulación (30s)

```
1. worldTick() llama a makeNpcDecisions()
   ↓
2. npcAI.makeAllDecisions()
   ↓
3. Para cada NPC activo:
   │
   ├─ Verificar cooldown (1 min)
   │
   ├─ Obtener datos del NPC (personalidad, locación)
   │
   ├─ Evaluar 7 acciones posibles:
   │  • Calcular peso según personalidad
   │  • Considerar memoria reciente
   │  • Verificar condiciones (enemigos, amigos, etc)
   │
   ├─ Selección ponderada aleatoria
   │
   ├─ Ejecutar acción elegida:
   │  • Actualizar estado en DB
   │  • Modificar relaciones si aplica
   │  • Agregar memoria
   │
   └─ Registrar decisión en worldState.recentNpcActions

4. Consola: "🤖 5 NPCs tomaron decisiones autónomas"
   ↓
5. Las 10 acciones más recientes se envían al cliente
```

## 💾 Base de Datos

### Actualización de Estados

```sql
-- Movimiento de NPCs
UPDATE npc_state
SET locacion_actual = ?, updated_at = ?
WHERE npc_id = ?

-- Las relaciones se modifican vía npcRelationships.updateRelationship()
```

### Consultas Comunes

```javascript
// Obtener NPCs en una locación
SELECT n.*, ns.locacion_actual
FROM npcs n
LEFT JOIN npc_state ns ON n.id = ns.npc_id
WHERE ns.locacion_actual = ? AND n.estado = 'activo'

// Obtener datos completos de un NPC
SELECT n.*, ns.*
FROM npcs n
LEFT JOIN npc_state ns ON n.id = ns.npc_id
WHERE n.id = ?
```

## 🎮 Interfaz de Usuario

### Tab MUNDO - Sección Acciones de NPCs

```
🤖 ACCIONES AUTÓNOMAS DE NPCs
┌────────────────────────────────────────┐
│ 🚶 MOVE                                │
│ Alberto se movió de Villa Esperanza   │
│ Centro a Villa Esperanza Mercado      │
├────────────────────────────────────────┤
│ 💕 SEEK_ROMANCE                        │
│ Alberto intentó flirtear con Roberta  │
├────────────────────────────────────────┤
│ ⚔️ CONFRONT                             │
│ Raúl confrontó a José (pelea)         │
└────────────────────────────────────────┘
```

### Estadísticas del Mundo (Actualizado)

```
🌍 ESTADO DEL MUNDO
┌────────────────────────────┐
│ ⏱️ Tick: #15               │
│ 👥 NPCs Activos: 15        │
│ ⚡ Eventos Activos: 3       │
├────────────────────────────┤
│ 🤖 Sistema de IA           │
│ 🧠 NPCs con memoria: 12    │
│ 💭 Recuerdos totales: 184  │
│ 🎯 Objetivos activos: 3    │
└────────────────────────────┘
```

## 🔗 Integración con Otros Sistemas

### Con Sistema de Relaciones

```javascript
// Confrontación empeora relación
npcRelationships.updateRelationship(npcId, rivalId, {
  rivalidad: +10,
  respeto: -5,
  evento: { tipo: "confrontation" },
});

// Buscar romance mejora atracción
npcRelationships.updateRelationship(npcId, targetId, {
  atraccion: +5,
  evento: { tipo: "romance_attempt" },
});
```

### Con Motor Narrativo

Las acciones de IA **generan material** para eventos narrativos:

- Movimientos frecuentes → Encuentros casuales
- Interacciones románticas → Eventos de romance
- Confrontaciones → Eventos de conflicto

### Con Sistema de Quests

Las acciones de NPCs pueden:

- **Completar objetivos** de quests (ej: "Alberto y Roberta se fueron juntos")
- **Generar nuevas quests** (ej: Raúl ataca a José → quest de mediación)

## 📈 Ejemplos de Comportamiento Emergente

### Alberto (Romántico: 9)

```
Tick 1:  💕 Intenta flirtear con Roberta
Tick 3:  🚶 Se mueve al Mercado donde está Roberta
Tick 5:  💬 Interactuó con Roberta (momento_romantico)
Tick 8:  💕 Declaró su amor a Roberta
→ Relación evoluciona a "amantes"
→ Motor narrativo genera: "Alberto y Roberta se besan"
```

### Raúl (Agresivo: 10, Vengativo: 9)

```
Tick 2:  ⚔️ Confrontó a José (pelea)
Tick 4:  ⚔️ Confrontó a José nuevamente (amenaza)
Tick 6:  🚶 Se mueve a donde está José
Tick 9:  ⚔️ Confrontó a José (pelea)
→ Rivalidad alcanza 80
→ Sistema genera quest: "Mediar conflicto Raúl-José"
```

### Samuel (Paranoico: 10, Solitario: 8)

```
Tick 1:  😴 Descansó en Búnker
Tick 3:  😴 Descansó en Búnker
Tick 5:  🚶 Se movió a Armería (poca gente)
Tick 8:  😴 Descansó en Armería
→ Comportamiento consistente con personalidad paranoide
```

### Elena (Compasiva: 10, Amigable: 9)

```
Tick 2:  🤝 Pasó tiempo con Roberta
Tick 4:  💬 Charló con Carmen
Tick 6:  🤝 Pasó tiempo con Gabriel
Tick 9:  💬 Charló con Lucía
→ Múltiples amistades
→ Centro social del grupo
```

## 🛠️ Utilidades Técnicas

### Helpers de Decisión

```javascript
// Verificar si hay enemigos en locación
hasEnemyInLocation(npcId, locationId);

// Encontrar parejas potenciales (atracción ≥40)
findPotentialPartners(npcId);

// Encontrar amigos
findFriends(npcId);

// Obtener NPCs en locación
getNpcsInLocation(locationId, excludeId);

// Obtener conexiones de locación
getLocationConnections(locationId);

// Locación más poblada
getMostPopulatedLocation(locations);
```

### Gestión de Memoria

```javascript
// Agregar memoria
addMemory(npcId, { type: "interaction", involvedNpc: "roberta" });

// Obtener memorias filtradas
getMemories(npcId, { type: "romance_attempt", since: timestamp });

// Verificar memoria reciente
hasRecentMemoryOf(npcId, "visited", 300000); // Últimos 5 min
```

## 🚀 Expansiones Futuras

### 1. Planes Multi-Paso

```javascript
{
    goal: 'conquest_roberta',
    steps: [
        { action: 'move_to_location', target: 'mercado' },
        { action: 'interact', target: 'roberta' },
        { action: 'seek_romance', target: 'roberta' }
    ],
    currentStep: 1
}
```

### 2. Reacciones a Eventos del Mundo

```javascript
// Si escucha que Roberta está con Tomás
if (npc.personalidad.celoso >= 7) {
  setGoal(npc.id, {
    type: "sabotage_relationship",
    targets: ["roberta", "tomas"],
  });
}
```

### 3. Aprendizaje de Comportamientos

```javascript
// Registrar éxito/fracaso de acciones
if (romanceAttempt.success) {
  npc.learnedBehaviors.romance_approach = "direct";
} else {
  npc.learnedBehaviors.romance_approach = "subtle";
}
```

### 4. Rutinas Diarias

```javascript
// Alberto todos los días:
rutina: [
  { hora: 8, action: "move", target: "mercado" },
  { hora: 12, action: "rest", location: "residencias" },
  { hora: 16, action: "seek_romance", target: "roberta" },
];
```

### 5. Estados Emocionales

```javascript
emotional_state: {
    happiness: 75,   // Afecta decisión de interactuar
    stress: 30,      // Afecta probabilidad de rest
    love: 90,        // Aumenta seek_romance
    anger: 10        // Aumenta confront
}
```

## 📊 Métricas y Estadísticas

```javascript
aiStats = {
  npcsWithMemories: 15, // Todos tienen memoria
  totalMemories: 247, // Recuerdos acumulados
  activeGoals: 5, // NPCs con objetivos específicos

  actionBreakdown: {
    move: 45, // 45 movimientos realizados
    interact: 32,
    seek_romance: 18,
    avoid_enemy: 8,
    seek_friend: 21,
    confront: 12,
    rest: 24,
  },

  personalityEffectiveness: {
    // Qué traits generan más acciones
    romantico: 0.82, // 82% efectividad
    agresivo: 0.91,
    cobarde: 0.73,
  },
};
```

## 🎯 Resultados Observables

### Antes del Sistema de IA

```
- NPCs estáticos en sus locaciones
- Cero movimiento autónomo
- Relaciones solo cambiaban por eventos narrativos forzados
- Mundo sentía "muerto"
```

### Después del Sistema de IA

```
✅ NPCs se mueven entre locaciones constantemente
✅ Interacciones orgánicas basadas en personalidad
✅ Romances que evolucionan naturalmente
✅ Conflictos que escalan realísticamente
✅ Amistades que se fortalecen con el tiempo
✅ Comportamientos consistentes con personalidad
✅ Mundo se siente "vivo" sin intervención del jugador
```

## 🔧 Configuración

### Cooldowns Ajustables

```javascript
ACTION_COOLDOWN = 60000; // 1 minuto por defecto
// Aumentar = menos decisiones, más calidad
// Disminuir = más decisiones, más actividad
```

### Tamaño de Memoria

```javascript
MEMORY_SIZE = 20; // Recuerdos por NPC
// Más memoria = decisiones más contextuales
// Menos memoria = comportamiento más impulsivo
```

---

## ✅ Estado Actual: COMPLETADO

- [x] Sistema de memoria (20 eventos por NPC)
- [x] Sistema de objetivos dinámicos
- [x] 7 tipos de acciones autónomas
- [x] Ponderación por 20+ traits de personalidad
- [x] Integración con relaciones y narrativa
- [x] Cooldowns y control de spam
- [x] UI con log de acciones en tiempo real
- [x] Estadísticas de IA expuestas
- [x] Helpers y utilidades completas
- [x] Documentación exhaustiva

**El sistema está 100% funcional. Los NPCs ahora toman decisiones completamente autónomas basadas en quiénes son.**

🎉 **¡Los NPCs tienen vida propia!**
