// ui-social.js - Social and Networking UI

function openPlayersTab() {
    openScreen('social-overlay');

    // Display our own Code
    const myIdDisplay = document.getElementById('my-peer-id-display');
    if (myIdDisplay && window.NetworkManager) {
        const peer = window.NetworkManager.getPeerInstance();
        if (peer && peer.id) {
            const parts = peer.id.split('-');
            myIdDisplay.innerText = parts[parts.length - 1];
            myIdDisplay.setAttribute('data-full-id', peer.id);
        } else {
            myIdDisplay.innerText = "מתחבר...";
        }
    }

    // Without Firebase there's no global presence list — show a helpful hint instead
    if (window.NetworkManager && !window.NetworkManager.hasFirebase()) {
        const container = document.getElementById('social-list-container');
        if (container) {
            container.innerHTML = `
                <div style="color: #bdc3c7; text-align: center; margin-top: 20px; line-height: 1.6;">
                    🔗 <b>שלח את הקוד שלך לחבר</b><br>
                    הוא יזין אותו למעלה וילחץ "שחק!"<br>
                    <span style="font-size: 0.85rem; opacity: 0.7;">(או הזן את הקוד של חבר למעלה כדי להזמין אותו)</span>
                </div>`;
        }
        return;
    }

    if (window.NetworkManager) {
        window.NetworkManager.listenOnlinePlayers((count, players) => {
            renderOnlinePlayers(count, players);
            const countEl = document.getElementById('online-count');
            if (countEl) countEl.innerText = count;
        });
    }
}
window.openPlayersTab = openPlayersTab;

function manualJoinRoom() {
    const input = document.getElementById('manual-join-input');
    let code = input ? input.value.trim().toUpperCase() : null;
    if (!code) return;

    if (window.NetworkManager) {
        // If they only typed the 4-digit part, add the prefix
        // Accept bare 3-digit codes (we prepend "BC-" ourselves), or the full "BC-123".
        if (/^\d{1,3}$/.test(code)) {
            code = "BC-" + code.padStart(3, '0');
        }
        
        console.log("🔗 Connecting to Battle Code:", code);
        window.NetworkManager.joinRoom(code);
    }
}
window.manualJoinRoom = manualJoinRoom;

function renderOnlinePlayers(count, players) {
    const container = document.getElementById('social-list-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (count === 0 || (count === 1 && players[playerStats.username])) {
        container.innerHTML = '<p style="color: #bdc3c7; text-align: center; margin-top: 20px;">אין שחקנים אחרים מחוברים כרגע 😴</p>';
        return;
    }

    Object.values(players).forEach(player => {
        if (player.username === playerStats.username) return;

        const item = document.createElement('div');
        item.className = 'social-player-item';
        item.innerHTML = `
            <div class="player-info-box">
                <div class="presence-dot online"></div>
                <div class="player-main-data">
                    <span class="p-username">${player.username}</span>
                    <span class="p-trophies">🏆 ${player.trophies || 0}</span>
                </div>
            </div>
            <button class="bs-btn bs-btn-invite hover-invite-btn" style="padding: 8px 15px; font-size: 0.9rem; background: #2ecc71;">הזמן ⚔️</button>
        `;

        const inviteBtn = item.querySelector('.hover-invite-btn');
        inviteBtn.onclick = () => {
            if (window.NetworkManager) {
                window.NetworkManager.sendInvite(player.peerId, playerStats.username);
                inviteBtn.innerText = 'נשלח...';
                inviteBtn.disabled = true;
                inviteBtn.style.opacity = '0.7';
                setTimeout(() => {
                    inviteBtn.innerText = 'הזמן ⚔️';
                    inviteBtn.disabled = false;
                    inviteBtn.style.opacity = '1';
                }, 5000);
            }
        };

        container.appendChild(item);
    });
}

// Social Event Listeners
window.addEventListener('remoteInviteDeclined', () => {
    showTransientToast("ההזמנה סורבה ❌");
});

function showTransientToast(msg) {
    const t = document.createElement('div');
    t.innerText = msg;
    t.style.cssText = `
        position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.85); color: #fff;
        padding: 12px 24px; border-radius: 12px;
        font-family: 'Assistant', sans-serif; font-weight: 700; font-size: 1.1rem;
        border: 2px solid #f1c40f; z-index: 30000;
        box-shadow: 0 6px 20px rgba(0,0,0,0.5);
    `;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3200);
}
window.showTransientToast = showTransientToast;
// Note: the actual 'battleAccepted' → start-battle handler lives in network-logic.js
// to avoid double-starting the game.

// Final exports
window.openPlayersTab = openPlayersTab;
