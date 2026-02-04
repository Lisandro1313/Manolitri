// Estado global del juego
const gameState = {
    ws: null,
    player: null,
    currentLocation: null,
    inCombat: false,
    currentEnemy: null
};

// Elementos del DOM
const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const loginForm = document.getElementById('login-form');
const aliasInput = document.getElementById('alias-input');
const loginError = document.getElementById('login-error');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

// Combat
const combatPanel = document.getElementById('combat-panel');
const attackBtn = document.getElementById('attack-btn');
const fleeBtn = document.getElementById('flee-btn');

// Modals
const inventoryModal = document.getElementById('inventory-modal');
const questsModal = document.getElementById('quests-modal');
const dialogueModal = document.getElementById('dialogue-modal');

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    setupLoginForm();
    setupChatForm();
    setupModals();
    setupCombatButtons();
    setupActionButtons();
});

// ===== LOGIN =====
function setupLoginForm() {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const alias = aliasInput.value.trim();

        if (alias.length < 3) {
            showLoginError('El alias debe tener al menos 3 caracteres');
            return;
        }

        connectToServer(alias);
    });
}

function showLoginError(message) {
    loginError.textContent = message;
    setTimeout(() => {
        loginError.textContent = '';
    }, 3000);
}

// ===== WEBSOCKET =====
function connectToServer(alias) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    gameState.ws = new WebSocket(wsUrl);

    gameState.ws.onopen = () => {
        console.log('✓ Conectado al servidor');
        // Enviar login
        sendMessage('login', { alias });
    };

    gameState.ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleServerMessage(message);
    };

    gameState.ws.onerror = (error) => {
        console.error('Error WebSocket:', error);
        showLoginError('Error al conectar con el servidor');
    };

    gameState.ws.onclose = () => {
        console.log('Desconectado del servidor');
        addSystemMessage('Desconectado del servidor');
    };
}

function sendMessage(tipo, data) {
    if (gameState.ws && gameState.ws.readyState === WebSocket.OPEN) {
        gameState.ws.send(JSON.stringify({ tipo, data }));
    }
}

// ===== MENSAJES DEL SERVIDOR =====
function handleServerMessage(message) {
    const { tipo, ...data } = message;

    switch (tipo) {
        case 'login_exitoso':
            handleLoginSuccess(data.jugador);
            break;

        case 'estado_lugar':
            updateLocationState(data.lugar);
            break;

        case 'mensaje_chat':
            addChatMessage(data.autor, data.mensaje, data.timestamp);
            break;

        case 'jugador_entro':
            addSystemMessage(`${data.jugador.alias} ha entrado al lugar`);
            requestState();
            break;

        case 'jugador_salio':
            addSystemMessage(`${data.jugador.alias} se fue hacia otro lugar`);
            requestState();
            break;

        case 'movimiento_exitoso':
            updateLocationState(data.lugar);
            addActionLog('Te has movido a un nuevo lugar', 'success');
            break;

        case 'accion_registrada':
            addActionLog(`Acción registrada: ${data.accion.texto}`, 'success');
            break;

        case 'jugador_actuo':
            addSystemMessage(`${data.jugador} ha tomado una acción en el evento`);
            break;

        // COMBAT
        case 'combate_iniciado':
            handleCombatStarted(data.enemigo);
            break;

        case 'resultado_ataque':
            handleAttackResult(data);
            break;

        case 'enemigo_muerto':
            handleEnemyDeath(data);
            break;

        case 'jugador_muerto':
            handlePlayerDeath(data);
            break;

        case 'huida_exitosa':
            handleFleeSuccess();
            break;

        // INVENTORY
        case 'inventario':
            displayInventory(data);
            break;

        case 'item_equipado':
            addActionLog(`${data.item.nombre} equipado`, 'success');
            break;

        case 'item_usado':
            addActionLog(data.mensaje, 'success');
            updatePlayerStats(data.stats);
            break;

        // QUESTS
        case 'quests':
        case 'lista_misiones':
            displayQuests(data);
            break;

        case 'quest_aceptada':
        case 'mision_aceptada':
            addActionLog(`Misión aceptada: ${data.quest?.titulo || data.mision?.titulo || 'Nueva misión'}`, 'success');
            break;

        case 'quest_completada':
        case 'mision_completada':
            addActionLog(`¡Misión completada! +${data.recompensas.exp} EXP, +${data.recompensas.oro} oro`, 'xp');
            updatePlayerDataAfterAction(data.jugador);
            break;

        case 'progreso_mision':
            addActionLog(`Progreso de misión: ${data.titulo} (${data.progreso}/${data.objetivo})`, 'info');
            break;

        // DIALOGUE
        case 'dialogo':
            displayDialogue(data);
            break;

        case 'dialogo_respuesta':
            handleDialogueResponse(data);
            // Actualizar jugador si vienen datos
            if (data.jugador) {
                updatePlayerDataAfterAction(data.jugador);
            }
            break;

        // DATOS DEL JUGADOR ACTUALIZADOS
        case 'datos_jugador_actualizados':
            updatePlayerDataAfterAction(data.jugador);
            break;

        // EVENTO GLOBAL
        case 'evento_global':
            handleEventoGlobal(data);
            break;

        // INVENTARIO
        case 'inventario':
            displayInventory(data);
            break;

        // WORLD SIMULATION
        case 'estado_mundo':
            displayWorldState(data.mundo);
            break;

        case 'error':
            addActionLog(data.mensaje, 'failure');
            break;

        default:
            console.log('Mensaje no manejado:', tipo, data);
            addActionLog('Tipo de mensaje desconocido', 'failure');
    }
}

