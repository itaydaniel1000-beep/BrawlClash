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

// --- Game State ---
const GAME_STATE = { MENU: 0, PLAYING: 1, PAUSED: 2, GAME_OVER: 3 };
let currentState = GAME_STATE.MENU;
let lastTime = 0;
let difficulty = 'normal';

// Entities
let units = [];
let projectiles = [];
let auras = []; 
let buildings = [];

// Player Stats
let playerElixir = 5;
let enemyElixir = 5;
let playerSafe = null;
let enemySafe = null;
let aiDeaths = [];
let pendingRebuilds = [];

const CARDS = {
    'bruce': { name: 'ברוס', cost: 3, type: 'unit', color: '#8c7ae6', icon: '🐻' },
    'brucey': { name: 'ברוסי', cost: 5, type: 'unit', color: '#8c7ae6', icon: '🐻' },
    'scrappy': { name: 'ספארקי', cost: 4, type: 'building', color: '#e1b12c', icon: '🐶' },
    'penny': { name: 'מרגמה פני', cost: 5, type: 'building', color: '#c23616', icon: '💣' },
    'pam': { name: 'ריפוי פאם', cost: 8, type: 'aura', color: '#44bd32', icon: '💚' },
    'max': { name: 'מהירות מקס', cost: 4, type: 'aura', color: '#fbc531', icon: '⚡' },
    '8bit': { name: 'מאיץ 8-ביט', cost: 4, type: 'aura', color: '#e84393', icon: '🕹️' },
    'emz': { name: 'שטח אמז', cost: 7, type: 'aura', color: '#9c88ff', icon: '🧴' }, // Spray
    'leon': { name: 'ליאון', cost: 10, type: 'unit', color: '#00cec9', icon: '🍭' }
};

// DOM
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const screens = document.querySelectorAll('.screen');
const elixirFill = document.getElementById('elixir-fill');
const elixirText = document.getElementById('elixir-text');
const deckContainer = document.getElementById('deck-container');

// Input
let selectedCardId = null; 

// --- Classes ---
class Entity {
    constructor(x, y, radius, team) {
        this.x = x; this.y = y; this.radius = radius; this.team = team;
        this.hp = 100;
        this.maxHp = 100;
        this.isDead = false;
        this.lastDamageTime = 0;
    }

