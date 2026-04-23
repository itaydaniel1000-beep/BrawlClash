// net-base.js - Network Configuration and Initialization
// Peer-to-peer multiplayer via PeerJS (no Firebase required — players exchange short codes).

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    databaseURL: "YOUR_DATABASE_URL",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const NetworkManager = {
    peer: null,
    db: null,
    currentUsername: null,
    connections: {},
    onlineRef: null,

    // Firebase is optional. PeerJS runs either way so players can connect via codes.
    hasFirebase: function() {
        return firebaseConfig.apiKey !== "YOUR_API_KEY";
    },

    // Kept for backwards-compat (older callsites check isConfigured)
    isConfigured: function() {
        return true; // PeerJS is always available via the default public broker
    },

    init: function(username) {
        this.currentUsername = username;

        if (!window.Peer) {
            console.error("❌ PeerJS missing — multiplayer disabled");
            return;
        }

        // Optional: Firebase (for global discovery). Skipped when not configured.
        if (this.hasFirebase() && window.firebase) {
            if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
            this.db = firebase.database();
        } else {
            console.info("ℹ️ NetworkManager: running in code-exchange mode (no Firebase)");
        }

        // PeerJS always initialises — uses PeerJS's free default broker.
        // Add public STUN + TURN (Open Relay) so WebRTC can cross restrictive NATs/firewalls.
        // 3-digit numeric battle codes (user-facing shorter than the old 4-char alnum).
        // With only 1000 possible IDs collisions will happen, so we retry on
        // 'unavailable-id' with a freshly-rolled code (up to MAX_TRIES).
        const ICE = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' },
                { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
                { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
            ]
        };
        const MAX_TRIES = 12;
        const self = this;
        const tryOpenPeer = (attempt) => {
            // Pure 3-digit numeric ID (no "BC-" prefix) so the battle code the user
            // reads is exactly what the peer id is — no cognitive split between the
            // display code and the underlying PeerJS identifier.
            const peerId = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            console.log(`📡 PeerJS: trying ID ${peerId} (attempt ${attempt + 1}/${MAX_TRIES})`);
            const p = new Peer(peerId, { config: ICE });

            p.on('open', (id) => {
                self.peer = p;
                console.log("📡 PeerJS: Connected with ID: " + id);
                if (self.db) self.updatePresence(id);
                const myIdDisplay = document.getElementById('my-peer-id-display');
                if (myIdDisplay) {
                    myIdDisplay.innerText = id;
                    myIdDisplay.setAttribute('data-full-id', id);
                }
            });

            p.on('connection', (conn) => self.handleConnection(conn));

            p.on('error', (err) => {
                const isTaken = err && (err.type === 'unavailable-id' || /taken|unavailable/i.test(err.message || ''));
                if (isTaken && attempt + 1 < MAX_TRIES) {
                    console.warn(`📡 PeerJS: ${peerId} taken, rolling another…`);
                    try { p.destroy(); } catch (e) {}
                    tryOpenPeer(attempt + 1);
                    return;
                }
                console.error("📡 PeerJS Error:", err);
            });

            // Expose the in-flight peer immediately so outgoing `.connect()` calls don't
            // race past us while we're still waiting for 'open'.
            self.peer = p;
        };
        tryOpenPeer(0);
    },

    getPeerInstance: function() {
        return this.peer;
    },

    updatePresence: function(peerId) {
        if (!this.db || !this.currentUsername) return;
        this.onlineRef = this.db.ref('online_players/' + this.currentUsername);
        this.onlineRef.set({
            username: this.currentUsername,
            peerId: peerId,
            trophies: window.playerTrophies || 0,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
        this.onlineRef.onDisconnect().remove();
    }
};
window.NetworkManager = NetworkManager;