// ===== LOGIN SUCCESS =====
function handleLoginSuccess(player) {
    // Parsear stats si vienen como string
    if (typeof player.stats === 'string') {
        player.stats = JSON.parse(player.stats);
    }
    if (typeof player.estado_emocional === 'string') {
        player.estado_emocional = JSON.parse(player.estado_emocional);
    }

    gameState.player = player;

    loginScreen.classList.remove('active');
    gameScreen.classList.add('active');

    document.getElementById('player-alias').textContent = player.alias;

    // Usar updatePlayerDataAfterAction para todo
    updatePlayerDataAfterAction(player);

    addSystemMessage('¡Bienvenido a MANOLITRI!');
}

// ===== ACTUALIZAR STATS =====
function updatePlayerStats(player) {
    const stats = player.stats;

    // Barras
    document.getElementById('health-bar').style.width = `${stats.salud}%`;
    document.getElementById('health-value').textContent = stats.salud;
    document.getElementById('stress-bar').style.width = `${stats.estres}%`;
    document.getElementById('stress-value').textContent = stats.estres;

    // Stats individuales
    document.getElementById('stat-resistencia').textContent = stats.resistencia || 5;
    document.getElementById('stat-carisma').textContent = stats.carisma || 5;
    document.getElementById('stat-empatia').textContent = stats.empatia || 5;
    document.getElementById('stat-intimidacion').textContent = stats.intimidacion || 5;
    document.getElementById('stat-astucia').textContent = stats.astucia || 5;
}

// ===== ACTUALIZAR DATOS DEL JUGADOR DESPUÉS DE ACCIÓN =====
function updatePlayerDataAfterAction(player) {
    if (!player) return;

    // Actualizar referencia global
    gameState.player = player;

    // Actualizar header
    document.getElementById('player-level').textContent = player.nivel;
    document.getElementById('player-exp').textContent = player.experiencia || 0;
    document.getElementById('player-exp-next').textContent = 100;
    document.getElementById('player-gold-header').textContent = player.oro || 0;
    document.getElementById('player-reputation').textContent = `Rep: ${player.reputacion || 0}`;

    // Actualizar stats si existen
    if (player.stats) {
        const stats = typeof player.stats === 'string' ? JSON.parse(player.stats) : player.stats;
        const emociones = typeof player.estado_emocional === 'string' ? JSON.parse(player.estado_emocional) : player.estado_emocional;

        // Actualizar barras de salud y energía
        const healthPercent = Math.max(0, Math.min(100, (stats.salud / stats.salud_max) * 100));
        const energyPercent = Math.max(0, Math.min(100, (stats.energia / stats.energia_max) * 100));

        document.getElementById('health-bar').style.width = `${healthPercent}%`;
        document.getElementById('health-text').textContent = `${Math.floor(stats.salud)}/${stats.salud_max}`;
        document.getElementById('energy-bar').style.width = `${energyPercent}%`;
        document.getElementById('energy-text').textContent = `${Math.floor(stats.energia)}/${stats.energia_max}`;

        // Actualizar stats en panel lateral
        document.getElementById('stat-fuerza').textContent = stats.fuerza || 5;
        document.getElementById('stat-defensa').textContent = stats.defensa || 5;
        document.getElementById('stat-velocidad').textContent = stats.velocidad || 5;
        document.getElementById('stat-resistencia').textContent = stats.resistencia || 5;
        document.getElementById('stat-carisma').textContent = stats.carisma || 5;
        document.getElementById('stat-empatia').textContent = stats.empatia || 5;
        document.getElementById('stat-intimidacion').textContent = stats.intimidacion || 5;
        document.getElementById('stat-astucia').textContent = stats.astucia || 5;
        document.getElementById('stat-percepcion').textContent = stats.percepcion || 5;
        document.getElementById('stat-suerte').textContent = stats.suerte || 5;

        // Actualizar emociones si existen
        if (emociones) {
            document.getElementById('emotion-miedo').textContent = emociones.miedo || 0;
            document.getElementById('emotion-confianza').textContent = emociones.confianza || 0;
            document.getElementById('emotion-esperanza').textContent = emociones.esperanza || 0;
            document.getElementById('emotion-desesperacion').textContent = emociones.desesperacion || 0;
        }

        player.stats = stats;
        player.estado_emocional = emociones;
    }
}

