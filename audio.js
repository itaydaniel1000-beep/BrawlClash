// audio.js - Audio Controller and Brawler Voices

const AudioController = {
    isMuted: false, 
    isUnlocked: false,
    sounds: {
        'upgrade': 'https://raw.githubusercontent.com/BrawlAPI/Assets/master/sounds/sfx/sfx_upgrade_01.wav',
        'beep': 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'
    },
    play: function(id) {
        if (this.isMuted) return;
        const src = this.sounds[id];
        if (src) {
            try {
                const audio = new Audio(src);
                audio.play().catch(e => console.warn("Audio Play Ignored (Auto-Play Policy)"));
            } catch (err) {}
        }
    },
    playVoice: function(brawlerId) {
        if (!this.isUnlocked || !BRAWLER_VOICES[brawlerId]) return;
        const lines = BRAWLER_VOICES[brawlerId];
        const randomLine = lines[Math.floor(Math.random() * lines.length)];
        
        try {
            const audio = new Audio(randomLine);
            audio.volume = 0.8;
            audio.play().catch(e => {
                if (e.name === 'NotSupportedError') {
                    console.warn(`🔇 Voice line not supported or broken for ${brawlerId}: ${randomLine}`);
                } else {
                    console.error("Voice Play Error:", e);
                }
            });
        } catch (err) {
            console.warn(`❌ Failed to create Audio object for ${brawlerId}`);
        }
    },
    unlock: function() {
        if (this.isUnlocked) return;
        this.isUnlocked = true;
        this.play('beep');
        console.log("🔊 Audio Unlocked");
        if (currentState === GAME_STATE.MENU && typeof playLobbyCharacterSound === 'function') {
            playLobbyCharacterSound();
        }
    },
    toggleMute: function() {
        this.isMuted = !this.isMuted;
        localStorage.setItem('brawlclash_muted', this.isMuted);
    }
};

const BRAWLER_VOICES = {
    'scrappy': ['https://raw.githubusercontent.com/BrawlAPI/Assets/master/sounds/brawlers/jessie/jessie_happy_1.wav', 'https://raw.githubusercontent.com/BrawlAPI/Assets/master/sounds/brawlers/jessie/jessie_happy_3.wav'],
    'penny': ['https://raw.githubusercontent.com/BrawlAPI/Assets/master/sounds/brawlers/penny/penny_happy_1.wav'],
    'bruce': ['https://raw.githubusercontent.com/BrawlAPI/Assets/master/sounds/brawlers/nita/nita_intro_1.wav', 'https://raw.githubusercontent.com/BrawlAPI/Assets/master/sounds/brawlers/nita/nita_happy_1.wav'],
    'pam': ['https://raw.githubusercontent.com/BrawlAPI/Assets/master/sounds/brawlers/pam/pam_happy_1.wav'],
    'bull': ['https://raw.githubusercontent.com/BrawlAPI/Assets/master/sounds/brawlers/bull/bull_happy_1.wav'],
    'leon': ['https://raw.githubusercontent.com/BrawlAPI/Assets/master/sounds/brawlers/leon/leon_happy_1.wav'],
    'emz': ['https://raw.githubusercontent.com/BrawlAPI/Assets/master/sounds/brawlers/emz/emz_happy_1.wav'],
    'max': ['https://raw.githubusercontent.com/BrawlAPI/Assets/master/sounds/brawlers/max/max_happy_1.wav'],
    '8bit': ['https://raw.githubusercontent.com/BrawlAPI/Assets/master/sounds/brawlers/8bit/8bit_happy_1.wav'],
    'tara': ['https://raw.githubusercontent.com/BrawlAPI/Assets/master/sounds/brawlers/tara/tara_happy_2.wav'],
    'mr-p': ['https://raw.githubusercontent.com/BrawlAPI/Assets/master/sounds/brawlers/mrp/mrp_happy_1.wav'],
    'spike': ['https://raw.githubusercontent.com/BrawlAPI/Assets/master/sounds/sfx/sfx_bush_enter.wav']
};

function playLobbyCharacterSound() {
    if (currentState !== GAME_STATE.MENU || !AudioController.isUnlocked) return;
    const featuredKey = favoriteBrawler || (playerDeck && playerDeck[0]);
    if (featuredKey && BRAWLER_VOICES[featuredKey]) {
        AudioController.playVoice(featuredKey);
    }
}

// Global listeners
window.addEventListener('click', () => AudioController.unlock(), { once: true });
setInterval(playLobbyCharacterSound, 10000);
