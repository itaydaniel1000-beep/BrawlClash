// engine-input.js - Event Listeners and Input Handling

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
        const sidebar = document.getElementById('global-chat-sidebar');
        if (sidebar) sidebar.classList.toggle('hidden');
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
