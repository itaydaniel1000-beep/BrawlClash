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
        const peerId = "BC-" + Math.random().toString(36).substr(2, 4).toUpperCase();
        this.peer = new Peer(peerId, {
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' },
                    {
                        urls: 'turn:openrelay.metered.ca:80',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    },
                    {
                        urls: 'turn:openrelay.metered.ca:443',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    }
                ]
            }
        });

        this.peer.on('open', (id) => {
            console.log("📡 PeerJS: Connected with ID: " + id);
            if (this.db) this.updatePresence(id);
            // Refresh the social overlay's code display if it's open
            const myIdDisplay = document.getElementById('my-peer-id-display');
            if (myIdDisplay) {
                const parts = id.split('-');
                myIdDisplay.innerText = parts[parts.length - 1];
                myIdDisplay.setAttribute('data-full-id', id);
            }
        });

        this.peer.on('connection', (conn) => {
            this.handleConnection(conn);
        });

        this.peer.on('error', (err) => {
            console.error("📡 PeerJS Error:", err);
        });
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
