# 🏥 HOSPITAL - ACTO 1: "LA ELECCIÓN"

## 🎭 CONCEPTO

**El hospital se está quedando sin suministros. Hay que decidir quién vive y quién muere.**

Cada decisión tiene consecuencia REAL. Los NPCs recuerdan. El mundo cambia.

---

## 👥 LOS 5 NPCs

### 1. **ANA** (Líder del Hospital)

**Rol:** Directora, toma las decisiones duras  
**Conflicto:** Debe mantener la ley y el orden, pero el caos la está superando  
**Secreto:** Está dando morfina extra a su hermana enferma (que no se ve)  
**Límite moral:** No matará directamente, pero dejará morir  
**Odia:** A los cobardes y mentirosos  
**Necesita:** Confianza, alguien en quien apoyarse

**Estados posibles:**

- `confiada` - Si el jugador la apoya
- `desconfiada` - Si el jugador la traiciona
- `rota` - Si descubre que su hermana murió por tu culpa
- `autoritaria` - Si tomas el mando sobre ella

---

### 2. **DR. GÓMEZ** (Médico Corrupto)

**Rol:** Médico, controla los suministros  
**Conflicto:** Vende medicina en el mercado negro  
**Secreto:** Tiene un escondite de morfina y antibióticos  
**Límite moral:** Dejaría morir a cualquiera por oro  
**Odia:** A los idealistas y héroes  
**Necesita:** Protección, dinero, inmunidad

**Estados posibles:**

- `comerciando_contigo` - Si le compras o haces tratos
- `expuesto` - Si lo denuncias con Ana
- `amenazante` - Si intentas chantajearlo
- `muerto` - Si Marco lo ejecuta

---

### 3. **MARCO** (Guardia Moral)

**Rol:** Guardia, ejecutor de la justicia  
**Conflicto:** Ve la corrupción pero sigue órdenes de Ana  
**Secreto:** Mató a un niño infectado para "proteger a todos"  
**Límite moral:** Ejecutará a quien considere una amenaza  
**Odia:** A los traidores y aprovechados  
**Necesita:** Validación, sentir que hace lo correcto

**Estados posibles:**

- `leal_a_ana` - Por defecto
- `leal_a_ti` - Si lo convences de seguirte
- `justiciero` - Si ejecuta al Dr. Gómez
- `culpable` - Si descubre que mató al niño equivocado

---

### 4. **TERESA** (Madre Desesperada)

**Rol:** Refugiada, tiene un hijo herido grave  
**Conflicto:** Su hijo necesita antibióticos que no hay  
**Secreto:** Robará lo que sea necesario  
**Límite moral:** Haría cualquier cosa por su hijo  
**Odia:** A quien le niegue ayuda a su hijo  
**Necesita:** Antibióticos, desesperadamente

**Estados posibles:**

- `esperanzada` - Si prometes ayudarla
- `traicionada` - Si no cumples
- `ladrona` - Si roba y la descubren
- `agradecida` - Si salvas a su hijo
- `vengativa` - Si su hijo muere por tu culpa

---

### 5. **CARLOS** (Explorador Herido)

**Rol:** Explorador, conoce la ciudad  
**Conflicto:** Está herido gravemente, necesita cirugía  
**Secreto:** Sabe dónde hay un gran alijo de suministros  
**Límite moral:** Chantajea con información  
**Odia:** A los débiles que no se arriesgan  
**Necesita:** Operación urgente, o morirá

**Estados posibles:**

- `vivo_agradecido` - Si lo salvas primero
- `moribundo` - Si no lo priorizas
- `muerto` - Si pasan 3 días sin decidir
- `vengativo_fantasma` - Si muere y otro NPC lo menciona

---

## 💬 LOS 10 DIÁLOGOS CLAVE

### **DIÁLOGO 1: Ana - Primera Conversación**

**Situación:** Acabas de llegar al hospital

**Ana:** "Bienvenido. Soy Ana, dirijo este lugar. Las cosas están... complicadas. Tenemos dos pacientes críticos y solo medicina para uno. Necesito que me ayudes a decidir."

**Opciones:**

1. "¿Quiénes son los pacientes?" → (INFO: Teresa, Carlos)
2. "Yo decido quién vive" → (Ana: `desconfiada`, desbloquea ruta autoritaria)
3. "¿Y si conseguimos más medicina?" → (Desbloquea búsqueda del Dr. Gómez)
4. "No es mi problema" → (Ana: `decepcionada`, cierra diálogos)

