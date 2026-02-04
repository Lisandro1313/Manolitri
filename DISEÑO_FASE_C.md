# 🎯 FASE C - DISEÑO COMPLETO

## Regla absoluta: Nada se implementa sin estar aquí primero

---

## 🎭 5 NPCs (estructura completa)

### 1. Ana (Líder del Refugio)

```json
{
  "id": "npc_ana",
  "nombre": "Ana",
  "rol": "líder",
  "objetivo": "Mantener a todos con vida, sin importar el costo moral",
  "limite_moral": "No abandonará a los débiles activamente (pero sí priorizará)",
  "secreto": "Sabe que la medicina está racionada porque hay un acaparador interno",
  "relacion_clave": "Depende del Dr. Gómez, pero no confía en él",
  "ubicacion_inicial": "refugio_entrada",
  "estado_inicial": {
    "salud": 100,
    "stress": 60,
    "confianza_jugador": 0
  }
}
```

### 2. Dr. Gómez (Médico)

```json
{
  "id": "npc_gomez",
  "nombre": "Dr. Gómez",
  "rol": "médico",
  "objetivo": "Acumular recursos médicos para 'emergencias futuras'",
  "limite_moral": "No dejará morir a alguien frente a él, pero acapara preventivamente",
  "secreto": "Tiene un escondite con el triple de medicina que admite",
  "relacion_clave": "Rival silencioso de Ana - quiere controlar recursos",
  "ubicacion_inicial": "refugio_enfermeria",
  "estado_inicial": {
    "salud": 100,
    "stress": 40,
    "confianza_jugador": 0
  }
}
```

### 3. Marco (Guardia)

```json
{
  "id": "npc_marco",
  "nombre": "Marco",
  "rol": "guardia",
  "objetivo": "Seguir órdenes de Ana ciegamente - necesita estructura",
  "limite_moral": "No cuestionará a Ana, incluso si está equivocada",
  "secreto": "Era militar antes del desastre - hizo algo que no menciona",
  "relacion_clave": "Leal a Ana, desconfía del Dr. Gómez",
  "ubicacion_inicial": "refugio_entrada",
  "estado_inicial": {
    "salud": 100,
    "stress": 30,
    "confianza_jugador": 0
  }
}
```

### 4. Nina (Ingeniera)

```json
{
  "id": "npc_nina",
  "nombre": "Nina",
  "rol": "ingeniera",
  "objetivo": "Reparar el generador para poder salir del refugio",
  "limite_moral": "No desperdiciará recursos en gente 'sin futuro'",
  "secreto": "Tiene un plan para irse sola si el refugio colapsa",
  "relacion_clave": "Trabaja con Ana, pero planea traicionarla si es necesario",
  "ubicacion_inicial": "refugio_generador",
  "estado_inicial": {
    "salud": 100,
    "stress": 70,
    "confianza_jugador": 0
  }
}
```

### 5. Sofía (Testigo Pasivo)

```json
{
  "id": "npc_sofia",
  "nombre": "Sofía",
  "rol": "civil",
  "objetivo": "Sobrevivir sin involucrarse - no tomar partido",
  "limite_moral": "No traicionará activamente, pero tampoco ayudará",
  "secreto": "Vio al Dr. Gómez esconder medicina, pero no dirá nada",
  "relacion_clave": "Observa a todos, habla con nadie",
  "ubicacion_inicial": "refugio_dormitorios",
  "estado_inicial": {
    "salud": 80,
    "stress": 90,
    "confianza_jugador": 0
  }
}
```

---

## 💬 10 DIÁLOGOS (nodos condicionales)

### D1: Ana - Primera interacción (SIN flags)

