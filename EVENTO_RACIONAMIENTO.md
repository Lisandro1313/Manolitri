# 🚨 EVENTO GLOBAL: "LA DECISIÓN DEL RACIONAMIENTO"

## 📊 OVERVIEW

**Tipo:** Evento narrativo social  
**Duración:** Permanente hasta resolución  
**Locación:** Refugio (todos los NPCs presentes)  
**Trigger:** 3 días después del primer login O completar quest_103

---

## 🎬 SECUENCIA DEL EVENTO

### FASE 1: EL ANUNCIO (Ana)

Ana reúne a todos y anuncia el racionamiento.

**Variables que afectan:**

- `trust.ana` → Determina si te consulta antes
- `ana_hardened` → Determina su tono

### FASE 2: LAS REACCIONES (Todos los NPCs)

Cada NPC reacciona públicamente.

**Orden de reacciones:**

1. Dr. Gómez se opone
2. Marco defiende a Ana
3. Nina propone huir
4. Sofía permanece callada

### FASE 3: TU DECISIÓN (Jugador)

El jugador puede:

- Apoyar a Ana públicamente
- Apoyar a Gómez públicamente
- Proponer alternativa (Nina)
- Quedarse callado
- [Revelar secreto] Si conoces el escondite de Gómez

### FASE 4: CONSECUENCIAS INMEDIATAS

- Relaciones cambian masivamente
- Nuevas quests se desbloquean
- NPCs recuerdan tu posición

---

## 🚩 FLAGS NUEVOS

```javascript
// Evento
evento_racionamiento_iniciado
evento_racionamiento_resuelto
player_intervino_evento

// Decisiones del jugador
player_apoyo_ana_publico
player_apoyo_gomez_publico
player_propuso_huida
player_silencio_evento
player_revelo_secreto_gomez

// Consecuencias NPCs
ana_autoridad_reforzada
ana_autoridad_debilitada
gomez_expuesto_publico
marco_ejecuto_gomez
nina_abandono_refugio
sofia_hablo_finalmente

// Trust acumulativo (sistema nuevo)
trust_ana (counter -100 a +100)
trust_gomez (counter -100 a +100)
trust_marco (counter -100 a +100)
trust_nina (counter -100 a +100)
trust_sofia (counter -100 a +100)
```

---

## 💬 DIÁLOGOS COMPLETOS

### 📢 ANUNCIO DE ANA

**Si trust.ana >= 10 (te consulta primero):**

```
[Diálogo privado antes del anuncio]

Ana: "Tengo que anunciar racionamiento. La gente va a reaccionar mal.
      Gómez seguro se opone... ¿vos qué harías?"

Opciones:
1. ✅ [Apoyar] "Es lo correcto, te respaldo"
   → trust_ana +10, flag: player_prometio_apoyo

2. 🤔 [Dudar] "¿Estás segura? Puede haber otra forma"
   → trust_ana +0, flag: player_dudo_ana

3. ⚠️ [Revelar] "Gómez tiene medicina escondida"
   → Desbloquea opción de exponer a Gómez en público
   → trust_ana +15, flag: player_told_ana_secret

4. ❌ [Rechazar] "No te metas en esto, es tu problema"
   → trust_ana -10, flag: player_abandono_ana
```

**Si trust.ana < 10 (anuncio público directo):**

```
[En el refugio, frente a todos]

Ana: "Escuchen todos. Desde mañana, racionamiento obligatorio.
      Una comida al día. Medicina solo para emergencias críticas."

[No te pregunta nada, solo anuncia]
```

---

### 😠 REACCIÓN DE GÓMEZ

```
Dr. Gómez: "¡Esto es una locura! Racionar medicina significa condenar
            a la gente a muerte. No puedo permitirlo como médico."

[Si player tiene flag: player_trusts_gomez]
Gómez te mira esperando apoyo.

[Si player tiene flag: knows_gomez_secret_door]
Sofía te mira brevemente (sabes que ella sabe).
```

---

### 🛡️ REACCIÓN DE MARCO

```
Marco: "Si Ana lo decidió, se cumple. Punto. Quien no respete el
        racionamiento responderá ante mí."

[Mira fijo a Gómez]

Marco: "Y si alguien tiene recursos ocultos... más le vale entregarlos."

[Si player tiene flag: marco_suspects_gomez]
Marco añade: "Doctor... ¿verdad que usted no esconde nada?"
```

---

### 🏃 REACCIÓN DE NINA

```
Nina: "Esto es el principio del fin. Cuando empieza el racionamiento,
       es porque ya es demasiado tarde. Deberíamos irnos."

[Si player tiene flag: player_agrees_nina]
Nina: "[Tu nombre], vos lo sabés. Este lugar está muerto.
       Podemos irnos juntos, ahora."

[Si no tienes ese flag]
Nina: "Quien quiera venir conmigo, que me busque. Parto en 24 horas."
```

---

### 🤐 REACCIÓN DE SOFÍA

```
Sofía: [No dice nada. Solo observa. Su mirada va de Gómez a ti.]

[Si player tiene flag: knows_gomez_secret_door Y la presionas]

Sofía (en voz baja): "Hay una puerta... en la enfermería...
                      que no está en el plano."

[Todos la escuchan. Silencio tenso.]
```

---

## 🎯 OPCIONES DEL JUGADOR (MOMENTO CRÍTICO)

