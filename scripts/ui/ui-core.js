// ui-core.js - Core UI Navigation and Resource Display

function switchScreen(screenId) {
    console.log("%c📺 UI ENGINE: Switching to " + screenId, "color: #f1c40f; font-weight: bold; font-size: 1.2rem;");

    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });

    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active');
        if (screenId === 'username-overlay' || target.classList.contains('overlay')) {
            target.style.display = 'flex';
        } else {
            target.style.display = 'block';
        }
        console.log("✅ UI ENGINE: successfully activated " + screenId);
    } else {
        console.error("❌ UI ENGINE: screen not found: " + screenId);
    }

    // Side-panel decks only appear during battle, not in lobby or overlay screens
    const inBattle = screenId === 'game-screen';
    document.querySelectorAll('.side-panel').forEach(p => {
        p.style.display = inBattle ? 'flex' : 'none';
    });
}
window.switchScreen = switchScreen;

function goToLobby() {
    console.log("🏠 UI ENGINE: Going to Lobby...");
    if (!playerStats.username) {
        switchScreen('username-overlay');
        return;
    }
    switchScreen('lobby-screen');
    updateHomeScreen();
    updateStatsUI();
    updateTrophyUI();

    if (!window.currentBattleRoom && typeof initNetworkListeners === 'function') {
        initNetworkListeners();
    }
}
window.goToLobby = goToLobby;

function formatNumber(num) {
    if (num === Infinity) return "∞";
    if (num === null || num === undefined) return "0";
    if (num < 1000) return num.toString();
    
    const units = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td', 'qad', 'qid', 'sxd', 'spd', 'ocd', 'nod', 'vg'];
    let unitIndex = 0;
    let scaledNum = num;
    
    while (scaledNum >= 1000 && unitIndex < units.length - 1) {
        scaledNum /= 1000;
        unitIndex++;
    }
    
    if (scaledNum >= 1000 || num >= 1e66) {
        return num.toExponential(1).replace('e+', 'e');
    }
    
    return scaledNum.toFixed(1).replace(/\.0$/, '') + units[unitIndex];
}

function updateStatsUI() {
    document.querySelectorAll('.resource-item.coins .resource-value').forEach(el => el.innerText = formatNumber(playerStats.coins));
    document.querySelectorAll('.resource-item.gems .resource-value').forEach(el => el.innerText = formatNumber(playerStats.gems));
    const usernameEl = document.querySelector('.user-name');
    if (usernameEl && playerStats.username) usernameEl.innerText = playerStats.username;
    const trophyEl = document.getElementById('trophy-count');
    if (trophyEl) trophyEl.innerText = playerTrophies.toLocaleString();

    const adminBtn = document.querySelector('.admin-btn');
    if (adminBtn) {
        const isAdmin = playerStats.username && playerStats.username.trim() === ADMIN_USERNAME;
        adminBtn.style.display = isAdmin ? 'flex' : 'none';
        
        if (playerStats.username && playerStats.username !== "null") {
            console.log(`%c🛡️ Admin Check: name="${playerStats.username}", isAdmin=${isAdmin}`, "color: #e74c3c; font-weight: bold;");
        }
    }
    
    if (typeof updateTrophyUI === 'function') updateTrophyUI();
    if (typeof updateHomeScreen === 'function') updateHomeScreen();
}

function openScreen(screenId) {
    if (screenId === 'sp-selection-menu') {
        if (typeof renderSPSelection === 'function') renderSPSelection();
    } else if (screenId === 'char-selection-menu') {
        if (typeof renderCharCards === 'function') renderCharCards();
    } else if (screenId === 'brawl-pass-screen') {
        if (typeof renderBrawlPass === 'function') renderBrawlPass();
    } else if (screenId === 'shop-screen') {
        if (typeof renderShop === 'function') renderShop();
    } else if (screenId === 'leaderboard-screen') {
        if (typeof renderLeaderboard === 'function') renderLeaderboard();
    } else if (screenId === 'social-overlay') {
        if (typeof renderSocialPlayers === 'function') renderSocialPlayers();
    }

    // Use switchScreen so the nuclear-fix .active class toggles visibility/opacity properly
    switchScreen(screenId);
}

function closeScreen(screenId) {
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.remove('active');
        target.style.display = 'none';
    }
    // After closing an overlay/screen, return to the lobby
    if (typeof goToLobby === 'function') goToLobby();
}

function updateHomeScreen() {
    const featuredIcon = document.getElementById('featured-brawler-icon');
    const featuredName = document.getElementById('featured-brawler-name');
    
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
        const progress = Math.min(100, (playerTrophies % 500) / 5);
        trophyRoadFill.style.width = `${progress}%`;
    }
}

function updateTrophyUI() {
    const el = document.getElementById('trophy-count');
    if (el) {
        el.innerText = playerTrophies.toLocaleString();
        el.classList.add('updated');
        setTimeout(() => el.classList.remove('updated'), 500);
    }
}

// Auto-initialize UI on load
document.addEventListener('DOMContentLoaded', () => {
    console.log("🏁 UI ENGINE: Initializing on load...");
    updateStatsUI();
    updateHomeScreen();
});
