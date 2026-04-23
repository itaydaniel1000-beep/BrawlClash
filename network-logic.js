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
        if (!window.Peer) { resolve(null); return; } // PeerJS missing → skip check
        // If we already hold a lock for this exact name, no need to re-acquire.
        const wantedId = _peerIdForName(name);
        if (_usernameLockPeer && _usernameLockPeer.id === wantedId && !_usernameLockPeer.disconnected && !_usernameLockPeer.destroyed) {
            resolve(_usernameLockPeer);
            return;
        }
        // Release any previous lock for a different name first.
        try { if (_usernameLockPeer) _usernameLockPeer.destroy(); } catch (e) {}
        _usernameLockPeer = null;

        const p = new Peer(wantedId);
        const timer = setTimeout(() => {
            // Broker unreachable — fail-open so the game still works offline.
            resolve(p);
        }, 6000);
        p.on('open', () => { clearTimeout(timer); _usernameLockPeer = p; resolve(p); });
        p.on('error', (err) => {
            clearTimeout(timer);
            const taken = err && (err.type === 'unavailable-id' || /taken|unavailable/i.test(err.message || ''));
            if (taken) {
                try { p.destroy(); } catch (e) {}
                reject(new Error('name-taken'));
            } else {
                // Non-uniqueness error (network, etc.) — fail-open.
                _usernameLockPeer = p;
                resolve(p);
            }
        });
    });
}
window.tryClaimUsernameLock = tryClaimUsernameLock;

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
        tryClaimUsernameLock(playerStats.username).catch(() => {
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
        });
    }, 1500); // let PeerJS-broker warm up first
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
        // Name is currently held by another device.
        if (feedback) { feedback.style.color = '#ff7675'; feedback.innerText = '❌ השם כבר בשימוש במכשיר אחר. בחר שם אחר.'; }
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
