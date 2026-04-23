// network-logic.js - PeerJS and NetworkManager Communication

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
// Admin grant over PeerJS — every user's lock-peer doubles as a "grant oracle".
// When a target client opens their lock, they ask the super-admin's lock-peer
// "do you have a grant for my username?". The super-admin responds with the
// flags (or nothing) and the target applies them locally. This bypasses the
// lack of a shared backend while the super-admin is online.
// ---------------------------------------------------------------------------

const _appliedGrantIds = (() => {
    try { return new Set(JSON.parse(localStorage.getItem('brawlclash_admin_applied') || '[]')); }
    catch (e) { return new Set(); }
})();
function _markGrantApplied(id) {
    _appliedGrantIds.add(id);
    try { localStorage.setItem('brawlclash_admin_applied', JSON.stringify([..._appliedGrantIds])); }
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
        tryClaimUsernameLock(playerStats.username)
            .then(() => {
                // Lock re-acquired — ask for any pending admin grant for this name.
                setTimeout(queryAdminForGrant, 500);
            })
            .catch((err) => {
                // Only force a re-claim for actual "name taken" rejection.
                // Broker timeouts / generic errors shouldn't eject the user.
                if (err && err.message === 'name-taken') {
                    console.warn('🔒 username-lock: name is now held by another device — forcing re-claim');
                    playerStats.username = null;
                    try { localStorage.removeItem('brawlclash_username'); } catch (e) {}
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

    try {
        await tryClaimUsernameLock(name);
    } catch (e) {
        if (feedback) {
            feedback.style.color = '#ff7675';
            if (e && e.message === 'name-taken') {
                feedback.innerText = '❌ השם כבר בשימוש במכשיר אחר. בחר שם אחר.';
            } else if (e && e.message === 'broker-timeout') {
                feedback.innerText = '❌ לא הצלחנו לבדוק זמינות (הרשת איטית). נסה שוב.';
            } else {
                feedback.innerText = '❌ שגיאת רשת, נסה שוב.';
            }
        }
        if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = '1'; }
        return;
    }

    if (feedback) feedback.innerText = '';
    if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = '1'; }

    playerStats.username = name;
    localStorage.setItem('brawlclash_username', name);
    const overlay = document.getElementById('username-overlay');
    if (overlay) overlay.style.display = 'none';
    updateStatsUI();

    // Ask the super-admin's lock-peer if this name has a pending grant.
    setTimeout(queryAdminForGrant, 800);

    // NetworkManager.init runs from initNetworkListeners (called by goToLobby).
    // Don't call it here too — starting two PeerJS instances means one overrides
    // the other and the surviving peer never fires 'open'.
    goToLobby();
}
window.claimUsername = claimUsername;

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
