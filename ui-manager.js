// ui-manager.js - UI and Screen Management

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
        renderSPSelection();
    } else if (screenId === 'brawl-pass-screen') {
        renderBrawlPass();
    } else if (screenId === 'shop-screen') {
        renderShop();
    } else if (screenId === 'leaderboard-screen') {
        renderLeaderboard();
    }
    
    const target = document.getElementById(screenId);
    if (target) target.style.display = 'flex';
}

function closeScreen(screenId) {
    const target = document.getElementById(screenId);
    if (target) target.style.display = 'none';
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

function toggleCardInDeck(id) {
    if (playerDeck.includes(id)) {
        playerDeck = playerDeck.filter(cid => cid !== id);
    } else {
        if (playerDeck.length < 8 || (playerStats.username === ADMIN_USERNAME)) {
            playerDeck.push(id);
        } else {
            alert("אפשר לבחור עד 8 דמויות!");
            return;
        }
    }
    sessionStorage.setItem('brawlclash_deck', JSON.stringify(playerDeck));
    renderCharCards();
    updateHomeScreen();
}

function renderCharCards() {
    if (!charCardsContainer) return;
    charCardsContainer.innerHTML = '';
    Object.keys(CARDS).forEach(id => {
        const card = CARDS[id];
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.style.position = 'relative';
        if (playerDeck.includes(id)) cardEl.classList.add('selected');
        const level = playerStats.levels[id] || 1;
        
        cardEl.innerHTML = `
            <div class="card-cost">${card.cost}</div>
            <div class="card-icon">${card.icon}</div>
            <div class="card-name" style="display: flex; flex-direction: column; z-index: 10;">
                <span>${card.name}</span>
                <span style="color: #f1c40f; font-size: 0.6rem;">רמה ${level}</span>
            </div>
            ${playerDeck.includes(id) ? '<div style="position:absolute; top:-5px; right:-5px; background:#2ecc71; color:white; border-radius:50%; width:18px; height:18px; display:flex; align-items:center; justify-content:center; border:2px solid white; font-size:0.7rem; box-shadow:0 1px 3px rgba(0,0,0,0.3); z-index:30;">✓</div>' : ''}
            <div class="card-upgrade-btn" style="position:absolute; bottom:2px; right:2px; background:#2ecc71; border:1px solid white; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:0.7rem; cursor:pointer; color:white; box-shadow:0 1px #27ae60; z-index:30; transition: transform 0.1s;">⬆️</div>
        `;
        
        const upgradeBtn = cardEl.querySelector('.card-upgrade-btn');
        if (upgradeBtn) {
            upgradeBtn.onclick = (e) => {
                e.stopPropagation();
                openUpgradeModal(id);
            };
        }

        cardEl.onclick = () => {
            if (isStarringMode) {
                favoriteBrawler = id;
                sessionStorage.setItem('brawlclash_favorite', id);
                isStarringMode = false;
                const starBtn = document.getElementById('star-mode-btn');
                if (starBtn) starBtn.style.backgroundColor = '#f1c40f';
                renderCharCards();
                updateHomeScreen();
                return;
            }
            toggleCardInDeck(id);
        };
        
        charCardsContainer.appendChild(cardEl);
    });
    if (charCountDisplay) charCountDisplay.innerText = `נבחרו: ${playerDeck.length} / 8`;
}

function openUpgradeModal(id) {
    currentlyUpgradingId = id;
    const card = CARDS[id];
    const level = playerStats.levels[id];
    const scale = getLevelScale(id);
    const nextScale = 1 + (level) * 0.05;
    
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
    const isInDeck = playerDeck.includes(id);
    selectBtn.innerText = isInDeck ? "הסר מהדק" : "בחר לדק";
    selectBtn.onclick = () => {
        if (isInDeck) {
            playerDeck = playerDeck.filter(cid => cid !== id);
        } else if (playerDeck.length < 8 || playerStats.username === ADMIN_USERNAME) {
            playerDeck.push(id);
        } else {
            alert("אפשר לבחור עד 8 דמויות!");
        }
        sessionStorage.setItem('brawlclash_deck', JSON.stringify(playerDeck));
        openUpgradeModal(id); 
        renderCharCards();
    };
    
    document.getElementById('upgrade-modal').style.display = 'flex';
}

function renderSPSelection() {
    const container = document.getElementById('sp-cards-container');
    if (!container) return;
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
                sessionStorage.setItem('brawlclash_sp', JSON.stringify(playerStarPowers));
                renderSPSelection();
            };
            optionsContainer.appendChild(btn);
        });

        container.appendChild(cardItem);
    });
}

function renderBrawlPass() {
    const container = document.getElementById('bp-tiers-container');
    if (!container) return;
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
        btn.onclick = () => {
            if (playerStats.claimedTiers.includes(i) || playerTrophies < i * 100) return;
            if (i % 2 === 0) playerStats.coins += 50;
            else playerStats.gems += 10;
            playerStats.claimedTiers.push(i);
            saveStats();
            updateStatsUI();
            renderBrawlPass();
            AudioController.play('upgrade');
        };
        
        container.appendChild(tier);
    }
}

