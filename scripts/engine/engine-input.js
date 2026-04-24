// engine-input.js - Event Listeners and Input Handling

function handleNetworkGameOver(data) {
    if (currentState === GAME_STATE.GAMEOVER) return;
    currentState = GAME_STATE.GAMEOVER;
    // Back-compat: older payloads sent a bare `winner` username. New payloads send
    // `{winnerIsYou, reason}` from the sender's perspective. Also accept a plain
    // string in case some older client connects.
    let isWin = false;
    let reason = 'safe_destroyed';
    if (data && typeof data === 'object') {
        if (typeof data.winnerIsYou === 'boolean') {
            isWin = data.winnerIsYou;
        } else if (typeof data.winner === 'string') {
            isWin = (data.winner === playerStats.username);
        }
        if (typeof data.reason === 'string') reason = data.reason;
    } else if (typeof data === 'string') {
        isWin = (data === playerStats.username);
    }

    const resultText = document.getElementById('game-over-title');
    if (resultText) {
        if (reason === 'forfeit' && isWin) {
            resultText.innerText = "ניצחון! היריב עזב את הקרב";
        } else if (reason === 'forfeit' && !isWin) {
            resultText.innerText = "יצאת מהקרב";
        } else {
            resultText.innerText = isWin ? "ניצחון רשתי!" : "הפסד רשתי!";
        }
    }
    AudioController.play(isWin ? 'win' : 'lose');
    const overMenu = document.getElementById('game-over-menu');
    if (overMenu) overMenu.classList.add('active');

    // Clear battle-room after a beat so the next game starts fresh.
    setTimeout(() => { currentBattleRoom = null; }, 3000);
}

function handleRemoteSpawn(data) {
    // data.unitType is the unit kind; data.type is the envelope tag 'SYNC_SPAWN'
    // `isFrozen` and `level` ride along so a freeze-placement (❄️ card) stays
    // frozen on the opponent's screen and the unit gets the same
    // getLevelScale() boost the sender's copy already had.
    spawnEntity(data.x, data.y, 'enemy', data.unitType, !!data.isFrozen, true, data.buffs || null, data.level || 1);
}

// Receive the opponent's admin settings at battle start. Stored globally so
// entity-base can consult them when resolving damage against enemy-team entities
// (the admin's own units/safe on our screen).
function handleAdminConfig(data) {
    if (!data || !data.hacks) return;
    opponentAdminHacks = {
        isAdmin: !!data.isAdmin,
        infiniteElixir: !!data.hacks.infiniteElixir,
        godMode: !!data.hacks.godMode,
        doubleDamage: !!data.hacks.doubleDamage,
        superSpeed: !!data.hacks.superSpeed
    };
    if (data.isAdmin) {
        const active = [];
        if (data.hacks.godMode) active.push('גוד מוד');
        if (data.hacks.doubleDamage) active.push('נזק כפול');
        if (data.hacks.superSpeed) active.push('מהירות-על');
        if (data.hacks.infiniteElixir) active.push('אליקסיר אינסופי');
        if (active.length > 0 && typeof showTransientToast === 'function') {
            showTransientToast(`⚠️ היריב הוא אדמין: ${active.join(', ')}`);
        }
    }
}
window.handleAdminConfig = handleAdminConfig;

function handleShiftRelease(e) {
    if (e.key !== 'Shift') return;
    // Releasing Shift cancels any held card / freeze selection
    if (selectedCardId || selectedFreezeCardId) {
        selectedCardId = null;
        selectedFreezeCardId = null;
        document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
    }
    // Note: the admin "delete enemy" mode is a toggle on the 🗑️ button now,
    // not tied to Shift. Releasing Shift doesn't affect it.
}