```json
{
  "id": "dialogo_ana_inicial",
  "npc_id": "npc_ana",
  "texto": "Sos nuevo aquí. Espero que puedas ayudar, no solo consumir recursos.",
  "condiciones": {
    "flags_required": [],
    "flags_forbidden": ["ana_met"]
  },
  "opciones": [
    {
      "texto": "¿Qué necesitas?",
      "consecuencias": {
        "set_flags": ["ana_met"],
        "modificar_relacion": { "npc_ana": 5 }
      },
      "siguiente": "dialogo_ana_pide_medicina"
    },
    {
      "texto": "No voy a hacer tu trabajo sucio",
      "consecuencias": {
        "set_flags": ["ana_met", "player_hostile_ana"],
        "modificar_relacion": { "npc_ana": -10 }
      },
      "siguiente": null
    }
  ]
}
```

### D2: Ana - Pide medicina (flag: ana_met)

```json
{
  "id": "dialogo_ana_pide_medicina",
  "npc_id": "npc_ana",
  "texto": "Teresa está enferma. Necesito antibióticos, pero el Dr. Gómez me los niega. Dice que 'no hay suficientes'.",
  "condiciones": {
    "flags_required": ["ana_met"],
    "flags_forbidden": ["ana_requested_meds", "quest_103_completed"]
  },
  "opciones": [
    {
      "texto": "Voy a conseguirlos",
      "consecuencias": {
        "set_flags": ["ana_requested_meds"],
        "start_quest": "quest_medicina_teresa",
        "modificar_relacion": { "npc_ana": 10 }
      },
      "siguiente": null
    },
    {
      "texto": "¿Por qué no se los exiges?",
      "consecuencias": {
        "set_flags": ["ana_requested_meds", "player_questions_leadership"],
        "start_quest": "quest_medicina_teresa",
        "modificar_relacion": { "npc_ana": -5 }
      },
      "siguiente": null
    }
  ]
}
```

### D3: Ana - Entrega medicina (flag: got_medicine_from_gomez + item)

```json
{
  "id": "dialogo_ana_entrega_medicina",
  "npc_id": "npc_ana",
  "texto": "¿Conseguiste los antibióticos?",
  "condiciones": {
    "flags_required": ["ana_requested_meds"],
    "flags_forbidden": ["quest_103_completed"],
    "has_item": "item_antibioticos"
  },
  "opciones": [
    {
      "texto": "[Dar antibióticos] Aquí están",
      "consecuencias": {
        "remove_item": { "id": "item_antibioticos", "cantidad": 1 },
        "set_flags": ["quest_103_completed", "ana_owes_player"],
        "complete_quest": "quest_medicina_teresa",
        "give_xp": 50,
        "modificar_relacion": { "npc_ana": 20 }
      },
      "siguiente": "dialogo_ana_agradecimiento"
    },
    {
      "texto": "[Mentir] Gómez se niega a darlos",
      "consecuencias": {
        "set_flags": ["player_lied_about_meds"],
        "modificar_relacion": { "npc_ana": -15, "npc_gomez": 10 }
      },
      "siguiente": null
    }
  ]
}
```

### D4: Dr. Gómez - Primera interacción (SIN flags)

```json
{
  "id": "dialogo_gomez_inicial",
  "npc_id": "npc_gomez",
  "texto": "¿Herido? Espero que no. No tengo recursos para desperdiciar.",
  "condiciones": {
    "flags_required": [],
    "flags_forbidden": ["gomez_met"]
  },
  "opciones": [
    {
      "texto": "Ana dice que escondés medicina",
      "consecuencias": {
        "set_flags": ["gomez_met", "player_accused_gomez"],
        "modificar_relacion": { "npc_gomez": -20 }
      },
      "siguiente": "dialogo_gomez_ofendido"
    },
    {
      "texto": "Solo vine a presentarme",
      "consecuencias": {
        "set_flags": ["gomez_met"],
        "modificar_relacion": { "npc_gomez": 5 }
      },
      "siguiente": null
    }
  ]
}
```

### D5: Dr. Gómez - Pedir medicina (flag: ana_requested_meds)

