// script.js - Main Game Logic for BrawlClash

// --- Constants & Config ---
const CONFIG = {
    CANVAS_WIDTH: 600,
    CANVAS_HEIGHT: 900,
    FPS: 60,
    ELIXIR_GEN_RATE: 1,
    MAX_ELIXIR: 10,
    SAFE_MAX_HP: 5000,
    SAFE_RADIUS: 45,
    SAFE_RANGE: 495, // 450 + 10%
    SAFE_DAMAGE: 150,
    SAFE_ATTACK_SPEED: 1500
};

const ADMIN_USERNAME = 'danniel1234!';

const CARDS = {
    'bruce': { name: 'ברוס', cost: 3, type: 'unit', color: '#8c7ae6', icon: '🐻' },
    'leon': { name: 'ליאון', cost: 8, type: 'unit', color: '#00cec9', icon: '🍭' },
    'bull': { name: 'בול', cost: 6, type: 'unit', color: '#341f97', icon: '🐂' },
    'scrappy': { name: 'ספארקי', cost: 4, type: 'building', color: '#e1b12c', icon: '🐶' },
    'penny': { name: 'פני', cost: 5, type: 'building', color: '#c23616', icon: '💣' },
    'pam': { name: 'פאם', cost: 8, type: 'aura', color: '#44bd32', icon: '💚' },
    'max': { name: 'מקס', cost: 4, type: 'aura', color: '#f1c40f', icon: '⚡' },
    '8bit': { name: '8-ביט', cost: 6, type: 'aura', color: '#e84393', icon: '🕹️' },
    'emz': { name: 'אמז', cost: 7, type: 'aura', color: '#9c88ff', icon: '🧴' },
    'spike': { name: 'ספייק', cost: 5, type: 'aura', color: '#2ecc71', icon: '🌵' },
    'tara': { name: 'טראה', cost: 7, type: 'aura', color: '#636e72', icon: '👁️' },
    'mr-p': { name: 'מיסטר פי', cost: 4, type: 'building', color: '#54a0ff', icon: '🐧' }
};

const STAR_POWERS = {
    'bruce': [
        { id: 'sp1', name: 'פרווה חסינה', desc: 'ברוס מקבל 30% פחות נזק' },
        { id: 'sp2', name: 'מכה רועמת', desc: 'המכה של ברוס מאטה ב-10% לשנייה אחת' }
    ],
    'bull': [
        { id: 'sp1', name: 'עור עבה', desc: 'סופג 30% פחות נזק כל עוד הוא מעל 70% חיים' },
        { id: 'sp2', name: 'מגן הסתערות', desc: 'מגן של 500 חיים ל-5 שניות אחרי דאש' }
    ],
    'scrappy': [
        { id: 'sp1', name: 'טעינה קופצת', desc: 'הכדורים קופצים בין אויבים' },
        { id: 'sp2', name: 'תיקון מהיר', desc: 'הטורט מתקן את עצמו ב-50 חיים לשנייה' }
    ],
    'penny': [
        { id: 'sp1', name: 'כדורי אש', desc: 'הפגזים מבעירים שטח ב-20 נזק לשנייה' },
        { id: 'sp2', name: 'הפצצה אחרונה', desc: 'יורה 4 פצצות כשהוא נהרס' }
    ],
    'pam': [
        { id: 'sp1', name: 'חיבוק של אמא', desc: 'ריפוי מיידי של 500 חיים בהצבה' },
        { id: 'sp2', name: 'לחץ של אמא', desc: 'הילה שפוגעת באויבים ב-20 נזק לשנייה' }
    ],
    'max': [
        { id: 'sp1', name: 'טעינה בתנועה', desc: 'טעינת אליקסיר מהירה ב-10% כשמקס חי' },
        { id: 'sp2', name: 'מהירות על', desc: 'ההילה חסינה להאטות' }
    ],
    '8bit': [
        { id: 'sp1', name: 'מגבר מוגבר', desc: 'טווח הילה גדול ב-50%' },
        { id: 'sp2', name: 'אובר-קלוק', desc: 'נזק מוגבר ב-30% במקום 10%' }
    ],
    'emz': [
        { id: 'sp1', name: 'ריח רע', desc: 'אויבים בהילה סופגים 20% יותר נזק' },
        { id: 'sp2', name: 'הייפ', desc: 'ריפוי של 30 חיים על כל אויב בטווח' }
    ],
    'leon': [
        { id: 'sp1', name: 'מארב', desc: 'נזק כפול במכה הראשונה אחרי יציאה מאי-נראות' },
        { id: 'sp2', name: 'מהירות צל', desc: 'מהירות תנועה גבוהה ב-25% במצב בלתי נראה' }
    ],
    'spike': [
        { id: 'sp1', name: 'דשן', desc: 'ריפוי של 100 חיים לשנייה בתוך ההילה' },
        { id: 'sp2', name: 'קוצים ארוכים', desc: 'זמן הילה ארוך יותר (15 שניות)' }
    ],
    'tara': [
        { id: 'sp1', name: 'פורטל אפל', desc: 'מזמן צל כשההילה נגמרת' },
        { id: 'sp2', name: 'ריפוי שחור', desc: 'הגרביטציה מרפאת יחידות שלך' }
    ],
    'mr-p': [
        { id: 'sp1', name: 'דלת מסתובבת', desc: 'פורטרים יוצאים כל 3 שניות' },
        { id: 'sp2', name: 'טיפול אקסטרה', desc: 'מגן למכה הראשונה של כל פורטר' }
    ]
};

// --- Game State ---
const GAME_STATE = { MENU: 'menu', SP_SELECTION: 'sp_selection', PLAYING: 'playing', GAMEOVER: 'gameover' };
let currentState = GAME_STATE.MENU;
let lastTime = 0;
let difficulty = 'hard';
let isSelectingBullDash = false;
let selectedFreezeCardId = null;
let playerTrophies = parseInt(sessionStorage.getItem('brawlclash_trophies')) || 0;
let spEntrySource = 'battle'; // 'lobby' or 'battle'
let playerDeck = [];
try {
    const savedDeck = sessionStorage.getItem('brawlclash_deck');
    if (savedDeck) playerDeck = JSON.parse(savedDeck);
    else playerDeck = Object.keys(CARDS).slice(0, 8); // Default to first 8
} catch(e) { 
    playerDeck = Object.keys(CARDS).slice(0, 8);
}
let tempDeck = [];
let favoriteBrawler = sessionStorage.getItem('brawlclash_favorite') || null;
let isStarringMode = false;

// --- Player Stats & Levels ---
let playerStats = {
    coins: parseInt(sessionStorage.getItem('brawlclash_coins')) || 1000,
    gems: parseInt(sessionStorage.getItem('brawlclash_gems')) || 100,
    levels: {},
    claimedTiers: JSON.parse(sessionStorage.getItem('brawlclash_claimed')) || [],
    username: sessionStorage.getItem('brawlclash_username') || null
};

// Admin Hacks (Developer Menu)
let adminHacks = {
    infiniteElixir: false,
    godMode: false,
    doubleDamage: false,
    rapidFire: false
};

const MAX_LEVEL = 12;

// Initialize levels & clamp to max
// Initialize levels & clamp to max
Object.keys(CARDS).forEach(id => {
    let lvl = parseInt(sessionStorage.getItem(`brawlclash_level_${id}`)) || 1;
    if (lvl > MAX_LEVEL) {
        lvl = MAX_LEVEL;
        sessionStorage.setItem(`brawlclash_level_${id}`, MAX_LEVEL);
    }
    playerStats.levels[id] = lvl;
});

function saveStats() {
    sessionStorage.setItem('brawlclash_coins', playerStats.coins);
    sessionStorage.setItem('brawlclash_gems', playerStats.gems);
    sessionStorage.setItem('brawlclash_claimed', JSON.stringify(playerStats.claimedTiers));
    if (playerStats.username) sessionStorage.setItem('brawlclash_username', playerStats.username);
    Object.keys(playerStats.levels).forEach(id => {
        sessionStorage.setItem(`brawlclash_level_${id}`, playerStats.levels[id]);
    });
}

function getLevelScale(id) {
    const level = playerStats.levels[id] || 1;
    return 1 + (level - 1) * 0.05;
}

// --- Sound Controller ---
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
            const audio = new Audio(src);
            audio.play().catch(e => console.error("Audio Play Error:", e));
        }
    },
    playVoice: function(brawlerId) {
        if (!this.isUnlocked || !BRAWLER_VOICES[brawlerId]) return;
        const lines = BRAWLER_VOICES[brawlerId];
        const randomLine = lines[Math.floor(Math.random() * lines.length)];
        const audio = new Audio(randomLine);
        audio.volume = 0.8;
        audio.play().catch(e => console.error("Voice Play Error:", e));
    },
    unlock: function() {
        this.isUnlocked = true;
        this.play('beep');
        console.log("🔊 Audio Unlocked");
        if (currentState === GAME_STATE.MENU) playLobbyCharacterSound();
    },
    toggleMute: function() {
        this.isMuted = !this.isMuted;
        sessionStorage.setItem('brawlclash_muted', this.isMuted);
    }
};

// --- Brawler Voice Lines Mapping ---
const BRAWLER_VOICES = {
    'scrappy': ['https://raw.githubusercontent.com/BrawlAPI/Assets/master/sounds/brawlers/jessie/jessie_happy_1.wav', 'https://raw.githubusercontent.com/BrawlAPI/Assets/master/sounds/brawlers/jessie/jessie_happy_3.wav'],
    'penny': ['https://raw.githubusercontent.com/BrawlAPI/Assets/master/sounds/brawlers/penny/penny_happy_1.wav'],
    'bruce': ['https://raw.githubusercontent.com/BrawlAPI/Assets/master/sounds/brawlers/nita/nita_happy_1.wav'],
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
document.addEventListener('click', (e) => {
    if (e.target.closest('#sound-test-btn')) {
        alert("בודק סאונד...");
        AudioController.unlock();
    }
});

setInterval(playLobbyCharacterSound, 10000);

// Entities
let units = [];
let projectiles = [];
let auras = [];
let buildings = [];
let floatingTexts = [];
let particles = [];
let screenShakeTime = 0;
let screenShakeIntensity = 0;

// Player Stats
let playerElixir = 5;
let enemyElixir = 5;
let playerMaxElixir = 10;
let playerKills = 0;
let playerSafe = null;
let enemySafe = null;
let aiDeaths = [];
let pendingRebuilds = [];
let hardAIState = 0;
let aiDelayTimer = 0;
let hardAIAttackY = 250;
let hardAIEmzPlaced = false;
let aiWavePreparation = false;
let aiWaveStartTime = 0;
let aiWaveUnitsSpawned = 0;


// Load Star Powers from LocalStorage if available
let playerStarPowers = {};
try {
    const saved = sessionStorage.getItem('brawlclash_sp');
    if (saved) playerStarPowers = JSON.parse(saved);
} catch (e) { console.error("Error loading SP", e); }

// DOM
let canvas = null;
let ctx = null;

function setupCanvas() {
    canvas = document.getElementById('game-canvas');
    if (canvas) {
        ctx = canvas.getContext('2d');
        canvas.width = CONFIG.CANVAS_WIDTH;
        canvas.height = CONFIG.CANVAS_HEIGHT;
        console.log("📏 Canvas initialized:", canvas.width, "x", canvas.height);
    }
}
const screens = document.querySelectorAll('.screen');
const quitBtn = document.getElementById('quit-btn');
const restartBtn = document.getElementById('restart-btn');
const spSelectionMenu = document.getElementById('sp-selection-menu');
const spCardsContainer = document.getElementById('sp-cards-container');
const confirmSPBtn = document.getElementById('confirm-sp-btn');
const elixirFill = document.getElementById('elixir-fill');
const elixirText = document.getElementById('elixir-text');
const deckContainer = document.getElementById('deck-container');

// Screen management helper functions
function openScreen(screenId) {
    if (screenId === 'sp-selection-menu') {
        renderSPCards();
    } else if (screenId === 'brawl-pass-screen') {
        renderBrawlPass();
    } else if (screenId === 'shop-screen') {
        renderShop();
    } else if (screenId === 'leaderboard-screen') {
        renderLeaderboard();
    }
    
    document.getElementById(screenId).style.display = 'flex';
}

function closeScreen(screenId) {
    document.getElementById(screenId).style.display = 'none';
}

function formatNumber(num) {
    if (num === Infinity) return "∞";
    if (num < 1000) return num.toString();
    
    const units = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td', 'qad', 'qid', 'sxd', 'spd', 'ocd', 'nod', 'vg'];
    let unitIndex = 0;
    let scaledNum = num;
    
    while (scaledNum >= 1000 && unitIndex < units.length - 1) {
        scaledNum /= 1000;
        unitIndex++;
    }
    
    // If it's still >= 1000 after all suffixes, or the number is extremely large (scientific)
    if (scaledNum >= 1000 || num >= 1e66) {
        return num.toExponential(1).replace('e+', 'e');
    }
    
    return scaledNum.toFixed(1).replace(/\.0$/, '') + units[unitIndex];
}

// Stats UI updater
function updateStatsUI() {
    document.querySelectorAll('.resource-item.coins .resource-value').forEach(el => el.innerText = formatNumber(playerStats.coins));
    document.querySelectorAll('.resource-item.gems .resource-value').forEach(el => el.innerText = formatNumber(playerStats.gems));
    const usernameEl = document.querySelector('.user-name');
    if (usernameEl && playerStats.username) usernameEl.innerText = playerStats.username;
    const trophyEl = document.getElementById('trophy-count');
    if (trophyEl) trophyEl.innerText = playerTrophies.toLocaleString();

    // Toggle Admin Gear visibility
    const adminBtn = document.querySelector('.admin-btn');
    if (adminBtn) {
        const isAdmin = playerStats.username && playerStats.username.trim() === ADMIN_USERNAME;
        adminBtn.style.display = isAdmin ? 'flex' : 'none';
        console.log(`Admin Check: name="${playerStats.username}", isAdmin=${isAdmin}`);
    }
}

// Attach event listeners to sidebar buttons
document.addEventListener('DOMContentLoaded', () => {
    const shopBtn = document.querySelector('.shop-btn');
    if (shopBtn) shopBtn.addEventListener('click', () => openScreen('shop-screen'));
    
    const settingsBtn_old = document.getElementById('home-settings-btn');
    // Consolidating with the sidebar toggle listener below

    const bpBtn = document.querySelector('.brawl-pass-btn');
    if (bpBtn) bpBtn.addEventListener('click', () => openScreen('brawl-pass-screen'));

    // Hook up leaderboard to Club or Social btn for now
    const socialBtn = document.querySelector('.social-btn');
    if (socialBtn) socialBtn.addEventListener('click', () => openScreen('leaderboard-screen'));
    
    updateStatsUI();
});

// --- Classes ---
class Entity {
    constructor(x, y, radius, team) {
        this.x = x; this.y = y; this.radius = radius; this.team = team;
        this.hp = 100;
        this.maxHp = 100;
        this.isDead = false;
        this.isFrozen = false;
        this.lastDamageTime = 0;
        this.shieldHp = 0;
        this.spawnTime = performance.now();
        this.deathLogged = false;
    }

    takeDamage(amount) {
        if (this.isDead) return;
        if (this.team === 'player' && adminHacks.godMode) return; // God Mode: no damage

        let finalAmount = amount;
        if (this.team === 'enemy' && adminHacks.doubleDamage) finalAmount *= 2; // Extra damage TO enemies
        // SP: Bruce Tough Fur (SP1)
        if (this.type === 'bruce' && this.team === 'player' && playerStarPowers['bruce'] === 'sp1') {
            finalAmount *= 0.7; // 30% reduction
        }

        // SP: Bull Thick Skin (SP1)
        if (this.type === 'bull' && this.team === 'player' && playerStarPowers['bull'] === 'sp1') {
            if (this.hp > this.maxHp * 0.7) finalAmount *= 0.7; // 30% reduction
        }

        // Shield logic (Bull SP2, Mr. P SP2)
        if (this.shieldHp > 0) {
            if (finalAmount <= this.shieldHp) {
                this.shieldHp -= finalAmount;
                finalAmount = 0;
            } else {
                finalAmount -= this.shieldHp;
                this.shieldHp = 0;
            }
        }

        this.hp -= finalAmount;
        this.lastDamageTime = performance.now();
        
        // Visual: Floating Text
        floatingTexts.push(new FloatingText(this.x, this.y, `-${Math.round(finalAmount)}`, '#ff7675'));
        
        // Visual: Screen Shake on Safes
        if (this instanceof Safe && finalAmount > 50) {
            screenShakeTime = 10; // 10 frames
            screenShakeIntensity = 5;
        }

        if (this.hp <= 0) {
            this.hp = 0;
            this.isDead = true;
            AudioController.play('death');

            // Visual: Death Particles
            for(let i=0; i<10; i++) particles.push(new Particle(this.x, this.y, this.color || '#fff'));

            // SP: Penny Last Blast (SP2)
            if (this.type === 'penny' && this.team === 'player' && playerStarPowers['penny'] === 'sp2') {
                for (let i = 0; i < 4; i++) {
                    let fakeTarget = { x: this.x + (Math.random() - 0.5) * 200, y: this.y + (Math.random() - 0.5) * 200, radius: 20 };
                    projectiles.push(new Projectile(this.x, this.y, fakeTarget, 200, this.team, false));
                }
            }
        }
    }
    drawHpBar(ctx, yOffset = 2) {
        ctx.save();
        const hpPercent = Math.max(0, this.hp / this.maxHp);
        const barWidth = 40;
        const barHeight = 6;

        if (this.shieldHp > 0) {
            ctx.fillStyle = '#7ed6df'; // Light blue for shield
            ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - yOffset - barHeight - 2, barWidth * (this.shieldHp / 500), barHeight / 2);
        }

        ctx.fillStyle = '#000';
        ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - yOffset, barWidth, barHeight);
        ctx.fillStyle = this.team === 'player' ? '#74b9ff' : '#ff7675';
        ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - yOffset, barWidth * hpPercent, barHeight);
        ctx.restore();
    }
}

