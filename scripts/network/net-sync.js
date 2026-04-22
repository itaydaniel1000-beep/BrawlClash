// net-sync.js - Multiplayer Game Synchronization

// Build the admin-buff payload piggy-backed onto every spawn so the opponent's
// client renders the same souped-up unit the admin actually placed locally.
function _collectSpawnBuffs() {
    const h = window.adminHacks || {};
    return {
        doubleDamage: !!h.doubleDamage,
        superSpeed: !!h.superSpeed
    };
}

NetworkManager.syncSpawn = function(roomId, x, y, unitType) {
    // Send to all active peer connections.
    // NOTE: the message envelope uses `type:'SYNC_SPAWN'` for routing, so the unit
    // type goes into `unitType` — an inner `type` field would overwrite the envelope.
    const buffs = _collectSpawnBuffs();
    Object.values(this.connections).forEach(conn => {
        if (conn.open) {
            conn.send({
                type: 'SYNC_SPAWN',
                x: CONFIG.CANVAS_WIDTH - x, // Flip for opponent
                y: CONFIG.CANVAS_HEIGHT - y, // Flip for opponent
                unitType: unitType,
                buffs: buffs
            });
        }
    });
};

// iWon: boolean from the sender's perspective. Receiver inverts it.
NetworkManager.updateBattleResult = function(roomId, iWon, reason) {
    Object.values(this.connections).forEach(conn => {
        if (conn.open) {
            conn.send({
                type: 'GAME_OVER',
                winnerIsYou: !iWon,
                reason: reason || 'safe_destroyed'
            });
        }
    });

    // Also save to Firebase if active
    if (this.db) {
        this.db.ref('battles/' + roomId).set({
            iWon: iWon,
            reason: reason || 'safe_destroyed',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    }
};

// Fired when the local player quits a P2P battle voluntarily. The opponent
// receives winnerIsYou=true with reason=forfeit so they see a proper win screen
// instead of being silently stranded.
NetworkManager.notifyForfeit = function() {
    Object.values(this.connections).forEach(conn => {
        if (conn.open) {
            try {
                conn.send({
                    type: 'GAME_OVER',
                    winnerIsYou: true,
                    reason: 'forfeit'
                });
            } catch (e) { /* swallow — we're leaving anyway */ }
        }
    });
};

// Treat any mid-battle close as a forfeit by the remote side.
function _watchConnectionForMidBattleClose(conn) {
    if (!conn || conn._bcCloseWatched) return;
    conn._bcCloseWatched = true;
    conn.on('close', () => {
        // currentState and GAME_STATE are `let`/`const` in globals.js/config.js — they're
        // in scope here at script level (both files load before net-sync.js), but they
        // don't attach to `window`, so we access them via their bare names.
        const inBattle = typeof currentBattleRoom !== 'undefined' && !!currentBattleRoom;
        const notOver = typeof currentState !== 'undefined'
            && typeof GAME_STATE !== 'undefined'
            && currentState !== GAME_STATE.GAMEOVER;
        if (inBattle && notOver && typeof handleNetworkGameOver === 'function') {
            handleNetworkGameOver({ winnerIsYou: true, reason: 'forfeit' });
        }
    });
}
NetworkManager._watchConnectionForMidBattleClose = _watchConnectionForMidBattleClose;

// Connect to another player's code ("BC-ABCD" or just the 4-char suffix) and send an invite.
NetworkManager.joinRoom = function(roomCode) {
    if (!this.peer) {
        if (typeof showTransientToast === 'function') {
            showTransientToast("החיבור לרשת עדיין לא מוכן - נסה שוב בעוד רגע");
        }
        return;
    }

    let targetId = roomCode.trim().toUpperCase();
    if (!targetId.startsWith("BC-")) targetId = "BC-" + targetId;

    if (targetId === this.peer.id) {
        if (typeof showTransientToast === 'function') {
            showTransientToast("זה הקוד שלך! שלח אותו לחבר כדי שיוכל להזמין אותך.");
        } else {
            console.warn("זה הקוד שלך!");
        }
        return;
    }

    console.log("📡 Attempting to connect to " + targetId);
    const conn = this.peer.connect(targetId, { reliable: true });

    const failTimer = setTimeout(() => {
        if (!conn.open) {
            try { conn.close(); } catch (e) {}
            if (typeof showTransientToast === 'function') {
                showTransientToast("לא הצלחנו להתחבר לקוד " + targetId.replace("BC-", ""));
            }
        }
    }, 6000);

    conn.on('open', () => {
        clearTimeout(failTimer);
        const roomId = "ROOM-" + Math.random().toString(36).substr(2, 6).toUpperCase();
        this.connections[conn.peer] = conn;
        NetworkManager._watchConnectionForMidBattleClose(conn);
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
                if (typeof handleNetworkGameOver === 'function') handleNetworkGameOver(data);
            }
        });
    });

    conn.on('error', (err) => {
        clearTimeout(failTimer);
        console.error("📡 Connect error:", err);
    });
};
