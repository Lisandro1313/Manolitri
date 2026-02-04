# 🌍 ARQUITECTURA NUEVA - MMO-lite con Mundo Abierto + Dungeons

## 🎯 VISIÓN DEL JUEGO

**Un RPG multijugador estilo D&D con mundo abierto persistente y aventuras instanciadas.**

### Características principales:

- **Mundo abierto persistente** con múltiples zonas (ciudades, bosques, ruinas)
- **Múltiples personajes** por cuenta (crear, seleccionar, jugar con diferentes personajes)
- **Sistema de parties** para formar grupos
- **Dungeons instanciados** (aventuras tipo D&D para tu grupo)
- **NPCs dinámicos** en cada zona con comportamiento
- **Comercio, crafting, progresión** estilo RPG clásico
- **Narrativa emergente** + eventos globales

---

## 🏗️ ARQUITECTURA TÉCNICA

### 1. SISTEMA DE ZONAS (ZoneManager)

El mundo está dividido en **zonas persistentes** donde los jugadores pueden moverse libremente.

**Estructura de una zona:**

```javascript
{
  id: 'ciudad_aurora',
  nombre: 'Ciudad Aurora',
  tipo: 'ciudad', // ciudad, bosque, dungeon_entrance, ruinas
  descripcion: 'La capital del reino, bulliciosa y llena de vida',
  conexiones: ['bosque_norte', 'camino_sur'],
  npcs: ['comerciante_juan', 'guardia_pedro', 'herrero_maria'],
  jugadores: [player1, player2], // Jugadores actualmente en la zona
  pois: [ // Points of Interest
    { id: 'tienda', nombre: 'Tienda General', tipo: 'comercio' },
    { id: 'taberna', nombre: 'La Taberna del Dragón', tipo: 'social' },
    { id: 'arena', nombre: 'Arena de Combate', tipo: 'pvp' }
  ]
}
```

**Funciones clave:**

- `ZoneManager.movePlayer(playerId, zoneId)` → Mueve jugador entre zonas
- `ZoneManager.getPlayersInZone(zoneId)` → Lista jugadores en zona
- `ZoneManager.broadcastToZone(zoneId, message)` → Chat/eventos por zona
- `ZoneManager.getNPCsInZone(zoneId)` → NPCs activos en zona

---

### 2. SISTEMA DE INSTANCIAS (InstanceManager)

Cuando un **party** inicia una aventura, se crea una **instancia temporal** separada del mundo.

**Estructura de una instancia:**

```javascript
{
  id: 'dungeon_abc123',
  dungeonTemplate: 'cueva_goblins',
  partyId: 'party_xyz',
  jugadores: [player1, player2, player3],
  estado: 'activa', // activa, completada, fallida
  progreso: {
    sala_actual: 'entrada',
    enemigos_muertos: 5,
    cofres_abiertos: 2,
    decisiones: []
  },
  narrativa: [] // Historial de eventos narrativos
}
```

**Funciones clave:**

- `InstanceManager.createInstance(partyId, dungeonId)` → Crea dungeon para el party
- `InstanceManager.endInstance(instanceId, resultado)` → Finaliza y da recompensas
- `InstanceManager.processAction(instanceId, playerId, action)` → Acción en dungeon
- `InstanceManager.getNarrative(instanceId)` → Obtiene narrativa actual

**Tipos de acciones en dungeon:**

- Explorar (avanzar de sala)
- Combate (atacar, defender, habilidad)
- Interacción (abrir cofre, hablar con NPC)
- Decisión grupal (votar sobre dilemas morales)

---

### 3. SISTEMA DE PARTIES (PartyManager)

Los jugadores pueden formar grupos para hacer aventuras juntos.

**Estructura de un party:**

```javascript
{
  id: 'party_xyz',
  lider: 'player1',
  miembros: ['player1', 'player2', 'player3'],
  max_miembros: 6,
  estado: 'en_lobby', // en_lobby, en_aventura
  invitaciones: ['player4'], // Invitaciones pendientes
  zona_reunion: 'ciudad_aurora'
}
```

**Funciones clave:**

- `PartyManager.createParty(playerId)` → Crea party con líder
- `PartyManager.invitePlayer(partyId, targetPlayerId)` → Invita jugador
- `PartyManager.acceptInvite(playerId, partyId)` → Acepta invitación
- `PartyManager.leaveParty(playerId)` → Abandona party
- `PartyManager.startAdventure(partyId, dungeonId)` → Inicia aventura instanciada

---

### 4. SISTEMA DE PERSONAJES (CharacterManager)

Cada **cuenta** puede tener múltiples **personajes**.

**Estructura de un personaje:**

```javascript
{
  id: 'char_123',
  accountId: 'account_abc', // Cuenta propietaria
  nombre: 'Aragorn',
  raza: 'humano', // humano, elfo, enano, orco
  clase: 'guerrero', // guerrero, mago, clerigo, picaro
  nivel: 5,
  experiencia: 350,
  stats: {
    fuerza: 16,
    destreza: 12,
    constitucion: 14,
    inteligencia: 10,
    sabiduria: 8,
    carisma: 13
  },
  salud: 85,
  salud_max: 100,
  oro: 450,
  inventario: [...],
  zona_actual: 'ciudad_aurora',
  apariencia: {
    color_pelo: 'negro',
    color_ojos: 'marron',
    altura: 'alto',
    descripcion: 'Un guerrero curtido en batallas'
  }
}
```