class Safe extends Entity {
    constructor(x, y, team) {
        super(x, y, CONFIG.SAFE_RADIUS, team);
        this.maxHp = CONFIG.SAFE_MAX_HP;
        this.hp = CONFIG.SAFE_MAX_HP;
        this.lastAttackTime = 0;
    }
    update(dt, now) {
        if (this.isDead || this.isFrozen) return; // Frozen Safes don't shoot!

        let atkSpeedMult = 1;
        let damageMult = 1;
        auras.forEach(a => {
            if (!a.isFrozen && a.team === this.team && Math.hypot(this.x - a.x, this.y - a.y) <= a.radius) {
                if (a.type === 'max') atkSpeedMult = 0.5;
                if (a.type === '8bit') damageMult = 1.1; // 10% damage boost
            }
        });

        if (difficulty === 'hard' && this.team === 'enemy') {
            damageMult *= 0.8; // Reduced damage by 20%
        }

        if (now - this.lastAttackTime > CONFIG.SAFE_ATTACK_SPEED * atkSpeedMult) {
            let target = this.findTargetInHalf();
            if (target) {
                projectiles.push(new Projectile(this.x, this.y, target, CONFIG.SAFE_DAMAGE * damageMult, this.team, false));
                this.lastAttackTime = now;
            }
        }
    }
    findTargetInHalf() {
        let enemies = units.concat(buildings, auras).filter(u => u.team !== this.team && !u.isInvisible && !u.isFrozen);
        let validEnemies = enemies.filter(e => {
            let inHalf = this.team === 'player' ? e.y > CONFIG.CANVAS_HEIGHT / 2 : e.y < CONFIG.CANVAS_HEIGHT / 2;
            return inHalf && Math.hypot(e.x - this.x, e.y - this.y) <= CONFIG.SAFE_RANGE;
        });
        if (validEnemies.length > 0) {
            validEnemies.sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y));
            return validEnemies[0];
        }
        return null;
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        const safeColor = this.isFrozen ? '#74b9ff' : (this.team === 'player' ? '#0984e3' : '#d63031');

        // Filled square with black border
        ctx.fillStyle = safeColor;
        ctx.fillRect(-this.radius - 6, -this.radius - 6, (this.radius + 6) * 2, (this.radius + 6) * 2);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeRect(-this.radius - 6, -this.radius - 6, (this.radius + 6) * 2, (this.radius + 6) * 2);

        // Circle on top, same color, no border
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = safeColor;
        ctx.fill();

        ctx.fillStyle = '#ffeaa7';
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();

        ctx.restore();

        const hpPercent = Math.max(0, this.hp / this.maxHp);
        ctx.fillStyle = '#000'; ctx.fillRect(this.x - 40, this.y - 60, 80, 10);
        ctx.fillStyle = this.team === 'player' ? '#74b9ff' : '#ff7675';
        ctx.fillRect(this.x - 40, this.y - 60, 80 * hpPercent, 10);
        ctx.fillStyle = 'white'; ctx.font = '12px Arial'; ctx.textAlign = 'center';
        ctx.fillText(`${Math.floor(this.hp)}`, this.x, this.y - 50);
    }
}

class Unit extends Entity {
    constructor(x, y, radius, team, type) {
        super(x, y, radius, team);
        this.type = type;
        this.speed = 60; // px per sec
        this.attackRange = 55; // 50 + 10%
        this.attackDamage = 50;
        this.attackSpeed = 1000;
        this.lastAttackTime = 0;
        this.target = null;
        this.color = CARDS[type] ? CARDS[type].color : '#fff';
        this.isInvisible = false;
        this.icon = CARDS[type] ? CARDS[type].icon : '🐧';
        this.hasDashed = false;

        if (type === 'bruce') {
            this.maxHp = 1200; this.hp = 1200; this.attackDamage = 150; this.speed = 50; this.color = '#8c7ae6';
        } else if (type === 'bull') {
            this.maxHp = 1150; this.hp = 1150; this.attackDamage = 280; this.speed = 50; this.color = '#341f97';
        } else if (type === 'leon') {
            this.maxHp = 900; this.hp = 900; this.attackDamage = 200; this.speed = 50 * 1.3; this.color = '#00cec9';
            this.isInvisible = true; // Invincible and invisible until attack
            this.hasAmbush = (team === 'player' && playerStarPowers['leon'] === 'sp1');
        } else if (type === 'porter') {
            this.maxHp = 100; this.hp = 100; this.attackDamage = 50; this.speed = 70; this.color = '#54a0ff';
            // SP: Mr. P Extra Treatment (SP2)
            if (team === 'player' && playerStarPowers['mr-p'] === 'sp2') {
                this.shieldHp = 500; // One-hit shield (high hp so it lasts one hit)
            }
        }

        // Apply Level Scaling (5% per level)
        if (team === 'player') {
            const scale = getLevelScale(type);
            this.maxHp *= scale;
            this.hp = this.maxHp;
            this.attackDamage *= scale;
        }
    }

    update(dt, now) {
        if (this.isDead || this.isFrozen) return;

        // Apply auras
        let speedMult = 1;
        let atkSpeedMult = 1;
        let damageMult = 1;

        // SP: 8-bit Overclocked (SP2)
        let dmgBoost = (playerStarPowers['8bit'] === 'sp2' && this.team === 'player') ? 0.3 : 0.1;

        auras.forEach(a => {
            if (a.isDead || a.isFrozen) return;
            let distToAura = Math.hypot(this.x - a.x, this.y - a.y);
            if (distToAura <= a.radius) {
                if (a.team === this.team) {
                    // ALLY AURAS
                    if (a.type === 'max') {
                        speedMult *= 1.5;
                    } else if (a.type === '8bit') {
                        damageMult *= (1 + dmgBoost);
                    } else if (a.type === 'pam' && this.team === 'player' && playerStarPowers['pam'] === 'sp2') {
                        // Managed in Aura.update to damage ENEMIES
                    }
                    // SP: Spike Fertilize (SP1) - handled in Aura.update to HEAL
                } else {
                    // ENEMY AURAS
                    if (a.type === 'spike') {
                        let canSlow = true;
                        // SP: Max Super Speed (SP2) - immune to slows if in Max aura
                        if (this.team === 'player' && playerStarPowers['max'] === 'sp2') {
                            let inMaxAura = auras.some(ma => ma.team === this.team && ma.type === 'max' && !ma.isDead && !ma.isFrozen && Math.hypot(this.x - ma.x, this.y - ma.y) <= ma.radius);
                            if (inMaxAura) canSlow = false;
                        }
                        if (canSlow) speedMult *= 0.5;
                    } else if (a.type === 'tara') {
                        let dx = a.x - this.x;
                        let dy = a.y - this.y;
                        let dist = Math.hypot(dx, dy);
                        if (dist > 5) {
                            let pullStrength = 150;
                            this.x += (dx / dist) * pullStrength * (dt / 1000);
                            this.y += (dy / dist) * pullStrength * (dt / 1000);
                        }
                    } else if (a.type === 'emz' && a.team === 'player' && playerStarPowers['emz'] === 'sp1') {
                        damageMult *= 1.2; // SP: Emz Bad Buzz (SP1)
                    }
                }
            }
        });

        // SP: Leon Smoke Trails (SP2)
        if (this.type === 'leon' && this.team === 'player' && playerStarPowers['leon'] === 'sp2' && this.isInvisible) {
            speedMult *= 1.25;
        }

        // Target acquisition
        if (this.type === 'bull' || this.type === 'porter') {
            let enemies = units.concat(buildings, auras).concat([playerSafe, enemySafe].filter(s => s)).filter(e => e && e.team !== this.team && !e.isInvisible && !e.isDead && !e.isFrozen);
            this.target = enemies.length > 0 ? enemies.sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y))[0] : null;
        } else {
            this.target = this.team === 'player' ? enemySafe : playerSafe;
        }

        if (this.target && !this.target.isDead) {
            let dist = Math.hypot(this.target.x - this.x, this.target.y - this.y);
            if (dist <= this.attackRange + this.target.radius) {
                // Attack
                if (now - this.lastAttackTime > this.attackSpeed * atkSpeedMult) {
                    if (this.isInvisible) this.isInvisible = false; // Reveal on attack

                    let dmg = this.attackDamage * damageMult;
                    // SP: Leon Ambush (SP1)
                    if (this.hasAmbush) {
                        dmg *= 2;
                        this.hasAmbush = false; // Consume ambush
                    }

                    this.target.takeDamage(dmg);
                    this.lastAttackTime = now;

                    // SP: Bruce Stun/Slow (SP2)
                    if (this.type === 'bruce' && this.team === 'player' && playerStarPowers['bruce'] === 'sp2') {
                        this.target.isFrozen = true;
                        setTimeout(() => { if (this.target) this.target.isFrozen = false; }, 1000);
                    }

                    // Melee punch effect
                    projectiles.push(new MeleeEffect(this.x + (this.target.x - this.x) * 0.5, this.y + (this.target.y - this.y) * 0.5));
                }
            } else {
                // Move towards
                let angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
                let dashMult = (now < (this.dashEndTime || 0)) ? 5 : 1; // 5x speed during dash

                // SP: Bull Charging Shield (SP2)
                if (this.type === 'bull' && this.team === 'player' && playerStarPowers['bull'] === 'sp2' && dashMult > 1) {
                    this.shieldHp = 500;
                }

                if (this.type === 'bull') {
                    this.isInvisible = (dashMult > 1);
                }

                this.x += Math.cos(angle) * this.speed * speedMult * dashMult * (dt / 1000);
                this.y += Math.sin(angle) * this.speed * speedMult * dashMult * (dt / 1000);

                // Add dash trail effect
                if (dashMult > 1 && Math.random() > 0.5) {
                    projectiles.push(new MeleeEffect(this.x, this.y));
                }
            }
        }
    }

    takeDamage(amount) {
        if (this.isInvisible || this.isFrozen) return; // Invincible
        super.takeDamage(amount);
    }

    triggerDash(now) {
        if (this.type === 'bull' && !this.hasDashed) {
            this.dashEndTime = now + 1600; // 1600ms dash (4x longer)
            this.hasDashed = true;
        }
    }

    draw(ctx) {
        if (this.isInvisible && this.team !== 'player' && this.type !== 'bull') return; // Don't draw enemy Leon if invisible

        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;

        if (this.isInvisible) ctx.globalAlpha = 0.5; // Player sees their own Leon or dashing Bulls as ghostly
        if (this.isFrozen) {
            ctx.fillStyle = '#74b9ff'; // Overwrite with ice blue
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#fff';
        }
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = this.team === 'player' ? '#00a8ff' : '#e84118';
        if (this.isFrozen) ctx.strokeStyle = '#fff';
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        ctx.font = '18px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.icon, this.x, this.y);
        ctx.restore();

        if (!this.isInvisible) this.drawHpBar(ctx);

        if (isSelectingBullDash && this.team === 'player' && this.type === 'bull' && !this.hasDashed) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 15, 0, Math.PI * 2);
            ctx.strokeStyle = '#ff4757';
            ctx.lineWidth = 4;
            ctx.setLineDash([8, 8]);
            ctx.stroke();
            ctx.restore();
        }
    }
}

