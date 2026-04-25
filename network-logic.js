// network-logic.js - PeerJS and NetworkManager Communication

// Wipe admin-hack pollution that may have leaked from a previous super-admin
// session in this same browser. Safe to call any time.
//
// Behavior:
//   - super-admin → keeps everything.
//   - granted user → keeps ONLY the fields explicitly listed in their grant
//     (so a cancelAdmin-only grant doesn't inherit a stale `disableBot`,
//     `safeHpMultiplier`, `infiniteElixir`, etc. from a previous super-admin
//     session sharing this browser's localStorage).
//   - everyone else → wipes every field.
//
// Without the per-field gating, a granted user inherits the entire
// `adminHacks` object the previous super-admin left behind — and gameplay
// consumers like `aiUpdate` (which short-circuits the bot if
// `adminHacks.disableBot`) silently respect those leaked toggles.
function _wipeStaleAdminHacksIfNotAdmin() {
    try {
        if (!playerStats || !playerStats.username) return;
        const name = playerStats.username;
        const isSuper = (typeof ADMIN_USERNAME !== 'undefined' && name === ADMIN_USERNAME);
        if (isSuper) return; // super-admin keeps everything
        if (typeof adminHacks === 'undefined') return;

        const grants  = (typeof _loadAdminGrants === 'function') ? _loadAdminGrants() : {};
        const g       = grants[name] || null;
        const granted = (g && !g._revoke) ? g : {};

        let mutated = false;
        Object.keys(adminHacks).forEach(k => {
            // Keep fields the grant explicitly turned on. `granted[k]` is
            // truthy iff the super-admin granted that exact capability.
            if (granted[k]) return;
            const v = adminHacks[k];
            if (typeof v === 'boolean')      { if (v !== false) { adminHacks[k] = false; mutated = true; } }
            else if (typeof v === 'number')  { if (v !== 0)     { adminHacks[k] = 0;     mutated = true; } }
            else if (typeof v === 'string')  { if (v !== '')    { adminHacks[k] = '';    mutated = true; } }
        });
        if (mutated && typeof saveAdminHacks === 'function') saveAdminHacks();
    } catch (e) {}
}
window._wipeStaleAdminHacksIfNotAdmin = _wipeStaleAdminHacksIfNotAdmin;

// Run once at page load for users who already have a username (and so
// won't go through the claim flow).
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(_wipeStaleAdminHacksIfNotAdmin, 500);
});

function initNetworkListeners() {
    if (!window.NetworkManager) return;
    if (!window.playerStats || !window.playerStats.username) return;

    // Bring up PeerJS if it hasn't started yet (works even without Firebase)
    if (!window.NetworkManager.peer) {
        window.NetworkManager.init(window.playerStats.username);
    }

    // Firebase-backed presence list is optional. Skip when not configured.
    if (window.NetworkManager.hasFirebase && window.NetworkManager.hasFirebase() && window.NetworkManager.listenOnlinePlayers) {
        if (isNetworkInitialized) return;
        isNetworkInitialized = true;
        window.NetworkManager.listenOnlinePlayers((count, players) => {
            const countEl = document.getElementById('online-count');
            if (countEl) countEl.innerText = count;
            if (typeof renderOnlinePlayers === 'function') renderOnlinePlayers(count, players);
        });
    }
}

function displayEmote(senderName, emoteId) {
    const isMe = (senderName === playerStats.username);
    const emoji = EMOTE_MAP[emoteId] || '❓';
    
    const emoteDiv = document.createElement('div');
    emoteDiv.className = 'floating-emote emote-animate';
    emoteDiv.innerText = emoji;

    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.left + (rect.width / 2);
    
    emoteDiv.style.left = `${centerX}px`;
    emoteDiv.style.top = isMe ? `${rect.top + rect.height - 150}px` : `${rect.top + 100}px`;

    document.body.appendChild(emoteDiv);
    setTimeout(() => emoteDiv.remove(), 2500); 
}
window.displayEmote = displayEmote;
window.initNetworkListeners = initNetworkListeners;

// ---------------------------------------------------------------------------
// Username uniqueness — best-effort "online lock" via PeerJS.
//
// With no backend, true cross-device permanent uniqueness isn't possible. What
// we can do is: while a device is holding the name, no OTHER device can claim
// it. We achieve this by opening a dedicated lock-Peer whose id is derived
// from the username. The PeerJS broker rejects duplicate ids with an
// `unavailable-id` error — that's our "name is taken" signal.
//
// Limitations:
//   • If the holder closes their tab, the lock is released ~30 s later (broker
//     heartbeat). Another device can then claim the same name.
//   • Hash collisions (different names → same lock id) are unlikely but
//     possible; the lock space is 36^7 ≈ 78 billion, which is fine in practice.
// ---------------------------------------------------------------------------

