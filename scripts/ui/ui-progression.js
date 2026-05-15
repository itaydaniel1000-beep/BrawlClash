// ui-progression.js - Brawl Pass, Shop, and Leaderboard UI

// Trophy-profile reward cycle (per user spec — "כל שלוש פרסים זה 1000
// מטבעות ואחרי מטבעות יבוא 10 יהלום ואחר כך 100 קרדיטים"). Every tier
// of the cycle awards exactly ONE currency:
//   • Tier 1, 4, 7, … → 1000 🪙 coins
//   • Tier 2, 5, 8, … →   10 💎 gems
//   • Tier 3, 6, 9, … →  100 🎟️ credits  (new currency)
// Range goes up to 100 000 trophies = 1000 tiers.
const TROPHY_TIER_COINS   = 1000;
const TROPHY_TIER_GEMS    = 10;
const TROPHY_TIER_CREDITS = 100;
const TROPHY_MAX_TIERS    = 1000;      // 1000 × 100 = 100 000 trophies cap

// Highest tier the player has earned so far (1 tier per 100 trophies,
// capped at the trophy-profile max).
function _trophyTiersEarned() {
    const raw = Math.floor((typeof playerTrophies === 'number' ? playerTrophies : 0) / 100);
    return Math.min(TROPHY_MAX_TIERS, raw);
}