class Building extends Entity {
    constructor(x, y, team, type) {
        super(x, y, 75, team);
        this.type = type;
        this.spawnTime = performance.now();
        this.lastTickTime = performance.now();
        this.attackRange = 0; // Default, set by type
        this.attackSpeed = 1000;
        this.lastAttackTime = 0;
        this.lastSpawnTime = performance.now();
        this.lastHealTime = performance.now(); // For Scrappy SP2
        this.icon = CARDS[type].icon;

        if (type === 'scrappy') {
            this.maxHp = 800; this.hp = 800; this.color = '#e1b12c'; this.attackDamage = 60; this.attackSpeed = 500;
            this.attackRange = 150; // 187 * 0.80 (-20%)
        } else if (type === 'penny') {
            this.maxHp = 600; this.hp = 600; this.color = '#c23616'; this.attackDamage = 200; this.attackSpeed = 2500;
            this.attackRange = 299; // 374 * 0.80 (-20%)
        } else if (type === 'mr-p') {
            this.maxHp = 1000; this.hp = 1000; this.color = '#54a0ff'; this.attackRange = 0; // Doesn't attack directly
        }

        // Apply Level Scaling
        if (team === 'player') {
            const scale = getLevelScale(type);
            this.maxHp *= scale;
            this.hp = this.maxHp;
            this.attackDamage *= scale;
        }
    }

    update(dt, now) {
        if (this.isDead || this.isFrozen) return;

        let atkSpeedMult = 1;
        let damageMult = 1;
        auras.forEach(a => {
            if (!a.isFrozen && a.team === this.team && Math.hypot(this.x - a.x, this.y - a.y) <= a.radius) {
                if (a.type === 'max') atkSpeedMult = 0.5; // 50% faster attack speed modifier
                if (a.type === '8bit') damageMult = 1.1; // 10% damage
            }
        });

        // SP: Scrappy Repair (SP2)
        if (this.type === 'scrappy' && this.team === 'player' && playerStarPowers['scrappy'] === 'sp2') {
            if (now - this.lastHealTime > 1000) {
                this.hp = Math.min(this.maxHp, this.hp + 50);
                this.lastHealTime = now;
            }
        }

        if (this.type === 'mr-p') {
            let spawnInterval = 5000; // Default 5 seconds
            // SP: Mr. P Revolving Door (SP1)
            if (this.team === 'player' && playerStarPowers['mr-p'] === 'sp1') {
                spawnInterval = 3000; // 3 seconds
            }

            if (now - this.lastSpawnTime > spawnInterval) {
                let porter = new Unit(this.x, this.y, 10, this.team, 'porter');
                if (this.isFrozen) porter.isFrozen = true;
                units.push(porter);
                this.lastSpawnTime = now;
                return; // Spawning building doesn't attack
            }
        }

        if (now - this.lastAttackTime > this.attackSpeed * atkSpeedMult && this.attackRange > 0) {
            // Find target
            let enemies = units.concat(buildings, auras).concat([playerSafe, enemySafe].filter(s => s)).filter(e => e && e.team !== this.team && !e.isInvisible && !e.isFrozen);
            let inRange = enemies.filter(e => Math.hypot(e.x - this.x, e.y - this.y) <= this.attackRange);
            if (inRange.length > 0) {
                inRange.sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y));
                let target = inRange[0];

                let isSplash = false; // removed splash damage from penny
                projectiles.push(new Projectile(this.x, this.y, target, this.attackDamage * damageMult, this.team, isSplash, this.type));
                this.lastAttackTime = now;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        // Team-colored circle background
        ctx.beginPath();
        ctx.arc(this.x, this.y, 22, 0, Math.PI * 2);
        ctx.fillStyle = this.isFrozen ? '#74b9ff' : (this.team === 'player' ? '#00a8ff' : '#e84118');
        if (this.isFrozen) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#fff';
        }
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.icon, this.x, this.y);
        ctx.restore();

        this.drawHpBar(ctx, -49);
    }
}

class Aura extends Entity {
    constructor(x, y, team, type) {
        super(x, y, 110, team); // Default large radius (100 + 10%)
        this.type = type;
        this.maxHp = type === 'emz' ? 800 : 1500; this.hp = this.maxHp;
        this.spawnTime = performance.now();
        this.lastTickTime = performance.now();

        if (type === 'pam') {
            this.radius = 82; // Increased by 10% from 75
            this.color = 'rgba(46, 204, 113, 0.3)';
            this.maxHp = 700; this.hp = this.maxHp;
        } else if (type === 'max') {
            this.radius = 82; // 75 + 10%
            this.color = 'rgba(241, 196, 15, 0.3)';
            this.maxHp = 700; this.hp = this.maxHp;
        } else if (type === '8bit') {
            this.radius = 110; // 100 + 10%
            // SP: 8-bit Boosted Booster (SP1)
            if (team === 'player' && playerStarPowers['8bit'] === 'sp1') {
                this.radius *= 1.5;
            }
            this.color = 'rgba(232, 67, 147, 0.3)';
            this.maxHp = 1200; this.hp = this.maxHp;
        } else if (type === 'emz') {
            this.radius = 132; // 120 + 10%
            this.color = 'rgba(156, 136, 255, 0.3)';
            this.maxHp = 1000; this.hp = this.maxHp;
        } else if (type === 'spike') {
            this.radius = 55; // Reduced 50% from 110
            this.color = 'rgba(46, 204, 113, 0.4)'; // Darker green
            this.maxHp = 1000; this.hp = this.maxHp;
        } else if (type === 'tara') {
            this.radius = 110; // 100 + 10%
            this.color = 'rgba(45, 52, 54, 0.6)'; // Dark grey/black hole
            this.maxHp = 1500; this.hp = this.maxHp;
        } else if (type === 'fire') {
            this.radius = 50;
            this.color = 'rgba(232, 65, 24, 0.4)'; // Orange/Red
            this.maxHp = 99999; this.hp = this.maxHp;
        }

        // Apply Level Scaling
        if (team === 'player' && type !== 'fire') {
            const scale = getLevelScale(type);
            this.maxHp *= scale;
            this.hp = this.maxHp;
        }
    }

    update(dt, now) {
        if (this.isDead || this.isFrozen) return;

        if (now - this.lastTickTime > 1000) {
            let enemies = units.concat(buildings, auras).filter(e => e.team !== this.team && !e.isFrozen);
            if (this.type === 'pam') {
                // Heal 15 HP per second to all allies (NOT frozen ones)
                let allies = units.concat(buildings, auras).concat([playerSafe, enemySafe].filter(s => s)).filter(e => e && e.team === this.team && !e.isFrozen);
                allies.forEach(a => {
                    if (a !== this && Math.hypot(this.x - a.x, this.y - a.y) <= this.radius) {
                        a.hp = Math.min(a.maxHp, a.hp + 15);
                    }
                });
            } else if (this.type === 'emz' && this.team === 'player' && playerStarPowers['emz'] === 'sp2') {
                // SP: Emz Hype (SP2)
                let count = enemies.filter(e => Math.hypot(e.x - this.x, e.y - this.y) <= this.radius).length;
                this.hp = Math.min(this.maxHp, this.hp + count * 30);
            } else if (this.type === 'fire') {
                enemies.forEach(e => {
                    if (Math.hypot(e.x - this.x, e.y - this.y) <= this.radius) e.takeDamage(20);
                });
            }
            this.lastTickTime = now;
        }

        // Expiration
        let lifetime = 999999;
        if (this.type === 'spike') lifetime = (this.team === 'player' && playerStarPowers['spike'] === 'sp2') ? 15000 : 10000;
        if (this.type === 'tara') lifetime = 3000;
        if (this.type === 'fire') lifetime = 3000;

        if (now - this.spawnTime > lifetime) {
            this.isDead = true;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.isFrozen ? 'rgba(116, 185, 255, 0.2)' : this.color;
        ctx.fill();
        ctx.strokeStyle = this.isFrozen ? '#fff' : (this.team === 'player' ? '#fff' : '#ff4757');
        ctx.lineWidth = this.isFrozen ? 4 : 2;
        ctx.stroke();

        // Draw icon in center (skip temporary fire aura)
        if (this.type !== 'fire' && CARDS[this.type]) {
            ctx.font = '32px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Dynamic pulsing glow
            const pulse = (Math.sin(performance.now() / 200) + 1) / 2; // 0 to 1
            const glowSize = 10 + pulse * 20; // 10 to 30

            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = glowSize;

            // Layered glow for extra intensity
            ctx.fillText(CARDS[this.type].icon, this.x, this.y);

            if (pulse > 0.5) {
                ctx.shadowBlur = glowSize * 1.5;
                ctx.fillText(CARDS[this.type].icon, this.x, this.y);
            }

            ctx.shadowBlur = 0;
        }

        // HP Bar for all Auras
        this.drawHpBar(ctx, -20);
        ctx.restore();
    }
}

class Projectile extends Entity {
    constructor(x, y, target, damage, team, isSplash = false, sourceType = null) {
        super(x, y, 4, team);
        this.target = target;
        this.targetX = target.x;
        this.targetY = target.y;
        this.damage = damage;
        this.isSplash = isSplash;
        this.sourceType = sourceType;
        this.speed = 400;
        this.hasBounced = false;
        this.isDead = false;
    }

    update(dt, now) {
        if (this.isDead) return;

        if (this.target && !this.target.isDead) {
            this.targetX = this.target.x;
            this.targetY = this.target.y;
        }

        let angle = Math.atan2(this.targetY - this.y, this.targetX - this.x);
        this.x += Math.cos(angle) * this.speed * (dt / 1000);
        this.y += Math.sin(angle) * this.speed * (dt / 1000);

        if (Math.hypot(this.targetX - this.x, this.targetY - this.y) < 10) {
            this.hit();
        }
    }

    hit() {
        if (this.isDead) return;

        // SP: Penny Fire (SP1)
        if (this.sourceType === 'penny' && this.team === 'player' && playerStarPowers['penny'] === 'sp1') {
            auras.push(new Aura(this.targetX, this.targetY, this.team, 'fire'));
        }

        // SP: Scrappy Bounce (SP1)
        if (this.sourceType === 'scrappy' && this.team === 'player' && playerStarPowers['scrappy'] === 'sp1' && !this.hasBounced) {
            let enemies = units.concat(buildings).filter(e => e.team !== this.team && !e.isDead && e !== this.target);
            let nextTarget = enemies.length > 0 ? enemies.sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y))[0] : null;
            if (nextTarget) {
                this.target = nextTarget;
                this.targetX = nextTarget.x;
                this.targetY = nextTarget.y;
                this.hasBounced = true;
                return; // Bounce!
            }
        }

        if (this.isSplash) {
            let enemies = units.concat(buildings, auras).concat([playerSafe, enemySafe].filter(s => s)).filter(e => e && e.team !== this.team && !e.isDead);
            enemies.forEach(e => {
                if (Math.hypot(e.x - this.targetX, e.y - this.targetY) <= 80) e.takeDamage(this.damage);
            });
            projectiles.push(new ExplosionEffect(this.targetX, this.targetY, 80));
        } else {
            if (this.target && !this.target.isDead) this.target.takeDamage(this.damage);
        }
        this.isDead = true;
    }

    draw(ctx) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.restore();
    }
}

class ExplosionEffect {
    constructor(x, y, radius) {
        this.x = x; this.y = y; this.radius = radius; this.age = 0; this.isDead = false;
    }
    update(dt) { this.age += dt; if (this.age > 300) this.isDead = true; }
    draw(ctx) {
        ctx.globalAlpha = 1 - (this.age / 300);
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffa502'; ctx.fill();
        ctx.globalAlpha = 1;
    }
}

class MeleeEffect {
    constructor(x, y) {
        this.x = x; this.y = y; this.age = 0; this.isDead = false;
    }
    update(dt) { this.age += dt; if (this.age > 150) this.isDead = true; }
    draw(ctx) {
        ctx.globalAlpha = 1 - (this.age / 150);
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x - 5, this.y - 5, 10, 10);
        ctx.globalAlpha = 1;
    }
}

class FloatingText {
    constructor(x, y, text, color) {
        this.x = x; this.y = y; this.text = text; this.color = color;
        this.age = 0; this.isDead = false;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = -Math.random() * 2 - 1;
    }
    update(dt) {
        this.x += this.vx; this.y += this.vy;
        this.age += dt; if (this.age > 800) this.isDead = true;
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = 1 - (this.age / 800);
        ctx.fillStyle = this.color; ctx.font = 'bold 16px Assistant'; ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        this.vx = (Math.random() - 0.5) * 5;
        this.vy = (Math.random() - 0.5) * 5;
        this.size = Math.random() * 5 + 2;
        this.age = 0; this.isDead = false;
    }
    update(dt) {
        this.x += this.vx; this.y += this.vy;
        this.age += dt; if (this.age > 500) this.isDead = true;
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = 1 - (this.age / 500);
        ctx.fillStyle = this.color; ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        ctx.restore();
    }
}

// --- Logic functions ---

function startCharSelection() {
    currentState = GAME_STATE.MENU; // Keep in menu-like state
    tempDeck = [...playerDeck];
    
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('char-selection-menu').classList.add('active');
    
    renderCharSelection();
}