```json
{
  "id": "dialogo_gomez_pedir_medicina",
  "npc_id": "npc_gomez",
  "texto": "¿Ana te mandó? Claro. Siempre quiere MÁS. No entiende que hay que racionar.",
  "condiciones": {
    "flags_required": ["ana_requested_meds"],
    "flags_forbidden": ["got_medicine_from_gomez"]
  },
  "opciones": [
    {
      "texto": "Es para Teresa. Se está muriendo",
      "consecuencias": {
        "set_flags": ["player_appealed_morality"],
        "modificar_relacion": { "npc_gomez": -5 }
      },
      "siguiente": "dialogo_gomez_exige_favor"
    },
    {
      "texto": "[Intimidar] Dame la medicina o se lo digo a todos",
      "stat_check": { "fuerza": 5 },
      "consecuencias": {
        "set_flags": ["player_threatened_gomez", "got_medicine_from_gomez"],
        "give_item": { "id": "item_antibioticos", "cantidad": 1 },
        "modificar_relacion": { "npc_gomez": -30 }
      },
      "siguiente": null
    },
    {
      "texto": "[Persuadir] Devolveme el favor después",
      "stat_check": { "carisma": 5 },
      "consecuencias": {
        "set_flags": [
          "player_negotiated_gomez",
          "got_medicine_from_gomez",
          "owes_gomez_favor"
        ],
        "give_item": { "id": "item_antibioticos", "cantidad": 1 },
        "modificar_relacion": { "npc_gomez": 10 }
      },
      "siguiente": null
    }
  ]
}
```

### D6: Dr. Gómez - Exige favor (camino persuasión fallida)

```json
{
  "id": "dialogo_gomez_exige_favor",
  "npc_id": "npc_gomez",
  "texto": "Está bien. Pero vas a tener que hacer algo por mí primero.",
  "condiciones": {
    "flags_required": ["player_appealed_morality"],
    "flags_forbidden": ["got_medicine_from_gomez"]
  },
  "opciones": [
    {
      "texto": "¿Qué necesitas?",
      "consecuencias": {
        "set_flags": ["agreed_gomez_task", "got_medicine_from_gomez"],
        "give_item": { "id": "item_antibioticos", "cantidad": 1 },
        "start_quest": "quest_gomez_favor"
      },
      "siguiente": null
    },
    {
      "texto": "Olvidalo. Lo consigo de otra forma",
      "consecuencias": {
        "set_flags": ["refused_gomez_task"],
        "modificar_relacion": { "npc_gomez": -10 }
      },
      "siguiente": null
    }
  ]
}
```

### D7: Marco - Interacción genérica (REUTILIZABLE)

```json
{
  "id": "dialogo_marco_guardia",
  "npc_id": "npc_marco",
  "texto": "Todo tranquilo. Ana dice que sos de fiar.",
  "condiciones": {
    "flags_required": ["ana_met"],
    "relacion_minima": { "npc_ana": 10 }
  },
  "opciones": [
    {
      "texto": "¿Qué opinas del Dr. Gómez?",
      "consecuencias": {
        "set_flags": ["marco_talked_about_gomez"]
      },
      "siguiente": "dialogo_marco_opinion_gomez"
    },
    {
      "texto": "Nos vemos",
      "consecuencias": {},
      "siguiente": null
    }
  ]
}
```

### D8: Marco - Opinión sobre Gómez (REUTILIZABLE)

```json
{
  "id": "dialogo_marco_opinion_gomez",
  "npc_id": "npc_marco",
  "texto": "Ese tipo esconde algo. No confío en médicos que 'racionan' selectivamente.",
  "condiciones": {
    "flags_required": ["marco_talked_about_gomez"]
  },
  "opciones": [
    {
      "texto": "¿Crees que tiene medicina oculta?",
      "consecuencias": {
        "set_flags": ["marco_suspects_gomez"],
        "modificar_relacion": { "npc_marco": 5 }
      },
      "siguiente": null
    },
    {
      "texto": "Mejor no meternos",
      "consecuencias": {},
      "siguiente": null
    }
  ]
}
```

### D9: Nina - Interacción técnica (REUTILIZABLE)

