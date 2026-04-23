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

    const isAdmin = playerStats.username && playerStats.username.trim() === ADMIN_USERNAME;
    // Regular ⚙️ admin button: visible for super-admin AND for anyone who
    // has a pending grant attached to their username.
    const adminBtn = document.querySelector('.admin-btn:not(.grant-admin-btn)');
    if (adminBtn) {
        const hasGrant = !!(playerStats.username && typeof _loadAdminGrants === 'function' && _loadAdminGrants()[playerStats.username]);
        adminBtn.style.display = (isAdmin || hasGrant) ? 'flex' : 'none';
        if (playerStats.username && playerStats.username !== "null") {
            console.log(`%c🛡️ Admin Check: name="${playerStats.username}", isAdmin=${isAdmin}, granted=${hasGrant}`, "color: #e74c3c; font-weight: bold;");
        }
    }
    // ✨ / 🚫 — only the super-admin can grant or revoke admin for others.
    const grantBtn = document.getElementById('grant-admin-btn');
    if (grantBtn) grantBtn.style.display = isAdmin ? 'flex' : 'none';
    const revokeBtn = document.getElementById('revoke-admin-btn');
    if (revokeBtn) revokeBtn.style.display = isAdmin ? 'flex' : 'none';
    
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
    } else if (screenId === 'guide-screen') {
        // Make sure the character list is populated from CARDS + STAR_POWERS
        // before the user sees either panel.
        if (typeof renderGuideCharacters === 'function') renderGuideCharacters();
        // Pick the tab that matches the current device: touch-capable phone ⇒
        // mobile tab, otherwise desktop. User can still flip manually.
        const prefersMobile = window.innerWidth <= 600 ||
            (('ontouchstart' in window) && !window.matchMedia('(pointer:fine)').matches);
        showGuideTab(prefersMobile ? 'mobile' : 'desktop');
        // Hint arrow: hide it forever now that they've opened the guide at least once.
        try { localStorage.setItem('brawlclash_guide_seen', '1'); } catch (e) {}
        document.body.setAttribute('data-guide-seen', '1');
    }

    // Use switchScreen so the nuclear-fix .active class toggles visibility/opacity properly
    switchScreen(screenId);
}

function showGuideTab(which) {
    document.querySelectorAll('.guide-panel').forEach(p => {
        p.style.display = (p.dataset.guidePanel === which) ? 'block' : 'none';
    });
    document.querySelectorAll('.guide-tab-btn').forEach(b => {
        const active = (b.dataset.guideTab === which);
        b.style.background = active ? '#f1c40f' : 'rgba(255,255,255,0.08)';
        b.style.color = active ? '#000' : '#fff';
        b.style.borderColor = active ? '#f1c40f' : 'rgba(255,255,255,0.15)';
    });
}
window.showGuideTab = showGuideTab;

// Tab click handlers — delegated so a single listener covers both buttons.
document.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.guide-tab-btn');
    if (tabBtn && tabBtn.dataset.guideTab) {
        showGuideTab(tabBtn.dataset.guideTab);
    }
});

// On boot, restore the "guide seen" flag from localStorage — if set, the
// bouncing hint next to the 📖 button stays hidden.
document.addEventListener('DOMContentLoaded', () => {
    try {
        if (localStorage.getItem('brawlclash_guide_seen') === '1') {
            document.body.setAttribute('data-guide-seen', '1');
        }
    } catch (e) { /* storage disabled — hint will just keep bouncing */ }
});

