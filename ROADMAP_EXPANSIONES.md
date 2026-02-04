# 🔥 EXPANSIONES IMPLEMENTADAS + ROADMAP

## ✅ IMPLEMENTADO: EVENTO GLOBAL DE RACIONAMIENTO

### 📊 Resumen

**Evento narrativo global que fuerza a todos los NPCs a reaccionar simultáneamente.**

**Trigger:**

- 3 días después del primer login, O
- Completar `quest_103_completed` (medicina de Teresa)

**NPCs involucrados:**

- Ana (anuncia racionamiento)
- Dr. Gómez (se opone)
- Marco (apoya a Ana)
- Nina (propone huir)
- Sofía (observa, puede revelar secreto)

**Decisiones del jugador:**

1. 🛡️ Apoyar a Ana → Refuerza su autoridad
2. 💊 Apoyar a Gómez → Refugio dividido
3. 🏃 Apoyar a Nina → Evacuación
4. 💣 Revelar escondite de Gómez → Juicio/Ejecución
5. 🤐 Quedarse callado → Sofía te recluta

**Quests desbloqueadas:**

- `quest_nuevo_orden` (si apoyas a Ana)
- `quest_revolucion_silenciosa` (si apoyas a Gómez)
- `quest_exodo` (si apoyas a Nina)
- `quest_juicio_gomez` (si revelas secreto)
- `quest_observador` (si te quedas callado)

**Consecuencias permanentes:**

- Gómez puede ser: arrestado, ejecutado, expulsado, o perdonado
- Ana puede: reforzar autoridad, perder control, o tener breakdown
- Nina puede abandonar el refugio
- Marco puede tomar control militar
- Refugio puede dividirse en facciones

### 📁 Archivos modificados:

- ✅ `server/data/dialogues.json` - 10 nuevos diálogos
- ✅ `server/world/globalEvents.js` - Nuevo sistema de eventos globales
- ✅ `server/index.js` - Integración del sistema
- ✅ `server/ws.js` - Trigger automático en login
- ✅ `public/game.js` - Handler de eventos globales
- ✅ `EVENTO_RACIONAMIENTO.md` - Documentación completa

### 🚩 Flags nuevos (20):

```
evento_racionamiento_iniciado
evento_racionamiento_resuelto
player_intervino_evento
player_prometio_apoyo
player_dudo_ana
player_told_ana_secret
player_abandono_ana
player_apoyo_ana_publico
player_apoyo_gomez_publico
player_propuso_huida
player_revelo_secreto_gomez
player_silencio_evento
gomez_arrestado
gomez_ejecutado
gomez_expulsado
gomez_perdonado
ana_autoridad_reforzada
refugio_dividido
nina_abandono_refugio
refugio_autoritario
```

---

## 🎯 ROADMAP: PRÓXIMAS EXPANSIONES

### 1️⃣ EXPANSIÓN DE QUESTS SIN COMBATE

#### Quest A: "Inventario Fantasma"

**Status:** 🟡 Diseñada, pendiente implementación

**NPC:** Sofía  
**Trigger:** Después de `sofia_hints_gomez_stash`

**Objetivos:**

- Investigar si la medicina realmente desaparece
- Revisar morgue y enfermería
- Confirmar acaparamiento interno

**Flags:**

```
quest_inventario_iniciado
found_fake_records
confirmed_internal_hoarding
player_ignored_evidence
```

**Consecuencia:**
Refuerza o debilita futuras acusaciones a Gómez. Ana reacciona diferente si sabías y callaste.

---

#### Quest B: "Decisión de Triaje"

**Status:** 🟡 Diseñada, pendiente implementación

**NPC:** Ana  
**Requisito:** `quest_103_completed`

**Dilema:**
Medicina para uno solo:

- Un adulto útil (ingeniero/guardia)
- Un niño civil

**Twist:**
El jugador NO decide directamente. Decide qué información ocultar o revelar a Ana.

**Flags:**

```
player_influenced_ana
ana_made_harsh_choice
ana_broke_down
ana_hardened
```

**Consecuencia:**
Define el arco completo de Ana: ¿líder autoritaria o líder rota?

---

#### Quest C: "Emergencia Futura"

**Status:** 🟡 Diseñada, pendiente implementación

**NPC:** Dr. Gómez  
**Requisito:** `player_negotiated_gomez`

**Revelación:**
Gómez explica para qué guarda medicina:

- Brote futuro
- Alguien que aún no llegó
- Culpa del pasado

**Opciones:**

- Creerle
- Fingir creerle
- Delatarlo con esa información

