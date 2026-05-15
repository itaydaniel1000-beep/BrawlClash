// ui-quests.js — Daily Quests system
//
// A small "daily missions" board accessible from the lobby's bottom-left
// 📜 button. Three quests are randomly drawn from QUEST_POOL once per
// day; progress is tracked automatically via bumpQuestProgress() calls
// scattered in the game (battle win/loss, spawns, trophies). When a
// quest hits its target the player can claim the reward, which is
// granted to the matching currency on playerStats.

// Every quest awards the same flat reward — 500 🎫 tokens — used to
// progress the Brawl Pass (see ui-progression.js).
const QUEST_REWARD = { kind: 'tokens', amount: 500 };

// ---- Quest catalog (pool — 3 random quests per day) ----------------------
const QUEST_POOL = [
    { id: 'win3',      text: 'נצח 3 קרבות',         target: 3,   metric: 'wins',      reward: QUEST_REWARD },
    { id: 'win5',      text: 'נצח 5 קרבות',         target: 5,   metric: 'wins',      reward: QUEST_REWARD },
    { id: 'play5',     text: 'שחק 5 קרבות',         target: 5,   metric: 'battles',   reward: QUEST_REWARD },
    { id: 'play10',    text: 'שחק 10 קרבות',        target: 10,  metric: 'battles',   reward: QUEST_REWARD },
    { id: 'spawn30',   text: 'הצב 30 דמויות בקרב',  target: 30,  metric: 'spawns',    reward: QUEST_REWARD },
    { id: 'spawn80',   text: 'הצב 80 דמויות בקרב',  target: 80,  metric: 'spawns',    reward: QUEST_REWARD },
    { id: 'trophy50',  text: 'הרווח 50 גביעים',     target: 50,  metric: 'trophies',  reward: QUEST_REWARD },
    { id: 'trophy150', text: 'הרווח 150 גביעים',    target: 150, metric: 'trophies',  reward: QUEST_REWARD },
    { id: 'pp200',     text: 'אסוף 200 נקודות כוח', target: 200, metric: 'pp_earned', reward: QUEST_REWARD }
];

// ---- Date helpers --------------------------------------------------------
function _questsTodayKey() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
}

// ---- State (lives on playerStats so saveStats persists it) --------------
// Shape:
//   playerStats.questsLastRefresh = 'YYYY-MM-DD'
//   playerStats.dailyQuests = [{ id, target, metric, reward, progress, claimed }, ...]
function _initQuestState() {
    if (!playerStats.dailyQuests)        playerStats.dailyQuests = [];
    if (!playerStats.questsLastRefresh)  playerStats.questsLastRefresh = '';
}

// Pick `count` distinct entries from POOL (no repeats inside a single day).
function _drawDailyQuests(count) {
    const pool = QUEST_POOL.slice();
    const out = [];
    while (out.length < count && pool.length) {
        const i = Math.floor(Math.random() * pool.length);
        const q = pool.splice(i, 1)[0];
        out.push({
            id: q.id,
            text: q.text,
            target: q.target,
            metric: q.metric,
            reward: q.reward,
            progress: 0,
            claimed: false
        });
    }
    return out;
}

// Backfill the reward on saved quests so a pool update (e.g. switching
// every reward to flat 500 tokens) doesn't leave today's already-drawn
// quests stuck on the old currency. Matches by quest id and overwrites
// reward in place — progress / claimed are preserved.
function _migrateDailyQuestRewards() {
    if (!Array.isArray(playerStats.dailyQuests)) return false;
    let changed = false;
    playerStats.dailyQuests.forEach(q => {
        if (!q || !q.id) return;
        const cur = QUEST_POOL.find(p => p.id === q.id);
        if (!cur) return;
        if (!q.reward
            || q.reward.kind   !== cur.reward.kind
            || q.reward.amount !== cur.reward.amount) {
            q.reward = cur.reward;
            changed = true;
        }
    });
    return changed;
}

// Refresh the daily quest list if the day changed since the last refresh.
// Idempotent — calling it multiple times the same day is a no-op for the
// quest pool, but the reward-schema migration ALWAYS runs so a pool
// update reaches today's already-drawn quests too.
function refreshDailyQuestsIfNeeded() {
    _initQuestState();
    const today = _questsTodayKey();
    if (playerStats.questsLastRefresh === today) {
        // Same day — but check if a pool update changed the reward shape
        // for any of today's saved quests, and patch them in place.
        if (_migrateDailyQuestRewards() && typeof saveStats === 'function') {
            saveStats();
        }
        return;
    }
    playerStats.questsLastRefresh = today;
    playerStats.dailyQuests = _drawDailyQuests(3);
    if (typeof saveStats === 'function') saveStats();
}
window.refreshDailyQuestsIfNeeded = refreshDailyQuestsIfNeeded;

// Add `amount` to every active quest's progress where the metric matches.
// Game-side hooks (battle win, spawn, trophy gain) call this with the
// metric they're contributing to. Saved automatically.
function bumpQuestProgress(metric, amount) {
    _initQuestState();
    refreshDailyQuestsIfNeeded();   // catch a day-rollover mid-session
    if (!Array.isArray(playerStats.dailyQuests) || !playerStats.dailyQuests.length) return;
    let changed = false;
    playerStats.dailyQuests.forEach(q => {
        if (q.metric === metric && !q.claimed) {
            q.progress = Math.min(q.target, (q.progress || 0) + (amount || 0));
            changed = true;
        }
    });
    if (changed && typeof saveStats === 'function') saveStats();
    // Update the lobby badge so the 📜 button shows the "claim available"
    // indicator the moment a quest hits its target.
    if (typeof refreshQuestsBadge === 'function') refreshQuestsBadge();
}
window.bumpQuestProgress = bumpQuestProgress;

