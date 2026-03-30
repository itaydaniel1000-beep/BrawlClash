// --- PeerJS Multiplayer Bridge - Isolated Edition ---
// This version strictly avoids global variable pollution.

(function() {
  let peerInstance = null;
  let activeConnection = null;
  let p2pStatus = { isHost: false };

  window.NetworkManager = {
    isConfigured: () => true,
    
    // Getters for status
    isHost: () => p2pStatus.isHost,
    getConnection: () => activeConnection,

    init: (username, callback) => {
      const peerId = 'BrawlClash-' + Math.random().toString(36).substr(2, 6).toUpperCase();
      peerInstance = new Peer(peerId);

      peerInstance.on('open', (id) => {
        console.log('✅ PeerJS Connected. ID:', id);
        if (callback) callback(id);
      });

      peerInstance.on('connection', (conn) => {
          console.log('🤝 Partner joined!');
          activeConnection = conn;
          p2pStatus.isHost = true;
          setupConnectionListeners(conn);
          window.dispatchEvent(new CustomEvent('battleAccepted', { 
              detail: { roomId: peerInstance.id, opponent: 'Partner', isHost: true } 
          }));
      });

      peerInstance.on('error', (err) => {
          console.error('❌ PeerJS Error:', err);
      });
    },

    updatePresence: (username) => {
      console.log(`[PeerJS] User ${username} ready.`);
    },

    listenOnlinePlayers: (callback) => {
      callback(1, { "אתה": { last_active: Date.now() } });
    },

    joinRoom: (roomId) => {
      console.log('🚀 Joining room:', roomId);
      activeConnection = peerInstance.connect(roomId);
      p2pStatus.isHost = false;
      setupConnectionListeners(activeConnection);

      activeConnection.on('open', () => {
          window.dispatchEvent(new CustomEvent('battleAccepted', { 
              detail: { roomId: roomId, opponent: 'Host', isHost: false } 
          }));
      });
    },

    syncSpawn: (roomId, x, y, typeStr) => {
      if (activeConnection && activeConnection.open) {
          activeConnection.send({ type: 'spawn', x, y, typeStr });
      }
    },

    listenSpawns: (roomId, callback) => {
      window.addEventListener('remoteSpawn', (e) => callback(e.detail));
    },

    updateBattleResult: (roomId, winner) => {
      if (activeConnection && activeConnection.open) {
          activeConnection.send({ type: 'gameOver', winner });
      }
    },

    listenBattleStatus: (roomId, callback) => {
      window.addEventListener('remoteGameOver', (e) => callback('finished', e.detail.winner));
    },

    sendEmote: (roomId, username, emoteId) => {
      if (activeConnection && activeConnection.open) {
          activeConnection.send({ type: 'emote', username, emoteId });
      }
    },

    listenEmotes: (roomId, callback) => {
      window.addEventListener('remoteEmote', (e) => callback(e.detail));
    },

    syncHealth: (roomId, hpData) => {
      if (activeConnection && activeConnection.open) {
          activeConnection.send({ type: 'healthSync', hpData });
      }
    },

    listenHealth: (roomId, callback) => {
      window.addEventListener('remoteHealth', (e) => callback(e.detail.hpData));
    }
  };

  function setupConnectionListeners(conn) {
    conn.on('data', (data) => {
        if (data.type === 'spawn') {
            window.dispatchEvent(new CustomEvent('remoteSpawn', { detail: data }));
        } else if (data.type === 'gameOver') {
            window.dispatchEvent(new CustomEvent('remoteGameOver', { detail: data }));
        } else if (data.type === 'emote') {
            window.dispatchEvent(new CustomEvent('remoteEmote', { detail: data }));
        } else if (data.type === 'healthSync') {
            window.dispatchEvent(new CustomEvent('remoteHealth', { detail: data }));
        }
    });

    conn.on('close', () => {
        console.log('🔌 Connection closed');
        activeConnection = null;
    });
  }
})();
