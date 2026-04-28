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

// === Per-tab session + per-user namespacing ================================
// Two browser tabs in the same window can hold DIFFERENT users at the same
// time. The active username is stored per-tab in sessionStorage (which
// survives F5 inside the tab but doesn't bleed across tabs); a copy in
// localStorage acts as the "last-seen" fallback for fresh tabs that have
// no sessionStorage of their own. Per-user data (coins, gems, levels,
// deck, sp, claimed, trophies, admin_hacks, tutorial state) lives under
// `brawlclash_user_<username>_<suffix>` so two users don't clobber each
// other's progress in shared localStorage. A one-time migration copies
// the legacy global keys into the per-user namespace on first load.
function _activeUsername() {
    try {
        const s = sessionStorage.getItem('brawlclash_username');
        if (s) return s;
    } catch (e) {}
    try { return localStorage.getItem('brawlclash_username') || null; }
    catch (e) { return null; }
}
function _setActiveUsername(name) {
    try {
        if (name) {
            sessionStorage.setItem('brawlclash_username', name);
            localStorage.setItem('brawlclash_username', name);
        } else {
            sessionStorage.removeItem('brawlclash_username');
            localStorage.removeItem('brawlclash_username');
        }
    } catch (e) {}
}
function _clearActiveUsername() {
    try { sessionStorage.removeItem('brawlclash_username'); } catch (e) {}
    try { localStorage.removeItem('brawlclash_username'); } catch (e) {}
}
// Returns the per-user-namespaced storage key. When no user is active yet
// (first paint before signup), falls back to the legacy global key so the
// old defaults / migrations still work.
function _userKey(suffix) {
    const u = _activeUsername();
    if (!u) return 'brawlclash_' + suffix;
    return 'brawlclash_user_' + u + '_' + suffix;
}
// One-shot copy of legacy global keys into this user's namespace.
//
// Idempotent in two layers:
//   • Per-user `_migrated` flag — each user is migrated at most once.
//   • Global `legacy_consumed` flag — the legacy global keys are inherited
//     by AT MOST ONE user (the first one to log in after the upgrade).
//     Subsequent new users in the same browser start fresh instead of
//     inheriting the previous single-user save.
//
// We don't delete the legacy keys — leaving them lets a user roll back to an
// older build without losing their progress.
function _migrateLegacyKeysToUser(name) {
    if (!name) return;
    const userFlagKey = 'brawlclash_user_' + name + '_migrated';
    try { if (localStorage.getItem(userFlagKey)) return; } catch (e) { return; }

    let legacyConsumed = false;
    try { legacyConsumed = !!localStorage.getItem('brawlclash_legacy_consumed'); } catch (e) {}

    if (!legacyConsumed) {
        const userSuffixes = [
            'coins', 'gems', 'trophies', 'deck', 'favorite', 'sp', 'claimed',
            'admin_hacks', 'admin_applied',
            'tutorial_done', 'tutorial_snapshot'
        ];
        userSuffixes.forEach(k => {
            const oldKey = 'brawlclash_' + k;
            const newKey = 'brawlclash_user_' + name + '_' + k;
            try {
                const v = localStorage.getItem(oldKey);
                if (v !== null && localStorage.getItem(newKey) === null) {
                    localStorage.setItem(newKey, v);
                }
            } catch (e) {}
        });
        if (typeof CARDS === 'object' && CARDS) {
            Object.keys(CARDS).forEach(id => {
                const oldKey = 'brawlclash_level_' + id;
                const newKey = 'brawlclash_user_' + name + '_level_' + id;
                try {
                    const v = localStorage.getItem(oldKey);
                    if (v !== null && localStorage.getItem(newKey) === null) {
                        localStorage.setItem(newKey, v);
                    }
                } catch (e) {}
            });
        }
        try { localStorage.setItem('brawlclash_legacy_consumed', '1'); } catch (e) {}
    }
    try { localStorage.setItem(userFlagKey, '1'); } catch (e) {}
}
window._activeUsername       = _activeUsername;
window._setActiveUsername    = _setActiveUsername;
window._clearActiveUsername  = _clearActiveUsername;
window._userKey              = _userKey;
window._migrateLegacyKeysToUser = _migrateLegacyKeysToUser;

