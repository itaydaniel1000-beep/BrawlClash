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

function claimUsername() {
    const input = document.getElementById('username-input');
    const name = input ? input.value.trim() : null;
    if (name) {
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