// --- Character list rendered into both guide panels -----------------------
// Pulls names/costs/icons from CARDS and stats/role text from unit/building/
// aura definitions, plus a short Hebrew blurb so a new player knows what each
// card does at a glance. Star-power names are included when available.
const GUIDE_CHAR_ROLES = {
    'bruce':   { role: 'יחידה — טנק', base: '1200 HP / 150 DMG', blurb: 'דוב חזק שסופג נזק והולם מכות כבדות. טוב לקו הקדמי.' },
    'leon':    { role: 'יחידה — מתנקש', base: '900 HP / 200 DMG', blurb: 'נמצא במצב בלתי נראה עד שהוא תוקף. מהיר וקטלני נגד אזוריים.' },
    'bull':    { role: 'יחידה — מסתער', base: '1150 HP / 280 DMG', blurb: 'מסתער (דאש) לכיוון האויב הקרוב ונועל אותו. כפתור 💨 מפעיל אותו שוב אחרי הריגה.' },
    'scrappy': { role: 'בניין — טורט יריה', base: '800 HP / 60 DMG @150 טווח, כל 0.5ש׳', blurb: 'טורט שיורה במהירות על היחידה הקרובה. נהדר להגנה.' },
    'penny':   { role: 'בניין — תותח ארוך-טווח', base: '600 HP / 200 DMG @299 טווח, כל 2.5ש׳', blurb: 'תותח עם טווח ארוך מאוד ונזק פיצוץ גדול. רכיב לחץ.' },
    'mr-p':    { role: 'בניין — מכונת זימון', base: '1000 HP, מזמן פורטרים', blurb: 'בסיס שמזמן פורטרים קטנים ומהירים שתוקפים את הקו של היריב.' },
    'pam':     { role: 'הילה — מרפא', base: '700 HP, מרפא בהילה', blurb: 'מרפאת יחידות שלך בתוך ההילה. SP1 מעניק ריפוי מיידי של 500 בהצבה.' },
    'max':     { role: 'הילה — מאיץ', base: '700 HP, מגביר מהירות ×1.5', blurb: 'מגביר את מהירות הצוות בתוך ההילה. SP1 מאיץ גם את מילוי האליקסיר.' },
    '8bit':    { role: 'הילה — מגביר נזק', base: '1200 HP, +10% נזק בהילה', blurb: 'מגביר נזק ליחידות הצוות בטווח. SP2 מעלה ל-30%.' },
    'emz':     { role: 'הילה — הרחבת טריטוריה', base: '1000 HP, ייחודי', blurb: 'מרחיבה את האזור שבו אפשר להניח יחידות אל חצי האויב. SP1 מעניק גם +20% נזק ליחידות שלך בהילה.' },
    'spike':   { role: 'הילה — האטה', base: '1000 HP, מאיט אויבים ×0.5', blurb: 'מאיט אויבים בטווח. SP1 מרפא גם יחידות שלך בתוך ההילה.' },
    'tara':    { role: 'הילה — משיכה', base: '1500 HP, גרביטציה 150', blurb: 'מושכת אויבים לתוכה — טובה לאיסוף גוש אויבים לטורטים שלך.' }
};

function renderGuideCharacters() {
    const rows = Object.keys(CARDS).map(id => {
        const c = CARDS[id];
        const meta = GUIDE_CHAR_ROLES[id] || { role: c.type, base: '', blurb: '' };
        const sp = STAR_POWERS[id] || [];
        const spHtml = sp.length
            ? sp.map(s => `<div style="font-size: 0.78rem; color: #ffeaa7; margin-top: 2px;">⭐ <b>${s.name}</b> — ${s.desc}</div>`).join('')
            : '';
        return `
            <div style="background: rgba(255,255,255,0.06); border-radius: 10px; padding: 8px 10px; margin-bottom: 8px; border-right: 3px solid ${c.color};">
                <div style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;">
                    <span style="font-size: 1.4rem;">${c.icon}</span>
                    <b style="color: #fff; font-size: 1rem;">${c.name}</b>
                    <span style="color: #f1c40f; font-size: 0.8rem;">🧪 ${c.cost}</span>
                    <span style="color: #95a5a6; font-size: 0.8rem;">${meta.role}</span>
                </div>
                ${meta.base ? `<div style="color: #bdc3c7; font-size: 0.75rem; margin-top: 2px;">${meta.base}</div>` : ''}
                ${meta.blurb ? `<div style="color: #ecf0f1; font-size: 0.85rem; margin-top: 4px;">${meta.blurb}</div>` : ''}
                ${spHtml}
            </div>`;
    }).join('');
    ['guide-chars-mobile', 'guide-chars-desktop'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = rows;
    });
}
window.renderGuideCharacters = renderGuideCharacters;

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
