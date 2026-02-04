# 🌍 Sistema de Mundo Vivo - Estilo Dwarf Fortress

## ¿Qué es?

MANOLITRI ahora tiene un **motor de simulación autónoma** que hace que el mundo viva por sí solo, inspirado en Dwarf Fortress. Los NPCs no solo responden a los jugadores, sino que toman decisiones, se mueven, interactúan entre ellos y crean narrativas emergentes.

## 🔄 Cómo Funciona

### Sistema de Ticks (30 segundos)

Cada 30 segundos, el motor ejecuta un "tick" del mundo que simula:

1. **Comportamiento autónomo de NPCs** (30% de probabilidad cada tick)
   - NPCs toman decisiones basadas en sus necesidades y personalidad
   - Actúan sin intervención del jugador

2. **Sistema de necesidades**
   - Hambre (0-100, decae -2 por tick)
   - Sed (0-100, decae -3 por tick)
   - Cansancio (0-100, aumenta +1 por tick)
   - Seguridad (0-100, decae -1 por tick)
   - Social (0-100, decae -1 por tick)

3. **Movimiento autónomo**
   - NPCs se mueven entre ubicaciones según su actividad
   - Exploran, buscan recursos, huyen de peligros

4. **Interacciones NPC-NPC**
   - Conversaciones, intercambios, conflictos, alianzas
   - Registradas en la memoria de cada NPC

5. **Simulación de recursos**
   - Recursos se agotan gradualmente (2% por tick)
   - Regeneran en zonas específicas (parque, lago)

6. **Eventos emergentes** (15% de probabilidad)
   - Hordas de zombies
   - Recursos descubiertos
   - Conflictos de facciones
   - NPCs heridos
   - Caravanas comerciantes

7. **Evolución de relaciones**
   - Relaciones entre NPCs tienden gradualmente a neutral (60)
   - Cambian según interacciones

## 🎮 Decisiones Autónomas de NPCs

### Árbol de Decisiones

```
1. Verificar necesidades críticas (< 20)
   ├─ Hambre baja → buscar_comida
   ├─ Sed baja → buscar_agua
   ├─ Cansancio alto → descansar
   ├─ Seguridad baja → huir_peligro
   └─ Social bajo → socializar

2. Decisiones por personalidad
   ├─ Agresivo > 7 → patrullar (30%)
   ├─ Comerciante > 7 → comerciar (20%)
   └─ Random → explorar (10%)
```

### Actividades que realizan los NPCs:

- 🍖 **buscar_comida** - Buscan recursos alimenticios
- 💧 **buscar_agua** - Buscan agua potable
- 😴 **descansar** - Recuperan energía
- 🏃 **huir_peligro** - Escapan de amenazas
- 💬 **socializar** - Interactúan con otros
- 🔫 **patrullar** - Vigilan zonas
- 💰 **comerciar** - Intercambian bienes
- 🗺️ **explorar** - Exploran nuevas áreas

## 📊 Estado del Mundo (Panel UI)

Los jugadores pueden ver el estado de la simulación en tiempo real:

- **Tick actual**: Cuántos ciclos de simulación han ocurrido
- **NPCs activos**: Cantidad de NPCs viviendo en el mundo
- **Eventos activos**: Eventos emergentes en curso
- **Historias recientes**: Últimas 10 acciones de NPCs

## 🔧 Arquitectura Técnica

### Archivos nuevos:

- `server/world/simulation.js` - Motor principal de simulación (500+ líneas)
  - `WorldSimulation` class con tick system
  - IA de decisiones de NPCs
  - Generación de eventos procedurales
  - Sistema de necesidades

### Base de datos:

- Tabla `npc_state` agregada al schema
  - Necesidades (JSON)
  - Actividad actual
  - Objetivo actual
  - Timestamp de última decisión

### Frontend:

- Botón "🌍 Mundo Vivo" en la UI
- Modal con estadísticas del mundo
- Feed de historias en tiempo real

## 📈 Configuración del Sistema

Puedes ajustar estos valores en `simulation.js`:

```javascript
this.config = {
  npcDecisionChance: 0.3, // 30% decisiones por tick
  eventSpawnChance: 0.15, // 15% eventos emergentes
  resourceDepletionRate: 0.02, // 2% depleción recursos
  relationshipChangeRate: 0.1, // Cambios graduales
  npcNeedsDecayRate: 0.05, // Decaimiento necesidades
};
```