// ===== ACTUALIZAR LOCACIÓN =====
function updateLocationState(lugar) {
    gameState.currentLocation = lugar;

    // Info del lugar
    document.getElementById('location-name').textContent = lugar.nombre;
    document.getElementById('location-description').textContent = lugar.descripcion;
    document.getElementById('danger-level').textContent = lugar.peligro_nivel;

    // Jugadores
    const playersList = document.getElementById('players-list');
    playersList.innerHTML = '';
    lugar.jugadores.forEach(player => {
        const li = document.createElement('li');
        li.textContent = `${player.alias} (Nv.${player.nivel})`;
        if (player.id === gameState.player.id) {
            li.style.color = '#4ecdc4';
            li.textContent += ' (Tú)';
        }
        playersList.appendChild(li);
    });

    // NPCs
    const npcsList = document.getElementById('npcs-list');
    npcsList.innerHTML = '';
    if (lugar.npcs && lugar.npcs.length > 0) {
        lugar.npcs.forEach(npc => {
            const li = document.createElement('li');
            li.textContent = `💬 ${npc.nombre} - ${npc.rol_social}`;
            li.style.cursor = 'pointer';
            li.style.color = '#4ecdc4';
            li.onclick = () => talkToNPC(npc.id);
            npcsList.appendChild(li);
        });
    } else {
        npcsList.innerHTML = '<li style="color: #888;">No hay NPCs</li>';
    }

    // Enemigos
    const enemiesList = document.getElementById('enemies-list');
    enemiesList.innerHTML = '';
    if (lugar.enemigos && lugar.enemigos.length > 0) {
        lugar.enemigos.forEach(enemigo => {
            const li = document.createElement('li');
            li.textContent = `${enemigo.nombre} (Nv.${enemigo.nivel})`;
            li.style.cursor = 'pointer';
            li.style.color = '#ff6b6b';
            li.onclick = () => startCombat(enemigo.id);
            enemiesList.appendChild(li);
        });
    } else {
        enemiesList.innerHTML = '<li style="color: #888;">No hay enemigos</li>';
    }

    // Conexiones
    const connectionsList = document.getElementById('connections-list');
    connectionsList.innerHTML = '';
    lugar.conexiones.forEach(conexionId => {
        const btn = document.createElement('button');
        btn.className = 'connection-btn';
        btn.textContent = `→ ${conexionId.replace('_', ' ').toUpperCase()}`;
        btn.onclick = () => moveToLocation(conexionId);
        connectionsList.appendChild(btn);
    });

    // Eventos
    updateEvents(lugar.eventos);
}

// ===== EVENTOS =====
function updateEvents(eventos) {
    const eventsList = document.getElementById('events-list');
    eventsList.innerHTML = '';

    if (eventos.length === 0) {
        eventsList.innerHTML = '<p style="color: #888; font-style: italic;">No hay eventos activos</p>';
        return;
    }

    eventos.forEach(evento => {
        const eventCard = document.createElement('div');
        eventCard.className = `event-card ${evento.tipo}`;

        const title = document.createElement('div');
        title.className = 'event-title';
        title.textContent = `⚡ ${evento.titulo}`;

        const description = document.createElement('div');
        description.className = 'event-description';
        description.textContent = evento.descripcion;

        const actions = document.createElement('div');
        actions.className = 'event-actions';

        // Verificar si ya participó
        const yaParticipo = evento.participantes.includes(gameState.player.id);

        evento.opciones.forEach((opcion, index) => {
            const btn = document.createElement('button');
            btn.className = 'action-btn';
            btn.textContent = opcion.texto;

            if (opcion.requisitos && opcion.requisitos.stat) {
                btn.textContent += ` [${opcion.requisitos.stat} ${opcion.requisitos.minimo}+]`;
            }

            if (yaParticipo) {
                btn.disabled = true;
                btn.textContent += ' ✓';
            } else {
                btn.onclick = () => chooseEventAction(evento.id, index);
            }

            actions.appendChild(btn);
        });

        eventCard.appendChild(title);
        eventCard.appendChild(description);
        eventCard.appendChild(actions);
        eventsList.appendChild(eventCard);
    });
}

