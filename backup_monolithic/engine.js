// engine.js - Game Loop and Core Logic

function setupCanvas() {
    canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.width = 600;
    canvas.height = 900;
    
    // Initialize common DOM references here as well
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

        if (difficulty === 'hard') {
            enemySafe.maxHp *= 1.3;
            enemySafe.hp = enemySafe.maxHp;
        }

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

function update(dt, now) {
    if (currentState === GAME_STATE.PLAYING) {
        if (adminHacks.infiniteElixir) playerElixir = playerMaxElixir;
        
        let elixirGenRate = CONFIG.ELIXIR_GEN_RATE;
        if (adminHacks.rapidFire) elixirGenRate *= 3;
        if (playerStarPowers['max'] === 'sp1' && units.some(u => u.team === 'player' && u.type === 'max')) {
            elixirGenRate *= 1.1;
        }
        playerElixir = Math.min(playerMaxElixir, playerElixir + (elixirGenRate * dt / 1000));
        let aiGenMult = difficulty === 'hard' ? 1.5 : 1.0;
        enemyElixir += (CONFIG.ELIXIR_GEN_RATE * aiGenMult * dt / 1000);
    }

    let oldEnemyCount = units.concat(buildings, auras).filter(e => e.team === 'enemy' && e.type !== 'porter').length;

    [...auras, ...buildings, ...units, ...projectiles, ...floatingTexts, ...particles, playerSafe, enemySafe].forEach(e => {
        if (!e) return;
        if (e.isFrozen) {
            if (!e.freezeHoverStart) {
                e.freezeHoverStart = now;
                e.lastFrostbiteTime = now;
            }
            if (now - e.freezeHoverStart > 3000) {
                if (now - e.lastFrostbiteTime > 1000) {
                    e.hp -= (e.maxHp || e.hp) * 0.05;
                    e.lastFrostbiteTime = now;
                    if (e.hp <= 0) e.isDead = true;
                }
            }
        } else {
            e.freezeHoverStart = null;
        }

        if (e.update) e.update(dt, now);
        if (e.isDead && !e.deathLogged && e.team === 'enemy' && e.type && CARDS[e.type]) {
            e.deathLogged = true;
            aiDeaths.push({ type: e.type, x: e.x, y: e.y, time: now });
            pendingRebuilds.push({ type: e.type, x: e.x, y: e.y });
        }
    });

    aiDeaths = aiDeaths.filter(d => now - d.time <= 20000);

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

    aiUpdate(dt, now);
    updateUI();

    if (playerSafe && enemySafe && (playerSafe.isDead || enemySafe.isDead)) {
        if (currentState !== GAME_STATE.GAMEOVER) {
            let winStatus = "lose";
            if (playerSafe.isDead) {
                playerTrophies = Math.max(0, playerTrophies - 3);
                winStatus = "lose";
            } else {
                playerTrophies += 8;
                winStatus = "win";
            }
            sessionStorage.setItem('brawlclash_trophies', playerTrophies);

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

        if (currentBattleRoom) {
            setTimeout(() => { currentBattleRoom = null; }, 3000);
        }
    }
}

function drawBackground(ctx) {
    if (!ctx) return;
    ctx.save();
    ctx.fillStyle = '#4cd137'; 
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; 
    ctx.lineWidth = 5;
    
    ctx.beginPath(); 
    ctx.moveTo(0, CONFIG.CANVAS_HEIGHT / 2); 
    ctx.lineTo(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT / 2); 
    ctx.stroke();
    
    ctx.beginPath(); 
    ctx.arc(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, 70, 0, Math.PI * 2); 
    ctx.stroke();
    
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

    if (currentState === GAME_STATE.PLAYING && (selectedCardId || selectedFreezeCardId)) {
        drawGhost(ctx);
    }
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

function handleNetworkGameOver(winner) {
    if (currentState === GAME_STATE.GAMEOVER) return;
    currentState = GAME_STATE.GAMEOVER;
    const resultText = document.getElementById('game-over-title');
    const isWin = (winner === playerStats.username);
    if (resultText) resultText.innerText = isWin ? "ניצחון רשתי!" : "הפסד רשתי!";
    AudioController.play(isWin ? 'win' : 'lose');
    const overMenu = document.getElementById('game-over-menu');
    if (overMenu) overMenu.classList.add('active');
}

function handleRemoteSpawn(data) {
    // Enemy in remote spawn means player from their perspective
    spawnEntity(data.x, data.y, 'enemy', data.type, false, true);
}

function initGameListeners() {
    if (canvas) {
        canvas.removeEventListener('mousedown', handleCanvasClick);
        canvas.addEventListener('mousedown', handleCanvasClick);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mousemove', handleMouseMove);
    }

    const homeSettingsBtn = document.getElementById('home-settings-btn');
    if (homeSettingsBtn) {
        homeSettingsBtn.onclick = (e) => {
            e.stopPropagation();
            const sidebar = document.getElementById('right-sidebar');
            if (sidebar) sidebar.classList.toggle('hidden');
        };
    }

    const socialBtn = document.querySelector('.social-btn');
    if (socialBtn) socialBtn.onclick = () => {
        if (typeof toggleGlobalChat === 'function') toggleGlobalChat();
        else {
            const sidebar = document.getElementById('global-chat-sidebar');
            if (sidebar) sidebar.classList.toggle('hidden');
        }
    };

    const emoteBtn = document.getElementById('emote-bubble-btn');
    if (emoteBtn) emoteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const selector = document.getElementById('emote-selector');
        if (selector) selector.classList.toggle('active');
    });

    const bullDashBtn = document.getElementById('bull-dash-btn');
    if (bullDashBtn) bullDashBtn.onclick = (e) => {
        e.stopPropagation();
        
        // Check if any Bulls can dash before toggling ON
        if (!isSelectingBullDash) {
            const bullsAvailable = units.some(u => u.team === 'player' && u.type === 'bull' && !u.hasDashed);
            if (!bullsAvailable) {
                console.log("🚫 No Bulls available to dash!");
                return; // Don't activate if no bulls can dash
            }
        }

        isSelectingBullDash = !isSelectingBullDash;
        bullDashBtn.style.backgroundColor = isSelectingBullDash ? '#e74c3c' : '#8c7ae6';
        if (isSelectingBullDash) console.log("💨 Bull Dash selection active!");
    };

    document.addEventListener('click', () => {
        const selector = document.getElementById('emote-selector');
        if (selector) selector.classList.remove('active');
    });

    const quitBtn = document.getElementById('quit-btn');
    if (quitBtn) quitBtn.onclick = () => {
        gameLoopRunning = false;
        currentState = GAME_STATE.MENU;
        document.getElementById('pause-menu').classList.remove('active');
        goToLobby();
    };

    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) restartBtn.onclick = () => {
        document.getElementById('game-over-menu').classList.remove('active');
        goToLobby();
    };

    const gameOverCharBtn = document.getElementById('game-over-char-btn');
    if (gameOverCharBtn) gameOverCharBtn.onclick = () => {
        document.getElementById('game-over-menu').classList.remove('active');
        if (typeof startCharSelection === 'function') startCharSelection();
        else switchScreen('char-selection-menu');
    };

    const resumeBtn = document.getElementById('resume-btn');
    if (resumeBtn) resumeBtn.onclick = () => {
        currentState = GAME_STATE.PLAYING;
        document.getElementById('pause-menu').classList.remove('active');
        lastTime = performance.now();
        gameLoopRunning = true;
        requestAnimationFrame(gameLoop);
    };

    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) pauseBtn.onclick = () => {
        currentState = GAME_STATE.PAUSED;
        document.getElementById('pause-menu').classList.add('active');
    };

    // --- NEW: LOBBY BUTTONS ---
    const playBtn = document.getElementById('lobby-start-btn');
    if (playBtn) playBtn.onclick = () => startGame();

    const charBtn = document.getElementById('lobby-char-btn');
    if (charBtn) charBtn.onclick = () => startCharSelection();

    const spBtn = document.getElementById('lobby-sp-btn');
    if (spBtn) spBtn.onclick = () => startSPSelection('lobby');

    const passBtn = document.querySelector('.brawl-pass-btn');
    if (passBtn) passBtn.onclick = () => {
        switchScreen('brawl-pass-screen');
        renderBrawlPass();
    };

    const shopBtn = document.querySelector('.shop-btn');
    if (shopBtn) shopBtn.onclick = () => {
        switchScreen('shop-screen');
        renderShop();
    };

    const clubBtn = document.querySelector('.club-btn');
    if (clubBtn) clubBtn.onclick = () => {
        switchScreen('club-screen');
    };

    // --- NEW: SELECTION SCREEN BUTTONS ---
    const confirmCharBtn = document.getElementById('confirm-char-btn');
    if (confirmCharBtn) confirmCharBtn.onclick = () => goToLobby();

    const confirmSpBtn = document.getElementById('confirm-sp-btn');
    if (confirmSpBtn) confirmSpBtn.onclick = () => {
        if (typeof spEntrySource !== 'undefined' && spEntrySource === 'battle') startGame();
        else goToLobby();
    };

    const starModeBtn = document.getElementById('star-mode-btn');
    if (starModeBtn) starModeBtn.onclick = () => {
        isStarringMode = !isStarringMode;
        starModeBtn.style.backgroundColor = isStarringMode ? '#e74c3c' : '#f1c40f';
        if (isStarringMode) alert("בחר דמות על מנת לסמן אותה כהמועדפת שלך! (⭐)");
    };

    const soundTestBtn = document.getElementById('sound-test-btn');
    if (soundTestBtn) soundTestBtn.onclick = () => {
        AudioController.play('win');
        console.log("🔊 Sound Test: Win sound triggered.");
    };
}
window.startGame = startGame;
window.initGameListeners = initGameListeners;

document.addEventListener('DOMContentLoaded', () => {
    // Fail-safe sidebar kill
    const sidebar = document.getElementById('global-chat-sidebar');
    if (sidebar) {
        sidebar.style.setProperty('display', 'none', 'important');
        sidebar.classList.remove('visible');
    }

    try {
        setupCanvas(); 
        initGameListeners();
        
        setTimeout(() => { 
            try {
                if (window.NetworkManager) {
                    initNetworkListeners(); 
                    if (playerStats.username) {
                        window.NetworkManager.init(playerStats.username);
                    }
                }
            } catch (netErr) {
                console.warn("⚠️ Network initialization delayed:", netErr);
            }
        }, 800);

        if (!playerStats.username) {
            switchScreen('username-overlay');
        } else {
            goToLobby();
        }
        
        updateStatsUI();
        console.log("🚀 BrawlClash modular engine initialized!");

    } catch (criticalErr) {
        console.error("❌ CRITICAL INITIALIZATION ERROR:", criticalErr);
        switchScreen('lobby-screen');
        const usernameOverlay = document.getElementById('username-overlay');
        if (usernameOverlay && !playerStats.username) {
            usernameOverlay.style.display = 'flex';
            usernameOverlay.classList.add('active');
        }
    }
});