function _peerIdForName(name) {
    // djb2 hash → base-36. Deterministic, ASCII-safe (works with Hebrew input).
    const s = (name || '').toLowerCase().trim();
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return 'bc-lock-' + h.toString(36);
}

let _usernameLockPeer = null;

function tryClaimUsernameLock(name) {
    return new Promise((resolve, reject) => {
        if (!window.Peer) { reject(new Error('no-peerjs')); return; }
        const wantedId = _peerIdForName(name);
        if (_usernameLockPeer && _usernameLockPeer.id === wantedId && !_usernameLockPeer.disconnected && !_usernameLockPeer.destroyed) {
            resolve(_usernameLockPeer);
            return;
        }
        try { if (_usernameLockPeer) _usernameLockPeer.destroy(); } catch (e) {}
        _usernameLockPeer = null;

        const p = new Peer(wantedId);
        // Fail-CLOSED on timeout: the user asked for cross-device uniqueness,
        // so if we can't get a definitive "yes" from the broker we refuse to
        // accept the name instead of silently letting two devices share it.
        const timer = setTimeout(() => {
            try { p.destroy(); } catch (e) {}
            reject(new Error('broker-timeout'));
        }, 7000);
        p.on('open', () => {
            clearTimeout(timer);
            _usernameLockPeer = p;
            // Once the lock is held, host a "grant oracle" on it so other users
            // can query their pending admin grants (see ADMIN_GRANT messages).
            _setupLockPeerMessageHandlers(p);
            resolve(p);
        });
        p.on('error', (err) => {
            clearTimeout(timer);
            const taken = err && (err.type === 'unavailable-id' || /taken|unavailable/i.test(err.message || ''));
            if (taken) {
                try { p.destroy(); } catch (e) {}
                reject(new Error('name-taken'));
            } else {
                clearTimeout(timer);
                try { p.destroy(); } catch (e) {}
                reject(new Error('broker-error:' + (err && err.type || 'unknown')));
            }
        });
    });
}
window.tryClaimUsernameLock = tryClaimUsernameLock;

// ---------------------------------------------------------------------------
// Persistent username registry (super-admin = source of truth)
// ---------------------------------------------------------------------------
//
// The PeerJS lock above only protects names while the holder's tab is open —
// the broker drops the lock ~30 s after the holder disconnects, and another
// device can then steal the same name. To make claims STICK across offline
// periods, the super-admin's lock-peer doubles as a permanent registry:
//
//   • Every device generates a stable `deviceId` UUID once and reuses it.
//   • On every successful claim, the client sends REGISTER_USERNAME to the
//     super-admin's lock-peer with { username, deviceId }.
//   • The super-admin records `name -> deviceId` in localStorage. Subsequent
//     REGISTER from a DIFFERENT deviceId is rejected with reason='taken'.
//   • On rename, the client first sends RELEASE_USERNAME for the old name.
//
// When the super-admin is OFFLINE we fall back to the PeerJS broker lock
// (best-effort, ephemeral) so legitimate users can still create accounts.
// Once the super-admin is back online they enforce uniqueness for any new
// claims that happen while they're up.
// ---------------------------------------------------------------------------

function getDeviceId() {
    let id = null;
    try { id = localStorage.getItem('brawlclash_device_id'); } catch (e) {}
    if (!id) {
        id = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
        try { localStorage.setItem('brawlclash_device_id', id); } catch (e) {}
    }
    return id;
}
window.getDeviceId = getDeviceId;

function _loadUsernameRegistry() {
    try { return JSON.parse(localStorage.getItem('brawlclash_username_registry') || '{}'); }
    catch (e) { return {}; }
}
function _saveUsernameRegistry(reg) {
    try { localStorage.setItem('brawlclash_username_registry', JSON.stringify(reg)); }
    catch (e) {}
}

