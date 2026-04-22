// net-sync.js - Multiplayer Game Synchronization

NetworkManager.syncSpawn = function(roomId, x, y, type) {
    // Send to all active peer connections
    Object.values(this.connections).forEach(conn => {
        if (conn.open) {
            conn.send({
                type: 'SYNC_SPAWN',
                x: CONFIG.CANVAS_WIDTH - x, // Flip for opponent
                y: CONFIG.CANVAS_HEIGHT - y, // Flip for opponent
                type: type
            });
        }
    });
};

NetworkManager.updateBattleResult = function(roomId, winner) {
    Object.values(this.connections).forEach(conn => {
        if (conn.open) {
            conn.send({
                type: 'GAME_OVER',
                winner: winner
            });
        }
    });
    
    // Also save to Firebase if active
    if (this.db) {
        this.db.ref('battles/' + roomId).set({
            winner: winner,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    }
};

// Connect to another player's code ("BC-ABCD" or just the 4-char suffix) and send an invite.
NetworkManager.joinRoom = function(roomCode) {
    if (!this.peer) {
        alert("החיבור לרשת עדיין לא מוכן - נסה שוב בעוד רגע");
        return;
    }

    let targetId = roomCode.trim().toUpperCase();
    if (!targetId.startsWith("BC-")) targetId = "BC-" + targetId;

    if (targetId === this.peer.id) {
        alert("זה הקוד שלך! שלח אותו לחבר כדי שיוכל להזמין אותך.");
        return;
    }

    console.log("📡 Attempting to connect to " + targetId);
    const conn = this.peer.connect(targetId, { reliable: true });

    const failTimer = setTimeout(() => {
        if (!conn.open) {
            try { conn.close(); } catch (e) {}
            alert("לא הצלחנו להתחבר לקוד " + targetId.replace("BC-", "") + " — ודא שהוא נכון ושהשחקן מחובר.");
        }
    }, 6000);

    conn.on('open', () => {
        clearTimeout(failTimer);
        const roomId = "ROOM-" + Math.random().toString(36).substr(2, 6).toUpperCase();
        this.connections[conn.peer] = conn;
        conn.send({
            type: 'BATTLE_INVITE',
            sender: this.currentUsername || 'אנונימי',
            roomId: roomId
        });
        console.log("📨 Invite sent to " + targetId + " for room " + roomId);

        // Listen for the response on this outgoing connection too
        conn.on('data', (data) => {
            if (data.type === 'INVITE_ACCEPTED') {
                window.currentBattleRoom = data.roomId;
                window.isHost = true;
                window.dispatchEvent(new CustomEvent('battleAccepted', {
                    detail: { roomId: data.roomId, opponent: targetId, isHost: true }
                }));
            } else if (data.type === 'INVITE_DECLINED') {
                window.dispatchEvent(new CustomEvent('remoteInviteDeclined'));
            } else if (data.type === 'SYNC_SPAWN') {
                if (typeof handleRemoteSpawn === 'function') handleRemoteSpawn(data);
            } else if (data.type === 'GAME_OVER') {
                if (typeof handleNetworkGameOver === 'function') handleNetworkGameOver(data.winner);
            }
        });
    });

    conn.on('error', (err) => {
        clearTimeout(failTimer);
        console.error("📡 Connect error:", err);
    });
};
