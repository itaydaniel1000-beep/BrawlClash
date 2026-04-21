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

NetworkManager.joinRoom = function(roomId) {
    console.log("📡 Network: Attempting to join " + roomId);
    // PeerJS logic to connect to host via roomId...
    // In this simplified version, we'll just mock the connection
};
