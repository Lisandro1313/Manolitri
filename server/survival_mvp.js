/**
 * MVP SURVIVAL ZOMBIE - Servidor Principal
 * Versión con persistencia y creación de personajes
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import survivalDB from './db/survivalDB.js';
import { initialize as initializeMainDB } from './db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ====================================
// ESTADO DEL MUNDO (en memoria)
// ====================================

const WORLD = {
    // Locaciones
    locations: {
        refugio: {
            id: 'refugio',
            nombre: 'Refugio Central',
            tipo: 'safe',
            descripcion: 'Un edificio fortificado. Hay gente aquí.',
            recursos: { comida: 20, medicinas: 5, armas: 2, materiales: 10 },
            zombies: 0,
            nivelRuido: 0,
            defensas: 50,
            conectado_a: ['supermercado', 'farmacia', 'casa_abandonada', 'hospital', 'comisaria']
        },
        supermercado: {
            id: 'supermercado',
            nombre: 'Supermercado Saqueado',
            tipo: 'loot',
            descripcion: 'Estantes vacíos, pero quizás quede algo. Huele a comida podrida.',
            recursos: { comida: 15, medicinas: 2, materiales: 5 },
            zombies: 3,
            zombiesInitial: 3,
            zombiesRespawnTime: null,
            nivelRuido: 0,
            conectado_a: ['refugio', 'hospital']
        },
        farmacia: {
            id: 'farmacia',
            nombre: 'Farmacia',
            tipo: 'loot',
            descripcion: 'La puerta está rota. Huele a muerte.',
            recursos: { medicinas: 10, comida: 1, materiales: 3 },
            zombies: 5,
            zombiesInitial: 5,
            zombiesRespawnTime: null,
            nivelRuido: 0,
            conectado_a: ['refugio']
        },
        casa_abandonada: {
            id: 'casa_abandonada',
            nombre: 'Casa Abandonada',
            tipo: 'loot',
            descripcion: 'Una casa de dos pisos. Silencio inquietante.',
            recursos: { comida: 8, armas: 1, materiales: 8 },
            zombies: 2,
            zombiesInitial: 2,
            zombiesRespawnTime: null,
            nivelRuido: 0,
            conectado_a: ['refugio']
        },
        hospital: {
            id: 'hospital',
            nombre: 'Hospital Abandonado',
            tipo: 'loot',
            descripcion: 'Corredores oscuros. Camillas volcadas. Muchos infectados.',
            recursos: { medicinas: 25, comida: 5, armas: 1, materiales: 10 },
            zombies: 12,
            zombiesInitial: 12,
            zombiesRespawnTime: null,
            nivelRuido: 0,
            conectado_a: ['refugio', 'supermercado']
        },
        comisaria: {
            id: 'comisaria',
            nombre: 'Comisaría',
            tipo: 'loot',
            descripcion: 'La estación de policía. Armería saqueada... ¿o no?',
            recursos: { armas: 8, medicinas: 3, comida: 2, materiales: 12 },
            zombies: 8,
            zombiesInitial: 8,
            zombiesRespawnTime: null,
            nivelRuido: 0,
            conectado_a: ['refugio', 'puente_sur']
        },
        puente_sur: {
            id: 'puente_sur',
            nombre: 'Puente Sur',
            tipo: 'dangerous',
            descripcion: 'Un puente largo que conecta con otro sector de la ciudad. Peligroso.',
            recursos: { comida: 3, materiales: 5 },
            zombies: 15,
            zombiesInitial: 15,
            zombiesRespawnTime: null,
            nivelRuido: 0,
            conectado_a: ['comisaria', 'refugio_norte']
        },
        refugio_norte: {
            id: 'refugio_norte',
            nombre: 'Refugio Norte',
            tipo: 'safe',
            descripcion: 'Otro grupo de sobrevivientes. Más organizados pero menos amigables.',
            recursos: { comida: 30, medicinas: 8, armas: 5, materiales: 15 },
            zombies: 0,
            nivelRuido: 0,
            defensas: 60,
            conectado_a: ['puente_sur', 'fabrica', 'mercado']
        },
        fabrica: {
            id: 'fabrica',
            nombre: 'Fábrica Abandonada',
            tipo: 'loot',
            descripcion: 'Una fábrica de procesamiento. Muchos recursos pero también peligros.',
            recursos: { materiales: 30, armas: 3, comida: 2 },
            zombies: 10,
            zombiesInitial: 10,
            zombiesRespawnTime: null,
            nivelRuido: 0,
            conectado_a: ['refugio_norte']
        },
        mercado: {
            id: 'mercado',
            nombre: 'Mercado Negro',
            tipo: 'trade',
            descripcion: 'Un mercado ilegal donde se intercambian recursos. Cuidado con los tramposos.',
            recursos: { comida: 20, medicinas: 5, armas: 10, materiales: 8 },
            zombies: 2,
            zombiesInitial: 2,
            zombiesRespawnTime: null,
            nivelRuido: 0,
            conectado_a: ['refugio_norte']
        }
    },

    // NPCs con necesidades
    npcs: {
        dr_gomez: {
            id: 'dr_gomez',
            nombre: 'Dr. Gómez',
            rol: 'medico',
            locacion: 'refugio',
            salud: 80,
            hambre: 60,
            moral: 70,
            vivo: true,
            estado: 'activo',
            enMision: false,
            dialogo: 'Necesito medicinas urgente. María está grave.',
            dialogos: [
                'Necesito más suministros médicos.',
                'La situación está empeorando.',
                'Si consiguen medicinas, puedo hacer vendajes.',
                '¿Alguien ha visto antibióticos por ahí?',
                'Deberíamos enviar un equipo al hospital.',
                'No puedo hacer milagros sin medicinas.',
                'Cada día pierdo más pacientes...',
                'La infección se propaga rápido sin tratamiento.',
                '*agotado* No he dormido en 2 días.',
                'María empeora. Necesito antibióticos YA.',
                'Antes del apocalipsis, era cirujano cardiovascular.',
                'Ahora apenas puedo curar un resfriado sin suministros.',
                '¿Herido? Déjame ver... *examina*',
                'El hospital tiene todo lo que necesitamos.',
                'Pero está infestado de infectados.',
                '*limpia sus anteojos* Perdón, estoy exhausto.',
                'Trae medicinas y te curo gratis.',
                'Jorge me cobra por todo. Es desesperante.',
                'El Capitán prioriza las armas sobre la salud.',
                '*suspiro* Otro más con fiebre...',
                'Si encuentras morfina, tráela. Tengo pacientes con dolor.',
                '¿Sabes algo de primeros auxilios?',
                'Podría enseñarte a hacer vendajes.',
                'La farmacia debe tener insulina. Algunos la necesitan.',
                '*nervioso* La mordida de zombie es 99% fatal.',
                'No hay cura. Solo podemos... acelerar el final.',
                'María era enfermera. Me ayudaba antes de enfermar.',
                'Irónico, ¿no? La enfermera es la que más sufre.',
                '*mira sus manos manchadas* Tanto trabajo para nada.',
                'Guarda tus medicinas. No sabes cuándo las necesitarás.'
            ]
        },
        maria: {
            id: 'maria',
            nombre: 'María',
            rol: 'civil',
            locacion: 'refugio',
            salud: 30, // GRAVE
            hambre: 80,
            moral: 40,
            vivo: true,
            estado: 'activo',
            enMision: false,
            dialogo: '*tose sangre* Ayuda...',
            dialogos: [
                'Necesito descansar...',
                'Gracias por cuidarme.',
                'No sé cuánto más pueda aguantar.',
                'El Dr. Gómez hace lo que puede.',
                'Antes de esto, tenía una vida normal...',
                '¿Cómo llegó todo a ser así?',
                'Si sobrevivo, les deberé todo.',
                'Mi familia está... ya no está.',
                '*tose débilmente*',
                'Duele... todo duele.',
                '*voz débil* ¿Agua?',
                'Era enfermera antes del brote.',
                'Ahora soy yo la que necesita ayuda...',
                '*tiembla* Tengo tanto frío.',
                'Vi morir a mi esposo. Me mordió.',
                'El Dr. me salvó justo a tiempo.',
                'Pero la infección... está dentro.',
                '*llora en silencio*',
                'No quiero convertirme en una de esas cosas.',
                'Prométeme que... si me transformo...',
                '*agarra tu mano* Gracias por quedarte.',
                'Los demás me evitan. Creen que estoy infectada.',
                '¿Lo estoy? No lo sé...',
                'Mi hija tenía 7 años. Se llamaba Ana.',
                'No pude salvarla.',
                '*mira la pared vacía*',
                'A veces deseo simplemente... dormir.',
                'Pero luego pienso en todos ustedes.',
                'Y quiero vivir un día más.',
                '*sonrisa débil* Eres amable.'
            ]
        },
        capitan_rivas: {
            id: 'capitan_rivas',
            nombre: 'Capitán Rivas',
            rol: 'lider',
            locacion: 'refugio',
            salud: 100,
            hambre: 50,
            moral: 80,
            vivo: true,
            estado: 'activo',
            enMision: false,
            dialogo: 'Necesitamos comida. Y necesitamos que alguien explore.',
            dialogos: [
                'Hay que reforzar las defensas.',
                'Si no encontramos comida pronto, tendremos problemas.',
                'Voy a salir a explorar, cubran el refugio.',
                'Todos deben contribuir para sobrevivir.',
                'He visto hordas más grandes acercándose.',
                'Necesitamos un plan para el hospital.',
                '¿Alguien tiene experiencia militar aquí?',
                'La disciplina nos mantendrá vivos.',
                'No podemos quedarnos aquí para siempre.',
                '*revisa su arma*',
                'Firmes. Siempre firmes.',
                'Antes era capitán del ejército. Ahora... líder de sobrevivientes.',
                '¿Sabes disparar? Te puedo entrenar.',
                'La comisaría tiene armas. Pero también peligros.',
                'Vi caer a mi pelotón completo.',
                'Yo... fui el único que salió vivo.',
                '*aprieta puños* No dejaré que pase de nuevo.',
                'Cada vida cuenta. Cada una.',
                'Jorge es útil pero desconfiado. No lo culpo.',
                'El Dr. Gómez hace milagros con nada.',
                'María... ella merece mejor que esto.',
                '*mira hacia afuera* Vienen cada noche.',
                'Las defensas aguantan, pero no para siempre.',
                '¿Voluntarios para patrulla? Necesito dos.',
                'El valor sin disciplina es suicidio.',
                '*señala mapa* Estas son las rutas seguras.',
                'Nunca, NUNCA, salgas solo de noche.',
                'He matado zombies. También... personas.',
                'A veces no hay diferencia.',
                '*voz baja* Los saqueadores son peores que los infectados.',
                'Confío en ti. No decepciones esa confianza.',
                '¿Listo para la misión? Buena suerte.',
                'Vuelve con vida. Es una orden.'
            ]
        },
        comerciante: {
            id: 'comerciante',
            nombre: 'Jorge el Comerciante',
            rol: 'comercio',
            locacion: 'refugio',
            salud: 90,
            hambre: 70,
            moral: 60,
            vivo: true,
            estado: 'activo',
            enMision: false,
            inventario: { comida: 5, medicinas: 2 },
            dialogo: 'Cambio recursos por favores.',
            dialogos: [
                'Hola... *suspiro*',
                'Adiós...',
                'Tengo algunos suministros para comerciar.',
                'Todo tiene un precio en este mundo.',
                'Si me traen materiales, puedo conseguir más.',
                '¿Necesitas algo? Puedo hacer tratos.',
                'Conozco rutas seguras para comercio.',
                'Tengo contactos en otros refugios.',
                'El trueque es el nuevo dinero.',
                '¿Han oído de la zona militar? Hay armas ahí.',
                'La última vez que vi mi familia fue hace 3 meses...',
                '*mira al suelo* No sé si siguen vivos.',
                'Antes era contador. Ahora soy... esto.',
                '¿Medicinas? Claro, pero te va a costar.',
                'Vi zombies nuevos... más rápidos.',
                'El refugio norte tiene armas, pero no confío en ellos.',
                'Escuché rumores de una cura. Pura fantasía.',
                '¿Tienes comida de sobra? Te cambio por municiones.',
                'Necesito que alguien vaya a la farmacia por mí.',
                'Los soldados del norte me deben favores.',
                'No me mires así, hago lo que debo para sobrevivir.',
                '¡Ah! Pensé que eras un zombie por un segundo.',
                '*cuenta sus recursos obsesivamente*',
                'El Dr. Gómez es buena gente, pero no tiene nada que comerciar.',
                'María no va a durar mucho sin medicinas...',
                '¿Sabes usar un arma? Tengo unas pocas...',
                '*nervioso* ¿Escuchaste eso?',
                'La comisaría tiene un arsenal. Lleno de zombies también.',
                'Conozco un atajo al hospital, pero es peligroso.',
                '¿Confías en el Capitán Rivas? Yo no estoy seguro...'
            ]
        },
        // === REFUGIO NORTE - NUEVOS NPCs ===
        comandante_steel: {
            id: 'comandante_steel',
            nombre: 'Comandante Steel',
            rol: 'lider',
            locacion: 'refugio_norte',
            salud: 100,
            hambre: 90,
            moral: 85,
            vivo: true,
            estado: 'activo',
            enMision: false,
            dialogo: 'Aquí las cosas se hacen a mi manera.',
            dialogos: [
                'Orden y disciplina. Eso es lo que necesitamos.',
                'No confío en extraños fácilmente.',
                'Si quieres pertenecer aquí, demuéstralo.',
                'He visto demasiada traición.',
                '¿Qué información traes?'
            ],
            misionesDisponibles: ['espiar_refugio_central', 'informar_movimientos']
        },
        ana_tech: {
            id: 'ana_tech',
            nombre: 'Ana la Técnica',
            rol: 'ingeniera',
            locacion: 'refugio_norte',
            salud: 85,
            hambre: 70,
            moral: 60,
            vivo: true,
            estado: 'activo',
            enMision: false,
            dialogo: 'Puedo hackear casi cualquier cosa.',
            dialogos: [
                'Las radios viejas aún funcionan si sabes cómo.',
                'He interceptado comunicaciones extrañas.',
                'Alguien está espiando nuestras transmisiones.',
                '¿Puedes conseguirme componentes electrónicos?',
                'No confíes en el Comandante, tiene secretos.'
            ],
            misionesDisponibles: ['conseguir_componentes', 'investigar_radios']
        },
        marco_sombra: {
            id: 'marco_sombra',
            nombre: 'Marco "Sombra"',
            rol: 'infiltrador',
            locacion: 'mercado',
            salud: 90,
            hambre: 75,
            moral: 50,
            vivo: true,
            estado: 'activo',
            enMision: false,
            dialogo: 'Veo y escucho todo. Tengo información.',
            dialogos: [
                'Los secretos tienen precio.',
                'Sé quién es leal y quién no.',
                'El Comandante planea algo grande.',
                'Jorge el Comerciante no es quien dice ser.',
                '¿Quieres saber la verdad? Trae algo valioso.'
            ],
            misionesDisponibles: ['espiar_comerciante', 'revelar_secretos', 'seguir_npc']
        }
    },

    // Jugadores conectados
    players: {},

    // Grupos/Escuadrones
    groups: {},

    // Ofertas de comercio entre jugadores
    tradeOffers: [],

    // Mejoras del refugio
    refugioUpgrades: {
        torre_vigilancia: { nivel: 0, maxNivel: 3, costo: { materiales: 30, armas: 5 }, beneficio: 'Detecta hordas 5 ticks antes' },
        enfermeria: { nivel: 0, maxNivel: 3, costo: { materiales: 25, medicinas: 10 }, beneficio: 'Cura NPCs automáticamente' },
        taller: { nivel: 0, maxNivel: 3, costo: { materiales: 35, armas: 3 }, beneficio: 'Reduce costo de crafteo 20%' },
        huerto: { nivel: 0, maxNivel: 3, costo: { materiales: 20, comida: 5 }, beneficio: 'Genera 2 comida cada 10 ticks' },
        armeria: { nivel: 0, maxNivel: 3, costo: { materiales: 40, armas: 15 }, beneficio: 'Mejora daño de armas 25%' }
    },

    // Sistema de Misiones Dinámicas
    activeMissions: [],
    missionTemplates: [
        { tipo: 'eliminar', objetivo: 'zombies', cantidad: 10, recompensa: { xp: 100, comida: 10, armas: 2 }, descripcion: 'Elimina {cantidad} zombies' },
        { tipo: 'recolectar', objetivo: 'medicinas', cantidad: 5, recompensa: { xp: 80, comida: 5 }, descripcion: 'Recolecta {cantidad} medicinas' },
        { tipo: 'explorar', objetivo: 'locacion', target: 'hospital', recompensa: { xp: 120, medicinas: 8, materiales: 10 }, descripcion: 'Explora el {target}' },
        { tipo: 'rescatar', objetivo: 'npc', recompensa: { xp: 150, comida: 15, moral: 30 }, descripcion: 'Rescata un sobreviviente' },
        { tipo: 'craftear', objetivo: 'items', cantidad: 5, recompensa: { xp: 90, materiales: 15 }, descripcion: 'Craftea {cantidad} items' },
        { tipo: 'defender', objetivo: 'horda', recompensa: { xp: 200, armas: 10, medicinas: 5 }, descripcion: 'Defiende el refugio de una horda' },
        { tipo: 'comerciar', objetivo: 'intercambios', cantidad: 3, recompensa: { xp: 70, comida: 8, materiales: 8 }, descripcion: 'Completa {cantidad} intercambios' }
    ],

    // Sistema de Reputación con NPCs
    npcReputation: {}, // { playerId: { npcId: valor } }
    reputationLevels: {
        '-100': { nombre: 'Enemigo', color: '#ff0000' },
        '-50': { nombre: 'Hostil', color: '#ff6600' },
        '0': { nombre: 'Neutral', color: '#ffff00' },
        '50': { nombre: 'Amigable', color: '#00ff00' },
        '100': { nombre: 'Aliado', color: '#00ffff' }
    },

    // Sistema de Pets/Compañeros
    availablePets: [
        { id: 'perro', nombre: 'Perro Guardián', icono: '🐕', ataque: 15, defensa: 10, habilidad: 'Alerta temprana', costo: { comida: 20, materiales: 10 } },
        { id: 'lobo', nombre: 'Lobo Domesticado', icono: '🐺', ataque: 25, defensa: 15, habilidad: 'Caza extra loot', costo: { comida: 30, armas: 5 } },
        { id: 'cuervo', nombre: 'Cuervo Explorador', icono: '🦅', ataque: 5, defensa: 5, habilidad: 'Revela mapa', costo: { comida: 10, materiales: 5 } }
    ],

    // Habilidades Especiales (Activas con Cooldown)
    specialAbilities: {
        curacion_rapida: { nombre: 'Curación Rápida', cooldown: 60, efecto: 'Cura 50 HP instantáneo', requiereClase: 'medico', icono: '❤️' },
        rafaga_mortal: { nombre: 'Ráfaga Mortal', cooldown: 45, efecto: 'Elimina 5 zombies instantáneo', requiereClase: 'soldado', icono: '🔫' },
        crafteo_instantaneo: { nombre: 'Crafteo Instantáneo', cooldown: 120, efecto: 'Craftea sin materiales', requiereClase: 'ingeniero', icono: '🔧' },
        sigilo_perfecto: { nombre: 'Sigilo Perfecto', cooldown: 90, efecto: '100% éxito sigilo 5 min', requiereClase: 'explorador', icono: '👥' },
        escudo_grupal: { nombre: 'Escudo Grupal', cooldown: 180, efecto: 'Grupo inmune 30 seg', requiereClase: null, icono: '🛡️' }
    },

    // Sistema de Facciones
    factions: [
        { id: 'refugio', nombre: 'Los Refugiados', descripcion: 'Proteger a los supervivientes', miembros: [], territorio: ['refugio'], color: '#00ff00', bonificacion: 'defensa' },
        { id: 'nomadas', nombre: 'Nómadas', descripcion: 'Explorar y saquear', miembros: [], territorio: ['supermercado'], color: '#ff6600', bonificacion: 'loot' },
        { id: 'cientificos', nombre: 'Los Científicos', descripcion: 'Buscar la cura', miembros: [], territorio: ['hospital'], color: '#ff0000', bonificacion: 'curacion' },
        { id: 'saqueadores', nombre: 'Saqueadores', descripcion: 'Sobrevivir a cualquier costo', miembros: [], territorio: ['comisaria'], color: '#0066ff', bonificacion: 'combate' }
    ],

    // Vehículos
    availableVehicles: [
        { id: 'bicicleta', nombre: 'Bicicleta', velocidad: 1.5, capacidad: 20, consumo: 0, proteccion: 0, receta: { materiales: 10, armas: 5 }, icono: '🚲' },
        { id: 'moto', nombre: 'Motocicleta', velocidad: 3, capacidad: 40, consumo: 1, proteccion: 10, receta: { materiales: 30, armas: 20 }, icono: '🏍️' },
        { id: 'auto', nombre: 'Auto', velocidad: 4, capacidad: 100, consumo: 2, proteccion: 30, receta: { materiales: 50, armas: 30 }, icono: '🚗' },
        { id: 'blindado', nombre: 'Vehículo Blindado', velocidad: 2, capacidad: 150, consumo: 3, proteccion: 60, receta: { materiales: 100, armas: 60 }, icono: '🚐' }
    ],

    // Arena PvP
    pvpArena: {
        activa: false,
        queue: [],
        activeMatches: {},
        ranking: [],
        premios: { primer_lugar: { xp: 500, armas: 20, materiales: 30 }, segundo_lugar: { xp: 300, armas: 10, materiales: 15 } }
    },

    // Ciclo día/noche (0-23)
    timeOfDay: 8,
    dayCount: 1,

    // Quest cooperativa con votación
    questCooperativa: {
        activa: false,
        nombre: '',
        descripcion: '',
        opciones: [],
        votos: {}, // { opcion: [playerIds] }
        inicioPor: null,
        tiempoLimite: null,
        resultado: null
    },

    // Sistema de crafteo mejorado
    craftingRecipes: {
        vendaje: { materiales: 2, resultado: { tipo: 'medicinas', cantidad: 1 } },
        molotov: { materiales: 3, comida: 1, resultado: { tipo: 'armas', cantidad: 1 } },
        barricada: { materiales: 5, resultado: { tipo: 'defensa', cantidad: 10 } },
        trampa: { materiales: 4, armas: 1, resultado: { tipo: 'defensa', cantidad: 15 } },

        // NUEVAS RECETAS
        antibiotico: { medicinas: 2, materiales: 1, resultado: { tipo: 'medicinas_avanzadas', cantidad: 1 } },
        machete: { materiales: 6, armas: 1, resultado: { tipo: 'arma_melee', cantidad: 1 } },
        pistola_mejorada: { armas: 3, materiales: 5, resultado: { tipo: 'arma_fuerte', cantidad: 1 } },
        armadura_ligera: { materiales: 8, comida: 2, resultado: { tipo: 'armadura', cantidad: 1 } },
        botiquin: { medicinas: 3, materiales: 2, resultado: { tipo: 'kit_medico', cantidad: 1 } },
        explosivo: { materiales: 10, armas: 2, comida: 3, resultado: { tipo: 'bomba', cantidad: 1 } },
        radio: { materiales: 15, armas: 1, resultado: { tipo: 'comunicador', cantidad: 1 } },
        generador: { materiales: 20, armas: 3, resultado: { tipo: 'energia', cantidad: 1 } }
    },

    // Quests emergentes
    activeQuests: [],

    // Sistema de hordas
    nextHorde: null,
    hordeWarning: false,

    // Tipos de zombies especiales
    zombieTypes: {
        normal: { nombre: 'Zombie Normal', icono: '🧟', velocidad: 1, daño: 10, hp: 20, xp: 10 },
        corredor: { nombre: 'Corredor', icono: '🧟‍♂️', velocidad: 3, daño: 15, hp: 15, xp: 15 },
        gordo: { nombre: 'Gordo', icono: '🧟‍♀️', velocidad: 0.5, daño: 25, hp: 50, xp: 30 },
        gritón: { nombre: 'Gritón', icono: '😱', velocidad: 1, daño: 5, hp: 10, efecto: 'atrae_horda', xp: 20 },
        tanque: { nombre: 'Tanque', icono: '💪', velocidad: 0.3, daño: 40, hp: 100, xp: 50 },
        explosivo: { nombre: 'Explosivo', icono: '💥', velocidad: 1, daño: 15, hp: 20, efecto: 'explota', xp: 25 },
        rapido: { nombre: 'Infectado Rápido', icono: '⚡', velocidad: 5, daño: 20, hp: 10, xp: 20 },
        bandido: { nombre: 'Bandido Humano', icono: '🔫', velocidad: 2, daño: 30, hp: 40, efecto: 'roba_recursos', xp: 40 }
    },

    // Eventos especiales que pueden ocurrir
    possibleEvents: [
        {
            id: 'viajero_herido',
            nombre: 'Viajero Herido',
            descripcion: 'Un sobreviviente herido pide asilo. Podría ser peligroso, pero parece tener suministros.',
            opciones: [
                { texto: 'Ayudarlo', costo: { medicinas: 2 }, recompensa: { comida: 5, moral: 20 }, riesgo: 0.1 },
                { texto: 'Rechazarlo', costo: {}, recompensa: { moral: -10 }, riesgo: 0 }
            ]
        },
        {
            id: 'suministros_aereos',
            nombre: 'Suministros Aéreos',
            descripcion: 'Viste un helicóptero lanzar una caja de suministros lejos. Pero hay humo... zombies irán ahí.',
            opciones: [
                { texto: 'Ir por los suministros', costo: {}, recompensa: { comida: 10, medicinas: 5, armas: 2 }, riesgo: 0.5 },
                { texto: 'Ignorar', costo: {}, recompensa: {}, riesgo: 0 }
            ]
        },
        {
            id: 'refugiados',
            nombre: 'Familia de Refugiados',
            descripcion: 'Una familia de 4 personas busca refugio. Consumirán comida, pero pueden ayudar a defender.',
            opciones: [
                { texto: 'Aceptarlos', costo: { comida: 8 }, recompensa: { defensas: 20, moral: 15 }, riesgo: 0 },
                { texto: 'Rechazarlos', costo: {}, recompensa: { moral: -20 }, riesgo: 0 }
            ]
        },
        {
            id: 'helicoptero_rescate',
            nombre: '🚁 Helicóptero de Rescate',
            descripcion: 'Un helicóptero militar ofrece evacuar a 2 personas. ¿Quién se va?',
            opciones: [
                { texto: 'Nadie se va', costo: {}, recompensa: { moral: 10 }, riesgo: 0 },
                { texto: 'Evacuar heridos', costo: {}, recompensa: { moral: -20 }, riesgo: 0 }
            ]
        },
        {
            id: 'mercader_viajero',
            nombre: '🎒 Mercader Viajero',
            descripcion: 'Un mercader ofrece items raros a cambio de muchos recursos.',
            opciones: [
                { texto: 'Comprar arma legendaria', costo: { materiales: 50, armas: 10, comida: 20 }, recompensa: { arma_legendaria: 1 }, riesgo: 0 },
                { texto: 'Comprar kit médico avanzado', costo: { materiales: 30, medicinas: 15, comida: 10 }, recompensa: { kit_avanzado: 1 }, riesgo: 0 },
                { texto: 'No comprar nada', costo: {}, recompensa: {}, riesgo: 0 }
            ]
        },
        {
            id: 'zombie_jefe',
            nombre: '💀 Zombie Tanque Detectado',
            descripcion: 'Un zombie gigante está cerca. Es peligroso pero tiene buen loot.',
            opciones: [
                { texto: 'Enfrentarlo', costo: { armas: 5 }, recompensa: { comida: 20, medicinas: 10, armas: 15, materiales: 25 }, riesgo: 0.6 },
                { texto: 'Esconderse', costo: {}, recompensa: {}, riesgo: 0 }
            ]
        },
        {
            id: 'tormenta',
            nombre: '⛈️ Tormenta Eléctrica',
            descripcion: 'Una tormenta se acerca. Dificulta el movimiento pero ahuyenta zombies.',
            opciones: [
                { texto: 'Explorar durante tormenta', costo: {}, recompensa: { comida: 15, materiales: 10 }, riesgo: 0.3 },
                { texto: 'Quedarse adentro', costo: {}, recompensa: {}, riesgo: 0 }
            ]
        },
        {
            id: 'sobrevivientes_hostiies',
            nombre: '⚔️ Grupo Hostil',
            descripcion: 'Otro grupo de supervivientes quiere atacar el refugio para robar recursos.',
            opciones: [
                { texto: 'Defender', costo: { armas: 8 }, recompensa: { moral: 20, defensas: 10 }, riesgo: 0.4 },
                { texto: 'Negociar', costo: { comida: 20, materiales: 15 }, recompensa: { moral: -10 }, riesgo: 0 },
                { texto: 'Huir', costo: {}, recompensa: { moral: -30, defensas: -20 }, riesgo: 0 }
            ]
        }
    ],

    // Eventos activos
    activeEvents: [],

    // Eventos narrativos encadenados (con continuaciones)
    narrativeChains: {
        hospital_misterioso: {
            id: 'hospital_misterioso',
            parte: 1,
            nombre: '🏥 Hospital Abandonado',
            descripcion: 'Encontraron un hospital... pero hay luces prendidas en el 3er piso.',
            opciones: [
                { texto: 'Investigar', siguiente: 'hospital_misterioso_2a' },
                { texto: 'Ignorar', siguiente: null }
            ]
        },
        hospital_misterioso_2a: {
            id: 'hospital_misterioso_2a',
            parte: 2,
            nombre: '🏥 Hospital - Investigación',
            descripcion: 'Dentro hay zombies médicos... y un laboratorio con investigaciones activas. Alguien sigue trabajando aquí.',
            opciones: [
                { texto: 'Buscar al científico', costo: { armas: 3 }, siguiente: 'hospital_misterioso_3a', riesgo: 0.4 },
                { texto: 'Robar las medicinas', costo: {}, recompensa: { medicinas: 20, materiales: 10 }, siguiente: null }
            ]
        },
        hospital_misterioso_3a: {
            id: 'hospital_misterioso_3a',
            parte: 3,
            nombre: '🧪 Científico Loco',
            descripcion: 'Encuentran al Dr. Chen. Está buscando una cura pero necesita especímenes vivos de zombies especiales.',
            opciones: [
                { texto: 'Ayudarlo con la cura', costo: { zombies_capturados: 5 }, recompensa: { cura_prototipo: 1, moral: 50 }, siguiente: null },
                { texto: 'Convencerlo de venir al refugio', recompensa: { npc_nuevo: 'dr_chen', moral: 30 }, siguiente: null }
            ]
        },
        bunker_militar: {
            id: 'bunker_militar',
            parte: 1,
            nombre: '🎖️ Señal de Radio',
            descripcion: 'Captaron una señal militar automática. Coordenadas: Bunker a 20km.',
            opciones: [
                { texto: 'Organizar expedición', costo: { comida: 15, armas: 5 }, siguiente: 'bunker_militar_2a' },
                { texto: 'Ignorar señal', siguiente: null }
            ]
        },
        bunker_militar_2a: {
            id: 'bunker_militar_2a',
            parte: 2,
            nombre: '🚪 Puerta del Bunker',
            descripcion: 'Llegaron al bunker. La puerta está sellada, pero se escuchan ruidos dentro.',
            opciones: [
                { texto: 'Forzar entrada', costo: { armas: 10, materiales: 20 }, siguiente: 'bunker_militar_3a', riesgo: 0.5 },
                { texto: 'Intentar código de acceso', siguiente: 'bunker_militar_3b', riesgo: 0.3 }
            ]
        },
        bunker_militar_3a: {
            id: 'bunker_militar_3a',
            parte: 3,
            nombre: '💥 Interior del Bunker',
            descripcion: 'Adentro hay zombies militares armados... pero también un arsenal completo.',
            opciones: [
                { texto: 'Limpiar el bunker', costo: { armas: 15 }, recompensa: { armas: 50, materiales: 40, vehiculo: 'humvee' }, siguiente: null, riesgo: 0.7 },
                { texto: 'Tomar lo que puedan y huir', recompensa: { armas: 20, materiales: 15 }, siguiente: null }
            ]
        },
        bunker_militar_3b: {
            id: 'bunker_militar_3b',
            parte: 3,
            nombre: '🔐 Código Correcto',
            descripcion: '¡El código funcionó! El bunker está limpio. Hay un soldado superviviente.',
            opciones: [
                { texto: 'Llevarlo al refugio', recompensa: { npc_nuevo: 'soldado_rex', armas: 30, defensas: 40 }, siguiente: null },
                { texto: 'Solo tomar suministros', recompensa: { armas: 35, materiales: 30 }, siguiente: null }
            ]
        },
        caravana_comerciantes: {
            id: 'caravana_comerciantes',
            parte: 1,
            nombre: '🚚 Caravana de Comerciantes',
            descripcion: 'Una caravana comercial pasa cerca. Tienen un mapa a una zona segura... pero es caro.',
            opciones: [
                { texto: 'Comprar mapa', costo: { materiales: 40, comida: 30 }, siguiente: 'zona_segura_2a' },
                { texto: 'Intentar robarles', siguiente: 'caravana_comerciantes_2b', riesgo: 0.6 },
                { texto: 'Dejarlos ir', siguiente: null }
            ]
        },
        zona_segura_2a: {
            id: 'zona_segura_2a',
            parte: 2,
            nombre: '🗺️ Zona Segura',
            descripcion: 'El mapa lleva a una instalación gubernamental. Podría ser el único lugar sin infectados.',
            opciones: [
                { texto: 'Migrar todos al nuevo refugio', recompensa: { refugio_mejorado: true, defensas: 100, moral: 100 }, siguiente: null },
                { texto: 'Establecer ruta comercial', recompensa: { recursos_extra: true, moral: 50 }, siguiente: null }
            ]
        },
        caravana_comerciantes_2b: {
            id: 'caravana_comerciantes_2b',
            parte: 2,
            nombre: '⚔️ Emboscada Fallida',
            descripcion: '¡La caravana tenía guardias! Ahora todos los mercaderes son hostiles.',
            opciones: [
                { texto: 'Retirarse', recompensa: { moral: -30 }, siguiente: null },
                { texto: 'Luchar hasta el final', costo: { armas: 20 }, recompensa: { materiales: 60, comida: 40, armas: 10 }, siguiente: null, riesgo: 0.8 }
            ]
        }
    },
    activeNarrativeEvent: null, // Evento narrativo actual

    // Sistema de logros
    achievements: {
        primer_zombie: { nombre: 'Primera Sangre', descripcion: 'Mata tu primer zombie', icono: '🧟', requisito: { zombies_matados: 1 } },
        cazador: { nombre: 'Cazador', descripcion: 'Mata 50 zombies', icono: '💀', requisito: { zombies_matados: 50 } },
        exterminador: { nombre: 'Exterminador', descripcion: 'Mata 200 zombies', icono: '☠️', requisito: { zombies_matados: 200 } },
        explorador: { nombre: 'Explorador', descripcion: 'Visita todas las locaciones', icono: '🗺️', requisito: { locaciones_visitadas: 6 } },
        artesano: { nombre: 'Artesano', descripcion: 'Craftea 20 items', icono: '🔨', requisito: { items_crafteados: 20 } },
        maestro_artesano: { nombre: 'Maestro Artesano', descripcion: 'Craftea 100 items', icono: '⚒️', requisito: { items_crafteados: 100 } },
        superviviente: { nombre: 'Superviviente', descripcion: 'Sobrevive 7 días', icono: '🌅', requisito: { dias_sobrevividos: 7 } },
        veterano: { nombre: 'Veterano', descripcion: 'Sobrevive 30 días', icono: '🏆', requisito: { dias_sobrevividos: 30 } },
        millonario: { nombre: 'Millonario', descripcion: 'Acumula 100 de cada recurso', icono: '💰', requisito: { recursos_totales: 400 } },
        lider: { nombre: 'Líder', descripcion: 'Crea un grupo con 4 miembros', icono: '👑', requisito: { miembros_grupo: 4 } },
        comerciante: { nombre: 'Comerciante', descripcion: 'Completa 10 intercambios', icono: '🤝', requisito: { comercios_completados: 10 } },
        constructor: { nombre: 'Constructor', descripcion: 'Mejora todas las construcciones del refugio', icono: '🏗️', requisito: { mejoras_completadas: 5 } },
        heroe: { nombre: 'Héroe', descripcion: 'Salva a todos los NPCs', icono: '⭐', requisito: { npcs_salvados: 4 } },
        asesino_jefe: { nombre: 'Asesino de Jefes', descripcion: 'Derrota 5 zombies tanque', icono: '💪', requisito: { tanques_matados: 5 } }
    },

    // Clases disponibles y sus bonificaciones
    classes: {
        superviviente: {
            nombre: 'Superviviente',
            icono: '👤',
            descripcion: 'Balanceado en todas las habilidades',
            bonificaciones: {}
        },
        medico: {
            nombre: 'Médico',
            icono: '⚕️',
            descripcion: 'Especialista en curación y medicina',
            bonificaciones: {
                curacion: 2,
                eficiencia_medicinas: 0.5,
                xp_curar: 1.5
            }
        },
        soldado: {
            nombre: 'Soldado',
            icono: '🎖️',
            descripcion: 'Experto en combate y armas',
            bonificaciones: {
                daño_armas: 1.5,
                precision: 0.8,
                resistencia_daño: 0.8
            }
        },
        ingeniero: {
            nombre: 'Ingeniero',
            icono: '🔧',
            descripcion: 'Maestro del crafteo y construcción',
            bonificaciones: {
                descuento_crafteo: 0.7,
                velocidad_construccion: 1.5,
                xp_crafteo: 1.5
            }
        },
        explorador: {
            nombre: 'Explorador',
            icono: '🔍',
            descripcion: 'Experto en scavenge y supervivencia',
            bonificaciones: {
                loot_extra: 1.3,
                sigilo: 2,
                deteccion_peligros: 1.5
            }
        }
    },

    // Timer de simulación
    simulationTime: 0,
    lastUpdate: Date.now()
};

// ====================================
// SIMULACIÓN DEL MUNDO (cada 10 seg)
// ====================================

setInterval(() => {
    WORLD.simulationTime++;

    // Ciclo día/noche (cada tick = 10 minutos de juego)
    WORLD.timeOfDay = Math.floor((WORLD.simulationTime * 10 / 60) % 24);
    if (WORLD.timeOfDay === 0 && (WORLD.simulationTime * 10) % 1440 === 0) {
        WORLD.dayCount++;
        broadcast({
            type: 'world:event',
            message: `🌅 Amaneció. Día ${WORLD.dayCount}`,
            category: 'time'
        });
    }

    const hora = (WORLD.simulationTime * 10) % 1440; // Minutos del día (0-1440)
    const esNoche = WORLD.timeOfDay >= 20 || WORLD.timeOfDay <= 6;

    // Durante la noche, más zombies aparecen
    if (esNoche && Math.random() < 0.3) {
        Object.values(WORLD.locations).forEach(loc => {
            if (loc.tipo === 'loot' && loc.zombies < 20) {
                loc.zombies += Math.floor(Math.random() * 2) + 1;
            }
        });
    }

    // Huerto genera comida si está mejorado
    if (WORLD.refugioUpgrades.huerto.nivel > 0 && WORLD.simulationTime % 10 === 0) {
        const comidaGenerada = WORLD.refugioUpgrades.huerto.nivel * 2;
        WORLD.locations.refugio.recursos.comida += comidaGenerada;
        throttledBroadcast('huerto', {
            type: 'world:event',
            message: `🌱 El huerto generó ${comidaGenerada} comida`,
            category: 'resource'
        });
    }

    // Enfermería cura NPCs automáticamente
    if (WORLD.refugioUpgrades.enfermeria.nivel > 0 && WORLD.simulationTime % 5 === 0) {
        Object.values(WORLD.npcs).forEach(npc => {
            if (npc.vivo && npc.locacion === 'refugio' && npc.salud < 100) {
                npc.salud = Math.min(100, npc.salud + WORLD.refugioUpgrades.enfermeria.nivel * 5);
            }
        });
    }

    // Generar misiones dinámicas cada 20 ticks
    if (WORLD.simulationTime % 20 === 0 && WORLD.activeMissions.length < 5) {
        const template = WORLD.missionTemplates[Math.floor(Math.random() * WORLD.missionTemplates.length)];
        const missionId = `mission_${Date.now()}_${Math.random()}`;

        const newMission = {
            id: missionId,
            ...template,
            descripcion: template.descripcion.replace('{cantidad}', template.cantidad || '').replace('{target}', template.target || ''),
            createdAt: WORLD.simulationTime,
            expiresAt: WORLD.simulationTime + 50, // Expira en 50 ticks
            completedBy: []
        };

        WORLD.activeMissions.push(newMission);
        broadcast({
            type: 'mission:new',
            mission: newMission
        });
    }

    // Eliminar misiones expiradas
    WORLD.activeMissions = WORLD.activeMissions.filter(m => {
        if (m.expiresAt <= WORLD.simulationTime) {
            broadcast({
                type: 'mission:expired',
                missionId: m.id
            });
            return false;
        }
        return true;
    });

    // ====================================
    // EVENTOS NARRATIVOS ENCADENADOS
    // ====================================
    // Activar evento narrativo cada 50 ticks si no hay uno activo
    if (WORLD.simulationTime % 50 === 0 && !WORLD.activeNarrativeEvent && Math.random() > 0.3) {
        const chains = ['hospital_misterioso', 'bunker_militar', 'caravana_comerciantes'];
        const randomChain = chains[Math.floor(Math.random() * chains.length)];

        WORLD.activeNarrativeEvent = WORLD.narrativeChains[randomChain];

        broadcast({
            type: 'narrative:event',
            event: WORLD.activeNarrativeEvent
        });

        console.log(`📖 EVENTO NARRATIVO: ${WORLD.activeNarrativeEvent.nombre} (Parte ${WORLD.activeNarrativeEvent.parte})`);
    }

    // NPCs pierden hambre y tienen rutinas
    Object.values(WORLD.npcs).forEach(npc => {
        if (!npc.vivo) return;

        npc.hambre = Math.max(0, npc.hambre - 2);

        // Rutina: dormir (0-360 = 0-6am)
        if (hora >= 0 && hora < 360) {
            npc.estado = 'durmiendo';
            npc.salud = Math.min(100, npc.salud + 2); // Recupera salud
        } else if (hora >= 360 && hora < 720) {
            npc.estado = 'trabajando';
        } else {
            npc.estado = 'activo';
        }

        // NPCs se alimentan automáticamente del refugio si tienen hambre
        if (npc.hambre < 30 && npc.locacion === 'refugio' && WORLD.locations.refugio.recursos.comida > 0) {
            WORLD.locations.refugio.recursos.comida -= 1;
            npc.hambre = Math.min(100, npc.hambre + 25);
            npc.moral += 5;
            console.log(`🍖 ${npc.nombre} comió del refugio`);
            broadcast({
                type: 'world:event',
                message: `🍖 ${npc.nombre} comió del refugio`,
                category: 'npc'
            });
        }

        // Moral baja si salud baja
        if (npc.salud < 30) {
            npc.moral = Math.max(0, npc.moral - 3);
        }

        // NPCs no mueren, solo quedan muy debilitados
        if (npc.salud <= 0) {
            // npc.vivo = false;
            npc.salud = 5; // Quedan con 5 HP mínimo
            npc.moral = Math.max(0, npc.moral - 10);
            console.log(`⚠️ ${npc.nombre} está gravemente herido`);
            broadcast({ type: 'npc:injured', npcId: npc.id, nombre: npc.nombre });
            broadcast({
                type: 'world:event',
                message: `⚠️ ${npc.nombre} está gravemente herido`,
                category: 'death'
            });

            // Generar quest de funeral
            WORLD.activeQuests.push({
                id: `funeral_${npc.id}`,
                tipo: 'social',
                descripcion: `${npc.nombre} ha muerto. Deberías enterrarlo.`,
                recompensa: 'moral de grupo'
            });
        }
    });

    // NPCs HABLAN ENTRE ELLOS (cada 90 segundos - más frecuente)
    if (WORLD.simulationTime % 9 === 0 && Math.random() > 0.3) {
        const npcsVivos = Object.values(WORLD.npcs).filter(n => n.vivo && n.locacion === 'refugio' && !n.enMision);
        if (npcsVivos.length >= 2) {
            const npc1 = npcsVivos[Math.floor(Math.random() * npcsVivos.length)];
            const npc2 = npcsVivos.filter(n => n.id !== npc1.id)[Math.floor(Math.random() * (npcsVivos.length - 1))];

            if (npc2 && npc1.dialogos && npc2.dialogos) {
                const dialogo1 = npc1.dialogos[Math.floor(Math.random() * npc1.dialogos.length)];
                const dialogo2 = npc2.dialogos[Math.floor(Math.random() * npc2.dialogos.length)];

                broadcast({
                    type: 'world:event',
                    message: `💬 ${npc1.nombre}: "${dialogo1}"`,
                    category: 'npc'
                });

                setTimeout(() => {
                    broadcast({
                        type: 'world:event',
                        message: `💬 ${npc2.nombre}: "${dialogo2}"`,
                        category: 'npc'
                    });
                }, 2000);
            }
        }
    }

    // NPCs SALEN A SCAVENGEAR (solo si no están en misión)
    if (WORLD.simulationTime % 15 === 0) {
        const npcsDisponibles = Object.values(WORLD.npcs).filter(n =>
            n.vivo &&
            !n.enMision &&
            n.locacion === 'refugio' &&
            n.salud > 50 &&
            n.hambre > 30 &&
            (n.rol === 'lider' || n.rol === 'civil')
        );

        if (npcsDisponibles.length > 0 && Math.random() > 0.6) {
            const npc = npcsDisponibles[Math.floor(Math.random() * npcsDisponibles.length)];
            const locacionesLoot = Object.values(WORLD.locations).filter(l => l.tipo === 'loot' && l.zombies < 5);

            if (locacionesLoot.length > 0) {
                const destino = locacionesLoot[Math.floor(Math.random() * locacionesLoot.length)];
                npc.enMision = true;
                npc.misionDestino = destino.id;
                npc.misionTiempoRestante = 3; // 3 ticks (30 segundos)

                broadcast({
                    type: 'world:event',
                    message: `🏃 ${npc.nombre} salió a explorar ${destino.nombre}`,
                    category: 'npc'
                });

                console.log(`🎯 ${npc.nombre} en misión a ${destino.nombre}`);
            }
        }
    }

    // PROCESAR MISIONES DE NPCs
    Object.values(WORLD.npcs).forEach(npc => {
        if (!npc.vivo || !npc.enMision) return;

        npc.misionTiempoRestante--;

        if (npc.misionTiempoRestante <= 0) {
            // Misión completada
            const destino = WORLD.locations[npc.misionDestino];
            const encontrado = {};

            // NPCs encuentran recursos
            Object.keys(destino.recursos).forEach(recurso => {
                if (destino.recursos[recurso] > 0) {
                    const cantidad = Math.min(destino.recursos[recurso], Math.floor(Math.random() * 3) + 1);
                    if (cantidad > 0) {
                        encontrado[recurso] = cantidad;
                        destino.recursos[recurso] -= cantidad;
                        WORLD.locations.refugio.recursos[recurso] = (WORLD.locations.refugio.recursos[recurso] || 0) + cantidad;
                    }
                }
            });

            // Riesgo de daño
            if (destino.zombies > 0 && Math.random() < 0.3) {
                const danio = Math.floor(Math.random() * 20) + 10;
                npc.salud = Math.max(0, npc.salud - danio);
                broadcast({
                    type: 'world:event',
                    message: `⚠️ ${npc.nombre} fue atacado pero regresó (salud: ${npc.salud})`,
                    category: 'combat'
                });
            }

            const itemsStr = Object.entries(encontrado).map(([k, v]) => `${v} ${k}`).join(', ');
            broadcast({
                type: 'world:event',
                message: `✅ ${npc.nombre} regresó con: ${itemsStr || 'nada'}`,
                category: 'npc'
            });

            npc.enMision = false;
            npc.misionDestino = null;
            npc.misionTiempoRestante = 0;

            // Actualizar todos los clientes con nuevos recursos
            broadcast({
                type: 'refugio:recursos',
                recursos: WORLD.locations.refugio.recursos
            });
        }
    });

    // Zombies migran según ruido
    Object.values(WORLD.locations).forEach(loc => {
        // Decae el ruido con el tiempo
        loc.nivelRuido = Math.max(0, loc.nivelRuido - 2);

        // Migración aleatoria
        if (Math.random() > 0.7) {
            const change = Math.floor(Math.random() * 3) - 1;
            loc.zombies = Math.max(0, loc.zombies + change);
        }

        // Atraídos por ruido alto
        if (loc.nivelRuido > 50 && loc.zombies > 0) {
            loc.zombies += Math.floor(Math.random() * 3) + 1;
        }
    });

    // Sistema de hordas (cada 5 minutos de juego puede haber una)
    if (WORLD.simulationTime % 30 === 0 && !WORLD.nextHorde) {
        if (Math.random() > 0.6) {
            WORLD.nextHorde = WORLD.simulationTime + 10; // Llega en 100 segundos
            WORLD.hordeWarning = true;
            broadcast({
                type: 'horde:warning',
                message: '🚨 HORDA DETECTADA - Se acerca al refugio en 100 segundos',
                tiempo: 100
            });
            console.log('🚨 HORDA ACTIVADA');
        }
    }

    // Ejecutar horda
    if (WORLD.nextHorde && WORLD.simulationTime >= WORLD.nextHorde) {
        executeHorde();
        WORLD.nextHorde = null;
        WORLD.hordeWarning = false;
    }

    // Generar quest emergente si recursos bajos
    if (WORLD.simulationTime % 20 === 0) {
        const refugio = WORLD.locations.refugio;
        if (refugio.recursos.comida < 10 && !WORLD.activeQuests.find(q => q.tipo === 'recursos')) {
            WORLD.activeQuests.push({
                id: `comida_${Date.now()}`,
                tipo: 'recursos',
                descripcion: '⚠️ Comida baja en el refugio. Busca más.',
                objetivo: 10,
                actual: 0
            });
            broadcast({ type: 'quest:new', quest: WORLD.activeQuests[WORLD.activeQuests.length - 1] });
        }
    }

    // Generar EVENTO ESPECIAL aleatorio (cada ~3 minutos)
    if (WORLD.simulationTime % 18 === 0 && Math.random() > 0.6 && WORLD.activeEvents.length === 0) {
        const evento = WORLD.possibleEvents[Math.floor(Math.random() * WORLD.possibleEvents.length)];
        WORLD.activeEvents.push({
            ...evento,
            timestamp: WORLD.simulationTime,
            expiresIn: 5 // Expira en 50 segundos
        });

        broadcast({
            type: 'event:special',
            event: WORLD.activeEvents[0]
        });

        console.log(`🎭 EVENTO: ${evento.nombre}`);
    }

    // Expirar eventos
    WORLD.activeEvents = WORLD.activeEvents.filter(e => {
        if (WORLD.simulationTime - e.timestamp >= e.expiresIn) {
            broadcast({ type: 'event:expired', eventId: e.id });
            return false;
        }
        return true;
    });

    // QUEST COOPERATIVA - Se activa cada 4 minutos si hay 2+ jugadores
    const jugadoresOnline = Object.keys(WORLD.players).length;
    if (!WORLD.questCooperativa.activa && jugadoresOnline >= 2 && WORLD.simulationTime % 24 === 0 && Math.random() > 0.5) {
        const quests = [
            {
                nombre: '🏥 Expedición al Hospital',
                descripcion: 'El Dr. Gómez necesita suministros médicos urgentes. ¿Enviamos un equipo o esperamos?',
                opciones: ['Ir ahora', 'Esperar refuerzos', 'No ir']
            },
            {
                nombre: '🚁 Señal de Radio',
                descripcion: 'Captamos una señal de supervivientes en la zona militar. ¿Respondemos?',
                opciones: ['Responder y encontrarnos', 'Ignorar señal', 'Investigar primero']
            },
            {
                nombre: '👥 Grupo de Refugiados',
                descripcion: 'Un grupo de 5 personas pide entrar al refugio. Tienen comida pero están heridos.',
                opciones: ['Dejarlos entrar', 'Solo a los sanos', 'Rechazarlos']
            },
            {
                nombre: '⚠️ Defensa del Refugio',
                descripcion: 'Se aproxima una horda masiva. ¿Defendemos o evacuamos?',
                opciones: ['Defender aquí', 'Evacuar todos', 'Solo los fuertes']
            }
        ];

        const questSeleccionada = quests[Math.floor(Math.random() * quests.length)];

        WORLD.questCooperativa = {
            activa: true,
            nombre: questSeleccionada.nombre,
            descripcion: questSeleccionada.descripcion,
            opciones: questSeleccionada.opciones,
            votos: {},
            tiempoLimite: Date.now() + 60000 // 1 minuto para votar
        };

        // Inicializar votos
        questSeleccionada.opciones.forEach(opt => {
            WORLD.questCooperativa.votos[opt] = [];
        });

        broadcast({
            type: 'quest:cooperativa',
            quest: WORLD.questCooperativa
        });

        console.log(`🤝 QUEST COOPERATIVA: ${questSeleccionada.nombre}`);
    }

    // Resolver quest cooperativa cuando expire el tiempo
    if (WORLD.questCooperativa.activa && Date.now() >= WORLD.questCooperativa.tiempoLimite) {
        // Contar votos
        const resultados = {};
        Object.keys(WORLD.questCooperativa.votos).forEach(opcion => {
            resultados[opcion] = WORLD.questCooperativa.votos[opcion].length;
        });

        // Obtener ganadora
        const ganadora = Object.keys(resultados).reduce((a, b) => resultados[a] > resultados[b] ? a : b);

        WORLD.questCooperativa.resultado = ganadora;

        broadcast({
            type: 'quest:resultado',
            quest: WORLD.questCooperativa.nombre,
            opcionGanadora: ganadora,
            votos: resultados
        });

        console.log(`✅ Quest resuelta: ${ganadora} (${resultados[ganadora]} votos)`);

        // Aplicar consecuencias según la quest y decisión
        aplicarConsecuenciasQuest(WORLD.questCooperativa.nombre, ganadora);

        // Desactivar quest
        WORLD.questCooperativa.activa = false;
    }

    console.log(`⏰ Tick ${WORLD.simulationTime} | Hora: ${Math.floor(hora / 60)}:${hora % 60}`);
}, 10000);

// Aplicar consecuencias de quest cooperativa
function aplicarConsecuenciasQuest(questNombre, decision) {
    const refugio = WORLD.locations.refugio;

    if (questNombre.includes('Hospital')) {
        if (decision === 'Ir ahora') {
            // Riesgo pero recompensa
            if (Math.random() > 0.4) {
                refugio.recursos.medicinas += 15;
                broadcast({ type: 'world:update', message: '✅ ¡Misión exitosa! +15 medicinas al refugio' });
            } else {
                // Alguien sale herido
                const jugadores = Object.values(WORLD.players);
                if (jugadores.length > 0) {
                    const herido = jugadores[Math.floor(Math.random() * jugadores.length)];
                    herido.salud = Math.max(10, herido.salud - 30);
                    broadcast({ type: 'world:update', message: `⚠️ ${herido.nombre} resultó herido en la misión` });
                }
            }
        } else if (decision === 'Esperar refuerzos') {
            // Más seguro, menos recompensa
            refugio.recursos.medicinas += 5;
            broadcast({ type: 'world:update', message: '✅ Esperaron y consiguieron algunas medicinas' });
        } else {
            // No hacer nada = NPCs pierden moral
            Object.values(WORLD.npcs).forEach(npc => {
                if (npc.vivo) npc.moral -= 10;
            });
            broadcast({ type: 'world:update', message: '😞 Los NPCs están desanimados por no actuar' });
        }
    } else if (questNombre.includes('Señal de Radio')) {
        if (decision === 'Responder y encontrarnos') {
            // 50% aliados, 50% trampa
            if (Math.random() > 0.5) {
                refugio.recursos.armas += 10;
                refugio.recursos.comida += 20;
                broadcast({ type: 'world:update', message: '🤝 ¡Aliados! +10 armas +20 comida' });
            } else {
                refugio.defensas = Math.max(0, refugio.defensas - 30);
                broadcast({ type: 'world:update', message: '💀 ¡Era una trampa! -30 defensas' });
            }
        } else if (decision === 'Investigar primero') {
            broadcast({ type: 'world:update', message: '🔍 Investigaron con cautela. Sin cambios.' });
        } else {
            broadcast({ type: 'world:update', message: '📻 Ignoraron la señal.' });
        }
    } else if (questNombre.includes('Refugiados')) {
        if (decision === 'Dejarlos entrar') {
            refugio.recursos.comida += 10;
            refugio.recursos.medicinas -= 5;
            Object.values(WORLD.npcs).forEach(npc => {
                if (npc.vivo) npc.moral += 15;
            });
            broadcast({ type: 'world:update', message: '❤️ Refugiados agradecidos. +10 comida, -5 medicinas, +moral' });
        } else if (decision === 'Solo a los sanos') {
            refugio.recursos.comida += 3;
            broadcast({ type: 'world:update', message: '😐 Dejaron entrar algunos. +3 comida' });
        } else {
            Object.values(WORLD.npcs).forEach(npc => {
                if (npc.vivo) npc.moral -= 20;
            });
            broadcast({ type: 'world:update', message: '😡 Los NPCs están molestos por rechazar refugiados. -moral' });
        }
    } else if (questNombre.includes('Defensa del Refugio')) {
        if (decision === 'Defender aquí') {
            refugio.defensas = Math.max(0, refugio.defensas - 50);
            Object.values(WORLD.npcs).forEach(npc => {
                if (npc.vivo) npc.moral += 20;
            });
            broadcast({ type: 'world:update', message: '🛡️ ¡Defendieron con éxito! -50 defensas, +moral' });
        } else if (decision === 'Evacuar todos') {
            // Pierden recursos pero todos sobreviven
            refugio.recursos.materiales = Math.floor(refugio.recursos.materiales / 2);
            broadcast({ type: 'world:update', message: '🏃 Evacuaron todos. Perdieron recursos pero están a salvo' });
        } else {
            // Solo los fuertes = algunos NPCs quedan heridos
            const npcsDebiles = Object.values(WORLD.npcs).filter(n => n.vivo && n.salud < 50);
            if (npcsDebiles.length > 0) {
                const victima = npcsDebiles[0];
                // victima.vivo = false;
                victima.salud = Math.max(10, victima.salud - 30);
                broadcast({ type: 'world:update', message: `⚠️ ${victima.nombre} resultó gravemente herido en la evacuación` });
            }
        }
    }
}

function executeHorde() {
    const refugio = WORLD.locations.refugio;
    const hordeSize = Math.floor(Math.random() * 20) + 15;

    console.log(`🧟 HORDA DE ${hordeSize} ZOMBIES ATACANDO`);

    // Daño = zombies - defensas
    const danio = Math.max(0, hordeSize - refugio.defensas / 10);

    // REDUCIR DEFENSAS DEL REFUGIO
    const danioDefensas = Math.floor(hordeSize / 2);
    refugio.defensas = Math.max(0, refugio.defensas - danioDefensas);
    console.log(`🛡️ Defensas reducidas: ${danioDefensas} (Nuevas: ${refugio.defensas})`);

    // NPCs pueden quedar heridos pero no mueren
    const npcsVivos = Object.values(WORLD.npcs).filter(n => n.vivo);
    if (danio > 10 && npcsVivos.length > 0 && Math.random() > 0.5) {
        const victima = npcsVivos[Math.floor(Math.random() * npcsVivos.length)];
        // victima.vivo = false;
        victima.salud = Math.max(10, victima.salud - 40);
        broadcast({
            type: 'horde:npc_injured',
            npcNombre: victima.nombre
        });
        console.log(`⚠️ ${victima.nombre} fue gravemente herido en la horda`);
    }

    // Daño a jugadores en refugio
    Object.values(WORLD.players).forEach(p => {
        if (p.locacion === 'refugio') {
            const playerDmg = Math.floor(Math.random() * danio * 5);
            p.salud = Math.max(0, p.salud - playerDmg);
        }
    });

    broadcast({
        type: 'horde:attacked',
        zombies: hordeSize,
        danio,
        defensas: refugio.defensas,
        danioDefensas,
        message: `🧟 Horda de ${hordeSize} zombies atacó. Daño: ${danio} | Defensas: ${refugio.defensas} (-${danioDefensas})`
    });
}

// Sistema de XP y Nivel
function giveXP(player, amount, ws) {
    player.xp += amount;

    ws.send(JSON.stringify({
        type: 'xp:gained',
        amount,
        xp: player.xp,
        xpMax: player.xpParaSiguienteNivel
    }));

    // Subir de nivel
    while (player.xp >= player.xpParaSiguienteNivel) {
        player.xp -= player.xpParaSiguienteNivel;
        player.nivel++;
        player.xpParaSiguienteNivel = Math.floor(player.xpParaSiguienteNivel * 1.5);

        // Bonificaciones por nivel
        player.salud = 100; // Heal completo
        player.hambre = 100;

        ws.send(JSON.stringify({
            type: 'level:up',
            nivel: player.nivel,
            xpMax: player.xpParaSiguienteNivel
        }));

        broadcast({
            type: 'world:event',
            message: `⭐ ${player.nombre} subió a nivel ${player.nivel}!`,
            category: 'success'
        });
    }
}

// Sistema de Logros
function checkAchievements(player, ws) {
    if (!player.achievements) player.achievements = {};
    if (!player.stats) return;

    Object.entries(WORLD.achievements).forEach(([id, achievement]) => {
        if (player.achievements[id]) return; // Ya desbloqueado

        let cumple = true;
        Object.entries(achievement.requisito).forEach(([stat, required]) => {
            if (!player.stats[stat] || player.stats[stat] < required) {
                cumple = false;
            }
        });

        if (cumple) {
            player.achievements[id] = { desbloqueado: true, fecha: Date.now() };
            ws.send(JSON.stringify({
                type: 'achievement:unlocked',
                achievement: { id, ...achievement }
            }));
            broadcast({
                type: 'world:event',
                message: `🏆 ${player.nombre} desbloqueó: ${achievement.nombre}`,
                category: 'achievement'
            });
        }
    });
}

// Actualizar estadísticas del jugador
function updatePlayerStats(player, stat, amount = 1) {
    if (!player.stats) {
        player.stats = {
            zombies_matados: 0,
            tanques_matados: 0,
            items_crafteados: 0,
            comercios_completados: 0,
            locaciones_visitadas: 1,
            dias_sobrevividos: 0,
            recursos_totales: 0,
            miembros_grupo: 1,
            mejoras_completadas: 0,
            npcs_salvados: 0
        };
    }
    player.stats[stat] = (player.stats[stat] || 0) + amount;
}

// Aplicar bonificaciones de clase
function applyClassBonus(player, action, value) {
    if (!player.clase || player.clase === 'superviviente') return value;

    const bonuses = WORLD.classes[player.clase]?.bonificaciones || {};

    switch (action) {
        case 'damage':
            return value * (bonuses.daño_armas || 1);
        case 'heal':
            return value * (bonuses.curacion || 1);
        case 'craft_cost':
            return Math.floor(value * (bonuses.descuento_crafteo || 1));
        case 'loot':
            return Math.floor(value * (bonuses.loot_extra || 1));
        case 'xp':
            return value * (bonuses.xp_curar || bonuses.xp_crafteo || 1);
        default:
            return value;
    }
}

// Sistema de Reputación con NPCs
function changeReputation(playerId, npcId, amount) {
    if (!WORLD.npcReputation[playerId]) {
        WORLD.npcReputation[playerId] = {};
    }

    if (!WORLD.npcReputation[playerId][npcId]) {
        WORLD.npcReputation[playerId][npcId] = 0;
    }

    WORLD.npcReputation[playerId][npcId] = Math.max(-100, Math.min(100, WORLD.npcReputation[playerId][npcId] + amount));

    return WORLD.npcReputation[playerId][npcId];
}

function getReputationLevel(reputation) {
    const levels = Object.keys(WORLD.reputationLevels).map(Number).sort((a, b) => b - a);
    for (const level of levels) {
        if (reputation >= level) {
            return WORLD.reputationLevels[level];
        }
    }
    return WORLD.reputationLevels['0'];
}

// Verificar progreso de misión
function checkMissionProgress(player, missionType, data) {
    WORLD.activeMissions.forEach(mission => {
        if (mission.tipo !== missionType) return;
        if (mission.completedBy.includes(player.id)) return;

        let completa = false;

        switch (missionType) {
            case 'eliminar':
                if (data.zombiesKilled >= mission.cantidad) completa = true;
                break;
            case 'recolectar':
                if (player.inventario[mission.objetivo] >= mission.cantidad) completa = true;
                break;
            case 'explorar':
                if (data.location === mission.target) completa = true;
                break;
            case 'craftear':
                if (data.itemsCrafted >= mission.cantidad) completa = true;
                break;
            case 'comerciar':
                if (data.trades >= mission.cantidad) completa = true;
                break;
        }

        if (completa) {
            completeMission(player, mission);
        }
    });
}

function completeMission(player, mission) {
    mission.completedBy.push(player.id);

    // Dar recompensas
    Object.entries(mission.recompensa).forEach(([item, amount]) => {
        if (item === 'xp') {
            giveXP(player, amount, connections.get(player.id));
        } else if (item === 'moral') {
            // Aumentar moral de NPCs
            Object.values(WORLD.npcs).forEach(npc => {
                if (npc.vivo) npc.moral = Math.min(100, npc.moral + amount);
            });
        } else {
            player.inventario[item] = (player.inventario[item] || 0) + amount;
        }
    });

    const ws = connections.get(player.id);
    if (ws) {
        ws.send(JSON.stringify({
            type: 'mission:completed',
            mission,
            recompensa: mission.recompensa,
            inventario: player.inventario
        }));
    }

    broadcast({
        type: 'world:event',
        message: `✅ ${player.nombre} completó: ${mission.descripcion}`,
        category: 'mission'
    });
}

// Usar habilidad especial
function useSpecialAbility(player, abilityId, ws) {
    const ability = WORLD.specialAbilities[abilityId];
    if (!ability) return { success: false, error: 'Habilidad inválida' };

    // Verificar clase requerida
    if (ability.requiereClase && player.clase !== ability.requiereClase) {
        return { success: false, error: `Requiere clase: ${ability.requiereClase}` };
    }

    // Verificar cooldown
    if (!player.abilityCooldowns) player.abilityCooldowns = {};
    const now = Date.now();
    if (player.abilityCooldowns[abilityId] && now < player.abilityCooldowns[abilityId]) {
        const segundos = Math.ceil((player.abilityCooldowns[abilityId] - now) / 1000);
        return { success: false, error: `Cooldown: ${segundos}s` };
    }

    // Aplicar efecto
    let resultado = {};
    switch (abilityId) {
        case 'curacion_rapida':
            player.salud = Math.min(100, player.salud + 50);
            resultado = { salud: player.salud };
            break;
        case 'rafaga_mortal':
            const loc = WORLD.locations[player.locacion];
            const killed = Math.min(5, loc.zombies);
            loc.zombies -= killed;
            updatePlayerStats(player, 'zombies_matados', killed);
            resultado = { zombiesKilled: killed, remaining: loc.zombies };
            break;
        case 'crafteo_instantaneo':
            player.instantCraft = true;
            setTimeout(() => { player.instantCraft = false; }, 5000);
            resultado = { duration: 5000 };
            break;
        case 'sigilo_perfecto':
            player.perfectStealth = true;
            setTimeout(() => { player.perfectStealth = false; }, 300000);
            resultado = { duration: 300000 };
            break;
        case 'escudo_grupal':
            if (player.groupId) {
                const group = WORLD.groups[player.groupId];
                group.members.forEach(mid => {
                    const member = WORLD.players[mid];
                    if (member) {
                        member.invulnerable = true;
                        setTimeout(() => { member.invulnerable = false; }, 30000);
                    }
                });
            }
            resultado = { duration: 30000 };
            break;
    }

    // Setear cooldown
    player.abilityCooldowns[abilityId] = now + (ability.cooldown * 1000);

    return { success: true, ability, resultado };
}

// ====================================
// API REST - AUTH Y PERSONAJES
// ====================================

// Crear jugador directo (para compatibility con survival.html)
app.post('/api/player/create', (req, res) => {
    const { nombre } = req.body;
    
    if (!nombre || nombre.length < 3) {
        return res.json({ success: false, error: 'Nombre muy corto (mínimo 3 caracteres)' });
    }
    
    // Generar ID único para el jugador
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Crear jugador en memoria
    WORLD.players[playerId] = {
        id: playerId,
        nombre: nombre,
        salud: 100,
        hambre: 50,
        locacion: 'refugio',
        inventario: {
            comida: 5,
            medicinas: 2,
            armas: 1,
            materiales: 3
        },
        stats: {
            zombiesKilled: 0,
            itemsFound: 0,
            daysSurvived: 0,
            missionsCompleted: 0,
            travels: 0
        },
        nivel: 1,
        xp: 0,
        xpParaSiguienteNivel: 100,
        skills: {
            combate: 0,
            supervivencia: 0,
            sigilo: 0,
            medicina: 0
        },
        clase: 'Superviviente',
        cooldowns: {
            scavenge: 0,
            attack: 0,
            rest: 0,
            trade: 0
        }
    };
    
    console.log(`✅ Jugador creado: ${nombre} (${playerId})`);
    
    res.json({ 
        success: true, 
        player: WORLD.players[playerId]
    });
});

// Registro
app.post('/api/auth/register', (req, res) => {
    const { username, password } = req.body;
    const result = survivalDB.crearUsuario(username, password);
    res.json(result);
});

// Login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = survivalDB.loginUsuario(username, password);

    if (user) {
        const personajes = survivalDB.obtenerPersonajes(user.id);
        res.json({ success: true, user, personajes });
    } else {
        res.json({ success: false, error: 'Credenciales inválidas' });
    }
});

// Crear personaje
app.post('/api/personaje/crear', (req, res) => {
    const { usuarioId, nombre, clase, atributos, avatar, color } = req.body;

    const result = survivalDB.crearPersonaje(usuarioId, {
        nombre,
        clase,
        ...atributos,
        avatar,
        color
    });

    if (result.success) {
        const personaje = survivalDB.obtenerPersonaje(result.id);
        res.json({ success: true, personaje });
    } else {
        res.json(result);
    }
});

// Obtener personajes de un usuario
app.get('/api/personajes/:usuarioId', (req, res) => {
    const personajes = survivalDB.obtenerPersonajes(req.params.usuarioId);
    res.json({ personajes });
});

// Cargar personaje en el mundo
app.post('/api/personaje/load', (req, res) => {
    const { personajeId } = req.body;
    const personaje = survivalDB.obtenerPersonaje(personajeId);

    if (!personaje) {
        return res.json({ success: false, error: 'Personaje no encontrado' });
    }

    const playerId = `player_${personajeId}_${Date.now()}`;

    WORLD.players[playerId] = {
        id: playerId,
        dbId: personajeId,
        nombre: personaje.nombre,
        clase: personaje.clase,
        nivel: personaje.nivel,
        xp: personaje.xp,
        xpParaSiguienteNivel: personaje.xp_siguiente_nivel,
        salud: personaje.salud,
        hambre: personaje.hambre,
        locacion: personaje.locacion,
        inventario: personaje.inventario,
        skills: personaje.skills,
        avatar: personaje.avatar,
        color: personaje.color,
        atributos: {
            fuerza: personaje.fuerza,
            resistencia: personaje.resistencia,
            agilidad: personaje.agilidad,
            inteligencia: personaje.inteligencia
        },
        cooldowns: {
            scavenge: 0,
            craft: 0,
            shoot: 0
        },
        // Nuevas propiedades
        stats: {
            zombies_matados: 0,
            tanques_matados: 0,
            items_crafteados: 0,
            comercios_completados: 0,
            locaciones_visitadas: 1,
            dias_sobrevividos: 0,
            recursos_totales: 0,
            miembros_grupo: 1,
            mejoras_completadas: 0,
            npcs_salvados: 0
        },
        achievements: {},
        visitedLocations: new Set([personaje.locacion]),
        groupId: null,
        equipedItems: {
            arma: null,
            armadura: null,
            accesorio: null
        }
    };

    res.json({ success: true, player: WORLD.players[playerId] });
});

app.get('/api/world', (req, res) => {
    res.json({
        locations: WORLD.locations,
        npcs: WORLD.npcs,
        time: WORLD.simulationTime
    });
});

// Endpoint de estadísticas del servidor
app.get('/api/stats', (req, res) => {
    const connectedPlayers = Array.from(connections.keys())
        .filter(pid => WORLD.players[pid])
        .map(pid => ({
            id: pid,
            nombre: WORLD.players[pid].nombre,
            nivel: WORLD.players[pid].nivel,
            locacion: WORLD.players[pid].locacion,
            salud: WORLD.players[pid].salud
        }));

    const totalZombies = Object.values(WORLD.locations).reduce((sum, loc) => sum + loc.zombies, 0);
    const npcsVivos = Object.values(WORLD.npcs).filter(npc => npc.vivo).length;
    const npcsTotal = Object.values(WORLD.npcs).length;

    res.json({
        server: {
            uptime: process.uptime(),
            tiempo_simulacion: WORLD.simulationTime || 0
        },
        jugadores: {
            conectados: connectedPlayers.length,
            lista: connectedPlayers,
            total_creados: Object.keys(WORLD.players).length
        },
        mundo: {
            zombies_totales: totalZombies,
            npcs_vivos: `${npcsVivos}/${npcsTotal}`,
            defensas_refugio: WORLD.locations.refugio.defensas,
            horda_proxima: WORLD.nextHorde,
            quests_activas: WORLD.activeQuests ? WORLD.activeQuests.length : 0
        }
    });
});

// Endpoint para listar jugadores conectados
app.get('/api/players/online', (req, res) => {
    const connectedPlayers = getConnectedPlayers();
    res.json({
        count: connectedPlayers.length,
        players: connectedPlayers
    });
});

// ====================================
// API REST - GRUPOS
// ====================================

// Crear grupo
app.post('/api/group/create', (req, res) => {
    const { playerId, groupName } = req.body;
    const player = WORLD.players[playerId];

    if (!player) return res.json({ success: false, error: 'Jugador no encontrado' });
    if (player.groupId) return res.json({ success: false, error: 'Ya estás en un grupo' });

    const groupId = `group_${Date.now()}`;
    WORLD.groups[groupId] = {
        id: groupId,
        name: groupName,
        leader: playerId,
        members: [playerId],
        created: Date.now(),
        xpBonus: 1.2
    };

    player.groupId = groupId;
    updatePlayerStats(player, 'miembros_grupo', 1);

    res.json({ success: true, group: WORLD.groups[groupId] });
});

// Invitar a grupo
app.post('/api/group/invite', (req, res) => {
    const { playerId, targetId } = req.body;
    const player = WORLD.players[playerId];
    const target = WORLD.players[targetId];

    if (!player || !target) return res.json({ success: false, error: 'Jugador no encontrado' });
    if (!player.groupId) return res.json({ success: false, error: 'No estás en un grupo' });
    if (target.groupId) return res.json({ success: false, error: 'El jugador ya está en un grupo' });

    const group = WORLD.groups[player.groupId];
    if (group.members.length >= 4) return res.json({ success: false, error: 'Grupo lleno' });

    group.members.push(targetId);
    target.groupId = group.id;

    group.members.forEach(mid => {
        const member = WORLD.players[mid];
        if (member) updatePlayerStats(member, 'miembros_grupo', 1);
    });

    res.json({ success: true, group });
});

// Salir de grupo
app.post('/api/group/leave', (req, res) => {
    const { playerId } = req.body;
    const player = WORLD.players[playerId];

    if (!player || !player.groupId) return res.json({ success: false, error: 'No estás en un grupo' });

    const group = WORLD.groups[player.groupId];
    group.members = group.members.filter(mid => mid !== playerId);

    if (group.members.length === 0) {
        delete WORLD.groups[player.groupId];
    }

    delete player.groupId;
    res.json({ success: true });
});

// ====================================
// API REST - COMERCIO ENTRE JUGADORES
// ====================================

// Crear oferta de comercio
app.post('/api/trade/offer', (req, res) => {
    const { playerId, targetId, offering, requesting } = req.body;
    const player = WORLD.players[playerId];
    const target = WORLD.players[targetId];

    if (!player || !target) return res.json({ success: false, error: 'Jugador no encontrado' });

    // Verificar que el jugador tiene los recursos
    for (let [item, amount] of Object.entries(offering)) {
        if (!player.inventario[item] || player.inventario[item] < amount) {
            return res.json({ success: false, error: `No tienes suficiente ${item}` });
        }
    }

    const offerId = `trade_${Date.now()}`;
    WORLD.tradeOffers.push({
        id: offerId,
        from: playerId,
        to: targetId,
        offering,
        requesting,
        status: 'pending',
        created: Date.now()
    });

    // Notificar al jugador objetivo
    const targetWs = connections.get(targetId);
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
        targetWs.send(JSON.stringify({
            type: 'trade:offer_received',
            from: playerId,
            fromName: player.nombre,
            offer: {
                item: Object.keys(offering)[0],
                cantidad: Object.values(offering)[0],
                request: {
                    item: Object.keys(requesting)[0],
                    cantidad: Object.values(requesting)[0]
                }
            },
            offerId
        }));
    }

    res.json({ success: true, offerId });
});

// Aceptar/rechazar oferta
app.post('/api/trade/respond', (req, res) => {
    const { playerId, offerId, accept } = req.body;
    const offer = WORLD.tradeOffers.find(o => o.id === offerId);

    if (!offer) return res.json({ success: false, error: 'Oferta no encontrada' });
    if (offer.to !== playerId) return res.json({ success: false, error: 'No es tu oferta' });

    const player = WORLD.players[playerId];
    const other = WORLD.players[offer.from];

    if (!accept) {
        offer.status = 'rejected';
        return res.json({ success: true, message: 'Oferta rechazada' });
    }

    // Verificar recursos
    for (let [item, amount] of Object.entries(offer.requesting)) {
        if (!player.inventario[item] || player.inventario[item] < amount) {
            return res.json({ success: false, error: `No tienes suficiente ${item}` });
        }
    }

    // Intercambiar recursos
    for (let [item, amount] of Object.entries(offer.offering)) {
        other.inventario[item] -= amount;
        player.inventario[item] = (player.inventario[item] || 0) + amount;
    }

    for (let [item, amount] of Object.entries(offer.requesting)) {
        player.inventario[item] -= amount;
        other.inventario[item] = (other.inventario[item] || 0) + amount;
    }

    offer.status = 'completed';
    updatePlayerStats(player, 'comercios_completados', 1);
    updatePlayerStats(other, 'comercios_completados', 1);

    res.json({ success: true, message: 'Comercio completado' });
});

// ====================================
// API REST - MEJORAS DEL REFUGIO
// ====================================

app.post('/api/refugio/upgrade', (req, res) => {
    const { playerId, upgradeType } = req.body;
    const player = WORLD.players[playerId];

    if (!player) return res.json({ success: false, error: 'Jugador no encontrado' });
    if (player.locacion !== 'refugio') return res.json({ success: false, error: 'Debes estar en el refugio' });

    const upgrade = WORLD.refugioUpgrades[upgradeType];
    if (!upgrade) return res.json({ success: false, error: 'Mejora inválida' });
    if (upgrade.nivel >= upgrade.maxNivel) return res.json({ success: false, error: 'Ya está al máximo' });

    // Verificar recursos
    for (let [item, amount] of Object.entries(upgrade.costo)) {
        if (!player.inventario[item] || player.inventario[item] < amount) {
            return res.json({ success: false, error: `Faltan recursos: ${item}` });
        }
    }

    // Consumir recursos
    for (let [item, amount] of Object.entries(upgrade.costo)) {
        player.inventario[item] -= amount;
    }

    upgrade.nivel++;
    updatePlayerStats(player, 'mejoras_completadas', 1);

    broadcast({
        type: 'world:event',
        message: `🏗️ ${player.nombre} mejoró ${upgradeType} a nivel ${upgrade.nivel}`,
        category: 'construction'
    });

    res.json({ success: true, upgrade, inventario: player.inventario });
});

// ====================================
// NUEVOS ENDPOINTS - SISTEMAS AVANZADOS
// ====================================

// Completar misión
app.post('/api/mission/complete', (req, res) => {
    const { playerId, missionId } = req.body;
    const player = WORLD.players[playerId];

    if (!player) return res.json({ success: false, error: 'Jugador no encontrado' });

    const mission = WORLD.activeMissions.find(m => m.id === missionId);
    if (!mission) return res.json({ success: false, error: 'Misión no encontrada' });

    if (mission.completedBy.includes(playerId)) {
        return res.json({ success: false, error: 'Ya completaste esta misión' });
    }

    completeMission(player, mission);
    res.json({ success: true, mission, inventario: player.inventario });
});

// Adoptar mascota
app.post('/api/pet/adopt', (req, res) => {
    const { playerId, petType } = req.body;
    const player = WORLD.players[playerId];

    if (!player) return res.json({ success: false, error: 'Jugador no encontrado' });
    if (player.mascota) return res.json({ success: false, error: 'Ya tienes una mascota' });

    const petTemplate = WORLD.availablePets.find(p => p.id === petType);
    if (!petTemplate) return res.json({ success: false, error: 'Mascota no válida' });

    player.mascota = {
        ...petTemplate,
        hambre: 100,
        moral: 100,
        xp: 0,
        nivel: 1
    };

    updatePlayerStats(player, 'mascotas_adoptadas', 1);

    broadcast({
        type: 'world:event',
        message: `🐾 ${player.nombre} adoptó ${petTemplate.nombre}`,
        category: 'pet'
    });

    res.json({ success: true, mascota: player.mascota });
});

// Alimentar mascota
app.post('/api/pet/feed', (req, res) => {
    const { playerId, item } = req.body;
    const player = WORLD.players[playerId];

    if (!player) return res.json({ success: false, error: 'Jugador no encontrado' });
    if (!player.mascota) return res.json({ success: false, error: 'No tienes mascota' });

    const feedValues = { comida: 30, carne: 50, rations: 40 };
    const value = feedValues[item] || 0;

    if (value === 0) return res.json({ success: false, error: 'Item no válido para mascota' });
    if (!player.inventario[item] || player.inventario[item] <= 0) {
        return res.json({ success: false, error: 'No tienes ese item' });
    }

    player.inventario[item]--;
    player.mascota.hambre = Math.min(100, player.mascota.hambre + value);
    player.mascota.moral = Math.min(100, player.mascota.moral + 10);

    res.json({ success: true, mascota: player.mascota, inventario: player.inventario });
});

// Usar habilidad especial
app.post('/api/ability/use', (req, res) => {
    const { playerId, abilityId } = req.body;
    const player = WORLD.players[playerId];

    if (!player) return res.json({ success: false, error: 'Jugador no encontrado' });

    const ws = connections.get(playerId);
    const result = useSpecialAbility(player, abilityId, ws);

    if (result.success) {
        updatePlayerStats(player, 'habilidades_usadas', 1);

        broadcast({
            type: 'world:event',
            message: `⚡ ${player.nombre} usó: ${result.ability.nombre}`,
            category: 'ability'
        });
    }

    res.json(result);
});

// Unirse a facción
app.post('/api/faction/join', (req, res) => {
    const { playerId, factionId } = req.body;
    const player = WORLD.players[playerId];

    if (!player) return res.json({ success: false, error: 'Jugador no encontrado' });
    if (player.faccion) return res.json({ success: false, error: 'Ya perteneces a una facción' });

    const faction = WORLD.factions.find(f => f.id === factionId);
    if (!faction) return res.json({ success: false, error: 'Facción no válida' });

    player.faccion = factionId;
    player.faccionRango = 1;
    player.faccionPuntos = 0;

    broadcast({
        type: 'world:event',
        message: `⚔️ ${player.nombre} se unió a: ${faction.nombre}`,
        category: 'faction'
    });

    res.json({ success: true, faction });
});

// Craftear vehículo
app.post('/api/vehicle/craft', (req, res) => {
    const { playerId, vehicleType } = req.body;
    const player = WORLD.players[playerId];

    if (!player) return res.json({ success: false, error: 'Jugador no encontrado' });
    if (player.vehiculo) return res.json({ success: false, error: 'Ya tienes un vehículo' });

    const vehicleTemplate = WORLD.availableVehicles.find(v => v.id === vehicleType);
    if (!vehicleTemplate) return res.json({ success: false, error: 'Vehículo no válido' });

    // Verificar recursos
    for (const [item, cantidad] of Object.entries(vehicleTemplate.receta)) {
        if (!player.inventario[item] || player.inventario[item] < cantidad) {
            return res.json({ success: false, error: `Necesitas: ${cantidad}x ${item}` });
        }
    }

    // Consumir recursos
    for (const [item, cantidad] of Object.entries(vehicleTemplate.receta)) {
        player.inventario[item] -= cantidad;
    }

    player.vehiculo = {
        ...vehicleTemplate,
        combustible: 100,
        durabilidad: 100
    };

    updatePlayerStats(player, 'vehiculos_crafteados', 1);

    broadcast({
        type: 'world:event',
        message: `🚗 ${player.nombre} construyó: ${vehicleTemplate.nombre}`,
        category: 'vehicle'
    });

    res.json({ success: true, vehiculo: player.vehiculo, inventario: player.inventario });
});

// Entrar al arena PvP
app.post('/api/pvp/enter', (req, res) => {
    const { playerId } = req.body;
    const player = WORLD.players[playerId];

    if (!player) return res.json({ success: false, error: 'Jugador no encontrado' });
    if (player.salud < 50) return res.json({ success: false, error: 'Necesitas al menos 50 de salud' });

    if (!WORLD.pvpArena.queue.includes(playerId)) {
        WORLD.pvpArena.queue.push(playerId);

        broadcast({
            type: 'world:event',
            message: `⚔️ ${player.nombre} entró a la cola PvP (${WORLD.pvpArena.queue.length} esperando)`,
            category: 'pvp'
        });

        // Si hay 2+ jugadores, iniciar combate
        if (WORLD.pvpArena.queue.length >= 2) {
            const p1Id = WORLD.pvpArena.queue.shift();
            const p2Id = WORLD.pvpArena.queue.shift();

            const matchId = `pvp_${Date.now()}`;
            WORLD.pvpArena.activeMatches[matchId] = {
                id: matchId,
                player1: p1Id,
                player2: p2Id,
                turnos: 0,
                iniciado: Date.now()
            };

            const p1 = WORLD.players[p1Id];
            const p2 = WORLD.players[p2Id];

            broadcast({
                type: 'pvp:match:start',
                matchId,
                player1: { id: p1Id, nombre: p1.nombre, salud: p1.salud },
                player2: { id: p2Id, nombre: p2.nombre, salud: p2.salud }
            });
        }
    }

    res.json({ success: true, queuePosition: WORLD.pvpArena.queue.indexOf(playerId) + 1 });
});

// Atacar en PvP
app.post('/api/pvp/attack', (req, res) => {
    const { playerId, matchId } = req.body;
    const match = WORLD.pvpArena.activeMatches[matchId];

    if (!match) return res.json({ success: false, error: 'Combate no encontrado' });

    const player = WORLD.players[playerId];
    const opponentId = match.player1 === playerId ? match.player2 : match.player1;
    const opponent = WORLD.players[opponentId];

    if (!player || !opponent) return res.json({ success: false, error: 'Jugador no encontrado' });

    // Calcular daño
    const baseDamage = 10 + player.atributos.fuerza;
    const damage = Math.floor(baseDamage * (1 + Math.random() * 0.5));

    opponent.salud = Math.max(0, opponent.salud - damage);
    match.turnos++;

    broadcast({
        type: 'pvp:attack',
        matchId,
        attacker: player.nombre,
        defender: opponent.nombre,
        damage,
        defenderSalud: opponent.salud
    });

    // Verificar victoria
    if (opponent.salud === 0) {
        delete WORLD.pvpArena.activeMatches[matchId];

        // Dar recompensas al ganador
        giveXP(player, 100, connections.get(playerId));
        player.inventario.comida = (player.inventario.comida || 0) + 5;
        updatePlayerStats(player, 'pvp_victorias', 1);
        updatePlayerStats(opponent, 'pvp_derrotas', 1);

        broadcast({
            type: 'pvp:match:end',
            matchId,
            winner: player.nombre,
            loser: opponent.nombre
        });

        return res.json({ success: true, victory: true, xp: 100 });
    }

    res.json({ success: true, damage, opponentSalud: opponent.salud });
});

// ====================================
// WEBSOCKET
// ====================================

import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const connections = new Map(); // playerId -> ws

// Sistema de throttle para broadcasts
const broadcastQueue = new Map(); // tipo -> {message, timestamp}
const BROADCAST_THROTTLE = 100; // ms entre broadcasts del mismo tipo

function throttledBroadcast(type, message, excludePlayerId = null) {
    const now = Date.now();
    const queued = broadcastQueue.get(type);

    // Si ya hay un broadcast pendiente del mismo tipo
    if (queued && now - queued.timestamp < BROADCAST_THROTTLE) {
        // Actualizar mensaje pero no enviar aún
        queued.message = message;
        queued.excludePlayerId = excludePlayerId;
        return;
    }

    // Enviar inmediatamente
    broadcast(message, excludePlayerId);

    // Guardar en cola para throttling
    broadcastQueue.set(type, {
        message,
        excludePlayerId,
        timestamp: now
    });
}

function broadcast(message, excludePlayerId = null) {
    connections.forEach((ws, pid) => {
        if (pid !== excludePlayerId && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    });
}

// Función para obtener lista de jugadores conectados
function getConnectedPlayers() {
    return Array.from(connections.keys())
        .filter(pid => WORLD.players[pid])
        .map(pid => ({
            id: pid,
            nombre: WORLD.players[pid].nombre,
            locacion: WORLD.players[pid].locacion,
            nivel: WORLD.players[pid].nivel,
            salud: WORLD.players[pid].salud
        }));
}

// ====================================
// API: PERFIL DE JUGADOR (para inspección)
// ====================================
app.get('/api/player/:id', (req, res) => {
    const playerId = req.params.id;
    const player = WORLD.players[playerId];

    if (!player) {
        return res.json({ error: 'Jugador no encontrado' });
    }

    // Devolver datos públicos del jugador
    res.json({
        player: {
            id: player.id,
            nombre: player.nombre,
            nivel: player.nivel,
            locacion: player.locacion,
            salud: player.salud,
            inventario: player.inventario,
            stats: player.stats,
            mascota: player.mascota,
            faccion: player.faccion,
            vehiculo: player.vehiculo
        }
    });
});

// ====================================
// API: LEADERBOARD
// ====================================
app.get('/api/leaderboard/:category', (req, res) => {
    const category = req.params.category;
    const players = Object.values(WORLD.players);

    let rankings = [];

    switch (category) {
        case 'zombies':
            rankings = players
                .map(p => ({
                    playerId: p.id,
                    nombre: p.nombre,
                    zombies_matados: p.stats?.zombies_matados || 0
                }))
                .sort((a, b) => b.zombies_matados - a.zombies_matados)
                .slice(0, 20);
            break;

        case 'nivel':
            rankings = players
                .map(p => ({
                    playerId: p.id,
                    nombre: p.nombre,
                    nivel: p.nivel || 1
                }))
                .sort((a, b) => b.nivel - a.nivel)
                .slice(0, 20);
            break;

        case 'dias':
            rankings = players
                .map(p => ({
                    playerId: p.id,
                    nombre: p.nombre,
                    dias_sobrevividos: p.stats?.dias_sobrevividos || 0
                }))
                .sort((a, b) => b.dias_sobrevividos - a.dias_sobrevividos)
                .slice(0, 20);
            break;

        case 'prestigio':
            rankings = players
                .map(p => {
                    const zombies = p.stats?.zombies_matados || 0;
                    const dias = p.stats?.dias_sobrevividos || 0;
                    const items = p.stats?.items_crafteados || 0;
                    const prestigio = (zombies * 10) + (dias * 100) + (p.nivel * 50) + items;

                    return {
                        playerId: p.id,
                        nombre: p.nombre,
                        prestigio
                    };
                })
                .sort((a, b) => b.prestigio - a.prestigio)
                .slice(0, 20);
            break;

        default:
            return res.json({ error: 'Categoría inválida' });
    }

    res.json({ rankings });
});

// ====================================
// WEBSOCKET
// ====================================
wss.on('connection', (ws) => {
    let playerId = null;

    // Handler de desconexión
    ws.on('close', () => {
        if (playerId && WORLD.players[playerId]) {
            connections.delete(playerId);

            broadcast({
                type: 'player:left',
                playerId,
                nombre: WORLD.players[playerId].nombre
            });

            broadcast({
                type: 'world:event',
                message: `👤 ${WORLD.players[playerId].nombre} se desconectó`,
                category: 'player'
            });

            // Enviar lista actualizada de jugadores
            broadcast({
                type: 'players:list',
                players: getConnectedPlayers()
            });
        }
    });

    ws.on('message', async (data) => {
        const msg = JSON.parse(data);

        // LOGIN
        if (msg.type === 'login') {
            playerId = msg.playerId;
            connections.set(playerId, ws);

            // Verificar si el jugador existe en memoria
            if (!WORLD.players[playerId]) {
                console.log(`⚠️ Jugador ${playerId} no existe en memoria. Creando jugador temporal...`);
                
                // Crear jugador con datos básicos
                WORLD.players[playerId] = {
                    id: playerId,
                    nombre: playerId.split('_')[1] || 'Desconocido',
                    salud: 100,
                    hambre: 50,
                    locacion: 'refugio',
                    inventario: {
                        comida: 5,
                        medicinas: 2,
                        armas: 1,
                        materiales: 3
                    },
                    stats: {
                        zombiesKilled: 0,
                        itemsFound: 0,
                        daysSurvived: 0,
                        missionsCompleted: 0,
                        travels: 0
                    },
                    nivel: 1,
                    xp: 0,
                    xpParaSiguienteNivel: 100,
                    skills: {
                        combate: 0,
                        supervivencia: 0,
                        sigilo: 0,
                        medicina: 0
                    },
                    clase: 'Superviviente',
                    cooldowns: {
                        scavenge: 0,
                        attack: 0,
                        rest: 0,
                        trade: 0
                    }
                };
            }

            ws.send(JSON.stringify({
                type: 'world:state',
                world: WORLD
            }));

            // Enviar información del jugador específico
            ws.send(JSON.stringify({
                type: 'player:data',
                player: WORLD.players[playerId]
            }));

            // Verificar que el jugador existe en WORLD.players
            if (WORLD.players[playerId]) {
                broadcast({
                    type: 'player:joined',
                    playerId,
                    nombre: WORLD.players[playerId].nombre
                }, playerId);

                broadcast({
                    type: 'world:event',
                    message: `👤 ${WORLD.players[playerId].nombre} se unió al servidor`,
                    category: 'player'
                });

                // Enviar lista actualizada de jugadores conectados a todos
                const connectedPlayers = Array.from(connections.keys())
                    .filter(pid => WORLD.players[pid])
                    .map(pid => ({
                        id: pid,
                        nombre: WORLD.players[pid].nombre,
                        locacion: WORLD.players[pid].locacion,
                        nivel: WORLD.players[pid].nivel
                    }));

                // Enviar lista al jugador que se conecta
                ws.send(JSON.stringify({
                    type: 'players:list',
                    players: connectedPlayers
                }));

                // También enviar a todos los demás
                broadcast({
                    type: 'players:list',
                    players: connectedPlayers
                });
            }

            return;
        }

        // PING (mantener conexión activa)
        if (msg.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
            return;
        }

        // GET PLAYERS LIST
        if (msg.type === 'getPlayers') {
            const connectedPlayers = Array.from(connections.keys())
                .filter(pid => WORLD.players[pid])
                .map(pid => ({
                    id: pid,
                    nombre: WORLD.players[pid].nombre,
                    locacion: WORLD.players[pid].locacion,
                    nivel: WORLD.players[pid].nivel,
                    stats: WORLD.players[pid].stats || {}
                }));

            ws.send(JSON.stringify({
                type: 'players:list',
                players: connectedPlayers
            }));
            return;
        }

        if (!playerId) return;

        const player = WORLD.players[playerId];

        // Verificar que el jugador existe
        if (!player) {
            ws.send(JSON.stringify({
                type: 'error',
                error: 'Jugador no encontrado. Recarga la página.'
            }));
            return;
        }

        // MOVERSE
        if (msg.type === 'move') {
            const target = WORLD.locations[msg.targetId];

            if (!target) {
                ws.send(JSON.stringify({ type: 'error', error: 'Locación inválida' }));
                return;
            }

            const current = WORLD.locations[player.locacion];
            if (!current.conectado_a.includes(msg.targetId)) {
                ws.send(JSON.stringify({ type: 'error', error: 'No puedes ir ahí directamente' }));
                return;
            }

            player.locacion = msg.targetId;

            // Trackear locaciones visitadas
            if (!player.visitedLocations) player.visitedLocations = new Set();
            player.visitedLocations.add(msg.targetId);
            updatePlayerStats(player, 'locaciones_visitadas', player.visitedLocations.size - (player.stats.locaciones_visitadas || 0));
            checkAchievements(player, ws);

            ws.send(JSON.stringify({
                type: 'moved',
                location: target
            }));

            broadcast({ type: 'player:moved', playerId, locacion: msg.targetId, nombre: player.nombre }, playerId);
            broadcast({
                type: 'world:event',
                message: `🚶 ${player.nombre} fue a ${target.nombre}`,
                category: 'player'
            });

            // Enviar lista actualizada de jugadores (actualizar locaciones)
            broadcast({
                type: 'players:list',
                players: getConnectedPlayers()
            });

            return;
        }

        // SCAVENGEAR (buscar recursos)
        if (msg.type === 'scavenge') {
            // Cooldown check
            if (player.cooldowns.scavenge && Date.now() < player.cooldowns.scavenge) {
                const segundos = Math.ceil((player.cooldowns.scavenge - Date.now()) / 1000);
                ws.send(JSON.stringify({ type: 'error', error: `Espera ${segundos}s antes de buscar de nuevo` }));
                return;
            }

            const loc = WORLD.locations[player.locacion];

            if (loc.tipo !== 'loot') {
                ws.send(JSON.stringify({ type: 'error', error: 'No hay nada que buscar aquí' }));
                return;
            }

            // Hay zombies? Riesgo de daño
            if (loc.zombies > 0) {
                // Skill de sigilo reduce riesgo
                const riesgo = Math.max(0.1, 0.4 - (player.skills.sigilo * 0.05));
                if (Math.random() < riesgo) {
                    const danio = Math.floor(Math.random() * 15) + 10;
                    player.salud -= danio;
                    ws.send(JSON.stringify({
                        type: 'combat',
                        message: '🧟 ¡Un zombie te atacó!',
                        damage: danio,
                        salud: player.salud
                    }));

                    // Aumenta ruido
                    loc.nivelRuido += 20;
                }
            }

            // Encontrar recursos (skill de supervivencia y clase mejora loot)
            const found = {};
            Object.keys(loc.recursos).forEach(recurso => {
                if (loc.recursos[recurso] <= 0) return; // Skip si no hay recursos

                const bonus = Math.floor(player.skills.supervivencia / 2);
                let cantidad = Math.min(
                    loc.recursos[recurso],
                    Math.floor(Math.random() * (3 + bonus)) + 1
                );

                // Bonificación de explorador
                cantidad = applyClassBonus(player, 'loot', cantidad);

                if (cantidad > 0) {
                    found[recurso] = cantidad;
                    player.inventario[recurso] = (player.inventario[recurso] || 0) + cantidad;
                    loc.recursos[recurso] -= cantidad;
                }
            });

            ws.send(JSON.stringify({
                type: 'scavenge:result',
                found,
                inventario: player.inventario
            }));

            // Subir skill
            player.skills.supervivencia = Math.min(10, player.skills.supervivencia + 0.1);

            // Ganar XP
            const xpGanado = 10 + Object.values(found).reduce((a, b) => a + b, 0) * 2;
            giveXP(player, xpGanado, ws);

            // Actualizar estadística de recursos
            const totalRecursos = Object.values(player.inventario).reduce((a, b) => a + b, 0);
            player.stats.recursos_totales = totalRecursos;
            checkAchievements(player, ws);

            // Cooldown de 3 segundos
            player.cooldowns.scavenge = Date.now() + 3000;
            return;
        }

        // ====================================
        // HABLAR CON NPC (Diálogos variados)
        // ====================================
        if (msg.type === 'talk') {
            const npc = WORLD.npcs[msg.npcId];
            if (!npc || !npc.vivo) {
                ws.send(JSON.stringify({ type: 'error', error: 'NPC no disponible' }));
                return;
            }

            if (npc.locacion !== player.locacion && npc.locacion !== 'refugio') {
                ws.send(JSON.stringify({ type: 'error', error: 'No puedes hablar con ese NPC desde aquí' }));
                return;
            }

            // Si el NPC tiene múltiples diálogos, elegir uno al azar
            let dialogo = npc.dialogo;
            if (npc.dialogos && npc.dialogos.length > 0) {
                dialogo = npc.dialogos[Math.floor(Math.random() * npc.dialogos.length)];
            }

            // Enviar diálogo y reproducir sonido apropiado
            const saludos = ['Hola', 'Hey', 'Buenas', 'Qué tal'];
            const despedidas = ['Adiós', 'Nos vemos', 'Hasta luego', 'Cuídate'];

            let sonido = 'npc_charla';
            if (saludos.some(s => dialogo.includes(s))) {
                sonido = 'npc_saludo';
            } else if (despedidas.some(s => dialogo.includes(s))) {
                sonido = 'npc_despedida';
            }

            ws.send(JSON.stringify({
                type: 'npc:talk',
                npcId: msg.npcId,
                npcName: npc.nombre,
                dialogo: dialogo,
                playSound: sonido
            }));

            log(`${npc.nombre}: "${dialogo}"`);
            return;
        }

        // ====================================
        // DAR RECURSOS A NPC (Regalo)
        // ====================================
        if (msg.type === 'give' || msg.type === 'giveResource' || msg.type === 'npc:give_resource') {
            const npcId = msg.npcId;
            const recurso = msg.item || msg.recurso || msg.resource;
            const cantidad = msg.cantidad || 1;

            const npc = WORLD.npcs[npcId];
            if (!npc || !npc.vivo) {
                ws.send(JSON.stringify({ type: 'error', error: 'NPC no disponible' }));
                return;
            }

            if (!player.inventario[recurso] || player.inventario[recurso] < cantidad) {
                ws.send(JSON.stringify({ type: 'error', error: `No tienes suficiente ${recurso}` }));
                return;
            }

            // Consumir recurso del jugador
            player.inventario[recurso] -= cantidad;

            // Actualizar estado del NPC según el recurso
            if (recurso === 'comida') {
                npc.hambre = Math.max(0, npc.hambre - 20 * cantidad);
                npc.moral = Math.min(100, npc.moral + 10);
            } else if (recurso === 'medicinas') {
                npc.salud = Math.min(100, npc.salud + 25 * cantidad);
                npc.moral = Math.min(100, npc.moral + 15);
            } else {
                npc.moral = Math.min(100, npc.moral + 5);
            }

            // Dar XP y ganar reputación
            giveXP(player, 20, ws);
            player.stats.reputacion = (player.stats.reputacion || 0) + 5;

            const respuestas = [
                '¡Muchas gracias! Esto me ayuda mucho.',
                '¡Eres muy amable! Gracias.',
                'No olvidaré esto. Gracias.',
                'Esto significa mucho para mí. Gracias.'
            ];

            ws.send(JSON.stringify({
                type: 'npc:talk',
                npcId: npcId,
                npcName: npc.nombre,
                dialogo: respuestas[Math.floor(Math.random() * respuestas.length)],
                playSound: 'npc_charla',
                inventario: player.inventario,
                npcState: npc
            }));

            log(`Diste ${cantidad} ${recurso} a ${npc.nombre}`);
            return;
        }

        // CRAFTEAR
        if (msg.type === 'craft') {
            // Cooldown check
            if (player.cooldowns.craft && Date.now() < player.cooldowns.craft) {
                const segundos = Math.ceil((player.cooldowns.craft - Date.now()) / 1000);
                ws.send(JSON.stringify({ type: 'error', error: `Espera ${segundos}s antes de craftear de nuevo` }));
                return;
            }

            const recipe = WORLD.craftingRecipes[msg.item];

            if (!recipe) {
                ws.send(JSON.stringify({ type: 'error', error: 'Receta inválida' }));
                return;
            }

            // Verificar materiales (con bonificación de ingeniero)
            let canCraft = true;
            const materialRequirements = {};
            Object.keys(recipe).forEach(mat => {
                if (mat === 'resultado') return;
                materialRequirements[mat] = applyClassBonus(player, 'craft_cost', recipe[mat]);
                if (!player.inventario[mat] || player.inventario[mat] < materialRequirements[mat]) {
                    canCraft = false;
                }
            });

            if (!canCraft) {
                ws.send(JSON.stringify({ type: 'error', error: 'No tienes suficientes materiales' }));
                return;
            }

            // Consumir materiales
            Object.keys(materialRequirements).forEach(mat => {
                player.inventario[mat] -= materialRequirements[mat];
            });

            // Crear item
            const resultado = recipe.resultado;
            if (resultado.tipo === 'defensa') {
                WORLD.locations.refugio.defensas += resultado.cantidad;
                ws.send(JSON.stringify({
                    type: 'craft:success',
                    item: msg.item,
                    defensas: WORLD.locations.refugio.defensas,
                    inventario: player.inventario
                }));
            } else {
                player.inventario[resultado.tipo] = (player.inventario[resultado.tipo] || 0) + resultado.cantidad;
                ws.send(JSON.stringify({
                    type: 'craft:success',
                    item: msg.item,
                    inventario: player.inventario
                }));
            }

            // Subir skill mecánica
            player.skills.mecanica = Math.min(10, player.skills.mecanica + 0.2);

            // Actualizar estadísticas y ganar XP
            updatePlayerStats(player, 'items_crafteados', 1);
            const xpGained = applyClassBonus(player, 'xp', 15);
            giveXP(player, xpGained, ws);
            checkAchievements(player, ws);

            // Cooldown de 2 segundos
            player.cooldowns.craft = Date.now() + 2000;

            return;
        }

        // ====================================
        // RESPONDER EVENTO NARRATIVO
        // ====================================
        if (msg.type === 'narrative:respond') {
            if (!WORLD.activeNarrativeEvent) {
                ws.send(JSON.stringify({ type: 'error', error: 'No hay evento narrativo activo' }));
                return;
            }

            const opcionIndex = msg.opcionIndex;
            const currentEvent = WORLD.activeNarrativeEvent;
            const opcion = currentEvent.opciones[opcionIndex];

            if (!opcion) {
                ws.send(JSON.stringify({ type: 'error', error: 'Opción inválida' }));
                return;
            }

            let resultado = `${currentEvent.nombre}: Elegiste "${opcion.texto}". `;

            // Aplicar costo
            if (opcion.costo) {
                let canAfford = true;
                Object.entries(opcion.costo).forEach(([recurso, cant]) => {
                    if (!player.inventario[recurso] || player.inventario[recurso] < cant) {
                        canAfford = false;
                    }
                });

                if (!canAfford) {
                    ws.send(JSON.stringify({
                        type: 'narrative:failed',
                        message: 'No tienes los recursos necesarios.'
                    }));
                    return;
                }

                // Consumir recursos
                Object.entries(opcion.costo).forEach(([recurso, cant]) => {
                    player.inventario[recurso] -= cant;
                });
            }

            // Aplicar riesgo
            if (opcion.riesgo && Math.random() < opcion.riesgo) {
                resultado += '¡Salió mal! Perdiste recursos y salud.';
                player.salud = Math.max(10, player.salud - 30);
            } else {
                // Aplicar recompensa
                if (opcion.recompensa) {
                    Object.entries(opcion.recompensa).forEach(([key, value]) => {
                        if (key === 'defensas') {
                            WORLD.locations.refugio.defensas += value;
                        } else if (key === 'moral') {
                            player.moral = Math.max(0, Math.min(100, (player.moral || 50) + value));
                        } else if (key === 'npc_nuevo') {
                            // Agregar NPC especial
                            resultado += ` ¡${value} se unió al refugio!`;
                        } else if (key === 'refugio_mejorado') {
                            resultado += ' ¡Encontraron un refugio seguro definitivo!';
                        } else if (key === 'recursos_extra') {
                            resultado += ' ¡Establecieron ruta comercial permanente!';
                        } else {
                            player.inventario[key] = (player.inventario[key] || 0) + value;
                        }
                    });
                }
                resultado += ' ¡Éxito!';
            }

            // XP por completar evento narrativo
            const xpGanado = 50;
            giveXP(player, xpGanado, ws);

            ws.send(JSON.stringify({
                type: 'narrative:completed',
                resultado,
                inventario: player.inventario,
                defensas: WORLD.locations.refugio.defensas
            }));

            // Avanzar a siguiente parte si existe
            if (opcion.siguiente) {
                const nextEvent = WORLD.narrativeChains[opcion.siguiente];
                if (nextEvent) {
                    WORLD.activeNarrativeEvent = nextEvent;

                    // Esperar 5 segundos antes de mostrar la continuación
                    setTimeout(() => {
                        broadcast({
                            type: 'narrative:event',
                            event: nextEvent
                        });
                        console.log(`📖 EVENTO CONTINÚA: ${nextEvent.nombre} (Parte ${nextEvent.parte})`);
                    }, 5000);
                } else {
                    WORLD.activeNarrativeEvent = null;
                }
            } else {
                // Fin de la cadena
                WORLD.activeNarrativeEvent = null;
                console.log(`📖 Evento narrativo completado`);
            }

            return;
        }

        // DISPARAR (mata zombies pero atrae más)
        // COMBATE MEJORADO
        if (msg.type === 'attack') {
            const tipoAtaque = msg.attackType || 'shoot'; // shoot, melee, stealth

            // Cooldown check
            if (player.cooldowns.shoot && Date.now() < player.cooldowns.shoot) {
                const segundos = Math.ceil((player.cooldowns.shoot - Date.now()) / 1000);
                ws.send(JSON.stringify({ type: 'error', error: `Espera ${segundos}s antes de atacar de nuevo` }));
                return;
            }

            const loc = WORLD.locations[player.locacion];

            if (loc.zombies === 0) {
                ws.send(JSON.stringify({ type: 'error', error: 'No hay zombies aquí' }));
                return;
            }

            let resultado = { killed: 0, critico: false, loot: {}, ruido: 0, danio: 0 };

            // DISPARO (usa arma, alto daño, mucho ruido)
            if (tipoAtaque === 'shoot') {
                if (!player.inventario.armas || player.inventario.armas < 1) {
                    ws.send(JSON.stringify({ type: 'error', error: 'No tienes armas' }));
                    return;
                }
                player.inventario.armas -= 1;

                // Daño base + skill + bonificación de soldado
                let danioBase = 30 + Math.floor(player.skills.combate * 3);
                resultado.danio = Math.floor(applyClassBonus(player, 'damage', danioBase));
                resultado.ruido = 60;

                // Chance de crítico (20% + agilidad + bonificación soldado)
                let chanceCritico = 0.2 + (player.atributos.agilidad / 100);
                if (player.clase === 'soldado') chanceCritico += 0.15;

                if (Math.random() < chanceCritico) {
                    resultado.critico = true;
                    resultado.danio *= 2;
                }
            }
            // MELEE (sin arma, daño medio, poco ruido)
            else if (tipoAtaque === 'melee') {
                // Daño = fuerza + skill
                resultado.danio = 15 + player.atributos.fuerza + Math.floor(player.skills.combate * 2);
                resultado.playSound = 'ataque_melee'; // Sonido de ataque cuerpo a cuerpo
                resultado.ruido = 20;

                // Chance de crítico
                if (Math.random() < 0.15 + (player.atributos.fuerza / 100)) {
                    resultado.critico = true;
                    resultado.danio *= 1.5;
                }
            }
            // SIGILO (requiere skill, 1 kill silencioso o falla)
            else if (tipoAtaque === 'stealth') {
                const chanceExito = 0.3 + (player.skills.supervivencia / 20) + (player.atributos.agilidad / 50);

                if (Math.random() < chanceExito) {
                    resultado.killed = 1;
                    resultado.danio = 999; // Instakill
                    resultado.ruido = 0;
                } else {
                    // Falla = te detectan, recibes daño
                    player.salud = Math.max(0, player.salud - 15);
                    ws.send(JSON.stringify({
                        type: 'combat:result',
                        playSound: 'recibo_dano', // Sonido de recibir daño
                        killed: 0,
                        critico: false,
                        falloSigilo: true,
                        remaining: loc.zombies,
                        loot: {},
                        inventario: player.inventario
                    }));
                    return;
                }
            }

            // Calcular kills basado en daño
            if (resultado.killed === 0) {
                // Mínimo 1 kill si hiciste daño, máximo según daño total
                const killsCalculados = Math.floor(resultado.danio / 25);
                resultado.killed = Math.min(loc.zombies, Math.max(1, killsCalculados));
            }
            loc.zombies -= resultado.killed;

            // Si eliminamos todos los zombies, iniciar cooldown de respawn (30 minutos)
            if (loc.zombies === 0 && loc.zombiesInitial > 0) {
                loc.zombiesRespawnTime = Date.now() + (30 * 60 * 1000); // 30 minutos
                console.log(`🧟 Zona ${loc.nombre} limpiada. Respawn en 30 minutos.`);
            }

            loc.nivelRuido += resultado.ruido;

            // LOOT de zombies muertos
            if (resultado.killed > 0) {
                for (let i = 0; i < resultado.killed; i++) {
                    // 30% chance de loot
                    if (Math.random() < 0.3) {
                        const lootTable = [
                            { tipo: 'comida', chance: 0.4, cantidad: 1 },
                            { tipo: 'medicinas', chance: 0.2, cantidad: 1 },
                            { tipo: 'armas', chance: 0.15, cantidad: 1 },
                            { tipo: 'materiales', chance: 0.25, cantidad: 2 }
                        ];

                        const roll = Math.random();
                        let acum = 0;
                        for (const item of lootTable) {
                            acum += item.chance;
                            if (roll < acum) {
                                resultado.loot[item.tipo] = (resultado.loot[item.tipo] || 0) + item.cantidad;
                                player.inventario[item.tipo] = (player.inventario[item.tipo] || 0) + item.cantidad;
                                break;
                            }
                        }
                    }
                }
            }

            ws.send(JSON.stringify({
                type: 'combat:result',
                killed: resultado.killed,
                critico: resultado.critico,
                playSound: resultado.playSound || null,
                remaining: loc.zombies,
                loot: resultado.loot,
                tipoAtaque,
                inventario: player.inventario
            }));

            // Subir skill combate
            player.skills.combate = Math.min(10, player.skills.combate + (resultado.killed * 0.2));

            // Actualizar estadísticas
            updatePlayerStats(player, 'zombies_matados', resultado.killed);

            // Detectar si mataste un tanque (5% chance de que hubiera uno)
            if (resultado.killed > 0 && Math.random() < 0.05) {
                updatePlayerStats(player, 'tanques_matados', 1);
                broadcast({
                    type: 'world:event',
                    message: `💪 ${player.nombre} derrotó un Zombie Tanque!`,
                    category: 'combat'
                });
            }

            // Ganar XP
            const xpBase = tipoAtaque === 'stealth' ? 15 : 8;
            giveXP(player, resultado.killed * xpBase, ws);
            checkAchievements(player, ws);

            // Cooldown (sigilo es más rápido)
            player.cooldowns.shoot = Date.now() + (tipoAtaque === 'stealth' ? 2000 : 4000);

            broadcast({
                type: 'world:event',
                message: `⚔️ ${player.nombre} eliminó ${resultado.killed} zombies en ${loc.nombre}${resultado.critico ? ' ¡CRÍTICO!' : ''}`,
                category: 'combat'
            });

            // Enviar estado actualizado del mundo al jugador
            ws.send(JSON.stringify({
                type: 'world:state',
                world: WORLD
            }));

            return;
        }

        // DAR ITEM A NPC
        if (msg.type === 'give') {
            const npc = WORLD.npcs[msg.npcId];
            const item = msg.item;
            const cantidad = msg.cantidad || 1;

            if (!npc || !npc.vivo) {
                ws.send(JSON.stringify({ type: 'error', error: 'NPC no disponible' }));
                return;
            }

            if (!player.inventario[item] || player.inventario[item] < cantidad) {
                ws.send(JSON.stringify({ type: 'error', error: 'No tienes suficiente' }));
                return;
            }

            player.inventario[item] -= cantidad;

            // Efectos según item
            if (item === 'comida') {
                npc.hambre = Math.min(100, npc.hambre + 30 * cantidad);
                npc.moral += 10;
            } else if (item === 'medicinas') {
                npc.salud = Math.min(100, npc.salud + 40 * cantidad);
                npc.moral += 15;
            }

            ws.send(JSON.stringify({
                type: 'give:success',
                npc: npc.nombre,
                item,
                cantidad,
                npcState: npc,
                inventario: player.inventario
            }));

            broadcast({
                type: 'npc:updated',
                npcId: npc.id,
                npc
            }, playerId);

            return;
        }

        // DONAR AL REFUGIO
        if (msg.type === 'donate') {
            const item = msg.item;
            const cantidad = msg.cantidad || 1;

            if (!player.inventario[item] || player.inventario[item] < cantidad) {
                ws.send(JSON.stringify({ type: 'error', error: 'No tienes suficiente' }));
                return;
            }

            // Remover del inventario del jugador
            player.inventario[item] -= cantidad;

            // Agregar a los recursos del refugio
            if (!WORLD.locations.refugio.recursos[item]) {
                WORLD.locations.refugio.recursos[item] = 0;
            }
            WORLD.locations.refugio.recursos[item] += cantidad;

            // Dar XP por donación
            const xpGain = cantidad * 5;
            player.xp += xpGain;

            ws.send(JSON.stringify({
                type: 'donate:success',
                item,
                cantidad,
                inventario: player.inventario,
                xpGain
            }));

            broadcast({
                type: 'world:event',
                message: `💝 ${player.nombre} donó ${cantidad} ${item} al refugio`,
                category: 'resource'
            });

            broadcast({
                type: 'refugio:recursos',
                recursos: WORLD.locations.refugio.recursos
            });

            return;
        }

        // ===== SISTEMA DE MUNDO VIVO =====

        // OBTENER EVENTOS DEL MUNDO (Feed de noticias)
        if (msg.type === 'getWorldEvents') {
            try {
                const narrativeEngine = await import('./world/narrativeEngine.js');
                const limit = msg.limit || 30;
                const events = narrativeEngine.default.getRecentEvents(limit);

                ws.send(JSON.stringify({
                    type: 'world:events',
                    events: events.reverse() // Más recientes al final
                }));
            } catch (error) {
                console.error('Error obteniendo eventos del mundo:', error);
                ws.send(JSON.stringify({
                    type: 'error',
                    error: 'No se pudieron obtener los eventos del mundo'
                }));
            }
            return;
        }

        // OBTENER RELACIONES INTENSAS (dramas activos)
        if (msg.type === 'getIntenseRelationships') {
            try {
                const npcRelationships = await import('./world/npcRelations.js');
                const minIntensity = msg.minIntensity || 5;
                const relationships = npcRelationships.default.getIntenseRelationships(minIntensity);

                ws.send(JSON.stringify({
                    type: 'world:relationships',
                    relationships
                }));
            } catch (error) {
                console.error('Error obteniendo relaciones:', error);
                ws.send(JSON.stringify({
                    type: 'error',
                    error: 'No se pudieron obtener las relaciones'
                }));
            }
            return;
        }

        // OBTENER ESTADO DEL MUNDO (stats de simulación)
        if (msg.type === 'getWorldState') {
            try {
                const worldSimulation = await import('./world/simulation.js');
                const state = worldSimulation.default.getWorldState() || {
                    tick: 0,
                    npcCount: 0,
                    activeEvents: 0,
                    narrativeStats: { romances: 0, conflictos: 0, dramas: 0, actividades: 0 },
                    aiStats: { npcsWithMemories: 0, totalMemories: 0, activeGoals: 0 }
                };

                ws.send(JSON.stringify({
                    type: 'world:fullState',
                    state
                }));
            } catch (error) {
                console.error('Error obteniendo estado del mundo:', error);
                // Enviar estado vacío en lugar de error
                ws.send(JSON.stringify({
                    type: 'world:fullState',
                    state: {
                        tick: 0,
                        npcCount: 0,
                        activeEvents: 0,
                        narrativeStats: { romances: 0, conflictos: 0, dramas: 0, actividades: 0 },
                        aiStats: { npcsWithMemories: 0, totalMemories: 0, activeGoals: 0 }
                    }
                }));
            }
            return;
        }

        // ===== FIN SISTEMA DE MUNDO VIVO =====

        // OBTENER MISIONES ACTIVAS (quests dinámicas)
        if (msg.type === 'getActiveQuests') {
            try {
                const dynamicQuests = await import('./world/dynamicQuests.js');
                const quests = dynamicQuests.default.getActiveQuests() || [];

                ws.send(JSON.stringify({
                    type: 'quests:list',
                    quests
                }));
            } catch (error) {
                console.error('Error obteniendo misiones:', error);
                // Devolver array vacío en lugar de error
                ws.send(JSON.stringify({
                    type: 'quests:list',
                    quests: []
                }));
            }
            return;
        }

        // ACEPTAR MISIÓN
        if (msg.type === 'acceptQuest') {
            try {
                const dynamicQuests = await import('./world/dynamicQuests.js');
                const questId = msg.questId;

                const quest = dynamicQuests.default.getQuestById(questId);
                if (!quest) {
                    ws.send(JSON.stringify({ type: 'error', error: 'Misión no encontrada' }));
                    return;
                }

                if (quest.estado !== 'disponible') {
                    ws.send(JSON.stringify({ type: 'error', error: 'Misión no disponible' }));
                    return;
                }

                dynamicQuests.default.acceptQuest(questId, player.id);

                ws.send(JSON.stringify({
                    type: 'quest:accepted',
                    quest: dynamicQuests.default.getQuestById(questId)
                }));
            } catch (error) {
                console.error('Error aceptando misión:', error);
                ws.send(JSON.stringify({
                    type: 'error',
                    error: 'No se pudo aceptar la misión'
                }));
            }
            return;
        }

        // COMPLETAR MISIÓN
        if (msg.type === 'completeQuest') {
            try {
                const dynamicQuests = await import('./world/dynamicQuests.js');
                const questId = msg.questId;
                const success = msg.success !== undefined ? msg.success : true;

                const result = dynamicQuests.default.completeQuest(questId, player.id, success);

                if (!result.success) {
                    ws.send(JSON.stringify({ type: 'error', error: result.message }));
                    return;
                }

                // Aplicar recompensas
                if (result.rewards) {
                    if (result.rewards.xp) {
                        player.xp = (player.xp || 0) + result.rewards.xp;
                    }
                    if (result.rewards.reputacion) {
                        player.reputacion = (player.reputacion || 0) + result.rewards.reputacion;
                    }
                    if (result.rewards.oro) {
                        player.inventario.oro = (player.inventario.oro || 0) + result.rewards.oro;
                    }

                    guardarPlayer(player.id);
                }

                ws.send(JSON.stringify({
                    type: 'quest:completed',
                    result,
                    player: {
                        xp: player.xp,
                        reputacion: player.reputacion,
                        inventario: player.inventario
                    }
                }));
            } catch (error) {
                console.error('Error completando misión:', error);
                ws.send(JSON.stringify({
                    type: 'error',
                    error: 'No se pudo completar la misión'
                }));
            }
            return;
        }

        // ===== SISTEMA DE MISIONES NARRATIVAS =====

        // OBTENER MISIONES NARRATIVAS DISPONIBLES
        if (msg.type === 'getNarrativeMissions') {
            try {
                const narrativeMissions = await import('./systems/narrativeMissions.js');
                const playerLevel = player.nivel || 1;
                const missions = narrativeMissions.default.getAvailableMissions(playerLevel);

                ws.send(JSON.stringify({
                    type: 'narrative:missions',
                    missions
                }));
            } catch (error) {
                console.error('Error obteniendo misiones narrativas:', error);
                ws.send(JSON.stringify({ type: 'error', error: 'Error cargando misiones' }));
            }
            return;
        }

        // INICIAR MISIÓN NARRATIVA
        if (msg.type === 'startNarrativeMission') {
            try {
                const narrativeMissions = await import('./systems/narrativeMissions.js');
                const { templateId, isGroup, partyMembers } = msg;

                const result = narrativeMissions.default.startMission(
                    templateId,
                    player.id,
                    isGroup,
                    partyMembers || []
                );

                if (result.success) {
                    // Notificar a todos los miembros del grupo
                    if (isGroup && partyMembers) {
                        partyMembers.forEach(memberId => {
                            const memberWs = wss.clients.find(c => c.playerId === memberId);
                            if (memberWs) {
                                memberWs.send(JSON.stringify({
                                    type: 'narrative:started',
                                    mission: result.mission
                                }));
                            }
                        });
                    }

                    ws.send(JSON.stringify({
                        type: 'narrative:started',
                        mission: result.mission
                    }));
                } else {
                    ws.send(JSON.stringify({ type: 'error', error: result.message }));
                }
            } catch (error) {
                console.error('Error iniciando misión narrativa:', error);
                ws.send(JSON.stringify({ type: 'error', error: 'Error al iniciar misión' }));
            }
            return;
        }

        // HACER ELECCIÓN EN MISIÓN (SOLO)
        if (msg.type === 'narrativeChoice') {
            try {
                const narrativeMissions = await import('./systems/narrativeMissions.js');
                const { missionId, choiceId } = msg;

                const result = narrativeMissions.default.makeChoice(missionId, player.id, choiceId);

                if (result.success) {
                    if (result.completed) {
                        // Misión completada
                        // Aplicar recompensas
                        if (result.rewards) {
                            player.xp = (player.xp || 0) + result.rewards.xp;
                            player.salud = Math.min(100, player.salud + result.rewards.health);

                            Object.entries(result.rewards.items || {}).forEach(([item, qty]) => {
                                player.inventario[item] = (player.inventario[item] || 0) + qty;
                            });

                            // Guardar progreso en DB
                            if (player.dbId) {
                                survivalDB.guardarProgreso(player.dbId, {
                                    nivel: player.nivel,
                                    xp: player.xp,
                                    xp_siguiente_nivel: player.xpParaSiguienteNivel,
                                    salud: player.salud,
                                    hambre: player.hambre,
                                    locacion: player.locacion,
                                    inventario: player.inventario,
                                    skills: player.skills
                                });
                            }
                        }

                        ws.send(JSON.stringify({
                            type: 'narrative:completed',
                            rewards: result.rewards,
                            summary: result.summary
                        }));
                    } else {
                        // Continuar a siguiente paso
                        ws.send(JSON.stringify({
                            type: 'narrative:nextStep',
                            step: result.nextStep,
                            effects: result.effects
                        }));
                    }
                } else {
                    ws.send(JSON.stringify({ type: 'error', error: result.message }));
                }
            } catch (error) {
                console.error('Error en elección narrativa:', error);
                ws.send(JSON.stringify({ type: 'error', error: 'Error procesando elección' }));
            }
            return;
        }

        // VOTAR EN MISIÓN GRUPAL
        if (msg.type === 'narrativeVote') {
            try {
                const narrativeMissions = await import('./systems/narrativeMissions.js');
                const { missionId, choiceId } = msg;

                const result = narrativeMissions.default.vote(missionId, player.id, choiceId);

                if (result.success) {
                    ws.send(JSON.stringify({
                        type: 'narrative:voted',
                        votesCount: result.votesCount,
                        totalMembers: result.totalMembers
                    }));
                } else {
                    ws.send(JSON.stringify({ type: 'error', error: result.message }));
                }
            } catch (error) {
                console.error('Error votando:', error);
                ws.send(JSON.stringify({ type: 'error', error: 'Error al votar' }));
            }
            return;
        }

        // OBTENER MISIÓN ACTIVA
        if (msg.type === 'getActiveMission') {
            try {
                const narrativeMissions = await import('./systems/narrativeMissions.js');
                const activeMission = narrativeMissions.default.getActiveMission(player.id);

                ws.send(JSON.stringify({
                    type: 'narrative:active',
                    mission: activeMission
                }));
            } catch (error) {
                console.error('Error obteniendo misión activa:', error);
                ws.send(JSON.stringify({ type: 'error', error: 'Error' }));
            }
            return;
        }

        // ===== FIN MISIONES NARRATIVAS =====

        // COMERCIAR con Jorge
        if (msg.type === 'trade') {
            const npc = WORLD.npcs.comerciante;

            if (!npc || !npc.vivo) {
                ws.send(JSON.stringify({ type: 'error', error: 'Jorge no está disponible' }));
                return;
            }

            const { ofreces, pides } = msg; // {ofreces: {item, cant}, pides: {item, cant}}

            // Validar que jugador tiene lo que ofrece
            if (!player.inventario[ofreces.item] || player.inventario[ofreces.item] < ofreces.cant) {
                ws.send(JSON.stringify({ type: 'error', error: 'No tienes suficiente para comerciar' }));
                return;
            }

            // Validar que Jorge tiene lo que pides
            if (!npc.inventario[pides.item] || npc.inventario[pides.item] < pides.cant) {
                ws.send(JSON.stringify({ type: 'error', error: 'Jorge no tiene eso' }));
                return;
            }

            // Realizar intercambio
            player.inventario[ofreces.item] -= ofreces.cant;
            player.inventario[pides.item] = (player.inventario[pides.item] || 0) + pides.cant;
            npc.inventario[ofreces.item] = (npc.inventario[ofreces.item] || 0) + ofreces.cant;
            npc.inventario[pides.item] -= pides.cant;

            ws.send(JSON.stringify({
                type: 'trade:success',
                message: `Intercambiaste ${ofreces.cant} ${ofreces.item} por ${pides.cant} ${pides.item}`,
                inventario: player.inventario,
                comercianteInventario: npc.inventario
            }));

            return;
        }

        // RESPONDER A EVENTO ESPECIAL
        if (msg.type === 'event:respond') {
            const evento = WORLD.activeEvents.find(e => e.id === msg.eventId);

            if (!evento) {
                ws.send(JSON.stringify({ type: 'error', error: 'Evento no disponible' }));
                return;
            }

            const opcion = evento.opciones[msg.opcionIndex];

            // Verificar costo
            let canAfford = true;
            Object.keys(opcion.costo).forEach(recurso => {
                if (recurso === 'moral' || recurso === 'defensas') {
                    // Estos se verifican en el refugio
                    return;
                }
                const total = player.inventario[recurso] || 0;
                if (total < opcion.costo[recurso]) {
                    canAfford = false;
                }
            });

            if (!canAfford) {
                ws.send(JSON.stringify({ type: 'error', error: 'No tienes suficientes recursos' }));
                return;
            }

            // Aplicar costo
            Object.keys(opcion.costo).forEach(recurso => {
                if (recurso === 'moral' || recurso === 'defensas') return;
                player.inventario[recurso] -= opcion.costo[recurso];
            });

            // Aplicar recompensas o consecuencias
            let resultado = `Elegiste: ${opcion.texto}. `;

            // Riesgo (puede salir mal)
            if (Math.random() < opcion.riesgo) {
                resultado += '¡Algo salió MAL! ';
                player.salud -= 20;
                broadcast({
                    type: 'event:bad_outcome',
                    message: `${player.nombre} tomó una decisión arriesgada y salió mal...`
                });
            } else {
                // Aplicar recompensas
                Object.keys(opcion.recompensa).forEach(recurso => {
                    if (recurso === 'moral') {
                        Object.values(WORLD.npcs).forEach(n => {
                            if (n.vivo) n.moral = Math.max(0, Math.min(100, n.moral + opcion.recompensa[recurso]));
                        });
                    } else if (recurso === 'defensas') {
                        WORLD.locations.refugio.defensas += opcion.recompensa[recurso];
                    } else {
                        player.inventario[recurso] = (player.inventario[recurso] || 0) + opcion.recompensa[recurso];
                    }
                });
                resultado += 'Todo salió bien.';

                // XP POR COMPLETAR EVENTO
                const xpGanado = 25;
                player.xp += xpGanado;

                ws.send(JSON.stringify({
                    type: 'xp:gained',
                    amount: xpGanado,
                    xp: player.xp,
                    xpMax: player.xpParaSiguienteNivel
                }));

                // Verificar nivel
                if (player.xp >= player.xpParaSiguienteNivel) {
                    player.nivel++;
                    player.xp = 0;
                    player.xpParaSiguienteNivel = Math.floor(player.xpParaSiguienteNivel * 1.5);
                    ws.send(JSON.stringify({
                        type: 'level:up',
                        nivel: player.nivel,
                        xpMax: player.xpParaSiguienteNivel
                    }));
                }

                // Si el evento es de REFUGIADOS, agregar NPC dinámico
                if (evento.id === 'refugiados' && msg.opcionIndex === 0) {
                    const nombres = ['Ana', 'Pedro', 'Luis', 'Carmen', 'Miguel', 'Sofia', 'Carlos', 'Elena'];
                    const apellidos = ['García', 'López', 'Martínez', 'Rodríguez', 'González', 'Fernández'];
                    const nombreCompleto = `${nombres[Math.floor(Math.random() * nombres.length)]} ${apellidos[Math.floor(Math.random() * apellidos.length)]}`;

                    const npcId = `refugiado_${Date.now()}`;
                    WORLD.npcs[npcId] = {
                        id: npcId,
                        nombre: nombreCompleto,
                        rol: 'refugiado',
                        locacion: 'refugio',
                        salud: 80,
                        hambre: 60,
                        moral: 70,
                        vivo: true,
                        estado: 'activo',
                        enMision: false,
                        dialogo: `Gracias por aceptarnos, ${player.nombre}. No te defraudaremos.`,
                        dialogos: [
                            'Venimos de muy lejos...',
                            'No teníamos a dónde ir.',
                            'Ayudaremos en lo que podamos.',
                            'Mi familia está a salvo gracias a ti.',
                            '¿Creen que sobreviviremos a esto?',
                            'Extraño cómo era el mundo antes.',
                            'Cada día es una nueva oportunidad.',
                            'Gracias por darnos una segunda oportunidad.'
                        ]
                    };

                    broadcast({
                        type: 'world:event',
                        message: `👥 ${nombreCompleto} se unió al refugio`,
                        category: 'npc'
                    });
                }
            }

            // Remover evento
            WORLD.activeEvents = WORLD.activeEvents.filter(e => e.id !== msg.eventId);

            ws.send(JSON.stringify({
                type: 'event:resolved',
                resultado,
                inventario: player.inventario
            }));

            broadcast({
                type: 'event:resolved_broadcast',
                playerId,
                eventId: msg.eventId
            }, playerId);

            return;
        }

        // HABLAR CON NPC
        if (msg.type === 'talk') {
            const npc = WORLD.npcs[msg.npcId];

            if (!npc || !npc.vivo) {
                ws.send(JSON.stringify({ type: 'error', error: 'NPC no disponible' }));
                return;
            }

            // Generar opciones de diálogo basadas en el estado del NPC
            const opciones = [];

            // Opciones básicas siempre disponibles
            opciones.push({ texto: '👋 Saludar', efecto: 'saludo' });

            // Opciones según necesidades del NPC
            if (npc.hambre < 50) {
                opciones.push({
                    texto: '🍖 Ofrecer comida',
                    efecto: 'dar_comida',
                    requiere: { comida: 1 }
                });
            }

            if (npc.moral < 50) {
                opciones.push({
                    texto: '💬 Animar',
                    efecto: 'animar'
                });
            }

            if (player.inventario.medicinas && player.inventario.medicinas > 0 && npc.salud < 80) {
                opciones.push({
                    texto: '💊 Ofrecer medicina',
                    efecto: 'dar_medicina',
                    requiere: { medicinas: 1 }
                });
            }

            // Opciones especiales según el NPC
            if (npc.id === 'gomez' && player.inventario.armas && player.inventario.armas >= 5) {
                opciones.push({
                    texto: '🔫 Preguntarle sobre defensas',
                    efecto: 'consulta_defensas'
                });
            }

            opciones.push({ texto: '👋 Despedirse', efecto: 'despedida' });

            ws.send(JSON.stringify({
                type: 'dialogue',
                npcId: npc.id,
                npc: npc.nombre,
                text: npc.dialogo,
                playSound: 'npc_saludo',
                npcState: { salud: npc.salud, hambre: npc.hambre, moral: npc.moral },
                options: opciones
            }));

            return;
        }

        // RESPONDER A DIÁLOGO
        if (msg.type === 'dialogue:respond') {
            const npc = WORLD.npcs[msg.npcId];
            if (!npc || !npc.vivo) return;

            const opciones = [];

            opciones.push({ texto: '👋 Saludar', efecto: 'saludo' });
            if (npc.hambre < 50) {
                opciones.push({ texto: '🍖 Ofrecer comida', efecto: 'dar_comida', requiere: { comida: 1 } });
            }
            if (npc.moral < 50) {
                opciones.push({ texto: '💬 Animar', efecto: 'animar' });
            }
            if (player.inventario.medicinas && player.inventario.medicinas > 0 && npc.salud < 80) {
                opciones.push({ texto: '💊 Ofrecer medicina', efecto: 'dar_medicina', requiere: { medicinas: 1 } });
            }
            if (npc.id === 'gomez' && player.inventario.armas && player.inventario.armas >= 5) {
                opciones.push({ texto: '🔫 Preguntarle sobre defensas', efecto: 'consulta_defensas' });
            }
            opciones.push({ texto: '👋 Despedirse', efecto: 'despedida' });

            const opcion = opciones[msg.optionIndex];
            if (!opcion) return;

            let respuesta = '';

            switch (opcion.efecto) {
                case 'saludo':
                    respuesta = npc.moral > 70
                        ? `¡Hola ${player.nombre}! ¿Cómo estás?`
                        : `Hola... *suspiro*`;
                    break;

                case 'dar_comida':
                    if (player.inventario.comida && player.inventario.comida >= 1) {
                        player.inventario.comida--;
                        npc.hambre = Math.min(100, npc.hambre + 30);
                        npc.moral = Math.min(100, npc.moral + 10);
                        respuesta = `¡Muchas gracias ${player.nombre}! Esto me ayudará mucho.`;
                        updatePlayerStats(player, 'items_dados', 1);
                    } else {
                        respuesta = 'Parece que no tienes comida...';
                    }
                    break;

                case 'dar_medicina':
                    if (player.inventario.medicinas && player.inventario.medicinas >= 1) {
                        player.inventario.medicinas--;
                        npc.salud = Math.min(100, npc.salud + 40);
                        npc.moral = Math.min(100, npc.moral + 15);
                        respuesta = `¡Gracias! Me siento mucho mejor ahora.`;
                        updatePlayerStats(player, 'items_dados', 1);
                    } else {
                        respuesta = 'No tienes medicinas...';
                    }
                    break;

                case 'animar':
                    npc.moral = Math.min(100, npc.moral + 20);
                    respuesta = `Gracias por tus palabras, ${player.nombre}. Significa mucho para mí.`;
                    break;

                case 'consulta_defensas':
                    respuesta = `Las defensas del refugio están en ${WORLD.locations.refugio.defensas}. Necesitamos más barricadas y trampas.`;
                    break;

                case 'despedida':
                    respuesta = npc.moral > 70
                        ? '¡Hasta luego! Cuídate ahí afuera.'
                        : 'Adiós...';
                    break;
            }

            // Determinar qué sonido reproducir
            const playSound = opcion.efecto === 'despedida' ? 'npc_despedida' : 'npc_charla';

            ws.send(JSON.stringify({
                type: 'dialogue',
                npcId: npc.id,
                npc: npc.nombre,
                text: respuesta,
                playSound: playSound,
                npcState: { salud: npc.salud, hambre: npc.hambre, moral: npc.moral },
                options: opcion.efecto === 'despedida' ? [] : opciones
            }));

            broadcast({
                type: 'world:state',
                world: WORLD
            });

            return;
        }

        // VOTAR EN QUEST COOPERATIVA
        if (msg.type === 'quest:vote') {
            if (!WORLD.questCooperativa.activa) {
                ws.send(JSON.stringify({ type: 'error', error: 'No hay quest activa' }));
                return;
            }

            const opcion = msg.opcion;
            if (!WORLD.questCooperativa.opciones.includes(opcion)) {
                ws.send(JSON.stringify({ type: 'error', error: 'Opción inválida' }));
                return;
            }

            // Remover voto anterior si existe
            Object.keys(WORLD.questCooperativa.votos).forEach(opt => {
                WORLD.questCooperativa.votos[opt] = WORLD.questCooperativa.votos[opt].filter(id => id !== playerId);
            });

            // Agregar nuevo voto
            if (!WORLD.questCooperativa.votos[opcion]) {
                WORLD.questCooperativa.votos[opcion] = [];
            }
            WORLD.questCooperativa.votos[opcion].push(playerId);

            ws.send(JSON.stringify({
                type: 'quest:voted',
                opcion,
                message: `Votaste por: ${opcion}`
            }));

            broadcast({
                type: 'quest:votes_update',
                votos: WORLD.questCooperativa.votos
            });

            return;
        }

        // CHAT
        if (msg.type === 'chat') {
            const mensaje = msg.mensaje.trim();

            // Comandos especiales (empiezan con /)
            if (mensaje.startsWith('/')) {
                const comando = mensaje.toLowerCase().split(' ')[0];

                if (comando === '/help') {
                    ws.send(JSON.stringify({
                        type: 'chat:system',
                        mensaje: '📋 Comandos disponibles:\n/help - Muestra esta ayuda\n/stats - Estadísticas del servidor\n/online - Jugadores conectados\n/loc - Tu ubicación actual\n/skills - Tus habilidades'
                    }));
                    return;
                }

                if (comando === '/stats') {
                    const totalZombies = Object.values(WORLD.locations).reduce((sum, loc) => sum + loc.zombies, 0);
                    const npcsVivos = Object.values(WORLD.npcs).filter(npc => npc.vivo).length;
                    ws.send(JSON.stringify({
                        type: 'chat:system',
                        mensaje: `📊 Estadísticas:\n🧟 Zombies: ${totalZombies}\n👥 NPCs vivos: ${npcsVivos}\n🛡️ Defensas refugio: ${WORLD.locations.refugio.defensas}\n🌍 Jugadores: ${connections.size}`
                    }));
                    return;
                }

                if (comando === '/online') {
                    const onlinePlayers = getConnectedPlayers();
                    const lista = onlinePlayers.map(p => `${p.nombre} (Nv.${p.nivel}) - ${WORLD.locations[p.locacion]?.nombre || p.locacion}`).join('\n');
                    ws.send(JSON.stringify({
                        type: 'chat:system',
                        mensaje: `👥 Jugadores conectados (${onlinePlayers.length}):\n${lista}`
                    }));
                    return;
                }

                if (comando === '/loc') {
                    const loc = WORLD.locations[player.locacion];
                    ws.send(JSON.stringify({
                        type: 'chat:system',
                        mensaje: `📍 Estás en: ${loc.nombre}\n🧟 Zombies: ${loc.zombies}\n📦 Recursos disponibles: ${Object.entries(loc.recursos).map(([k, v]) => `${k}:${v}`).join(', ')}`
                    }));
                    return;
                }

                if (comando === '/skills') {
                    const skills = Object.entries(player.skills || {}).map(([k, v]) => `${k}: ${v.toFixed(1)}`).join(', ');
                    ws.send(JSON.stringify({
                        type: 'chat:system',
                        mensaje: `🎯 Tus habilidades:\n${skills}`
                    }));
                    return;
                }

                ws.send(JSON.stringify({
                    type: 'chat:system',
                    mensaje: '❌ Comando desconocido. Usa /help para ver comandos disponibles.'
                }));
                return;
            }

            // Mensaje normal de chat
            const chatMessage = {
                type: 'chat:message',
                playerId,
                nombre: player.nombre,
                avatar: player.avatar,
                color: player.color,
                mensaje: msg.mensaje,
                timestamp: Date.now()
            };

            broadcast(chatMessage);

            return;
        }

        // ====================================
        // MENSAJES PRIVADOS (DM)
        // ====================================
        if (msg.type === 'dm') {
            const targetId = msg.targetId;
            const targetPlayer = WORLD.players[targetId];

            if (!targetPlayer) {
                ws.send(JSON.stringify({ type: 'error', error: 'Jugador no encontrado' }));
                return;
            }

            // Buscar conexión del target
            const targetWs = Array.from(connections.entries())
                .find(([ws, id]) => id === targetId)?.[0];

            if (!targetWs) {
                ws.send(JSON.stringify({ type: 'error', error: 'Jugador no está conectado' }));
                return;
            }

            // Enviar mensaje al destinatario
            targetWs.send(JSON.stringify({
                type: 'dm:received',
                from: playerId,
                fromName: player.nombre,
                message: msg.mensaje,
                timestamp: Date.now()
            }));

            // Confirmar al remitente
            ws.send(JSON.stringify({
                type: 'dm:sent',
                to: targetId,
                message: msg.mensaje
            }));

            console.log(`💌 DM: ${player.nombre} → ${targetPlayer.nombre}: ${msg.mensaje}`);

            return;
        }

        // COMPLETAR MISIÓN
        if (msg.type === 'mission:complete') {
            const mission = WORLD.activeMissions.find(m => m.id === msg.missionId);

            if (!mission) {
                ws.send(JSON.stringify({ type: 'error', error: 'Misión no encontrada' }));
                return;
            }

            if (mission.completedBy.includes(playerId)) {
                ws.send(JSON.stringify({ type: 'error', error: 'Ya completaste esta misión' }));
                return;
            }

            completeMission(player, mission);
            return;
        }

        // ALIMENTAR MASCOTA
        if (msg.type === 'pet:feed') {
            if (!player.mascota) {
                ws.send(JSON.stringify({ type: 'error', error: 'No tienes mascota' }));
                return;
            }

            const feedValues = { comida: 30, carne: 50, rations: 40 };
            const value = feedValues[msg.item] || 0;

            if (value === 0) {
                ws.send(JSON.stringify({ type: 'error', error: 'Item no válido' }));
                return;
            }

            if (!player.inventario[msg.item] || player.inventario[msg.item] <= 0) {
                ws.send(JSON.stringify({ type: 'error', error: 'No tienes ese item' }));
                return;
            }

            player.inventario[msg.item]--;
            player.mascota.hambre = Math.min(100, player.mascota.hambre + value);
            player.mascota.moral = Math.min(100, player.mascota.moral + 10);

            ws.send(JSON.stringify({
                type: 'pet:updated',
                mascota: player.mascota,
                inventario: player.inventario
            }));

            return;
        }

        // USAR HABILIDAD ESPECIAL
        if (msg.type === 'ability:use') {
            const result = useSpecialAbility(player, msg.abilityId, ws);

            ws.send(JSON.stringify({
                type: 'ability:result',
                ...result
            }));

            if (result.success) {
                updatePlayerStats(player, 'habilidades_usadas', 1);
            }

            return;
        }

        // CAMBIAR REPUTACIÓN CON NPC
        if (msg.type === 'reputation:change') {
            const newRep = changeReputation(playerId, msg.npcId, msg.amount);
            const level = getReputationLevel(newRep);

            ws.send(JSON.stringify({
                type: 'reputation:updated',
                npcId: msg.npcId,
                reputation: newRep,
                level
            }));

            return;
        }

        // ACEPTAR MISIÓN DE NPC
        if (msg.type === 'npc:accept_mission') {
            const npc = WORLD.npcs[msg.npcId];
            const missionType = msg.missionType;

            if (!npc || !npc.vivo) {
                ws.send(JSON.stringify({ type: 'error', error: 'NPC no disponible' }));
                return;
            }

            if (!npc.misionesDisponibles || !npc.misionesDisponibles.includes(missionType)) {
                ws.send(JSON.stringify({ type: 'error', error: 'Esta misión no está disponible' }));
                return;
            }

            // Configurar misiones según tipo
            const missionConfig = {
                espiar_refugio_central: {
                    descripcion: 'Espía el Refugio Central durante 60 segundos',
                    objetivo: 'espiar',
                    target: 'refugio',
                    duracion: 60,
                    recompensa: { xp: 200, reputacion: 20, materiales: 15 }
                },
                informar_movimientos: {
                    descripcion: 'Observa y reporta movimientos de NPCs',
                    objetivo: 'informar',
                    target: 'npcs',
                    duracion: 45,
                    recompensa: { xp: 150, reputacion: 15, comida: 10 }
                },
                conseguir_componentes: {
                    descripcion: 'Consigue 3 componentes electrónicos',
                    objetivo: 'recolectar',
                    item: 'materiales',
                    cantidad: 3,
                    recompensa: { xp: 180, reputacion: 18, armas: 2 }
                },
                investigar_radios: {
                    descripcion: 'Investiga transmisiones extrañas en el hospital',
                    objetivo: 'explorar',
                    target: 'hospital',
                    recompensa: { xp: 220, reputacion: 25, medicinas: 8 }
                },
                espiar_comerciante: {
                    descripcion: 'Espía a Jorge el Comerciante durante 30 segundos',
                    objetivo: 'seguir_npc',
                    target: 'jorge',
                    duracion: 30,
                    recompensa: { xp: 250, reputacion: 30, comida: 20 }
                },
                revelar_secretos: {
                    descripcion: 'Descubre los secretos del Comandante Steel',
                    objetivo: 'seguir_npc',
                    target: 'comandante_steel',
                    duracion: 40,
                    recompensa: { xp: 300, reputacion: 35, armas: 5 }
                },
                seguir_npc: {
                    descripcion: 'Sigue discretamente a un NPC aleatorio',
                    objetivo: 'seguir_npc',
                    target: Object.keys(WORLD.npcs)[Math.floor(Math.random() * Object.keys(WORLD.npcs).length)],
                    duracion: 35,
                    recompensa: { xp: 200, reputacion: 20, materiales: 10 }
                }
            };

            const mission = missionConfig[missionType];
            if (!mission) {
                ws.send(JSON.stringify({ type: 'error', error: 'Tipo de misión no reconocido' }));
                return;
            }

            // Crear misión activa
            player.activeMission = {
                id: `mission_${Date.now()}`,
                npcId: npc.id,
                tipo: missionType,
                ...mission,
                inicioTimestamp: Date.now(),
                progreso: 0
            };

            ws.send(JSON.stringify({
                type: 'npc:mission_accepted',
                mission: player.activeMission,
                message: `Misión aceptada: ${mission.descripcion}`
            }));

            broadcast({
                type: 'narrative',
                text: `${player.nombre} ha aceptado una misión de ${npc.nombre}: ${mission.descripcion}`,
                category: 'mision'
            });

            return;
        }

        // COMPLETAR MISIÓN DE NPC
        if (msg.type === 'npc:complete_mission') {
            if (!player.activeMission) {
                ws.send(JSON.stringify({ type: 'error', error: 'No tienes ninguna misión activa' }));
                return;
            }

            const mission = player.activeMission;
            const npc = WORLD.npcs[mission.npcId];

            // Verificar si la misión está completa según tipo
            let completa = false;
            let mensajeError = '';

            if (mission.objetivo === 'espiar' || mission.objetivo === 'seguir_npc') {
                const tiempoTranscurrido = (Date.now() - mission.inicioTimestamp) / 1000;
                if (tiempoTranscurrido >= mission.duracion) {
                    completa = true;
                } else {
                    mensajeError = `Debes permanecer ${mission.duracion - Math.floor(tiempoTranscurrido)} segundos más`;
                }
            } else if (mission.objetivo === 'informar') {
                completa = true; // Auto completa al reportar
            } else if (mission.objetivo === 'recolectar') {
                if (player.inventario[mission.item] >= mission.cantidad) {
                    player.inventario[mission.item] -= mission.cantidad;
                    completa = true;
                } else {
                    mensajeError = `Te faltan ${mission.cantidad - (player.inventario[mission.item] || 0)} ${mission.item}`;
                }
            } else if (mission.objetivo === 'explorar') {
                if (player.locacion === mission.target) {
                    completa = true;
                } else {
                    mensajeError = `Debes ir a: ${WORLD.locations[mission.target]?.nombre || mission.target}`;
                }
            }

            if (!completa) {
                ws.send(JSON.stringify({ type: 'error', error: mensajeError }));
                return;
            }

            // Dar recompensas
            if (mission.recompensa.xp) {
                player.xp += mission.recompensa.xp;
                updatePlayerStats(player, 'xp_ganado', mission.recompensa.xp);
                checkLevelUp(player, ws);
            }

            if (mission.recompensa.reputacion && npc) {
                const newRep = changeReputation(playerId, npc.id, mission.recompensa.reputacion);
                ws.send(JSON.stringify({
                    type: 'reputation:updated',
                    npcId: npc.id,
                    reputation: newRep,
                    level: getReputationLevel(newRep)
                }));
            }

            Object.keys(mission.recompensa).forEach(key => {
                if (key !== 'xp' && key !== 'reputacion' && player.inventario.hasOwnProperty(key)) {
                    player.inventario[key] += mission.recompensa[key];
                }
            });

            delete player.activeMission;

            ws.send(JSON.stringify({
                type: 'npc:mission_completed',
                message: `¡Misión completada! ${npc?.nombre || 'El NPC'} está satisfecho.`,
                recompensas: mission.recompensa
            }));

            broadcast({
                type: 'narrative',
                text: `${player.nombre} ha completado la misión de ${npc?.nombre || 'un NPC'} con éxito.`,
                category: 'mision'
            });

            broadcast({
                type: 'world:state',
                world: WORLD
            });

            return;
        }

        // DAR RECURSO A NPC
        if (msg.type === 'npc:give_resource') {
            const npc = WORLD.npcs[msg.npcId];
            const resource = msg.resource; // 'comida', 'medicinas', 'materiales', 'armas'
            const cantidad = msg.cantidad || 1;

            if (!npc || !npc.vivo) {
                ws.send(JSON.stringify({ type: 'error', error: 'NPC no disponible' }));
                return;
            }

            if (!player.inventario[resource] || player.inventario[resource] < cantidad) {
                ws.send(JSON.stringify({ type: 'error', error: `No tienes suficiente ${resource}` }));
                return;
            }

            player.inventario[resource] -= cantidad;

            // Calcular mejora de reputación basada en el recurso
            const reputationGain = {
                comida: 5,
                medicinas: 10,
                materiales: 3,
                armas: 15
            };

            const repGain = (reputationGain[resource] || 5) * cantidad;
            const newRep = changeReputation(playerId, npc.id, repGain);

            // Mejorar stats del NPC
            if (resource === 'comida') {
                npc.hambre = Math.min(100, npc.hambre + (15 * cantidad));
                npc.moral = Math.min(100, npc.moral + (5 * cantidad));
            } else if (resource === 'medicinas') {
                npc.salud = Math.min(100, npc.salud + (30 * cantidad));
                npc.moral = Math.min(100, npc.moral + (10 * cantidad));
            } else if (resource === 'materiales' || resource === 'armas') {
                npc.moral = Math.min(100, npc.moral + (8 * cantidad));
            }

            ws.send(JSON.stringify({
                type: 'npc:resource_given',
                npcId: npc.id,
                resource,
                cantidad,
                message: `Le diste ${cantidad} ${resource} a ${npc.nombre}. ¡Reputación +${repGain}!`,
                reputation: newRep,
                level: getReputationLevel(newRep)
            }));

            broadcast({
                type: 'narrative',
                text: `${player.nombre} le dio ${cantidad} ${resource} a ${npc.nombre}.`,
                category: 'comercio'
            });

            broadcast({
                type: 'world:state',
                world: WORLD
            });

            updatePlayerStats(player, 'items_dados', cantidad);

            return;
        }

        // CREAR GRUPO
        if (msg.type === 'group:create') {
            const groupName = msg.groupName.trim();
            const password = msg.password || null;

            if (!groupName || groupName.length < 3) {
                ws.send(JSON.stringify({ type: 'error', error: 'El nombre debe tener al menos 3 caracteres' }));
                return;
            }

            if (player.grupoId) {
                ws.send(JSON.stringify({ type: 'error', error: 'Ya perteneces a un grupo' }));
                return;
            }

            const groupId = `group_${Date.now()}`;
            WORLD.groups[groupId] = {
                id: groupId,
                nombre: groupName,
                lider: playerId,
                miembros: [playerId],
                password: password,
                creado: Date.now(),
                chat: []
            };

            player.grupoId = groupId;

            ws.send(JSON.stringify({
                type: 'group:created',
                group: WORLD.groups[groupId],
                message: `Grupo "${groupName}" creado con éxito`
            }));

            broadcast({
                type: 'narrative',
                text: `${player.nombre} ha creado el grupo "${groupName}"`,
                category: 'grupo'
            });

            return;
        }

        // UNIRSE A GRUPO
        if (msg.type === 'group:join') {
            const groupId = msg.groupId;
            const password = msg.password || null;
            const group = WORLD.groups[groupId];

            if (!group) {
                ws.send(JSON.stringify({ type: 'error', error: 'Grupo no encontrado' }));
                return;
            }

            if (player.grupoId) {
                ws.send(JSON.stringify({ type: 'error', error: 'Ya perteneces a un grupo' }));
                return;
            }

            if (group.password && group.password !== password) {
                ws.send(JSON.stringify({ type: 'error', error: 'Contraseña incorrecta' }));
                return;
            }

            group.miembros.push(playerId);
            player.grupoId = groupId;

            // Notificar a todos los miembros del grupo
            group.miembros.forEach(memberId => {
                const memberWs = Array.from(connections.keys()).find(ws => connections.get(ws) === memberId);
                if (memberWs && memberWs.readyState === 1) {
                    memberWs.send(JSON.stringify({
                        type: 'group:member_joined',
                        group: group,
                        newMember: player.nombre,
                        message: `${player.nombre} se unió al grupo`
                    }));
                }
            });

            ws.send(JSON.stringify({
                type: 'group:joined',
                group: group,
                message: `Te uniste al grupo "${group.nombre}"`
            }));

            return;
        }

        // SALIR DE GRUPO
        if (msg.type === 'group:leave') {
            if (!player.grupoId) {
                ws.send(JSON.stringify({ type: 'error', error: 'No perteneces a ningún grupo' }));
                return;
            }

            const group = WORLD.groups[player.grupoId];
            if (!group) {
                delete player.grupoId;
                return;
            }

            group.miembros = group.miembros.filter(id => id !== playerId);

            // Si era el líder y quedan miembros, pasar liderazgo
            if (group.lider === playerId && group.miembros.length > 0) {
                group.lider = group.miembros[0];
            }

            // Si no quedan miembros, eliminar grupo
            if (group.miembros.length === 0) {
                delete WORLD.groups[player.grupoId];
            } else {
                // Notificar a los miembros restantes
                group.miembros.forEach(memberId => {
                    const memberWs = Array.from(connections.keys()).find(ws => connections.get(ws) === memberId);
                    if (memberWs && memberWs.readyState === 1) {
                        memberWs.send(JSON.stringify({
                            type: 'group:member_left',
                            group: group,
                            leftMember: player.nombre,
                            message: `${player.nombre} abandonó el grupo`
                        }));
                    }
                });
            }

            delete player.grupoId;

            ws.send(JSON.stringify({
                type: 'group:left',
                message: `Abandonaste el grupo "${group.nombre}"`
            }));

            return;
        }

        // CHAT DE GRUPO
        if (msg.type === 'group:chat') {
            if (!player.grupoId) {
                ws.send(JSON.stringify({ type: 'error', error: 'No perteneces a ningún grupo' }));
                return;
            }

            const group = WORLD.groups[player.grupoId];
            if (!group) {
                delete player.grupoId;
                return;
            }

            const chatMessage = {
                jugador: player.nombre,
                mensaje: msg.mensaje.trim(),
                timestamp: Date.now()
            };

            group.chat.push(chatMessage);

            // Limitar historial de chat
            if (group.chat.length > 50) {
                group.chat = group.chat.slice(-50);
            }

            // Enviar mensaje a todos los miembros del grupo
            group.miembros.forEach(memberId => {
                const memberWs = Array.from(connections.keys()).find(ws => connections.get(ws) === memberId);
                if (memberWs && memberWs.readyState === 1) {
                    memberWs.send(JSON.stringify({
                        type: 'group:chat_message',
                        message: chatMessage
                    }));
                }
            });

            return;
        }

        // LISTAR GRUPOS DISPONIBLES
        if (msg.type === 'group:list') {
            const groupsList = Object.values(WORLD.groups).map(g => ({
                id: g.id,
                nombre: g.nombre,
                lider: WORLD.players[g.lider]?.nombre || 'Desconocido',
                miembros: g.miembros.length,
                tienePassword: !!g.password
            }));

            ws.send(JSON.stringify({
                type: 'group:list_response',
                groups: groupsList
            }));

            return;
        }
    });

    ws.on('close', () => {
        if (playerId) {
            const player = WORLD.players[playerId];

            // Guardar progreso en DB si tiene dbId
            if (player && player.dbId) {
                survivalDB.guardarProgreso(player.dbId, {
                    nivel: player.nivel,
                    xp: player.xp,
                    xp_siguiente_nivel: player.xpParaSiguienteNivel,
                    salud: player.salud,
                    hambre: player.hambre,
                    locacion: player.locacion,
                    inventario: player.inventario,
                    skills: player.skills
                });
                console.log(`💾 Progreso guardado para ${player.nombre}`);
            }

            connections.delete(playerId);
            delete WORLD.players[playerId];
            broadcast({ type: 'player:left', playerId });

            // Enviar lista actualizada de jugadores a todos
            const connectedPlayers = Array.from(connections.keys())
                .filter(pid => WORLD.players[pid])
                .map(pid => ({
                    id: pid,
                    nombre: WORLD.players[pid].nombre,
                    locacion: WORLD.players[pid].locacion,
                    nivel: WORLD.players[pid].nivel,
                    stats: WORLD.players[pid].stats || {}
                }));

            broadcast({
                type: 'players:list',
                players: connectedPlayers
            });

            console.log(`👋 ${playerId} desconectado`);
        }
    });
});

// ====================================
// AUTO-GUARDADO PERIÓDICO
// ====================================
setInterval(() => {
    let savedCount = 0;

    Object.values(WORLD.players).forEach(player => {
        if (player && player.dbId && connections.has(player.id)) {
            survivalDB.guardarProgreso(player.dbId, {
                nivel: player.nivel,
                xp: player.xp,
                xp_siguiente_nivel: player.xpParaSiguienteNivel,
                salud: player.salud,
                hambre: player.hambre,
                locacion: player.locacion,
                inventario: player.inventario,
                skills: player.skills
            });
            savedCount++;
        }
    });

    if (savedCount > 0) {
        console.log(`💾 Auto-guardado completado: ${savedCount} jugador(es)`);
    }
}, 60000); // Cada 60 segundos

// ====================================
// RESPAWN DE ZOMBIES
// ====================================
setInterval(() => {
    const now = Date.now();
    let respawnedLocations = 0;

    Object.values(WORLD.locations).forEach(loc => {
        // Verificar si es hora de respawnear zombies
        if (loc.zombies === 0 && loc.zombiesRespawnTime && now >= loc.zombiesRespawnTime) {
            loc.zombies = loc.zombiesInitial;
            loc.zombiesRespawnTime = null;
            respawnedLocations++;
            console.log(`🧟 Zombies respawneados en ${loc.nombre}: ${loc.zombies} zombies`);

            // Notificar a jugadores en esa ubicación
            broadcast({
                type: 'world:update',
                message: `⚠️ Se escuchan gruñidos en ${loc.nombre}... Los infectados han regresado.`
            });
        }
    });

    if (respawnedLocations > 0) {
        console.log(`🧟 ${respawnedLocations} ubicación(es) con zombies respawneados`);
    }
}, 30000); // Cada 30 segundos verificar

// ====================================
// INICIALIZAR SISTEMA DE MUNDO VIVO
// ====================================

// Inicializar base de datos principal (con NPCs y relaciones)
(async function initializeDB() {
    try {
        await initializeMainDB();
        console.log('✅ Base de datos inicializada');
    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
    }
})();

// Iniciar simulación del mundo (async para usar dynamic import)
(async function initializeWorldSimulation() {
    try {
        const worldSimulation = await import('./world/simulation.js');
        const narrativeEngine = await import('./world/narrativeEngine.js');
        const npcRelationships = await import('./world/npcRelations.js');

        // Inicializar tablas de mundo vivo
        npcRelationships.default.initializeSchema();

        // Iniciar simulación
        worldSimulation.default.start();

        console.log('🌍 Sistema de Mundo Vivo INICIADO');
        console.log('📖 Motor de narrativa emergente activo');
        console.log('💕 Sistema de relaciones entre NPCs activo');
    } catch (error) {
        console.error('❌ Error inicializando Mundo Vivo:', error);
    }
})();

// ====================================
// INICIAR
// ====================================

server.listen(PORT, () => {
    console.log(`
🧟 SURVIVAL ZOMBIE MVP - MUNDO VIVO
═══════════════════════════════════
🌐 http://localhost:${PORT}
🔌 WebSocket activo
⏰ Simulación cada 30 segundos
🎬 Narrativa emergente activa
💕 Relaciones NPCs activas
═══════════════════════════════════
`);
    console.log('📍 Locaciones:', Object.keys(WORLD.locations).length);
    console.log('👥 NPCs:', Object.keys(WORLD.npcs).length);
    console.log('\n✨ Servidor listo. ¡Sobrevive y observa el mundo vivir!\n');
});
