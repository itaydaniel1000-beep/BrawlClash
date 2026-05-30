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

// === Persistent-storage permission (mobile robustness) =====================
// Mobile browsers (iOS Safari, Chrome on low-storage devices) are AGGRESSIVE
// about evicting localStorage data — a user can return after a few days and
// find their coins / gems / unlocks gone. The Storage API's persist() lets
// us ask the browser to mark our origin as "do not evict"; on supported
// browsers (Chrome, Edge, Firefox, recent iOS Safari) this dramatically
// lowers the chance of data loss. Some browsers require an installed PWA
// or a user gesture before granting; we just request and proceed regardless.
(function _requestPersistentStorage() {
    try {
        if (navigator.storage && typeof navigator.storage.persist === 'function') {
            navigator.storage.persist().then(granted => {
                console.log('💾 navigator.storage.persist() →', granted ? 'GRANTED' : 'denied (browser may evict under storage pressure)');
            }).catch(() => {});
        }
    } catch (e) { /* feature not available — silently skip */ }
})();

// === Safer localStorage writes ==============================================
// localStorage.setItem can throw (QuotaExceededError on a full disk, or just
// generally on iOS in private mode). The original saveStats() called
// setItem inline a dozen times — if any single call threw, every subsequent
// field on that save tick was silently lost. _safeSet wraps each write in
// its own try/catch so a single failure doesn't take down the whole save,
// and logs once per session so we notice in the field.
let _safeSetWarned = false;
function _safeSet(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        if (!_safeSetWarned) {
            _safeSetWarned = true;
            console.warn('💾 localStorage write failed for "' + key + '" — ' + (e && e.name || 'unknown error') + '. Future writes will keep trying.');
        }
        return false;
    }
}
window._safeSet = _safeSet;

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
// Barry's ice-cream placement mode — toggled by the 🍦 side button when a
// Barry has a ready charge. While true the next canvas click anywhere on
// the map spawns an 'icecream' aura on the player team, consuming one
// charge from the first Barry that has one.
let isSelectingIcecream = false;

// Gigi's one-shot teleport mode — toggled by the 🩰✨ side button when at
// least one alive player-team Gigi hasn't used her teleport yet. While
// true, every eligible Gigi gets a dashed range circle drawn around her,
// and the next canvas click inside one of those circles moves THAT Gigi
// to the click point. Each Gigi can only teleport once (per-instance
// _gigiTeleported flag).
let isSelectingGigiTeleport = false;

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

