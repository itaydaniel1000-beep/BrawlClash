// ui-progression.js - Brawl Pass, Shop, and Leaderboard UI

// Per-tier reward for the Trophy Profile screen. Every 100 trophies the
// player can claim:
//   • Always — TROPHY_REWARD_COINS coins
//   • Bonus on every 5th tier (500, 1000, 1500…) — extra TROPHY_BONUS_GEMS
//     gems so milestone tiers feel a little more special.
const TROPHY_REWARD_COINS  = 25;
const TROPHY_BONUS_EVERY   = 5;
const TROPHY_BONUS_GEMS    = 5;

// Highest tier the player has earned so far (1 tier per 100 trophies).
function _trophyTiersEarned() {
    return Math.floor((typeof playerTrophies === 'number' ? playerTrophies : 0) / 100);
}

// True if at least one earned tier has not been claimed yet — used by the
// 🎁 lobby badge to nudge the player into opening the screen.
function hasUnclaimedTrophyTier() {
    const earned = _trophyTiersEarned();
    if (earned <= 0) return false;
    const claimed = (playerStats && playerStats.claimedTrophyTiers) || [];
    for (let i = 1; i <= earned; i++) {
        if (!claimed.includes(i)) return true;
    }
    return false;
}
window.hasUnclaimedTrophyTier = hasUnclaimedTrophyTier;

// Refresh the lobby's 🎁 indicator. Called from updateHomeScreen so the
// badge appears the moment the player crosses a 100-trophy milestone (e.g.
// post-battle) and disappears the moment they claim it.
function refreshTrophyClaimBadge() {
    const badge = document.getElementById('trophy-claim-badge');
    if (!badge) return;
    badge.style.display = hasUnclaimedTrophyTier() ? 'inline-block' : 'none';
}
window.refreshTrophyClaimBadge = refreshTrophyClaimBadge;

function renderTrophyProfile() {
    const progressEl = document.getElementById('trophy-progress-block');
    const tiersEl    = document.getElementById('trophy-tiers-container');
    if (!progressEl || !tiersEl) return;
    const trophies = (typeof playerTrophies === 'number' ? playerTrophies : 0);
    const earned   = _trophyTiersEarned();
    const claimed  = (playerStats && playerStats.claimedTrophyTiers) || [];

    // Top progress block — current trophy count + bar to the next 100.
    const nextTier        = earned + 1;
    const trophiesIntoTier = trophies % 100;
    const pct              = Math.min(100, trophiesIntoTier);
    progressEl.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px;">
            <span style="font-weight:bold;">🏆 ${trophies.toLocaleString()}</span>
            <span style="font-size:0.85rem; opacity:0.85;">לדרגה ${nextTier}: עוד ${100 - trophiesIntoTier} 🏆</span>
        </div>
        <div style="height:10px; background:rgba(255,255,255,0.15); border-radius:6px; overflow:hidden;">
            <div style="height:100%; width:${pct}%; background:linear-gradient(90deg,#f1c40f,#e67e22); transition:width 0.3s;"></div>
        </div>
    `;

    // Tier list — every claimable / claimed tier, plus a preview of the
    // next 3 unreached tiers so the player sees what's coming. Cap at 50
    // tiers in the DOM to keep the screen snappy if someone hits 5000+.
    tiersEl.innerHTML = '';
    const lastTier = Math.min(50, Math.max(earned + 3, 5));
    for (let i = 1; i <= lastTier; i++) {
        const trophiesNeeded = i * 100;
        const isClaimed = claimed.includes(i);
        const canClaim  = trophies >= trophiesNeeded && !isClaimed;
        const isLocked  = trophies <  trophiesNeeded;
        const giveCoins = TROPHY_REWARD_COINS;
        const giveGems  = (i % TROPHY_BONUS_EVERY === 0) ? TROPHY_BONUS_GEMS : 0;

        const rowBg     = isClaimed ? 'rgba(255,255,255,0.05)' : (canClaim ? 'rgba(241,196,15,0.18)' : 'rgba(0,0,0,0.20)');
        const borderCol = isClaimed ? '#95a5a6' : (canClaim ? '#f1c40f' : '#7f8c8d');

        const row = document.createElement('div');
        row.style.cssText = `display:flex; justify-content:space-between; align-items:center; gap:10px; padding:9px 12px; background:${rowBg}; border-radius:10px; border-right:5px solid ${borderCol}; opacity:${isLocked ? 0.55 : 1};`;
        row.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:2px;">
                <div style="font-weight:bold; color:#fff;">דרגה ${i}</div>
                <div style="font-size:0.78rem; color:#fff; opacity:0.8;">🏆 ${trophiesNeeded.toLocaleString()}</div>
            </div>
            <div style="color:#f1c40f; font-weight:bold;">
                +${giveCoins} 🪙${giveGems > 0 ? ` <span style="color:#74b9ff;">+${giveGems} 💎</span>` : ''}
            </div>
            <button class="bs-btn bs-btn-small" ${(!canClaim) ? 'disabled' : ''} style="font-size:0.8rem; padding:5px 10px; min-width:70px;">${isClaimed ? 'התקבל' : (isLocked ? 'נעול' : 'קבל')}</button>
        `;
        const btn = row.querySelector('button');
        btn.onclick = () => {
            // Re-validate at click time in case state moved between render
            // and click (e.g. a sync from another tab).
            const claimedNow = (playerStats && playerStats.claimedTrophyTiers) || [];
            if (claimedNow.includes(i)) return;
            if ((typeof playerTrophies === 'number' ? playerTrophies : 0) < trophiesNeeded) return;
            playerStats.coins = (playerStats.coins || 0) + giveCoins;
            if (giveGems > 0) playerStats.gems = (playerStats.gems || 0) + giveGems;
            playerStats.claimedTrophyTiers = claimedNow.concat([i]);
            saveStats();
            updateStatsUI();
            renderTrophyProfile();              // refresh in place
            refreshTrophyClaimBadge();           // hide badge if all claimed
            try { AudioController.play('upgrade'); } catch (e) {}
        };
        tiersEl.appendChild(row);
    }
}
window.renderTrophyProfile = renderTrophyProfile;

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
