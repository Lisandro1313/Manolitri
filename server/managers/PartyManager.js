/**
 * PartyManager
 * Gestiona grupos de jugadores:
 * - Crear party
 * - Invitar/aceptar jugadores
 * - Gestionar líder
 * - Expulsar/abandonar
 * - Iniciar aventuras en grupo
 */

const db = require('../db');

class PartyManager {
    constructor() {
        // Parties activos: { partyId: partyData }
        this.parties = new Map();

        // Mapa de jugador -> party: { characterId: partyId }
        this.playerParty = new Map();

        // Invitaciones pendientes: { characterId: [partyIds] }
        this.pendingInvites = new Map();
    }

    /**
     * Crear un nuevo party
     */
    createParty(characterId, characterName) {
        // Verificar que no esté ya en un party
        if (this.playerParty.has(characterId)) {
            return {
                success: false,
                error: 'Ya estás en un grupo'
            };
        }

        const partyId = `party_${Date.now()}_${characterId}`;

        const party = {
            id: partyId,
            lider: characterId,
            lider_nombre: characterName,
            miembros: [{
                id: characterId,
                nombre: characterName,
                rol: 'lider'
            }],
            max_miembros: 6,
            estado: 'en_lobby',
            zona_reunion: null,
            invitaciones: [],
            created_at: new Date()
        };

        this.parties.set(partyId, party);
        this.playerParty.set(characterId, partyId);

        console.log(`👥 Party ${partyId} creado por ${characterName}`);

        return {
            success: true,
            party: this.getPartyData(partyId)
        };
    }

    /**
     * Invitar jugador a party
     */
    invitePlayer(partyId, targetCharacterId, targetCharacterName, inviterCharacterId) {
        const party = this.parties.get(partyId);

        if (!party) {
            return { success: false, error: 'Party no encontrado' };
        }

        // Solo el líder puede invitar
        if (party.lider !== inviterCharacterId) {
            return { success: false, error: 'Solo el líder puede invitar' };
        }

        // Verificar que el objetivo no esté ya en un party
        if (this.playerParty.has(targetCharacterId)) {
            return { success: false, error: 'Ese jugador ya está en un grupo' };
        }

        // Verificar que no esté ya invitado
        if (party.invitaciones.includes(targetCharacterId)) {
            return { success: false, error: 'Ya invitaste a ese jugador' };
        }

        // Verificar límite de miembros
        if (party.miembros.length >= party.max_miembros) {
            return { success: false, error: 'El grupo está lleno' };
        }

        // Añadir invitación
        party.invitaciones.push(targetCharacterId);

        // Añadir a invitaciones pendientes del jugador
        if (!this.pendingInvites.has(targetCharacterId)) {
            this.pendingInvites.set(targetCharacterId, []);
        }
        this.pendingInvites.get(targetCharacterId).push({
            partyId,
            lider_nombre: party.lider_nombre,
            miembros_count: party.miembros.length
        });

        console.log(`📨 ${targetCharacterName} invitado a party ${partyId}`);

        return {
            success: true,
            targetCharacterId,
            targetCharacterName
        };
    }

    /**
     * Aceptar invitación a party
     */
    acceptInvite(partyId, characterId, characterName) {
        const party = this.parties.get(partyId);

        if (!party) {
            return { success: false, error: 'Party no encontrado' };
        }

        // Verificar que esté invitado
        if (!party.invitaciones.includes(characterId)) {
            return { success: false, error: 'No tienes invitación a este grupo' };
        }

        // Verificar que no esté ya en un party
        if (this.playerParty.has(characterId)) {
            return { success: false, error: 'Ya estás en un grupo' };
        }

        // Verificar límite
        if (party.miembros.length >= party.max_miembros) {
            return { success: false, error: 'El grupo está lleno' };
        }

        // Añadir al party
        party.miembros.push({
            id: characterId,
            nombre: characterName,
            rol: 'miembro'
        });

        // Remover invitación
        party.invitaciones = party.invitaciones.filter(id => id !== characterId);

        // Actualizar mapas
        this.playerParty.set(characterId, partyId);

        // Limpiar invitaciones pendientes
        if (this.pendingInvites.has(characterId)) {
            this.pendingInvites.delete(characterId);
        }

        console.log(`✅ ${characterName} se unió a party ${partyId}`);

        return {
            success: true,
            party: this.getPartyData(partyId)
        };
    }

    /**
     * Rechazar invitación
     */
    rejectInvite(partyId, characterId) {
        const party = this.parties.get(partyId);

        if (party) {
            party.invitaciones = party.invitaciones.filter(id => id !== characterId);
        }

        // Remover de invitaciones pendientes
        if (this.pendingInvites.has(characterId)) {
            const invites = this.pendingInvites.get(characterId);
            const filtered = invites.filter(inv => inv.partyId !== partyId);

            if (filtered.length === 0) {
                this.pendingInvites.delete(characterId);
            } else {
                this.pendingInvites.set(characterId, filtered);
            }
        }

        return { success: true };
    }