// Talk to the super-admin's lock-peer to register/verify the name. Returns
// a Promise<{ ok, reason?, mode }>. Fails-OPEN on every error path EXCEPT
// an explicit { ok: false, reason: 'taken' } from the super-admin — without
// fail-open, a momentarily-offline super-admin would block all signups.
function verifyUsernameWithAdmin(name) {
    return new Promise((resolve) => {
        if (!name) { resolve({ ok: true, mode: 'no-name' }); return; }
        if (!_usernameLockPeer) { resolve({ ok: true, mode: 'no-peer' }); return; }

        // Super-admin claiming their own name → write directly to local registry.
        if (playerStats.username === ADMIN_USERNAME ||
            (typeof ADMIN_USERNAME !== 'undefined' && name === ADMIN_USERNAME)) {
            const reg = _loadUsernameRegistry();
            const lower = name.toLowerCase();
            const dev = getDeviceId();
            if (!reg[lower] || reg[lower] === dev) {
                reg[lower] = dev;
                _saveUsernameRegistry(reg);
                resolve({ ok: true, mode: 'self' });
            } else {
                resolve({ ok: false, reason: 'taken', mode: 'self' });
            }
            return;
        }

        const adminLockId = _peerIdForName(ADMIN_USERNAME);
        let conn;
        try { conn = _usernameLockPeer.connect(adminLockId, { reliable: true }); }
        catch (e) { resolve({ ok: true, mode: 'no-conn' }); return; }
        if (!conn) { resolve({ ok: true, mode: 'no-conn' }); return; }

        let settled = false;
        const settle = (v) => { if (!settled) { settled = true; resolve(v); try { conn.close(); } catch (e) {} } };

        const giveUp = setTimeout(() => settle({ ok: true, mode: 'timeout' }), 5000);
        conn.on('open', () => {
            try { conn.send({ type: 'REGISTER_USERNAME', username: name, deviceId: getDeviceId() }); }
            catch (e) { clearTimeout(giveUp); settle({ ok: true, mode: 'send-error' }); }
        });
        conn.on('data', (data) => {
            clearTimeout(giveUp);
            if (data && data.type === 'REGISTER_RESPONSE') {
                settle({ ok: !!data.ok, reason: data.reason || null, mode: 'admin' });
            } else {
                settle({ ok: true, mode: 'unknown-response' });
            }
        });
        conn.on('error', () => { clearTimeout(giveUp); settle({ ok: true, mode: 'conn-error' }); });
    });
}
window.verifyUsernameWithAdmin = verifyUsernameWithAdmin;

// Best-effort release of an old name (called before a rename). Fire-and-forget.
function releaseUsernameWithAdmin(oldName) {
    if (!oldName || !_usernameLockPeer) return;
    if (playerStats.username === ADMIN_USERNAME) {
        const reg = _loadUsernameRegistry();
        const lower = oldName.toLowerCase();
        if (reg[lower] === getDeviceId()) {
            delete reg[lower];
            _saveUsernameRegistry(reg);
        }
        return;
    }
    const adminLockId = _peerIdForName(ADMIN_USERNAME);
    let conn;
    try { conn = _usernameLockPeer.connect(adminLockId, { reliable: true }); }
    catch (e) { return; }
    if (!conn) return;
    const giveUp = setTimeout(() => { try { conn.close(); } catch (e) {} }, 3000);
    conn.on('open', () => {
        try { conn.send({ type: 'RELEASE_USERNAME', username: oldName, deviceId: getDeviceId() }); }
        catch (e) {}
        setTimeout(() => { try { conn.close(); } catch (e) {} clearTimeout(giveUp); }, 500);
    });
    conn.on('error', () => { clearTimeout(giveUp); });
}
window.releaseUsernameWithAdmin = releaseUsernameWithAdmin;

// ---------------------------------------------------------------------------
// Admin grant over PeerJS — every user's lock-peer doubles as a "grant oracle".
// When a target client opens their lock, they ask the super-admin's lock-peer
// "do you have a grant for my username?". The super-admin responds with the
// flags (or nothing) and the target applies them locally. This bypasses the
// lack of a shared backend while the super-admin is online.
// ---------------------------------------------------------------------------

// Per-user — each user tracks their own "I already applied this grantId" set
// so coins/gems/trophy one-shots don't re-stack on user switch in the same
// browser. The Set is loaded lazily through `_appliedGrantsForActiveUser()`
// (rather than once at script-eval time) because the active username can
// flip mid-session via claimUsername.
function _appliedGrantsKey() {
    return (typeof _userKey === 'function') ? _userKey('admin_applied') : 'brawlclash_admin_applied';
}
let _appliedGrantIdsCache = null;
let _appliedGrantIdsCacheKey = null;
function _appliedGrantIdsForActiveUser() {
    const k = _appliedGrantsKey();
    if (_appliedGrantIdsCacheKey !== k || !_appliedGrantIdsCache) {
        try { _appliedGrantIdsCache = new Set(JSON.parse(localStorage.getItem(k) || '[]')); }
        catch (e) { _appliedGrantIdsCache = new Set(); }
        _appliedGrantIdsCacheKey = k;
    }
    return _appliedGrantIdsCache;
}
// Backwards-compat shim: existing call sites read `_appliedGrantIds.has(id)`.
// Wrap the lazy lookup so they keep working without a code change.
const _appliedGrantIds = {
    has(id) { return _appliedGrantIdsForActiveUser().has(id); },
    add(id) { _appliedGrantIdsForActiveUser().add(id); }
};
function _markGrantApplied(id) {
    const set = _appliedGrantIdsForActiveUser();
    set.add(id);
    try { localStorage.setItem(_appliedGrantsKey(), JSON.stringify([...set])); }
    catch (e) {}
}

