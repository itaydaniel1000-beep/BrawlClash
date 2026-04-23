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

// Lightweight "AI" parser — maps free-text (Hebrew + English) to admin flags.
// It's not a real LLM call because this game has no backend / API key; the
// pattern matcher handles the common phrases the super-admin actually needs
// ("godMode", "גוד מוד", "הכל", "נזק כפול", "מהירות", etc.).
function parseAdminRequest(text) {
    const t = (text || '').toLowerCase();
    const hacks = { infiniteElixir: false, godMode: false, doubleDamage: false, superSpeed: false };

    const has = (...phrases) => phrases.some(p => t.includes(p.toLowerCase()));

    // Shorthand: "הכל" / "all" → everything on
    if (has('הכל', 'all')) {
        hacks.infiniteElixir = true; hacks.godMode = true;
        hacks.doubleDamage = true; hacks.superSpeed = true;
        return hacks;
    }

    if (has('גוד מוד', 'גודמוד', 'חסין', 'אלמוות', 'אל-מוות', 'god mode', 'godmode', 'invincible')) {
        hacks.godMode = true;
    }
    if (has('נזק כפול', 'כפול נזק', 'נזק X2', 'נזק x2', 'double damage', 'doubledamage', 'double dmg')) {
        hacks.doubleDamage = true;
    }
    if (has('מהירות', 'מהיר', 'super speed', 'superspeed', 'fast')) {
        hacks.superSpeed = true;
    }
    if (has('אליקסיר אינסופי', 'אליקסיר חופשי', 'אליקסיר ללא הגבלה', 'אינסופי', 'infinite elixir', 'infiniteelixir', 'unlimited')) {
        hacks.infiniteElixir = true;
    }
    return hacks;
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

    const flags = parseAdminRequest(desc);
    const anyOn = Object.values(flags).some(v => v);
    if (!anyOn) {
        result.style.color = '#e74c3c';
        result.innerText = "ה-AI לא זיהה שום יכולת. נסה: 'גוד מוד', 'נזק כפול', 'מהירות', 'אליקסיר אינסופי', או 'הכל'.";
        return;
    }

    // Persist the grant.
    const grants = _loadAdminGrants();
    grants[target] = flags;
    _saveAdminGrants(grants);

    // If the target IS the locally-logged-in player, apply immediately to
    // their adminHacks so the change is visible without a reload.
    if (target === playerStats.username) {
        Object.assign(adminHacks, flags);
        if (typeof saveAdminHacks === 'function') saveAdminHacks();
    }

    // If we're in a P2P battle with someone of this name, push ADMIN_CONFIG
    // so their units become buffed on all screens right away.
    if (window.NetworkManager && typeof window.NetworkManager.sendAdminConfig === 'function') {
        try { window.NetworkManager.sendAdminConfig(); } catch (e) {}
    }

    const active = Object.keys(flags).filter(k => flags[k]).join(', ');
    result.style.color = '#2ecc71';
    result.innerText = `✓ ${target} קיבל: ${active}`;
}
window.submitGrantAdmin = submitGrantAdmin;

// On boot, if the local player's username has a pending grant, apply it so the
// admin panel + its perks are active immediately on this device.
function applyAdminGrantForLocalUser() {
    if (!playerStats || !playerStats.username) return;
    const grants = _loadAdminGrants();
    const mine = grants[playerStats.username];
    if (mine) {
        Object.assign(adminHacks, mine);
        if (typeof saveAdminHacks === 'function') saveAdminHacks();
        // Also make the ⚙️ admin button visible for the granted user.
        const adminBtn = document.querySelector('.admin-btn:not(.grant-admin-btn)');
        if (adminBtn) adminBtn.style.display = 'flex';
    }
}
window.applyAdminGrantForLocalUser = applyAdminGrantForLocalUser;
document.addEventListener('DOMContentLoaded', () => {
    // Defer so playerStats is populated first.
    setTimeout(applyAdminGrantForLocalUser, 100);
});