    /**
     * Abandonar party
     */
    leaveParty(characterId) {
        const partyId = this.playerParty.get(characterId);

        if (!partyId) {
            return { success: false, error: 'No estás en ningún grupo' };
        }

        const party = this.parties.get(partyId);

        if (!party) {
            return { success: false, error: 'Party no encontrado' };
        }

        // Remover del party
        party.miembros = party.miembros.filter(m => m.id !== characterId);
        this.playerParty.delete(characterId);

        // Si era el líder y quedan miembros, pasar liderazgo
        if (party.lider === characterId && party.miembros.length > 0) {
            const newLeader = party.miembros[0];
            party.lider = newLeader.id;
            party.lider_nombre = newLeader.nombre;
            newLeader.rol = 'lider';

            console.log(`👑 Nuevo líder de party ${partyId}: ${newLeader.nombre}`);
        }

        // Si no quedan miembros, disolver party
        if (party.miembros.length === 0) {
            this.disbandParty(partyId);
            return { success: true, disbanded: true };
        }

        console.log(`👋 Jugador ${characterId} abandonó party ${partyId}`);

        return {
            success: true,
            party: this.getPartyData(partyId)
        };
    }

    /**
     * Expulsar jugador del party (solo líder)
     */
    kickPlayer(partyId, targetCharacterId, kickerCharacterId) {
        const party = this.parties.get(partyId);

        if (!party) {
            return { success: false, error: 'Party no encontrado' };
        }

        // Solo el líder puede expulsar
        if (party.lider !== kickerCharacterId) {
            return { success: false, error: 'Solo el líder puede expulsar' };
        }

        // No puede expulsarse a sí mismo
        if (targetCharacterId === kickerCharacterId) {
            return { success: false, error: 'Usa "abandonar" para salir del grupo' };
        }

        // Verificar que el jugador esté en el party
        const memberIndex = party.miembros.findIndex(m => m.id === targetCharacterId);

        if (memberIndex === -1) {
            return { success: false, error: 'Ese jugador no está en el grupo' };
        }

        // Remover
        party.miembros.splice(memberIndex, 1);
        this.playerParty.delete(targetCharacterId);

        console.log(`🚫 Jugador ${targetCharacterId} expulsado de party ${partyId}`);

        return {
            success: true,
            kickedCharacterId: targetCharacterId,
            party: this.getPartyData(partyId)
        };
    }

    /**
     * Disolver party
     */
    disbandParty(partyId) {
        const party = this.parties.get(partyId);

        if (!party) return;

        // Remover a todos los miembros del mapa
        party.miembros.forEach(member => {
            this.playerParty.delete(member.id);
        });

        // Remover party
        this.parties.delete(partyId);

        console.log(`💔 Party ${partyId} disuelto`);
    }

    /**
     * Obtener datos de party (para enviar al cliente)
     */
    getPartyData(partyId) {
        const party = this.parties.get(partyId);

        if (!party) return null;

        return {
            id: party.id,
            lider: party.lider,
            lider_nombre: party.lider_nombre,
            miembros: party.miembros,
            max_miembros: party.max_miembros,
            estado: party.estado,
            miembros_count: party.miembros.length
        };
    }

    /**
     * Obtener party de un jugador
     */
    getPlayerParty(characterId) {
        const partyId = this.playerParty.get(characterId);
        return partyId ? this.getPartyData(partyId) : null;
    }

    /**
     * Obtener invitaciones pendientes de un jugador
     */
    getPendingInvites(characterId) {
        return this.pendingInvites.get(characterId) || [];
    }

    /**
     * Cambiar estado del party (para aventuras)
     */
    setPartyState(partyId, newState) {
        const party = this.parties.get(partyId);

        if (party) {
            party.estado = newState;
            return true;
        }

        return false;
    }

    /**
     * Verificar si todos los miembros están en la misma zona
     */
    async areAllMembersInSameZone(partyId, zoneManager) {
        const party = this.parties.get(partyId);

        if (!party || party.miembros.length === 0) return false;

        const firstMemberZone = zoneManager.getPlayerZone(party.miembros[0].id);

        if (!firstMemberZone) return false;

        // Verificar que todos estén en la misma zona
        for (const member of party.miembros) {
            const memberZone = zoneManager.getPlayerZone(member.id);

            if (!memberZone || memberZone.id !== firstMemberZone.id) {
                return false;
            }
        }

        return true;
    }

    /**
     * Obtener todos los miembros de un party (con datos completos)
     */
    getPartyMembers(partyId) {
        const party = this.parties.get(partyId);
        return party ? party.miembros : [];
    }

    /**
     * Broadcast mensaje a todo el party
     */
    broadcastToParty(partyId, message, wsServer, excludeCharacterId = null) {
        const party = this.parties.get(partyId);

        if (!party || !wsServer) return;

        const members = excludeCharacterId
            ? party.miembros.filter(m => m.id !== excludeCharacterId)
            : party.miembros;

        members.forEach(member => {
            wsServer.sendToCharacter(member.id, message);
        });
    }

    /**
     * Obtener estadísticas
     */
    getStats() {
        return {
            total_parties: this.parties.size,
            players_in_parties: this.playerParty.size,
            pending_invites: this.pendingInvites.size
        };
    }
}

// Singleton
const partyManager = new PartyManager();

module.exports = partyManager;