// Cards available to brand-new players on their very first run. The base
// rule is "any 'נדיר' (rare) rarity card", and `_ALWAYS_UNLOCKED_IDS` adds
// explicit IDs on top of that (currently: bull). Single source of truth so
// the initial unlockedCards array, the runtime isCardUnlocked() check, and
// the admin "unlock everything" path all stay in sync.
const _ALWAYS_UNLOCKED_IDS = ['bull', 'raps', 'frank'];
function _isStarterCard(card, id) {
    if (!card) return false;
    if (card.rarity === 'נדיר') return true;
    if (_ALWAYS_UNLOCKED_IDS.indexOf(id) !== -1) return true;
    return false;
}

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
    // Power Points (💪) — currency awarded primarily by the Brawl Pass.
    // Spend rules are TBD (planned: card power-up mechanic) — for now it
    // just accumulates.
    pp: parseInt(localStorage.getItem(_userKey('pp'))) || 0,
    // Pass Tokens (🎫) — earned ONLY from daily quests (500 per quest).
    // Used as the Brawl Pass progression currency: 900 tokens = 1 BP tier
    // (replaces the previous trophy-based progression). Persists per user
    // like every other currency.
    tokens: parseInt(localStorage.getItem(_userKey('tokens'))) || 0,
    // Premium Brawl Pass ownership. Bought with real money (or granted by
    // an admin); unlocks the second reward column on every BP tier.
    hasBrawlPass: localStorage.getItem(_userKey('hasBrawlPass')) === '1',
    // "Remove ads forever" purchase. When true, the post-match interstitial
    // ad is suppressed. Set by ui-shop-premium after a successful purchase
    // or by an admin grant. Cannot be turned off once on (no UX for it).
    adFree: localStorage.getItem(_userKey('adFree')) === '1',
    // Daily quests — 3 random missions drawn from QUEST_POOL (ui-quests.js).
    // Refreshed once per calendar day via refreshDailyQuestsIfNeeded().
    dailyQuests: JSON.parse(localStorage.getItem(_userKey('dailyQuests')) || 'null') || [],
    questsLastRefresh: localStorage.getItem(_userKey('questsLastRefresh')) || '',
    levels: {},
    // Free-track BP claims (this is the historical `claimedTiers` array —
    // kept under the same key for backward compat).
    claimedTiers: JSON.parse(localStorage.getItem(_userKey('claimed')) || 'null') || [],
    // Premium-track BP claims — separate so the player can claim free and
    // premium independently on the same tier.
    claimedPremiumTiers: JSON.parse(localStorage.getItem(_userKey('claimedPremium')) || 'null') || [],
    // New: trophy-road tiers (separate from brawl-pass `claimedTiers`).
    // Stored as the integer tier number (1 = first 100 trophies, 2 = 200,
    // etc.). Keeps brawl-pass progression independent of trophy progress.
    claimedTrophyTiers: JSON.parse(localStorage.getItem(_userKey('claimedTrophy')) || 'null') || [],
    // Per-card unlock list. New players start with every 'נדיר' (rare)
    // card AND the IDs in _ALWAYS_UNLOCKED_IDS (currently: bull). Higher
    // tiers ship locked until the player unlocks them through the
    // characters store. localStorage key 'unlocked' holds the array;
    // missing → first-time init via the IIFE below.
    unlockedCards: JSON.parse(localStorage.getItem(_userKey('unlocked')) || 'null') ||
        (typeof CARDS !== 'undefined'
            ? Object.keys(CARDS).filter(id => CARDS[id] && _isStarterCard(CARDS[id], id))
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
    // Starter cards (rare rarity + the explicit always-unlocked list) are
    // available for free regardless of what the saved unlockedCards array
    // says. This makes 'bull' available out-of-the-box for every account.
    if (_isStarterCard(c, cardId)) return true;
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
        cancelAdmin: false,
        // Secret "Libi" ultimate card. When on, an extra invulnerable
        // 0-elixir unit appears in the deck during battle. Only the users
        // in LIBI_ALLOWED_USERS see the toggle in the admin panel.
        libiCard: false,
        // Secret "Barry" admin unit — same gating model as Libi. When on,
        // a 🍦 Barry card is injected into the in-battle deck for the
        // super-admin only. Barry must be placed in the enemy half and
        // generates ice-cream area auras over time.
        barryCard: false,
        // Secret "Lumi" admin building — 3-concentric-zone damage tower +
        // 2-second placement freeze on all enemies. Gated by LUMI_ALLOWED_USERS.
        lumiCard: false
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
    // Every write is wrapped in _safeSet so a single failing field (e.g.
    // QuotaExceededError on a low-storage phone) doesn't abort the whole
    // save and silently drop every later field. Each call is independent.
    _safeSet(_userKey('coins'),            playerStats.coins);
    _safeSet(_userKey('gems'),             playerStats.gems);
    _safeSet(_userKey('credits'),          playerStats.credits || 0);
    _safeSet(_userKey('pp'),               playerStats.pp || 0);
    _safeSet(_userKey('tokens'),           playerStats.tokens || 0);
    _safeSet(_userKey('hasBrawlPass'),     playerStats.hasBrawlPass ? '1' : '0');
    _safeSet(_userKey('adFree'),           playerStats.adFree ? '1' : '0');
    _safeSet(_userKey('dailyQuests'),      JSON.stringify(playerStats.dailyQuests || []));
    _safeSet(_userKey('questsLastRefresh'), playerStats.questsLastRefresh || '');
    _safeSet(_userKey('claimed'),          JSON.stringify(playerStats.claimedTiers));
    _safeSet(_userKey('claimedPremium'),   JSON.stringify(playerStats.claimedPremiumTiers || []));
    _safeSet(_userKey('claimedTrophy'),    JSON.stringify(playerStats.claimedTrophyTiers || []));
    _safeSet(_userKey('unlocked'),         JSON.stringify(playerStats.unlockedCards     || []));
    _safeSet(_userKey('trophies'),         playerTrophies);
    // Username stays in BOTH sessionStorage (per-tab active) and localStorage
    // (last-seen fallback for fresh tabs). Use the dedicated setter so both
    // stay in sync.
    if (playerStats.username) _setActiveUsername(playerStats.username);
    Object.keys(playerStats.levels).forEach(id => {
        _safeSet(_userKey('level_' + id), playerStats.levels[id]);
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
    playerStats.pp           = parseInt(localStorage.getItem(_userKey('pp')))      || 0;
    playerStats.tokens       = parseInt(localStorage.getItem(_userKey('tokens')))  || 0;
    playerStats.hasBrawlPass = localStorage.getItem(_userKey('hasBrawlPass')) === '1';
    playerStats.adFree       = localStorage.getItem(_userKey('adFree')) === '1';
    playerStats.dailyQuests = JSON.parse(localStorage.getItem(_userKey('dailyQuests')) || 'null') || [];
    playerStats.questsLastRefresh = localStorage.getItem(_userKey('questsLastRefresh')) || '';
    playerStats.claimedTiers = JSON.parse(localStorage.getItem(_userKey('claimed')) || 'null') || [];
    playerStats.claimedPremiumTiers = JSON.parse(localStorage.getItem(_userKey('claimedPremium')) || 'null') || [];
    playerStats.claimedTrophyTiers = JSON.parse(localStorage.getItem(_userKey('claimedTrophy')) || 'null') || [];
    playerStats.unlockedCards = JSON.parse(localStorage.getItem(_userKey('unlocked')) || 'null') ||
        Object.keys(CARDS).filter(id => CARDS[id] && _isStarterCard(CARDS[id], id));
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

    // Switching users — close every admin overlay so the previous account's
    // permissions don't carry over into the new account's session. Without
    // this, a super-admin could open the panel, switch to a limited / non-
    // admin account, and continue flipping toggles or editing currencies
    // because the open panel never re-checked permissions.
    try {
        ['admin-panel-overlay', 'grant-admin-overlay', 'revoke-admin-overlay'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = 'none';
                el.classList.remove('active');
            }
        });
        // Drop the body class that slides #app to make room for the panel
        // on desktop. With every overlay now closed, the lobby should
        // recentre.
        if (typeof document !== 'undefined' && document.body) {
            document.body.classList.remove('admin-panel-open');
        }
    } catch (e) {}
}
window.reloadActiveUserState = reloadActiveUserState;

