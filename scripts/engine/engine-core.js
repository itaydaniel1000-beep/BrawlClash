// engine-core.js - Game Loop and Core State Management

function setupCanvas() {
    canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.width = 600;
    canvas.height = 900;
    
    charCardsContainer = document.getElementById('char-cards-container');
    charCountDisplay = document.getElementById('char-count-display');
    elixirFill = document.getElementById('elixir-fill');
    elixirText = document.getElementById('elixir-text');
    countEl = document.getElementById('online-count');
    deckContainer = document.getElementById('deck-container');

    console.log(`📏 Canvas initialized: ${canvas.width} x ${canvas.height}`);
}

function startGame() {
    currentState = GAME_STATE.PLAYING;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const gameScreen = document.getElementById('game-screen');
    if (gameScreen) gameScreen.classList.add('active');
    document.querySelectorAll('.side-panel').forEach(p => p.style.display = 'flex');

    initGame();
}
window.startGame = startGame;

function initGame() {
    try {
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

        hardAIState = 0; aiDelayTimer = 0; hardAIAttackY = 250; hardAIEmzPlaced = false;
        aiWavePreparation = false;
        aiWaveStartTime = 0;
        aiWaveUnitsSpawned = 0;

        playerSafe = new Safe(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT - 60, 'player');
        enemySafe = new Safe(CONFIG.CANVAS_WIDTH / 2, 60, 'enemy');
        // Both safes keep the flat 5000 HP from CONFIG.SAFE_MAX_HP — no
        // per-difficulty bonus for the enemy safe.

        buildDeck();
        updateUI();

        if (!gameLoopRunning) {
            lastTime = performance.now();
            gameLoopRunning = true;
            requestAnimationFrame(gameLoop);
        }
    } catch (e) {
        console.error("Critical error in initGame:", e);
        if (!playerSafe) playerSafe = new Safe(300, 840, 'player');
        if (!enemySafe) enemySafe = new Safe(300, 60, 'enemy');

        if (!gameLoopRunning) {
            lastTime = performance.now();
            gameLoopRunning = true;
            requestAnimationFrame(gameLoop);
        }
    }
}

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

function updateUI() {
    if (elixirFill) elixirFill.style.width = `${Math.min(100, (playerElixir / playerMaxElixir) * 100)}%`;
    if (elixirText) {
        elixirText.style.direction = "ltr";
        elixirText.style.display = "inline-block";
        elixirText.innerHTML = `<span style="unicode-bidi: isolate;">${Math.floor(playerElixir)} / ${playerMaxElixir}</span>`;
    }

    let dashBtn = document.getElementById('bull-dash-btn');
    if (dashBtn) {
        let activeBulls = units.filter(u => u.team === 'player' && u.type === 'bull' && !u.isDead && !u.hasDashed);
        if (activeBulls.length > 0) {
            dashBtn.style.display = 'block';
            dashBtn.style.backgroundColor = isSelectingBullDash ? '#ff4757' : '#8c7ae6';
        } else {
            dashBtn.style.display = 'none';
        }
    }

    document.querySelectorAll('.card').forEach(d => {
        let cardKey = d.id.replace('card-', '');
        if (CARDS[cardKey]) {
            const canAfford = playerElixir >= (CARDS[cardKey].cost - 0.01) || adminHacks.infiniteElixir;
            if (!canAfford) d.classList.add('disabled');
            else d.classList.remove('disabled');
        }
    });

    let releaseBtn = document.getElementById('release-freeze-btn');
    if (releaseBtn) {
        let hasFrozen = units.some(u => u.team === 'player' && u.isFrozen) || buildings.some(b => b.team === 'player' && b.isFrozen) || auras.some(a => a.team === 'player' && a.isFrozen);
        releaseBtn.style.display = hasFrozen ? 'block' : 'none';
    }
}
