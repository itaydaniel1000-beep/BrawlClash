// ui-admin.js - Admin Panel UI Logic

// Verifies that `pw` matches the password the LOCAL user set at signup.
// Used as a confirmation gate before sensitive actions (grant / revoke
// admin).
//
// Migration: existing accounts created before this feature shipped don't
// have a password on record. We auto-enrol them on first use — whatever
// the user types becomes their saved password from then on. After that,
// it has to match exactly.
function _verifyMyPassword(pw) {
    const name = (typeof playerStats !== 'undefined' && playerStats && playerStats.username) || '';
    if (!name) return false;
    if (!pw || pw.length < 4) return false;   // demand at least 4 chars
    const key = 'brawlclash_pw_' + name.toLowerCase();
    let saved = '';
    try { saved = localStorage.getItem(key) || ''; } catch (e) { saved = ''; }
    if (!saved) {
        // Legacy account — first time after the feature ships. Treat the
        // current input as the user's new password.
        try { localStorage.setItem(key, pw); } catch (e) {}
        return true;
    }
    return pw === saved;
}
window._verifyMyPassword = _verifyMyPassword;

function openAdminMenu() {
    const isSuper = (typeof isSuperAdmin === 'function')
        ? isSuperAdmin(playerStats.username || '')
        : (playerStats.username === ADMIN_USERNAME);
    const grants = (typeof _loadAdminGrants === 'function') ? _loadAdminGrants() : {};
    const myGrant = (playerStats.username && grants[playerStats.username]) || null;

    // Granular "limited admin" gates. Each one is true for non-super users
    // who are allowed exactly that single capability and nothing else.
    // Super-admins set all three to FALSE here (they go through the isSuper
    // branch instead, which unlocks every row).
    const _name = playerStats.username || '';
    const _libiAllowed    = (typeof isLibiAllowed    === 'function') && isLibiAllowed(_name)    && !isSuper;
    const _barryAllowed   = (typeof isBarryAllowed   === 'function') && isBarryAllowed(_name)   && !isSuper;
    const _lumiAllowed    = (typeof isLumiAllowed    === 'function') && isLumiAllowed(_name)    && !isSuper;
    const _creditsEditor  = (typeof isCreditsEditor  === 'function') && isCreditsEditor(_name)  && !isSuper;
    const _gemsEditor     = (typeof isGemsEditor     === 'function') && isGemsEditor(_name)     && !isSuper;
    const _anyLimited     = _libiAllowed || _barryAllowed || _lumiAllowed || _creditsEditor || _gemsEditor;

    // Super-admin always allowed; anyone else needs a MEANINGFUL grant
    // (at least one truthy flag besides the bookkeeping `grantId`, and not
    // an explicit revoke), OR one of the limited-permission flags above.
    const _grantIsMeaningful = (g) => {
        if (!g || g._revoke) return false;
        for (const k in g) { if (k !== 'grantId' && g[k]) return true; }
        return false;
    };
    if (!isSuper && !_grantIsMeaningful(myGrant) && !_anyLimited) {
        console.warn("🚫 Unauthorized Admin Access Attempt");
        return;
    }

    const overlay = document.getElementById('admin-panel-overlay');
    if (!overlay) return;
    // The admin panel's markup sits INSIDE #app, but we want to slide #app
    // left when the panel opens — otherwise the panel gets carried along
    // with #app and ends up in the wrong place. Reparent it to <body> once
    // so it stays pinned to the viewport.
    if (overlay.parentElement !== document.body) {
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
    // Flag the body so CSS can slide #app left and out of the panel's way on
    // desktop. The mobile media-query opts out so the phone modal still
    // covers the full screen the way it always did.
    _refreshAdminOpenClass();

    // Reflect cancelAdmin-suspend state on the panel: gray every gameplay
    // toggle/input out and pin a top-of-panel banner explaining why nothing
    // can be flipped right now. The class is toggled live every time the
    // panel opens so the lock follows match start / end.
    _refreshAdminSuspendedUI(overlay);

    const boolToggles = [
        { id: 'toggle-infinite-elixir',  key: 'infiniteElixir' },
        { id: 'toggle-god-mode',         key: 'godMode' },
        { id: 'toggle-double-damage',    key: 'doubleDamage' },
        { id: 'toggle-super-speed',      key: 'superSpeed' },
        { id: 'toggle-infiniteRange',    key: 'infiniteRange' },
        { id: 'toggle-permanentInvisible', key: 'permanentInvisible' },
        { id: 'toggle-freeCards',        key: 'freeCards' },
        { id: 'toggle-fullRefund',       key: 'fullRefund' },
        { id: 'toggle-safeShoots',       key: 'safeShoots' },
        { id: 'toggle-safeHeals',        key: 'safeHeals' },
        { id: 'toggle-doubleSafe',       key: 'doubleSafe' },
        { id: 'toggle-disableBot',       key: 'disableBot' },
        { id: 'toggle-autoIncome',       key: 'autoIncome' },
        { id: 'toggle-allStarPowers',    key: 'allStarPowers' },
        { id: 'toggle-deleteUnit',       key: 'deleteUnit' },
        { id: 'toggle-canGrantAdmin',    key: 'canGrantAdmin' },
        { id: 'toggle-canRevokeAdmin',   key: 'canRevokeAdmin' },
        { id: 'toggle-cancelAdmin',      key: 'cancelAdmin' },
        { id: 'toggle-libiCard',         key: 'libiCard' },
        { id: 'toggle-barryCard',        key: 'barryCard' },
        { id: 'toggle-lumiCard',         key: 'lumiCard' }
    ];
    boolToggles.forEach(t => updateAdminToggleUI(t.key, t.id));

    // Sync number/text inputs with the current adminHacks values.
    document.querySelectorAll('#admin-panel-overlay .admin-num-input').forEach(inp => {
        const m = (inp.getAttribute('oninput') || '').match(/setAdminNumber\('([^']+)'/);
        if (!m) return;
        const key = m[1];
        if (typeof adminHacks[key] !== 'undefined' && adminHacks[key] !== '') {
            inp.value = adminHacks[key];
        }
    });

    // Hide each hack-row that isn't part of this user's grant. Super-admin sees
    // every row regardless. For granted users, show rows whose key matches a
    // granted flag OR a granted numeric > 0.
    // Keep the `.hack-description` chip just below each row in sync with its
    // row's visibility so granted users don't see orphan explanations.
    const setRowVisibility = (row, show) => {
        if (!row) return;
        row.style.display = show ? '' : 'none';
        const next = row.nextElementSibling;
        if (next && next.classList.contains('hack-description')) {
            next.style.display = show ? '' : 'none';
        }
    };

    boolToggles.forEach(t => {
        const btn = document.getElementById(t.id);
        const row = btn && btn.closest('.hack-row');
        // Per-toggle limited-admin overrides — non-super users in one of the
        // allow-lists see ONLY their specific row(s):
        //   • libiCard  → LIBI_ALLOWED_USERS
        //   • barryCard → BARRY_ALLOWED_USERS
        // Super-admin sees every row via the isSuper branch.
        const libiVisible  = (t.key === 'libiCard')  && _libiAllowed;
        const barryVisible = (t.key === 'barryCard') && _barryAllowed;
        const lumiVisible  = (t.key === 'lumiCard')  && _lumiAllowed;
        setRowVisibility(row, isSuper || libiVisible || barryVisible || lumiVisible || (myGrant && myGrant[t.key]));
    });
    document.querySelectorAll('#admin-panel-overlay .admin-num-input').forEach(inp => {
        const row = inp.closest('.hack-row');
        if (!row) return;
        const m = (inp.getAttribute('oninput') || '').match(/setAdminNumber\('([^']+)'/);
        if (!m) return;
        const key = m[1];
        const granted = myGrant && myGrant[key] && myGrant[key] !== 0 && myGrant[key] !== '';
        setRowVisibility(row, isSuper || granted);
    });

    // Currency editor rows — visible to:
    //   • Super-admin (all 5 rows)
    //   • Allow-listed limited users (CREDITS_EDITOR_USERS → credits row,
    //     GEMS_EDITOR_USERS → gems row)
    //   • Anyone whose personal grant carries the matching editX flag
    //     (editCoins / editGems / editCredits / editPp / editTrophies)
    // Section title + divider show whenever ANY editor row is visible.
    const _gCoins    = !!(myGrant && myGrant.editCoins);
    const _gGems     = !!(myGrant && myGrant.editGems);
    const _gCredits  = !!(myGrant && myGrant.editCredits);
    const _gPp       = !!(myGrant && myGrant.editPp);
    const _gTrophies = !!(myGrant && myGrant.editTrophies);
    document.querySelectorAll('#admin-panel-overlay .editor-row').forEach(row => {
        const input = row.querySelector('input');
        const id = input ? input.id : '';
        const isCoinsRow    = id === 'admin-gold-input';
        const isGemsRow     = id === 'admin-gems-input';
        const isCreditsRow  = id === 'admin-credits-input';
        const isTrophiesRow = id === 'admin-trophies-input';
        const isPpRow       = id === 'admin-pp-input';
        const showRow = isSuper
                        || (isCreditsRow  && (_creditsEditor || _gCredits))
                        || (isGemsRow     && (_gemsEditor    || _gGems))
                        || (isCoinsRow    && _gCoins)
                        || (isPpRow       && _gPp)
                        || (isTrophiesRow && _gTrophies);
        row.style.display = showRow ? '' : 'none';
    });
    const anyEditorVisible = isSuper || _creditsEditor || _gemsEditor ||
                             _gCoins || _gGems || _gCredits || _gPp || _gTrophies;
    document.querySelectorAll('#admin-panel-overlay .admin-divider, #admin-panel-overlay .editor-section-title').forEach(el => {
        el.style.display = anyEditorVisible ? '' : 'none';
    });

    _renderGrantedExtras(isSuper, myGrant);
}
window.openAdminMenu = openAdminMenu;

// Build a read-only strip inside the admin panel that shows the non-toggle
// powers a granted user received — parametric multipliers, starting/max
// elixir overrides, currency/trophy bumps they've already collected, and
// any custom JS injected by the AI. Super-admin doesn't need this (they use
// the real setters).
function _renderGrantedExtras(isSuper, myGrant) {
    const container = document.querySelector('#admin-panel-overlay .admin-panel-container');
    if (!container) return;
    let extras = document.getElementById('granted-extras');
    if (!extras) {
        extras = document.createElement('div');
        extras.id = 'granted-extras';
        extras.style.cssText = 'margin: 8px 0; display: flex; flex-direction: column; gap: 6px;';
        // Insert right before the close button at the bottom.
        const closeBtn = container.querySelector('.admin-close-btn-footer');
        if (closeBtn) container.insertBefore(extras, closeBtn);
        else container.appendChild(extras);
    }
    extras.innerHTML = '';
    if (isSuper || !myGrant) { extras.style.display = 'none'; return; }
    extras.style.display = 'flex';

    const add = (label, emoji) => {
        const row = document.createElement('div');
        row.style.cssText = 'background: rgba(46, 204, 113, 0.15); border: 1px solid rgba(46, 204, 113, 0.4); border-radius: 10px; padding: 6px 10px; color: #ecf0f1; font-size: 0.88rem; display: flex; align-items: center; gap: 8px;';
        row.innerHTML = `<span style="font-size: 1.1rem;">${emoji}</span><span>${label}</span>`;
        extras.appendChild(row);
    };

    if (myGrant.speedMultiplier > 1)   add(`מהירות ×${myGrant.speedMultiplier} פעיל`, '⚡');
    if (myGrant.dmgMultiplier > 1)     add(`נזק ×${myGrant.dmgMultiplier} פעיל`, '⚔️');
    if (myGrant.hpMultiplier > 1)      add(`חיים ×${myGrant.hpMultiplier} פעיל`, '❤️');
    if (myGrant.safeHpMultiplier > 1)  add(`כספת ×${myGrant.safeHpMultiplier} פעיל`, '🏰');
    if (myGrant.startingElixir)        add(`התחלה עם ${myGrant.startingElixir} אליקסיר`, '🧪');
    if (myGrant.maxElixir)             add(`תקרת אליקסיר ${myGrant.maxElixir}`, '📈');
    if (myGrant.coins)                 add(`קיבלת ${myGrant.coins} מטבעות`, '🪙');
    if (myGrant.gems)                  add(`קיבלת ${myGrant.gems} יהלומים`, '💎');
    if (myGrant.trophies)              add(`קיבלת ${myGrant.trophies} גביעים`, '🏆');
    if (myGrant.maxLevels)             add('רמות מקס לכל הדמויות', '🚀');
    if (myGrant.customJS)              add('כוח מיוחד פעיל (AI)', '🎁');

    if (!extras.firstChild) extras.style.display = 'none';
}

function closeAdminMenu() {
    const overlay = document.getElementById('admin-panel-overlay');
    if (overlay) overlay.style.display = 'none';
    _refreshAdminOpenClass();
}
window.closeAdminMenu = closeAdminMenu;

// Wipes every admin-hack back to its default (0 / false / '') — single-click
// reset for the super-admin. Refreshes the open panel's UI so every toggle
// and number input reflects the defaults immediately.
function resetAdminPanel() {
    // Reset wipes EVERY hack to its default — super-admin only.
    if (!_adminActionAllowed('super')) return;

    if (_isAdminSuspended()) {
        if (typeof showTransientToast === 'function') {
            showTransientToast('🛡️ ביטול אדמין פעיל — לא ניתן לאפס את התפריט במהלך הקרב');
        }
        return;
    }
    const defaults = {
        infiniteElixir: false, godMode: false, doubleDamage: false, superSpeed: false,
        speedMultiplier: 0, dmgMultiplier: 0, hpMultiplier: 0,
        attackSpeedMultiplier: 0, radiusMultiplier: 0,
        infiniteRange: false, permanentInvisible: false,
        startingElixir: 0, maxElixir: 0, elixirRateMultiplier: 0,
        freeCards: false, fullRefund: false,
        safeHpMultiplier: 0, safeShoots: false, safeHeals: false,
        safeRegen: 0, doubleSafe: false,
        disableBot: false, botSlowdownFactor: 0, enemyNerfFactor: 0, botOnlyCardId: '',
        timeScale: 0, autoIncome: false, allStarPowers: false,
        deleteUnit: false, canGrantAdmin: false, canRevokeAdmin: false,
        libiCard: false,
        barryCard: false
    };
    Object.assign(adminHacks, defaults);
    saveAdminHacks();
    if (typeof showTransientToast === 'function') showTransientToast('🔄 תפריט המנהל אופס');
    // Re-rendering the panel re-syncs every row's toggle label + number
    // input value against the now-default adminHacks values.
    openAdminMenu();
}
window.resetAdminPanel = resetAdminPanel;

// Shared helper so ANY of the three admin overlays being open keeps the
// `admin-panel-open` body class (and thus the #app left-shift) alive; it
// only clears once all of them are closed.
function _refreshAdminOpenClass() {
    const ids = ['admin-panel-overlay', 'grant-admin-overlay', 'revoke-admin-overlay'];
    const anyOpen = ids.some(id => {
        const el = document.getElementById(id);
        return el && el.style.display !== 'none' && getComputedStyle(el).display !== 'none';
    });
    document.body.classList.toggle('admin-panel-open', anyOpen);
}
window._refreshAdminOpenClass = _refreshAdminOpenClass;

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

// Fields the admin is allowed to flip even while suspended. These don't
// affect the current match — they're meta toggles for grants and the
// next match's cancelAdmin behaviour.
const _ADMIN_META_TOGGLES = new Set(['cancelAdmin', 'canGrantAdmin', 'canRevokeAdmin']);

// True iff the opponent currently has cancelAdmin on against us. The
// admin panel UI refuses to mutate gameplay fields while this is the case.
function _isAdminSuspended() {
    return !!(typeof window !== 'undefined' && window._suspendedAdminBackup);
}

// Defense in depth — every admin action calls this to verify the CURRENT
// player is allowed to perform `kind` right now. The panel-open code in
// openAdminMenu already gates visibility on the same predicates, but a
// stale open overlay (from a previous session, dev tools, etc.) shouldn't
// let a non-admin sneak privileged calls through. `kind` is one of:
//   • 'super'         — full super-admin only (numeric hacks, reset, max-levels)
//   • 'libi'          — Libi toggle
//   • 'barry'         — Barry toggle
//   • 'credits'       — credits currency editor
//   • 'gems'          — gems currency editor
//   • 'grant:<key>'   — gameplay toggle covered by the user's personal grant
// Returns true if allowed, false (with a console warning + toast) if not.
function _adminActionAllowed(kind) {
    const name = (typeof playerStats !== 'undefined' && playerStats && playerStats.username) || '';
    const isSuper = (typeof isSuperAdmin === 'function') && isSuperAdmin(name);
    if (isSuper) return true;
    if (kind === 'libi'    && typeof isLibiAllowed    === 'function' && isLibiAllowed(name))    return true;
    if (kind === 'barry'   && typeof isBarryAllowed   === 'function' && isBarryAllowed(name))   return true;
    if (kind === 'lumi'    && typeof isLumiAllowed    === 'function' && isLumiAllowed(name))    return true;
    if (kind === 'credits' && typeof isCreditsEditor  === 'function' && isCreditsEditor(name))  return true;
    if (kind === 'gems'    && typeof isGemsEditor     === 'function' && isGemsEditor(name))     return true;
    if (kind && kind.indexOf('grant:') === 0) {
        const grants = (typeof _loadAdminGrants === 'function') ? _loadAdminGrants() : {};
        const myGrant = (name && grants[name]) || null;
        const flag = kind.slice(6);
        if (myGrant && !myGrant._revoke && myGrant[flag]) return true;
    }
    console.warn(`🚫 admin action "${kind}" denied for "${name}"`);
    return false;
}

// Drop a body-level class + a banner inside the admin-panel container so
// CSS can gray out every gameplay toggle and the user immediately sees
// why nothing reacts to clicks.
function _refreshAdminSuspendedUI(overlay) {
    const suspended = _isAdminSuspended();
    document.body.classList.toggle('admin-suspended', suspended);

    const target = overlay && overlay.querySelector('.admin-panel-container');
    if (!target) return;

    // Banner: insert/remove a single notice at the top of the container.
    let banner = target.querySelector('.admin-suspended-banner');
    if (suspended) {
        if (!banner) {
            banner = document.createElement('div');
            banner.className = 'admin-suspended-banner';
            banner.innerText = '🛡️ ביטול אדמין פעיל — היריב השבית את הכוחות שלך לכל הקרב. הכוחות יחזרו אוטומטית בסיום.';
            target.insertBefore(banner, target.firstChild);
        }
    } else if (banner) {
        banner.remove();
    }
}
window._refreshAdminSuspendedUI = _refreshAdminSuspendedUI;

function toggleAdminHack(hackKey) {
    // Re-check permission for the CURRENT user — the panel might be a stale
    // overlay opened by a previous account. Access is allowed via ANY of:
    //   1. Super-admin status.
    //   2. A personal grant that contains this hackKey set to true.
    //   3. The capability-specific allow-list (libi / barry).
    let limitedKind = null;
    if (hackKey === 'libiCard')  limitedKind = 'libi';
    else if (hackKey === 'barryCard') limitedKind = 'barry';
    else if (hackKey === 'lumiCard')  limitedKind = 'lumi';
    const okSuper   = _adminActionAllowed('super');
    const okGrant   = _adminActionAllowed('grant:' + hackKey);
    const okLimited = limitedKind ? _adminActionAllowed(limitedKind) : false;
    if (!okSuper && !okGrant && !okLimited) return;

    if (_isAdminSuspended() && !_ADMIN_META_TOGGLES.has(hackKey)) {
        if (typeof showTransientToast === 'function') {
            showTransientToast('🛡️ ביטול אדמין פעיל — לא ניתן לשנות הגדרות אדמין במהלך הקרב');
        }
        return;
    }
    adminHacks[hackKey] = !adminHacks[hackKey];
    if (typeof saveAdminHacks === 'function') saveAdminHacks();

    const map = {
        'infiniteElixir': 'toggle-infinite-elixir',
        'godMode': 'toggle-god-mode',
        'doubleDamage': 'toggle-double-damage',
        'superSpeed': 'toggle-super-speed',
        'infiniteRange': 'toggle-infiniteRange',
        'permanentInvisible': 'toggle-permanentInvisible',
        'freeCards': 'toggle-freeCards',
        'fullRefund': 'toggle-fullRefund',
        'safeShoots': 'toggle-safeShoots',
        'safeHeals': 'toggle-safeHeals',
        'doubleSafe': 'toggle-doubleSafe',
        'disableBot': 'toggle-disableBot',
        'autoIncome': 'toggle-autoIncome',
        'allStarPowers': 'toggle-allStarPowers',
        'deleteUnit': 'toggle-deleteUnit',
        'canGrantAdmin': 'toggle-canGrantAdmin',
        'canRevokeAdmin': 'toggle-canRevokeAdmin',
        'cancelAdmin': 'toggle-cancelAdmin',
        'libiCard': 'toggle-libiCard',
        'barryCard': 'toggle-barryCard'
    };

    updateAdminToggleUI(hackKey, map[hackKey]);
    console.log(`🛠️ Admin: ${hackKey} is now ${adminHacks[hackKey]}`);
}
window.toggleAdminHack = toggleAdminHack;

// The 🗑️ button is a TOGGLE: first click arms the delete-enemy-unit mode
// (stays armed for multiple deletions); clicking it again disarms it.
// Works the same on desktop and mobile — no Shift required.
function activateDeleteUnitMode() {
    if (!_adminActionAllowed('grant:deleteUnit') && !_adminActionAllowed('super')) return;
    if (!adminHacks.deleteUnit) return;
    if (isSelectingDeleteTarget) {
        // Already armed → treat the click as "turn it off".
        isSelectingDeleteTarget = false;
        _resetDeleteUnitButtonStyle();
        if (typeof showTransientToast === 'function') showTransientToast('🗑️ מחיקת דמות: כבוי');
        return;
    }
    isSelectingDeleteTarget = true;
    // Cancel any conflicting selection modes so the cursor's intent is clear.
    if (typeof isSelectingBullDash !== 'undefined') isSelectingBullDash = false;
    selectedCardId = null;
    selectedFreezeCardId = null;
    document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
    const btn = document.getElementById('admin-delete-btn');
    if (btn) {
        btn.style.boxShadow = '0 0 18px 4px #e74c3c, 0 6px #7b1818';
        btn.style.backgroundColor = '#e74c3c';
    }
    if (typeof showTransientToast === 'function') showTransientToast('🗑️ לחץ על דמויות אויב למחיקה. לחץ שוב על 🗑️ לכיבוי.');
}
window.activateDeleteUnitMode = activateDeleteUnitMode;

function _resetDeleteUnitButtonStyle() {
    const btn = document.getElementById('admin-delete-btn');
    if (!btn) return;
    btn.style.boxShadow = '0 6px #7b1818';
    btn.style.backgroundColor = '#c0392b';
}
window._resetDeleteUnitButtonStyle = _resetDeleteUnitButtonStyle;

// Numeric / string admin setter — bound to <input oninput> in the admin panel.
function setAdminNumber(key, raw) {
    // Numeric hacks (multipliers, elixir cap, etc.) are super-admin / grant only.
    if (!_adminActionAllowed('grant:' + key) && !_adminActionAllowed('super')) return;

    if (_isAdminSuspended()) {
        if (typeof showTransientToast === 'function') {
            showTransientToast('🛡️ ביטול אדמין פעיל — לא ניתן לשנות הגדרות אדמין במהלך הקרב');
        }
        return;
    }
    let v = raw;
    if (typeof v === 'string' && key !== 'botOnlyCardId') {
        v = parseFloat(v);
        if (!isFinite(v)) v = 0;
    }
    adminHacks[key] = v;
    if (typeof saveAdminHacks === 'function') saveAdminHacks();
}
window.setAdminNumber = setAdminNumber;

function setAdminCurrency(type) {
    // Permission tiers, evaluated cheapest-first:
    //   • Super-admin → always allowed
    //   • Hardcoded allow-list (credits / gems) → allowed for that currency
    //   • Personal grant carrying the editCoins / editGems / editCredits /
    //     editPp / editTrophies flag → allowed for that currency
    // Inline grant lookup avoids triggering _adminActionAllowed's warning
    // for the (common) case where one path fails but another succeeds.
    const name = (typeof playerStats !== 'undefined' && playerStats && playerStats.username) || '';
    const isSuper = (typeof isSuperAdmin === 'function') && isSuperAdmin(name);
    const allowListed =
        (type === 'credits' && typeof isCreditsEditor === 'function' && isCreditsEditor(name)) ||
        (type === 'gems'    && typeof isGemsEditor    === 'function' && isGemsEditor(name));
    const grantFlagMap = {
        coins: 'editCoins', gems: 'editGems', credits: 'editCredits',
        pp: 'editPp', trophies: 'editTrophies'
    };
    let viaGrant = false;
    try {
        const grants = (typeof _loadAdminGrants === 'function') ? _loadAdminGrants() : {};
        const g = name && grants[name];
        const flag = grantFlagMap[type];
        viaGrant = !!(g && !g._revoke && flag && g[flag]);
    } catch (e) {}
    if (!isSuper && !allowListed && !viaGrant) {
        console.warn(`🚫 admin action "currency:${type}" denied for "${name}"`);
        return;
    }

    if (_isAdminSuspended()) {
        if (typeof showTransientToast === 'function') {
            showTransientToast('🛡️ ביטול אדמין פעיל — לא ניתן לערוך מטבעות במהלך הקרב');
        }
        return;
    }
    const inputMap = { coins: 'admin-gold-input', gems: 'admin-gems-input', credits: 'admin-credits-input', trophies: 'admin-trophies-input', pp: 'admin-pp-input' };
    const input = document.getElementById(inputMap[type]);
    if (!input) return;

    const val = parseInt(input.value);
    if (isNaN(val)) return;

    if (type === 'coins') playerStats.coins = val;
    else if (type === 'gems') playerStats.gems = val;
    else if (type === 'credits') playerStats.credits = val;
    else if (type === 'pp') playerStats.pp = val;
    else if (type === 'trophies') playerTrophies = val;

    saveStats();
    updateStatsUI();
    console.log(`🛠️ Admin: ${type} set to ${val}`);
}
window.setAdminCurrency = setAdminCurrency;

function maxAllLevels() {
    if (!_adminActionAllowed('super')) return;
    Object.keys(CARDS).forEach(id => {
        playerStats.levels[id] = MAX_LEVEL;
        localStorage.setItem(_userKey('level_' + id), MAX_LEVEL);
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
    // Reparent to <body> so the #app transform doesn't drag the overlay
    // along with the rest of the lobby — same trick as the main admin panel.
    if (overlay.parentElement !== document.body) document.body.appendChild(overlay);
    overlay.style.display = 'flex';
    overlay.classList.add('active');
    document.getElementById('grant-admin-result').innerText = '';
    document.getElementById('grant-admin-target').value = '';
    document.getElementById('grant-admin-desc').value = '';
    _refreshAdminOpenClass();
}
window.openGrantAdminModal = openGrantAdminModal;

function closeGrantAdminModal() {
    const overlay = document.getElementById('grant-admin-overlay');
    if (!overlay) return;
    overlay.style.display = 'none';
    overlay.classList.remove('active');
    _refreshAdminOpenClass();
}
window.closeGrantAdminModal = closeGrantAdminModal;

// --- Chat log helpers ------------------------------------------------------
function _appendChatMsg(role, text) {
    const chat = document.getElementById('grant-admin-chat');
    if (!chat) return;
    const b = document.createElement('div');
    const isUser = role === 'user';
    b.style.cssText = [
        'max-width: 85%',
        isUser ? 'align-self: flex-start' : 'align-self: flex-end',
        isUser ? 'background: #2980b9' : 'background: #2d3436',
        'color: #fff',
        'padding: 7px 11px',
        'border-radius: 12px',
        isUser ? 'border-bottom-left-radius: 4px' : 'border-bottom-right-radius: 4px',
        'line-height: 1.5',
        'white-space: pre-wrap'
    ].join('; ');
    b.innerText = text;
    chat.appendChild(b);
    chat.scrollTop = chat.scrollHeight;
}

// --- AI settings modal -----------------------------------------------------
function openAiSettings() {
    const overlay = document.getElementById('ai-settings-overlay');
    const input = document.getElementById('gemini-key-input');
    const status = document.getElementById('ai-settings-status');
    if (!overlay) return;
    if (input) input.value = localStorage.getItem('brawlclash_gemini_key') || '';
    if (status) status.innerText = input && input.value ? '✓ מפתח שמור. לחץ שמור כדי להחליף או מחק.' : 'אין מפתח. בלעדיו משתמשים בפארסר מקומי.';
    overlay.style.display = 'flex';
    overlay.classList.add('active');
}
window.openAiSettings = openAiSettings;

function closeAiSettings() {
    const overlay = document.getElementById('ai-settings-overlay');
    if (!overlay) return;
    overlay.style.display = 'none';
    overlay.classList.remove('active');
}
window.closeAiSettings = closeAiSettings;

function saveAiSettings() {
    const input = document.getElementById('gemini-key-input');
    const status = document.getElementById('ai-settings-status');
    const key = (input && input.value || '').trim();
    if (key) {
        try { localStorage.setItem('brawlclash_gemini_key', key); } catch (e) {}
        if (status) { status.style.color = '#2ecc71'; status.innerText = '✓ מפתח נשמר.'; }
    } else {
        if (status) { status.style.color = '#e74c3c'; status.innerText = 'הזן מפתח קודם.'; }
    }
}
window.saveAiSettings = saveAiSettings;

function clearAiSettings() {
    try { localStorage.removeItem('brawlclash_gemini_key'); } catch (e) {}
    const input = document.getElementById('gemini-key-input');
    const status = document.getElementById('ai-settings-status');
    if (input) input.value = '';
    if (status) { status.style.color = '#2ecc71'; status.innerText = '✓ המפתח נמחק. חזרה לפארסר מקומי.'; }
}
window.clearAiSettings = clearAiSettings;

// --- Real-AI (Gemini) call -------------------------------------------------
// Sends the super-admin's message to Google Gemini with instructions to
// respond in JSON. Returns { reply, flags } or throws on network/quota errors.
async function callGeminiGrantAI(userMessage, targetName) {
    const key = localStorage.getItem('brawlclash_gemini_key');
    if (!key) throw new Error('no-key');
    const systemPreamble = [
        "You are the admin-grant AI for a browser game called BrawlClash. The user talking to you is the super-admin. They want to grant (or revoke) admin-panel powers on another player's account. Always reply in Hebrew, casually.",
        "Return JSON ONLY (no markdown, no code fences) with this shape:",
        "{",
        '  "reply": "<short friendly Hebrew response, 1-3 sentences>",',
        '  "flags": { ...optional built-in flags, use EXACTLY these key names... },',
        '  "customJS": "<optional JavaScript snippet, runs on the target\'s device>"',
        "}",
        "",
        "BUILT-IN FLAGS — use EXACTLY these key names (camelCase), nothing else.",
        "Every flag you want to set goes inside `flags`. Omit it if you don't need it.",
        "",
        "  Persistent hacks (booleans):",
        "    godMode, doubleDamage, superSpeed, infiniteElixir,",
        "    infiniteRange         — units hit from anywhere",
        "    permanentInvisible    — units invisible for the whole battle",
        "    freeCards             — every card costs 0 elixir",
        "    fullRefund            — full elixir refund after placement",
        "    safeShoots            — safe shoots enemies on the whole map",
        "    safeHeals             — safe heals allies in range",
        "    doubleSafe            — adds a 2nd player safe",
        "    disableBot            — bot plays nothing",
        "    autoIncome            — +100🪙 +5💎 every 10s",
        "    allStarPowers         — both SP1 & SP2 active on every brawler",
        "    deleteUnit            — shows the 🗑️ button in battle",
        "    canGrantAdmin         — target gets the ✨ button (can grant admin to others)",
        "    canRevokeAdmin        — target gets the 🚫 button (can revoke admin)",
        "    libiCard              — adds the secret 💖 Libi card to the deck (0-elixir invulnerable unit, one-shots everything). Hebrew: ליבי.",
        "    barryCard             — adds the secret 🍦 Barry card (15-elixir, 4000HP, generates ice-cream auras). Hebrew: בארי.",
        "",
        "  Parametric multipliers (numbers; 0 = no override, 1 = default, >1 = buff):",
        "    speedMultiplier, dmgMultiplier, hpMultiplier, safeHpMultiplier,",
        "    attackSpeedMultiplier, radiusMultiplier, elixirRateMultiplier,",
        "    timeScale (0.5 slow-mo, 3 fast-forward), botSlowdownFactor, enemyNerfFactor,",
        "    safeRegen (HP/sec)",
        "",
        "  Elixir overrides (numbers; 0 = use default 5/10):",
        "    startingElixir, maxElixir",
        "",
        "  String: botOnlyCardId (one of: bruce, bull, leon, pam, max, 8bit, emz, spike, tara, scrappy, penny, mr-p)",
        "",
        "  One-shot rewards (numbers, added once when the grant is received):",
        "    coins, gems, trophies",
        "  One-shot bool: maxLevels (max every card).",
        "",
        "  Revocation: set `_revoke: true` (alone) to wipe every admin perk the",
        "  target has. Use it when the user says הסר / בטל / revoke / remove admin.",
        "",
        "CUSTOM JS (use only if no built-in flag fits):",
        "  `customJS` is a JS statement or expression that runs ONCE on the target's device when this grant is applied. Available variables at runtime:",
        "    adminHacks, playerStats (.coins, .gems, .levels, .username), units, buildings, auras, playerSafe, enemySafe, CONFIG, CARDS, showTransientToast, saveStats, saveAdminHacks.",
        "  Mutate them directly — the game reads them live. Example: 'setInterval(()=>units.filter(u=>u.team===\"player\"&&!u.isDead).forEach(u=>{u.hp=Math.min(u.maxHp,u.hp+10)}),1000);'",
        "  Keep customJS short, side-effects only, no return value, no imports, no await.",
        "",
        "If the user's message maps to ANY of the built-in flags above, you MUST put them in the `flags` object. Don't just talk about doing it — emit the flag. Example: user says 'תן לה הענקת אדמין ומחיקת אדמין' → reply plus `flags: {canGrantAdmin: true, canRevokeAdmin: true}`.",
        "Omit `flags` and `customJS` entirely only if the user is just chatting or asking a question with no action intent.",
        `Target username (context): "${targetName || '(not specified)'}".`
    ].join('\n');
    const body = {
        contents: [
            { role: 'user', parts: [{ text: systemPreamble + '\n\n---\n\nUser: ' + userMessage }] }
        ],
        generationConfig: { temperature: 0.3, response_mime_type: 'application/json' }
    };
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + encodeURIComponent(key), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const errTxt = await res.text().catch(() => '');
        throw new Error('api:' + res.status + ' ' + errTxt.slice(0, 180));
    }
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let parsed;
    try { parsed = JSON.parse(text); }
    catch (e) {
        // Fallback — try to extract {...} substring if the model wrapped in prose.
        const m = text.match(/\{[\s\S]*\}/);
        if (m) { try { parsed = JSON.parse(m[0]); } catch (e2) {} }
    }
    if (!parsed) return { reply: text || '(תגובה ריקה מה-AI)', flags: null };
    return {
        reply: parsed.reply || '(ללא טקסט)',
        flags: parsed.flags ? _normalizeGeminiFlags(parsed.flags) : null,
        customJS: typeof parsed.customJS === 'string' ? parsed.customJS : null
    };
}
window.callGeminiGrantAI = callGeminiGrantAI;

// Safety net: map common AI-produced key aliases back onto our canonical
// field names so a slightly-off response from Gemini still takes effect.
function _normalizeGeminiFlags(raw) {
    if (!raw || typeof raw !== 'object') return raw;
    const aliases = {
        // canGrantAdmin / canRevokeAdmin
        canGrant:        'canGrantAdmin',    grant_admin:   'canGrantAdmin',
        grantAdmin:      'canGrantAdmin',    adminGrant:    'canGrantAdmin',
        canRevoke:       'canRevokeAdmin',   revoke_admin:  'canRevokeAdmin',
        revokeAdmin:     'canRevokeAdmin',   adminRevoke:   'canRevokeAdmin',
        // common short names
        deleteUnits:     'deleteUnit',       delete_unit:   'deleteUnit',
        invisible:       'permanentInvisible',  stealth:    'permanentInvisible',
        free_cards:      'freeCards',        zeroCost:      'freeCards',
        full_refund:     'fullRefund',       refund:        'fullRefund',
        safe_shoots:     'safeShoots',       safe_heals:    'safeHeals',
        safe_regen:      'safeRegen',
        double_safe:     'doubleSafe',
        disable_bot:     'disableBot',       bot_off:       'disableBot',
        auto_income:     'autoIncome',
        all_star_powers: 'allStarPowers',    allSP:         'allStarPowers',
        infinite_range:  'infiniteRange',
        attack_speed:    'attackSpeedMultiplier',
        size:            'radiusMultiplier', radius:        'radiusMultiplier',
        elixir_rate:     'elixirRateMultiplier',
        time_scale:      'timeScale',
        bot_slowdown:    'botSlowdownFactor',
        enemy_nerf:      'enemyNerfFactor',
        start_elixir:    'startingElixir',   initialElixir: 'startingElixir',
                                             initial_elixir:'startingElixir',
        max_elixir:      'maxElixir',
        max_levels:      'maxLevels',        maxLevel:      'maxLevels',
        bot_only_card:   'botOnlyCardId',    botCard:       'botOnlyCardId',
        revoke:          '_revoke',
        // Secret admin-only cards — accept every reasonable spelling the
        // AI might come up with (English / Hebrew / camelCase / snake_case).
        libi:            'libiCard',         libi_card:     'libiCard',
        libiUnit:        'libiCard',         'ליבי':        'libiCard',
        barry:           'barryCard',        barry_card:    'barryCard',
        barryUnit:       'barryCard',        'בארי':        'barryCard'
    };
    const out = {};
    Object.keys(raw).forEach(k => {
        const canonical = aliases[k] || k;
        out[canonical] = raw[k];
    });
    return out;
}
window._normalizeGeminiFlags = _normalizeGeminiFlags;

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
        coins: 0, gems: 0, trophies: 0, credits: 0, pp: 0, maxLevels: false,
        // Per-currency editor permissions — when true, the corresponding
        // editor ROW in the admin panel becomes visible + interactive for
        // this user. Lets a granted (non-super-admin) account edit one or
        // more currencies without unlocking the full panel.
        editCoins: false, editGems: false, editCredits: false,
        editPp: false, editTrophies: false,
        // Numeric / parametric (0 = default)
        speedMultiplier: 0, dmgMultiplier: 0, hpMultiplier: 0, safeHpMultiplier: 0,
        startingElixir: 0, maxElixir: 0,
        attackSpeedMultiplier: 0, radiusMultiplier: 0,
        elixirRateMultiplier: 0, timeScale: 0,
        botSlowdownFactor: 0, enemyNerfFactor: 0, safeRegen: 0, botOnlyCardId: '',
        // Behavioural toggles
        infiniteRange: false, permanentInvisible: false,
        freeCards: false, fullRefund: false,
        safeShoots: false, safeHeals: false, doubleSafe: false,
        disableBot: false, autoIncome: false, allStarPowers: false,
        // Admin-only secret cards
        libiCard: false, barryCard: false, lumiCard: false
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
        // Hand out EVERY persistent hack available in the admin panel, plus
        // generous defaults for the parametric multipliers, plus the one-shot
        // currency rewards. The super-admin can still fine-tune afterwards by
        // sending a follow-up grant with specific numbers.
        // --- Boolean toggles -------------------------------------------
        grant.infiniteElixir    = true;
        grant.godMode           = true;
        grant.doubleDamage      = true;
        grant.superSpeed        = true;
        grant.infiniteRange     = true;
        grant.permanentInvisible= true;
        grant.freeCards         = true;
        grant.fullRefund        = true;
        grant.safeShoots        = true;
        grant.safeHeals         = true;
        grant.doubleSafe        = true;
        grant.disableBot        = true;
        grant.autoIncome        = true;
        grant.allStarPowers     = true;
        grant.deleteUnit        = true;
        grant.canGrantAdmin     = true;
        grant.canRevokeAdmin    = true;
        // --- Parametric multipliers ------------------------------------
        grant.speedMultiplier       = 5;
        grant.dmgMultiplier         = 10;
        grant.hpMultiplier          = 10;
        grant.safeHpMultiplier      = 10;
        grant.attackSpeedMultiplier = 5;
        grant.radiusMultiplier      = 2;
        grant.elixirRateMultiplier  = 10;
        grant.startingElixir        = 20;
        grant.maxElixir             = 20;
        grant.botSlowdownFactor     = 5;
        grant.enemyNerfFactor       = 5;
        grant.safeRegen             = 100;
        // timeScale left at 0 (normal) — overriding time would be disorienting.
        // --- One-shot rewards ------------------------------------------
        grant.maxLevels = true;
        grant.coins     = 9999999;
        grant.gems      = 99999;
        grant.trophies  = 99999;
        grant.credits   = 99999;
        grant.pp        = 99999;
        // "הכל" also unlocks every currency editor row so the recipient can
        // self-edit any of the five currencies from inside the admin panel.
        grant.editCoins    = true;
        grant.editGems     = true;
        grant.editCredits  = true;
        grant.editPp       = true;
        grant.editTrophies = true;
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
    // Attack-speed FIRST so "מהירות-תקיפה/התקפה X3" isn't swallowed by the
    // plainer `speed` regex below.
    const atkSpeedMulEarly = t.match(/(?:מהירות[- ]?(?:התקפה|תקיפה)|attack speed|atk speed|תקיפה מהירה)[^\d]*(?:x|×|כפול|\*|פי)?\s*(\d+(?:\.\d+)?)/i);
    if (atkSpeedMulEarly) grant.attackSpeedMultiplier = parseFloat(atkSpeedMulEarly[1]);
    // Plain speed — only if the AttackSpeed rule above didn't already fire.
    let speedMul = null;
    if (!atkSpeedMulEarly) speedMul = t.match(/(?:מהירות|speed)[^\d]*(?:x|×|כפול|\*|פי)\s*(\d+(?:\.\d+)?)/i);
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

    // "גודל X2" / "רדיוס X2" / "size x2" / "radius x2"
    const radiusMul = t.match(/(?:גודל|רדיוס|size|radius)[^\d]*(?:x|×|כפול|\*|פי)\s*(\d+(?:\.\d+)?)/i);
    if (radiusMul) grant.radiusMultiplier = parseFloat(radiusMul[1]);

    // "מילוי אליקסיר X3" / "elixir rate x3" / "הזנת אליקסיר פי 3"
    const elRate = t.match(/(?:מילוי אליקסיר|הזנת אליקסיר|elixir rate|elixir regen)[^\d]*(?:x|×|כפול|\*|פי)\s*(\d+(?:\.\d+)?)/i);
    if (elRate) grant.elixirRateMultiplier = parseFloat(elRate[1]);

    // "slow motion" / "slow-mo" / "סלואו מושן" / "הקפאה" → timeScale
    if (has('slow motion', 'slow-mo', 'slowmo', 'סלואו מושן', 'איטי פי')) grant.timeScale = 0.5;
    if (has('fast forward', 'fastforward', 'מהיר פי', 'פי 3 מהיר', 'פי 2 מהיר')) grant.timeScale = 3;
    if (has('הקפאת זמן', 'freeze time', 'pause game')) grant.timeScale = 0.0001;
    const timeMul = t.match(/(?:זמן|time)[^\d]*(?:x|×|כפול|\*|פי)\s*(\d+(?:\.\d+)?)/i);
    if (timeMul) grant.timeScale = parseFloat(timeMul[1]);

    // "בוט איטי פי N" / "bot slowdown X2"
    const botSlow = t.match(/(?:בוט איטי|bot slow|slow bot)[^\d]*(?:x|×|כפול|\*|פי)?\s*(\d+(?:\.\d+)?)/i);
    if (botSlow) grant.botSlowdownFactor = parseFloat(botSlow[1]);

    // "יחידות אויב חלשות פי N" / "enemy nerf x N"
    const enemyNerf = t.match(/(?:אויב חלש|enemy nerf|אויב נחלש|אויב חלשים)[^\d]*(?:x|×|כפול|\*|פי)?\s*(\d+(?:\.\d+)?)/i);
    if (enemyNerf) grant.enemyNerfFactor = parseFloat(enemyNerf[1]);

    // "כספת רגן X" / "safe regen X"
    const safeReg = t.match(/(?:כספת רגן|regen safe|safe regen|כספת מתחדשת)[^\d]*(\d+)/i);
    if (safeReg) grant.safeRegen = parseInt(safeReg[1], 10);

    // "בוט רק X" / "bot only bruce" — restricts AI to one card
    const botOnly = t.match(/(?:בוט רק|bot only|רק בוט של)\s+([a-zA-Z\-]+)/i);
    if (botOnly) grant.botOnlyCardId = botOnly[1].toLowerCase();

    // Behavioural toggles
    if (has('טווח אינסופי', 'טווח ללא גבול', 'infinite range', 'unlimited range')) grant.infiniteRange = true;
    if (has('בלתי נראה', 'שקוף', 'invisible', 'stealth', 'permanent invis')) grant.permanentInvisible = true;
    if (has('קלפים חינם', 'עלות 0', 'free cards', 'zero cost')) grant.freeCards = true;
    if (has('refund', 'החזר מלא', 'החזר אליקסיר', 'full refund')) grant.fullRefund = true;
    if (has('כספת יורה', 'safe shoots', 'castle shoots')) grant.safeShoots = true;
    if (has('כספת מרפאה', 'safe heals', 'healing safe')) grant.safeHeals = true;
    if (has('שתי כספות', 'כפול כספות', 'double safe', 'two safes')) grant.doubleSafe = true;
    if (has('השבת בוט', 'בוט כבוי', 'disable bot', 'bot off', 'no bot')) grant.disableBot = true;
    if (has('הכנסה אוטומטית', 'auto income', 'מטבעות אוטומטיים')) grant.autoIncome = true;
    if (has('כל הכוחות', 'all star powers', 'כל הסטאר פאוורס', 'כל סטאר-פאוור')) grant.allStarPowers = true;

    // Delegated management: let this user hand out / revoke admin themselves.
    // "מנהל משנה" / "sub admin" implies both.
    const wantGrant  = has('הענקת אדמין', 'יכול להעניק', 'grant admin', 'can grant');
    const wantRevoke = has('מחיקת אדמין', 'יכול למחוק', 'revoke admin', 'can revoke');
    const wantBoth   = has('מנהל משנה', 'מנהל-משנה', 'sub admin', 'sub-admin', 'admin manager');
    if (wantGrant  || wantBoth) grant.canGrantAdmin = true;
    if (wantRevoke || wantBoth) grant.canRevokeAdmin = true;

    // Secret admin-only cards — match the brawler name in Hebrew or English.
    // "תן לו ליבי" / "give him libi" / "ליבי" / "libi" all enable libiCard.
    if (has('ליבי', 'libi'))   grant.libiCard  = true;
    if (has('בארי', 'barry'))  grant.barryCard = true;
    if (has('לומי', 'lumi'))   grant.lumiCard  = true;

    // Complex behaviours — expressed as a pre-built customJS snippet lookup so
    // they work without the Gemini API. The flags themselves stay false; the
    // returned grant carries a `customJS` field that applyGrantFlags will run.
    const customJSLibrary = [];
    if (has('thorns', 'קוצים', 'מחזיר נזק', 'נזק חוזר')) {
        customJSLibrary.push(
            "// Thorns — reflect 30% damage back to enemies touching player units every tick.\n" +
            "setInterval(() => {\n" +
            "  const mine = units.filter(u => u.team === 'player' && !u.isDead);\n" +
            "  const foes = units.filter(u => u.team === 'enemy' && !u.isDead);\n" +
            "  mine.forEach(m => foes.forEach(f => {\n" +
            "    if (Math.hypot(m.x - f.x, m.y - f.y) < (m.radius + f.radius + 4)) {\n" +
            "      f.takeDamage && f.takeDamage(20);\n" +
            "    }\n" +
            "  }));\n" +
            "}, 400);"
        );
    }
    if (has('split', 'מתרבות', 'שכפול', 'מכה משכפלת')) {
        customJSLibrary.push(
            "// Split-on-hit — once every second pick one player unit and clone it next to itself.\n" +
            "setInterval(() => {\n" +
            "  const candidates = units.filter(u => u.team === 'player' && !u.isDead);\n" +
            "  if (!candidates.length || !window.spawnEntity) return;\n" +
            "  const u = candidates[Math.floor(Math.random() * candidates.length)];\n" +
            "  spawnEntity(u.x + 25, u.y + 25, 'player', u.type, false, true);\n" +
            "}, 1500);"
        );
    }
    if (has('רגנרציה', 'מתרפאים', 'regen', 'regeneration')) {
        customJSLibrary.push(
            "// Regen — player units heal 15 HP/second.\n" +
            "setInterval(() => {\n" +
            "  units.concat(buildings, auras).filter(e => e.team === 'player' && !e.isDead).forEach(e => {\n" +
            "    if (e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + 15);\n" +
            "  });\n" +
            "}, 1000);"
        );
    }
    if (has('התפוצצות במוות', 'explode on death', 'מתפוצץ במוות', 'פיצוץ במוות')) {
        customJSLibrary.push(
            "// Explode-on-death — scan every 250 ms for newly-dead player units and hit everyone in range.\n" +
            "(function(){\n" +
            "  const seen = new WeakSet();\n" +
            "  setInterval(() => {\n" +
            "    units.filter(u => u.team === 'player' && u.isDead && !seen.has(u)).forEach(u => {\n" +
            "      seen.add(u);\n" +
            "      units.filter(f => f.team === 'enemy' && !f.isDead && Math.hypot(f.x - u.x, f.y - u.y) <= 120).forEach(f => {\n" +
            "        f.takeDamage && f.takeDamage(250);\n" +
            "      });\n" +
            "    });\n" +
            "  }, 250);\n" +
            "})();"
        );
    }

    if (customJSLibrary.length) {
        grant.customJS = (grant.customJS ? grant.customJS + '\n\n' : '') + customJSLibrary.join('\n\n');
    }

    // --- Currency grants ----------------------------------------------
    const coinsMatch = t.match(/(\d[\d,\.]*)\s*(?:מטבעות|זהב|coins?|gold)/i);
    if (coinsMatch) grant.coins = parseInt(coinsMatch[1].replace(/[,\.]/g, ''), 10) || 0;
    const gemsMatch = t.match(/(\d[\d,\.]*)\s*(?:יהלומים|יהלום|gems?|diamonds?)/i);
    if (gemsMatch) grant.gems = parseInt(gemsMatch[1].replace(/[,\.]/g, ''), 10) || 0;
    const trophiesMatch = t.match(/(\d[\d,\.]*)\s*(?:גביעים|גביע|trophies|trophy)/i);
    if (trophiesMatch) grant.trophies = parseInt(trophiesMatch[1].replace(/[,\.]/g, ''), 10) || 0;
    // Credits — the 🎟️ currency added with the rarity / unlock system.
    // Hebrew "קרדיטים" / "קרדיט" / English "credits" / "credit".
    const creditsMatch = t.match(/(\d[\d,\.]*)\s*(?:קרדיטים|קרדיט|credits?)/i);
    if (creditsMatch) grant.credits = parseInt(creditsMatch[1].replace(/[,\.]/g, ''), 10) || 0;
    // Power-points (💪 חוזקה). Multiple natural phrasings — the user might
    // type "כוח", "חוזקה", "נקודות כוח", "pp", "power points" all of which
    // should resolve to the same playerStats.pp grant.
    const ppMatch = t.match(/(\d[\d,\.]*)\s*(?:נקודות[- ]?כוח|חוזקה|כוח|power[- ]?points?|\bpp\b)/i);
    if (ppMatch) grant.pp = parseInt(ppMatch[1].replace(/[,\.]/g, ''), 10) || 0;

    // --- Per-currency EDITOR permissions ------------------------------
    // Phrases like "תן לו לערוך X" / "עריכת X" / "edit X" / "X editor"
    // unlock the corresponding editor row in the admin panel for the
    // recipient. Each currency is independent — granting "edit gems"
    // doesn't unlock the coins editor too. A shortcut phrase ("עריכת
    // הכל" / "edit all currencies") flips all five at once.
    const editAll = has('עריכת הכל', 'לערוך הכל', 'edit all currencies', 'edit all currency', 'all editors');
    const _edit = (phrases) => phrases.some(p => t.includes(p));
    if (editAll || _edit(['לערוך מטבעות', 'עריכת מטבעות', 'edit coins', 'coins editor', 'coin editor'])) grant.editCoins = true;
    if (editAll || _edit(['לערוך יהלומים', 'עריכת יהלומים', 'edit gems', 'gems editor', 'gem editor'])) grant.editGems = true;
    if (editAll || _edit(['לערוך קרדיטים', 'עריכת קרדיטים', 'edit credits', 'credits editor', 'credit editor'])) grant.editCredits = true;
    if (editAll || _edit(['לערוך כוח', 'עריכת כוח', 'לערוך חוזקה', 'עריכת חוזקה', 'edit pp', 'pp editor', 'edit power'])) grant.editPp = true;
    if (editAll || _edit(['לערוך גביעים', 'עריכת גביעים', 'edit trophies', 'trophies editor', 'trophy editor'])) grant.editTrophies = true;

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

// Short Hebrew summary of whatever the flags object contains — used by the
// parser-fallback path to build a "reply" bubble when no real AI is wired up.
function _describeFlags(f) {
    if (!f) return '';
    const bits = [];
    if (f._revoke) bits.push('הסרת הרשאות');
    if (f.godMode) bits.push('גוד-מוד');
    if (f.doubleDamage) bits.push('נזק כפול');
    if (f.superSpeed) bits.push('מהירות-על');
    if (f.infiniteElixir) bits.push('אליקסיר אינסופי');
    if (f.speedMultiplier) bits.push(`מהירות ×${f.speedMultiplier}`);
    if (f.dmgMultiplier) bits.push(`נזק ×${f.dmgMultiplier}`);
    if (f.hpMultiplier) bits.push(`חיים ×${f.hpMultiplier}`);
    if (f.safeHpMultiplier) bits.push(`כספת ×${f.safeHpMultiplier}`);
    if (f.startingElixir) bits.push(`התחלה ${f.startingElixir} אליקסיר`);
    if (f.maxElixir) bits.push(`מקס אליקסיר ${f.maxElixir}`);
    if (f.coins) bits.push(`${f.coins} 🪙`);
    if (f.gems) bits.push(`${f.gems} 💎`);
    if (f.trophies) bits.push(`${f.trophies} 🏆`);
    if (f.credits) bits.push(`${f.credits} 🎟️`);
    if (f.pp) bits.push(`${f.pp} 💪`);
    if (f.maxLevels) bits.push('רמות מקס');
    if (f.canGrantAdmin) bits.push('✨ יכול להעניק אדמין');
    if (f.canRevokeAdmin) bits.push('🚫 יכול למחוק אדמין');
    // Editor permissions — group into one chip so the preview stays compact.
    const editorBits = [];
    if (f.editCoins)    editorBits.push('🪙');
    if (f.editGems)     editorBits.push('💎');
    if (f.editCredits)  editorBits.push('🎟️');
    if (f.editPp)       editorBits.push('💪');
    if (f.editTrophies) editorBits.push('🏆');
    if (editorBits.length) bits.push('עריכת: ' + editorBits.join(''));
    return bits.join(', ');
}

async function submitGrantAdmin() {
    // Super-admin OR a user whose stored personal grant explicitly
    // includes canGrantAdmin. We DO NOT consult adminHacks.canGrantAdmin
    // — that's a shared-localStorage flag that leaks the capability to
    // every account that ever logged in on this browser.
    const isSuper = (typeof isSuperAdmin === 'function')
        ? isSuperAdmin(playerStats.username || '')
        : (playerStats.username === ADMIN_USERNAME);
    const grants  = (typeof _loadAdminGrants === 'function') ? _loadAdminGrants() : {};
    const myGrant = (playerStats.username && grants[playerStats.username]) || null;
    const hasDelegate = !!(myGrant && myGrant.canGrantAdmin);
    if (!isSuper && !hasDelegate) {
        console.warn('🚫 grant-admin: caller lacks permission');
        return;
    }

    const target = (document.getElementById('grant-admin-target').value || '').trim();
    const descEl = document.getElementById('grant-admin-desc');
    const desc = (descEl.value || '').trim();
    const pwEl  = document.getElementById('grant-admin-password');
    const pw    = pwEl ? pwEl.value : '';
    const result = document.getElementById('grant-admin-result');
    result.innerText = '';

    if (!target) { result.style.color = '#e74c3c'; result.innerText = 'חסר שם משתמש'; return; }
    if (!desc)   { result.style.color = '#e74c3c'; result.innerText = 'חסר תיאור של מה לתת לו'; return; }

    // Password confirmation — must match the granter's saved password.
    // Stops the open admin panel from being misused if a stranger picked
    // up the device mid-session.
    if (!_verifyMyPassword(pw)) {
        result.style.color = '#e74c3c';
        result.innerText = '🔒 סיסמא לא נכונה — לא ניתן להעניק אדמין';
        return;
    }
    // Clear the password field so it doesn't sit around in the DOM.
    if (pwEl) pwEl.value = '';

    // Push the user's message into the chat log immediately for responsiveness.
    _appendChatMsg('user', desc);
    descEl.value = '';

    // Prefer real Gemini replies if a key is configured; otherwise fall back
    // to the deterministic local pattern-matcher.
    let reply = '';
    let parsed = null;
    let customJS = null;
    const hasKey = !!localStorage.getItem('brawlclash_gemini_key');
    if (hasKey) {
        _appendChatMsg('ai', '⌛ חושב…');
        try {
            const r = await callGeminiGrantAI(desc, target);
            const chat = document.getElementById('grant-admin-chat');
            if (chat && chat.lastChild) chat.lastChild.innerText = r.reply || '(ללא תגובה)';
            reply = r.reply || '';
            parsed = r.flags || null;
            customJS = r.customJS || null;
        } catch (e) {
            const chat = document.getElementById('grant-admin-chat');
            if (chat && chat.lastChild) {
                chat.lastChild.style.background = '#c0392b';
                chat.lastChild.innerText = '⚠️ שגיאת AI: ' + (e && e.message || 'unknown') + '\nחוזר לפארסר מקומי.';
            }
            parsed = parseAdminRequest(desc);
            reply = 'הפעלתי פארסר מקומי.';
        }
    } else {
        parsed = parseAdminRequest(desc);
        const preview = _describeFlags(parsed);
        reply = preview ? `בסדר, אני נותן ל-${target}: ${preview}` : 'לא הצלחתי לזהות יכולת מההודעה. להרחבה מלאה (כולל יכולות שאין בפארסר המקומי) לחץ ⚙️ והזן מפתח Gemini.';
        _appendChatMsg('ai', reply + (preview ? '\n(להפעלת AI אמיתי, לחץ ⚙️ והזן מפתח Gemini.)' : ''));
    }

    if (!parsed) parsed = {};
    const anyHack = parsed.infiniteElixir || parsed.godMode || parsed.doubleDamage || parsed.superSpeed;
    const anyMult = parsed.speedMultiplier || parsed.dmgMultiplier || parsed.hpMultiplier || parsed.safeHpMultiplier;
    const anyElixirOverride = parsed.startingElixir || parsed.maxElixir;
    // One-shot now also recognises credits / pp so a grant of ONLY 100
    // credits or 50 pp passes the gate.
    const anyOneShot = parsed.coins > 0 || parsed.gems > 0 || parsed.trophies > 0 ||
                       parsed.credits > 0 || parsed.pp > 0 || parsed.maxLevels;
    const hasCustomJS = customJS && customJS.trim().length > 0;
    // Also count every other behavioural toggle that can be part of a grant —
    // missing these here caused grants that ONLY added a flag like
    // `canGrantAdmin` to be silently treated as "no change" and never saved.
    // The editor permissions (editCoins / editGems / editCredits / editPp /
    // editTrophies) belong here too — without this any grant whose ONLY
    // payload is "let user edit currency X" was being dropped silently.
    const anyExtraFlag =
        parsed.canGrantAdmin || parsed.canRevokeAdmin || parsed.deleteUnit ||
        parsed.infiniteRange || parsed.permanentInvisible || parsed.freeCards || parsed.fullRefund ||
        parsed.safeShoots || parsed.safeHeals || parsed.doubleSafe ||
        parsed.disableBot || parsed.autoIncome || parsed.allStarPowers ||
        parsed.attackSpeedMultiplier || parsed.radiusMultiplier || parsed.elixirRateMultiplier ||
        parsed.timeScale || parsed.botSlowdownFactor || parsed.enemyNerfFactor || parsed.safeRegen ||
        parsed.botOnlyCardId ||
        parsed.libiCard || parsed.barryCard || parsed.lumiCard ||
        parsed.editCoins || parsed.editGems || parsed.editCredits ||
        parsed.editPp || parsed.editTrophies;
    if (!parsed._revoke && !anyHack && !anyMult && !anyElixirOverride && !anyOneShot && !hasCustomJS && !anyExtraFlag) {
        // Nothing actionable parsed — treat as pure chat.
        return;
    }

    // Fresh grantId so the target applies one-shot rewards idempotently and
    // any customJS payload runs exactly once per re-grant.
    const flags = { ...parsed, grantId: 'g-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) };
    if (hasCustomJS) flags.customJS = customJS;

    // Strip capabilities the granter explicitly excluded.
    const excludeText = (document.getElementById('grant-admin-exclude') || {}).value || '';
    if (excludeText.trim()) {
        const excluded = parseAdminRequest(excludeText);
        Object.keys(excluded).forEach(k => {
            if (k === '_revoke' || k === 'grantId') return;
            const v = excluded[k];
            const isMentioned = (typeof v === 'boolean' && v) ||
                                (typeof v === 'number'  && v !== 0) ||
                                (typeof v === 'string'  && v !== '');
            if (!isMentioned) return;
            if      (typeof flags[k] === 'boolean') flags[k] = false;
            else if (typeof flags[k] === 'number')  flags[k] = 0;
            else if (typeof flags[k] === 'string')  flags[k] = '';
        });
    }

    // Persist the grant on the super-admin's device. Other devices fetch it
    // via `queryAdminForGrant` → QUERY_GRANT over PeerJS lock-peer. Re-fetch
    // a fresh copy under a NEW name so we don't clash with the
    // `const grants` declared earlier in this function for the
    // permission check.
    const grantsForWrite = _loadAdminGrants();
    grantsForWrite[target] = flags;
    _saveAdminGrants(grantsForWrite);

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
    if (flags.customJS) parts.push('כוח מיוחד (קוד דינמי)');
    result.style.color = '#2ecc71';
    result.innerText = parts.length
        ? `✓ ${target} יקבל: ${parts.join(', ')} (יחול כשיהיה מחובר)`
        : `✓ ${target} נשמר`;
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
    if (overlay.parentElement !== document.body) document.body.appendChild(overlay);
    overlay.style.display = 'flex';
    overlay.classList.add('active');
    document.getElementById('revoke-admin-target').value = '';
    document.getElementById('revoke-admin-result').innerText = '';
    _refreshAdminOpenClass();
}
window.openRevokeAdminModal = openRevokeAdminModal;

function closeRevokeAdminModal() {
    const overlay = document.getElementById('revoke-admin-overlay');
    if (!overlay) return;
    overlay.style.display = 'none';
    overlay.classList.remove('active');
    _refreshAdminOpenClass();
}
window.closeRevokeAdminModal = closeRevokeAdminModal;

function submitRevokeAdmin() {
    // Super-admin OR a user whose stored personal grant explicitly
    // includes canRevokeAdmin. We DO NOT consult adminHacks.canRevokeAdmin
    // for the same reason as submitGrantAdmin.
    const isSuper = (typeof isSuperAdmin === 'function')
        ? isSuperAdmin(playerStats.username || '')
        : (playerStats.username === ADMIN_USERNAME);
    const grants  = (typeof _loadAdminGrants === 'function') ? _loadAdminGrants() : {};
    const myGrant = (playerStats.username && grants[playerStats.username]) || null;
    const hasDelegate = !!(myGrant && myGrant.canRevokeAdmin);
    if (!isSuper && !hasDelegate) {
        console.warn('🚫 revoke-admin: caller lacks permission');
        return;
    }
    const target = (document.getElementById('revoke-admin-target').value || '').trim();
    const pwEl   = document.getElementById('revoke-admin-password');
    const pw     = pwEl ? pwEl.value : '';
    const result = document.getElementById('revoke-admin-result');
    if (!target) {
        result.style.color = '#e74c3c';
        result.innerText = 'חסר שם משתמש';
        return;
    }
    // Same password gate as submitGrantAdmin — refuse if it doesn't match.
    if (!_verifyMyPassword(pw)) {
        result.style.color = '#e74c3c';
        result.innerText = '🔒 סיסמא לא נכונה — לא ניתן למחוק אדמין';
        return;
    }
    if (pwEl) pwEl.value = '';

    // Store a revoke "grant" so the target picks it up via the oracle channel.
    // Re-fetch a fresh copy under a NEW name so we don't clash with the
    // `const grants` declared earlier in this function for the
    // permission check.
    const revokeFlags = { _revoke: true, grantId: 'rev-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) };
    const grantsForWrite = _loadAdminGrants();
    grantsForWrite[target] = revokeFlags;
    _saveAdminGrants(grantsForWrite);

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

// ---------------------------------------------------------------------------
// Kick-User flow — super-admin only. Sends a KICK_USER message through the
// target's PeerJS lock-peer. The target's network-logic.js handler receives
// it and force-returns them to the username overlay.
// ---------------------------------------------------------------------------
function openKickAdminModal() {
    const overlay = document.getElementById('kick-admin-overlay');
    if (!overlay) return;
    // Reparent to body so the wrapper overlay isn't clipped.
    if (overlay.parentElement !== document.body) document.body.appendChild(overlay);
    overlay.style.display = 'flex';
    overlay.classList.add('active');
    document.getElementById('kick-admin-result').innerText = '';
    document.getElementById('kick-admin-target').value = '';
    document.getElementById('kick-admin-password').value = '';
    _refreshAdminOpenClass();
}
window.openKickAdminModal = openKickAdminModal;

function closeKickAdminModal() {
    const overlay = document.getElementById('kick-admin-overlay');
    if (!overlay) return;
    overlay.style.display = 'none';
    overlay.classList.remove('active');
    _refreshAdminOpenClass();
}
window.closeKickAdminModal = closeKickAdminModal;

function submitKickAdmin() {
    // Strictly super-admin only. Not delegated through grants — kicking is
    // a moderation power that shouldn't be passed around.
    const isSuper = (typeof isSuperAdmin === 'function')
        ? isSuperAdmin(playerStats.username || '')
        : (playerStats.username === ADMIN_USERNAME);
    if (!isSuper) {
        console.warn('🚫 kick-admin: caller lacks permission');
        return;
    }

    const target = (document.getElementById('kick-admin-target').value || '').trim();
    const pwEl   = document.getElementById('kick-admin-password');
    const pw     = pwEl ? pwEl.value : '';
    const result = document.getElementById('kick-admin-result');
    result.innerText = '';

    if (!target) { result.style.color = '#e74c3c'; result.innerText = 'חסר שם משתמש'; return; }
    if (!_verifyMyPassword(pw)) {
        result.style.color = '#e74c3c';
        result.innerText = '🔒 סיסמא לא נכונה — לא ניתן להוציא משחקן';
        return;
    }
    if (pwEl) pwEl.value = '';

    // Send the KICK_USER ping. Returns true on send-attempted, false if the
    // local PeerJS infrastructure isn't ready.
    let sent = false;
    if (typeof window.broadcastKickUser === 'function') {
        sent = window.broadcastKickUser(target);
    }
    result.style.color = sent ? '#2ecc71' : '#e67e22';
    result.innerText = sent
        ? `✓ ${target} יוחזר למסך השם משתמש (אם הוא מחובר)`
        : '⚠️ הרשת עדיין לא מוכנה — נסה שוב בעוד רגע';
}
window.submitKickAdmin = submitKickAdmin;

const _HARDCODED_GRANTS = {
    'Amit Dvid':   { infiniteElixir: true, grantId: 'hardcoded-amit-dvid' },
    'נח':          { godMode: true, grantId: 'hardcoded-noach' },
    'noamtheking': { godMode: true, grantId: 'hardcoded-noamtheking' }
};

function applyAdminGrantForLocalUser() {
    if (!playerStats || !playerStats.username) return;

    // Merge any hardcoded grant for this user into localStorage so the rest of
    // the system (openAdminMenu, updateStatsUI) picks it up automatically.
    const hardcoded = _HARDCODED_GRANTS[playerStats.username];
    if (hardcoded) {
        const existing = _loadAdminGrants();
        if (!existing[playerStats.username] ||
            existing[playerStats.username].grantId !== hardcoded.grantId) {
            existing[playerStats.username] = Object.assign({}, existing[playerStats.username] || {}, hardcoded);
            _saveAdminGrants(existing);
        }
    }

    const grants = _loadAdminGrants();
    const mine = grants[playerStats.username];
    if (mine && typeof applyGrantFlags === 'function') {
        applyGrantFlags(mine);
        const adminBtn = document.querySelector('.admin-btn:not(.grant-admin-btn):not(.revoke-admin-btn)');
        if (adminBtn) adminBtn.style.display = 'flex';
    }

    // Hardcoded full-unlock for specific users — all cards available from first login.
    const _FULL_UNLOCK_USERS = ['noamtheking', 'danniel1234!'];
    if (_FULL_UNLOCK_USERS.includes(playerStats.username) && typeof CARDS !== 'undefined') {
        const allCards = Object.keys(CARDS);
        const alreadyFull = Array.isArray(playerStats.unlockedCards) &&
            allCards.every(id => playerStats.unlockedCards.includes(id));
        if (!alreadyFull) {
            playerStats.unlockedCards = allCards.slice();
            if (typeof saveStats === 'function') saveStats();
        }
    }
}
window.applyAdminGrantForLocalUser = applyAdminGrantForLocalUser;
document.addEventListener('DOMContentLoaded', () => {
    // Defer so playerStats is populated first.
    setTimeout(applyAdminGrantForLocalUser, 100);
});