function initGameListeners() {
    if (canvas) {
        // Pointer events unify mouse + touch so long-press on a phone and
        // mouse press-and-hold on desktop both drive the same Shift-on-release
        // shortcut (see battle-input.js).
        canvas.removeEventListener('pointerdown', handleCanvasPress);
        canvas.addEventListener('pointerdown', handleCanvasPress);
        canvas.removeEventListener('pointerup', handleCanvasRelease);
        canvas.addEventListener('pointerup', handleCanvasRelease);
        canvas.removeEventListener('pointercancel', handleCanvasRelease);
        canvas.addEventListener('pointercancel', handleCanvasRelease);
        canvas.removeEventListener('pointerleave', handleCanvasRelease);
        canvas.addEventListener('pointerleave', handleCanvasRelease);
        // pointermove fires for both touch and mouse, keeping the ghost +
        // auto-repeat target glued to wherever the user is dragging.
        canvas.removeEventListener('pointermove', handleCanvasPointerMove);
        canvas.addEventListener('pointermove', handleCanvasPointerMove);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mousemove', handleMouseMove);
    }

    // Shift release cancels any currently held card — lets player hold a card only while Shift is pressed.
    window.removeEventListener('keyup', handleShiftRelease);
    window.addEventListener('keyup', handleShiftRelease);

    const homeSettingsBtn = document.getElementById('home-settings-btn');
    if (homeSettingsBtn) {
        homeSettingsBtn.onclick = (e) => {
            e.stopPropagation();
            const sidebar = document.getElementById('right-sidebar');
            if (sidebar) sidebar.classList.toggle('hidden');
        };
    }

    const socialBtn = document.querySelector('.social-btn');
    if (socialBtn) socialBtn.onclick = () => openPlayersTab();

    const emoteBtn = document.getElementById('emote-bubble-btn');
    if (emoteBtn) emoteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const selector = document.getElementById('emote-selector');
        if (selector) selector.classList.toggle('active');
    });

    const bullDashBtn = document.getElementById('bull-dash-btn');
    if (bullDashBtn) bullDashBtn.onclick = (e) => {
        e.stopPropagation();
        if (!isSelectingBullDash) {
            const bullsAvailable = units.some(u => u.team === 'player' && u.type === 'bull' && !u.hasDashed);
            if (!bullsAvailable) return;
        }
        isSelectingBullDash = !isSelectingBullDash;
        bullDashBtn.style.backgroundColor = isSelectingBullDash ? '#e74c3c' : '#8c7ae6';
    };

    document.addEventListener('click', () => {
        const selector = document.getElementById('emote-selector');
        if (selector) selector.classList.remove('active');
    });

    const quitBtn = document.getElementById('quit-btn');
    if (quitBtn) quitBtn.onclick = () => {
        // In P2P battles, tell the opponent we forfeited so they get a proper
        // victory screen instead of being silently stranded in the battle.
        if (currentBattleRoom && window.NetworkManager && typeof window.NetworkManager.notifyForfeit === 'function') {
            try { window.NetworkManager.notifyForfeit(); } catch (e) {}
            currentBattleRoom = null;
        }
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
        openScreen('char-selection-menu');
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

    const playBtn = document.getElementById('lobby-start-btn');
    if (playBtn) playBtn.onclick = () => startGame();

    const charBtn = document.getElementById('lobby-char-btn');
    if (charBtn) charBtn.onclick = () => openScreen('char-selection-menu');

    const spBtn = document.getElementById('lobby-sp-btn');
    if (spBtn) {
        spEntrySource = 'lobby';
        spBtn.onclick = () => {
            spEntrySource = 'lobby';
            openScreen('sp-selection-menu');
        };
    }

    const passBtn = document.querySelector('.brawl-pass-btn');
    if (passBtn) passBtn.onclick = () => openScreen('brawl-pass-screen');

    const shopBtn = document.querySelector('.shop-btn');
    if (shopBtn) shopBtn.onclick = () => openScreen('shop-screen');

    const clubBtn = document.querySelector('.club-btn');
    if (clubBtn) clubBtn.onclick = () => {
        switchScreen('club-screen');
    };

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
    };
}
window.initGameListeners = initGameListeners;

document.addEventListener('DOMContentLoaded', () => {
    try {
        setupCanvas(); 
        initGameListeners();
        
        setTimeout(() => { 
            try {
                if (window.NetworkManager) {
                    initNetworkListeners(); 
                    if (playerStats.username) window.NetworkManager.init(playerStats.username);
                }
            } catch (netErr) {
                console.warn("⚠️ Network initialization delayed:", netErr);
            }
        }, 800);

        if (!playerStats.username) switchScreen('username-overlay');
        else goToLobby();
        
        updateStatsUI();
        console.log("🚀 BrawlClash modular engine initialized!");
    } catch (criticalErr) {
        console.error("❌ CRITICAL INITIALIZATION ERROR:", criticalErr);
        switchScreen('lobby-screen');
    }
});