// ===== ACCIONES =====
function moveToLocation(destinoId) {
    sendMessage('mover', {
        playerId: gameState.player.id,
        destinoId
    });
}

function chooseEventAction(eventoId, accionIndex) {
    sendMessage('accion_evento', {
        playerId: gameState.player.id,
        eventoId,
        accionIndex
    });
}

function requestState() {
    sendMessage('solicitar_estado', {
        playerId: gameState.player.id
    });
}

// ===== CHAT =====
function setupChatForm() {
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const mensaje = chatInput.value.trim();

        if (mensaje.length === 0) return;

        sendMessage('chat', {
            playerId: gameState.player.id,
            mensaje
        });

        chatInput.value = '';
    });
}

function addChatMessage(autor, mensaje, timestamp) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';

    const authorDiv = document.createElement('div');
    authorDiv.className = 'chat-author';
    authorDiv.textContent = autor;

    const textDiv = document.createElement('div');
    textDiv.className = 'chat-text';
    textDiv.textContent = mensaje;

    const timeDiv = document.createElement('div');
    timeDiv.className = 'chat-time';
    timeDiv.textContent = new Date(timestamp).toLocaleTimeString();

    messageDiv.appendChild(authorDiv);
    messageDiv.appendChild(textDiv);
    messageDiv.appendChild(timeDiv);

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addSystemMessage(mensaje) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message system';

    const textDiv = document.createElement('div');
    textDiv.className = 'chat-text';
    textDiv.textContent = mensaje;

    messageDiv.appendChild(textDiv);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ===== ACTION LOG =====
function addActionLog(mensaje, tipo = 'info') {
    const logContent = document.getElementById('action-log-content');

    const entry = document.createElement('div');
    entry.className = `log-entry ${tipo}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${mensaje}`;

    logContent.appendChild(entry);
    logContent.scrollTop = logContent.scrollHeight;

    // Mantener solo últimas 20 entradas
    while (logContent.children.length > 20) {
        logContent.removeChild(logContent.firstChild);
    }
}

// ===== COMBATE =====
function setupCombatButtons() {
    attackBtn.onclick = () => {
        if (gameState.currentEnemy) {
            sendMessage('atacar', {
                playerId: gameState.player.id,
                enemigoId: gameState.currentEnemy.id
            });
        }
    };

    fleeBtn.onclick = () => {
        if (gameState.currentEnemy) {
            sendMessage('huir', {
                playerId: gameState.player.id,
                enemigoId: gameState.currentEnemy.id
            });
        }
    };
}

function startCombat(enemigoId) {
    sendMessage('iniciar_combate', {
        playerId: gameState.player.id,
        enemigoId
    });
}

function handleCombatStarted(enemigo) {
    gameState.inCombat = true;
    gameState.currentEnemy = enemigo;

    combatPanel.style.display = 'block';

    const enemyInfo = document.getElementById('enemy-info');
    enemyInfo.innerHTML = `
        <h4>${enemigo.nombre} (Nivel ${enemigo.nivel})</h4>
        <p>❤️ Salud: ${enemigo.salud_actual}/${enemigo.salud_max}</p>
        <p>⚔️ Daño: ${enemigo.dano_base}</p>
    `;

    addActionLog(`¡Combate iniciado con ${enemigo.nombre}!`, 'info');
    addCombatLog(`Has entrado en combate con ${enemigo.nombre}!`);
}

function handleAttackResult(data) {
    const { dano, critico, enemigo } = data;

    let mensaje = `Atacaste e hiciste ${dano} de daño`;
    if (critico) mensaje += ' ¡CRÍTICO!';

    addCombatLog(mensaje);

    // Actualizar info del enemigo
    const enemyInfo = document.getElementById('enemy-info');
    enemyInfo.innerHTML = `
        <h4>${enemigo.nombre} (Nivel ${enemigo.nivel})</h4>
        <p>❤️ Salud: ${enemigo.salud_actual}/${enemigo.salud_max}</p>
        <p>⚔️ Daño: ${enemigo.dano_base}</p>
    `;

    // Ataque del enemigo
    if (data.danoRecibido) {
        addCombatLog(`${enemigo.nombre} te atacó e hizo ${data.danoRecibido} de daño`);
        updatePlayerStats(gameState.player);
    }
}