function renderCharCards() {
    charCardsContainer.innerHTML = '';
    Object.keys(CARDS).forEach(id => {
        const card = CARDS[id];
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        if (playerDeck.includes(id)) cardEl.classList.add('selected');
        const level = playerStats.levels[id] || 1;
        
        cardEl.innerHTML = `
            <div class="card-cost">${card.cost}</div>
            <div class="card-icon">${card.icon}</div>
            <div class="card-name" style="display: flex; flex-direction: column; align-items: center;">
                <span>${card.name}</span>
                <span style="color: #f1c40f; font-size: 0.6rem;">רמה ${level}</span>
            </div>
            ${playerDeck.includes(id) ? '<div style="position:absolute; top:-5px; right:-5px; background:#2ecc71; color:white; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; border:2px solid white; font-size:0.7rem;">✓</div>' : ''}
        `;
        
        cardEl.onclick = () => {
            if (isStarringMode) {
                favoriteBrawler = id;
                sessionStorage.setItem('brawlclash_favorite', id);
                isStarringMode = false;
                document.getElementById('star-mode-btn').style.backgroundColor = '#f1c40f';
                renderCharCards();
                updateLobbyBrawler();
                return;
            }
            
            // If already selected, maybe open upgrade modal?
            // Let's make it so clicking opens upgrade, and double click (or long press) selects?
            // Better: click to select, and a small "info" button for upgrade? 
            // Or just open upgrade modal which HAS a select button?
            openUpgradeModal(id);
        };
        
        // Add a long-press or right-click for selection?
        // Let's just use click for upgrade and add a button inside upgrade modal to Toggle from Deck.
        
        charCardsContainer.appendChild(cardEl);
    });
    charCountDisplay.innerText = `נבחרו: ${playerDeck.length} / 8`;
}

function renderCharSelection() {
    const container = document.getElementById('char-cards-container');
    container.innerHTML = '';
    
    const countDisplay = document.getElementById('char-count-display');
    if (countDisplay) {
        countDisplay.innerText = `נבחרו: ${tempDeck.length} / 8`;
        countDisplay.style.color = (tempDeck.length === 8) ? '#4cd137' : '#f1c40f';
    }

    Object.keys(CARDS).forEach(key => {
        const card = CARDS[key];
        const isSelected = tempDeck.includes(key);
        const isFavorite = (key === favoriteBrawler);
        const level = playerStats.levels[key] || 1;
        
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        if (isSelected) cardEl.classList.add('selected');
        if (isFavorite) cardEl.style.boxShadow = "0 0 15px #f1c40f";
        
        cardEl.innerHTML = `
            <div class="card-cost">${card.cost}</div>
            <div class="card-icon">${card.icon}</div>
            <div class="card-name" style="display: flex; flex-direction: column; align-items: center;">
                <span>${card.name}</span>
                <span style="color: #f1c40f; font-size: 0.6rem;">רמה ${level}</span>
            </div>
            ${isSelected ? '<div class="select-indicator">✓</div>' : ''}
        `;
        
        // Upgrade button inside the card
        const infoBtn = document.createElement('div');
        infoBtn.className = 'info-btn';
        infoBtn.innerHTML = '⬆️';
        infoBtn.onclick = (e) => {
            e.stopPropagation();
            openUpgradeModal(key);
        };
        cardEl.appendChild(infoBtn);
        
        cardEl.onclick = () => {
            if (isStarringMode) {
                favoriteBrawler = key;
                sessionStorage.setItem('brawlclash_favorite', key);
                isStarringMode = false;
                renderCharSelection();
                updateHomeScreen();
                return;
            }
            
            toggleCharSelection(key);
        };
        container.appendChild(cardEl);
    });
}

function toggleCharSelection(key) {
    if (isStarringMode) {
        favoriteBrawler = key;
        sessionStorage.setItem('brawlclash_favorite', key);
        isStarringMode = false;
        renderCharSelection();
        updateHomeScreen();
        return;
    }

    const index = tempDeck.indexOf(key);
    if (index > -1) {
        tempDeck.splice(index, 1);
    } else {
        const isAdmin = playerStats.username === ADMIN_USERNAME;
        if (isAdmin || tempDeck.length < 8) {
            tempDeck.push(key);
        }
    }
    renderCharSelection();
}

function confirmCharSelection() {
    const isAdmin = playerStats.username === ADMIN_USERNAME;
    const valid = isAdmin ? tempDeck.length >= 1 : tempDeck.length === 8;
    if (valid) {
        playerDeck = [...tempDeck];
        sessionStorage.setItem('brawlclash_deck', JSON.stringify(playerDeck));
        goToLobby();
    } else {
        alert("עליך לבחור בדיוק 8 דמויות!");
    }
}

function buildDeck() {
    // Save the dash button
    const dashBtn = document.getElementById('bull-dash-btn');
    if (dashBtn) {
        document.body.appendChild(dashBtn);
        dashBtn.style.display = 'none';
    }

    const left = document.getElementById('deck-left');
    const right = document.getElementById('deck-right');
    const center = document.getElementById('deck-center');
    
    if (left) left.innerHTML = '';
    if (right) right.innerHTML = '';
    if (center) center.innerHTML = '';

    // Create Release Freeze button
    let releaseBtn = document.createElement('button');
    releaseBtn.id = 'release-freeze-btn';
    releaseBtn.innerText = 'שחרור פריז';
    releaseBtn.style.display = 'none';
    releaseBtn.style.backgroundColor = '#0984e3';
    releaseBtn.style.color = 'white';
    releaseBtn.style.border = '2px solid white';
    releaseBtn.style.borderRadius = '8px';
    releaseBtn.style.padding = '10px';
    releaseBtn.style.fontFamily = "'Fredoka One', cursive";
    releaseBtn.style.cursor = 'pointer';
    releaseBtn.style.boxShadow = '0 4px #74b9ff';
    releaseBtn.onclick = (e) => {
        e.stopPropagation();
        [...units, ...buildings, ...auras].forEach(ent => {
            if (ent.team === 'player' && ent.isFrozen) ent.isFrozen = false;
        });
    };

    playerDeck.forEach((id) => {
        const card = CARDS[id];
        if (!card) return;

        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.gap = '5px';

        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.id = `card-${id}`;
        cardEl.style.borderColor = card.color;
        cardEl.innerHTML = `
            <div class="card-cost">${card.cost}</div>
            <div class="card-icon">${card.icon}</div>
            <div class="card-name">${card.name}</div>
        `;

        container.appendChild(cardEl);

        // Add freeze button for all cards
        let fBtn = document.createElement('div');
        fBtn.className = 'freeze-icon';
        fBtn.innerText = '❄️';
        fBtn.style.cssText = 'background:#74b9ff; border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center; border:2px solid white; cursor:pointer; font-size:18px; box-shadow:0 2px #0984e3;';
        fBtn.onclick = (e) => {
            e.stopPropagation();
            selectFreezeCard(id, cardEl);
        };
        container.appendChild(fBtn);

        // Special handling for Bull dash button
        if (id === 'bull') {
            const dBtn = document.getElementById('bull-dash-btn');
            if (dBtn) {
                dBtn.style.position = 'static';
                dBtn.style.display = 'none';
                container.appendChild(dBtn);
            }
        }

        cardEl.onclick = () => selectCard(id, cardEl);

        // Sorting into panels
        if (card.type === 'aura' && right) {
            right.appendChild(container);
        } else if (card.type === 'building' && left) {
            left.appendChild(container);
            if (id === 'scrappy') left.appendChild(releaseBtn);
        } else if (center) {
            center.appendChild(container);
        }
    });

    if (left) left.style.display = 'flex';
    if (right) right.style.display = 'flex';
}


function selectCard(cardKey, element) {
    document.querySelectorAll('.card').forEach(c => {
        c.classList.remove('selected');
        c.style.boxShadow = 'none';
    });
    
    // Check elixir
    if (playerElixir >= (CARDS[cardKey].cost - 0.01) || adminHacks.infiniteElixir) {
        selectedCardId = cardKey;
        selectedFreezeCardId = null;
        isSelectingBullDash = false;
        element.classList.add('selected');
    } else {
        selectedCardId = null;
    }
}

function selectFreezeCard(cardKey, element) {
    document.querySelectorAll('.card').forEach(c => {
        c.classList.remove('selected');
        c.style.boxShadow = 'none';
    });
    if (playerElixir >= (CARDS[cardKey].cost - 0.01)) {
        selectedFreezeCardId = cardKey;
        selectedCardId = null;
        isSelectingBullDash = false;
        element.style.boxShadow = '0 0 12px 6px #74b9ff';
    } else {
        selectedFreezeCardId = null;
    }
}

canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const shiftHeld = e.shiftKey;

    if (isSelectingBullDash) {
        let clickedBull = units.find(u => u.team === 'player' && u.type === 'bull' && !u.hasDashed && Math.hypot(u.x - x, u.y - y) <= u.radius * 2);
        if (clickedBull) {
            clickedBull.triggerDash(performance.now());
        }
        return;
    }

    if (selectedFreezeCardId) {
        let valid = y > (CONFIG.CANVAS_HEIGHT / 2);
        if (!valid) {
            valid = auras.some(a => a.team === 'player' && a.type === 'emz' && !a.isFrozen && Math.hypot(x - a.x, y - a.y) <= a.radius);
        }
        if (!valid) return;

        spawnEntity(x, y, 'player', selectedFreezeCardId, true);
        selectedFreezeCardId = null;
        document.querySelectorAll('.card').forEach(c => c.style.boxShadow = 'none');
        return;
    }

    if (!selectedCardId) return;

    let valid = y > (CONFIG.CANVAS_HEIGHT / 2);
    if (!valid) {
        valid = auras.some(a => a.team === 'player' && a.type === 'emz' && !a.isFrozen && Math.hypot(x - a.x, y - a.y) <= a.radius);
    }

    if (valid) {
        const cardToContinue = selectedCardId; // Remember card before spend
        spawnEntity(x, y, 'player', selectedCardId);

        // Shift held: keep the card selected for continuous placement
        if (shiftHeld) {
            const canAffordNext = playerElixir >= (CARDS[cardToContinue].cost - 0.01) || adminHacks.infiniteElixir;
            if (canAffordNext) {
                selectedCardId = cardToContinue; // Stay selected
                // Keep the visual selection highlight
                const cardEl = document.getElementById(`card-${cardToContinue}`);
                if (cardEl) cardEl.classList.add('selected');
            } else {
                selectedCardId = null;
                document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
            }
        } else {
            selectedCardId = null;
            document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
        }
    }
});

function spawnEntity(x, y, team, typeStr, isFrozen = false, isRemote = false) {
    // Sync to network if it's a local player spawn and we are in a room
    if (team === 'player' && currentBattleRoom && !isRemote) {
        if (window.NetworkManager) {
            window.NetworkManager.syncSpawn(currentBattleRoom, x, y, typeStr);
        }
    }

    // Clamp coordinates to canvas bounds
    x = Math.max(20, Math.min(CONFIG.CANVAS_WIDTH - 20, x));
    y = Math.max(20, Math.min(CONFIG.CANVAS_HEIGHT - 20, y));

    // Enemy boundary enforcement
    if (team === 'enemy') {
        let boundary = CONFIG.CANVAS_HEIGHT / 2;
        if (y > boundary) {
            let insideEmz = auras.some(a => a.team === 'enemy' && a.type === 'emz' && !a.isFrozen && Math.hypot(x - a.x, y - a.y) <= a.radius);
            if (!insideEmz) y = boundary - 10; 
        }
    }

    let card = CARDS[typeStr];
    if (team === 'player' && !adminHacks.infiniteElixir) {
        playerElixir -= card.cost;
    }
    else if (team === 'enemy') {
        // If it's a remote spawn from an actual player, don't deduct AI elixir
        if (!currentBattleRoom) enemyElixir -= card.cost;
    }

    let entity;
    if (card.type === 'unit') {
        entity = new Unit(x, y, 15, team, typeStr);
        units.push(entity);
    } else if (card.type === 'building') {
        entity = new Building(x, y, team, typeStr);
        buildings.push(entity);
    } else if (card.type === 'aura') {
        entity = new Aura(x, y, team, typeStr);
        auras.push(entity);

        // SP: Pam Mama's Hug (SP1)
        if (typeStr === 'pam' && team === 'player' && playerStarPowers['pam'] === 'sp1') {
            let allies = units.concat(buildings, auras).concat([playerSafe, enemySafe].filter(s => s)).filter(e => e && e.team === team && !e.isDead);
            allies.forEach(a => {
                if (Math.hypot(a.x - x, a.y - y) <= entity.radius) {
                    a.hp = Math.min(a.maxHp, a.hp + 500);
                }
            });
        }
    }

    if (isFrozen) entity.isFrozen = true;
    AudioController.play('spawn');

    // Hard mode (AI only)
    if (difficulty === 'hard' && team === 'enemy' && !currentBattleRoom) {
        entity.maxHp *= 1.3;
        entity.hp = entity.maxHp;
        if (entity.attackDamage !== undefined) {
            entity.attackDamage *= 0.8;
        }
    }
}

function startSPSelection(source = 'battle') {
    spEntrySource = source;
    currentState = GAME_STATE.SP_SELECTION;

    // Hide all screens
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

    // Show SP selection menu (manual display since it uses 'overlay' class)
    const spMenu = document.getElementById('sp-selection-menu');
    spMenu.classList.add('active'); // Added 'active' to ensure CSS visibility
    spMenu.style.display = 'flex';

    // Update button text based on source
    const confirmBtn = document.getElementById('confirm-sp-btn');
    if (confirmBtn) {
        confirmBtn.innerText = (source === 'lobby') ? 'חזור ללובי' : 'סיים בחירה והתחל בקרב!';
    }

    // Default selection only if not already set (e.g. from storage)
    Object.keys(STAR_POWERS).forEach(key => {
        if (!playerStarPowers[key]) playerStarPowers[key] = 'sp1';
    });

    renderSPSelection();
}

function renderSPSelection() {
    const container = document.getElementById('sp-cards-container');
    container.innerHTML = '';

    playerDeck.forEach(key => {
        if (!STAR_POWERS[key]) return;
        const card = CARDS[key];
        const sps = STAR_POWERS[key];

        const cardItem = document.createElement('div');
        cardItem.className = 'sp-card-item';
        cardItem.innerHTML = `
            <div class="sp-card-icon">${card.icon}</div>
            <div class="sp-card-name">${card.name}</div>
            <div class="sp-options" id="options-${key}"></div>
        `;

        const optionsContainer = cardItem.querySelector(`#options-${key}`);
        sps.forEach(sp => {
            const btn = document.createElement('div');
            btn.className = `sp-option-btn ${playerStarPowers[key] === sp.id ? 'selected' : ''}`;
            btn.innerHTML = `
                <span class="sp-name">${sp.name}</span>
                <span class="sp-desc">${sp.desc}</span>
            `;
            btn.onclick = (e) => {
                e.stopPropagation();
                playerStarPowers[key] = sp.id;
                // Save to sessionStorage immediately
                sessionStorage.setItem('brawlclash_sp', JSON.stringify(playerStarPowers));
                renderSPSelection();
            };
            optionsContainer.appendChild(btn);
        });

        container.appendChild(cardItem);
    });
}