// Run migration ONCE for whoever is the active user at script-eval time, so
// the playerStats / playerTrophies / playerDeck / etc. reads below hit the
// per-user namespace. New users (no active username yet) skip the migration
// — they'll trigger it from claimUsername after picking a name.
_migrateLegacyKeysToUser(_activeUsername());

let currentState = GAME_STATE.MENU;
let lastTime = 0;
let difficulty = 'hard';
let isSelectingBullDash = false;
// Bonnie transform mode — toggled by the 🪄 button while at least one
// player-team Bonnie is alive on the field. While true the next canvas
// click on a Bonnie converts her into a "transformed" Bruce that skips
// the safe in target-selection.
let isSelectingBonnieTransform = false;
// Admin "delete next click" mode — toggled by the admin-delete button, consumed
// by the next canvas click that lands on an enemy unit.
var isSelectingDeleteTarget = false;
// Path-selection mode — toggled by the 🎯 button while ANY walking unit
// card is held (bruce / leon / bull / amber — buildings + auras can't move
// so the button doesn't show). While true, every canvas click APPENDS to
// `_amberPendingPath` instead of placing a unit. A second click on 🎯
// commits whatever waypoints exist; the unit spawns at waypoints[0] and
// walks through the rest. Amber additionally caps at 6 waypoints / 5
// squares per step (her balance constraints) — every other walking unit
// is uncapped per user request.
//
// Names kept as `isSelectingAmberPath` / `_amberPendingPath` for backwards
// compat with the existing renderer / tutorial — `_pendingPathCardId`
// records which card the path is actually for.
var isSelectingAmberPath = false;
var _amberPendingPath = [];
var _pendingPathCardId = null;

// Used by every enemy target-selection filter (Bull / Porter chase, building
// turrets, the Safe, projectile re-targeting, splash) to skip Amber and her
// fire-trail tiles. Amber is invulnerable AND her trail is invisible to the
// enemy side, so making them untargetable matches the player's expectation
// that nothing the opponent owns should be wasted attacking them.
function isAmberOrTrail(e) {
    // Despite the legacy name, this is the generic "do not target" check.
    // Currently excludes:
    //   • Amber + her fire-trail tiles
    //   • Bubble (chewing-gum projectile, untargetable per spec)
    //   • Trunk + his trunk-trail tiles (invulnerable + invisible HP)
    //   • Tara + Spike auras (per user request — enemy units / turrets
    //     shouldn't see them and shouldn't waste shots on the AOE
    //     circles. Their effects on enemies still apply via the per-frame
    //     aura iteration in unit-logic.js, which is independent of
    //     target-selection.)
    return !!(e && (e.type === 'amber' || e.type === 'fire-trail' ||
                    e.type === 'bubble' ||
                    e.type === 'trunk' || e.type === 'trunk-trail' ||
                    e.type === 'tara'  || e.type === 'spike'));
}
window.isAmberOrTrail = isAmberOrTrail;

// Bubble drag-aim state — set on pointerdown when the bubble card is held
// (regular OR freeze), updated on pointermove, consumed on pointerup. The
// drag VECTOR (current - anchor) becomes the bubble's launch direction.
// `_bubbleDraggingFreeze` records whether THIS drag started in freeze mode,
// so on release we know whether the spawned bubble should be born frozen
// (waiting for an unfreeze pulse) with its velocity already baked in.
var _bubbleDragging       = false;
var _bubbleDraggingFreeze = false;
var _bubbleAnchor         = { x: 0, y: 0 };
var _bubbleCurrent        = { x: 0, y: 0 };
let selectedFreezeCardId = null;
let selectedCardId = null;
let playerTrophies = parseInt(localStorage.getItem(_userKey('trophies'))) || 0;
let spEntrySource = 'battle'; // 'lobby' or 'battle'
let mouseX = 0, mouseY = 0;

let playerDeck = [];
try {
    const savedDeck = localStorage.getItem(_userKey('deck'));
    if (savedDeck) {
        playerDeck = JSON.parse(savedDeck);
    } else {
        // Brand-new player: deck starts with whatever cards are unlocked
        // by default — currently just the 'נדיר' rarity tier (3 cards).
        playerDeck = Object.keys(CARDS).filter(id => CARDS[id] && CARDS[id].rarity === 'נדיר').slice(0, 8);
    }
} catch(e) {
    playerDeck = Object.keys(CARDS).filter(id => CARDS[id] && CARDS[id].rarity === 'נדיר').slice(0, 8);
}
let tempDeck = [];
let favoriteBrawler = localStorage.getItem(_userKey('favorite')) || null;
let isStarringMode = false;
let playerStarPowers = {};
try {
    const savedSP = localStorage.getItem(_userKey('sp'));
    if (savedSP) playerStarPowers = JSON.parse(savedSP);
} catch(e) { playerStarPowers = {}; }

