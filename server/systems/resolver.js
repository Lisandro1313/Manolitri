import db from '../db/index.js';
import statsManager from './stats.js';
import relationshipManager from './relations.js';

class ActionResolver {
    // Resolver una acción de jugador en un evento
    async resolveAction(playerId, accion, evento) {
        // 1. Verificar requisitos
        if (accion.requisitos && accion.requisitos.stat) {
            const cumple = statsManager.checkRequirement(playerId, accion.requisitos);
            if (!cumple) {
                return {
                    exito: false,
                    mensaje: `No tienes suficiente ${accion.requisitos.stat} (mínimo ${accion.requisitos.minimo})`,
                    penalizacion: true
                };
            }
        }

        // 2. Obtener stats del jugador
        const { stats, emociones } = statsManager.getPlayerStats(playerId);

        // 3. Calcular valor base
        let valorBase = 0;
        if (accion.requisitos && accion.requisitos.stat) {
            valorBase = stats[accion.requisitos.stat];
        } else {
            valorBase = 5; // Valor neutral si no hay stat específico
        }

        // 4. Calcular modificadores
        const modEmocional = statsManager.getEmotionalModifier(playerId);
        const modRelaciones = this.getRelationshipModifier(playerId, evento);
        const dado = Math.floor(Math.random() * 20) + 1; // d20

        // 5. Calcular resultado total
        const resultadoTotal = valorBase + modEmocional + modRelaciones + dado;

        // 6. Determinar éxito o fracaso
        const dificultad = accion.dificultad || 10;
        const exito = resultadoTotal >= dificultad;

        // 7. Aplicar consecuencias
        const consecuencia = exito ? accion.consecuencias.exito : accion.consecuencias.fracaso;
        await this.applyConsequences(playerId, consecuencia, evento.lugar);

        // 8. Retornar resultado detallado
        return {
            exito,
            resultadoTotal,
            dificultad,
            desglose: {
                valorBase,
                modEmocional,
                modRelaciones,
                dado
            },
            mensaje: consecuencia.mensaje,
            consecuencias: consecuencia
        };
    }

    // Calcular modificador de relaciones para el evento
    getRelationshipModifier(playerId, evento) {
        // Si hay NPCs involucrados, calcular reputación en el lugar
        const reputacion = relationshipManager.getLocationReputation(playerId, evento.lugar);

        let modifier = 0;

        if (reputacion.respeto > 7) modifier += 2;
        if (reputacion.respeto < 3) modifier -= 2;
        if (reputacion.miedo > 7) modifier += 1;

        return modifier;
    }

    // Aplicar consecuencias de una acción
    async applyConsequences(playerId, consecuencias, locationId) {
        // Cambios en stats
        const statsChanges = {};
        const emotionChanges = {};

        if (consecuencias.salud) statsChanges.salud = consecuencias.salud;
        if (consecuencias.resistencia) statsChanges.resistencia = consecuencias.resistencia;
        if (consecuencias.estres) statsChanges.estres = consecuencias.estres;
        if (consecuencias.carisma) statsChanges.carisma = consecuencias.carisma;
        if (consecuencias.empatia) statsChanges.empatia = consecuencias.empatia;
        if (consecuencias.intimidacion) statsChanges.intimidacion = consecuencias.intimidacion;
        if (consecuencias.astucia) statsChanges.astucia = consecuencias.astucia;

        if (Object.keys(statsChanges).length > 0) {
            statsManager.updateStats(playerId, statsChanges);
        }

        // Cambios emocionales
        if (consecuencias.miedo) emotionChanges.miedo = consecuencias.miedo;
        if (consecuencias.confianza) emotionChanges.confianza = consecuencias.confianza;
        if (consecuencias.esperanza) emotionChanges.esperanza = consecuencias.esperanza;
        if (consecuencias.desesperacion) emotionChanges.desesperacion = consecuencias.desesperacion;

        if (Object.keys(emotionChanges).length > 0) {
            statsManager.updateEmotions(playerId, emotionChanges);
        }

        // Cambio de reputación
        if (consecuencias.reputacion) {
            statsManager.updateReputation(playerId, consecuencias.reputacion);

            // Propagar cambio de reputación a otros en la locación
            const relationChanges = {
                respeto: Math.floor(consecuencias.reputacion / 10)
            };
            relationshipManager.propagateReputationChange(playerId, locationId, relationChanges);
        }

        // Experiencia
        if (consecuencias.experiencia) {
            statsManager.addExperience(playerId, consecuencias.experiencia);
        }

        // Cambios en inventario (si se implementa)
        if (consecuencias.inventario_cambio) {
            // TODO: implementar sistema de inventario
        }
    }

    // Resolver acción social (diálogo, negociación, etc.)
    async resolveSocialAction(playerId, targetId, targetType, accionTipo) {
        const player = statsManager.getPlayerStats(playerId);

        let stat = 'carisma';
        let dificultad = 12;

        switch (accionTipo) {
            case 'persuadir':
                stat = 'carisma';
                dificultad = 13;
                break;
            case 'intimidar':
                stat = 'intimidacion';
                dificultad = 12;
                break;
            case 'empatizar':
                stat = 'empatia';
                dificultad = 11;
                break;
            case 'engañar':
                stat = 'astucia';
                dificultad = 14;
                break;
        }

        const valorBase = player.stats[stat];
        const modRelacion = relationshipManager.getRelationshipModifier(playerId, targetId, targetType);
        const modEmocional = statsManager.getEmotionalModifier(playerId);
        const dado = Math.floor(Math.random() * 20) + 1;

        const total = valorBase + modRelacion + modEmocional + dado;
        const exito = total >= dificultad;

        // Aplicar cambios en relación
        if (exito) {
            const cambios = {};
            switch (accionTipo) {
                case 'persuadir':
                    cambios.confianza = 1;
                    cambios.respeto = 1;
                    break;
                case 'intimidar':
                    cambios.miedo = 2;
                    cambios.respeto = -1;
                    break;
                case 'empatizar':
                    cambios.confianza = 2;
                    break;
                case 'engañar':
                    // Si tiene éxito el engaño
                    cambios.confianza = 1;
                    break;
            }
            relationshipManager.modifyRelationship(targetId, playerId, cambios, targetType, 'player');
        } else {
            // Fracaso puede dañar relación
            if (accionTipo === 'engañar') {
                relationshipManager.modifyRelationship(targetId, playerId, {
                    confianza: -2,
                    resentimiento: 1
                }, targetType, 'player');
            }
        }

        return {
            exito,
            total,
            dificultad,
            desglose: { valorBase, modRelacion, modEmocional, dado },
            accionTipo
        };
    }
}

export default new ActionResolver();