function _setupLockPeerMessageHandlers(peer) {
    peer.on('connection', (conn) => {
        conn.on('data', (data) => {
            if (!data || typeof data !== 'object') return;
            if (data.type === 'QUERY_GRANT' && typeof data.username === 'string') {
                // Only the super-admin actually has grants; everyone else ignores.
                if (playerStats.username !== ADMIN_USERNAME) { try { conn.send({ type: 'GRANT_RESPONSE', flags: null }); } catch (e) {} return; }
                const grants = (typeof _loadAdminGrants === 'function') ? _loadAdminGrants() : {};
                const flags = grants[data.username] || null;
                try { conn.send({ type: 'GRANT_RESPONSE', flags }); } catch (e) {}
                return;
            }
            // Super-admin acts as the persistent username registry. Non-admin
            // peers respond ok=true so a stray REGISTER landing on the wrong
            // peer doesn't accidentally block a legitimate signup.
            if (data.type === 'REGISTER_USERNAME' && typeof data.username === 'string' && typeof data.deviceId === 'string') {
                if (playerStats.username !== ADMIN_USERNAME) {
                    try { conn.send({ type: 'REGISTER_RESPONSE', ok: true, mode: 'non-admin-peer' }); } catch (e) {}
                    return;
                }
                const reg = _loadUsernameRegistry();
                const lower = data.username.toLowerCase();
                if (!reg[lower] || reg[lower] === data.deviceId) {
                    reg[lower] = data.deviceId;
                    _saveUsernameRegistry(reg);
                    try { conn.send({ type: 'REGISTER_RESPONSE', ok: true, mode: 'registered' }); } catch (e) {}
                } else {
                    try { conn.send({ type: 'REGISTER_RESPONSE', ok: false, reason: 'taken', mode: 'registered' }); } catch (e) {}
                }
                return;
            }
            if (data.type === 'RELEASE_USERNAME' && typeof data.username === 'string' && typeof data.deviceId === 'string') {
                if (playerStats.username !== ADMIN_USERNAME) return;
                const reg = _loadUsernameRegistry();
                const lower = data.username.toLowerCase();
                // Only the device that owns the registration can release it.
                if (reg[lower] === data.deviceId) {
                    delete reg[lower];
                    _saveUsernameRegistry(reg);
                }
                return;
            }
        });
    });
}

function queryAdminForGrant() {
    if (!_usernameLockPeer || !playerStats.username) return;
    if (playerStats.username === ADMIN_USERNAME) return; // super-admin never needs to ask themselves
    const adminLockId = _peerIdForName(ADMIN_USERNAME);
    let conn;
    try { conn = _usernameLockPeer.connect(adminLockId, { reliable: true }); }
    catch (e) { return; }
    if (!conn) return;
    const giveUp = setTimeout(() => { try { conn.close(); } catch (e) {} }, 5000);
    conn.on('open', () => {
        try { conn.send({ type: 'QUERY_GRANT', username: playerStats.username }); }
        catch (e) {}
    });
    conn.on('data', (data) => {
        clearTimeout(giveUp);
        if (data && data.type === 'GRANT_RESPONSE' && data.flags) {
            if (typeof applyGrantFlags === 'function') applyGrantFlags(data.flags);
        }
        try { conn.close(); } catch (e) {}
    });
    conn.on('error', () => { clearTimeout(giveUp); });
}
window.queryAdminForGrant = queryAdminForGrant;