    takeDamage(amount) {
        // The isInvisible check is specific to Unit, not generic Entity.
        // If an entity is invisible, it should not take damage.
        // This check is moved here from Unit.takeDamage to be generic.
        if (this.isInvisible) return; 
        this.hp -= amount;
        this.lastDamageTime = performance.now();
        if (this.hp <= 0) {
            this.isDead = true;
        }
    }
    drawHpBar(ctx, yOffset = 15) {
        const hpPercent = Math.max(0, this.hp / this.maxHp);
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x - 20, this.y - this.radius - yOffset, 40, 6);
        ctx.fillStyle = this.team === 'player' ? '#74b9ff' : '#ff7675';
        ctx.fillRect(this.x - 20, this.y - this.radius - yOffset, 40 * hpPercent, 6);
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
        let atkSpeedMult = 1;
        let damageMult = 1;
        auras.forEach(a => {
            if (a.team === this.team && Math.hypot(this.x - a.x, this.y - a.y) <= a.radius) {
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
        let enemies = units.concat(buildings, auras).filter(u => u.team !== this.team && !u.isInvisible);
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
        ctx.fillStyle = this.team === 'player' ? '#0984e3' : '#d63031';
        ctx.fillRect(-this.radius, -this.radius, this.radius*2, this.radius*2);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#2d3436';
        ctx.strokeRect(-this.radius, -this.radius, this.radius*2, this.radius*2);
        
        ctx.fillStyle = '#ffeaa7';
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill(); ctx.stroke();
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
        this.color = '#fff';
        this.isInvisible = false;
        this.icon = CARDS[type].icon;
        
        if (type === 'bruce') {
            this.maxHp = 1200; this.hp = 1200; this.attackDamage = 150; this.speed = 50; this.color = '#8c7ae6';
        } else if (type === 'brucey') {
            this.maxHp = 1380; this.hp = 1380; this.attackDamage = 172.5; this.speed = 50; this.color = '#8c7ae6';
        } else if (type === 'leon') {
            this.maxHp = 900; this.hp = 900; this.attackDamage = 200; this.speed = 50 * 1.3; this.color = '#00cec9';
            this.isInvisible = true; // Invincible and invisible until attack
        }
    }

    update(dt, now) {
        if (this.isDead) return;

        // Apply auras
        let speedMult = 1;
        let atkSpeedMult = 1;
        let damageMult = 1;
        auras.forEach(a => {
            if (a.team === this.team && Math.hypot(this.x - a.x, this.y - a.y) <= a.radius) {
                if (a.type === 'max') {
                    speedMult = 1.5; // 50% movement speed
                    atkSpeedMult = 0.5; // ~50% attack speed equivalent delay multiplier
                } else if (a.type === '8bit') {
                    damageMult = 1.1; // 10% damage
                }
            }
        });

        if (this.type === 'brucey') {
            // Brucey attacks everything
            let enemies = units.concat(buildings, auras).concat([this.team === 'player' ? enemySafe : playerSafe]).filter(e => e.team !== this.team && !e.isInvisible && !e.isDead);
            this.target = enemies.length > 0 ? enemies.sort((a,b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y))[0] : null;
        } else {
            // Find target: Safe exclusively (Leon, Bruce)
            this.target = this.team === 'player' ? enemySafe : playerSafe;
        }
        
        if (this.target && !this.target.isDead) {
            let dist = Math.hypot(this.target.x - this.x, this.target.y - this.y);
            if (dist <= this.attackRange + this.target.radius) {
                // Attack
                if (now - this.lastAttackTime > this.attackSpeed * atkSpeedMult) {
                    if (this.isInvisible) this.isInvisible = false; // Reveal on attack
                    this.target.takeDamage(this.attackDamage * damageMult);
                    this.lastAttackTime = now;
                    // Melee punch effect
                    projectiles.push(new MeleeEffect(this.x + (this.target.x - this.x)*0.5, this.y + (this.target.y - this.y)*0.5));
                }
            } else {
                // Move towards
                let angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
                let dashMult = (now < (this.dashEndTime || 0)) ? 5 : 1; // 5x speed during dash
                
                if (this.type === 'brucey') {
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
        if (this.isInvisible) return; // Invincible
        super.takeDamage(amount);
    }

    triggerDash(now) {
        if (this.type === 'brucey' && (!this.lastDashTime || now - this.lastDashTime > 3000)) {
            this.dashEndTime = now + 1600; // 1600ms dash (4x longer)
            this.lastDashTime = now;
        }
    }

    draw(ctx) {
        if (this.isInvisible && this.team !== 'player') return; // Don't draw enemy Leon if invisible
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        
        if (this.isInvisible) ctx.globalAlpha = 0.5; // Player sees their own Leon as ghostly
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = this.team === 'player' ? '#00a8ff' : '#e84118';
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.icon, this.x, this.y);

        if (!this.isInvisible) this.drawHpBar(ctx);
    }
}

class Building extends Entity {
    constructor(x, y, team, type) {
        super(x, y, 20, team);
        this.type = type;
        this.attackRange = 178; // 162 + 10%
        this.attackSpeed = 1000;
        this.lastAttackTime = 0;
        this.icon = CARDS[type].icon;
        
        if (type === 'scrappy') {
            this.maxHp = 800; this.hp = 800; this.color = '#e1b12c'; this.attackDamage = 60; this.attackSpeed = 500;
        } else if (type === 'penny') {
            this.maxHp = 600; this.hp = 600; this.color = '#c23616'; this.attackDamage = 200; this.attackSpeed = 2500;
            this.attackRange = 286; // 260 + 10%
        }
    }

    update(dt, now) {
        if (this.isDead) return;
        
        let atkSpeedMult = 1;
        let damageMult = 1;
        auras.forEach(a => {
            if (a.team === this.team && Math.hypot(this.x - a.x, this.y - a.y) <= a.radius) {
                if (a.type === 'max') atkSpeedMult = 0.5; // 50% faster attack speed modifier
                if (a.type === '8bit') damageMult = 1.1; // 10% damage
            }
        });

        if (now - this.lastAttackTime > this.attackSpeed * atkSpeedMult) {
            // Find target
            let enemies = units.concat(buildings, auras).concat([this.team === 'player' ? enemySafe : playerSafe]).filter(e => e.team !== this.team && !e.isInvisible);
            let inRange = enemies.filter(e => Math.hypot(e.x - this.x, e.y - this.y) <= this.attackRange);
            if (inRange.length > 0) {
                inRange.sort((a,b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y));
                let target = inRange[0];
                
                let isSplash = false; // removed splash damage from penny
                projectiles.push(new Projectile(this.x, this.y, target, this.attackDamage * damageMult, this.team, isSplash));
                this.lastAttackTime = now;
            }
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.radius, this.y - this.radius, this.radius*2, this.radius*2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = this.team === 'player' ? '#00a8ff' : '#e84118';
        ctx.strokeRect(this.x - this.radius, this.y - this.radius, this.radius*2, this.radius*2);
        
        ctx.font = '22px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.icon, this.x, this.y);

        this.drawHpBar(ctx, 25);
    }
}

class Aura extends Entity {
    constructor(x, y, team, type) {
        super(x, y, 110, team); // Default large radius (100 + 10%)
        this.type = type;
        this.maxHp = type === 'emz' ? 800 : 1500; this.hp = this.maxHp;
        this.lastTickTime = 0;
        this.spawnTime = performance.now();
        
        if (type === 'pam') {
            this.radius = 82; // Increased by 10% from 75
            this.color = 'rgba(46, 204, 113, 0.3)';
            this.maxHp = 700; this.hp = this.maxHp;
        } else if (type === 'max') {
            this.radius = 82; // 75 + 10%
            this.color = 'rgba(241, 196, 15, 0.3)';
            this.maxHp = 700; this.hp = this.maxHp;
        } else if (type === '8bit') {
            this.radius = 82; // Like Pam's
            this.color = 'rgba(232, 67, 147, 0.3)';
            this.maxHp = 700; this.hp = this.maxHp;
        } else if (type === 'emz') {
            this.radius = 132; // 120 + 10%
            this.color = 'rgba(156, 136, 255, 0.3)';
            this.maxHp = 1000; this.hp = this.maxHp;
        }
    }

    update(dt, now) {
        if (this.isDead) return;

        if (this.type === 'pam' && now - this.lastTickTime > 1000) {
            // Heal 15 HP per second to all allies
            let allies = units.concat(buildings, auras).concat([this.team === 'player' ? playerSafe : enemySafe]).filter(e => e.team === this.team);
            allies.forEach(a => {
                if (a !== this && Math.hypot(this.x - a.x, this.y - a.y) <= this.radius) {
                    a.hp = Math.min(a.maxHp, a.hp + 100);
                }
            });
            this.lastTickTime = now;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = this.team === 'player' ? '#fff' : '#ff4757';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // HP Bar for all Auras
        this.drawHpBar(ctx, -20);
    }
}

class Projectile {
    constructor(x, y, target, damage, team, isSplash) {
        this.x = x; this.y = y; this.target = target;
        this.targetX = target.x; this.targetY = target.y; // For tracking
        this.damage = damage; this.team = team; this.isSplash = isSplash;
        this.speed = 300;
        this.isDead = false;
    }
    update(dt) {
        if (this.target && !this.target.isDead) {
            this.targetX = this.target.x; this.targetY = this.target.y;
        }
        let angle = Math.atan2(this.targetY - this.y, this.targetX - this.x);
        this.x += Math.cos(angle) * this.speed * (dt / 1000);
        this.y += Math.sin(angle) * this.speed * (dt / 1000);

        if (Math.hypot(this.targetX - this.x, this.targetY - this.y) < 10) {
            this.hit();
        }
    }
    hit() {
        this.isDead = true;
        if (this.isSplash) {
            // Explosion radius 80
            let enemies = units.concat(buildings, auras).concat([this.team === 'player' ? enemySafe : playerSafe]).filter(e => e.team !== this.team);
            enemies.forEach(e => {
                if (Math.hypot(e.x - this.targetX, e.y - this.targetY) <= 80) e.takeDamage(this.damage);
            });
            projectiles.push(new ExplosionEffect(this.targetX, this.targetY, 80));
        } else {
            if (this.target && !this.target.isDead) this.target.takeDamage(this.damage);
        }
    }
    draw(ctx) {
        ctx.beginPath(); ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#000'; ctx.fill();
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

// --- Logic functions ---

function buildDeck() {
    deckContainer.innerHTML = '';
    const keys = Object.keys(CARDS);
    // Give player all available cards in the deck
    for(let i=0; i<keys.length; i++) {
        let cardKey = keys[i];
        let card = CARDS[cardKey];
        let d = document.createElement('div');
        d.className = 'card';
        d.id = `card-${cardKey}`;
        d.style.borderColor = card.color;
        
        let costLabel = document.createElement('div');
        costLabel.className = 'card-cost';
        costLabel.innerText = card.cost;
        
        let iconLabel = document.createElement('div');
        iconLabel.className = 'card-icon';
        iconLabel.innerText = card.icon;
        
        let nameLabel = document.createElement('div');
        nameLabel.className = 'card-name';
        nameLabel.innerText = card.name;
        
        d.appendChild(costLabel);
        d.appendChild(iconLabel);
        d.appendChild(nameLabel);
        
        d.onclick = () => selectCard(cardKey, d);
        deckContainer.appendChild(d);
    }
}

function selectCard(cardKey, element) {
    document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
    if (playerElixir >= CARDS[cardKey].cost) {
        selectedCardId = cardKey;
        element.classList.add('selected');
    } else {
        selectedCardId = null; // not enough elixir
    }
}

canvas.addEventListener('click', (e) => {
    if (!selectedCardId) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // Check placement validity
    // Player can place in lower half, or inside an active Emz aura
    let validPlacement = y > (CONFIG.CANVAS_HEIGHT / 2);
    if (!validPlacement) {
        let insideEmz = auras.some(a => a.team === 'player' && a.type === 'emz' && Math.hypot(x - a.x, y - a.y) <= a.radius);
        if (insideEmz) validPlacement = true;
    }
    
    if (!validPlacement && CARDS[selectedCardId].type !== 'aura') {
        // Invalid placement
        return; 
    }
    
    spawnEntity(x, y, 'player', selectedCardId);
    selectedCardId = null;
    document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
});

function spawnEntity(x, y, team, typeStr) {
    let card = CARDS[typeStr];
    if (team === 'player') playerElixir -= card.cost;
    else enemyElixir -= card.cost;

    let entity;
    if (card.type === 'aura') {
        entity = new Aura(x, y, team, typeStr);
        auras.push(entity);
    } else if (card.type === 'building') {
        entity = new Building(x, y, team, typeStr);
        buildings.push(entity);
    } else {
        entity = new Unit(x, y, 15, team, typeStr);
        units.push(entity);
    }
    
    // Hard mode +30% HP, -20% Damage
    if (difficulty === 'hard' && team === 'enemy') {
        entity.maxHp *= 1.3;
        entity.hp = entity.maxHp;
        if (entity.attackDamage !== undefined) {
            entity.attackDamage *= 0.8; // Reduced damage by 20%
        }
    }
}

// --- Initialization & Setup ---
function initGame() {
    units = []; buildings = []; projectiles = []; auras = [];
    playerElixir = 5; enemyElixir = 5; aiDeaths = []; pendingRebuilds = [];
    hardAIState = 0; aiDelayTimer = 0; hardAIAttackY = 250; hardAIEmzPlaced = false;
    playerSafe = new Safe(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT - 60, 'player');
    enemySafe = new Safe(CONFIG.CANVAS_WIDTH / 2, 60, 'enemy');
    
    if (difficulty === 'hard') {
        enemySafe.maxHp *= 1.3;
        enemySafe.hp = enemySafe.maxHp;
    }
    
    buildDeck();
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

// --- Game Loop ---
function gameLoop(now) {
    if (currentState !== GAME_STATE.PLAYING) return;
    const dt = now - lastTime;
    lastTime = now;

    update(dt, now);
    draw(ctx);
    requestAnimationFrame(gameLoop);
}

function update(dt, now) {
    if (playerElixir < CONFIG.MAX_ELIXIR) playerElixir += (CONFIG.ELIXIR_GEN_RATE * dt / 1000);
    if (enemyElixir < CONFIG.MAX_ELIXIR) {
        let aiGenMult = difficulty === 'hard' ? 1.5 : 1.0;
        enemyElixir += (CONFIG.ELIXIR_GEN_RATE * aiGenMult * dt / 1000);
    }

    [...auras, ...buildings, ...units, ...projectiles, playerSafe, enemySafe].forEach(e => {
        if (e && e.update) e.update(dt, now);
        if (e && e.isDead && !e.deathLogged && e.team === 'enemy' && e.type && CARDS[e.type]) {
            e.deathLogged = true;
            aiDeaths.push({type: e.type, x: e.x, y: e.y, time: now});
            pendingRebuilds.push({type: e.type, x: e.x, y: e.y});
        }
    });

    aiDeaths = aiDeaths.filter(d => now - d.time <= 20000);

    // Cleanup dead entities
    auras = auras.filter(e => !e.isDead);
    buildings = buildings.filter(e => !e.isDead);
    units = units.filter(e => !e.isDead);
    projectiles = projectiles.filter(e => !e.isDead);

    // AI Basic update
    aiUpdate(dt, now);
    updateUI();

    // Game Over check
    if (playerSafe.isDead || enemySafe.isDead) {
        currentState = GAME_STATE.GAME_OVER;
        document.getElementById('game-over-title').innerText = playerSafe.isDead ? "הפסדת!" : "ניצחון!";
        document.getElementById('game-over-menu').classList.add('active');
    }
}

let hardAIState = 0; // State machine for hard AI
let aiDelayTimer = 0;
let hardAIAttackY = 250;
let hardAIEmzPlaced = false;

function aiUpdate(dt, now) {
    if (aiDelayTimer > now) return;

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
            // Find incoming player units
            let incoming = units.concat(buildings).filter(u => u.team === 'player');
            if (incoming.length > 0) {
                // Defend lane
                let targetLoc = incoming[0].x;
                if (enemyElixir >= 9 && Math.random() > 0.5) spawnEntity(targetLoc, 100, 'enemy', 'pam');
                else spawnEntity(targetLoc, 150, 'enemy', 'scrappy');
                aiDelayTimer = now + 1500;
            } else if (enemyElixir >= 8) {
                // Push
                spawnEntity(CONFIG.CANVAS_WIDTH/2, 100, 'enemy', 'leon');
                aiDelayTimer = now + 2000;
            }
        }
    } else if (difficulty === 'hard') {
        let playerBruces = units.filter(u => u.team === 'player' && (u.type === 'bruce' || u.type === 'brucey')).length;
        let safeUnderAttack = (now - (enemySafe.lastDamageTime || 0) < 15000) || units.some(u => u.team === 'player' && u.target === enemySafe);
        let needsDefense = playerBruces > 0 || safeUnderAttack;
        
        if (hardAIState < 7 && !needsDefense) {
            hardAIState = 7; // Skip defense mode entirely!
        } else if (hardAIState >= 7 && needsDefense) {
            hardAIState = 0; // Emergency revert to defense mode!
            hardAIAttackY = 250;
            aiDelayTimer = now + 500;
        }

        // Scripted complex defense
        if (hardAIState === 0 && enemyElixir >= 4) {
            spawnEntity(enemySafe.x, enemySafe.y, 'enemy', 'max');
            hardAIState++; aiDelayTimer = now + 500;
        } else if (hardAIState >= 1 && hardAIState <= 4) {
            let sparkiesSpawned = hardAIState - 1;
            if (playerBruces > sparkiesSpawned && enemyElixir >= 4) {
                let offsets = [ {x: -60, y: 50}, {x: -20, y: 75}, {x: 20, y: 75}, {x: 60, y: 50} ];
                let off = offsets[sparkiesSpawned];
                spawnEntity(enemySafe.x + off.x, enemySafe.y + off.y, 'enemy', 'scrappy');
                hardAIState++; aiDelayTimer = now + 400;
            } else if (enemyElixir >= 9.5) {
                hardAIState = 5; // Player hasn't deployed Bruces, skip remaining Sparkies to prevent lockup
            }
        } else if (hardAIState === 5 && enemyElixir >= 8) {
            spawnEntity(enemySafe.x, enemySafe.y, 'enemy', 'pam');
            hardAIState++; aiDelayTimer = now + 500;
        } else if (hardAIState === 6 && enemyElixir >= 8) {
            spawnEntity(enemySafe.x, enemySafe.y, 'enemy', 'pam');
            hardAIState++; aiDelayTimer = now + 500;
        } else if (hardAIState === 7 && enemyElixir >= 8) {
            spawnEntity(CONFIG.CANVAS_WIDTH/2, hardAIAttackY, 'enemy', 'pam');
            hardAIState++; aiDelayTimer = now + 500;
        } else if (hardAIState === 8 && enemyElixir >= 8) {
            spawnEntity(CONFIG.CANVAS_WIDTH/2, hardAIAttackY, 'enemy', 'pam');
            hardAIState++; aiDelayTimer = now + 500;
        } else if (hardAIState === 9 && enemyElixir >= 10) {
            spawnEntity(CONFIG.CANVAS_WIDTH/2 - 60, hardAIAttackY + 50, 'enemy', 'penny');
            spawnEntity(CONFIG.CANVAS_WIDTH/2 - 20, hardAIAttackY + 75, 'enemy', 'penny');
            hardAIState++; aiDelayTimer = now + 500;
        } else if (hardAIState === 10 && enemyElixir >= 10) {
            spawnEntity(CONFIG.CANVAS_WIDTH/2 + 20, hardAIAttackY + 75, 'enemy', 'penny');
            spawnEntity(CONFIG.CANVAS_WIDTH/2 + 60, hardAIAttackY + 50, 'enemy', 'penny');
            
            // Advance the attack loop
            hardAIAttackY += 100;
            if (hardAIAttackY >= CONFIG.CANVAS_HEIGHT / 2 && !hardAIEmzPlaced) {
                hardAIState = 11; // Place Emz at the border!
            } else {
                if (hardAIAttackY >= CONFIG.CANVAS_HEIGHT - 60) {
                    hardAIAttackY = CONFIG.CANVAS_HEIGHT - 60; // Cap
                    hardAIState = 12; // Finish attack cycle!
                } else {
                    hardAIState = 7; // Loop back
                }
            }
            aiDelayTimer = now + 1000;
        } else if (hardAIState === 11 && enemyElixir >= 7) {
            spawnEntity(CONFIG.CANVAS_WIDTH/2, hardAIAttackY, 'enemy', 'emz');
            hardAIEmzPlaced = true;
            hardAIState = 7; // Go back to the loop
            aiDelayTimer = now + 500;
        } else if (hardAIState === 12) {
            // "Until he finishes one attack"
            // Reset to defense mode for the next wave!
            hardAIState = 0;
            hardAIAttackY = 250;
            hardAIEmzPlaced = false;
            aiDelayTimer = now + 2000;
        }
    }
}

function drawBackground(ctx) {
    ctx.fillStyle = '#4cd137'; ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, CONFIG.CANVAS_HEIGHT / 2); ctx.lineTo(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT / 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, 60, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeRect(CONFIG.CANVAS_WIDTH / 2 - 150, 0, 300, 150);
    ctx.strokeRect(CONFIG.CANVAS_WIDTH / 2 - 150, CONFIG.CANVAS_HEIGHT - 150, 300, 150);
}

function draw(ctx) {
    ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    drawBackground(ctx);
    [...auras, ...buildings, ...units, ...projectiles, playerSafe, enemySafe].forEach(e => {
        if (e && e.draw) e.draw(ctx);
    });
}

function updateUI() {
    elixirFill.style.width = `${Math.min(100, (playerElixir / CONFIG.MAX_ELIXIR) * 100)}%`;
    elixirText.innerText = `${Math.floor(playerElixir)} / 10`;
    
    // Update Dash Button
    let dashBtn = document.getElementById('brucey-dash-btn');
    if (dashBtn) {
        let activeBruceys = units.filter(u => u.team === 'player' && u.type === 'brucey' && !u.isDead);
        if (activeBruceys.length > 0) {
            let now = performance.now();
            let anyReady = activeBruceys.some(u => !u.lastDashTime || now - u.lastDashTime > 3000);
            dashBtn.style.display = 'block';
            dashBtn.style.opacity = anyReady ? '1' : '0.5';
        } else {
            dashBtn.style.display = 'none';
        }
    }

    // Update deck availability
    document.querySelectorAll('.card').forEach(c => {
        let cardKey = c.id.replace('card-', '');
        if (playerElixir < CARDS[cardKey].cost) {
            c.classList.add('disabled');
            if (selectedCardId === cardKey) {
                selectedCardId = null;
                c.classList.remove('selected');
            }
        } else {
            c.classList.remove('disabled');
        }
    });
}

// Event Listeners (UI hooks)
document.getElementById('brucey-dash-btn').addEventListener('click', () => {
    let now = performance.now();
    units.forEach(u => {
        if (u.team === 'player' && u.type === 'brucey' && (!u.lastDashTime || now - u.lastDashTime > 3000)) {
            u.triggerDash(now);
        }
    });
});

document.getElementById('start-btn').addEventListener('click', () => {
    difficulty = document.getElementById('difficulty-select').value;
    switchScreen('game-screen');
    currentState = GAME_STATE.PLAYING;
    initGame();
});

document.getElementById('pause-btn').addEventListener('click', () => {
    currentState = GAME_STATE.PAUSED;
    document.getElementById('pause-menu').classList.add('active');
});

document.getElementById('resume-btn').addEventListener('click', () => {
    currentState = GAME_STATE.PLAYING;
    document.getElementById('pause-menu').classList.remove('active');
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
});

document.getElementById('quit-btn').addEventListener('click', () => {
    currentState = GAME_STATE.MENU;
    document.getElementById('pause-menu').classList.remove('active');
    switchScreen('main-menu');
});

document.getElementById('restart-btn').addEventListener('click', () => {
    document.getElementById('game-over-menu').classList.remove('active');
    initGame();
    currentState = GAME_STATE.PLAYING;
});

function switchScreen(screenId) {
    screens.forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}
