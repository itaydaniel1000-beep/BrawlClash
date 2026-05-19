// engine-core.js - Game Loop and Core State Management

// Move special action buttons to <body> on mobile so overflow:hidden on #app
// doesn't clip them. On desktop restore to canvas-wrap.
var _actionBtnOriginalParent = null;

function _positionActionButtons() {
    var IDS         = ['admin-delete-btn', 'amber-path-btn', 'bull-dash-btn', 'bonnie-transform-btn', 'icecream-btn', 'cake-blow-btn', 'mrp-kill-btn'];
    var MOBILE_TOPS = ['22%', '36%', '50%', '64%', '78%', '92%', '8%'];
    var BG_COLORS   = ['#c0392b', '#e67e22', '#8c7ae6', '#a29bfe', '#3498db', '#ff6b9d', '#54a0ff'];

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
            btn.style.right     = ['60px','130px','60px','200px','60px','130px','60px'][i];
            btn.style.bottom    = ['70px','10px','10px','10px','140px','140px','220px'][i];
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
        // Fresh match → reset the cake's once-per-match lock for both teams.
        // (Set in battle-spawn.js, read at the start of every spawn attempt.)
        window._cakeUsedThisMatch = { player: false, enemy: false };
        // Fresh match → reset the bot's "Amber-vs-Mr-P-spam" cooldown so a
        // late-match trigger from the previous battle doesn't gate the
        // first reaction in this new one. See ai-strategies.js step 0.
        window._aiLastAmberAt = 0;
        // Reset the "already applied forfeit-loss" guard so quitting THIS
        // match counts the trophy deduction once (and only once).
        window._bcForfeitAppliedThisMatch = false;
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

        // 🛡️ Fortress build queue intentionally LEFT EMPTY — per user,
        // the bot no longer pre-builds defensive buildings. Instead it
        // plays purely reactively: whenever the player sends units in,
        // the bot sends counters strong enough to defeat them (see the
        // beefed-up step 1 in ai-strategies.js).
        window._botFortressQueue = [];

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
            // Larger touch target — the default 44×44 from
            // _positionActionButtons is too small once the 🍦 + badge are
            // inside; bumping to 64×64 makes the whole thing reliably
            // tappable on a phone.
            icecreamBtn.style.width  = '64px';
            icecreamBtn.style.height = '64px';
            const ready = totalCharges > 0;
            // Gray when loading (no charges yet), blue when ready, red while
            // the admin has the "next click drops a cone" mode armed.
            icecreamBtn.style.backgroundColor = isSelectingIcecream
                ? '#e74c3c'
                : (ready ? '#3498db' : '#7f8c8d');
            icecreamBtn.style.opacity = ready ? '1' : '0.65';
            const badgeColor = ready ? '#3498db' : '#7f8c8d';
            // Both children get pointer-events: none so EVERY tap (cone or
            // badge area) lands on the button itself rather than the span —
            // avoids mobile quirks where touches on a child element with
            // its own layout box don't bubble cleanly to the parent button.
            // Badge sits INSIDE the button (top: 2 / right: 2) instead of
            // overflowing, so the entire visible UI is within the 64×64
            // clickable rectangle.
            icecreamBtn.innerHTML = `<span style="font-size:36px; line-height:1; display:inline-block; vertical-align:middle; pointer-events:none;">🍦</span><span style="position:absolute; top:2px; right:2px; background:#fff; color:${badgeColor}; border-radius:50%; width:24px; height:24px; font-size:14px; font-weight:bold; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 4px rgba(0,0,0,0.5); border:2px solid ${badgeColor}; pointer-events:none;">${totalCharges}</span>`;
        } else {
            icecreamBtn.style.display = 'none';
            if (isSelectingIcecream) isSelectingIcecream = false;
        }
    }

    // 🎂💥 Blow-out-candles button — visible whenever we have an alive
    // player-team cake. One press calls `cake.takeDamage(Infinity)` which
    // trips the cake-death wipe in entity-base.js (every opposing unit /
    // building / aura on the field dies instantly). Hidden the moment the
    // last cake dies (so the button can't be spam-pressed on a stale ref).
    // Size overrides bump it beyond the standard 44×44 (mobile) so the
    // 🎂💥 emoji combo reads cleanly + the button feels like the "ult"
    // it is. Both mobile + desktop get explicit dimensions because the
    // base CSS only sets a colour, not a size.
    const cakeBlowBtn = document.getElementById('cake-blow-btn');
    if (cakeBlowBtn) {
        const aliveCakes = (typeof buildings !== 'undefined' ? buildings : [])
            .filter(b => b && b.team === 'player' && b.type === 'cake' && !b.isDead);
        if (aliveCakes.length > 0) {
            cakeBlowBtn.style.display = 'block';
            cakeBlowBtn.style.backgroundColor = '#ff6b9d';
            // Sized 4× smaller than the previous 320 px version per user
            // request. Still bigger than the standard 44×44 side-rail
            // buttons so it remains recognisable as the "ultimate", just
            // not overwhelming. setProperty('important') so the cascade
            // sticks regardless of what _positionActionButtons sets.
            const cbStyle = cakeBlowBtn.style;
            cbStyle.setProperty('width',  '80px', 'important');
            cbStyle.setProperty('height', '80px', 'important');
            cbStyle.setProperty('font-size', '35px', 'important');
            cbStyle.setProperty('border', '3px solid #fff', 'important');
            cbStyle.setProperty('box-shadow', '0 4px #c0397f', 'important');
            cbStyle.setProperty('line-height', '1', 'important');
            cbStyle.setProperty('padding', '0', 'important');
            cbStyle.setProperty('display', 'flex', 'important');
            cbStyle.setProperty('align-items', 'center', 'important');
            cbStyle.setProperty('justify-content', 'center', 'important');
            cbStyle.setProperty('position', 'fixed', 'important');
            cbStyle.setProperty('z-index', '9999', 'important');

            // Placement: on PHONES the right-side rail is busy with the
            // other action buttons (admin-delete / amber-path / bull-dash
            // / bonnie-transform / icecream) AND the deck sits along the
            // bottom — anchoring there overlaps gameplay. Move the cake
            // button to the LEFT edge mid-screen on touch devices so it
            // sits in the otherwise-empty left strip and is comfortable
            // for a left-thumb tap. Desktop keeps the right-side slot.
            const _isMobile = ('ontouchstart' in window) ||
                              (navigator.maxTouchPoints > 0) ||
                              (window.innerWidth <= 768);
            if (_isMobile) {
                cbStyle.setProperty('left',   '8px',  'important');
                cbStyle.setProperty('right',  'auto', 'important');
                cbStyle.setProperty('top',    '50%',  'important');
                cbStyle.setProperty('bottom', 'auto', 'important');
                cbStyle.setProperty('transform', 'translateY(-50%)', 'important');
            } else {
                cbStyle.setProperty('right',  '10px',  'important');
                cbStyle.setProperty('bottom', '160px', 'important');
                cbStyle.setProperty('left',   'auto',  'important');
                cbStyle.setProperty('top',    'auto',  'important');
                cbStyle.setProperty('transform', 'none', 'important');
            }
        } else {
            cakeBlowBtn.style.display = 'none';
        }
    }

    // 🐧💥 Mr-P self-destruct button — visible whenever we have at least
    // one alive player-team Mr-P spawner. Clicking it kills every alive
    // Mr-P we own at once. The visibility check runs every frame so the
    // button disappears the moment our last Mr-P dies for any reason.
    const mrpKillBtn = document.getElementById('mrp-kill-btn');
    if (mrpKillBtn) {
        const aliveMrPs = (typeof buildings !== 'undefined' ? buildings : [])
            .filter(b => b && b.team === 'player' && b.type === 'mr-p' && !b.isDead);
        if (aliveMrPs.length > 0) {
            mrpKillBtn.style.display = 'block';
            mrpKillBtn.style.backgroundColor = '#54a0ff';
            // Match the cake-blow button's "ult" treatment so it reads
            // as a notable side action and isn't lost in the standard
            // 44 px side-rail. Slightly smaller though (64 vs 80) since
            // this is more utilitarian than the cake nuke.
            const mkStyle = mrpKillBtn.style;
            mkStyle.setProperty('width',  '64px', 'important');
            mkStyle.setProperty('height', '64px', 'important');
            mkStyle.setProperty('font-size', '24px', 'important');
            mkStyle.setProperty('border', '3px solid #fff', 'important');
            mkStyle.setProperty('box-shadow', '0 4px #2473a6', 'important');
            mkStyle.setProperty('line-height', '1', 'important');
            mkStyle.setProperty('padding', '0', 'important');
            mkStyle.setProperty('display', 'flex', 'important');
            mkStyle.setProperty('align-items', 'center', 'important');
            mkStyle.setProperty('justify-content', 'center', 'important');
            mkStyle.setProperty('position', 'fixed', 'important');
            mkStyle.setProperty('right', '10px', 'important');
            mkStyle.setProperty('bottom', '250px', 'important');
            mkStyle.setProperty('top', 'auto', 'important');
            mkStyle.setProperty('left', 'auto', 'important');
            mkStyle.setProperty('z-index', '9999', 'important');
        } else {
            mrpKillBtn.style.display = 'none';
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
