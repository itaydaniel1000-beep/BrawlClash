// ui-progression.js - Brawl Pass, Shop, and Leaderboard UI

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
}