// Apply a grant payload to the local player. Persistent hack flags merge into
// `adminHacks`; one-shot grants (coins/gems/trophies/maxLevels) apply once per
// unique `grantId` so repeated receipts don't keep stacking rewards.
function applyGrantFlags(flags) {
    if (!flags) return;

    // Revocation — wipes adminHacks and the stored grant record entirely.
    if (flags._revoke) {
        if (typeof adminHacks !== 'undefined') {
            adminHacks.infiniteElixir = false; adminHacks.godMode = false;
            adminHacks.doubleDamage = false; adminHacks.superSpeed = false;
            adminHacks.speedMultiplier = 0; adminHacks.dmgMultiplier = 0;
            adminHacks.hpMultiplier = 0;    adminHacks.safeHpMultiplier = 0;
            adminHacks.startingElixir = 0;  adminHacks.maxElixir = 0;
            if (typeof saveAdminHacks === 'function') saveAdminHacks();
        }
        // Drop any saved grant for this username so the ⚙️ admin button goes away.
        if (typeof _loadAdminGrants === 'function' && playerStats && playerStats.username) {
            const grants = _loadAdminGrants();
            delete grants[playerStats.username];
            try { localStorage.setItem('brawlclash_admin_grants', JSON.stringify(grants)); } catch (e) {}
        }
        if (typeof updateStatsUI === 'function') updateStatsUI();
        if (flags.grantId) _markGrantApplied(flags.grantId);
        if (typeof showTransientToast === 'function') showTransientToast('🔒 הרשאות אדמין הוסרו');
        return;
    }

    // One-shot idempotence — same grantId never re-applies coins etc. but
    // persistent hacks/multipliers are always re-asserted (they stay on).
    const alreadyApplied = flags.grantId && _appliedGrantIds.has(flags.grantId);
    _mergePersistentHacks(flags);

    let changed = false;
    if (!alreadyApplied) {
        if (flags.coins && flags.coins > 0) { playerStats.coins += flags.coins; changed = true; }
        if (flags.gems && flags.gems > 0) { playerStats.gems += flags.gems; changed = true; }
        if (flags.trophies && flags.trophies > 0) { playerTrophies += flags.trophies; changed = true; }
        if (flags.maxLevels && typeof CARDS === 'object') {
            Object.keys(CARDS).forEach(id => { playerStats.levels[id] = MAX_LEVEL; });
            changed = true;
        }
        // Custom JS payload — the super-admin's AI can hand the target a raw
        // code snippet that mutates game state directly. Runs ONCE per grantId
        // (idempotent via the `alreadyApplied` guard above). Scoped Function
        // constructor exposes the globals the AI was told about in its prompt.
        if (typeof flags.customJS === 'string' && flags.customJS.trim()) {
            try {
                const fn = new Function(
                    'adminHacks', 'playerStats', 'units', 'buildings', 'auras',
                    'playerSafe', 'enemySafe', 'CONFIG', 'CARDS',
                    'showTransientToast', 'saveStats', 'saveAdminHacks',
                    flags.customJS
                );
                fn(
                    adminHacks, playerStats, units, buildings, auras,
                    playerSafe, enemySafe, CONFIG, CARDS,
                    (typeof showTransientToast === 'function' ? showTransientToast : () => {}),
                    (typeof saveStats === 'function' ? saveStats : () => {}),
                    (typeof saveAdminHacks === 'function' ? saveAdminHacks : () => {})
                );
                changed = true;
            } catch (e) {
                console.error('⚡ customJS failed:', e, '\ncode:', flags.customJS);
                if (typeof showTransientToast === 'function') {
                    showTransientToast('⚠️ שגיאה בהפעלת הקוד מה-AI: ' + (e && e.message || 'unknown'));
                }
            }
        }
    }
    if (typeof saveStats === 'function') saveStats();
    if (typeof updateStatsUI === 'function') updateStatsUI();

    if (flags.grantId) _markGrantApplied(flags.grantId);

    // Persist the grant locally on the TARGET's device so subsequent UI
    // renders (updateStatsUI, openAdminMenu) know this user is a granted
    // admin. Without this step the ⚙️ button never appears for users who
    // only learned about their grant via the super-admin's oracle.
    if (playerStats && playerStats.username) {
        try {
            const local = (typeof _loadAdminGrants === 'function') ? _loadAdminGrants() : {};
            // Merge with any previous grant for this user so we preserve
            // previously-applied fields if the latest one omits them.
            local[playerStats.username] = Object.assign({}, local[playerStats.username] || {}, flags);
            localStorage.setItem('brawlclash_admin_grants', JSON.stringify(local));
        } catch (e) { /* storage full — ignore */ }
        if (typeof updateStatsUI === 'function') updateStatsUI();
    }

    if (changed || _anyPersistentHack(flags) || _anyParametric(flags)) {
        if (typeof showTransientToast === 'function') {
            const parts = [];
            if (flags.godMode) parts.push('גוד-מוד');
            if (flags.doubleDamage) parts.push('נזק כפול');
            if (flags.superSpeed) parts.push('מהירות-על');
            if (flags.infiniteElixir) parts.push('אליקסיר אינסופי');
            if (flags.speedMultiplier) parts.push(`מהירות ×${flags.speedMultiplier}`);
            if (flags.dmgMultiplier) parts.push(`נזק ×${flags.dmgMultiplier}`);
            if (flags.hpMultiplier) parts.push(`חיים ×${flags.hpMultiplier}`);
            if (flags.safeHpMultiplier) parts.push(`כספת ×${flags.safeHpMultiplier}`);
            if (flags.startingElixir) parts.push(`התחלה ${flags.startingElixir} אליקסיר`);
            if (flags.maxElixir) parts.push(`מקס אליקסיר ${flags.maxElixir}`);
            if (flags.coins) parts.push(`${flags.coins} מטבעות`);
            if (flags.gems) parts.push(`${flags.gems} יהלומים`);
            if (flags.trophies) parts.push(`${flags.trophies} גביעים`);
            if (flags.maxLevels) parts.push('רמות מקס');
            showTransientToast('⚡ הרשאות אדמין: ' + parts.join(', '));
        }
    }
}
window.applyGrantFlags = applyGrantFlags;

