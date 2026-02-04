/**
 * Servidor Principal - Versión 2.0
 * MMO-lite RPG con mundo abierto y dungeons instanciados
 */

const express = require('express');
const path = require('path');
const db = require('./db');

// Managers
const zoneManager = require('./managers/ZoneManager');
const characterManager = require('./managers/CharacterManager');
const partyManager = require('./managers/PartyManager');
const instanceManager = require('./managers/InstanceManager');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ====================================
// INICIALIZACIÓN
// ====================================

async function initializeServer() {
    console.log('🚀 Iniciando servidor...\n');

    try {
        // 1. Inicializar base de datos
        console.log('📦 Inicializando base de datos...');
        await db.initialize();

        // 2. Inicializar managers
        console.log('\n🎮 Inicializando sistemas...');
        await zoneManager.initialize();
        await instanceManager.initialize();

        console.log('\n✅ Todos los sistemas inicializados correctamente\n');

        // Mostrar estadísticas
        showStats();

    } catch (error) {
        console.error('❌ Error durante la inicialización:', error);
        process.exit(1);
    }
}

function showStats() {
    const zoneStats = zoneManager.getStats();
    const characterStats = characterManager.getStats();
    const partyStats = partyManager.getStats();
    const instanceStats = instanceManager.getStats();

    console.log('📊 ESTADÍSTICAS DEL SERVIDOR');
    console.log('════════════════════════════');
    console.log(`🌍 Zonas: ${zoneStats.total_zones} (${Object.entries(zoneStats.zones_by_type).map(([k, v]) => `${k}:${v}`).join(', ')})`);
    console.log(`🎮 Jugadores online: ${characterStats.characters_online}`);
    console.log(`👥 Parties activos: ${partyStats.total_parties}`);
    console.log(`🗺️ Dungeons disponibles: ${instanceStats.dungeons_disponibles}`);
    console.log(`⚔️ Aventuras activas: ${instanceStats.instances_activas}`);
    console.log('════════════════════════════\n');
}

// ====================================
// RUTAS API REST
// ====================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date(),
        stats: {
            zones: zoneManager.getStats(),
            characters: characterManager.getStats(),
            parties: partyManager.getStats(),
            instances: instanceManager.getStats()
        }
    });
});

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const account = await db.get(
            'SELECT id, username FROM accounts WHERE username = ? AND password = ?',
            [username, password]
        );

        if (!account) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        // Obtener personajes de la cuenta
        const characters = await characterManager.getCharactersByAccount(account.id);

        res.json({
            success: true,
            account: {
                id: account.id,
                username: account.username
            },
            characters
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// Registro
app.post('/api/register', async (req, res) => {
    const { username, password, email } = req.body;

    if (!username || !password || username.length < 3 || password.length < 4) {
        return res.status(400).json({ error: 'Usuario y contraseña inválidos' });
    }

    try {
        // Verificar que no exista
        const existing = await db.get('SELECT id FROM accounts WHERE username = ?', [username]);

        if (existing) {
            return res.status(400).json({ error: 'Usuario ya existe' });
        }

        // Crear cuenta
        const result = await db.run(
            'INSERT INTO accounts (username, password, email) VALUES (?, ?, ?)',
            [username, password, email || null]
        );

        res.json({
            success: true,
            account: {
                id: result.lastID,
                username
            }
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// Obtener opciones de personajes (razas, clases)
app.get('/api/character-options', (req, res) => {
    res.json(characterManager.getCharacterOptions());
});

// Obtener zonas disponibles
app.get('/api/zones', (req, res) => {
    res.json(zoneManager.getAllZones());
});

// Obtener dungeons disponibles
app.get('/api/dungeons', (req, res) => {
    res.json(instanceManager.getAvailableDungeons());
});

// Obtener items del catálogo
app.get('/api/items', async (req, res) => {
    try {
        const items = await db.all('SELECT * FROM items ORDER BY tipo, rareza');
        res.json(items.map(item => ({
            id: item.id,
            nombre: item.nombre,
            tipo: item.tipo,
            subtipo: item.subtipo,
            descripcion: item.descripcion,
            valor_oro: item.valor_oro,
            rareza: item.rareza,
            propiedades: JSON.parse(item.propiedades || '{}')
        })));
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo items' });
    }
});

// ====================================
// EVENTOS DE INSTANCIAS
// ====================================

instanceManager.on('instance:completed', async (data) => {
    const { jugadores, recompensas } = data;

    // Dar recompensas a cada jugador
    for (const jugador of jugadores) {
        if (jugador.estado === 'activo') {
            // Dar oro
            await characterManager.updateCharacter(jugador.id, {
                oro: jugador.oro + recompensas.oro
            });

            // Dar experiencia
            await characterManager.giveExperience(jugador.id, recompensas.xp);

            console.log(`🎁 Recompensas entregadas a ${jugador.nombre}: ${recompensas.oro} oro, ${recompensas.xp} XP`);
        }
    }
});

// ====================================
// INICIAR SERVIDOR
// ====================================

async function start() {
    await initializeServer();

    const server = app.listen(PORT, () => {
        console.log(`🌐 Servidor HTTP escuchando en puerto ${PORT}`);
        console.log(`🔗 http://localhost:${PORT}\n`);
    });

    // Importar y configurar WebSocket
    const setupWebSocket = require('./ws_v2');
    setupWebSocket(server, {
        zoneManager,
        characterManager,
        partyManager,
        instanceManager
    });

    console.log('🔌 Servidor WebSocket configurado\n');
    console.log('✨ ¡Servidor completamente operativo!\n');
}

// Manejo de errores y shutdown
process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error);
});

process.on('SIGINT', async () => {
    console.log('\n\n👋 Cerrando servidor...');
    await db.close();
    process.exit(0);
});

// Iniciar
start().catch(error => {
    console.error('❌ Error fatal al iniciar servidor:', error);
    process.exit(1);
});

module.exports = app;