## 🎯 Narrativa Emergente

El sistema **registra acciones de NPCs** que forman historias:

```
"Ana está buscando comida en el mercado" (hace 2 minutos)
"Viktor está patrullando en la plaza" (hace 5 minutos)
"Dr. Gómez está comerciando en el hospital" (hace 8 minutos)
```

Estas historias:

- Se acumulan en `worldState.activeStories`
- Son visibles para los jugadores
- Crean contexto para las acciones del jugador
- Generan quests dinámicas (futuro)

## 🔮 Futuras Expansiones

1. **Facciones dinámicas**
   - NPCs forman grupos
   - Guerras territoriales
   - Alianzas estratégicas

2. **Economía compleja**
   - Oferta y demanda
   - Precios dinámicos en shops
   - Rutas comerciales entre ubicaciones

3. **Ciclo día/noche**
   - Horarios de NPCs
   - Más peligroso de noche
   - Eventos según hora

4. **NPCs que mueren/nacen**
   - Mortalidad permanente
   - Nuevos NPCs aparecen
   - Legados y herencias

5. **Memoria de largo plazo**
   - NPCs recuerdan acciones del jugador
   - Rencores/agradecimientos duraderos
   - Historias que se cuentan entre NPCs

6. **Quests procedurales**
   - NPCs crean misiones según necesidades
   - "Estoy herido, necesito medicinas"
   - "Mi hijo desapareció en el cementerio"

## 🎮 Cómo Usar

1. **Inicia el juego**
   - El sistema se activa automáticamente
   - Verás "🌍 Simulación del mundo: ACTIVO" en consola

2. **Observa los ticks**
   - Cada 30 segundos verás logs en la consola del servidor
   - `🔄 Tick #X - Simulando mundo...`

3. **Abre el panel de Mundo Vivo**
   - Click en el botón "🌍 Mundo Vivo"
   - Ve estadísticas y historias recientes

4. **Interactúa con consecuencias**
   - Tus acciones afectan las decisiones de NPCs
   - Matar NPCs reduce la población
   - Ayudar NPCs mejora relaciones

## 🐛 Debugging

### Ver logs de simulación:

Los ticks muestran:

```
🔄 Tick #1 - Simulando mundo...
  🤖 5 NPCs tomaron decisiones autónomas
  🚶 3 NPCs se movieron autónomamente
  💬 2 interacciones entre NPCs
  ⚡ Evento emergente: "¡Horda de zombies!" en cementerio
✅ Tick #1 completado
```

### Detener la simulación (emergencias):

```javascript
// En consola del navegador (dev tools):
fetch("/api/world/stop", { method: "POST" });
```

### Ajustar tick rate:

Cambia `this.tickRate = 30000` en `simulation.js` (en milisegundos)

## 🌟 Características Especiales

### 1. Eventos Procedurales

No son scripts fijos - el sistema genera eventos basándose en:

- Estado del mundo actual
- Ubicación de NPCs
- Recursos disponibles
- Tensiones entre grupos

### 2. IA Contextual

NPCs no tienen "rutas patrulladas" - toman decisiones en tiempo real:

```
NPC comerciante con hambre baja:
  ¿Hay comida en mi inventario? → Comer
  ¿Hay tienda cerca? → Ir a comprar
  ¿Hay recursos en ubicación? → Recolectar
  Si no: buscar_comida → Explorar
```

### 3. Memoria Compartida

NPCs recuerdan y comparten información:

- "Vi zombies en el cementerio"
- "El jugador me ayudó ayer"
- "Viktor es agresivo"

Esta info influye en decisiones futuras.

## 💡 Tips de Diseño

1. **El mundo no espera al jugador**
   - Si no juegas, el mundo sigue evolucionando
   - NPCs pueden morir mientras estás offline
   - Recursos se agotan y regeneran

2. **Cada partida es única**
   - Eventos procedurales diferentes
   - NPCs toman rutas distintas
   - Historias emergentes únicas

3. **Consecuencias reales**
   - Matar NPCs = menos comercio disponible
   - Ignorar eventos = situación empeora
   - Ayudar NPCs = aliados futuros

---

**¡Bienvenido al mundo vivo de MANOLITRI!** 🎮🌍
