// engine-core.js - Game Loop and Core State Management

// Move special action buttons to <body> on mobile so overflow:hidden on #app
// doesn't clip them. On desktop restore to canvas-wrap.
var _actionBtnOriginalParent = null;

function _positionActionButtons() {
    var IDS         = ['admin-delete-btn', 'amber-path-btn', 'bull-dash-btn', 'bonnie-transform-btn', 'icecream-btn'];
    var MOBILE_TOPS = ['22%', '36%', '50%', '64%', '78%'];
    var BG_COLORS   = ['#c0392b', '#e67e22', '#8c7ae6', '#a29bfe', '#3498db'];

    var isMobile = ('ontouchstart' in window) ||
                   (navigator.maxTouchPoints > 0) ||
                   (window.innerWidth <= 768);

    IDS.forEach(function(id, i) {
        var btn = document.getElementById(id);
        if (!btn) return;

        if (isMobile) {
            // Move to <body> so #app overflow:hidden won't clip.
            if (btn.parentElement !== document.body) {
                if (!_actionBtnOriginalParent) _actionBtnOriginalParent = btn.parentElement;
                document.body.appendChild(btn);
            }
            var prevDisplay = btn.style.display;
            btn.style.cssText = '';
            btn.style.display      = prevDisplay || 'none';
            btn.style.position     = 'fixed';
            btn.style.top          = MOBILE_TOPS[i];
            btn.style.bottom       = 'auto';
            btn.style.right        = '4px';
            btn.style.left         = 'auto';
            btn.style.width        = '44px';
            btn.style.height       = '44px';
            btn.style.fontSize     = '20px';
            btn.style.zIndex       = '9999';
            btn.style.boxSizing    = 'border-box';
            btn.style.borderRadius = '50%';
            btn.style.border       = '3px solid #fff';
            btn.style.color        = '#fff';
            btn.style.cursor       = 'pointer';
            btn.style.background   = BG_COLORS[i];
            btn.style.fontFamily   = "'Fredoka One', cursive";
            btn.style.boxShadow    = '0 4px 8px rgba(0,0,0,0.5)';

        } else {
            // Restore to canvas-wrap
            if (_actionBtnOriginalParent && btn.parentElement === document.body) {
                _actionBtnOriginalParent.appendChild(btn);
            }
            var prevDisplay2 = btn.style.display;
            btn.style.cssText   = '';
            btn.style.display   = prevDisplay2 || 'none';
            btn.style.position  = 'absolute';
            btn.style.top       = 'auto';
            btn.style.left      = 'auto';
            btn.style.right     = ['60px','130px','60px','200px','60px'][i];
            btn.style.bottom    = ['70px','10px','10px','10px','140px'][i];
            btn.style.zIndex    = '100';
        }
    });
}
window._positionActionButtons = _positionActionButtons;

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
        selectedCardId = null; selectedFreezeCardId = null; isSelectingBullDash = false; isSelectingBonnieTransform = false; isSelectingIcecream = false;

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
        _positionActionButtons();
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

    // Barry's 🍦 button — visible the moment ANY of our Barrys is alive,
    // even with 0 charges loaded, so the admin can see the loading
    // happen (badge counts up from 0 → 4 over 5-second ticks). The
    // button reads ACTIVE blue when there's at least one ready charge,
    // and GRAY (disabled-looking) when still loading. Click handler
    // refuses entry into selection mode when 0 charges.
    let icecreamBtn = document.getElementById('icecream-btn');
    if (icecreamBtn) {
        const myBarrys = units.filter(u => u.team === 'player' && u.type === 'barry' && !u.isDead);
        let totalCharges = 0;
        myBarrys.forEach(b => { totalCharges += (b._icecreamReady || 0); });
        if (myBarrys.length > 0) {
            icecreamBtn.style.display = 'block';
            icecreamBtn.style.position = icecreamBtn.style.position || 'relative';
            const ready = totalCharges > 0;
            // Gray when loading (no charges yet), blue when ready, red while
            // the admin has the "next click drops a cone" mode armed.
            icecreamBtn.style.backgroundColor = isSelectingIcecream
                ? '#e74c3c'
                : (ready ? '#3498db' : '#7f8c8d');
            icecreamBtn.style.opacity = ready ? '1' : '0.65';
            const badgeColor = ready ? '#3498db' : '#7f8c8d';
            icecreamBtn.innerHTML = `🍦<span style="position:absolute; top:-4px; right:-4px; background:#fff; color:${badgeColor}; border-radius:50%; width:18px; height:18px; font-size:11px; display:flex; align-items:center; justify-content:center; box-shadow:0 1px 3px rgba(0,0,0,0.4);">${totalCharges}</span>`;
        } else {
            icecreamBtn.style.display = 'none';
            if (isSelectingIcecream) isSelectingIcecream = false;
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

window.addEventListener('resize', _positionActionButtons);
