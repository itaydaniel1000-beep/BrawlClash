// globals.js - Global State and Shared Variables

let currentState = GAME_STATE.MENU;
let lastTime = 0;
let difficulty = 'hard';
let isSelectingBullDash = false;
let selectedFreezeCardId = null;
let selectedCardId = null;
let playerTrophies = parseInt(sessionStorage.getItem('brawlclash_trophies')) || 0;
let spEntrySource = 'battle'; // 'lobby' or 'battle'
let mouseX = 0, mouseY = 0;

let playerDeck = [];
try {
    const savedDeck = sessionStorage.getItem('brawlclash_deck');
    if (savedDeck) playerDeck = JSON.parse(savedDeck);
    else playerDeck = Object.keys(CARDS).slice(0, 8); 
} catch(e) { 
    playerDeck = Object.keys(CARDS).slice(0, 8);
}
let tempDeck = [];
let favoriteBrawler = sessionStorage.getItem('brawlclash_favorite') || null;
let isStarringMode = false;
let playerStarPowers = {};
try {
    const savedSP = sessionStorage.getItem('brawlclash_sp');
    if (savedSP) playerStarPowers = JSON.parse(savedSP);
} catch(e) { playerStarPowers = {}; }

// --- Player Stats & Levels ---
let playerStats = {
    coins: parseInt(sessionStorage.getItem('brawlclash_coins')) || 1000,
    gems: parseInt(sessionStorage.getItem('brawlclash_gems')) || 100,
    levels: {},
    claimedTiers: JSON.parse(sessionStorage.getItem('brawlclash_claimed')) || [],
    username: sessionStorage.getItem('brawlclash_username') || null
};

// Admin Hacks (Developer Menu)
let adminHacks = {
    infiniteElixir: false,
    godMode: false,
    doubleDamage: false,
    superSpeed: false
};

// Initialize levels & clamp to max
Object.keys(CARDS).forEach(id => {
    let lvl = parseInt(sessionStorage.getItem(`brawlclash_level_${id}`)) || 1;
    if (lvl > MAX_LEVEL) {
        lvl = MAX_LEVEL;
        sessionStorage.setItem(`brawlclash_level_${id}`, MAX_LEVEL);
    }
    playerStats.levels[id] = lvl;
});

function saveStats() {
    sessionStorage.setItem('brawlclash_coins', playerStats.coins);
    sessionStorage.setItem('brawlclash_gems', playerStats.gems);
    sessionStorage.setItem('brawlclash_claimed', JSON.stringify(playerStats.claimedTiers));
    sessionStorage.setItem('brawlclash_trophies', playerTrophies);
    if (playerStats.username) sessionStorage.setItem('brawlclash_username', playerStats.username);
    Object.keys(playerStats.levels).forEach(id => {
        sessionStorage.setItem(`brawlclash_level_${id}`, playerStats.levels[id]);
    });
}

function getLevelScale(id) {
    const level = playerStats.levels[id] || 1;
    return 1 + (level - 1) * 0.05;
}

// --- Entities State ---
let units = [];
let projectiles = [];
let auras = [];
let buildings = [];
let floatingTexts = [];
let particles = [];
let aiDeaths = [];
let pendingRebuilds = [];

let screenShakeTime = 0;
let screenShakeIntensity = 0;

let playerElixir = 5;
let enemyElixir = 5;
let playerMaxElixir = 10;
let playerKills = 0;

let playerSafe = null;
let enemySafe = null;

// AI state
let hardAIState = 0;
let aiDelayTimer = 0;
let hardAIAttackY = 250;
let hardAIEmzPlaced = false;
let aiWavePreparation = false;
let aiWaveStartTime = 0;
let aiWaveUnitsSpawned = 0;
let lastAIActionTime = 0;

// DOM references (initialized in engine.js)
let canvas = null;
let ctx = null;
let charCardsContainer, charCountDisplay, elixirFill, elixirText, countEl;
let deckContainer;

// PeerJS / Network
// NOTE: these MUST be `var` (not `let`) so they attach to `window`. Other modules
// assign via `window.currentBattleRoom = ...` and read via the bare name — with `let`
// those are two separate bindings and multiplayer silently falls back to the local AI.
var isNetworkInitialized = false;
var currentBattleRoom = null;
var isHost = false;

// Engine / UI state
let gameLoopRunning = false;
let currentlyUpgradingId = null;
