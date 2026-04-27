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

        // Last-line-of-defence wipe: clear any adminHacks fields the local
        // user isn't actually entitled to, BEFORE we read any of them below
        // (startingElixir, maxElixir, safeHpMultiplier, doubleSafe ...) and
        // before aiUpdate starts honouring stale `disableBot` etc. The wipe
        // is per-field (super-admin keeps everything; granted users keep
        // only what their grant lists; everyone else loses everything).
        if (typeof _wipeStaleAdminHacksIfNotAdmin === 'function') {
            try { _wipeStaleAdminHacksIfNotAdmin(); } catch (e) {}
        }

        units = []; buildings = []; projectiles = []; auras = [];
        particles = []; floatingTexts = [];
        // Admin-granted overrides: startingElixir / maxElixir (0 = use default).
        const startE = (typeof adminHacks !== 'undefined' && adminHacks.startingElixir) ? adminHacks.startingElixir : 5;
        const maxE   = (typeof adminHacks !== 'undefined' && adminHacks.maxElixir) ? adminHacks.maxElixir : 10;
        playerElixir = startE; enemyElixir = 5; aiDeaths = []; pendingRebuilds = [];
        playerMaxElixir = maxE; playerKills = 0;
        selectedCardId = null; selectedFreezeCardId = null; isSelectingBullDash = false; isSelectingBonnieTransform = false;

        hardAIState = 0; aiDelayTimer = 0; hardAIAttackY = 250; hardAIEmzPlaced = false;
        aiWavePreparation = false;
        aiWaveStartTime = 0;
        aiWaveUnitsSpawned = 0;

        playerSafe = new Safe(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT - 60, 'player');
        enemySafe = new Safe(CONFIG.CANVAS_WIDTH / 2, 60, 'enemy');
        // Admin-granted safeHpMultiplier buffs the player's own safe (not the enemy's).
        if (typeof adminHacks !== 'undefined' && adminHacks.safeHpMultiplier > 1) {
            playerSafe.maxHp *= adminHacks.safeHpMultiplier;
            playerSafe.hp = playerSafe.maxHp;
        }
        // Admin: add a second player safe next to the first one. The game-over
        // check already walks both; just pushing a sibling into `buildings`
        // (so it's rendered/updated) is enough.
        if (typeof adminHacks !== 'undefined' && adminHacks.doubleSafe) {
            const extraSafe = new Safe(CONFIG.CANVAS_WIDTH / 2 - 140, CONFIG.CANVAS_HEIGHT - 60, 'player');
            extraSafe.isDecoy = true;  // second safe; used for defence only
            buildings.push(extraSafe);
        }
        // Both safes otherwise keep the flat 5000 HP from CONFIG.SAFE_MAX_HP — no
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

// Admin `autoIncome` — once installed, ticks every 10 s and if the flag is
// on at that moment adds +100 coins + +5 gems + saves. Installed exactly once.
(function installAutoIncome() {
    if (window._bcAutoIncomeInstalled) return;
    window._bcAutoIncomeInstalled = true;
    setInterval(() => {
        if (typeof adminHacks === 'undefined' || !adminHacks.autoIncome) return;
        if (!playerStats) return;
        playerStats.coins = (playerStats.coins || 0) + 100;
        playerStats.gems  = (playerStats.gems  || 0) + 5;
        if (typeof saveStats === 'function') saveStats();
        if (typeof updateStatsUI === 'function') updateStatsUI();
    }, 10000);
})();

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

    // 🪄 Bonnie transform button — visible while ≥1 player-team Bonnie
    // is alive on the field. Red while transform-select is active so the
    // player can see "click on a Bonnie to morph" mode is engaged.
    const bonnieBtn = document.getElementById('bonnie-transform-btn');
    if (bonnieBtn) {
        const activeBonnies = (typeof buildings !== 'undefined' ? buildings : [])
            .filter(b => b && b.team === 'player' && b.type === 'bonnie' && !b.isDead);
        if (activeBonnies.length > 0) {
            bonnieBtn.style.display = 'block';
            bonnieBtn.style.backgroundColor = isSelectingBonnieTransform ? '#ff4757' : '#a29bfe';
        } else {
            bonnieBtn.style.display = 'none';
            // If the last Bonnie died while transform-select was on, drop
            // the mode so a stale state doesn't intercept a future click.
            if (isSelectingBonnieTransform) isSelectingBonnieTransform = false;
        }
    }

    // 🎯 path-mode button — visible while ANY walking-unit card is held
    // (bruce / leon / bull / amber). Buildings and auras don't show it.
    // Turns red while the player is laying down waypoints so it's obvious
    // the next click on the map adds a path point (not places a unit).
    const amberBtn = document.getElementById('amber-path-btn');
    if (amberBtn) {
        const heldCard = selectedCardId && CARDS[selectedCardId];
        const isWalking = !!(heldCard && heldCard.type === 'unit');
        const showBtn = isWalking && (currentState === GAME_STATE.PLAYING);
        if (showBtn) {
            amberBtn.style.display = 'block';
            amberBtn.style.backgroundColor = isSelectingAmberPath ? '#c0392b' : '#e67e22';
            const n = (typeof _amberPendingPath !== 'undefined') ? _amberPendingPath.length : 0;
            // Amber has the 6-waypoint cap → "N/6". Other walking units are
            // uncapped → just show "N".
            const isAmberMode = (typeof _pendingPathCardId !== 'undefined' && _pendingPathCardId === 'amber') ||
                                (selectedCardId === 'amber');
            if (isSelectingAmberPath) {
                amberBtn.innerText = isAmberMode ? ('🎯 ' + n + '/6') : ('🎯 ' + n);
            } else {
                amberBtn.innerText = '🎯';
            }
        } else {
            amberBtn.style.display = 'none';
            // Bail out of path mode if the user un-selects the card mid-flight.
            if (isSelectingAmberPath) {
                isSelectingAmberPath = false;
                _amberPendingPath = [];
                _pendingPathCardId = null;
            }
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