const confirmSPBtn_internal = document.getElementById('confirm-sp-btn');
if (confirmSPBtn_internal) {
    confirmSPBtn_internal.onclick = () => {
        const spMenu = document.getElementById('sp-selection-menu');
        spMenu.classList.remove('active');
        spMenu.style.display = 'none';

        if (spEntrySource === 'lobby') {
            goToLobby();
        } else {
            startGame();
        }
    };
}


function claimUsername() {
    const input = document.getElementById('username-input');
    const name = input.value.trim();
    if (name.length < 2) {
        alert("השם קצר מדי!");
        return;
    }

    // רשימת כל השמות שאי פעם נבחרו במכשיר הזה
    let takenNames = [];
    try {
        takenNames = JSON.parse(localStorage.getItem('brawlclash_all_taken_names') || "[]");
    } catch(e) { takenNames = []; }
    
    // בדיקה אם השם נבחר כבר אי פעם
    if (takenNames.includes(name)) {
        alert("השם הזה כבר תפוס במכשיר הזה! בחר שם אחר.");
        return;
    }

    // נעילת השם לנצח במכשיר הזה
    takenNames.push(name);
    localStorage.setItem('brawlclash_all_taken_names', JSON.stringify(takenNames));

    playerStats.username = name;
    saveStats();
    document.getElementById('username-overlay').style.display = 'none';
    goToLobby();
}

function updateHomeScreen() {
    const featuredIcon = document.getElementById('featured-brawler-icon');
    const featuredName = document.getElementById('featured-brawler-name');
    
    // Primary: use favorite brawler. Fallback: use first brawler in deck.
    let featuredKey = favoriteBrawler;
    if (!featuredKey && playerDeck && playerDeck.length > 0) {
        featuredKey = playerDeck[0];
    }
    
    if (featuredKey) {
        const brawler = CARDS[featuredKey];
        if (brawler) {
            if (featuredIcon) featuredIcon.innerText = brawler.icon;
            if (featuredName) featuredName.innerText = brawler.name;
        }
    }
    
    const trophyRoadFill = document.querySelector('.trophy-road-fill');
    if (trophyRoadFill) {
        // Mock progress bar visualization
        const progress = Math.min(100, (playerTrophies % 500) / 5);
        trophyRoadFill.style.width = `${progress}%`;
    }
}

function updateTrophyUI() {
    const el = document.getElementById('trophy-count');
    if (el) {
        el.innerText = playerTrophies.toLocaleString();
        el.classList.add('updated');
        setTimeout(() => el.classList.remove('updated'), 800);
    }
}

function startGame() {
    currentState = GAME_STATE.PLAYING;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('game-screen').classList.add('active');
    document.querySelectorAll('.side-panel').forEach(p => p.style.display = 'flex');

    // Difficulty adjustments moved to initGame for consistency
    initGame();
}

// Prevent multiple loops
let gameLoopRunning = false;

// --- Initialization & Setup ---
function initGame() {
    try {
        // Ensure canvas and ctx are initialized and sized
        setupCanvas();
        
        if (!ctx) {
            console.error("❌ Failed to initialize Canvas context");
            return;
        }

        units = []; buildings = []; projectiles = []; auras = [];
        particles = []; floatingTexts = [];
        playerElixir = 5; enemyElixir = 5; aiDeaths = []; pendingRebuilds = [];
        playerMaxElixir = 10; playerKills = 0;
        selectedCardId = null; selectedFreezeCardId = null; isSelectingBullDash = false;

        // Reset state variables
        hardAIState = 0; aiDelayTimer = 0; hardAIAttackY = 250; hardAIEmzPlaced = false;
        aiWavePreparation = false;
        aiWaveStartTime = 0;
        aiWaveUnitsSpawned = 0;

        playerSafe = new Safe(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT - 60, 'player');
        enemySafe = new Safe(CONFIG.CANVAS_WIDTH / 2, 60, 'enemy');

        if (difficulty === 'hard') {
            enemySafe.maxHp *= 1.3;
            enemySafe.hp = enemySafe.maxHp;
        }

        buildDeck();
        updateUI(); // Ensure UI is updated immediately with starting elixir

        if (!gameLoopRunning) {
            lastTime = performance.now();
            gameLoopRunning = true;
            requestAnimationFrame(gameLoop);
        }
    } catch (e) {
        console.error("Critical error in initGame:", e);
        // Fallback: Ensure safes exist even if deck fails
        if (!playerSafe) playerSafe = new Safe(300, 840, 'player');
        if (!enemySafe) enemySafe = new Safe(300, 60, 'enemy');

        // Try to start loop anyway to avoid total freeze
        if (!gameLoopRunning) {
            lastTime = performance.now();
            gameLoopRunning = true;
            requestAnimationFrame(gameLoop);
        }
    }
}

// --- Game Loop ---
function gameLoop(now) {
    if (currentState !== GAME_STATE.PLAYING) {
        gameLoopRunning = false;
        return;
    }
    const dt = now - lastTime;
    lastTime = now;

    update(dt, now);
    draw(ctx);
    requestAnimationFrame(gameLoop);
}

function update(dt, now) {
    if (currentState === GAME_STATE.PLAYING) {
        if (adminHacks.infiniteElixir) playerElixir = playerMaxElixir;
        
        let elixirGenRate = CONFIG.ELIXIR_GEN_RATE;
        if (adminHacks.rapidFire) elixirGenRate *= 3; // Hack: 3x elixir
        // SP: Max Super Charged (SP1)
        if (playerStarPowers['max'] === 'sp1' && units.some(u => u.team === 'player' && u.type === 'max')) {
            elixirGenRate *= 1.1; // 10% faster
        }
        playerElixir = Math.min(playerMaxElixir, playerElixir + (elixirGenRate * dt / 1000));
        let aiGenMult = difficulty === 'hard' ? 1.5 : 1.0;
        enemyElixir += (CONFIG.ELIXIR_GEN_RATE * aiGenMult * dt / 1000);
    }

    let oldEnemyCount = units.concat(buildings, auras).filter(e => e.team === 'enemy' && e.type !== 'porter').length;

    [...auras, ...buildings, ...units, ...projectiles, ...floatingTexts, ...particles, playerSafe, enemySafe].forEach(e => {
        if (e && e.isFrozen) {
            if (!e.freezeHoverStart) {
                e.freezeHoverStart = now;
                e.lastFrostbiteTime = now;
            }
            if (now - e.freezeHoverStart > 3000) { // 3 seconds grace period
                if (now - e.lastFrostbiteTime > 1000) {
                    e.hp -= (e.maxHp || e.hp) * 0.05; // 5% max HP damage every second
                    e.lastFrostbiteTime = now;
                    if (e.hp <= 0) e.isDead = true;
                }
            }
        } else if (e) {
            e.freezeHoverStart = null;
        }

        if (e && e.update) e.update(dt, now);
        if (e && e.isDead && !e.deathLogged && e.team === 'enemy' && e.type && CARDS[e.type]) {
            e.deathLogged = true;
            aiDeaths.push({ type: e.type, x: e.x, y: e.y, time: now });
            pendingRebuilds.push({ type: e.type, x: e.x, y: e.y });
        }
    });

    aiDeaths = aiDeaths.filter(d => now - d.time <= 20000);

    // Cleanup dead entities
    auras = auras.filter(e => !e.isDead);
    buildings = buildings.filter(e => !e.isDead);
    units = units.filter(e => !e.isDead);
    projectiles = projectiles.filter(e => !e.isDead);
    floatingTexts = floatingTexts.filter(e => !e.isDead);
    particles = particles.filter(e => !e.isDead);
    
    if (screenShakeTime > 0) screenShakeTime--;

    let newEnemyCount = units.filter(e => e.team === 'enemy' && e.type !== 'porter').length + buildings.filter(e => e.team === 'enemy').length + auras.filter(e => e.team === 'enemy').length;
    let deathsThisFrame = oldEnemyCount - newEnemyCount;
    if (deathsThisFrame > 0) {
        playerKills += deathsThisFrame;
        playerMaxElixir = Math.min(20, 10 + Math.floor(playerKills / 3));
    }

    // AI Basic update
    aiUpdate(dt, now);
    updateUI();

    // Game Over check - Null safe
    if (playerSafe && enemySafe && (playerSafe.isDead || enemySafe.isDead)) {
        if (currentState !== GAME_STATE.GAMEOVER) {
            let winStatus = "lose";
            // New trophies logic
            if (playerSafe.isDead) {
                playerTrophies = Math.max(0, playerTrophies - 3);
                winStatus = "lose";
            } else {
                playerTrophies += 8;
                winStatus = "win";
            }
            sessionStorage.setItem('brawlclash_trophies', playerTrophies);

            // Multiplayer Sync: Broadcast result
            if (currentBattleRoom && window.NetworkManager) {
                const winner = winStatus === "win" ? playerStats.username : "opponent";
                window.NetworkManager.updateBattleResult(currentBattleRoom, winner);
            }
        }

        currentState = GAME_STATE.GAMEOVER;
        const resultText = document.getElementById('game-over-title');
        if (resultText) resultText.innerText = playerSafe.isDead ? "הפסדת!" : "ניצחון!";
        AudioController.play(playerSafe.isDead ? 'lose' : 'win');
        const overMenu = document.getElementById('game-over-menu');
        if (overMenu) overMenu.classList.add('active');

        // Cleanup multiplayer room after short delay
        if (currentBattleRoom) {
            setTimeout(() => { currentBattleRoom = null; }, 3000);
        }
    }
}

