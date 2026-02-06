# 📜 SISTEMA DE MISIONES DINÁMICAS

## 🎯 Visión General

Sistema de quests generadas proceduralmente basadas en los eventos y relaciones del mundo vivo. Los jugadores pueden **intervenir en las historias de los NPCs**, ayudándolos en romances, conflictos, rivalidades y dramas.

## 🔥 Características

### ✨ Generación Automática

- Las misiones se generan automáticamente cada **2 minutos** durante la simulación del mundo
- Solo se generan de relaciones con **intensidad ≥ 6** (dramáticas)
- Máximo **3 quests activas** simultáneamente
- **Expiran en 10 minutos** para crear urgencia

### 🎭 6 Tipos de Misiones

#### 💕 **Romance** - Ayudar a amantes

```
Ejemplo: "Alberto y Roberta están enamorados pero no tienen tiempo para estar juntos.
         Consigue vino y flores para ayudarlos a tener una cita romántica."
```

- **Objetivos**: Conseguir items específicos (vino, flores)
- **Consecuencias**:
  - ✅ Éxito: +20 atracción, +15 amistad
  - ❌ Fallo: -10 atracción

#### 💘 **Matchmaker (Cupido)** - Ayudar NPCs tímidos

```
Ejemplo: "Hay tensión sexual entre Carmen y Diego pero ninguno da el primer paso.
         Habla con ambos y convéncelos de confesar sus sentimientos."
```

- **Objetivos**: Hablar con ambos NPCs y convencerlos
- **Consecuencias**:
  - ✅ Éxito: +30 atracción, -20 tensión
  - ❌ Fallo: +10 rivalidad

#### 🕊️ **Mediación** - Detener conflictos

```
Ejemplo: "Raúl y José están a punto de pelearse. Intervén antes de que haya violencia."
```

- **Objetivos**: Separar a los NPCs en conflicto
- **Consecuencias**:
  - ✅ Éxito: -20 rivalidad, +10 respeto
  - ❌ Fallo: +10 rivalidad

#### ⚔️ **Rivalidad** - Organizar competencia justa

```
Ejemplo: "Tomás y Alberto compiten por Roberta de forma poco sana.
         Organiza una competencia justa para que resuelvan su rivalidad."
```

- **Objetivos**: Organizar duelo/competencia
- **Consecuencias**:
  - ✅ Éxito: -15 rivalidad, +10 respeto
  - ❌ Fallo: +10 rivalidad

#### 😒 **Celos** - Consolar NPC celoso

```
Ejemplo: "Tomás está consumido por los celos hacia Alberto.
         Habla con él y ayúdalo a superar sus inseguridades."
```

- **Objetivos**: Hablar con el NPC celoso
- **Consecuencias**:
  - ✅ Éxito: -20 celos, +10 amistad
  - ❌ Fallo: +10 celos

#### 🔍 **Investigación** - Descubrir la verdad

```
Ejemplo: "Hay rumores de algo complejo entre varios NPCs.
         Investiga qué está pasando realmente."
```

- **Objetivos**: Interrogar a 3 NPCs
- **Consecuencias**:
  - ✅ Éxito: -10 tensión, +5 respeto
  - ❌ Fallo: +5 tensión

### 🎁 Sistema de Recompensas

#### Recompensas Base

- **XP**: 50-100 puntos según tipo de quest
- **Reputación**: +5 a +20 según dificultad
- **Oro**: 20-50 según tipo

#### Ejemplos por Tipo

```javascript
romance:       { xp: 75,  reputacion: 10, oro: 30 }
matchmaker:    { xp: 100, reputacion: 15, oro: 50 }
mediation:     { xp: 80,  reputacion: 20, oro: 40 }
rivalry:       { xp: 90,  reputacion: 15, oro: 40 }
jealousy:      { xp: 70,  reputacion: 10, oro: 30 }
investigation: { xp: 85,  reputacion: 12, oro: 35 }
```

## 🎮 Interfaz de Usuario

### Tab MUNDO - Sección de Misiones

```
⚡ MISIONES DINÁMICAS (3)
┌─────────────────────────────────────────┐
│ 💕 Cita Romántica                 ⏱️ 8m │
│                                         │
│ Alberto y Roberta están enamorados...   │
│                                         │
│ OBJETIVOS:                              │
│ • Conseguir vino (1)                    │
│ • Conseguir flores (1)                  │
│                                         │
│ RECOMPENSAS:                            │
│ ⭐ +75 XP  📊 +10 Rep  💰 +30 Oro       │
│                                         │
│ NPCs: Alberto, Roberta                  │
│                                         │
│ [🎯 ACEPTAR MISIÓN]                     │
└─────────────────────────────────────────┘
```

