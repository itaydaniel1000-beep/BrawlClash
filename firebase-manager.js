// --- Firebase + PeerJS Multiplayer Bridge ---
// Enables global discovery and bot-free player lists.

(function() {
  let peerInstance = null;
  let activeConnection = null;
  let p2pStatus = { isHost: false };
  let db = null;

  // --- ⚠️ המשתמש חייב להזין את ה-Firebase Config שלו כאן כדי שזה יעבוד גלובלית! ⚠️ ---
  const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_ID",
    appId: "YOUR_APP_ID"
  };

  // Initialize Firebase (if config is valid)
  if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
  }

  window.NetworkManager = {
    isConfigured: () => true, // Enabled by default to show UI
    isHost: () => p2pStatus.isHost,
    getConnection: () => activeConnection,

    init: (username, callback) => {
      const peerId = 'BrawlClash-' + username.replace(/\s+/g, '_') + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
      peerInstance = new Peer(peerId);

      peerInstance.on('open', (id) => {
        console.log('✅ PeerJS Connected. ID:', id);
        if (callback) callback(id);
        
        // Register Global Presence in Firebase
        if (db) {
          const presenceRef = db.ref('presence/' + id);
          presenceRef.set({ username, last_active: Date.now() });
          presenceRef.onDisconnect().remove();
        } else {
          // MOCK: Add self to local list for testing
          onlinePlayers[id] = { username, last_active: Date.now() };
          window.dispatchEvent(new CustomEvent('presenceUpdated', { detail: onlinePlayers }));
        }
      });

      peerInstance.on('connection', (conn) => {
          activeConnection = conn;
          setupConnectionListeners(conn);
      });
    },

    listenOnlinePlayers: (callback) => {
      if (db) {
        const presenceRef = db.ref('presence');
        presenceRef.on('value', (snapshot) => {
          const players = snapshot.val() || {};
          const count = Object.keys(players).length;
          callback(count, players);
        });
      } else {
        // Local fallback if no Firebase config
        window.addEventListener('presenceUpdated', (e) => {
          callback(Object.keys(e.detail).length, e.detail);
        });
        callback(Object.keys(onlinePlayers).length, onlinePlayers);
      }
    },

    sendInvite: (targetPeerId, senderName) => {
      console.log(`⚔️ Sending invite to ${targetPeerId}`);
      const conn = peerInstance.connect(targetPeerId);
      conn.on('open', () => {
        conn.send({ type: 'invite', from: senderName, fromId: peerInstance.id });
      });
    },

    joinRoom: (roomId) => {
      console.log('🚀 Joining room:', roomId);
      activeConnection = peerInstance.connect(roomId);
      p2pStatus.isHost = false;
      setupConnectionListeners(activeConnection);

      activeConnection.on('open', () => {
          activeConnection.send({ type: 'invite_accepted' });
          window.dispatchEvent(new CustomEvent('battleAccepted', { 
              detail: { roomId: roomId, opponent: 'Partner', isHost: false } 
          }));
      });
    },

    syncSpawn: (roomId, x, y, typeStr) => {
      if (activeConnection && activeConnection.open) activeConnection.send({ type: 'spawn', x, y, typeStr });
    },

    listenSpawns: (roomId, callback) => {
      window.addEventListener('remoteSpawn', (e) => callback(e.detail));
    },

    updateBattleResult: (roomId, winner) => {
      if (activeConnection && activeConnection.open) activeConnection.send({ type: 'gameOver', winner });
    },

    listenBattleStatus: (roomId, callback) => {
      window.addEventListener('remoteGameOver', (e) => callback('finished', e.detail.winner));
    },

    sendEmote: (roomId, username, emoteId) => {
      if (activeConnection && activeConnection.open) activeConnection.send({ type: 'emote', username, emoteId });
    },

    listenEmotes: (roomId, callback) => {
      window.addEventListener('remoteEmote', (e) => callback(e.detail));
    },

    syncHealth: (roomId, hpData) => {
      if (activeConnection && activeConnection.open) activeConnection.send({ type: 'healthSync', hpData });
    },

    listenHealth: (roomId, callback) => {
      window.addEventListener('remoteHealth', (e) => callback(e.detail.hpData));
    }
  };

  function setupConnectionListeners(conn) {
    conn.on('data', (data) => {
        if (data.type === 'invite') {
            window.dispatchEvent(new CustomEvent('remoteInvite', { detail: data }));
        } else if (data.type === 'invite_accepted') {
            window.dispatchEvent(new CustomEvent('battleAccepted', { 
                detail: { roomId: conn.peer, opponent: 'Partner', isHost: true } 
            }));
        } else if (data.type === 'spawn') {
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

