import db from '../db/index.js';
import resolver from '../systems/resolver.js';

class EventManager {
    // Crear nuevo evento
    createEvent(tipo, lugar, titulo, descripcion, opciones) {
        const result = db.prepare(`
      INSERT INTO events (tipo, lugar, titulo, descripcion, opciones, estado)
      VALUES (?, ?, ?, ?, ?, 'activo')
    `).run(tipo, lugar, titulo, descripcion, JSON.stringify(opciones));

        return result.lastInsertRowid;
    }

    // Obtener evento por ID
    getEvent(eventId) {
        const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
        if (!event) return null;

        return {
            ...event,
            opciones: JSON.parse(event.opciones),
            participantes: JSON.parse(event.participantes || '[]'),
            resultados: JSON.parse(event.resultados || '{}')
        };
    }

    // Obtener eventos activos en una locación
    getActiveEvents(lugar) {
        const events = db.prepare('SELECT * FROM events WHERE lugar = ? AND estado = ?').all(lugar, 'activo');
        return events.map(event => this.getEvent(event.id));
    }

    // Jugador elige acción en evento
    playerChooseAction(eventId, playerId, accionIndex) {
        const event = this.getEvent(eventId);
        if (!event) return { success: false, error: 'Evento no existe' };
        if (event.estado !== 'activo') return { success: false, error: 'Evento no está activo' };

        const accion = event.opciones[accionIndex];
        if (!accion) return { success: false, error: 'Acción inválida' };

        // Agregar jugador a participantes si no está
        if (!event.participantes.includes(playerId)) {
            event.participantes.push(playerId);
        }

        // Guardar elección del jugador
        event.resultados[playerId] = {
            accionIndex,
            accion: accion.texto,
            timestamp: new Date().toISOString()
        };

        // Actualizar en BD
        db.prepare('UPDATE events SET participantes = ?, resultados = ? WHERE id = ?')
            .run(JSON.stringify(event.participantes), JSON.stringify(event.resultados), eventId);

        return {
            success: true,
            accion
        };
    }