```json
{
  "id": "dialogo_nina_generador",
  "npc_id": "npc_nina",
  "texto": "El generador está al límite. Necesito piezas, pero Ana prefiere 'comida y medicina'.",
  "condiciones": {
    "flags_required": [],
    "flags_forbidden": []
  },
  "opciones": [
    {
      "texto": "¿Qué necesitas exactamente?",
      "consecuencias": {
        "set_flags": ["nina_explained_generator"]
      },
      "siguiente": null
    },
    {
      "texto": "Sin electricidad, todos mueren",
      "consecuencias": {
        "set_flags": ["player_agrees_nina"],
        "modificar_relacion": { "npc_nina": 10 }
      },
      "siguiente": null
    }
  ]
}
```

### D10: Sofía - Testigo silencioso (REUTILIZABLE - DA PISTA)

```json
{
  "id": "dialogo_sofia_pista",
  "npc_id": "npc_sofia",
  "texto": "...",
  "condiciones": {
    "flags_required": ["ana_requested_meds"],
    "relacion_minima": { "npc_sofia": 15 }
  },
  "opciones": [
    {
      "texto": "¿Viste algo raro con el Dr. Gómez?",
      "consecuencias": {
        "set_flags": ["sofia_hints_gomez_stash"],
        "modificar_relacion": { "npc_sofia": -5 }
      },
      "siguiente": "dialogo_sofia_susurra"
    },
    {
      "texto": "Dejá, no importa",
      "consecuencias": {},
      "siguiente": null
    }
  ]
}
```

**D10b: Sofía - Susurra (CONSECUENCIA)**

```json
{
  "id": "dialogo_sofia_susurra",
  "npc_id": "npc_sofia",
  "texto": "*Susurra* Revisa la enfermería de noche. Hay una puerta que no está en el plano.",
  "condiciones": {
    "flags_required": ["sofia_hints_gomez_stash"]
  },
  "opciones": [
    {
      "texto": "Gracias",
      "consecuencias": {
        "set_flags": ["knows_gomez_secret_door"]
      },
      "siguiente": null
    }
  ]
}
```

---

## 🎯 1 QUEST COMPLETA: "Medicina para Teresa"

```json
{
  "id": "quest_medicina_teresa",
  "nombre": "Medicina para Teresa",
  "descripcion": "Ana te pidió antibióticos del Dr. Gómez. Teresa se está muriendo.",

  "requisitos_inicio": {
    "flags_required": ["ana_requested_meds"],
    "nivel_minimo": 1
  },

  "objetivos": [
    {
      "id": "objetivo_1",
      "descripcion": "Conseguir antibióticos del Dr. Gómez",
      "tipo": "obtain_item",
      "requerido": { "item_id": "item_antibioticos", "cantidad": 1 },
      "flags_alternativas": [
        "got_medicine_from_gomez",
        "player_threatened_gomez",
        "player_negotiated_gomez"
      ]
    },
    {
      "id": "objetivo_2",
      "descripcion": "Entregar los antibióticos a Ana",
      "tipo": "deliver_item",
      "requerido": { "npc_id": "npc_ana", "item_id": "item_antibioticos" },
      "requiere_completar": ["objetivo_1"]
    }
  ],

  "caminos_posibles": {
    "camino_pacífico": {
      "descripcion": "Convencer al Dr. Gómez con persuasión",
      "flags": ["player_negotiated_gomez"],
      "consecuencias": {
        "relaciones": { "npc_gomez": 10, "npc_ana": 20 },
        "flags_nuevas": ["owes_gomez_favor"]
      }
    },
    "camino_violento": {
      "descripcion": "Intimidar al Dr. Gómez para que entregue la medicina",
      "flags": ["player_threatened_gomez"],
      "consecuencias": {
        "relaciones": { "npc_gomez": -30, "npc_ana": 15 },
        "flags_nuevas": ["gomez_hostile"]
      }
    },
    "camino_robo": {
      "descripcion": "Robar la medicina del escondite secreto",
      "flags": ["knows_gomez_secret_door", "player_stole_meds"],
      "consecuencias": {
        "relaciones": { "npc_gomez": -50, "npc_ana": 10 },
        "flags_nuevas": ["gomez_enemy", "sofia_fears_player"]
      }
    },
    "camino_mentira": {
      "descripcion": "Mentir a Ana diciendo que Gómez se niega",
      "flags": ["player_lied_about_meds"],
      "consecuencias": {
        "relaciones": { "npc_ana": -15, "npc_gomez": 10 },
        "flags_nuevas": ["quest_medicina_failed"],
        "quest_fail": true
      }
    }
  },

  "recompensas": {
    "xp": 50,
    "items": [],
    "flags": ["quest_103_completed", "ana_owes_player"],
    "relaciones": { "npc_ana": 20 }
  },

  "consecuencias_fallida": {
    "flags": ["quest_medicina_failed", "teresa_died"],
    "relaciones": { "npc_ana": -30 }
  }
}
```

