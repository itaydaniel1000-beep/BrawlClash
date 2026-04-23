// ui-admin.js - Admin Panel UI Logic

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
    if (typeof saveAdminHacks === 'function') saveAdminHacks();

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
        localStorage.setItem(`brawlclash_level_${id}`, MAX_LEVEL);
    });
    saveStats();
    updateStatsUI();
    renderCharCards();
    console.log("🛠️ Admin: All characters maxed!");
}
window.maxAllLevels = maxAllLevels;

// ---------------------------------------------------------------------------
// Grant-Admin: super-admin (ADMIN_USERNAME) can attach admin-panel privileges
// to any username. The grant is stored in localStorage keyed by username, and
// applied automatically on boot whenever a client with that username logs in.
// Additionally, during a P2P battle the grant is sent to the peer via the
// existing ADMIN_CONFIG channel so their units reflect it immediately.
// ---------------------------------------------------------------------------

function openGrantAdminModal() {
    const overlay = document.getElementById('grant-admin-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    overlay.classList.add('active');
    document.getElementById('grant-admin-result').innerText = '';
    document.getElementById('grant-admin-target').value = '';
    document.getElementById('grant-admin-desc').value = '';
}
window.openGrantAdminModal = openGrantAdminModal;

function closeGrantAdminModal() {
    const overlay = document.getElementById('grant-admin-overlay');
    if (!overlay) return;
    overlay.style.display = 'none';
    overlay.classList.remove('active');
}
window.closeGrantAdminModal = closeGrantAdminModal;

// Pattern-matcher that converts free-text (Hebrew + English) into a grant
// payload. Not an LLM — this game has no backend / API key — but it covers
// the common things the super-admin actually wants to hand out:
//   • persistent hacks: godMode, doubleDamage, superSpeed, infiniteElixir
//   • one-shot grants: coins, gems, trophies, maxLevels
//   • shortcuts: "הכל" / "all" toggles every persistent hack on
function parseAdminRequest(text) {
    const t = (text || '').toLowerCase();
    const grant = {
        infiniteElixir: false, godMode: false, doubleDamage: false, superSpeed: false,
        coins: 0, gems: 0, trophies: 0, maxLevels: false
    };

    const has = (...phrases) => phrases.some(p => t.includes(p.toLowerCase()));

    if (has('הכל', 'all everything', 'everything', 'all powers')) {
        grant.infiniteElixir = true; grant.godMode = true;
        grant.doubleDamage = true; grant.superSpeed = true;
    }

    if (has('גוד מוד', 'גודמוד', 'חסין', 'אלמוות', 'אל-מוות', 'בלתי פגיע',
            'god mode', 'godmode', 'invincible', 'immortal')) {
        grant.godMode = true;
    }
    if (has('נזק כפול', 'כפול נזק', 'נזק x2', 'נזק *2', 'נזק חזק', 'double damage',
            'doubledamage', 'double dmg', '2x damage')) {
        grant.doubleDamage = true;
    }
    if (has('מהירות על', 'מהירות-על', 'מהירות כפולה', 'מהיר', 'מהר', 'מהירות',
            'super speed', 'superspeed', 'fast', 'speed boost')) {
        grant.superSpeed = true;
    }
    if (has('אליקסיר אינסופי', 'אליקסיר חופשי', 'אליקסיר ללא הגבלה', 'אליקסיר אין סופי',
            'אין סופי', 'אינסופי', 'infinite elixir', 'infiniteelixir', 'unlimited elixir')) {
        grant.infiniteElixir = true;
    }

    // "מקסימום רמות" / "max levels" / "רמה מקסימלית לכולם"
    if (has('רמה מקסימלית', 'רמות מקס', 'מקס רמות', 'רמות מקסימום', 'כל הדמויות מקסימום',
            'max levels', 'max level', 'maximum level')) {
        grant.maxLevels = true;
    }

    // Numeric grants: accepts "1000 מטבעות" / "500 coins" / "coins: 1000" etc.
    const coinsMatch = t.match(/(\d[\d,\.]*)\s*(?:מטבעות|זהב|coins?|gold)/i);
    if (coinsMatch) grant.coins = parseInt(coinsMatch[1].replace(/[,\.]/g, ''), 10) || 0;
    const gemsMatch = t.match(/(\d[\d,\.]*)\s*(?:יהלומים|יהלום|gems?|diamonds?)/i);
    if (gemsMatch) grant.gems = parseInt(gemsMatch[1].replace(/[,\.]/g, ''), 10) || 0;
    const trophiesMatch = t.match(/(\d[\d,\.]*)\s*(?:גביעים|גביע|trophies|trophy)/i);
    if (trophiesMatch) grant.trophies = parseInt(trophiesMatch[1].replace(/[,\.]/g, ''), 10) || 0;

    return grant;
}
window.parseAdminRequest = parseAdminRequest;

function _loadAdminGrants() {
    try {
        const raw = localStorage.getItem('brawlclash_admin_grants');
        return raw ? (JSON.parse(raw) || {}) : {};
    } catch (e) { return {}; }
}
function _saveAdminGrants(obj) {
    try { localStorage.setItem('brawlclash_admin_grants', JSON.stringify(obj || {})); }
    catch (e) { /* storage full — ignore */ }
}
window._loadAdminGrants = _loadAdminGrants;

function submitGrantAdmin() {
    // Only the super-admin can use this — defence in depth on top of the
    // visibility toggle on #grant-admin-btn.
    if (playerStats.username !== ADMIN_USERNAME) {
        console.warn('🚫 grant-admin called from non-super-admin');
        return;
    }

    const target = (document.getElementById('grant-admin-target').value || '').trim();
    const desc = (document.getElementById('grant-admin-desc').value || '').trim();
    const result = document.getElementById('grant-admin-result');

    if (!target) { result.style.color = '#e74c3c'; result.innerText = 'חסר שם משתמש'; return; }
    if (!desc)   { result.style.color = '#e74c3c'; result.innerText = 'חסר תיאור של מה לתת לו'; return; }

    const parsed = parseAdminRequest(desc);
    const anyHack = parsed.infiniteElixir || parsed.godMode || parsed.doubleDamage || parsed.superSpeed;
    const anyOneShot = parsed.coins > 0 || parsed.gems > 0 || parsed.trophies > 0 || parsed.maxLevels;
    if (!anyHack && !anyOneShot) {
        result.style.color = '#e74c3c';
        result.innerText = "לא זיהיתי יכולת. נסה: 'גוד מוד', 'נזק כפול', 'מהירות', 'אליקסיר אינסופי', 'הכל', '1000 מטבעות', '100 יהלומים', '500 גביעים', 'רמה מקסימלית'.";
        return;
    }

    // Fresh grantId so the target applies one-shot rewards idempotently:
    // re-running the form bumps the id → coins/gems get handed out again.
    const flags = { ...parsed, grantId: 'g-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) };

    // Persist the grant on the super-admin's device. Other devices fetch it
    // via `queryAdminForGrant` → QUERY_GRANT over PeerJS lock-peer.
    const grants = _loadAdminGrants();
    grants[target] = flags;
    _saveAdminGrants(grants);

    // If the target is the locally-logged-in player, apply immediately.
    if (target === playerStats.username && typeof applyGrantFlags === 'function') {
        applyGrantFlags(flags);
    }

    // In an active P2P battle, push persistent hacks through ADMIN_CONFIG so
    // they take effect for the opposing client right away.
    if (window.NetworkManager && typeof window.NetworkManager.sendAdminConfig === 'function') {
        try { window.NetworkManager.sendAdminConfig(); } catch (e) {}
    }

    const parts = [];
    if (flags.godMode) parts.push('גוד-מוד');
    if (flags.doubleDamage) parts.push('נזק כפול');
    if (flags.superSpeed) parts.push('מהירות-על');
    if (flags.infiniteElixir) parts.push('אליקסיר אינסופי');
    if (flags.coins) parts.push(`${flags.coins} 🪙`);
    if (flags.gems) parts.push(`${flags.gems} 💎`);
    if (flags.trophies) parts.push(`${flags.trophies} 🏆`);
    if (flags.maxLevels) parts.push('רמות מקס');
    result.style.color = '#2ecc71';
    result.innerText = `✓ ${target} יקבל: ${parts.join(', ')} (יחול כשיהיה מחובר)`;
}
window.submitGrantAdmin = submitGrantAdmin;

// On boot, if the local player's username has a pending grant, apply it so the
// admin panel + its perks are active immediately on this device.
function applyAdminGrantForLocalUser() {
    if (!playerStats || !playerStats.username) return;
    const grants = _loadAdminGrants();
    const mine = grants[playerStats.username];
    if (mine && typeof applyGrantFlags === 'function') {
        applyGrantFlags(mine);
        const adminBtn = document.querySelector('.admin-btn:not(.grant-admin-btn)');
        if (adminBtn) adminBtn.style.display = 'flex';
    }
}
window.applyAdminGrantForLocalUser = applyAdminGrantForLocalUser;
document.addEventListener('DOMContentLoaded', () => {
    // Defer so playerStats is populated first.
    setTimeout(applyAdminGrantForLocalUser, 100);
});