function handleEnemyDeath(data) {
    gameState.inCombat = false;
    gameState.currentEnemy = null;
    combatPanel.style.display = 'none';

    addActionLog(`¡Has derrotado a ${data.enemigo.nombre}!`, 'success');
    addActionLog(`Botín: +${data.oro} oro, +${data.exp} EXP`, 'success');

    if (data.items && data.items.length > 0) {
        data.items.forEach(item => {
            addActionLog(`Obtenido: ${item.nombre}`, 'success');
        });
    }

    requestState();
}

function handlePlayerDeath(data) {
    gameState.inCombat = false;
    gameState.currentEnemy = null;
    combatPanel.style.display = 'none';

    addActionLog('Has muerto. -20% oro', 'failure');
    addActionLog(`Reapareciste en ${data.ubicacion_actual}`, 'info');

    updatePlayerStats(gameState.player);
    requestState();
}

function handleFleeSuccess() {
    gameState.inCombat = false;
    gameState.currentEnemy = null;
    combatPanel.style.display = 'none';

    addActionLog('Has huido del combate', 'info');
}

function addCombatLog(mensaje) {
    const combatLog = document.getElementById('combat-log');
    const entry = document.createElement('div');
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${mensaje}`;
    combatLog.appendChild(entry);
    combatLog.scrollTop = combatLog.scrollHeight;
}

// ===== INVENTARIO =====
function setupActionButtons() {
    // document.getElementById('inventory-btn').onclick = openInventory;
    document.getElementById('quests-btn').onclick = openQuests;
    // document.getElementById('world-btn').onclick = openWorldState;
}

function openInventory() {
    sendMessage('obtener_inventario', {
        playerId: gameState.player.id
    });
    inventoryModal.style.display = 'block';
}

function displayInventory(data) {
    document.getElementById('player-gold').textContent = data.oro;
    document.getElementById('player-gold-header').textContent = data.oro;
    document.getElementById('player-weight').textContent = data.peso_actual.toFixed(1);
    document.getElementById('player-max-weight').textContent = data.peso_max;

    // Items equipados
    const equippedContainer = document.getElementById('equipped-items');
    equippedContainer.innerHTML = '';

    // Actualizar slots visibles de equipamiento
    updateEquipmentSlots(data.equipado);

    data.equipado.forEach(item => {
        const itemCard = createItemCard(item, true);
        equippedContainer.appendChild(itemCard);
    });

    // Items en mochila
    const inventoryContainer = document.getElementById('inventory-items');
    inventoryContainer.innerHTML = '';

    data.items.forEach(item => {
        const itemCard = createItemCard(item, false);
        inventoryContainer.appendChild(itemCard);
    });
}

function updateEquipmentSlots(equippedItems) {
    // Reset todos los slots
    const slots = ['cabeza', 'torso', 'mano-derecha', 'mano-izquierda', 'piernas', 'pies'];
    slots.forEach(slot => {
        const element = document.getElementById(`slot-${slot}`);
        if (element) {
            element.classList.remove('equipped');
            element.querySelector('span').textContent = '-';
        }
    });

    // Actualizar slots con items equipados
    equippedItems.forEach(item => {
        let slotId = null;

        // Mapear posiciones de la base de datos a IDs de slots
        if (item.posicion_equipo === 'cabeza') slotId = 'slot-cabeza';
        else if (item.posicion_equipo === 'torso') slotId = 'slot-torso';
        else if (item.posicion_equipo === 'mano_derecha') slotId = 'slot-mano-derecha';
        else if (item.posicion_equipo === 'mano_izquierda') slotId = 'slot-mano-izquierda';
        else if (item.posicion_equipo === 'piernas') slotId = 'slot-piernas';
        else if (item.posicion_equipo === 'pies') slotId = 'slot-pies';

        if (slotId) {
            const element = document.getElementById(slotId);
            if (element) {
                element.classList.add('equipped');
                element.querySelector('span').textContent = item.nombre.substring(0, 10);
            }
        }
    });
}

function createItemCard(item, equipped) {
    const card = document.createElement('div');
    card.className = 'item-card' + (equipped ? ' equipped' : '');

    const name = document.createElement('div');
    name.className = 'item-name';
    name.textContent = item.nombre;
    if (item.cantidad > 1) name.textContent += ` x${item.cantidad}`;

    const type = document.createElement('div');
    type.className = 'item-type';
    type.textContent = item.tipo;

    const stats = document.createElement('div');
    stats.className = 'item-stats';

    if (item.tipo === 'consumible') {
        if (item.efecto_salud) stats.textContent += `+${item.efecto_salud} HP `;
        if (item.efecto_energia) stats.textContent += `+${item.efecto_energia} EN`;
    } else {
        const bonusKeys = Object.keys(item).filter(k => k.startsWith('bonus_'));
        bonusKeys.forEach(key => {
            if (item[key] > 0) {
                const statName = key.replace('bonus_', '');
                stats.textContent += `+${item[key]} ${statName} `;
            }
        });
    }

    card.appendChild(name);
    card.appendChild(type);
    if (stats.textContent) card.appendChild(stats);

    // Click handlers
    card.onclick = () => {
        if (item.tipo === 'consumible') {
            useItem(item.id);
        } else if (!equipped) {
            equipItem(item.id);
        }
    };

    return card;
}

function equipItem(itemId) {
    sendMessage('equipar_item', {
        playerId: gameState.player.id,
        itemId
    });
}

function useItem(itemId) {
    sendMessage('usar_item', {
        playerId: gameState.player.id,
        itemId
    });
}

// ===== MISIONES =====
function openQuests() {
    sendMessage('obtener_misiones', {
        playerId: gameState.player.id
    });
    questsModal.style.display = 'block';
}

function displayQuests(data) {
    const content = document.getElementById('quests-content');
    content.innerHTML = '';

    // Compatibilidad con diferentes estructuras
    const activas = data.activas || [];
    const disponibles = data.disponibles || [];

    // Tabs
    const tabs = document.querySelectorAll('.quest-tab');
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const tabType = tab.dataset.tab;
            if (tabType === 'active') {
                displayActiveQuests(activas);
            } else if (tabType === 'available') {
                displayAvailableQuests(disponibles);
            } else if (tabType === 'create') {
                displayCreateQuestForm();
            }
        };
    });

    // Mostrar activas por defecto
    displayActiveQuests(activas);
}

function displayActiveQuests(quests) {
    const content = document.getElementById('quests-content');
    content.innerHTML = '';

    if (quests.length === 0) {
        content.innerHTML = '<p style="color: #888; text-align: center; padding: 2rem;">No tienes misiones activas</p>';
        return;
    }

    quests.forEach(quest => {
        const card = createQuestCard(quest, 'active');
        content.appendChild(card);
    });
}

function displayAvailableQuests(quests) {
    const content = document.getElementById('quests-content');
    content.innerHTML = '';

    if (quests.length === 0) {
        content.innerHTML = '<p style="color: #888; text-align: center; padding: 2rem;">No hay misiones disponibles</p>';
        return;
    }

    quests.forEach(quest => {
        const card = createQuestCard(quest, 'available');
        content.appendChild(card);
    });
}

function createQuestCard(quest, state) {
    const card = document.createElement('div');
    card.className = 'quest-card';

    const header = document.createElement('div');
    header.className = 'quest-header';

    const title = document.createElement('div');
    title.className = 'quest-title';
    title.textContent = quest.titulo;

    const type = document.createElement('div');
    type.className = 'quest-type';
    type.textContent = quest.tipo;

    header.appendChild(title);
    header.appendChild(type);

    const description = document.createElement('div');
    description.className = 'quest-description';
    description.textContent = quest.descripcion;

    card.appendChild(header);
    card.appendChild(description);

    // Progress bar for active quests
    if (state === 'active' && quest.progreso !== undefined) {
        const progressDiv = document.createElement('div');
        progressDiv.className = 'quest-progress';

        const progressBar = document.createElement('div');
        progressBar.className = 'quest-progress-bar';
        const percentage = (quest.progreso / quest.objetivo) * 100;
        progressBar.style.width = `${percentage}%`;
        progressBar.textContent = `${quest.progreso}/${quest.objetivo}`;

        progressDiv.appendChild(progressBar);
        card.appendChild(progressDiv);
    }

    // Rewards
    const rewards = document.createElement('div');
    rewards.className = 'quest-rewards';
    rewards.innerHTML = `💰 ${quest.recompensa_oro} oro | ⭐ ${quest.recompensa_exp} EXP`;
    card.appendChild(rewards);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'quest-actions';

    if (state === 'available') {
        const acceptBtn = document.createElement('button');
        acceptBtn.className = 'quest-btn accept';
        acceptBtn.textContent = 'Aceptar';
        acceptBtn.onclick = () => acceptQuest(quest.id);
        actions.appendChild(acceptBtn);
    } else if (state === 'active' && quest.progreso >= quest.objetivo) {
        const completeBtn = document.createElement('button');
        completeBtn.className = 'quest-btn complete';
        completeBtn.textContent = 'Completar';
        completeBtn.onclick = () => completeQuest(quest.id);
        actions.appendChild(completeBtn);
    }

    if (actions.children.length > 0) {
        card.appendChild(actions);
    }

    return card;
}

function displayCreateQuestForm() {
    const content = document.getElementById('quests-content');
    content.innerHTML = `
        <div class="create-quest-form">
            <div class="form-group">
                <label>Título</label>
                <input type="text" id="quest-title" placeholder="Nombre de la misión">
            </div>
            <div class="form-group">
                <label>Descripción</label>
                <textarea id="quest-description" placeholder="Describe la misión"></textarea>
            </div>
            <div class="form-group">
                <label>Tipo</label>
                <select id="quest-type">
                    <option value="matar">Matar enemigos</option>
                    <option value="recolectar">Recolectar items</option>
                    <option value="explorar">Explorar ubicación</option>
                </select>
            </div>
            <div class="form-group">
                <label>Objetivo</label>
                <input type="text" id="quest-target" placeholder="Nombre del objetivo">
            </div>
            <div class="form-group">
                <label>Cantidad</label>
                <input type="number" id="quest-amount" value="1" min="1">
            </div>
            <div class="form-group">
                <label>Recompensa (oro)</label>
                <input type="number" id="quest-gold" value="100" min="0">
            </div>
            <div class="form-group">
                <label>Recompensa (EXP)</label>
                <input type="number" id="quest-exp" value="50" min="0">
            </div>
            <button class="quest-btn accept" onclick="createPlayerQuest()">Crear Misión</button>
        </div>
    `;
}

function acceptQuest(questId) {
    sendMessage('aceptar_mision', {
        playerId: gameState.player.id,
        misionId: questId
    });
}

function completeQuest(questId) {
    sendMessage('completar_mision', {
        playerId: gameState.player.id,
        misionId: questId
    });
}

function createPlayerQuest() {
    const titulo = document.getElementById('quest-title').value;
    const descripcion = document.getElementById('quest-description').value;
    const tipo = document.getElementById('quest-type').value;
    const objetivo = document.getElementById('quest-target').value;
    const cantidad = parseInt(document.getElementById('quest-amount').value);
    const oro = parseInt(document.getElementById('quest-gold').value);
    const exp = parseInt(document.getElementById('quest-exp').value);

    if (!titulo || !descripcion || !objetivo) {
        alert('Por favor completa todos los campos');
        return;
    }

    sendMessage('crear_mision_jugador', {
        playerId: gameState.player.id,
        mision: {
            titulo,
            descripcion,
            tipo,
            objetivo,
            cantidad,
            recompensa_oro: oro,
            recompensa_exp: exp
        }
    });

    addActionLog('Misión creada exitosamente', 'success');
}

// ===== DIÁLOGOS =====
function talkToNPC(npcId) {
    sendMessage('hablar_npc', {
        playerId: gameState.player.id,
        npcId
    });
    dialogueModal.style.display = 'block';
}

function displayDialogue(data) {
    const { npc, dialogo } = data;

    // Guardar NPC actual
    gameState.currentNpc = npc;

    document.getElementById('npc-name').textContent = npc.nombre;
    document.getElementById('dialogue-text').textContent = dialogo.texto;

    const optionsContainer = document.getElementById('dialogue-options');
    optionsContainer.innerHTML = '';

    // Guardar el ID del diálogo actual en el gameState para enviarlo en la respuesta
    gameState.currentDialogueId = dialogo.id;

    dialogo.opciones.forEach((opcion, index) => {
        const btn = document.createElement('button');
        btn.className = 'dialogue-option';
        btn.textContent = opcion.texto;
        btn.onclick = () => chooseDialogueOption(npc.id, dialogo.id, index);
        optionsContainer.appendChild(btn);
    });

    // Agregar siempre una opción para salir
    const exitBtn = document.createElement('button');
    exitBtn.className = 'dialogue-option exit-option';
    exitBtn.textContent = '❌ Salir';
    exitBtn.onclick = () => closeDialogue();
    optionsContainer.appendChild(exitBtn);
}

function closeDialogue() {
    dialogueModal.style.display = 'none';
    addActionLog('Conversación finalizada', 'info');
    // Refrescar estado del jugador
    if (gameState.player) {
        sendMessage('solicitar_estado', { playerId: gameState.player.id });
        refreshPlayerData();
    }
}

function chooseDialogueOption(npcId, dialogoId, opcionIndex) {
    // Si es el diálogo genérico de NPCs sin contenido, solo cerrar el modal
    if (dialogoId === 'generico') {
        dialogueModal.style.display = 'none';
        addActionLog('Conversación finalizada', 'info');
        return;
    }

    sendMessage('responder_dialogo', {
        playerId: gameState.player.id,
        npcId,
        dialogoId,
        opcionIndex
    });
}

function handleDialogueResponse(data) {
    console.log('📥 Respuesta de diálogo:', data);

    // Actualizar jugador si viene en la respuesta
    if (data.jugador) {
        updatePlayerDataAfterAction(data.jugador);
    }

    // Mostrar consecuencias en el log
    const consecuencias = data.consecuencias || data.consecuenciasAplicadas || [];
    if (consecuencias.length > 0) {
        consecuencias.forEach(consecuencia => {
            // Determinar color según tipo de consecuencia
            let tipo = 'success';
            if (consecuencia.includes('XP') || consecuencia.includes('NIVEL')) {
                tipo = 'xp';
            } else if (consecuencia.includes('-') && consecuencia.includes('Relación')) {
                tipo = 'failure';
            }
            addActionLog(`⚡ ${consecuencia}`, tipo);
        });
    }

    if (data.fin) {
        // Cerrar ventana de diálogo
        setTimeout(() => {
            closeDialogue();
            addActionLog('Conversación terminada', 'info');
        }, 500);
    } else if (data.siguienteDialogo) {
        // Mostrar siguiente diálogo
        displayDialogue({
            npc: data.npc || gameState.currentNpc,
            dialogo: data.siguienteDialogo
        });
    } else {
        // Sin siguiente diálogo - cerrar
        setTimeout(() => {
            closeDialogue();
        }, 500);
    }
}

// ===== MODALS =====
function setupModals() {
    const modals = [inventoryModal, questsModal, dialogueModal];
    const worldModal = document.getElementById('world-modal');
    modals.push(worldModal);

    const closeButtons = document.querySelectorAll('.close');

    closeButtons.forEach((btn, index) => {
        btn.onclick = () => {
            // Si es el modal de diálogo, usar closeDialogue
            if (modals[index] === dialogueModal) {
                closeDialogue();
            } else {
                modals[index].style.display = 'none';
            }
        };
    });

    window.onclick = (event) => {
        modals.forEach(modal => {
            if (event.target === modal) {
                if (modal === dialogueModal) {
                    closeDialogue();
                } else {
                    modal.style.display = 'none';
                }
            }
        });
    };
}

// Refrescar datos del jugador
function refreshPlayerData() {
    if (!gameState.player) return;

    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(gameState.player.id);
    if (!player) return;

    // Simular envío del servidor para actualizar datos
    sendMessage('solicitar_datos_jugador', { playerId: gameState.player.id });
}

// ===== EVENTO GLOBAL =====
function handleEventoGlobal(data) {
    // Mostrar mensaje de evento global
    addActionLog(`🚨 EVENTO GLOBAL: ${data.mensaje}`, 'evento');

    // Si hay un diálogo siguiente, abrir automáticamente
    if (data.dialogo_siguiente) {
        // Esperar 2 segundos y luego solicitar el diálogo
        setTimeout(() => {
            // En este caso, el jugador debe hablar con Ana para ver el diálogo del evento
            addActionLog('📢 Ana quiere hablar contigo sobre algo importante', 'info');
        }, 2000);
    }
}

// ===== MUNDO VIVO =====
function openWorldState() {
    sendMessage('obtener_estado_mundo', {
        playerId: gameState.player.id
    });
    document.getElementById('world-modal').style.display = 'block';
}

function displayWorldState(mundo) {
    document.getElementById('world-tick').textContent = mundo.tick;
    document.getElementById('world-npcs').textContent = mundo.npcCount;
    document.getElementById('world-events').textContent = mundo.activeEvents;
    document.getElementById('world-status').textContent = mundo.isRunning ? '🟢 Activo' : '🔴 Detenido';

    const storiesContainer = document.getElementById('world-stories');
    storiesContainer.innerHTML = '';

    if (mundo.activeStories && mundo.activeStories.length > 0) {
        mundo.activeStories.forEach(story => {
            const storyDiv = document.createElement('div');
            storyDiv.className = 'world-story';

            const actionText = translateAction(story.action);
            const timeAgo = getTimeAgo(story.timestamp);

            storyDiv.innerHTML = `
                <strong>${story.npc}</strong> ${actionText} en <em>${story.location}</em>
                <span class="story-time">${timeAgo}</span>
            `;
            storiesContainer.appendChild(storyDiv);
        });
    } else {
        storiesContainer.innerHTML = '<p>No hay actividad reciente...</p>';
    }
}

function translateAction(action) {
    const translations = {
        'buscar_comida': 'está buscando comida',
        'buscar_agua': 'está buscando agua',
        'descansar': 'está descansando',
        'huir_peligro': 'está huyendo del peligro',
        'socializar': 'está socializando',
        'patrullar': 'está patrullando',
        'comerciar': 'está comerciando',
        'explorar': 'está explorando'
    };
    return translations[action] || action;
}

function getTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'hace unos segundos';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    const hours = Math.floor(minutes / 60);
    return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
}
