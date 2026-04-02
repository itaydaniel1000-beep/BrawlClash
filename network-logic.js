// network-logic.js - PeerJS and NetworkManager Communication

function initNetworkListeners() {
    if (isNetworkInitialized) return;
    if (!window.NetworkManager || !window.NetworkManager.isConfigured()) return;
    isNetworkInitialized = true;

    // The ui-manager.js now handles 'battleAccepted' and 'remoteInvite' events
    // We just ensure the NetworkManager is listening for presence
    window.NetworkManager.listenOnlinePlayers((count, players) => {
        const countEl = document.getElementById('online-count');
        if (countEl) countEl.innerText = count;
        
        // If the social-overlay is open, we want it to refresh
        if (typeof renderOnlinePlayers === 'function') {
            renderOnlinePlayers(count, players);
        }
    });
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
        sessionStorage.setItem('brawlclash_username', name);
        const overlay = document.getElementById('username-overlay');
        if (overlay) overlay.style.display = 'none';
        updateStatsUI();
        
        if (window.NetworkManager) {
            window.NetworkManager.init(name, (id) => {
                console.log("🎮 Network presence established for:", name, "ID:", id);
            });
        }

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
function initMultiplayerSync() {
    if (!window.NetworkManager || !window.currentBattleRoom) return;
    console.log("🎮 Initializing Multiplayer Synchronization for Room:", window.currentBattleRoom);

    // Listen for spawns
    window.NetworkManager.listenSpawns(window.currentBattleRoom, (data) => {
        if (typeof spawnUnit === 'function') {
            spawnUnit(data.x, data.y, data.typeStr, false);
        }
    });

    // Listen for health updates
    window.NetworkManager.listenHealth(window.currentBattleRoom, (hpData) => {
        if (hpData && hpData.playerSafeHp !== undefined && window.enemySafe) enemySafe.hp = hpData.playerSafeHp;
        if (hpData && hpData.enemySafeHp !== undefined && window.playerSafe) playerSafe.hp = hpData.enemySafeHp;
    });

    // Listen for game over
    window.NetworkManager.listenBattleStatus(window.currentBattleRoom, (status, winner) => {
        if (status === 'finished') {
            // Note: the winner from the other side's perspective is inverted here
            const finalWinner = (winner === 'player' ? 'enemy' : 'player');
            if (typeof endGame === 'function') endGame(finalWinner);
        }
    });

    // Listen for emotes
    window.NetworkManager.listenEmotes(window.currentBattleRoom, (data) => {
        if (typeof displayEmote === 'function') displayEmote(data.username, data.emoteId);
    });
}
window.initMultiplayerSync = initMultiplayerSync;

// Global listener for battleAccepted (used by ui-manager.js)
window.addEventListener('battleAccepted', (e) => {
    const { roomId, opponent, isHost } = e.detail;
    startMultiplayerBattle(roomId, isHost, opponent);
    // Wait a bit for the screen transition then init sync
    setTimeout(initMultiplayerSync, 1000);
});
