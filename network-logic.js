// network-logic.js - PeerJS and NetworkManager Communication

function initNetworkListeners() {
    if (isNetworkInitialized) return;
    if (!window.NetworkManager || !window.NetworkManager.isConfigured()) return;
    isNetworkInitialized = true;

    // 1. Listen for Online Count
    window.NetworkManager.listenOnlinePlayers((count, players) => {
        const countEl = document.getElementById('online-count');
        if (countEl) countEl.innerText = count;
        updateOnlinePlayersList(players);
    });

    // 2. Listen for Chat Messages
    if (window.NetworkManager.listenChat) {
        window.NetworkManager.listenChat((messages) => {
            const chatBox = document.getElementById('chat-messages');
            if (!chatBox) return;
            chatBox.innerHTML = messages.map(m => `
                <div>
                    <span class="chat-name">${m.username}:</span>
                    <span class="chat-text">${m.text}</span>
                </div>
            `).join('');
            chatBox.scrollTop = chatBox.scrollHeight;
        });
    }

    // 3. Listen for Incoming Invites
    window.addEventListener('remoteInvite', (e) => {
        const { from, fromId } = e.detail;
        showBattleInvite(from, fromId);
    });

    // 4. Listen for Battle Status
    window.addEventListener('battleAccepted', (e) => {
        const { roomId, opponent, isHost } = e.detail;
        startMultiplayerBattle(roomId, isHost, opponent);
    });
}

function updateOnlinePlayersList(players) {
    const listContainer = document.getElementById('online-players-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    const peer = (window.NetworkManager.getPeerInstance ? window.NetworkManager.getPeerInstance() : null);
    const myPeerId = peer ? peer.id : '';

    Object.keys(players).forEach(username => {
        const player = players[username];
        const isSelf = (player.peerId === myPeerId);
        if (isSelf) return;

        const item = document.createElement('div');
        item.className = 'social-player-item';
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <div style="font-size: 1.2rem;">👤</div>
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: white; text-align: right;">${username}</div>
                    <div style="font-size: 0.8rem; color: #f1c40f; text-align: right;">🏆 ${player.trophies || 0}</div>
                </div>
            </div>
            <button class="hover-invite-btn" onclick="invitePlayer('${player.peerId}', '${username}')">הזמן ⚔️</button>
        `;
        listContainer.appendChild(item);
    });
}

function invitePlayer(peerId, name) {
    if (window.NetworkManager) {
        window.NetworkManager.sendInvite(peerId, playerStats.username);
        console.log("Invite sent to " + name);
    }
}
window.invitePlayer = invitePlayer;

function showBattleInvite(senderName, senderId) {
    const popup = document.getElementById('invite-notification');
    const text = document.getElementById('invite-from-text');
    const acceptBtn = document.getElementById('accept-invite-btn');
    const declineBtn = document.getElementById('decline-invite-btn');

    if (!popup || !text) return;

    text.innerText = `${senderName} מזמין אותך לקרב!`;
    popup.style.display = 'block';
    AudioController.play('spawn'); 

    acceptBtn.onclick = () => {
        popup.style.display = 'none';
        window.NetworkManager.joinRoom(senderId);
    };

    declineBtn.onclick = () => {
        popup.style.display = 'none';
    };
    
    setTimeout(() => {
        popup.style.display = 'none';
    }, 15000);
}

function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text || !playerStats.username) return;
    
    if (window.NetworkManager && window.NetworkManager.isConfigured()) {
        window.NetworkManager.sendMessage(playerStats.username, text);
        input.value = '';
    } else {
        alert("⚠️ Firebase לא מוגדר! אנא הכנס את ה-Config שלך.");
    }
}

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

function openPlayersTab() {
    const sidebar = document.getElementById('global-chat-sidebar');
    if (sidebar) sidebar.classList.add('visible');
    
    const chatContent = document.getElementById('chat-window-content');
    const playersContent = document.getElementById('players-window-content');
    const tabChat = document.getElementById('tab-chat');
    const tabPlayers = document.getElementById('tab-players');
    
    if (chatContent) chatContent.style.display = 'none';
    if (playersContent) playersContent.style.display = 'flex';
    if (tabPlayers) {
        tabPlayers.style.background = 'var(--bs-yellow)';
        tabPlayers.style.color = '#000';
    }
    if (tabChat) {
        tabChat.style.background = 'var(--bs-blue)';
        tabChat.style.color = '#fff';
    }

    if (window.NetworkManager) {
        window.NetworkManager.listenOnlinePlayers((count, players) => {
            updateOnlinePlayersList(players);
        });
    }
}
window.openPlayersTab = openPlayersTab;

function toggleGlobalChat(forceState) {
    const sidebar = document.getElementById('global-chat-sidebar');
    if (!sidebar) return;
    
    if (typeof forceState === 'boolean') {
        if (forceState) {
            sidebar.style.setProperty('display', 'block', 'important');
            sidebar.classList.add('visible');
        } else {
            sidebar.style.setProperty('display', 'none', 'important');
            sidebar.classList.remove('visible');
        }
    } else {
        const isCurrentlyHidden = window.getComputedStyle(sidebar).display === 'none';
        if (isCurrentlyHidden) {
            sidebar.style.setProperty('display', 'block', 'important');
            sidebar.classList.add('visible');
        } else {
            sidebar.style.setProperty('display', 'none', 'important');
            sidebar.classList.remove('visible');
        }
    }
}
window.toggleGlobalChat = toggleGlobalChat;

function sendEmote(emoteId) {
    if (!currentBattleRoom || !playerStats.username) return;
    if (window.NetworkManager) {
        window.NetworkManager.sendEmote(currentBattleRoom, playerStats.username, emoteId);
        const selector = document.getElementById('emote-selector');
        if (selector) selector.classList.remove('active');
    }
}
window.sendEmote = sendEmote;

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
