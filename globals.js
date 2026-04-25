// globals.js - Global State and Shared Variables

// One-time migration: copy any existing brawlclash_* values from sessionStorage
// into localStorage so users who already played in a tab don't lose progress
// when we switch the persistence backend. sessionStorage gets wiped on tab
// close, which is why coins / gems / admin toggles appeared to "reset" on reload
// in freshly-opened tabs.
try {
    if (!localStorage.getItem('brawlclash_migrated_v1')) {
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith('brawlclash_') && localStorage.getItem(key) === null) {
                localStorage.setItem(key, sessionStorage.getItem(key));
            }
        }
        localStorage.setItem('brawlclash_migrated_v1', '1');
    }
} catch (e) { /* storage disabled — nothing we can do */ }

let currentState = GAME_STATE.MENU;
let lastTime = 0;
let difficulty = 'hard';
let isSelectingBullDash = false;
// Admin "delete next click" mode — toggled by the admin-delete button, consumed
// by the next canvas click that lands on an enemy unit.
var isSelectingDeleteTarget = false;
let selectedFreezeCardId = null;
let selectedCardId = null;
let playerTrophies = parseInt(localStorage.getItem('brawlclash_trophies')) || 0;
let spEntrySource = 'battle'; // 'lobby' or 'battle'
let mouseX = 0, mouseY = 0;

let playerDeck = [];
try {
    const savedDeck = localStorage.getItem('brawlclash_deck');
    if (savedDeck) playerDeck = JSON.parse(savedDeck);
    else playerDeck = Object.keys(CARDS).slice(0, 8); 
} catch(e) { 
    playerDeck = Object.keys(CARDS).slice(0, 8);
}
let tempDeck = [];
let favoriteBrawler = localStorage.getItem('brawlclash_favorite') || null;
let isStarringMode = false;
let playerStarPowers = {};
try {
    const savedSP = localStorage.getItem('brawlclash_sp');
    if (savedSP) playerStarPowers = JSON.parse(savedSP);
} catch(e) { playerStarPowers = {}; }

// --- Player Stats & Levels ---
let playerStats = {
    // Defaults are 0 — brand-new users (no localStorage) start with nothing
    // and earn coins/gems through normal play. Existing users keep whatever
    // their saved values are.
    coins: parseInt(localStorage.getItem('brawlclash_coins')) || 0,
    gems: parseInt(localStorage.getItem('brawlclash_gems')) || 0,
    levels: {},
    claimedTiers: JSON.parse(localStorage.getItem('brawlclash_claimed')) || [],
    username: localStorage.getItem('brawlclash_username') || null
};

// Admin Hacks (Developer Menu)
// NOTE: `var` (not `let`) so it attaches to window — the PeerJS sync code and
// per-entity buff checks need the binding to be reachable from both script scope
// and `window.`-qualified access without the two drifting apart.
var adminHacks = (function loadAdminHacks() {
    const defaults = {
        // Core booleans (from earlier iterations)
        infiniteElixir: false, godMode: false, doubleDamage: false, superSpeed: false,
        // Unit multipliers / toggles
        speedMultiplier: 0, dmgMultiplier: 0, hpMultiplier: 0,
        attackSpeedMultiplier: 0, radiusMultiplier: 0,
        infiniteRange: false, permanentInvisible: false,
        // Elixir
        startingElixir: 0, maxElixir: 0, elixirRateMultiplier: 0,
        freeCards: false, fullRefund: false,
        // Safe (the castle)
        safeHpMultiplier: 0, safeShoots: false, safeHeals: false,
        safeRegen: 0, doubleSafe: false,
        // Bot / enemy
        disableBot: false, botSlowdownFactor: 0, enemyNerfFactor: 0, botOnlyCardId: '',
        // Game-wide
        timeScale: 0, autoIncome: false, allStarPowers: false,
        // Manual "delete an enemy unit" power — a floating button appears
        // above the elixir bar during battle while this flag is on.
        deleteUnit: false,
        // Delegated super-admin rights — a granted user can show the ✨ / 🚫
        // buttons and hand out / revoke admin perks to other usernames.
        canGrantAdmin: false,
        canRevokeAdmin: false,
        // "Cancel admin" — when on, the opponent's admin hacks are neutralised
        // for the duration of a P2P match. We refuse to apply opponent buffs
        // locally AND ask the opponent's client to temporarily wipe its own
        // adminHacks (backed up + restored at match end).
        cancelAdmin: false
    };
    try {
        const raw = localStorage.getItem('brawlclash_admin_hacks');
        if (!raw) return defaults;
        const parsed = JSON.parse(raw);
        return Object.assign({}, defaults, parsed || {});
    } catch (e) { return defaults; }
})();

function saveAdminHacks() {
    try { localStorage.setItem('brawlclash_admin_hacks', JSON.stringify(adminHacks)); }
    catch (e) { /* storage full / disabled */ }
}

// Opponent's admin settings, learned at battle-start via the ADMIN_CONFIG
// handshake. Lets the non-admin client render the admin's units/safe with the
// correct buffs (e.g. godMode on the admin's safe that we see as `enemy`).
var opponentAdminHacks = {
    isAdmin: false,
    infiniteElixir: false,
    godMode: false,
    doubleDamage: false,
    superSpeed: false
};

// Initialize levels & clamp to max
Object.keys(CARDS).forEach(id => {
    let lvl = parseInt(localStorage.getItem(`brawlclash_level_${id}`)) || 1;
    if (lvl > MAX_LEVEL) {
        lvl = MAX_LEVEL;
        localStorage.setItem(`brawlclash_level_${id}`, MAX_LEVEL);
    }
    playerStats.levels[id] = lvl;
});

function saveStats() {
    localStorage.setItem('brawlclash_coins', playerStats.coins);
    localStorage.setItem('brawlclash_gems', playerStats.gems);
    localStorage.setItem('brawlclash_claimed', JSON.stringify(playerStats.claimedTiers));
    localStorage.setItem('brawlclash_trophies', playerTrophies);
    if (playerStats.username) localStorage.setItem('brawlclash_username', playerStats.username);
    Object.keys(playerStats.levels).forEach(id => {
        localStorage.setItem(`brawlclash_level_${id}`, playerStats.levels[id]);
    });
}

function getLevelScale(id) {
    const level = playerStats.levels[id] || 1;
    return 1 + (level - 1) * 0.05;
}

// `hasStarPower(type, sp)` centralises every `playerStarPowers[type] === spN`
// check so the admin `allStarPowers` toggle can force every player-team brawler
// to behave as if BOTH star powers (SP1 AND SP2) are active simultaneously.
// Call sites should still guard on `team === 'player'` when that distinction
// matters; this helper only answers "does my local player count as having
// star power X for brawler Y right now?".
function hasStarPower(type, sp) {
    if (typeof adminHacks !== 'undefined' && adminHacks.allStarPowers) return true;
    return (typeof playerStarPowers !== 'undefined' && playerStarPowers[type] === sp);
}
window.hasStarPower = hasStarPower;

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