// Claim the reward for quest at `idx`. No-op if already claimed or progress
// hasn't hit target yet.
function claimQuestReward(idx) {
    _initQuestState();
    const q = playerStats.dailyQuests[idx];
    if (!q || q.claimed) return;
    if ((q.progress || 0) < q.target) return;
    const r = q.reward;
    if (r.kind === 'coins')   playerStats.coins   = (playerStats.coins   || 0) + r.amount;
    if (r.kind === 'gems')    playerStats.gems    = (playerStats.gems    || 0) + r.amount;
    if (r.kind === 'credits') playerStats.credits = (playerStats.credits || 0) + r.amount;
    if (r.kind === 'pp')      playerStats.pp      = (playerStats.pp      || 0) + r.amount;
    if (r.kind === 'tokens')  playerStats.tokens  = (playerStats.tokens  || 0) + r.amount;
    q.claimed = true;
    if (typeof saveStats     === 'function') saveStats();
    if (typeof updateStatsUI === 'function') updateStatsUI();
    if (typeof AudioController !== 'undefined') try { AudioController.play('upgrade'); } catch (e) {}
    renderQuests();
    if (typeof refreshQuestsBadge === 'function') refreshQuestsBadge();
}
window.claimQuestReward = claimQuestReward;

// True if at least one quest is at full progress AND unclaimed — used to
// pulse the 📜 button in the lobby so the player knows there's something
// to grab.
function hasClaimableQuest() {
    _initQuestState();
    if (!Array.isArray(playerStats.dailyQuests)) return false;
    return playerStats.dailyQuests.some(q =>
        q && !q.claimed && (q.progress || 0) >= q.target);
}
window.hasClaimableQuest = hasClaimableQuest;

function refreshQuestsBadge() {
    const badge = document.getElementById('quests-claim-badge');
    if (!badge) return;
    badge.style.display = hasClaimableQuest() ? 'inline-block' : 'none';
}
window.refreshQuestsBadge = refreshQuestsBadge;

// ---- Reward chip helper --------------------------------------------------
function _questRewardChip(reward) {
    const icon  = reward.kind === 'coins'   ? '🪙'
                : reward.kind === 'gems'    ? '💎'
                : reward.kind === 'credits' ? '🎟️'
                : reward.kind === 'pp'      ? '💪'
                : reward.kind === 'tokens'  ? '🎫' : '🎁';
    const color = reward.kind === 'coins'   ? '#f1c40f'
                : reward.kind === 'gems'    ? '#74b9ff'
                : reward.kind === 'credits' ? '#9b59b6'
                : reward.kind === 'pp'      ? '#e84393'
                : reward.kind === 'tokens'  ? '#2ecc71' : '#fff';
    return `<span style="color:${color}; font-weight:bold; font-size:1.05rem;">+${reward.amount.toLocaleString()} ${icon}</span>`;
}

// ---- Render --------------------------------------------------------------
function renderQuests() {
    refreshDailyQuestsIfNeeded();
    const container = document.getElementById('quests-container');
    if (!container) return;
    container.innerHTML = '';

    const quests = playerStats.dailyQuests || [];
    if (!quests.length) {
        container.innerHTML = '<div style="color:#bdc3c7; text-align:center; padding:20px;">אין משימות זמינות כרגע. נסה שוב מחר!</div>';
        return;
    }

    quests.forEach((q, idx) => {
        const done = (q.progress || 0) >= q.target;
        const claimed = !!q.claimed;
        const accent = claimed ? '#95a5a6' : (done ? '#f1c40f' : '#74b9ff');
        const card = document.createElement('div');
        card.style.cssText = `background: rgba(255,255,255,0.08); border:2px solid ${accent}; border-radius:14px; padding:14px; display:flex; flex-direction:column; gap:8px; margin-bottom:10px;`;
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                <div style="font-weight:bold; color:#fff; font-size:1rem;">${q.text}</div>
                ${_questRewardChip(q.reward)}
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
                <div style="flex-grow:1; height:10px; background:rgba(0,0,0,0.4); border-radius:5px; overflow:hidden;">
                    <div style="height:100%; width:${Math.min(100, (q.progress / q.target) * 100)}%; background:linear-gradient(90deg, #2ecc71, #74b9ff); transition:width 0.3s;"></div>
                </div>
                <div style="color:#fff; font-size:0.85rem; min-width:55px; text-align:left;">${Math.min(q.progress, q.target)}/${q.target}</div>
            </div>
            <button class="bs-btn bs-btn-small" ${(!done || claimed) ? 'disabled' : ''} style="margin-top:4px; font-size:0.9rem;">${claimed ? '✓ התקבל' : (done ? 'קבל פרס' : 'לא הושלם')}</button>
        `;
        const btn = card.querySelector('button');
        btn.onclick = () => claimQuestReward(idx);
        container.appendChild(card);
    });

    // Footer with "next refresh" hint
    const footer = document.createElement('div');
    footer.style.cssText = 'color:#bdc3c7; text-align:center; font-size:0.8rem; margin-top:8px;';
    footer.innerText = '🌙 המשימות מתחדשות בכל יום בחצות';
    container.appendChild(footer);
    // Normalise every emoji on the quest cards (reward chips, badges,
    // mission text) to Twemoji SVGs.
    if (typeof renderTwemojiOnScreen === 'function') renderTwemojiOnScreen('quests-screen');
}
window.renderQuests = renderQuests;