    // Resolver evento (calcular consecuencias)
    async resolveEvent(eventId) {
        const event = this.getEvent(eventId);
        if (!event) return null;

        const consecuencias = [];

        // Procesar cada jugador participante
        for (const playerId of event.participantes) {
            const eleccion = event.resultados[playerId];
            if (!eleccion) continue;

            const accion = event.opciones[eleccion.accionIndex];

            // Usar el resolver para calcular resultado
            const resultado = await resolver.resolveAction(playerId, accion, event);

            consecuencias.push({
                playerId,
                ...resultado
            });
        }

        // Marcar evento como resuelto
        db.prepare('UPDATE events SET estado = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run('resuelto', eventId);

        return {
            eventId,
            consecuencias
        };
    }

    // Cancelar evento
    cancelEvent(eventId) {
        db.prepare('UPDATE events SET estado = ? WHERE id = ?').run('cancelado', eventId);
    }

    // EVENTOS PREDEFINIDOS

    // Evento: Ataque zombie
    crearEventoZombieAtaque(lugar) {
        return this.createEvent(
            'peligro',
            lugar,
            '¡Zombies a la vista!',
            'Tres zombies han entrado al lugar. Se mueven lento pero son peligrosos. Hay que actuar rápido.',
            [
                {
                    texto: 'Atacar directamente',
                    requisitos: { stat: 'resistencia', minimo: 5 },
                    dificultad: 12,
                    consecuencias: {
                        exito: { salud: -10, experiencia: 30, mensaje: 'Logras eliminar a un zombie, pero te lastimas en el proceso.' },
                        fracaso: { salud: -30, estres: +20, mensaje: 'El zombie te ataca. Estás herido y asustado.' }
                    }
                },
                {
                    texto: 'Buscar escape',
                    requisitos: { stat: 'astucia', minimo: 4 },
                    dificultad: 10,
                    consecuencias: {
                        exito: { estres: -5, experiencia: 20, mensaje: 'Encuentras una salida segura y ayudas a otros a escapar.' },
                        fracaso: { salud: -15, estres: +10, mensaje: 'Tropiezas al huir. Un zombie casi te alcanza.' }
                    }
                },
                {
                    texto: 'Proteger a otros',
                    requisitos: { stat: 'carisma', minimo: 6 },
                    dificultad: 14,
                    consecuencias: {
                        exito: { reputacion: +20, experiencia: 40, mensaje: 'Tu valentía inspira a otros. Juntos repelen el ataque.' },
                        fracaso: { salud: -20, reputacion: -10, mensaje: 'Intentas proteger a alguien pero ambos son heridos.' }
                    }
                },
                {
                    texto: 'Esconderse',
                    requisitos: {},
                    dificultad: 8,
                    consecuencias: {
                        exito: { experiencia: 10, mensaje: 'Te escondes exitosamente hasta que pasa el peligro.' },
                        fracaso: { estres: +15, reputacion: -5, mensaje: 'Te escondiste pero otros te vieron. Eres considerado cobarde.' }
                    }
                }
            ]
        );
    }

    // Evento: Conflicto por recursos
    crearEventoConflictoRecursos(lugar) {
        return this.createEvent(
            'social',
            lugar,
            'Disputa por comida',
            'Dos grupos discuten por los últimos recursos del lugar. La tensión está alta. ¿Qué haces?',
            [
                {
                    texto: 'Mediar el conflicto',
                    requisitos: { stat: 'empatia', minimo: 6 },
                    dificultad: 13,
                    consecuencias: {
                        exito: { reputacion: +15, experiencia: 35, mensaje: 'Logras un acuerdo justo. Todos te respetan más.' },
                        fracaso: { reputacion: -5, estres: +10, mensaje: 'Tu mediación falla. Ambos grupos te culpan.' }
                    }
                },
                {
                    texto: 'Intimidar a uno de los grupos',
                    requisitos: { stat: 'intimidacion', minimo: 7 },
                    dificultad: 12,
                    consecuencias: {
                        exito: { reputacion: +10, miedo: +5, experiencia: 25, mensaje: 'Tu presencia imponente resuelve el conflicto.' },
                        fracaso: { salud: -20, reputacion: -15, mensaje: 'Inicia una pelea. Sales herido y odiado.' }
                    }
                },
                {
                    texto: 'Ofrecer tus propios recursos',
                    requisitos: {},
                    dificultad: 8,
                    consecuencias: {
                        exito: { reputacion: +25, inventario_cambio: -1, mensaje: 'Tu generosidad calma la situación. Eres admirado.' },
                        fracaso: { reputacion: +5, inventario_cambio: -1, mensaje: 'Tu oferta ayuda poco, pero es apreciada.' }
                    }
                },
                {
                    texto: 'Ignorar y alejarse',
                    requisitos: {},
                    dificultad: 5,
                    consecuencias: {
                        exito: { mensaje: 'Te alejas sin problemas.' },
                        fracaso: { reputacion: -10, mensaje: 'Tu indiferencia es notada negativamente.' }
                    }
                }
            ]
        );
    }

    // Sistema automático de eventos
    iniciarSistemaEventos() {
        // Generar evento aleatorio cada 3-5 minutos
        setInterval(() => {
            this.generarEventoAleatorio();
        }, Math.random() * 120000 + 180000); // 3-5 minutos
    }

    generarEventoAleatorio() {
        const lugares = ['hospital', 'mercado', 'calle_norte', 'calle_sur'];
        const lugarAleatorio = lugares[Math.floor(Math.random() * lugares.length)];

        const tipoEvento = Math.random();

        if (tipoEvento < 0.6) {
            // 60% peligro
            return this.crearEventoZombieAtaque(lugarAleatorio);
        } else {
            // 40% social
            return this.crearEventoConflictoRecursos(lugarAleatorio);
        }
    }
}

export default new EventManager();