### Estados de Misión

- **Disponible**: Botón verde "ACEPTAR MISIÓN"
- **Aceptada**: Botones "COMPLETAR" y "FALLAR"
- **Expirando**: Animación de pulso rojo cuando queda <3 minutos

### Visual Feedback

- **Colores por tipo**:
  - Romance: Rosa (#ff4488)
  - Matchmaker: Rosa claro (#ff88cc)
  - Mediación: Verde (#44ff44)
  - Rivalidad: Naranja (#ffaa00)
  - Celos: Morado (#aa00aa)
  - Investigación: Azul (#4488ff)

- **Notificaciones**:
  - ✅ "Misión aceptada: [nombre]"
  - ✅ "¡Quest completada!" + recompensas
  - ❌ "Quest fallida."

## 🔧 Arquitectura Técnica

### Backend (server/world/dynamicQuests.js)

```javascript
class DynamicQuestSystem {
    activeQuests: Map<id, Quest>
    completedQuests: Set<id>
    lastGenerationTime: number

    // Generación
    autoGenerateQuests()          // Llamado por simulación cada tick
    generateQuestFromWorldState() // Busca relaciones intensas
    generateRomanceQuest()        // Genera quest específica por tipo
    generateMatchmakerQuest()
    // ... etc

    // Gestión
    getActiveQuests()             // Retorna array de quests activas
    getQuestById(id)              // Busca quest específica
    acceptQuest(id, playerId)     // Marca quest como aceptada
    completeQuest(id, playerId)   // Completa y aplica consecuencias

    // Persistencia
    saveQuestToDB(quest)          // Guarda en base de datos
    updateQuestStatus(id, status) // Actualiza estado
}
```

### Base de Datos (dynamic_quests)

```sql
CREATE TABLE IF NOT EXISTS dynamic_quests (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    objetivos TEXT,        -- JSON array
    recompensas TEXT,      -- JSON object
    npcs_involved TEXT,    -- JSON array
    estado TEXT DEFAULT 'disponible',
    expires_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
);

CREATE INDEX idx_quest_status ON dynamic_quests(estado);
CREATE INDEX idx_quest_expiry ON dynamic_quests(expires_at);
```

### Frontend (survival.html)

```javascript
// Funciones principales
refreshQuests()                    // Solicita lista de quests al servidor
renderQuests(quests)               // Renderiza UI de quests
acceptQuest(questId)               // Envía aceptación al servidor
completeQuest(questId, success)    // Envía resultado al servidor

// Handlers WebSocket
'quests:list'      -> renderQuests()
'quest:accepted'   -> log + refresh
'quest:completed'  -> log + rewards + refresh
```

### Integración con Simulación

```javascript
// server/world/simulation.js - worldTick()
async worldTick() {
    // ... otros pasos ...

    // Paso 9: Generar quests dinámicas
    this.generateDynamicQuests();
}

generateDynamicQuests() {
    const quest = dynamicQuests.autoGenerateQuests();
    if (quest) {
        console.log(`⚡ Nueva misión generada: "${quest.title}"`);
    }
}
```

## 📊 Flujo Completo

### 1. Generación Automática

```
Simulación (30s tick)
    ↓
generateDynamicQuests()
    ↓
autoGenerateQuests()
    ↓
Busca relaciones intensas (≥6)
    ↓
Genera quest según tipo de relación
    ↓
Guarda en DB + memoria (Map)
```

### 2. Jugador Ve Quest

```
Player abre tab MUNDO
    ↓
refreshQuests()
    ↓
WebSocket: { type: 'getActiveQuests' }
    ↓
Server: dynamicQuests.getActiveQuests()
    ↓
WebSocket: { type: 'quests:list', quests }
    ↓
renderQuests() - muestra UI
```

### 3. Jugador Acepta Quest

```
Player click "ACEPTAR MISIÓN"
    ↓
acceptQuest(questId)
    ↓
WebSocket: { type: 'acceptQuest', questId }
    ↓
Server: dynamicQuests.acceptQuest()
    ↓
Estado cambia a 'aceptada'
    ↓
WebSocket: { type: 'quest:accepted' }
    ↓
Botones cambian a COMPLETAR/FALLAR
```

### 4. Jugador Completa Quest

```
Player realiza objetivos (roleplay)
    ↓
Click "COMPLETAR" o "FALLAR"
    ↓
completeQuest(questId, success)
    ↓
WebSocket: { type: 'completeQuest', questId, success }
    ↓
Server: dynamicQuests.completeQuest()
    ↓
Aplica consecuencias a relación NPC
    ↓
Aplica recompensas a player (XP, Rep, Oro)
    ↓
Guarda player modificado
    ↓
WebSocket: { type: 'quest:completed', result, player }
    ↓
UI: Muestra mensaje + recompensas
    ↓
refreshQuests() - actualiza lista
```

## 🎯 Impacto en el Mundo

### Consecuencias en Relaciones NPCs

Las quests **modifican permanentemente** las relaciones entre NPCs:

```javascript
// Ejemplo: Quest de Romance completada con éxito
npcRelationships.updateRelationship("alberto", "roberta", {
  atraccion: +20,
  amistad: +15,
  evento: { tipo: "quest_completed", success: true },
});

// Resultado: Relación Alberto-Roberta mejora
// Estado: 'amantes' → intensidad aumenta
// Esto genera MÁS eventos narrativos románticos
```

### Ciclo de Feedback

```
Mundo genera evento (Alberto ❤️ Roberta)
    ↓
Relación alcanza intensidad 8
    ↓
Sistema genera quest "Cita Romántica"
    ↓
Player completa quest con éxito
    ↓
Relación mejora (+20 atracción)
    ↓
Motor narrativo genera evento "Alberto y Roberta se besan"
    ↓
Aparece en Feed del Mundo
    ↓
Player ve el resultado de sus acciones
```

## 🚀 Próximas Expansiones

### Quests Encadenadas

```javascript
{
    id: 'romance_chain_1',
    title: 'Primera Cita',
    nextQuest: 'romance_chain_2' // Se genera automáticamente al completar
}
```

### Quests de Múltiples NPCs

```javascript
{
    type: 'triangle_drama',
    npcsInvolved: ['alberto', 'roberta', 'tomas'],
    objectives: [
        'Hablar con los 3 NPCs',
        'Ayudar a Roberta a tomar una decisión',
        'Mediar entre Alberto y Tomás'
    ]
}
```

### Consecuencias Complejas

```javascript
consequences: {
    success: {
        alberto_roberta: { atraccion: +30 },
        tomas_roberta: { atraccion: -20 },
        alberto_tomas: { rivalidad: -15, respeto: +10 }
    }
}
```

### Sistema de Reputación

```javascript
player.reputationWith = {
  alberto: 75, // Alberto ve al player como amigo
  raul: -20, // Raúl desconfía del player
};

// NPCs ofrecen mejores recompensas si tienen buena reputación con el player
```

## 📈 Métricas y Estadísticas

```javascript
// Estadísticas que se pueden agregar
{
    totalQuestsGenerated: 156,
    totalQuestsCompleted: 89,
    totalQuestsFailed: 23,
    totalQuestsExpired: 44,

    successRate: 0.79,

    byType: {
        romance: { generated: 45, completed: 32, success: 0.84 },
        mediation: { generated: 38, completed: 21, success: 0.65 },
        // ...
    },

    relationshipsImproved: 67,
    relationshipsWorsened: 12
}
```

## 🎮 Tips para Jugadores

1. **Prioriza quests que expiran pronto** (animación roja)
2. **Lee el feed del mundo** para entender contexto de las relaciones
3. **Algunos NPCs son más difíciles** (alta rivalidad = quest más compleja)
4. **Las consecuencias son permanentes** - piensa antes de fallar
5. **Mejora tu reputación** para desbloquear quests especiales

---

## ✅ Estado Actual: COMPLETADO

- [x] Sistema de generación procedural
- [x] 6 tipos de quests funcionales
- [x] Integración con simulación del mundo
- [x] Base de datos persistente
- [x] Sistema de consecuencias
- [x] Recompensas (XP, Rep, Oro)
- [x] UI completa en tab MUNDO
- [x] WebSocket handlers servidor
- [x] Auto-expiración de quests
- [x] Visual feedback (colores, iconos, animaciones)
- [x] Sistema de estados (disponible → aceptada → completada/fallida)

**El sistema está 100% funcional y listo para usar.**

🎉 ¡Los jugadores ahora pueden intervenir activamente en las historias de los NPCs!