// --- Player Stats & Levels ---
let playerStats = {
    // Defaults are 0 — brand-new users (no localStorage) start with nothing
    // and earn coins/gems through normal play. Existing users keep whatever
    // their saved values are.
    coins: parseInt(localStorage.getItem(_userKey('coins'))) || 0,
    gems: parseInt(localStorage.getItem(_userKey('gems'))) || 0,
    // Credits — new currency introduced alongside the trophy-profile reward
    // cycle (tier-3-of-3 pays 100 credits). Spend rules will be added as
    // the user iterates on the design.
    credits: parseInt(localStorage.getItem(_userKey('credits'))) || 0,
    levels: {},
    claimedTiers: JSON.parse(localStorage.getItem(_userKey('claimed')) || 'null') || [],
    // New: trophy-road tiers (separate from brawl-pass `claimedTiers`).
    // Stored as the integer tier number (1 = first 100 trophies, 2 = 200,
    // etc.). Keeps brawl-pass progression independent of trophy progress.
    claimedTrophyTiers: JSON.parse(localStorage.getItem(_userKey('claimedTrophy')) || 'null') || [],
    // Per-card unlock list. New players start with ONLY the 'נדיר' rarity
    // cards unlocked (bruce, pam, scrappy); higher tiers ship locked
    // until the player unlocks them through some future progression flow.
    // localStorage key 'unlocked' holds the array; missing → first-time
    // init via the IIFE that filters CARDS by rarity at load time.
    unlockedCards: JSON.parse(localStorage.getItem(_userKey('unlocked')) || 'null') ||
        (typeof CARDS !== 'undefined'
            ? Object.keys(CARDS).filter(id => CARDS[id] && CARDS[id].rarity === 'נדיר')
            : []),
    username: _activeUsername()
};

// Returns true when the given cardId is currently usable by the local
// player. Always-true for the 'נדיר' rarity (safety net for new cards
// shipped post-init) and any card explicitly in the unlockedCards
// list. Admin used to bypass this check but the user wanted the lock
// to actually be visible while they test, so the bypass was removed.
// Admin can still unlock cards manually via the upgrade flow / future
// dev-tools button if they want full access.
function isCardUnlocked(cardId) {
    if (!cardId) return false;
    const c = (typeof CARDS !== 'undefined') ? CARDS[cardId] : null;
    if (c && c.rarity === 'נדיר') return true;
    const list = (typeof playerStats !== 'undefined' && Array.isArray(playerStats.unlockedCards))
        ? playerStats.unlockedCards : [];
    return list.includes(cardId);
}
window.isCardUnlocked = isCardUnlocked;

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
        const raw = localStorage.getItem(_userKey('admin_hacks'));
        if (!raw) return defaults;
        const parsed = JSON.parse(raw);
        return Object.assign({}, defaults, parsed || {});
    } catch (e) { return defaults; }
})();

function saveAdminHacks() {
    try { localStorage.setItem(_userKey('admin_hacks'), JSON.stringify(adminHacks)); }
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
    let lvl = parseInt(localStorage.getItem(_userKey('level_' + id))) || 1;
    if (lvl > MAX_LEVEL) {
        lvl = MAX_LEVEL;
        localStorage.setItem(_userKey('level_' + id), MAX_LEVEL);
    }
    playerStats.levels[id] = lvl;
});

function saveStats() {
    localStorage.setItem(_userKey('coins'), playerStats.coins);
    localStorage.setItem(_userKey('gems'), playerStats.gems);
    localStorage.setItem(_userKey('credits'), playerStats.credits || 0);
    localStorage.setItem(_userKey('claimed'), JSON.stringify(playerStats.claimedTiers));
    localStorage.setItem(_userKey('claimedTrophy'), JSON.stringify(playerStats.claimedTrophyTiers || []));
    localStorage.setItem(_userKey('unlocked'),      JSON.stringify(playerStats.unlockedCards     || []));
    localStorage.setItem(_userKey('trophies'), playerTrophies);
    // Username stays in BOTH sessionStorage (per-tab active) and localStorage
    // (last-seen fallback for fresh tabs). Use the dedicated setter so both
    // stay in sync.
    if (playerStats.username) _setActiveUsername(playerStats.username);
    Object.keys(playerStats.levels).forEach(id => {
        localStorage.setItem(_userKey('level_' + id), playerStats.levels[id]);
    });
}