```
⚡ EL MOMENTO DE DECIDIR

Todos te miran. ¿Qué hacés?

1. 🛡️ [Apoyar a Ana] "Tiene razón. Es lo justo."
   → trust_ana +20, trust_gomez -15, trust_marco +10
   → Flag: player_apoyo_ana_publico
   → Marco te respeta más
   → Gómez te odia

2. 💊 [Apoyar a Gómez] "Racionar medicina es inhumano"
   → trust_gomez +20, trust_ana -15, trust_marco -10
   → Flag: player_apoyo_gomez_publico
   → Ana te ve como traidor
   → Marco te vigila

3. 🏃 [Apoyar a Nina] "Nina tiene razón. Deberíamos irnos"
   → trust_nina +20, trust_ana -20
   → Flag: player_propuso_huida
   → Desbloquea quest de evacuación
   → Ana te considera desertor

4. 💣 [REVELAR ESCONDITE] "Gómez tiene medicina oculta"
   (Solo si: knows_gomez_secret_door O sofia_hints_gomez_stash)
   → EVENTO EXPLOSIVO (siguiente sección)
   → trust_gomez -50, trust_ana +30
   → Flag: player_revelo_secreto_gomez
   → Marco investiga
   → Puede llevar a ejecución

5. 🤐 [Quedarse callado] (No decir nada)
   → trust_ana -5, trust_gomez +5
   → Flag: player_silencio_evento
   → NPCs te ven como cobarde o calculador
   → Sofía te nota
```

---

## 💥 CONSECUENCIA: REVELACIÓN DEL ESCONDITE

**Si el jugador revela el secreto de Gómez:**

```
[Silencio absoluto]

Ana: "¿Es cierto eso, doctor?"

Dr. Gómez: "Yo... es medicina de emergencia. Para brotes futuros."

Marco: "Voy a revisar. AHORA."

[Marco va a la enfermería]

---

[10 minutos después]

Marco regresa con una caja llena de antibióticos, morfina y vendajes.

Marco: "Suficiente para UN MES. Mientras la gente moría."

---

OPCIONES DE ANA:

A) [Si ana_hardened O trust_ana >= 20]
   Ana: "Marco. Arréstenlo. Lo juzgaremos."
   → gomez_arrestado
   → Gómez ejecutado en 24h (a menos que intervengas)

B) [Si ana_broke_down O trust_ana < 10]
   Ana: "No... no puedo... alguien más decida..."
   → ana_autoridad_debilitada
   → Marco toma control
   → Marco ejecuta a Gómez inmediatamente

C) [Si player apoyo a Ana antes]
   Ana: "¿Qué hacemos con él?"
   → El JUGADOR decide:
      - Arrestar
      - Expulsar
      - Ejecutar
      - Perdonar (con condiciones)
```

---

## 🎭 FINALES POSIBLES DEL EVENTO

### FINAL 1: LIDERAZGO DE ANA REFORZADO

- Ana mantiene control
- Racionamiento se implementa
- Gómez expulsado o arrestado
- Refugio unificado bajo Ana

### FINAL 2: REBELIÓN DE GÓMEZ

- Si apoyas a Gómez públicamente
- Se forma facción anti-Ana
- Refugio dividido en dos bandos
- Desbloquea "Guerra Civil"

### FINAL 3: EVACUACIÓN

- Si apoyas a Nina
- Grupo se separa
- Desbloquea nueva zona: "Campamento Nómada"
- Ana queda sola con Marco

### FINAL 4: EJECUCIÓN DE GÓMEZ

- Si Marco ejecuta a Gómez
- Refugio bajo autoridad militar
- Ana pierde control
- Marco nuevo líder de facto

### FINAL 5: COLAPSO TOTAL

- Si nadie toma decisión
- NPCs actúan por cuenta propia
- Sofia huye
- Nina se va sola
- Gómez desaparece
- Ana tiene breakdown

---

## 🔗 QUESTS DESBLOQUEADAS

Según tu decisión:

**Si apoyaste a Ana:**

- Quest: "Nuevo Orden" (establecer autoridad)
- Quest: "Cazar a Gómez" (si escapó)

**Si apoyaste a Gómez:**

- Quest: "Revolución Silenciosa" (derrocar a Ana)
- Quest: "Prueba de Inocencia" (conseguir evidencia)

**Si apoyaste a Nina:**

- Quest: "Éxodo" (preparar evacuación)
- Quest: "Convencer Sobrevivientes" (reclutar para huida)

**Si revelaste el secreto:**

- Quest: "Juicio de Gómez" (ser jurado)
- Quest: "Confesión" (interrogar a Gómez)

**Si te quedaste callado:**

- Quest: "Observador" (Sofía te recluta como espía)
- Quest: "Jugar Ambos Lados" (manipular a Ana y Gómez)

---

## 🧠 SISTEMA DE TRUST (NUEVO)

A partir de este evento, se activa el sistema de trust acumulativo:

```javascript
trust.ana = suma de todas las decisiones pro-Ana
trust.gomez = suma de todas las decisiones pro-Gómez
trust.marco = basado en respeto a la autoridad
trust.nina = basado en pragmatismo/supervivencia
trust.sofia = basado en honestidad/silencio
```

**Thresholds importantes:**

- trust >= 50: Aliado leal
- trust >= 25: Amigo
- trust >= 0: Neutral
- trust < 0: Desconfiado
- trust < -25: Enemigo
- trust < -50: Quiere matarte

---

## 📈 MÉTRICAS DE ÉXITO

Este evento es exitoso si:
✅ El jugador siente que su decisión importó
✅ Al menos 2 NPCs cambian de estado/ubicación
✅ Se desbloquean al menos 2 quests nuevas
✅ El refugio es permanentemente diferente

---

## 🎯 IMPLEMENTACIÓN TÉCNICA

- Crear 15 nuevos diálogos en dialogues.json
- Agregar 20 flags nuevos en flagSystem
- Crear evento en events table
- Modificar npcManager para reacciones
- Agregar trust counters en player_npc_relations

---

¿Desarrollo el código completo ahora? 🔥