// === Auto-save safety net (mobile-friendly) ================================
// Mobile tabs are killed without warning when the user switches apps, the
// browser is backgrounded, or the OS reclaims memory. We can't rely on
// callsites remembering to saveStats() after every state mutation, so:
//   1) periodic interval (every 4 s) flushes the latest playerStats to disk
//   2) every page-leave signal (pagehide / visibilitychange:hidden /
//      beforeunload) does a synchronous final save right before the tab
//      goes away
// Both run only when a username is active so we don't write garbage on the
// pre-login welcome screen. The interval is idempotent — re-importing this
// module wouldn't re-install (guarded by window._bcAutoSaveInstalled).
(function _installAutoSave() {
    if (window._bcAutoSaveInstalled) return;
    window._bcAutoSaveInstalled = true;
    const _flush = () => {
        try {
            if (typeof playerStats !== 'undefined' && playerStats && playerStats.username &&
                typeof saveStats === 'function') {
                saveStats();
            }
            if (typeof adminHacks !== 'undefined' && typeof saveAdminHacks === 'function') {
                saveAdminHacks();
            }
        } catch (e) { /* best-effort */ }
    };
    // Periodic background save. 4 s is a balance — frequent enough to lose
    // at most a few seconds of progress on a sudden tab-kill, infrequent
    // enough to not thrash the storage subsystem on phones with slow disks.
    setInterval(_flush, 4000);
    // Page-leave hooks. pagehide is the most reliable on mobile (fires when
    // the tab is bfcache-stashed by Safari / Chrome too). visibilitychange
    // covers app-switching. beforeunload covers explicit close/refresh.
    try { window.addEventListener('pagehide',          _flush, { capture: true }); } catch (e) {}
    try { window.addEventListener('beforeunload',      _flush, { capture: true }); } catch (e) {}
    try {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') _flush();
        }, { capture: true });
    } catch (e) {}
})();

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