// Re-read every per-user piece of state from localStorage using the
// currently-active username's namespace, mutating the existing globals
// IN PLACE so other modules (which closed over `playerStats`, `playerDeck`,
// `adminHacks`, etc. as `let` bindings) see the new values without needing
// to reassign their imports. Called from claimUsername after the active
// username flips so the lobby instantly reflects the new user's stats.
function reloadActiveUserState() {
    try { _migrateLegacyKeysToUser(_activeUsername()); } catch (e) {}

    // Per-user scalars
    playerTrophies = parseInt(localStorage.getItem(_userKey('trophies'))) || 0;
    favoriteBrawler = localStorage.getItem(_userKey('favorite')) || null;

    // Deck (in-place so existing references stay live)
    try {
        const savedDeck = localStorage.getItem(_userKey('deck'));
        playerDeck.length = 0;
        if (savedDeck) {
            const parsed = JSON.parse(savedDeck);
            if (Array.isArray(parsed)) parsed.forEach(c => playerDeck.push(c));
        } else {
            // First-time deck for this user — only 'נדיר' cards are open.
            Object.keys(CARDS)
                .filter(id => CARDS[id] && CARDS[id].rarity === 'נדיר')
                .slice(0, 8)
                .forEach(c => playerDeck.push(c));
        }
    } catch (e) {
        playerDeck.length = 0;
        Object.keys(CARDS)
            .filter(id => CARDS[id] && CARDS[id].rarity === 'נדיר')
            .slice(0, 8)
            .forEach(c => playerDeck.push(c));
    }

    // Star powers
    try {
        playerStarPowers = JSON.parse(localStorage.getItem(_userKey('sp')) || 'null') || {};
    } catch (e) { playerStarPowers = {}; }

    // playerStats (rebuild but keep object identity)
    playerStats.coins        = parseInt(localStorage.getItem(_userKey('coins')))   || 0;
    playerStats.gems         = parseInt(localStorage.getItem(_userKey('gems')))    || 0;
    playerStats.credits      = parseInt(localStorage.getItem(_userKey('credits'))) || 0;
    playerStats.claimedTiers = JSON.parse(localStorage.getItem(_userKey('claimed')) || 'null') || [];
    playerStats.claimedTrophyTiers = JSON.parse(localStorage.getItem(_userKey('claimedTrophy')) || 'null') || [];
    playerStats.unlockedCards = JSON.parse(localStorage.getItem(_userKey('unlocked')) || 'null') ||
        Object.keys(CARDS).filter(id => CARDS[id] && CARDS[id].rarity === 'נדיר');
    playerStats.username     = _activeUsername();
    playerStats.levels       = {};
    Object.keys(CARDS).forEach(id => {
        let lvl = parseInt(localStorage.getItem(_userKey('level_' + id))) || 1;
        if (lvl > MAX_LEVEL) lvl = MAX_LEVEL;
        playerStats.levels[id] = lvl;
    });

    // adminHacks (per-user too — different users have different perks)
    try {
        const raw = localStorage.getItem(_userKey('admin_hacks'));
        if (raw) {
            const parsed = JSON.parse(raw);
            // Reset every field on the existing object then merge in the saved
            // values so consumers that captured `adminHacks` keep working.
            Object.keys(adminHacks).forEach(k => {
                const v = adminHacks[k];
                if (typeof v === 'boolean')      adminHacks[k] = false;
                else if (typeof v === 'number')  adminHacks[k] = 0;
                else if (typeof v === 'string')  adminHacks[k] = '';
            });
            Object.assign(adminHacks, parsed || {});
        } else {
            // No saved hacks for this user → wipe to defaults.
            Object.keys(adminHacks).forEach(k => {
                const v = adminHacks[k];
                if (typeof v === 'boolean')      adminHacks[k] = false;
                else if (typeof v === 'number')  adminHacks[k] = 0;
                else if (typeof v === 'string')  adminHacks[k] = '';
            });
        }
    } catch (e) {}
}
window.reloadActiveUserState = reloadActiveUserState;

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