**Flags:**

```
gomez_revealed_past
player_trusts_gomez
player_fake_trust
player_weaponized_secret
```

**Consecuencia:**
Acusar a Gómez tiene peso moral real, no es decisión gratis.

---

### 2️⃣ SISTEMA DE TRUST ACUMULATIVO

**Status:** 🟡 Diseñado, pendiente implementación

**Concepto:**
Complementar flags con counters numéricos para relaciones.

```javascript
trust.ana = -100 a +100
trust.gomez = -100 a +100
trust.marco = -100 a +100
trust.nina = -100 a +100
trust.sofia = -100 a +100
```

**Thresholds:**

```
>= 50: Aliado leal
>= 25: Amigo
>= 0: Neutral
< 0: Desconfiado
< -25: Enemigo
< -50: Quiere matarte
```

**Beneficios:**

- Cambiar diálogos con thresholds
- Evitar explosión de flags
- Preparar IA social más adelante

---

### 3️⃣ NPC NUEVO: TERESA (Personaje Ausente)

**Status:** 🟡 Diseñada, pendiente implementación

**Concepto:**
Teresa nunca habla directamente. Solo existe a través de:

- Ana (habla de ella)
- Registros médicos
- Comentarios de otros NPCs
- Consecuencias de tus decisiones

**Impacto:**

- Refuerza narrativa sin sumar sistemas
- Genera empatía sin necesitar diálogos
- Funciona como "personaje Schrödinger" (¿vive? ¿muere?)

---

### 4️⃣ FASE B: REACTIVAR COMBATE CONDICIONADO

**Status:** 🔴 No diseñada aún

**Concepto:**
El combate vuelve, pero **condicionado por decisiones narrativas**.

**Ejemplos:**

- Si ejecutaste a Gómez → Refugio bajo régimen militar → Más guardias
- Si apoyaste a Nina → Campamento nómada → Menos recursos, más peligro
- Si dividiste el refugio → Guerra civil → Combate PvE y PvP

**Requerimientos:**

- Sistema de combate funcional
- Sistema de facciones
- Sistema de consecuencias permanentes

---

## 🧠 MEJORAS ESTRUCTURALES PROPUESTAS

### Sistema de Flags Agrupados

```javascript
// En lugar de 100 flags separados
trust.ana += 1;
trust.gomez -= 1;
influence.moral;
influence.authority;
```

### Event Bus para NPCs

```javascript
EventBus.emit("player_betrayed_ana", { playerId, context });
// Todos los NPCs se enteran y reaccionan
```

### Diálogos Dinámicos

```javascript
// En lugar de hardcodear cada variación
Ana: "Hola {player_name}. {si trust > 20: 'Confío en vos'} {si trust < 0: 'Andá con cuidado'}";
```

---

## 📈 MÉTRICAS DE ÉXITO DEL EVENTO

### El evento es exitoso si:

✅ El jugador siente que su decisión importó  
✅ Al menos 2 NPCs cambian de estado/ubicación  
✅ Se desbloquean al menos 2 quests nuevas  
✅ El refugio es permanentemente diferente

### Tracking:

- % de jugadores que revelan el secreto de Gómez
- % de jugadores que apoyan a cada facción
- % de jugadores que se quedan callados
- Relación promedio con Ana después del evento
- Relación promedio con Gómez después del evento

---

## 🔥 PRÓXIMO PASO INMEDIATO

**Prioridad 1:** Testear evento de racionamiento
**Prioridad 2:** Implementar Quest B (Decisión de Triaje)
**Prioridad 3:** Implementar sistema de Trust acumulativo

---

## 💡 FILOSOFÍA DE DISEÑO

### ✅ SÍ HACER:

- Duplicar consecuencias
- Profundizar NPCs existentes
- Agregar quests sin combate
- Hacer que **callarse sea una decisión**
- Generar tensión sin enemigos

### ❌ NO HACER (TODAVÍA):

- Agregar más mapas
- Sumar enemigos
- Meter crafting complejo
- Inflarse artificialmente

---

## 🎮 CÓMO PROBAR EL EVENTO

1. Loguear con un nuevo personaje
2. Completar la quest de medicina de Teresa (hablar con Ana → Gómez → Ana)
3. Esperar 2 segundos después del login
4. Ana te consultará en privado (si trust >= 10) o anunciará público
5. Tomar una de las 5 decisiones
6. Ver consecuencias permanentes

**O forzar trigger:**

- En consola del servidor: `flagSystem.set(playerId, 'quest_103_completed')`
- Reloguear
