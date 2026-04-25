// ui-brawlers.js - Brawler Cards and Upgrades

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
    localStorage.setItem(_userKey('deck'), JSON.stringify(playerDeck));
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
        
        const iconHtml = (typeof getCardIconHTML === 'function')
            ? getCardIconHTML(id, 'width: 32px; height: auto; display: inline-block; image-rendering: pixelated; vertical-align: middle;')
            : card.icon;
        cardEl.innerHTML = `
            <div class="card-cost">${card.cost}</div>
            <div class="card-icon">${iconHtml}</div>
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
                localStorage.setItem(_userKey('favorite'), id);
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
    // Use innerHTML so amber's pixel-art torch <img> renders. Falls back
    // to the bare emoji for every other card.
    const upgIcon = document.getElementById('upgrade-modal-icon');
    if (upgIcon) {
        upgIcon.innerHTML = (typeof getCardIconHTML === 'function')
            ? getCardIconHTML(id, 'width: 48px; height: auto; display: inline-block; image-rendering: pixelated; vertical-align: middle;')
            : card.icon;
    }
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

    // The actual upgrade action — deducts coins, bumps the level, persists, and
    // re-opens the modal so the user sees the new stats/cost immediately.
    // (This handler was missing after the monolithic file was split, which is
    //  why "upgrade" was a no-op even with enough coins.)
    btn.onclick = () => {
        if (!currentlyUpgradingId) return;
        const lvl = playerStats.levels[currentlyUpgradingId];
        if (lvl >= MAX_LEVEL) return;
        const price = lvl * 200;
        if (playerStats.coins < price) return;
        playerStats.coins -= price;
        playerStats.levels[currentlyUpgradingId]++;
        saveStats();
        updateStatsUI();
        if (typeof AudioController !== 'undefined') AudioController.play('upgrade');
        renderCharCards();
        openUpgradeModal(currentlyUpgradingId);
    };

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
        localStorage.setItem(_userKey('deck'), JSON.stringify(playerDeck));
        openUpgradeModal(id); 
        renderCharCards();
    };
    
    document.getElementById('upgrade-modal').style.display = 'flex';
}