// AI Basic update
function aiUpdate(dt, now) {
    if (aiDelayTimer > now) return;

    // Hard AI uses fluid strategy, so we only force blind rebuilds for Easy/Normal
    if (difficulty !== 'hard') {
        for (let i = 0; i < pendingRebuilds.length; i++) {
            let rebuild = pendingRebuilds[i];
            let count = aiDeaths.filter(d => d.type === rebuild.type && Math.hypot(d.x - rebuild.x, d.y - rebuild.y) < 30).length;
            if (count >= 3) {
                pendingRebuilds.splice(i, 1);
                i--; continue;
            }
            if (enemyElixir >= CARDS[rebuild.type].cost) {
                spawnEntity(rebuild.x, rebuild.y, 'enemy', rebuild.type);
                pendingRebuilds.splice(i, 1);
                aiDelayTimer = now + 600;
                return;
            }
        }
    }

    if (difficulty === 'easy') {
        // Random placement
        if (enemyElixir >= 7) {
            let cards = Object.keys(CARDS).filter(c => CARDS[c].cost <= enemyElixir);
            if (cards.length > 0) {
                let card = cards[Math.floor(Math.random() * cards.length)];
                let x = Math.random() * (CONFIG.CANVAS_WIDTH - 60) + 30;
                let y = Math.random() * (CONFIG.CANVAS_HEIGHT / 2 - 60) + 30;
                spawnEntity(x, y, 'enemy', card);
                aiDelayTimer = now + 1000;
            }
        }
    } else if (difficulty === 'normal') {
        // Reactive
        if (enemyElixir >= 4) {
            // Find incoming player units (visible only)
            let incoming = units.concat(buildings).filter(u => u.team === 'player' && !u.isInvisible);
            if (incoming.length > 0) {
                // Defend lane
                let targetLoc = incoming[0].x;
                if (enemyElixir >= 9 && Math.random() > 0.5) spawnEntity(targetLoc, 100, 'enemy', 'pam');
                else spawnEntity(targetLoc, 150, 'enemy', 'scrappy');
                aiDelayTimer = now + 1500;
            } else if (enemyElixir >= 8) {
                // Push
                spawnEntity(CONFIG.CANVAS_WIDTH / 2, 100, 'enemy', 'leon');
                aiDelayTimer = now + 2000;
            }
        }
    } else if (difficulty === 'hard') {
        // God-Tier AI Strategy
        let playerUnitsTanks = units.filter(u => u.team === 'player' && !u.isInvisible && !u.isFrozen && (u.type === 'bruce' || u.type === 'bull' || u.type === 'leon'));
        let safeUnderAttack = (now - (enemySafe.lastDamageTime || 0) < 3000) || units.some(u => u.team === 'player' && !u.isInvisible && !u.isFrozen && u.y < 250);
        let playerIsWeak = units.filter(u => u.team === 'player' && !u.isInvisible && !u.isFrozen).length === 0 && buildings.filter(b => b.team === 'player' && !b.isInvisible && !b.isFrozen).length === 0;

        // Base cluster logic: AI builds an impenetrable fortress overlapping perfectly
        let clusterX = CONFIG.CANVAS_WIDTH / 2;
        let clusterY = 160;
        let pams = auras.filter(a => a.team === 'enemy' && a.type === 'pam' && !a.isFrozen);
        let inPamHeal = (x, y) => pams.some(p => Math.hypot(p.x - x, p.y - y) <= p.radius);

        // PRIORITY 1: CRITICAL DEFENSE (Save the Safe!)
        if (safeUnderAttack) {
            let threats = units.filter(u => u.team === 'player' && u.y < 350).sort((a, b) => a.y - b.y);
            if (threats.length > 0) {
                let t = threats[0];
                if (enemyElixir >= CARDS['bruce'].cost && Math.random() > 0.3) {
                    // Usually use Bruce to tank, rarely pull out Bull
                    let defUnit = (Math.random() > 0.85 && enemyElixir >= CARDS['bull'].cost) ? 'bull' : 'bruce';
                    spawnEntity(t.x, Math.max(80, t.y - 40), 'enemy', defUnit);
                    aiDelayTimer = now + 400; return;
                }
                if (enemyElixir >= CARDS['emz'].cost && Math.random() > 0.5) {
                    spawnEntity(enemySafe.x, enemySafe.y + 70, 'enemy', 'emz'); // Emz area denial sweeping the safe
                    aiDelayTimer = now + 500; return;
                }
                if (enemyElixir >= CARDS['scrappy'].cost) {
                    spawnEntity(enemySafe.x + (Math.random() * 60 - 30), enemySafe.y + 50, 'enemy', 'scrappy');
                    aiDelayTimer = now + 400; return;
                }
            }
        }

        // PRIORITY 2: COUNTER IMMINENT PUSHES STRATEGICALLY
        if (playerUnitsTanks.length >= 2 || (playerUnitsTanks.length > 0 && playerUnitsTanks[0].type === 'bull')) {
            let incomingThreats = playerUnitsTanks.filter(u => u.y < CONFIG.CANVAS_HEIGHT / 2 + 150);
            if (incomingThreats.length > 0) {
                let massX = incomingThreats.reduce((sum, u) => sum + u.x, 0) / incomingThreats.length;
                let leadY = Math.min(...incomingThreats.map(u => u.y));

                // Drop a Pam block exactly where they are walking to stall them inside heal
                if (enemyElixir >= CARDS['pam'].cost && !inPamHeal(massX, leadY - 100)) {
                    spawnEntity(massX, Math.max(120, leadY - 100), 'enemy', 'pam');
                    aiDelayTimer = now + 500; return;
                }
                // Back it up with heavy artillery
                if (enemyElixir >= CARDS['penny'].cost) {
                    spawnEntity(massX + (Math.random() * 80 - 40), Math.max(90, leadY - 150), 'enemy', 'penny');
                    aiDelayTimer = now + 600; return;
                }
                if (enemyElixir >= CARDS['scrappy'].cost) {
                    spawnEntity(massX + (Math.random() * 60 - 30), Math.max(100, leadY - 100), 'enemy', 'scrappy');
                    aiDelayTimer = now + 500; return;
                }
            }
        }

        // PRIORITY 3: PUNISH WEAKNESS OR OPEN LANES
        if (playerIsWeak && enemyElixir >= Math.max(12, CARDS['leon'].cost)) {
            let atkX = Math.random() > 0.5 ? 80 : CONFIG.CANVAS_WIDTH - 80; // Far edges
            spawnEntity(atkX, CONFIG.CANVAS_HEIGHT / 2 - 50, 'enemy', 'leon'); // Send assassin down the side
            aiDelayTimer = now + 800; return;
        }

        // PRIORITY 4: ESTABLISH QUICK DEFENSE THEN BUILD THE DEATH-HUB
        if (enemyElixir >= 4) {
            let myBuildings = buildings.filter(b => b.team === 'enemy');
            let scrappys = myBuildings.filter(b => b.type === 'scrappy');

            // Fast early defense: Drop 2 Scrappys quickly near the safe before greedy hub building
            if (scrappys.length < 2 && enemyElixir >= CARDS['scrappy'].cost) {
                spawnEntity(enemySafe.x + (Math.random() * 100 - 50), enemySafe.y + 60, 'enemy', 'scrappy');
                aiDelayTimer = now + 500; return;
            }

            // Step A: Foundation - Pam Heal
            if (pams.length === 0 && enemyElixir >= CARDS['pam'].cost) {
                spawnEntity(clusterX, clusterY, 'enemy', 'pam');
                aiDelayTimer = now + 600; return;
            }

            // Step B: Payload - Artillery INSIDE the Pam heal
            let pennys = myBuildings.filter(b => b.type === 'penny');
            if (pams.length > 0 && pennys.length < 2 && enemyElixir >= CARDS['penny'].cost) {
                let p = pams[0];
                if (p) {
                    spawnEntity(p.x + (Math.random() * 60 - 30), p.y + (Math.random() * 40 - 20), 'enemy', 'penny');
                    aiDelayTimer = now + 500; return;
                }
            }

            // Step C: Buff Stack - 8-bit EXACTLY on top of Pam
            let eightBits = auras.filter(a => a.team === 'enemy' && a.type === '8bit');
            if (pams.length > 0 && pennys.length > 0 && eightBits.length === 0 && enemyElixir >= CARDS['8bit'].cost) {
                let p = pams[0];
                if (p) {
                    spawnEntity(p.x, p.y, 'enemy', '8bit');
                    aiDelayTimer = now + 500; return;
                }
            }

            // Step D: Speed Stack - Max EXACTLY on top of 8-bit/Pam
            let maxes = auras.filter(a => a.team === 'enemy' && a.type === 'max');
            if (eightBits.length > 0 && maxes.length === 0 && enemyElixir >= CARDS['max'].cost) {
                let p = pams[0];
                if (p) {
                    spawnEntity(p.x, p.y, 'enemy', 'max');
                    aiDelayTimer = now + 500; return;
                }
            }

            // Step E: Calculated Offense - Wait to bank massive elixir before striking in a HUGE WAVE!
            if (maxes.length > 0) {
                if (!aiWavePreparation && enemyElixir >= 35) {
                    aiWavePreparation = true;
                    aiWaveUnitsSpawned = 0;
                    aiWaveStartTime = now;
                }

                if (aiWavePreparation) {
                    let p = pams[0];
                    if (!p) {
                        aiWavePreparation = false; // Reset if anchor is gone
                        return;
                    }
                    let spawnX = p.x;
                    let spawnY = p.y + 60; // Front of the hub

                    // Spawn units up to 10 in a massive wave
                    if (aiWaveUnitsSpawned < 10) {
                        let unitTypes = ['bruce', 'bruce', 'scrappy', 'bull', 'leon', 'bruce', 'bruce', 'scrappy', 'bull', 'leon'];
                        let type = unitTypes[aiWaveUnitsSpawned];
                        let cost = CARDS[type].cost;

                        if (enemyElixir >= cost) {
                            // Spawn FROZEN
                            spawnEntity(spawnX + (Math.random() * 120 - 60), spawnY + (Math.random() * 60), 'enemy', type, true);
                            aiWaveUnitsSpawned++;
                            aiDelayTimer = now + 200; // Even faster succession spawn
                            return;
                        }
                    }

                    // Release the wave after 10 units spawned OR if we ran out of elixir and have at least 5 units
                    if (aiWaveUnitsSpawned >= 10 || (enemyElixir < 3 && aiWaveUnitsSpawned >= 5)) {
                        // Release all frozen enemy units
                        units.concat(buildings, auras).forEach(ent => {
                            if (ent.team === 'enemy' && ent.isFrozen) {
                                ent.isFrozen = false;
                            }
                        });
                        aiWavePreparation = false;
                        aiDelayTimer = now + 6000; // Even longer delay after a MASSIVE wave
                        return;
                    }
                }
            }
        }
    }
}

function drawBackground(ctx) {
    if (!ctx) return;
    ctx.save();
    // 1. Draw Grass
    ctx.fillStyle = '#4cd137'; 
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    
    // 2. Draw Field Lines (Solid white for visibility)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; 
    ctx.lineWidth = 5;
    
    // Center line
    ctx.beginPath(); 
    ctx.moveTo(0, CONFIG.CANVAS_HEIGHT / 2); 
    ctx.lineTo(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT / 2); 
    ctx.stroke();
    
    // Center circle
    ctx.beginPath(); 
    ctx.arc(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, 70, 0, Math.PI * 2); 
    ctx.stroke();
    
    // Borders
    ctx.strokeRect(5, 5, CONFIG.CANVAS_WIDTH - 10, CONFIG.CANVAS_HEIGHT - 10);
    
    ctx.restore();
}

function draw(ctx) {
    ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    
    ctx.save();
    if (screenShakeTime > 0) {
        ctx.translate((Math.random() - 0.5) * screenShakeIntensity, (Math.random() - 0.5) * screenShakeIntensity);
    }
    
    drawBackground(ctx);
    
    // Group all entities
    const entities = [...auras, ...buildings, ...units, ...projectiles, ...floatingTexts, ...particles];
    if (playerSafe) entities.push(playerSafe);
    if (enemySafe) entities.push(enemySafe);

    entities.forEach(e => {
        try {
            if (e && typeof e.draw === 'function') e.draw(ctx);
        } catch (err) {
            console.error("Error drawing entity:", e, err);
        }
    });
    
    ctx.restore();

    // Draw placement ghost if a card is selected
    if (currentState === GAME_STATE.PLAYING && (selectedCardId || selectedFreezeCardId)) {
        drawGhost(ctx);
    }
}

// Global mouse tracker for ghost
let mouseX = 0, mouseY = 0;
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top) * scaleY;
});

function drawGhost(ctx) {
    const cardKey = selectedCardId || selectedFreezeCardId;
    const card = CARDS[cardKey];
    if (!card) return;

    ctx.save();
    ctx.globalAlpha = 0.4;

    // Check placement validity for ghost color
    let valid = mouseY > (CONFIG.CANVAS_HEIGHT / 2);
    if (!valid) {
        valid = auras.some(a => a.team === 'player' && a.type === 'emz' && !a.isFrozen && Math.hypot(mouseX - a.x, mouseY - a.y) <= a.radius);
    }

    ctx.beginPath();
    ctx.arc(mouseX, mouseY, 30, 0, Math.PI * 2);
    ctx.fillStyle = valid ? card.color : 'rgba(231, 76, 60, 0.5)';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(card.icon, mouseX, mouseY);

    if (selectedFreezeCardId) {
        ctx.strokeStyle = '#74b9ff';
        ctx.lineWidth = 4;
        ctx.stroke();
    }

    ctx.restore();
}

function updateUI() {
    if (elixirFill) elixirFill.style.width = `${Math.min(100, (playerElixir / playerMaxElixir) * 100)}%`;
    if (elixirText) {
        elixirText.style.direction = "ltr";
        elixirText.style.display = "inline-block";
        elixirText.innerHTML = `<span style="unicode-bidi: isolate;">${Math.floor(playerElixir)} / ${playerMaxElixir}</span>`;
    }

    // Update Dash Button
    let dashBtn = document.getElementById('bull-dash-btn');
    if (dashBtn) {
        let activeBulls = units.filter(u => u.team === 'player' && u.type === 'bull' && !u.isDead && !u.hasDashed);
        if (activeBulls.length > 0) {
            dashBtn.style.display = 'block';
            dashBtn.style.opacity = '1';
            dashBtn.style.backgroundColor = isSelectingBullDash ? '#ff4757' : '#8c7ae6';
        } else {
            dashBtn.style.display = 'none';
            if (!isSelectingBullDash) dashBtn.style.backgroundColor = '#8c7ae6';
        }
    }

    // Update deck availability
    document.querySelectorAll('.card').forEach(d => {
        let cardKey = d.id.replace('card-', '');
        if (CARDS[cardKey]) {
            const canAfford = playerElixir >= (CARDS[cardKey].cost - 0.01) || adminHacks.infiniteElixir;
            if (!canAfford) {
                d.classList.add('disabled');
            } else {
                d.classList.remove('disabled');
            }
            
            // Cleanup leftover overlays if any
            let cdOverlay = d.querySelector('.cooldown-overlay');
            if (cdOverlay) cdOverlay.remove();
        }
    });

    let releaseBtn = document.getElementById('release-freeze-btn');
    if (releaseBtn) {
        let hasFrozen = units.some(u => u.team === 'player' && u.isFrozen) || buildings.some(b => b.team === 'player' && b.isFrozen) || auras.some(a => a.team === 'player' && a.isFrozen);
        releaseBtn.style.display = hasFrozen ? 'block' : 'none';
    }
}

function startCharSelection() {
    tempDeck = [...playerDeck];
    switchScreen('char-selection-menu');
    renderCharSelection();
}

function renderCharSelection() {
    const container = document.getElementById('char-cards-container');
    if (!container) return;
    container.innerHTML = '';
    
    Object.keys(CARDS).forEach(id => {
        const card = CARDS[id];
        if (!card) return;
        const isFavorite = (favoriteBrawler === id);
        const isInDeck = tempDeck.includes(id);
        
        const cardEl = document.createElement('div');
        cardEl.className = `card-item ${isInDeck ? 'selected' : ''}`;
        cardEl.style = `position: relative; border: 3px solid ${isFavorite ? '#f1c40f' : 'transparent'}; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 12px; display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: transform 0.2s;`;
        
        cardEl.innerHTML = `
            <div class="card-cost" style="position: absolute; top: -10px; left: -10px; background: #9c88ff; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; font-size: 0.9rem; z-index: 10;">${card.cost}</div>
            <div class="card-icon" style="font-size: 2rem;">${card.icon}</div>
            <div class="card-name" style="font-size: 0.8rem; font-weight: bold; color: white;">${card.name}</div>
            <div class="card-level" style="color: #f1c40f; font-size: 0.7rem;">רמה ${playerStats.levels[id]}</div>
            ${isFavorite ? '<div style="position:absolute; top:-10px; right:-10px; font-size:1.5rem;">⭐</div>' : ''}
            <div class="info-btn" style="position:absolute; bottom:5px; right:5px; background:rgba(231, 76, 60, 0.8); border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-weight:bold; color: white; z-index: 5;">⬆️</div>
        `;
        
        cardEl.onclick = (e) => {
            if (isStarringMode) {
                favoriteBrawler = (favoriteBrawler === id) ? null : id;
                sessionStorage.setItem('brawlclash_favorite', favoriteBrawler || '');
                renderCharSelection();
                updateHomeScreen();
                return;
            }
            if (e.target.classList.contains('info-btn')) {
                openUpgradeModal(id);
                return;
            }
            // Toggle selection
            if (isInDeck) {
                tempDeck = tempDeck.filter(cid => cid !== id);
    } else if (tempDeck.length < 8 || playerStats.username === ADMIN_USERNAME) {
                tempDeck.push(id);
            }
            renderCharSelection();
        };
        
        container.appendChild(cardEl);
    });
    
    const isAdmin = playerStats.username === ADMIN_USERNAME;
    const countMax = isAdmin ? '∞' : '8';
    if (countEl) countEl.innerText = `נבחרו: ${tempDeck.length} / ${countMax}`;
}

function confirmCharSelection() {
    const isAdmin = playerStats.username === ADMIN_USERNAME;
    const valid = isAdmin ? tempDeck.length >= 1 : tempDeck.length === 8;
    if (valid) {
        playerDeck = [...tempDeck];
        sessionStorage.setItem('brawlclash_deck', JSON.stringify(playerDeck));
        goToLobby();
    } else {
        alert("עליך לבחור בדיוק 8 דמויות!");
    }
}


function openAdminMenu() {
    if (playerStats.username !== ADMIN_USERNAME) {
        alert("🚫 אין לך גישה לתפריט המנהל!");
        return;
    }
    document.getElementById('admin-overlay').style.display = 'flex';
    renderAdminToggles();
}