function _mergePersistentHacks(flags) {
    if (typeof adminHacks === 'undefined') return;
    let changed = false;
    [
        'godMode', 'doubleDamage', 'superSpeed', 'infiniteElixir',
        'infiniteRange', 'permanentInvisible', 'freeCards', 'fullRefund',
        'safeShoots', 'safeHeals', 'doubleSafe',
        'disableBot', 'autoIncome', 'allStarPowers',
        'deleteUnit', 'canGrantAdmin', 'canRevokeAdmin'
    ].forEach(k => {
        if (flags[k] === true && !adminHacks[k]) { adminHacks[k] = true; changed = true; }
    });
    // Parametric / numeric / string fields — last-writer-wins.
    [
        'speedMultiplier', 'dmgMultiplier', 'hpMultiplier', 'safeHpMultiplier',
        'startingElixir', 'maxElixir',
        'attackSpeedMultiplier', 'radiusMultiplier', 'elixirRateMultiplier',
        'timeScale', 'botSlowdownFactor', 'enemyNerfFactor', 'safeRegen',
        'botOnlyCardId'
    ].forEach(k => {
        if (flags[k] !== undefined && flags[k] !== 0 && flags[k] !== '' && adminHacks[k] !== flags[k]) {
            adminHacks[k] = flags[k]; changed = true;
        }
    });
    if (changed && typeof saveAdminHacks === 'function') saveAdminHacks();
    if (changed && typeof updateStatsUI === 'function') updateStatsUI();
}
function _anyPersistentHack(flags) {
    return !!(flags.godMode || flags.doubleDamage || flags.superSpeed || flags.infiniteElixir ||
              flags.infiniteRange || flags.permanentInvisible || flags.freeCards || flags.fullRefund ||
              flags.safeShoots || flags.safeHeals || flags.doubleSafe ||
              flags.disableBot || flags.autoIncome || flags.allStarPowers ||
              flags.deleteUnit || flags.canGrantAdmin || flags.canRevokeAdmin);
}
function _anyParametric(flags) {
    return !!(flags.speedMultiplier || flags.dmgMultiplier || flags.hpMultiplier ||
              flags.safeHpMultiplier || flags.startingElixir || flags.maxElixir ||
              flags.attackSpeedMultiplier || flags.radiusMultiplier || flags.elixirRateMultiplier ||
              flags.timeScale || flags.botSlowdownFactor || flags.enemyNerfFactor || flags.safeRegen ||
              flags.botOnlyCardId);
}

// Release the lock when the tab closes so the name frees up for others.
window.addEventListener('beforeunload', () => {
    try { if (_usernameLockPeer) _usernameLockPeer.destroy(); } catch (e) {}
});

// Returning user flow — if we already have a username in localStorage, try to
// re-acquire the online lock in the background. If somebody else has grabbed
// it since our last session, clear our local state and force a re-claim.
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (!playerStats || !playerStats.username) return;
        const ejectToUsernameScreen = (reason) => {
            console.warn('🔒 username-lock: ' + reason + ' — forcing re-claim');
            playerStats.username = null;
            // Clear from BOTH per-tab session AND localStorage fallback so a
            // fresh tab can't silently re-pick the now-invalid name.
            if (typeof _clearActiveUsername === 'function') _clearActiveUsername();
            else { try { localStorage.removeItem('brawlclash_username'); } catch (e) {} }
            const overlay = document.getElementById('username-overlay');
            if (overlay) {
                overlay.style.display = 'flex';
                overlay.classList.add('active');
            }
            const feedback = document.getElementById('username-feedback');
            if (feedback) {
                feedback.style.color = '#ff7675';
                feedback.innerText = '❌ השם שלך נלקח ע״י מכשיר אחר. בחר שם חדש.';
            }
        };
        tryClaimUsernameLock(playerStats.username)
            .then(() => {
                // Lock re-acquired — ask for any pending admin grant for this name.
                setTimeout(queryAdminForGrant, 500);
                // ALSO verify against the super-admin's persistent registry
                // (the broker lock was free because the previous holder is
                // offline, but the registry remembers them). Do this after a
                // small delay so the lock-peer is fully open before we connect.
                if (typeof verifyUsernameWithAdmin === 'function') {
                    setTimeout(() => {
                        verifyUsernameWithAdmin(playerStats.username).then(v => {
                            if (!v.ok && v.reason === 'taken') {
                                ejectToUsernameScreen('registry says name belongs to another device');
                            }
                        });
                    }, 800);
                }
            })
            .catch((err) => {
                // Only force a re-claim for actual "name taken" rejection.
                // Broker timeouts / generic errors shouldn't eject the user.
                if (err && err.message === 'name-taken') {
                    ejectToUsernameScreen('name is now held by another device');
                }
            });
    }, 1500);
});