// Reward for tier `i` (1-indexed). Returns the single currency this tier
// pays out, plus its amount, plus the icon for UI rendering.
function _trophyTierReward(i) {
    const phase = ((i - 1) % 3);
    if (phase === 0) return { kind: 'coins',   amount: TROPHY_TIER_COINS,   icon: '🪙', color: '#f1c40f' };
    if (phase === 1) return { kind: 'gems',    amount: TROPHY_TIER_GEMS,    icon: '💎', color: '#74b9ff' };
    return                  { kind: 'credits', amount: TROPHY_TIER_CREDITS, icon: '🎟️', color: '#9b59b6' };
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
    const atMax            = earned >= TROPHY_MAX_TIERS;
    const nextTier         = Math.min(TROPHY_MAX_TIERS, earned + 1);
    const trophiesIntoTier = trophies % 100;
    const pct              = atMax ? 100 : Math.min(100, trophiesIntoTier);
    const nextLabel        = atMax
        ? `הגעת לדרגה המקסימלית (${TROPHY_MAX_TIERS})`
        : `לדרגה ${nextTier}: עוד ${100 - trophiesIntoTier} 🏆`;
    progressEl.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px;">
            <span style="font-weight:bold;">🏆 ${trophies.toLocaleString()}</span>
            <span style="font-size:0.85rem; opacity:0.85;">${nextLabel}</span>
        </div>
        <div style="height:10px; background:rgba(255,255,255,0.15); border-radius:6px; overflow:hidden;">
            <div style="height:100%; width:${pct}%; background:linear-gradient(90deg,#f1c40f,#e67e22); transition:width 0.3s;"></div>
        </div>
    `;

    // Tier list — render every tier from 1 up to the max (100). Container
    // is scrollable, so even 100 rows stay snappy. Each tier shows its
    // reward (coins / gems / credits in a 3-cycle) and a claim button.
    tiersEl.innerHTML = '';
    for (let i = 1; i <= TROPHY_MAX_TIERS; i++) {
        const trophiesNeeded = i * 100;
        const isClaimed = claimed.includes(i);
        const canClaim  = trophies >= trophiesNeeded && !isClaimed;
        const isLocked  = trophies <  trophiesNeeded;
        const reward    = _trophyTierReward(i);

        const rowBg     = isClaimed ? 'rgba(255,255,255,0.05)' : (canClaim ? 'rgba(241,196,15,0.18)' : 'rgba(0,0,0,0.20)');
        const borderCol = isClaimed ? '#95a5a6' : (canClaim ? '#f1c40f' : '#7f8c8d');

        const row = document.createElement('div');
        row.style.cssText = `display:flex; justify-content:space-between; align-items:center; gap:10px; padding:9px 12px; background:${rowBg}; border-radius:10px; border-right:5px solid ${borderCol}; opacity:${isLocked ? 0.55 : 1};`;
        row.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:2px;">
                <div style="font-weight:bold; color:#fff;">דרגה ${i}</div>
                <div style="font-size:0.78rem; color:#fff; opacity:0.8;">🏆 ${trophiesNeeded.toLocaleString()}</div>
            </div>
            <div style="font-weight:bold; color:${reward.color};">
                +${reward.amount.toLocaleString()} ${reward.icon}
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
            const r = _trophyTierReward(i);
            if (r.kind === 'coins')   playerStats.coins   = (playerStats.coins   || 0) + r.amount;
            if (r.kind === 'gems')    playerStats.gems    = (playerStats.gems    || 0) + r.amount;
            if (r.kind === 'credits') playerStats.credits = (playerStats.credits || 0) + r.amount;
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

// Unlock-Characters screen — paid card-unlock flow, currency = 🎟️ credits.
// Cost is per-rarity (RARITIES[rarity].unlockCost in config.js).
function renderUnlockScreen() {
    const creditsEl = document.getElementById('unlock-credits-display');
    const grid      = document.getElementById('unlock-cards-container');
    if (!grid) return;
    const credits = (playerStats && playerStats.credits) || 0;

    if (creditsEl) {
        creditsEl.innerHTML = `
            <span style="font-weight:bold;">היתרה שלך</span>
            <span style="color:#9b59b6; font-weight:bold; font-size:1.05rem;">${credits.toLocaleString()} 🎟️</span>
        `;
    }

    grid.innerHTML = '';
    Object.keys(CARDS).forEach(id => {
        const card = CARDS[id];
        if (!card) return;
        // Admin-only cards (Libi) never appear in the unlock-characters
        // store — they're not for sale.
        if (card.adminOnly) return;
        const isUnlocked = (typeof isCardUnlocked === 'function') ? isCardUnlocked(id) : true;
        const cost = ((typeof RARITIES !== 'undefined' && RARITIES[card.rarity]) || {}).unlockCost || 0;
        const rarityColor = (typeof getRarityColor === 'function') ? getRarityColor(id) : (card.color || '#7f8c8d');
        const canAfford = credits >= cost;

        const tile = document.createElement('div');
        tile.style.cssText = `position:relative; background:${rarityColor}; border-radius:10px; padding:8px 6px; display:flex; flex-direction:column; align-items:center; gap:4px; border:3px solid ${isUnlocked ? '#2ecc71' : '#fff'}; ${!isUnlocked ? 'filter: grayscale(0.4) brightness(0.85);' : ''}`;
        const iconHtml = (typeof getCardIconHTML === 'function')
            ? getCardIconHTML(id, 'width: 28px; height: auto; image-rendering: pixelated; vertical-align: middle;')
            : `<span style="font-size:1.5rem;">${card.icon}</span>`;
        tile.innerHTML = `
            <div style="font-size:1.5rem;">${iconHtml}</div>
            <div style="color:#fff; font-weight:bold; font-size:0.78rem; text-shadow:0 1px 2px rgba(0,0,0,0.7); text-align:center;">${card.name}</div>
            <div style="color:#fff; font-size:0.65rem; opacity:0.85; text-shadow:0 1px 2px rgba(0,0,0,0.6);">${card.rarity || ''}</div>
            <div style="color:#fff; font-weight:bold; font-size:0.78rem; text-shadow:0 1px 2px rgba(0,0,0,0.7);">${cost.toLocaleString()} 🎟️</div>
            <button class="bs-btn bs-btn-small" style="font-size:0.7rem; padding:4px 8px; min-width:64px;" ${isUnlocked ? 'disabled' : (canAfford ? '' : 'disabled')}>
                ${isUnlocked ? '✔ פתוח' : (canAfford ? 'פתח' : 'אין מספיק')}
            </button>
        `;
        const btn = tile.querySelector('button');
        if (btn) btn.onclick = () => {
            if (isUnlocked) return;
            const have = (playerStats && playerStats.credits) || 0;
            if (have < cost) return;
            playerStats.credits = have - cost;
            playerStats.unlockedCards = (playerStats.unlockedCards || []).concat([id]);
            saveStats();
            updateStatsUI();
            renderUnlockScreen();
            // The brawler-selection screen needs a re-render too in case it's
            // sitting behind us in DOM — next time it opens it'll fetch the
            // new state automatically via openScreen → renderCharCards.
            try { AudioController.play('upgrade'); } catch (e) {}
        };
        grid.appendChild(tile);
    });
}
window.renderUnlockScreen = renderUnlockScreen;

function renderBrawlPass() {
    const container = document.getElementById('bp-tiers-container');
    if (!container) return;
    container.innerHTML = "";
    for (let i = 1; i <= 60; i++) {
        const canClaim = playerTrophies >= i * 100;
        const isClaimed = playerStats.claimedTiers.includes(i);

        // Horizontal layout: each tier is a vertical CARD that takes its place
        // in the row. The accent stripe moved from the right edge to the TOP
        // so it reads as a header bar on a portrait card.
        const accent = canClaim ? (isClaimed ? '#95a5a6' : '#f1c40f') : '#333';
        const tier = document.createElement('div');
        tier.style = `flex: 0 0 auto; min-width: 110px; max-width: 130px; background: rgba(255,255,255,0.1); padding: 12px 10px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 8px; border-top: 5px solid ${accent}; scroll-snap-align: start;`;

        const price = (i % 2 === 0 ? '50 🪙' : '10 💎');
        tier.innerHTML = `
            <div style="font-weight: bold; color: white;">דרגה ${i}</div>
            <div style="color: #f1c40f; font-size: 0.95rem;">${price}</div>
            <button class="bs-btn bs-btn-small" ${(!canClaim || isClaimed) ? 'disabled' : ''} style="font-size: 0.8rem; padding: 5px 12px; width: 100%;">${isClaimed ? 'התקבל' : 'קבל'}</button>
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

// Currency-exchange rates — how many target-currency units ONE gem buys.
// One-directional only (gems → coins / gems → credits, never the reverse),
// per user spec.
const GEM_TO_COINS   = 30;   // 1 💎 → 30 🪙
const GEM_TO_CREDITS = 5;    // 1 💎 → 5 🎟️

// Perform a gem→currency exchange. `gemCost` gems are spent, the matching
// amount of `target` currency ('coins' | 'credits') is granted.
function exchangeGems(gemCost, target) {
    const have = (playerStats && playerStats.gems) || 0;
    if (have < gemCost) {
        if (typeof showTransientToast === 'function') {
            showTransientToast(`💎 אין מספיק יהלומים — צריך ${gemCost}`);
        }
        return;
    }
    playerStats.gems = have - gemCost;
    if (target === 'coins')   playerStats.coins   = (playerStats.coins   || 0) + gemCost * GEM_TO_COINS;
    if (target === 'credits') playerStats.credits = (playerStats.credits || 0) + gemCost * GEM_TO_CREDITS;
    if (typeof saveStats === 'function') saveStats();
    if (typeof updateStatsUI === 'function') updateStatsUI();
    renderShop();   // refresh the balance strip + button affordability
    try { AudioController.play('upgrade'); } catch (e) {}
    if (typeof showTransientToast === 'function') {
        const gained = target === 'coins'
            ? `${gemCost * GEM_TO_COINS} 🪙`
            : `${gemCost * GEM_TO_CREDITS} 🎟️`;
        showTransientToast(`✅ קיבלת ${gained}`);
    }
}
window.exchangeGems = exchangeGems;

function renderShop() {
    const container = document.getElementById('shop-items-container');
    if (!container) return;
    container.innerHTML = "";

    const gems = (playerStats && playerStats.gems) || 0;

    // Balance strip — spans both grid columns so the player always sees how
    // many gems they have to spend.
    const balance = document.createElement('div');
    balance.style.cssText = 'grid-column: 1 / -1; display:flex; justify-content:center; gap:18px; background:rgba(0,0,0,0.35); border:2px solid rgba(255,255,255,0.15); border-radius:12px; padding:10px; font-weight:bold; color:#fff;';
    balance.innerHTML = `
        <span style="color:#74b9ff;">💎 ${gems.toLocaleString()}</span>
        <span style="color:#f1c40f;">🪙 ${((playerStats && playerStats.coins) || 0).toLocaleString()}</span>
        <span style="color:#9b59b6;">🎟️ ${((playerStats && playerStats.credits) || 0).toLocaleString()}</span>
    `;
    container.appendChild(balance);

    // Section header helper — full-width row label.
    const addHeader = (text) => {
        const h = document.createElement('div');
        h.style.cssText = 'grid-column: 1 / -1; color:#f1c40f; font-weight:bold; text-align:center; margin-top:6px;';
        h.innerText = text;
        container.appendChild(h);
    };

    // One exchange offer card.
    const addOffer = (gemCost, target) => {
        const icon   = target === 'coins' ? '🪙' : '🎟️';
        const amount = gemCost * (target === 'coins' ? GEM_TO_COINS : GEM_TO_CREDITS);
        const canAfford = gems >= gemCost;

        const item = document.createElement('div');
        item.style.cssText = `background: rgba(255,255,255,0.05); border-radius: 12px; padding: 10px; display: flex; flex-direction: column; align-items: center; gap:4px; border: 2px solid ${canAfford ? 'rgba(116,185,255,0.5)' : 'rgba(255,255,255,0.1)'}; cursor: ${canAfford ? 'pointer' : 'not-allowed'}; opacity: ${canAfford ? 1 : 0.5};`;
        item.innerHTML = `
            <div style="font-size: 1.6rem;">${icon}</div>
            <div style="font-weight: bold; color: white;">+${amount.toLocaleString()} ${icon}</div>
            <div style="color: #74b9ff; font-size: 0.9rem;">עלות: ${gemCost} 💎</div>
        `;
        if (canAfford) item.onclick = () => exchangeGems(gemCost, target);
        container.appendChild(item);
    };

    addHeader(`💎 ➜ 🪙  (יהלום = ${GEM_TO_COINS} מטבעות)`);
    [1, 5, 25].forEach(g => addOffer(g, 'coins'));

    addHeader(`💎 ➜ 🎟️  (יהלום = ${GEM_TO_CREDITS} קרדיטים)`);
    [1, 5, 25].forEach(g => addOffer(g, 'credits'));
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