function renderAdminToggles() {
    const container = document.getElementById('admin-hacks-container');
    if (!container) return;
    container.innerHTML = '';

    // --- Section: Toggles ---
    const hackList = [
        { id: 'infiniteElixir', name: 'אליקסיר אינסופי', icon: '🧪' },
        { id: 'godMode', name: 'מצב אלוהים (אל-מוות)', icon: '🛡️' },
        { id: 'doubleDamage', name: 'נזק כפול', icon: '⚔️' },
        { id: 'rapidFire', name: 'מהירות על', icon: '⚡' }
    ];

    hackList.forEach(hack => {
        const item = document.createElement('div');
        const isActive = adminHacks[hack.id];
        item.style = `display: flex; justify-content: space-between; align-items: center; padding: 12px; background: ${isActive ? 'rgba(46, 204, 113, 0.3)' : 'rgba(255,255,255,0.1)'}; border-radius: 12px; margin-bottom: 8px; cursor: pointer; border: 2px solid ${isActive ? '#2ecc71' : 'transparent'};`;
        item.innerHTML = `
            <div style="color: white; font-weight: bold;">${hack.icon} ${hack.name}</div>
            <div style="color: ${isActive ? '#2ecc71' : '#e74c3c'}; font-weight: bold; background: rgba(0,0,0,0.2); padding: 4px 8px; border-radius: 6px;">${isActive ? 'פעיל' : 'כבוי'}</div>
        `;
        item.onclick = () => {
            adminHacks[hack.id] = !adminHacks[hack.id];
            renderAdminToggles();
            AudioController.play('upgrade');
        };
        container.appendChild(item);
    });

    // --- Separator ---
    const sep = document.createElement('hr');
    sep.style = 'border-color: rgba(255,255,255,0.2); margin: 12px 0;';
    container.appendChild(sep);

    // --- Section: Currency Editor ---
    const currTitle = document.createElement('div');
    currTitle.style = 'color: #f1c40f; font-weight: bold; margin-bottom: 8px; font-size: 1rem;';
    currTitle.innerText = '💰 עריכת מטבע';
    container.appendChild(currTitle);

    // Coins row
    const coinsRow = document.createElement('div');
    coinsRow.style = 'display: flex; gap: 8px; align-items: center; margin-bottom: 8px;';
    coinsRow.innerHTML = `
        <span style="color:white; flex: 1;">🪙 זהב</span>
        <input id="admin-coins-input" type="number" min="0" value="${playerStats.coins}"
            style="width: 100px; padding: 6px 10px; border-radius: 8px; border: 2px solid #f1c40f; background: rgba(0,0,0,0.3); color: white; font-size: 1rem; text-align: center;">
        <button onclick="adminSetCoins()" style="padding: 6px 12px; background: #f1c40f; color: #000; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">הגדר</button>
    `;
    container.appendChild(coinsRow);

    // Gems row
    const gemsRow = document.createElement('div');
    gemsRow.style = 'display: flex; gap: 8px; align-items: center;';
    gemsRow.innerHTML = `
        <span style="color:white; flex: 1;">💎 יהלומים</span>
        <input id="admin-gems-input" type="number" min="0" value="${playerStats.gems}"
            style="width: 100px; padding: 6px 10px; border-radius: 8px; border: 2px solid #9b59b6; background: rgba(0,0,0,0.3); color: white; font-size: 1rem; text-align: center;">
        <button onclick="adminSetGems()" style="padding: 6px 12px; background: #9b59b6; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">הגדר</button>
    `;
    container.appendChild(gemsRow);
}

function adminSetCoins() {
    const val = parseInt(document.getElementById('admin-coins-input').value);
    if (!isNaN(val) && val >= 0) {
        playerStats.coins = val;
        saveStats();
        updateStatsUI();
        AudioController.play('upgrade');
    }
}

function adminSetGems() {
    const val = parseInt(document.getElementById('admin-gems-input').value);
    if (!isNaN(val) && val >= 0) {
        playerStats.gems = val;
        saveStats();
        updateStatsUI();
        AudioController.play('upgrade');
    }
}

// Event Listeners (UI hooks)

document.getElementById('bull-dash-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    let activeBulls = units.filter(u => u.team === 'player' && u.type === 'bull' && !u.hasDashed);
    if (activeBulls.length > 0) {
        isSelectingBullDash = !isSelectingBullDash;
        let btn = document.getElementById('bull-dash-btn');
        if (isSelectingBullDash) {
            btn.style.backgroundColor = '#ff4757'; // Highlight red to show active selection
            selectedCardId = null;
            document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
        } else {
            btn.style.backgroundColor = '#8c7ae6';
        }
    }
});

// Removed difficulty screen logic

const lobbyStartBtn = document.getElementById('lobby-start-btn');
if (lobbyStartBtn) {
    lobbyStartBtn.addEventListener('click', () => {
        startGame();
    });
}

const lobbySpBtn = document.getElementById('lobby-sp-btn');
if (lobbySpBtn) {
    lobbySpBtn.addEventListener('click', () => {
        startSPSelection('lobby');
    });
}

const lobbyCharBtn = document.getElementById('lobby-char-btn');
if (lobbyCharBtn) {
    lobbyCharBtn.addEventListener('click', () => {
        startCharSelection();
    });
}

document.getElementById('confirm-char-btn').addEventListener('click', () => {
    confirmCharSelection();
});

document.getElementById('game-over-char-btn').addEventListener('click', () => {
    document.getElementById('game-over-menu').classList.remove('active');
    startCharSelection();
});

const starModeBtn = document.getElementById('star-mode-btn');
if (starModeBtn) {
    starModeBtn.addEventListener('click', () => {
        isStarringMode = !isStarringMode;
        renderCharSelection();
    });
}

const lobbyBackBtn = document.getElementById('lobby-back-btn');
if (lobbyBackBtn) {
    lobbyBackBtn.addEventListener('click', () => {
        // Hidden difficulty menu, do nothing
    });
}

document.getElementById('pause-btn').addEventListener('click', () => {
    currentState = GAME_STATE.PAUSED;
    document.getElementById('pause-menu').classList.add('active');
});

document.getElementById('resume-btn').addEventListener('click', () => {
    currentState = GAME_STATE.PLAYING;
    document.getElementById('pause-menu').classList.remove('active');
    lastTime = performance.now();
    gameLoopRunning = true;
    requestAnimationFrame(gameLoop);
});

document.getElementById('quit-btn').addEventListener('click', () => {
    gameLoopRunning = false;
    currentState = GAME_STATE.MENU;
    document.getElementById('pause-menu').classList.remove('active');
    goToLobby();
});

document.getElementById('restart-btn').addEventListener('click', () => {
    document.getElementById('game-over-menu').classList.remove('active');
    goToLobby();
});

function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active');
    }

    if (screenId !== 'game-screen') {
        let l = document.getElementById('deck-left');
        let r = document.getElementById('deck-right');
        if (l) l.style.display = 'none';
        if (r) r.style.display = 'none';
    }
}

// Sidebar Toggle Logic
const settingsBtn = document.getElementById('home-settings-btn');
if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sidebar = document.getElementById('right-sidebar');
        if (sidebar) sidebar.classList.toggle('hidden');
    });
}

// Start in the lobby
goToLobby();

// --- Upgrade Logic ---
let currentlyUpgradingId = null;

function openUpgradeModal(id) {
    currentlyUpgradingId = id;
    const card = CARDS[id];
    const level = playerStats.levels[id];
    const scale = getLevelScale(id);
    const nextScale = 1 + (level) * 0.05;
    
    // Base stats (approximate)
    let baseHp = 1000;
    let baseDmg = 100;
    if (id === 'bruce') { baseHp = 1200; baseDmg = 150; }
    if (id === 'bull') { baseHp = 1380; baseDmg = 345; }
    if (id === 'leon') { baseHp = 900; baseDmg = 200; }
    if (id === 'porter') { baseHp = 100; baseDmg = 50; }
    if (id === 'scrappy') { baseHp = 800; baseDmg = 60; }
    if (id === 'penny') { baseHp = 600; baseDmg = 200; }
    if (id === 'pam' || id === 'max') { baseHp = 700; baseDmg = 0; }
    if (id === '8bit') { baseHp = 1200; baseDmg = 0; }
    if (id === 'emz') { baseHp = 1000; baseDmg = 0; }
    if (id === 'spike') { baseHp = 1000; baseDmg = 0; }
    if (id === 'tara') { baseHp = 1500; baseDmg = 0; }

    document.getElementById('upgrade-modal-name').innerText = `שדרוג: ${card.name} (${card.cost} 🧪)`;
    document.getElementById('upgrade-modal-icon').innerText = card.icon;
    document.getElementById('stat-level').innerText = `רמה: ${level} ➔ ${level + 1}`;
    document.getElementById('stat-hp').innerText = `חיים: ${Math.floor(baseHp * scale)} ➔ ${Math.floor(baseHp * nextScale)}`;
    document.getElementById('stat-damage').innerText = baseDmg > 0 ? `נזק: ${Math.floor(baseDmg * scale)} ➔ ${Math.floor(baseDmg * nextScale)}` : "";
    
    const cost = level * 200;
    document.getElementById('upgrade-cost').innerText = cost;

    const btn = document.getElementById('upgrade-action-btn');
    const atMaxLevel = level >= MAX_LEVEL;
    if (atMaxLevel) {
        btn.disabled = true;
        btn.style.opacity = "0.5";
        btn.innerText = 'רמה מקסימלית!';
        document.getElementById('stat-level').innerText = `רמה: ${level} (מקס)`;
    } else if (playerStats.coins >= cost) {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.innerText = 'שדרג!';
    } else {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.innerText = 'שדרג!';
    }

    const selectBtn = document.getElementById('upgrade-select-btn');
    const isInDeck = tempDeck.includes(id);
    selectBtn.innerText = isInDeck ? "הסר מהדק" : "בחר לדק";
    selectBtn.onclick = () => {
        if (isInDeck) {
            tempDeck = tempDeck.filter(cid => cid !== id);
        } else if (tempDeck.length < 8 || playerStats.username === ADMIN_USERNAME) {
            tempDeck.push(id);
        } else {
            alert("אפשר לבחור עד 8 דמויות!");
        }
        openUpgradeModal(id); // Refresh modal
        renderCharSelection(); // Refresh list
    };
    
    document.getElementById('upgrade-modal').style.display = 'flex';
}

document.getElementById('upgrade-action-btn').addEventListener('click', () => {
    if (!currentlyUpgradingId) return;
    const level = playerStats.levels[currentlyUpgradingId];
    if (level >= MAX_LEVEL) return; // Hard cap
    const cost = level * 200;

    if (playerStats.coins >= cost) {
        playerStats.coins -= cost;
        playerStats.levels[currentlyUpgradingId]++;
        saveStats();
        updateStatsUI();
        AudioController.play('upgrade');
        openUpgradeModal(currentlyUpgradingId);
        renderCharSelection();
    }
});

// --- New Screen Renderers ---
function renderBrawlPass() {
    const container = document.getElementById('bp-tiers-container');
    container.innerHTML = "";
    for (let i = 1; i <= 10; i++) {
        const canClaim = playerTrophies >= i * 100;
        const isClaimed = playerStats.claimedTiers.includes(i);
        
        const tier = document.createElement('div');
        tier.style = `background: rgba(255,255,255,0.1); padding: 10px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; border-right: 5px solid ${canClaim ? (isClaimed ? '#95a5a6' : '#f1c40f') : '#333'};`;
        
        const price = (i % 2 === 0 ? '50 🪙' : '10 💎');
        tier.innerHTML = `
            <div style="font-weight: bold; color: white;">דרגה ${i}</div>
            <div style="color: #f1c40f;">${price}</div>
            <button class="bs-btn bs-btn-small" ${(!canClaim || isClaimed) ? 'disabled' : ''} style="font-size: 0.8rem; padding: 5px 10px;">${isClaimed ? 'התקבל' : 'קבל'}</button>
        `;
        
        const btn = tier.querySelector('button');
        btn.onclick = () => claimTier(i);
        
        container.appendChild(tier);
    }
}

function claimTier(index) {
    if (playerStats.claimedTiers.includes(index) || playerTrophies < index * 100) return;
    
    if (index % 2 === 0) playerStats.coins += 50;
    else playerStats.gems += 10;
    
    playerStats.claimedTiers.push(index);
    saveStats();
    updateStatsUI();
    renderBrawlPass();
    AudioController.play('upgrade');
    alert("הפרס התקבל בהצלחה!");
}

function renderShop() {
    const container = document.getElementById('shop-items-container');
    container.innerHTML = "";
    const deals = [
        { name: 'חבילת זהב', price: '50 💎', icon: '💰', amount: 1000 },
        { name: 'מגה תיבה', price: '80 💎', icon: '📦', amount: 'רנדומלי' },
        { name: 'נקודות כוח', price: '100 🪙', icon: '⚡', amount: 50 },
        { name: 'סקין נדיר', price: '150 💎', icon: '🎨', amount: 1 }
    ];
    
    deals.forEach(deal => {
        const item = document.createElement('div');
        item.style = `background: rgba(255,255,255,0.05); border-radius: 12px; padding: 10px; display: flex; flex-direction: column; align-items: center; border: 2px solid rgba(255, 255, 255, 0.1); cursor: pointer;`;
        item.innerHTML = `
            <div style="font-size: 2rem;">${deal.icon}</div>
            <div style="font-weight: bold; color: white; margin: 5px 0;">${deal.name}</div>
            <div style="color: #fbc531;">${deal.price}</div>
        `;
        item.onclick = () => alert(`קנית ${deal.name}! (בכאילו)`);
        container.appendChild(item);
    });
}

