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
    if (!this.peer) return;
    const conn = this.peer.connect(targetPeerId, { reliable: true });
    const roomId = "ROOM-" + Math.random().toString(36).substr(2, 6).toUpperCase();
    conn.on('open', () => {
        this.connections[conn.peer] = conn;
        if (NetworkManager._watchConnectionForMidBattleClose) {
            NetworkManager._watchConnectionForMidBattleClose(conn);
        }
        conn.send({
            type: 'BATTLE_INVITE',
            sender: senderName,
            roomId: roomId
        });
        // Listen for their reply on this connection
        conn.on('data', (data) => {
            if (data.type === 'INVITE_ACCEPTED') {
                window.currentBattleRoom = data.roomId;
                window.isHost = true;
                window.dispatchEvent(new CustomEvent('battleAccepted', {
                    detail: { roomId: data.roomId, opponent: targetPeerId, isHost: true }
                }));
            } else if (data.type === 'INVITE_DECLINED') {
                window.dispatchEvent(new CustomEvent('remoteInviteDeclined'));
            } else if (data.type === 'SYNC_SPAWN') {
                if (typeof handleRemoteSpawn === 'function') handleRemoteSpawn(data);
            } else if (data.type === 'GAME_OVER') {
                if (typeof handleNetworkGameOver === 'function') handleNetworkGameOver(data);
            } else if (data.type === 'ADMIN_CONFIG') {
                if (typeof handleAdminConfig === 'function') handleAdminConfig(data);
            } else if (data.type === 'EMOTE') {
                if (typeof displayEmote === 'function') displayEmote(data.sender, data.emoteId);
            } else if (data.type === 'RELEASE_FREEZE') {
                if (typeof handleRemoteReleaseFreeze === 'function') handleRemoteReleaseFreeze();
            } else if (data.type === 'SAFE_FIRE') {
                if (typeof handleRemoteSafeFire === 'function') handleRemoteSafeFire(data);
            } else if (data.type === 'SUSPEND_ADMIN') {
                if (typeof handleSuspendAdmin === 'function') handleSuspendAdmin();
            }
        });
    });
};

NetworkManager.handleConnection = function(conn) {
    // Remember every incoming connection so syncSpawn / updateBattleResult can reach them
    conn.on('open', () => {
        this.connections[conn.peer] = conn;
        if (NetworkManager._watchConnectionForMidBattleClose) {
            NetworkManager._watchConnectionForMidBattleClose(conn);
        }
    });
    conn.on('close', () => {
        delete this.connections[conn.peer];
    });
    conn.on('data', (data) => {
        if (data.type === 'BATTLE_INVITE') {
            this.showInvitePopup(data.sender, data.roomId, conn);
        } else if (data.type === 'INVITE_ACCEPTED') {
            window.currentBattleRoom = data.roomId;
            window.isHost = true;
            window.dispatchEvent(new CustomEvent('battleAccepted', {
                detail: { roomId: data.roomId, opponent: conn.peer, isHost: true }
            }));
        } else if (data.type === 'INVITE_DECLINED') {
            window.dispatchEvent(new CustomEvent('remoteInviteDeclined'));
        } else if (data.type === 'SYNC_SPAWN') {
            if (typeof handleRemoteSpawn === 'function') handleRemoteSpawn(data);
        } else if (data.type === 'GAME_OVER') {
            if (typeof handleNetworkGameOver === 'function') handleNetworkGameOver(data);
        } else if (data.type === 'ADMIN_CONFIG') {
            if (typeof handleAdminConfig === 'function') handleAdminConfig(data);
        } else if (data.type === 'EMOTE') {
            if (typeof displayEmote === 'function') displayEmote(data.sender, data.emoteId);
        } else if (data.type === 'RELEASE_FREEZE') {
            if (typeof handleRemoteReleaseFreeze === 'function') handleRemoteReleaseFreeze();
        } else if (data.type === 'SAFE_FIRE') {
            if (typeof handleRemoteSafeFire === 'function') handleRemoteSafeFire(data);
        } else if (data.type === 'SUSPEND_ADMIN') {
            if (typeof handleSuspendAdmin === 'function') handleSuspendAdmin();
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

    // ניהול פס זמן (30 שניות לאישור)
    if (timerBar) {
        timerBar.style.transition = 'none';
        timerBar.style.width = '100%';
        void timerBar.offsetWidth;
        timerBar.style.transition = 'width 30s linear';
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
                // Make sure the connection is retained for syncSpawn / GAME_OVER traffic
                NetworkManager.connections[currentInviteConn.peer] = currentInviteConn;
                window.currentBattleRoom = roomId;
                window.isHost = false;
                window.dispatchEvent(new CustomEvent('battleAccepted', {
                    detail: { roomId: roomId, opponent: sender, isHost: false }
                }));
            }
        } catch (err) {
            console.error("⚠️ [InviteUI] Error sending accept:", err);
        }
        clearInviteUI();
    };

    // טיימר לסגירה אוטומטית (30 שניות)
    if (inviteTimer) clearTimeout(inviteTimer);
    inviteTimer = setTimeout(() => {
        console.log("⏰ [InviteUI] Auto-decline due to timeout");
        try {
            if (currentInviteConn && currentInviteConn.open) {
                currentInviteConn.send({ type: 'INVITE_DECLINED' });
            }
        } catch(e) {}
        clearInviteUI();
    }, 30000);
};



function initNetworkListeners() {
    if (!window.playerStats || !window.playerStats.username) return;
    if (window.NetworkManager && window.NetworkManager.peer == null) {
        window.NetworkManager.init(window.playerStats.username);
    }
}
window.initNetworkListeners = initNetworkListeners;

