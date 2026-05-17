// net-cloud.js — Firebase Realtime Database cross-device profile sync.
//
// Purpose: store every user's full game profile (stats / deck / levels /
// unlocks / quest progress / etc.) under /users/<usernameLower> in a
// Firebase Realtime DB so logging into the same account from ANY device
// pulls the latest data, even if no other device is currently online.
// Removes the "shared-login requires both devices online" limitation.
//
// Security: the entire profile blob is encrypted CLIENT-SIDE with a key
// derived from the user's password (PBKDF2-SHA256 100k iters → AES-GCM
// 256-bit). Firebase rules can stay wide-open in test mode without
// leaking anything useful — without the password, downloaders get random
// bytes. Wrong-password reads gracefully return null instead of garbage
// because AES-GCM's auth tag check fires before the plaintext is exposed.
//
// Activation: the file is loaded unconditionally but every public
// function bails out early if `NetworkManager.hasFirebase()` is false.
// The moment a real firebaseConfig replaces "YOUR_API_KEY", cloud sync
// starts automatically with no other changes needed.

// === Crypto helpers (Web Crypto API) =======================================

function _bytesToB64(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
}
function _b64ToBytes(b64) {
    const s = atob(b64);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
}

async function _deriveKey(password, saltBytes) {
    const enc = new TextEncoder();
    const material = await crypto.subtle.importKey(
        'raw', enc.encode(password || ''), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' },
        material,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

async function _encryptJSON(obj, password) {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv   = crypto.getRandomValues(new Uint8Array(12));
    const key  = await _deriveKey(password, salt);
    const pt   = enc.encode(JSON.stringify(obj));
    const ct   = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, pt);
    return {
        v: 1,
        salt: _bytesToB64(salt),
        iv:   _bytesToB64(iv),
        ct:   _bytesToB64(new Uint8Array(ct))
    };
}

async function _decryptJSON(blob, password) {
    if (!blob || !blob.salt || !blob.iv || !blob.ct) return null;
    try {
        const salt = _b64ToBytes(blob.salt);
        const iv   = _b64ToBytes(blob.iv);
        const ct   = _b64ToBytes(blob.ct);
        const key  = await _deriveKey(password, salt);
        const pt   = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
        return JSON.parse(new TextDecoder().decode(pt));
    } catch (e) {
        // Wrong password → AES-GCM auth tag check fails, decrypt throws.
        // Also catches malformed blobs / corrupted data.
        return null;
    }
}

// === Snapshot build / apply ================================================

function _buildCloudSnapshot() {
    if (typeof playerStats === 'undefined' || !playerStats) return null;
    const ps = playerStats;
    return {
        stats: {
            coins:        +ps.coins        || 0,
            gems:         +ps.gems         || 0,
            credits:      +ps.credits      || 0,
            pp:           +ps.pp           || 0,
            tokens:       +ps.tokens       || 0,
            hasBrawlPass: !!ps.hasBrawlPass,
            adFree:       !!ps.adFree
        },
        trophies:            (typeof playerTrophies === 'number') ? playerTrophies : 0,
        levels:              ps.levels || {},
        unlockedCards:       ps.unlockedCards || [],
        claimedTiers:        ps.claimedTiers || [],
        claimedPremiumTiers: ps.claimedPremiumTiers || [],
        claimedTrophyTiers:  ps.claimedTrophyTiers || [],
        dailyQuests:         ps.dailyQuests || [],
        questsLastRefresh:   ps.questsLastRefresh || '',
        deck:                (typeof window !== 'undefined' && Array.isArray(window.playerDeck)) ? window.playerDeck.slice() : [],
        starPowers:          (typeof window !== 'undefined' && window.playerStarPowers) ? Object.assign({}, window.playerStarPowers) : {},
        favoriteBrawler:     (typeof window !== 'undefined') ? (window.favoriteBrawler || null) : null
    };
}

function _applyCloudSnapshot(snap) {
    if (!snap || typeof playerStats === 'undefined') return false;
    if (snap.stats) {
        if (typeof snap.stats.coins        === 'number')  playerStats.coins        = snap.stats.coins;
        if (typeof snap.stats.gems         === 'number')  playerStats.gems         = snap.stats.gems;
        if (typeof snap.stats.credits      === 'number')  playerStats.credits      = snap.stats.credits;
        if (typeof snap.stats.pp           === 'number')  playerStats.pp           = snap.stats.pp;
        if (typeof snap.stats.tokens       === 'number')  playerStats.tokens       = snap.stats.tokens;
        if (typeof snap.stats.hasBrawlPass === 'boolean') playerStats.hasBrawlPass = snap.stats.hasBrawlPass;
        if (typeof snap.stats.adFree       === 'boolean') playerStats.adFree       = snap.stats.adFree;
    }
    if (typeof snap.trophies === 'number') window.playerTrophies = snap.trophies;
    if (snap.levels && typeof snap.levels === 'object') {
        playerStats.levels = Object.assign({}, snap.levels);
    }
    const _replaceArray = (field) => {
        if (Array.isArray(snap[field])) playerStats[field] = snap[field].slice();
    };
    _replaceArray('unlockedCards');
    _replaceArray('claimedTiers');
    _replaceArray('claimedPremiumTiers');
    _replaceArray('claimedTrophyTiers');
    _replaceArray('dailyQuests');
    if (typeof snap.questsLastRefresh === 'string') playerStats.questsLastRefresh = snap.questsLastRefresh;
    // Deck — mutate in place so consumers that captured the reference stay live.
    if (Array.isArray(snap.deck) && typeof window.playerDeck !== 'undefined') {
        window.playerDeck.length = 0;
        snap.deck.forEach(c => window.playerDeck.push(c));
    }
    // Star powers — same in-place treatment.
    if (snap.starPowers && typeof window.playerStarPowers !== 'undefined') {
        Object.keys(window.playerStarPowers).forEach(k => delete window.playerStarPowers[k]);
        Object.assign(window.playerStarPowers, snap.starPowers);
    }
    if (typeof snap.favoriteBrawler === 'string' || snap.favoriteBrawler === null) {
        window.favoriteBrawler = snap.favoriteBrawler;
    }
    // Persist + refresh UI.
    try { if (typeof saveStats === 'function') saveStats(); } catch (e) {}
    try { if (typeof updateStatsUI === 'function') updateStatsUI(); } catch (e) {}
    try { if (typeof updateHomeScreen === 'function') updateHomeScreen(); } catch (e) {}
    return true;
}

// === Public API ============================================================

// Write the current player profile to Firebase, encrypted with the local
// user's password. Resolves to true on success, false on any failure
// (no Firebase configured, no DB connection, no username, no password,
// crypto error, write error). Safe to call repeatedly — failures are
// silent so we don't spam the user with toasts during retries.
async function cloudSaveSnapshot() {
    try {
        if (!window.NetworkManager || !NetworkManager.hasFirebase || !NetworkManager.hasFirebase()) return false;
        if (!NetworkManager.db) return false;
        if (typeof playerStats === 'undefined' || !playerStats.username) return false;
        const name = playerStats.username;
        const password = (function () {
            try { return localStorage.getItem('brawlclash_pw_' + name.toLowerCase()) || ''; }
            catch (e) { return ''; }
        })();
        if (!password) return false;
        const snap = _buildCloudSnapshot();
        if (!snap) return false;
        const blob = await _encryptJSON(snap, password);
        await NetworkManager.db.ref('users/' + name.toLowerCase()).set({
            blob: blob,
            updated: firebase.database.ServerValue.TIMESTAMP
        });
        return true;
    } catch (e) {
        console.warn('☁️ cloudSaveSnapshot failed:', e && e.message);
        return false;
    }
}
window.cloudSaveSnapshot = cloudSaveSnapshot;

// Fetch and decrypt the cloud profile for `name` using `password`. Returns
// the decrypted snapshot object on success, null on any failure (no
// Firebase, no record, wrong password, etc.). The caller decides whether
// to apply it locally via _applyCloudSnapshot.
async function cloudLoadSnapshot(name, password) {
    try {
        if (!window.NetworkManager || !NetworkManager.hasFirebase || !NetworkManager.hasFirebase()) return null;
        if (!NetworkManager.db) return null;
        if (!name || !password) return null;
        const snap = await NetworkManager.db.ref('users/' + name.toLowerCase()).once('value');
        const val = snap && snap.val();
        if (!val || !val.blob) return null;
        return await _decryptJSON(val.blob, password);
    } catch (e) {
        console.warn('☁️ cloudLoadSnapshot failed:', e && e.message);
        return null;
    }
}
window.cloudLoadSnapshot = cloudLoadSnapshot;

window.applyCloudSnapshot = _applyCloudSnapshot;

// === Auto-write loop =======================================================
// Push the current profile to the cloud every 10 s while the user is
// logged in. 10s is a sane balance — frequent enough that a phone tab
// kill loses at most ~10 s of progress, infrequent enough not to thrash
// the free-tier Firebase quota (10K writes/day on Spark plan).
(function _installCloudAutoSync() {
    if (window._bcCloudAutoSyncInstalled) return;
    window._bcCloudAutoSyncInstalled = true;
    setInterval(() => {
        // Defer to next tick so a long save doesn't block the game loop.
        if (typeof playerStats !== 'undefined' && playerStats && playerStats.username) {
            cloudSaveSnapshot().catch(() => {});
        }
    }, 10000);
    // Also push on page-leave so the very last change isn't lost.
    const _flush = () => {
        if (typeof playerStats !== 'undefined' && playerStats && playerStats.username) {
            // Fire-and-forget; we don't await because pagehide doesn't wait
            // for promises. The write usually completes via the SDK's
            // built-in retry queue.
            cloudSaveSnapshot().catch(() => {});
        }
    };
    try { window.addEventListener('pagehide',     _flush, { capture: true }); } catch (e) {}
    try { window.addEventListener('beforeunload', _flush, { capture: true }); } catch (e) {}
    try {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') _flush();
        }, { capture: true });
    } catch (e) {}
})();

// === Post-login cloud fetch ================================================
// Hooks into claimUsername (see network-logic.js) by exposing a helper
// the login flow can await after the lock is claimed. The flow:
//   1. claimUsername finishes the normal login (lock + verify)
//   2. If local data looks empty (zero coins/gems/trophies), call
//      cloudLoadAndApply(name, password)
//   3. cloudLoadAndApply fetches from Firebase, decrypts, applies.
//      Returns true on success.
//   4. claimUsername continues — if the fetch succeeded the lobby
//      already paints with the restored data; if it failed (no cloud
//      record yet) the user just sees the default empty state.
async function cloudLoadAndApply(name, password) {
    try {
        const snap = await cloudLoadSnapshot(name, password);
        if (!snap) return false;
        return _applyCloudSnapshot(snap);
    } catch (e) { return false; }
}
window.cloudLoadAndApply = cloudLoadAndApply;
