// net-social.js - Social Interactions and Invites

NetworkManager.listenOnlinePlayers = function(callback) {
    if (!this.db) return;
    this.db.ref('online_players').on('value', (snapshot) => {
        const players = snapshot.val() || {};
        const count = Object.keys(players).length;
        callback(count, players);
    });
};

NetworkManager.sendInvite = function(targetPeerId, senderName) {
    const conn = this.peer.connect(targetPeerId);
    conn.on('open', () => {
        conn.send({
            type: 'BATTLE_INVITE',
            sender: senderName,
            roomId: "ROOM-" + Math.random().toString(36).substr(2, 6).toUpperCase()
        });
    });
};

NetworkManager.handleConnection = function(conn) {
    conn.on('data', (data) => {
        if (data.type === 'BATTLE_INVITE') {
            this.showInvitePopup(data.sender, data.roomId, conn);
        } else if (data.type === 'INVITE_ACCEPTED') {
            window.dispatchEvent(new CustomEvent('battleAccepted', { 
                detail: { roomId: data.roomId, isHost: true }
            }));
        } else if (data.type === 'INVITE_DECLINED') {
            window.dispatchEvent(new CustomEvent('remoteInviteDeclined'));
        } else if (data.type === 'SYNC_SPAWN') {
            if (typeof handleRemoteSpawn === 'function') handleRemoteSpawn(data);
        } else if (data.type === 'GAME_OVER') {
            if (typeof handleNetworkGameOver === 'function') handleNetworkGameOver(data.winner);
        }
    });
};

let inviteTimer = null;
let currentInviteConn = null;

/**
 * מציג פופ-אפ הזמנה לקרב בצורה חסינת שגיאות
 */
NetworkManager.showInvitePopup = function(sender, roomId, conn) {
    console.log(`📩 Receiving invite from: ${sender}, Room: ${roomId}`);
    
    const notify = document.getElementById('invite-notification');
    const senderName = document.getElementById('invite-sender-name');
    const timerBar = document.getElementById('invite-timer-bar');
    const declineBtn = document.getElementById('decline-invite-btn');
    const acceptBtn = document.getElementById('accept-invite-btn');
    
    currentInviteConn = conn;

    // פונקציית עזר להעלמת ההזמנה
    const clearInviteUI = () => {
        console.log("🧹 [InviteUI] Executing clearInviteUI...");
        if (notify) {
            notify.classList.remove('show');
            // העלמה מיידית בסיסית כדי למנוע תקיעה
            notify.style.opacity = "0";
            
            setTimeout(() => {
                notify.classList.add('hidden');
                notify.style.display = 'none';
                notify.style.opacity = ""; // איפוס
                console.log("🧹 [InviteUI] UI is now hidden.");
            }, 500);
        }
        
        if (inviteTimer) {
            clearTimeout(inviteTimer);
            inviteTimer = null;
        }
        currentInviteConn = null;
    };

    if (!notify || !senderName || !declineBtn || !acceptBtn) {
        console.error("❌ [InviteUI] Essential UI elements missing!", { notify, senderName, declineBtn, acceptBtn });
        // Fallback
        if (confirm(`${sender} מזמין אותך לקרב! האם לאשר?`)) {
            try { conn.send({ type: 'INVITE_ACCEPTED', roomId: roomId }); } catch(e) {}
            window.dispatchEvent(new CustomEvent('battleAccepted', { detail: { roomId, isHost: false } }));
        } else {
            try { conn.send({ type: 'INVITE_DECLINED' }); } catch(e) {}
        }
        return;
    }

    // הגדרת תוכן
    senderName.innerText = `${sender} מזמין אותך לקרב!`;
    
    // הצגת המיכל
    notify.style.display = 'flex';
    notify.classList.remove('hidden');
    void notify.offsetWidth; // Force reflow
    notify.classList.add('show');
    notify.style.opacity = "1";

    // ניהול פס זמן
    if (timerBar) {
        timerBar.style.transition = 'none';
        timerBar.style.width = '100%';
        void timerBar.offsetWidth;
        timerBar.style.transition = 'width 10s linear';
        timerBar.style.width = '0%';
    }

    // הגדרת כפתור דחייה
    declineBtn.onclick = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        console.log("🚫 [InviteUI] Decline clicked");
        try {
            if (currentInviteConn && currentInviteConn.open) {
                currentInviteConn.send({ type: 'INVITE_DECLINED' });
            }
        } catch (err) {
            console.error("⚠️ [InviteUI] Error sending decline:", err);
        }
        clearInviteUI();
    };

    // הגדרת כפתור אישור
    acceptBtn.onclick = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        console.log("⚔️ [InviteUI] Accept clicked");
        try {
            if (currentInviteConn && currentInviteConn.open) {
                currentInviteConn.send({ type: 'INVITE_ACCEPTED', roomId: roomId });
                window.dispatchEvent(new CustomEvent('battleAccepted', { 
                    detail: { roomId: roomId, opponent: sender, isHost: false }
                }));
            }
        } catch (err) {
            console.error("⚠️ [InviteUI] Error sending accept:", err);
        }
        clearInviteUI();
    };

    // טיימר לסגירה אוטומטית
    if (inviteTimer) clearTimeout(inviteTimer);
    inviteTimer = setTimeout(() => {
        console.log("⏰ [InviteUI] Auto-decline due to timeout");
        try {
            if (currentInviteConn && currentInviteConn.open) {
                currentInviteConn.send({ type: 'INVITE_DECLINED' });
            }
        } catch(e) {}
        clearInviteUI();
    }, 10000);
};



function initNetworkListeners() {
    if (!window.playerStats || !window.playerStats.username) return;
    if (window.NetworkManager && window.NetworkManager.isConfigured()) {
        window.NetworkManager.init(window.playerStats.username);
    }
}
window.initNetworkListeners = initNetworkListeners;

