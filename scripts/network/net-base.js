// net-base.js - Network Configuration and Initialization

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

    isConfigured: function() {
        return firebaseConfig.apiKey !== "YOUR_API_KEY";
    },

    init: function(username) {
        this.currentUsername = username;
        if (!this.isConfigured()) {
            console.warn("⚠️ NetworkManager: Firebase not configured. Multiplayer disabled.");
            return;
        }

        if (!window.firebase || !window.Peer) {
            console.error("❌ Dependencies missing (Firebase/PeerJS)");
            return;
        }

        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        this.db = firebase.database();
        
        // Initialize PeerJS
        const peerId = "BC-" + Math.random().toString(36).substr(2, 4).toUpperCase();
        this.peer = new Peer(peerId);

        this.peer.on('open', (id) => {
            console.log("📡 PeerJS: Connected with ID: " + id);
            this.updatePresence(id);
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