**Consecuencia:** Esta decisión define tu relación con Ana.

---

### **DIÁLOGO 2: Dr. Gómez - Propuesta Corrupta**

**Situación:** Lo encuentras en el almacén

**Dr. Gómez:** "Ah, tú... el nuevo. Mira, tengo medicina extra. Pero no es gratis. 500 de oro, o un favor grande."

**Opciones:**

1. "¿Qué tipo de favor?" → (Revela que quiere protección)
2. "Te voy a denunciar con Ana" → (Gómez: `amenazante`, evento futuro)
3. "Acepto el trato" → (Obtienes medicina, Gómez: `comerciando`)
4. [Intimidar] "Dame la medicina o te rompo la cara" → (Requiere fuerza 5+, lo asustas)

**Consecuencia:** Define si salvas a ambos pacientes o eliges.

---

### **DIÁLOGO 3: Teresa - La Súplica**

**Situación:** Te intercepta llorando

**Teresa:** "Por favor... mi hijo se muere. Necesita antibióticos. Tú tienes influencia aquí. ¡Haz algo!"

**Opciones:**

1. "Voy a ayudarte" → (Teresa: `esperanzada`, crea deuda)
2. "No puedo prometer nada" → (Teresa: neutral)
3. "Carlos es más importante" → (Teresa: `traicionada`, te odia)
4. "Dame algo a cambio" → (Teresa te ofrece un objeto valioso familiar)

**Consecuencia:** Si no cumples, Teresa roba. Si cumples, tienes aliada.

---

### **DIÁLOGO 4: Marco - El Dilema Moral**

**Situación:** Marco te confiesa algo

**Marco:** "Hace tres días... tuve que eliminar a un niño infectado. No había opción. ¿Hice bien?"

**Opciones:**

1. "Hiciste lo correcto" → (Marco: `validado`, se vuelve más leal)
2. "Eso fue asesinato" → (Marco: `culpable`, se aleja)
3. "Depende... ¿estaba realmente infectado?" → (Marco duda, evento futuro)
4. [Empatía] "Nadie debería cargar con eso solo" → (Marco: `vulnerable`, te confía más)

**Consecuencia:** Marco puede convertirse en tu ejecutor o tu enemigo.

---

### **DIÁLOGO 5: Carlos - El Chantaje**

**Situación:** Carlos te dice su secreto

**Carlos:** "Sé dónde hay un alijo enorme... pero solo lo diré si me operas primero. Si muero, ese secreto se va conmigo."

**Opciones:**

1. "Te salvaré" → (Salvas a Carlos, obtienes ubicación del alijo)
2. "No negocio con chantajistas" → (Carlos: `moribundo`, muere en 2 días)
3. [Intimidar] "Dime ya o te dejo morir" → (Carlos asustado, te maldice)
4. "¿Y si salvo al hijo de Teresa?" → (Carlos: `furioso`, cierra trato)

**Consecuencia:** Si Carlos muere, pierdes el alijo. Si lo salvas, ganas gran recurso.

---

### **DIÁLOGO 6: Ana - La Denuncia**

**Situación:** Descubriste al Dr. Gómez

**Tú:** "Ana, el Dr. Gómez tiene medicina escondida. La vende."

**Ana:** "Mierda... ¿Estás seguro? Si lo acusamos sin pruebas, perderemos a nuestro único médico."

**Opciones:**

1. "Tengo pruebas" → (Ana confronta a Gómez, evento de juicio)
2. "Dejémoslo pasar" → (Ana: `decepcionada`, Gómez sigue)
3. "Usémoslo en su contra" → (Ana y tú chantajean a Gómez juntos)
4. "Que Marco se encargue" → (Marco ejecuta a Gómez, violencia)

**Consecuencia:** El destino del Dr. Gómez y la moral del hospital.

---

### **DIÁLOGO 7: Teresa - La Traición**

**Situación:** Teresa robó medicina y la atraparon

**Ana:** "Teresa robó. Marco quiere ejecutarla como ejemplo. ¿Qué hacemos?"

**Opciones:**

