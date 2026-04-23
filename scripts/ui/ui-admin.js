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
        coins: 0, gems: 0, trophies: 0, maxLevels: false,
        // Numeric / parametric powers — 0 means "don't override the default".
        speedMultiplier: 0, dmgMultiplier: 0, hpMultiplier: 0, safeHpMultiplier: 0,
        startingElixir: 0, maxElixir: 0
    };

    const has = (...phrases) => phrases.some(p => t.includes(p.toLowerCase()));

    // --- Revocation ------------------------------------------------------
    // If the super-admin says "הסר", "בטל", "revoke" etc., wipe the grant.
    if (has('הסר הכל', 'בטל הכל', 'הורד אדמין', 'הוריד הרשאות', 'הסר אדמין',
            'הוריד אדמין', 'revoke', 'remove admin', 'clear admin', 'reset admin',
            'no admin', 'קח ממנו') ||
        /^\s*(בטל|הסר|הורד|revoke|remove|clear|reset)\b/i.test(text || '')) {
        grant._revoke = true;
        return grant;
    }

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
    if (has('מהירות על', 'מהירות-על', 'מהירות כפולה', 'מהיר', 'מהר',
            'super speed', 'superspeed', 'fast', 'speed boost')) {
        grant.superSpeed = true;
    }
    if (has('אליקסיר אינסופי', 'אליקסיר חופשי', 'אליקסיר ללא הגבלה', 'אליקסיר אין סופי',
            'infinite elixir', 'infiniteelixir', 'unlimited elixir')) {
        grant.infiniteElixir = true;
    }

    if (has('רמה מקסימלית', 'רמות מקס', 'מקס רמות', 'רמות מקסימום', 'כל הדמויות מקסימום',
            'max levels', 'max level', 'maximum level')) {
        grant.maxLevels = true;
    }

    // --- Parametric multipliers ----------------------------------------
    // "מהירות X4", "מהירות כפול 4", "speed x4", "speed *4".
    const speedMul = t.match(/(?:מהירות|speed)[^\d]*(?:x|×|כפול|\*|פי)\s*(\d+(?:\.\d+)?)/i);
    if (speedMul) grant.speedMultiplier = parseFloat(speedMul[1]);

    // "נזק X5" / "damage x5" / "נזק פי 5"
    const dmgMul = t.match(/(?:נזק|damage|dmg)[^\d]*(?:x|×|כפול|\*|פי)\s*(\d+(?:\.\d+)?)/i);
    if (dmgMul) grant.dmgMultiplier = parseFloat(dmgMul[1]);

    // "חיים X5" / "hp x5" / "חיים פי 5"
    const hpMul = t.match(/(?:חיים|hp|health)[^\d]*(?:x|×|כפול|\*|פי)\s*(\d+(?:\.\d+)?)/i);
    if (hpMul) grant.hpMultiplier = parseFloat(hpMul[1]);

    // "כספת X3" / "safe hp x3"
    const safeMul = t.match(/(?:כספת|safe(?: hp)?)[^\d]*(?:x|×|כפול|\*|פי)\s*(\d+(?:\.\d+)?)/i);
    if (safeMul) grant.safeHpMultiplier = parseFloat(safeMul[1]);

    // --- Starting / max elixir ----------------------------------------
    // "טעינה של 20 אליקסיר בהתחלה", "התחלה של 20 אליקסיר", "starting elixir 20".
    const startEl = t.match(/(?:התחלה של|התחיל עם|התחלתי|טעינה של|starting elixir|start with|start elixir|initial elixir)\s*(\d+)/i);
    if (startEl) grant.startingElixir = parseInt(startEl[1], 10);

    // "מקסימום אליקסיר 20" / "max elixir 20" / "אליקסיר מקס 20"
    const maxEl = t.match(/(?:אליקסיר מקס|מקסימום אליקסיר|מקס אליקסיר|max elixir|elixir cap)\s*(\d+)/i);
    if (maxEl) grant.maxElixir = parseInt(maxEl[1], 10);

    // --- Currency grants ----------------------------------------------
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
    const anyMult = parsed.speedMultiplier || parsed.dmgMultiplier || parsed.hpMultiplier || parsed.safeHpMultiplier;
    const anyElixirOverride = parsed.startingElixir || parsed.maxElixir;
    const anyOneShot = parsed.coins > 0 || parsed.gems > 0 || parsed.trophies > 0 || parsed.maxLevels;
    if (!parsed._revoke && !anyHack && !anyMult && !anyElixirOverride && !anyOneShot) {
        result.style.color = '#e74c3c';
        result.innerText = "לא זיהיתי יכולת. נסה: 'גוד מוד' / 'נזק כפול' / 'אליקסיר אינסופי' / 'הכל' / 'מהירות X4' / 'חיים X5' / 'נזק X10' / 'כספת X3' / 'התחלה של 20 אליקסיר' / '1000 מטבעות' / '100 יהלומים' / '500 גביעים' / 'רמה מקסימלית' / 'בטל הכל'.";
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
    if (flags._revoke) parts.push('הסרת הרשאות');
    if (flags.godMode) parts.push('גוד-מוד');
    if (flags.doubleDamage) parts.push('נזק כפול');
    if (flags.superSpeed) parts.push('מהירות-על');
    if (flags.infiniteElixir) parts.push('אליקסיר אינסופי');
    if (flags.speedMultiplier) parts.push(`מהירות ×${flags.speedMultiplier}`);
    if (flags.dmgMultiplier) parts.push(`נזק ×${flags.dmgMultiplier}`);
    if (flags.hpMultiplier) parts.push(`חיים ×${flags.hpMultiplier}`);
    if (flags.safeHpMultiplier) parts.push(`כספת ×${flags.safeHpMultiplier}`);
    if (flags.startingElixir) parts.push(`התחלה ${flags.startingElixir} אליקסיר`);
    if (flags.maxElixir) parts.push(`מקס אליקסיר ${flags.maxElixir}`);
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
// ---------------------------------------------------------------------------
// Revoke-admin modal — super-admin only. Types a username, click → that
// username's grant is replaced with a `_revoke` payload (new grantId) and
// persisted. Next time the target's client queries the admin oracle they
// get the revocation and `applyGrantFlags` wipes their hacks locally.
// ---------------------------------------------------------------------------

function openRevokeAdminModal() {
    const overlay = document.getElementById('revoke-admin-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    overlay.classList.add('active');
    document.getElementById('revoke-admin-target').value = '';
    document.getElementById('revoke-admin-result').innerText = '';
}
window.openRevokeAdminModal = openRevokeAdminModal;

function closeRevokeAdminModal() {
    const overlay = document.getElementById('revoke-admin-overlay');
    if (!overlay) return;
    overlay.style.display = 'none';
    overlay.classList.remove('active');
}
window.closeRevokeAdminModal = closeRevokeAdminModal;

function submitRevokeAdmin() {
    if (playerStats.username !== ADMIN_USERNAME) {
        console.warn('🚫 revoke-admin called from non-super-admin');
        return;
    }
    const target = (document.getElementById('revoke-admin-target').value || '').trim();
    const result = document.getElementById('revoke-admin-result');
    if (!target) {
        result.style.color = '#e74c3c';
        result.innerText = 'חסר שם משתמש';
        return;
    }

    // Store a revoke "grant" so the target picks it up via the oracle channel.
    const revokeFlags = { _revoke: true, grantId: 'rev-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) };
    const grants = _loadAdminGrants();
    grants[target] = revokeFlags;
    _saveAdminGrants(grants);

    // If the super-admin is revoking themselves — unlikely, but possible —
    // apply locally too.
    if (target === playerStats.username && typeof applyGrantFlags === 'function') {
        applyGrantFlags(revokeFlags);
    }

    // Nudge any currently-connected peer to refresh via ADMIN_CONFIG. Real
    // cross-device revocation happens when the target's client next queries
    // the oracle (on next load / re-login).
    if (window.NetworkManager && typeof window.NetworkManager.sendAdminConfig === 'function') {
        try { window.NetworkManager.sendAdminConfig(); } catch (e) {}
    }

    result.style.color = '#2ecc71';
    result.innerText = `✓ ${target} יאבד את ההרשאות (יחול כשיתחבר)`;
}
window.submitRevokeAdmin = submitRevokeAdmin;

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