function renderShop() {
    const container = document.getElementById('shop-items-container');
    if (!container) return;
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
    container.innerHTML = "";

    if (!window.NetworkManager || !window.NetworkManager.isConfigured()) {
        const selfItem = document.createElement('div');
        selfItem.style = `display: flex; justify-content: space-between; padding: 12px; background: rgba(241, 196, 15, 0.3); border-radius: 12px; margin-bottom: 8px; border: 2px solid #f1c40f;`;
        selfItem.innerHTML = `
            <span style="color: #f1c40f; font-weight: bold;">#1</span>
            <span style="font-weight: bold; color: white;">${playerStats.username || 'אורח'} (אתה)</span>
            <span style="color: #f1c40f;">🏆 ${playerTrophies}</span>
        `;
        container.appendChild(selfItem);
        return;
    }

    // This will be triggered by network updates
}

// Global UI listeners
document.addEventListener('DOMContentLoaded', () => {
    const upgradeActionBtn = document.getElementById('upgrade-action-btn');
    if (upgradeActionBtn) {
        upgradeActionBtn.onclick = () => {
            if (!currentlyUpgradingId) return;
            const level = playerStats.levels[currentlyUpgradingId];
            if (level >= MAX_LEVEL) return;
            const cost = level * 200;

            if (playerStats.coins >= cost) {
                playerStats.coins -= cost;
                playerStats.levels[currentlyUpgradingId]++;
                saveStats();
                updateStatsUI();
                AudioController.play('upgrade');
                renderCharCards();
            }
        };
    }
});

function startCharSelection() {
    tempDeck = [...playerDeck];
    switchScreen('char-selection-menu');
    renderCharCards();
}
window.startCharSelection = startCharSelection;

function startSPSelection(source = 'battle') {
    spEntrySource = source;
    switchScreen('sp-selection-menu');
    renderSPSelection();
}
window.startSPSelection = startSPSelection;

function openAdminMenu() {
    if (playerStats.username !== ADMIN_USERNAME) {
        console.warn("🚫 Unauthorized Admin Access Attempt");
        return;
    }
    
    const overlay = document.getElementById('admin-panel-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
        // Sync toggles with current states
        updateAdminToggleUI('infiniteElixir', 'toggle-infinite-elixir');
        updateAdminToggleUI('godMode', 'toggle-god-mode');
        updateAdminToggleUI('doubleDamage', 'toggle-double-damage');
        updateAdminToggleUI('superSpeed', 'toggle-super-speed');
    }
}
window.openAdminMenu = openAdminMenu;

function closeAdminMenu() {
    const overlay = document.getElementById('admin-panel-overlay');
    if (overlay) overlay.style.display = 'none';
}
window.closeAdminMenu = closeAdminMenu;

function updateAdminToggleUI(hackKey, elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    if (adminHacks[hackKey]) {
        el.innerText = 'פעיל';
        el.classList.add('active');
    } else {
        el.innerText = 'כבוי';
        el.classList.remove('active');
    }
}

function toggleAdminHack(hackKey) {
    adminHacks[hackKey] = !adminHacks[hackKey];
    
    const map = {
        'infiniteElixir': 'toggle-infinite-elixir',
        'godMode': 'toggle-god-mode',
        'doubleDamage': 'toggle-double-damage',
        'superSpeed': 'toggle-super-speed'
    };
    
    updateAdminToggleUI(hackKey, map[hackKey]);
    console.log(`🛠️ Admin: ${hackKey} is now ${adminHacks[hackKey]}`);
}
window.toggleAdminHack = toggleAdminHack;

function setAdminCurrency(type) {
    const inputId = type === 'coins' ? 'admin-gold-input' : 'admin-gems-input';
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const val = parseInt(input.value);
    if (isNaN(val)) return;
    
    if (type === 'coins') playerStats.coins = val;
    else playerStats.gems = val;
    
    saveStats();
    updateStatsUI();
    console.log(`🛠️ Admin: ${type} set to ${val}`);
}
window.setAdminCurrency = setAdminCurrency;

function maxAllLevels() {
    Object.keys(CARDS).forEach(id => {
        playerStats.levels[id] = MAX_LEVEL;
        sessionStorage.setItem(`brawlclash_level_${id}`, MAX_LEVEL);
    });
    saveStats();
    updateStatsUI();
    renderCharCards();
    console.log("🛠️ Admin: All characters maxed!");
}
window.maxAllLevels = maxAllLevels;

// Export other functions used in index.html or across modules
window.renderCharCards = renderCharCards;
window.renderSPSelection = renderSPSelection;
window.renderBrawlPass = renderBrawlPass;
window.renderShop = renderShop;
window.renderLeaderboard = renderLeaderboard;
window.updateStatsUI = updateStatsUI;
window.updateTrophyUI = updateTrophyUI;
window.updateHomeScreen = updateHomeScreen;