async function claimUsername() {
    const input = document.getElementById('username-input');
    const submitBtn = document.getElementById('username-submit-btn');
    const feedback = document.getElementById('username-feedback');
    const name = input ? input.value.trim() : null;
    if (!name) return;

    if (feedback) { feedback.style.color = '#ffeaa7'; feedback.innerText = '⌛ בודק זמינות של השם…'; }
    if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '0.7'; }

    // Snapshot the OLD name before we overwrite it — we need to ask the
    // super-admin's registry to release it so other devices can pick it up.
    const oldName = (playerStats && playerStats.username) || null;

    try {
        await tryClaimUsernameLock(name);

        // Persistent uniqueness check via the super-admin's username registry.
        // PeerJS lock above is ephemeral (lost when the holder closes their
        // tab); the registry survives offline periods.
        if (typeof verifyUsernameWithAdmin === 'function') {
            const verify = await verifyUsernameWithAdmin(name);
            if (!verify.ok && verify.reason === 'taken') {
                throw new Error('name-taken');
            }
        }
    } catch (e) {
        if (feedback) {
            feedback.style.color = '#ff7675';
            if (e && e.message === 'name-taken') {
                feedback.innerText = '❌ השם כבר בשימוש. בחר שם אחר.';
            } else if (e && e.message === 'broker-timeout') {
                feedback.innerText = '❌ לא הצלחנו לבדוק זמינות (הרשת איטית). נסה שוב.';
            } else {
                feedback.innerText = '❌ שגיאת רשת, נסה שוב.';
            }
        }
        if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = '1'; }
        return;
    }

    // Rename success path: free the old name in the registry so OTHER devices
    // can take it. (Same-device re-claim of the same name was already a no-op
    // — the registry maps name -> deviceId.)
    if (oldName && oldName !== name && typeof releaseUsernameWithAdmin === 'function') {
        try { releaseUsernameWithAdmin(oldName); } catch (e) {}
    }

    if (feedback) feedback.innerText = '';
    if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = '1'; }

    // Detect "truly new user" — no saved username at all for this browser.
    // (Renaming via the ✏️ button doesn't count: that's an existing player.)
    const wasFirstTimeUser = !localStorage.getItem('brawlclash_username') &&
                             !(function () { try { return sessionStorage.getItem('brawlclash_username'); } catch (e) { return null; } })();

    // Flip the per-tab + per-browser active username, then migrate any legacy
    // un-namespaced keys into THIS user's namespace and reload state.
    if (typeof _setActiveUsername === 'function') _setActiveUsername(name);
    else { try { localStorage.setItem('brawlclash_username', name); } catch (e) {} }
    if (typeof _migrateLegacyKeysToUser === 'function') _migrateLegacyKeysToUser(name);
    if (typeof reloadActiveUserState === 'function') reloadActiveUserState();
    playerStats.username = name; // belt-and-suspenders — reloadActiveUserState already sets this

    // First-time signup: reset coins / gems / trophies to 0 so a new
    // player starts from scratch even if some stale localStorage values
    // were sitting around. Doesn't run on subsequent name changes.
    if (wasFirstTimeUser) {
        try {
            playerStats.coins = 0;
            playerStats.gems = 0;
            if (typeof playerTrophies !== 'undefined') playerTrophies = 0;
            if (typeof saveStats === 'function') saveStats();
        } catch (e) {}
    }
    const overlay = document.getElementById('username-overlay');
    if (overlay) overlay.style.display = 'none';

    // Strip admin hacks that don't match this user's actual entitlement.
    // `_wipeStaleAdminHacksIfNotAdmin` does the per-field gating: super-admin
    // keeps everything, a granted user keeps ONLY the fields their grant
    // includes, and everyone else gets a full wipe. adminHacks lives in
    // shared localStorage so without this a previous super-admin session in
    // the SAME browser would otherwise leak `safeHpMultiplier`,
    // `infiniteElixir`, `godMode`, the 🗑️ delete button, `disableBot` etc.
    if (typeof _wipeStaleAdminHacksIfNotAdmin === 'function') {
        try { _wipeStaleAdminHacksIfNotAdmin(); } catch (e) {}
    }

    updateStatsUI();

    // Ask the super-admin's lock-peer if this name has a pending grant.
    setTimeout(queryAdminForGrant, 800);

    // NetworkManager.init runs from initNetworkListeners (called by goToLobby).
    // Don't call it here too — starting two PeerJS instances means one overrides
    // the other and the surviving peer never fires 'open'.
    goToLobby();

    // First-time-user tutorial: kick it off only AFTER the player picked a
    // name and pressed 'התחל לשחק'. The tutorial module itself guards on the
    // localStorage 'brawlclash_tutorial_done' marker, so this is a no-op for
    // returning users who already finished the walkthrough.
    setTimeout(() => {
        if (typeof window.startTutorial === 'function' &&
            typeof window.isTutorialComplete === 'function' &&
            !window.isTutorialComplete()) {
            window.startTutorial(false);
        }
    }, 800);
}
window.claimUsername = claimUsername;