1. "Déjenla ir" → (Teresa: `agradecida`, Ana: `blanda`)
2. "Enciérrenla" → (Teresa: `vengativa`, hijo muere)
3. "Ejecútenla" → (Marco: `justiciero`, hospital seguro pero cruel)
4. "Yo me hago responsable" → (Teresa libre, pero tú pierdes reputación)

**Consecuencia:** Define el tipo de hospital que será.

---

### **DIÁLOGO 8: Marco - La Lealtad**

**Situación:** Marco te ofrece seguirte

**Marco:** "Ana ya no puede liderar. Tú tienes lo que se necesita. Si quieres, te sigo a ti."

**Opciones:**

1. "Acepto tu lealtad" → (Marco: `leal_a_ti`, Ana: `traicionada`)
2. "Ana es la líder" → (Marco: `respeta`, mantiene orden)
3. "Nadie debe seguir a nadie" → (Marco: confundido, se aleja)
4. "Solo si traes a otros" → (Marco recluta, golpe de estado posible)

**Consecuencia:** Puedes tomar control del hospital o mantener status quo.

---

### **DIÁLOGO 9: Dr. Gómez - La Venganza**

**Situación:** Si lo denunciaste, él se venga

**Dr. Gómez:** "Me arruinaste... pero antes de irme, voy a envenenar los suministros. A ver si Ana te agradece ahora."

**Opciones:**

1. [Detenerlo físicamente] → (Requiere velocidad 6+, lo detienes)
2. "No lo hagas, por favor" → (Gómez se burla, lo hace igual)
3. [Negociar] "Te doy oro si te vas" → (Gómez acepta, se va)
4. Llamar a Marco → (Marco lo mata, fin permanente)

**Consecuencia:** Si envenena, todos enferman. Hospital colapsa.

---

### **DIÁLOGO 10: Ana - El Final del Acto 1**

**Situación:** Resumen de consecuencias

**Ana:** "[Refleja tus decisiones] Gracias a ti, este hospital [salvó vidas / se volvió cruel / colapsó / prosperó]. No sé qué viene después... pero necesito que sigas aquí."

**Opciones:**

1. "Estaré aquí" → (Acto 2 desbloqueado, eres líder adjunto)
2. "Me voy a explorar" → (Dejas hospital, mundo abierto)
3. "Quiero liderar" → (Desafías a Ana, conflicto)
4. "Esto fue un error" → (Te vas, hospital colapsa sin ti)

**Consecuencia:** Define el inicio del Acto 2.

---

## 🎲 SISTEMA DE CONSECUENCIAS

### **Estados de NPCs que cambian diálogos:**

- Si Ana está `rota`, ya no confía en nadie
- Si Marco es `leal_a_ti`, otros NPCs te temen
- Si Teresa es `vengativa`, sabotea al hospital
- Si Carlos está `muerto`, pierdes el alijo
- Si Gómez está `expuesto`, otros NPCs lo mencionan

### **Eventos que se generan por estado:**

- Si Teresa roba → Marco quiere ejecutarla
- Si Carlos muere → Su información se pierde
- Si Gómez envenena → Evento de emergencia médica
- Si Marco te sigue → Ana puede exiliarte
- Si Ana cae → Anarquía en el hospital

### **Memoria persistente:**

Los NPCs recuerdan en su base de datos:

```json
{
  "memoria": [
    { "tipo": "traicion", "quien": "player_123", "cuando": 1234567890 },
    { "tipo": "ayuda", "quien": "player_123", "cuando": 1234567891 }
  ]
}
```

---

## 🎯 OBJETIVOS DEL ACTO 1

1. **Tomar la primera decisión dura** (Teresa vs Carlos)
2. **Descubrir al Dr. Gómez** (corrupción vs supervivencia)
3. **Definir tu liderazgo** (autoritario, diplomático, caótico)
4. **Enfrentar las consecuencias** (alguien muere, alguien te odia)
5. **Establecer el tono** (este mundo no perdona)

---

## ✅ CRITERIOS DE ÉXITO

- **Cada jugador sale con una historia DIFERENTE**
- **Al menos 1 NPC te odia al final**
- **Al menos 1 decisión que duele**
- **Ganas de saber "qué hubiera pasado si..."**
- **Los NPCs mencionan tus acciones anteriores**

---

¿Esto es un juego completo? **NO.**

¿Esto es un LOOP PERFECTO? **SÍ.**

Si esto funciona, TODO lo demás funciona.