function renderLeaderboard() {
    const container = document.getElementById('leaderboard-container');
    if (!container) return;
    container.innerHTML = "<div style='color: white; text-align: center;'>טוען מובילים...</div>";
    
    // Check if NetworkManager is ready
    if (!window.NetworkManager || !window.NetworkManager.isConfigured()) {
        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; padding: 12px; background: rgba(241, 196, 15, 0.3); border-radius: 12px; margin-bottom: 8px; border: 2px solid #f1c40f;">
                <span style="color: #f1c40f; font-weight: bold;">#1</span>
                <span style="font-weight: bold; color: white;">${playerStats.username} (אתה)</span>
                <span style="color: #f1c40f;">🏆 ${playerTrophies}</span>
            </div>
        `;
        return;
    }

    window.NetworkManager.listenOnlinePlayers((count, players) => {
        container.innerHTML = "";
        
        // Convert players object (keyed by username) to array
        const playersArray = Object.keys(players).map(username => {
            const p = players[username];
            const myPeerId = (window.NetworkManager.getPeerInstance ? window.NetworkManager.getPeerInstance().id : '');
            return {
                id: p.peerId || '',
                name: username,
                trophies: p.trophies || 0,
                isPlayer: p.peerId === myPeerId
            };
        });

        // Sort by trophies descending
        playersArray.sort((a, b) => b.trophies - a.trophies);

        playersArray.forEach((p, index) => {
            const row = document.createElement('div');
            row.style = `display: flex; justify-content: space-between; padding: 12px; background: ${p.isPlayer ? 'rgba(241, 196, 15, 0.3)' : 'rgba(255,255,255,0.1)'}; border-radius: 12px; margin-bottom: 8px; border: 2px solid ${p.isPlayer ? '#f1c40f' : 'transparent'};`;
            row.innerHTML = `
                <span style="color: ${p.isPlayer ? '#f1c40f' : '#bdc3c7'}; font-weight: bold;">#${index + 1}</span>
                <span style="font-weight: bold; color: white;">${p.name}${p.isPlayer ? ' (אתה)' : ''}</span>
                <span style="color: #f1c40f;">🏆 ${p.trophies}</span>
            `;
            container.appendChild(row);
        });
    });
}

// Start in the lobby (now handled in DOMContentLoaded)
// goToLobby();

// --- Network & Chat Integration ---
function initNetworkListeners() {
    if (isNetworkInitialized) return;
    if (!window.NetworkManager || !window.NetworkManager.isConfigured()) return;
    isNetworkInitialized = true;

    // 1. Listen for Online Count
    window.NetworkManager.listenOnlinePlayers((count, players) => {
        const countEl = document.getElementById('online-count');
        if (countEl) countEl.innerText = count;
        updateOnlinePlayersList(players);
    });

    // 2. Listen for Chat Messages
    if (window.NetworkManager.listenChat) {
        window.NetworkManager.listenChat((messages) => {
            const chatBox = document.getElementById('chat-messages');
            if (!chatBox) return;
            chatBox.innerHTML = messages.map(m => `
                <div>
                    <span class="chat-name">${m.username}:</span>
                    <span class="chat-text">${m.text}</span>
                </div>
            `).join('');
            chatBox.scrollTop = chatBox.scrollHeight;
        });
    }

    // 3. Listen for Incoming Invites
    window.addEventListener('remoteInvite', (e) => {
        const { from, fromId } = e.detail;
        showBattleInvite(from, fromId);
    });

    // 4. Listen for Battle Status
    window.addEventListener('battleAccepted', (e) => {
        const { roomId, opponent, isHost } = e.detail;
        startMultiplayerBattle(roomId, isHost, opponent);
    });
}

function updateOnlinePlayersList(players) {
    const listContainer = document.getElementById('online-players-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    const myPeerId = (window.NetworkManager.getPeerInstance ? window.NetworkManager.getPeerInstance().id : '');

    Object.keys(players).forEach(username => {
        const player = players[username];
        const isSelf = (player.peerId === myPeerId);
        if (isSelf) return; // Skip self

        const item = document.createElement('div');
        item.className = 'social-player-item';
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <div style="font-size: 1.2rem;">👤</div>
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: white; text-align: right;">${username}</div>
                    <div style="font-size: 0.8rem; color: #f1c40f; text-align: right;">🏆 ${player.trophies || 0}</div>
                </div>
            </div>
            <button class="hover-invite-btn" onclick="invitePlayer('${player.peerId}', '${username}')">הזמן ⚔️</button>
        `;
        listContainer.appendChild(item);
    });
}

function invitePlayer(peerId, name) {
    if (window.NetworkManager) {
        window.NetworkManager.sendInvite(peerId, playerStats.username);
        // Optional: show a "Waiting for response..." toast
        console.log("Invite sent to " + name);
    }
}
window.invitePlayer = invitePlayer;

function showBattleInvite(senderName, senderId) {
    const popup = document.getElementById('invite-notification');
    const text = document.getElementById('invite-from-text');
    const acceptBtn = document.getElementById('accept-invite-btn');
    const declineBtn = document.getElementById('decline-invite-btn');

    if (!popup || !text) return;

    text.innerText = `${senderName} מזמין אותך לקרב!`;
    popup.style.display = 'block';
    AudioController.play('spawn'); // Play a sound for the alert

    acceptBtn.onclick = () => {
        popup.style.display = 'none';
        window.NetworkManager.joinRoom(senderId);
    };

    declineBtn.onclick = () => {
        popup.style.display = 'none';
        // Optional: send decline message
    };
    
    // Auto-hide after 15 seconds
    setTimeout(() => {
        popup.style.display = 'none';
    }, 15000);
}

function toggleGlobalChat() {
    const sidebar = document.getElementById('global-chat-sidebar');
    if (sidebar) sidebar.classList.toggle('hidden');
}

function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text || !playerStats.username) return;
    
    if (window.NetworkManager && window.NetworkManager.isConfigured()) {
        window.NetworkManager.sendMessage(playerStats.username, text);
        input.value = '';
    } else {
        alert("⚠️ Firebase לא מוגדר! אנא הכנס את ה-Config שלך.");
    }
}

// Hook up chat events
document.addEventListener('DOMContentLoaded', () => {
    // Social button opens chat
    const socialBtn = document.querySelector('.social-btn');
    if (socialBtn) {
        socialBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleGlobalChat();
        });
    }

    const sendBtn = document.getElementById('send-chat-btn');
    if (sendBtn) sendBtn.addEventListener('click', sendChatMessage);

    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendChatMessage();
        });
    }

    // Initialize listeners
    setTimeout(initNetworkListeners, 1000); // Wait for module to load
});

// Update claimUsername to trigger Firebase
function claimUsername() {
    const input = document.getElementById('username-input');
    const name = input ? input.value.trim() : null;
    if (name) {
        playerStats.username = name;
        sessionStorage.setItem('brawlclash_username', name);
        const overlay = document.getElementById('username-overlay');
        if (overlay) overlay.style.display = 'none';
        updateStatsUI();
        
        // Initial update
        function updatePresence() {
            if (window.NetworkManager) {
                window.NetworkManager.updatePresence(name);
            }
        }
        updatePresence();
        
        // Heartbeat every 15 seconds (Faster for better presence)
        if (window.presenceInterval) clearInterval(window.presenceInterval);
        window.presenceInterval = setInterval(updatePresence, 15000);
    }
}
window.claimUsername = claimUsername;

// --- Network & Multiplayer Configuration ---
let currentBattleRoom = null;
let isHost = false;
let isNetworkInitialized = false;

// --- Multiplayer Communication Logic ---

function toggleGlobalChat() {
    const sidebar = document.getElementById('global-chat-sidebar');
    if (sidebar) sidebar.classList.toggle('hidden');
}

function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text || !playerStats.username) return;
    if (window.NetworkManager) {
        window.NetworkManager.sendMessage(playerStats.username, text);
        input.value = '';
    }
}

function openPlayersTab() {
    const sidebar = document.getElementById('global-chat-sidebar');
    if (sidebar) sidebar.classList.remove('hidden');
    
    // Switch to players tab
    document.getElementById('chat-window-content').style.display = 'none';
    document.getElementById('players-window-content').style.display = 'flex';
    document.getElementById('tab-players').style.background = 'var(--bs-yellow)';
    document.getElementById('tab-players').style.color = '#000';
    document.getElementById('tab-chat').style.background = 'var(--bs-blue)';
    document.getElementById('tab-chat').style.color = '#fff';

    // Force a re-render of online players
    if (window.NetworkManager) {
        window.NetworkManager.listenOnlinePlayers((count, players) => {
            // This is already handled by the global listener, but we ensure it's up to date
            updateOnlinePlayersList(players);
        });
    }
}
window.openPlayersTab = openPlayersTab;

function initGameListeners() {
    const socialBtn = document.querySelector('.social-btn');
    if (socialBtn) socialBtn.addEventListener('click', toggleGlobalChat);

    const sendBtn = document.getElementById('send-chat-btn');
    if (sendBtn) sendBtn.addEventListener('click', sendChatMessage);

    const chatInput = document.getElementById('chat-input');
    if (chatInput) chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(); });

    // Tab Switching
    const tabChat = document.getElementById('tab-chat');
    if (tabChat) tabChat.onclick = () => {
        document.getElementById('chat-window-content').style.display = 'flex';
        document.getElementById('players-window-content').style.display = 'none';
        tabChat.style.background = 'var(--bs-yellow)';
        tabChat.style.color = '#000';
        document.getElementById('tab-players').style.background = 'var(--bs-blue)';
    };
    
    const tabPlayers = document.getElementById('tab-players');
    if (tabPlayers) tabPlayers.onclick = () => {
        document.getElementById('chat-window-content').style.display = 'none';
        document.getElementById('players-window-content').style.display = 'flex';
        tabPlayers.style.background = 'var(--bs-yellow)';
        tabPlayers.style.color = '#000';
        document.getElementById('tab-chat').style.background = 'var(--bs-blue)';
    };
}
// Removed duplicate initNetworkListeners - consolidated at 2628

// --- PeerJS Integration ---
let isPeerJSInitialized = false;
function initPeerJS() {
    if (!window.NetworkManager || isPeerJSInitialized) return;
    if (!playerStats.username) {
        console.warn("🚫 Cannot init NetworkManager without username.");
        return;
    }
    
    isPeerJSInitialized = true;
    window.NetworkManager.init(playerStats.username, (id) => {
        console.log("✅ Multiplayer active with ID: " + id);
    });
}

function goToLobby() {
    if (!playerStats.username) {
        document.getElementById('username-overlay').style.display = 'flex';
        return;
    }
    switchScreen('lobby-screen');
    updateHomeScreen();
    updateStatsUI();
    updateTrophyUI();

    // Init PeerJS if not already
    if (!window.currentBattleRoom) initPeerJS();
}

// --- Emote System Integration ---
const EMOTE_MAP = {
    'angry': '😡',
    'laugh': '😂',
    'thumb': '👍',
    'cry': '😭'
};

function toggleEmoteMenu() {
    const selector = document.getElementById('emote-selector');
    if (selector) selector.classList.toggle('active');
}

window.sendEmote = (emoteId) => {
    if (!currentBattleRoom || !playerStats.username) return;
    if (window.NetworkManager) {
        window.NetworkManager.sendEmote(currentBattleRoom, playerStats.username, emoteId);
        toggleEmoteMenu(); // Hide after selection
    }
};

function displayEmote(senderName, emoteId) {
    const isMe = (senderName === playerStats.username);
    const emoji = EMOTE_MAP[emoteId] || '❓';
    
    const emoteDiv = document.createElement('div');
    emoteDiv.className = 'floating-emote emote-animate';
    emoteDiv.innerText = emoji;

    // Position above the correct safe based on who sent it
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.left + (rect.width / 2);
    
    // If it's me, show at bottom safe. If opponent, show at top safe.
    emoteDiv.style.left = `${centerX}px`;
    emoteDiv.style.top = isMe ? `${rect.top + rect.height - 150}px` : `${rect.top + 100}px`;

    document.body.appendChild(emoteDiv);
    setTimeout(() => emoteDiv.remove(), 2500); // Cleanup after animation
}

// --- Health Sync Integration ---
let healthSyncInterval = null;

function startHealthSync(roomId) {
    if (healthSyncInterval) clearInterval(healthSyncInterval);
    
    if (isHost) {
        // Host broadcasts the truth every 5 seconds
        healthSyncInterval = setInterval(() => {
            if (!currentBattleRoom || currentState !== GAME_STATE.PLAYING) return;
            if (window.NetworkManager && playerSafe && enemySafe) {
                window.NetworkManager.syncHealth(roomId, {
                    hostSafeHp: playerSafe.hp,
                    guestSafeHp: enemySafe.hp
                });
            }
        }, 5000);
    } else {
        // Guest listens and adjusts
        if (window.NetworkManager) {
            window.NetworkManager.listenHealth(roomId, (data) => {
                if (currentState !== GAME_STATE.PLAYING) return;
                // For guest: hostSafeHp is THEIR enemySafe, guestSafeHp is THEIR playerSafe
                if (playerSafe) playerSafe.hp = data.guestSafeHp;
                if (enemySafe) enemySafe.hp = data.hostSafeHp;
            });
        }
    }
}

function startMultiplayerBattle(roomId, hostFlag, opponentName) {
    currentBattleRoom = roomId;
    isHost = hostFlag;
    alert(`מתחיל בקרב נגד ${opponentName}!`);
    startSPSelection('battle');
    
    // Reset any old intervals
    if (healthSyncInterval) clearInterval(healthSyncInterval);

    if (window.NetworkManager) {
        window.NetworkManager.listenSpawns(roomId, (data) => {
            handleRemoteSpawn(data);
        });

        // Listen for game over from network
        window.NetworkManager.listenBattleStatus(roomId, (status, winner) => {
            if (status === 'finished' && currentState !== GAME_STATE.GAMEOVER) {
                handleNetworkGameOver(winner);
            }
        });

        // NEW: Listen for emotes
        window.NetworkManager.listenEmotes(roomId, (data) => {
            displayEmote(data.username, data.emoteId);
        });

        // NEW: Start Health Sync
        startHealthSync(roomId);
    }
}

// Ensure everything is hooked up correctly
document.addEventListener('DOMContentLoaded', () => {
    setupCanvas(); // Pre-init canvas
    initGameListeners();
    setTimeout(() => { if (window.NetworkManager) initNetworkListeners(); }, 1000);

    if (!playerStats.username) {
        const overlay = document.getElementById('username-overlay');
        if (overlay) overlay.style.display = 'flex';
    } else {
        if (window.NetworkManager) window.NetworkManager.updatePresence(playerStats.username);
    }

    const emoteBtn = document.getElementById('emote-bubble-btn');
    if (emoteBtn) emoteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleEmoteMenu();
    });

    // Close menu when clicking elsewhere
    document.addEventListener('click', () => {
        const selector = document.getElementById('emote-selector');
        if (selector) selector.classList.remove('active');
    });

    goToLobby();
    updateStatsUI();
});