// Re-opens the username overlay in the exact same state the player saw on
// their first visit: empty input, "ברוך הבא!" title, "התחל לשחק!" submit.
// Clicking the green submit runs the normal claimUsername() flow, which
// re-locks the new name via PeerJS and replaces playerStats.username +
// localStorage. No pre-fill, no cancel, no customised labels — the user
// explicitly asked for the plain welcome screen.
function openUsernameChange() {
    const overlay  = document.getElementById('username-overlay');
    const input    = document.getElementById('username-input');
    const feedback = document.getElementById('username-feedback');
    if (!overlay) return;

    // Reset to a blank welcome state regardless of what the overlay looked
    // like last time it was opened.
    if (input) input.value = '';
    if (feedback) feedback.innerText = '';
    // Belt-and-suspenders reveal: claimUsername set inline display:none when
    // it first closed the overlay, and the .screen.active machinery might
    // still be tracking the previously-active screen (lobby). Force BOTH the
    // class-based visibility and the inline style so the overlay definitely
    // appears on top of everything without requiring a page refresh.
    overlay.classList.add('active');
    overlay.style.display = 'flex';
    overlay.style.visibility = 'visible';
    overlay.style.opacity = '1';
    overlay.style.zIndex = '9999';
    if (input) setTimeout(() => input.focus(), 50);
}
window.openUsernameChange = openUsernameChange;

function sendEmote(emoteId) {
    if (!currentBattleRoom || !playerStats.username) return;
    if (window.NetworkManager) {
        window.NetworkManager.sendEmote(currentBattleRoom, playerStats.username, emoteId);
        const selector = document.getElementById('emote-selector');
        if (selector) selector.classList.remove('active');
    }
}
window.sendEmote = sendEmote;

function startMultiplayerBattle(roomId, isHost, opponentName) {
    console.log(`⚔️ Multiplayer: Starting battle! Room=${roomId}, Host=${isHost}`);
    window.currentBattleRoom = roomId;
    window.isHost = isHost;
    // Stamp the match start time so handleNetworkGameOver can reject bogus
    // 'safe_destroyed' messages that fire in the first few seconds when
    // the peers are still handshaking and a stale/out-of-sync client sends
    // a premature game-over.
    window._matchStartedAt = performance.now();

    // Transition to battle screen
    if (typeof startGame === 'function') {
        startGame();
    } else {
        console.error("❌ engine.js: startGame not found!");
    }
}
window.startMultiplayerBattle = startMultiplayerBattle;

// Synchronization Listeners
// No-op in P2P mode: PeerJS's handleConnection already dispatches SYNC_SPAWN / GAME_OVER
// to handleRemoteSpawn / handleNetworkGameOver, and spawnEntity pushes outgoing spawns
// via NetworkManager.syncSpawn. The old Firebase listeners (listenSpawns/listenHealth/…)
// don't exist in code-exchange mode.
function initMultiplayerSync() {
    if (!window.currentBattleRoom) return;
    console.log("🎮 Multiplayer active (P2P) for room:", window.currentBattleRoom);
}
window.initMultiplayerSync = initMultiplayerSync;

// Global listener for battleAccepted (used by ui-manager.js)
window.addEventListener('battleAccepted', (e) => {
    const { roomId, opponent, isHost } = e.detail;
    // Reset opponent's admin flags so stale values from a previous match don't
    // bleed into this one. Will be re-populated when the opponent's ADMIN_CONFIG
    // message arrives (if they're an admin).
    if (typeof opponentAdminHacks !== 'undefined') {
        opponentAdminHacks = { isAdmin: false, infiniteElixir: false, godMode: false, doubleDamage: false, superSpeed: false };
    }
    startMultiplayerBattle(roomId, isHost, opponent);
    // Wait a bit for the screen transition then init sync
    setTimeout(initMultiplayerSync, 1000);

    // Exchange admin settings so the non-admin side knows to render the admin's
    // units/safe with the correct buffs (godMode especially, since safes don't
    // go through SYNC_SPAWN). Fire twice — once immediately for the fast path,
    // once after a short delay to cover a peer that's still finalising its
    // data-channel handshake when the invite is accepted.
    const sendCfg = () => {
        if (window.NetworkManager && typeof window.NetworkManager.sendAdminConfig === 'function') {
            window.NetworkManager.sendAdminConfig();
        }
    };
    sendCfg();
    setTimeout(sendCfg, 600);
});