---

## 🧪 TEST DE ORO (criterio de éxito)

✅ **Antes de avanzar a FASE A, esto DEBE funcionar:**

1. **Entro al juego** → login exitoso
2. **Hablo con Ana** → aparece "¿Qué necesitas?"
3. **Acepto la quest** → se setea flag `ana_requested_meds`
4. **Voy con Dr. Gómez** → aparece opción de persuadir/intimidar
5. **Consigo medicina** (cualquier camino) → aparece en inventario
6. **Vuelvo con Ana** → aparece opción "[Dar antibióticos]"
7. **Entrego medicina** → quest completa, relación sube, **Ana me habla distinto**
8. **Vuelvo a hablar con Ana** → texto diferente (agradeciemiento, no repite quest)

Si esto funciona → el sistema LATE.
Si esto falla → no avanzar.

---

## 🚨 REGLAS DE IMPLEMENTACIÓN

### ❌ PROHIBIDO:

- Hardcodear `if npcId === 'npc_ana'` en lógica de quests
- Crear diálogos sin condiciones
- Dar items sin setear flags
- Completar quests sin verificar flags
- Agregar "solo una cosa más" sin diseñarla aquí primero

### ✅ PERMITIDO:

- Leer este archivo y convertirlo a JSON
- Crear sistema que evalúa `condiciones` dinámicamente
- Agregar más NPCs/diálogos **copiando esta estructura**
- Expandir propiedades si necesitas (pero NO cambiar lógica)

---

## 📊 RESUMEN DE FLAGS USADAS

| Flag                      | Setter | Uso                                       |
| ------------------------- | ------ | ----------------------------------------- |
| `ana_met`                 | D1     | Indica que el jugador conoce a Ana        |
| `ana_requested_meds`      | D2     | Ana pidió medicina - activa quest         |
| `got_medicine_from_gomez` | D5, D6 | Jugador tiene medicina (cualquier camino) |
| `quest_103_completed`     | D3     | Quest terminada - cambia diálogos         |
| `player_threatened_gomez` | D5     | Camino violento elegido                   |
| `player_negotiated_gomez` | D5     | Camino diplomático elegido                |
| `owes_gomez_favor`        | D5     | Deuda pendiente con Gómez                 |
| `player_lied_about_meds`  | D3     | Mentira dicha - consecuencias futuras     |
| `sofia_hints_gomez_stash` | D10    | Sofía reveló secreto                      |
| `knows_gomez_secret_door` | D10b   | Jugador sabe del escondite                |

---

## 🎯 PRÓXIMO PASO

**FASE A (PODADA)** - Solo cuando este diseño esté implementado:

1. Desactivar combate, enemigos, tiendas, quests viejas
2. Implementar DialogueSystem que lea estos JSON
3. Implementar FlagSystem (player_flags tabla)
4. Conectar quest_medicina_teresa a este sistema
5. **Probar TEST DE ORO**
6. Si pasa → expandir
7. Si falla → arreglar sin agregar features

---

**Firmado:** Sistema diseñado para LATIR, no para impresionar.