**Funciones clave:**

- `CharacterManager.createCharacter(accountId, data)` → Crea personaje nuevo
- `CharacterManager.getCharacters(accountId)` → Lista personajes de cuenta
- `CharacterManager.selectCharacter(accountId, characterId)` → Selecciona personaje
- `CharacterManager.deleteCharacter(characterId)` → Borra personaje

---

### 5. SISTEMA DE COMBATE GRUPAL

En dungeons, el combate es **por turnos** y **colaborativo**.

**Flujo de combate:**

1. **Iniciativa**: Todos (jugadores + enemigos) rolan iniciativa
2. **Turnos ordenados**: Cada uno actúa en su turno
3. **Acciones de jugador**:
   - Atacar (daño físico)
   - Habilidad (magia, talentos)
   - Defender (reduce daño recibido)
   - Objeto (usar poción, ítem)
   - Huir (todo el party intenta escapar)

**Sistema de targeting:**

- Jugadores eligen objetivo (enemigo específico)
- Enemigos eligen objetivo (IA simple: más débil, más cercano, o aleatorio)

---

### 6. BASE DE DATOS

**Tablas nuevas/modificadas:**

```sql
-- Cuentas de usuario
CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Múltiples personajes por cuenta
CREATE TABLE characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  raza TEXT DEFAULT 'humano',
  clase TEXT DEFAULT 'guerrero',
  nivel INTEGER DEFAULT 1,
  experiencia INTEGER DEFAULT 0,
  stats TEXT, -- JSON: {fuerza, destreza, etc}
  salud INTEGER DEFAULT 100,
  salud_max INTEGER DEFAULT 100,
  oro INTEGER DEFAULT 0,
  inventario TEXT, -- JSON array
  zona_actual TEXT DEFAULT 'ciudad_inicio',
  apariencia TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Zonas del mundo
CREATE TABLE zones (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL -- JSON completo de la zona
);

-- Parties activos (en memoria, pero se puede guardar)
CREATE TABLE parties (
  id TEXT PRIMARY KEY,
  lider TEXT NOT NULL,
  miembros TEXT, -- JSON array
  estado TEXT DEFAULT 'en_lobby',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Instancias de dungeons (temporal, se borra al finalizar)
CREATE TABLE instances (
  id TEXT PRIMARY KEY,
  party_id TEXT NOT NULL,
  dungeon_template TEXT NOT NULL,
  estado TEXT DEFAULT 'activa',
  progreso TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🎮 FLUJO DE JUEGO

### 1. **Login y selección de personaje**

```
Usuario se loguea → Ve lista de sus personajes → Selecciona uno → Entra al mundo
```

### 2. **Exploración del mundo**

```
Jugador está en zona → Ve otros jugadores, NPCs, POIs
→ Puede comerciar, chatear, moverse a otra zona
→ Puede crear/unirse a un party
```

### 3. **Formar party e iniciar aventura**

```
Líder crea party → Invita jugadores → Se reúnen en zona
→ Líder selecciona dungeon → Todos entran a instancia
```

### 4. **Aventura en dungeon**

```
Narrador describe escena → Jugadores eligen acciones
→ Combates por turnos → Decisiones narrativas
→ Completan objetivo → Obtienen recompensas
→ Vuelven al mundo abierto
```

### 5. **Progresión**

```
XP → Subir niveles → Mejorar stats → Conseguir equipo
→ Desbloquear zonas/dungeons más difíciles
```

---

## 📡 EVENTOS WEBSOCKET

**Cliente → Servidor:**

- `character:create` → Crear personaje
- `character:select` → Seleccionar personaje
- `zone:move` → Moverse a otra zona
- `party:create` → Crear party
- `party:invite` → Invitar a party
- `party:accept` → Aceptar invitación
- `party:leave` → Salir de party
- `adventure:start` → Iniciar aventura (líder)
- `adventure:action` → Acción en aventura
- `chat:zone` → Chat por zona
- `npc:interact` → Interactuar con NPC

**Servidor → Cliente:**

- `character:list` → Lista de personajes
- `zone:update` → Actualización de zona
- `zone:players` → Jugadores en zona
- `party:update` → Actualización de party
- `party:invite_received` → Recibiste invitación
- `adventure:narrative` → Narración de aventura
- `adventure:combat` → Estado de combate
- `adventure:complete` → Aventura completada
- `player:update` → Actualización de stats/inventario

---

## 🎨 INTERFAZ CLIENTE

### Pantallas principales:

1. **Login/Register**
2. **Selector de personajes** (con botón "Crear nuevo")
3. **Creador de personajes** (nombre, raza, clase, apariencia)
4. **Mundo abierto**:
   - Panel izquierdo: Chat + jugadores en zona
   - Panel central: Descripción de zona + acciones
   - Panel derecho: Stats + inventario + party
5. **Aventura (dungeon)**:
   - Narrativa corriendo
   - Acciones de combate/exploración
   - Stats del party

---

## 🚀 PRÓXIMOS PASOS

1. ✅ Diseñar arquitectura (este documento)
2. 🔄 Crear nuevo schema.sql
3. 🔄 Implementar managers (Zone, Instance, Party, Character)
4. 🔄 Refactorizar sistemas existentes
5. 🔄 Crear definiciones de zonas y dungeons
6. 🔄 Actualizar cliente
7. 🔄 Testing y balanceo

---

**Fecha de inicio:** 4 de Febrero, 2026
**Estado:** En construcción 🏗️
