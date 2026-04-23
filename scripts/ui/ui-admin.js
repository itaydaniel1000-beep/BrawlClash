// ui-admin.js - Admin Panel UI Logic

function openAdminMenu() {
    const isSuper = playerStats.username === ADMIN_USERNAME;
    const grants = (typeof _loadAdminGrants === 'function') ? _loadAdminGrants() : {};
    const myGrant = (playerStats.username && grants[playerStats.username]) || null;

    // Super-admin always allowed; anyone else needs a stored grant.
    if (!isSuper && !myGrant) {
        console.warn("🚫 Unauthorized Admin Access Attempt");
        return;
    }

    const overlay = document.getElementById('admin-panel-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';

    updateAdminToggleUI('infiniteElixir', 'toggle-infinite-elixir');
    updateAdminToggleUI('godMode', 'toggle-god-mode');
    updateAdminToggleUI('doubleDamage', 'toggle-double-damage');
    updateAdminToggleUI('superSpeed', 'toggle-super-speed');

    // Show each toggle row only if its feature is part of the user's grant.
    // Super-admin sees every row regardless.
    const toggles = [
        { id: 'toggle-infinite-elixir', key: 'infiniteElixir' },
        { id: 'toggle-god-mode',        key: 'godMode' },
        { id: 'toggle-double-damage',   key: 'doubleDamage' },
        { id: 'toggle-super-speed',     key: 'superSpeed' }
    ];
    toggles.forEach(t => {
        const btn = document.getElementById(t.id);
        const row = btn && btn.closest('.hack-row');
        if (!row) return;
        row.style.display = (isSuper || (myGrant && myGrant[t.key])) ? '' : 'none';
    });

    // Currency editors + max-levels actions are super-admin only (they're raw
    // setters, not part of a grant contract).
    document.querySelectorAll('#admin-panel-overlay .admin-divider, #admin-panel-overlay .editor-section-title, #admin-panel-overlay .editor-row').forEach(el => {
        el.style.display = isSuper ? '' : 'none';
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
        '  "flags": { ...optional built-in flags... },',
        '  "customJS": "<optional JavaScript snippet, runs on the target\'s device>"',
        "}",
        "",
        "BUILT-IN FLAGS (use these whenever the effect maps cleanly to one):",
        "  godMode, doubleDamage, superSpeed, infiniteElixir: booleans (persistent hacks)",
        "  speedMultiplier, dmgMultiplier, hpMultiplier, safeHpMultiplier: numbers (1 = default; spawn-time multipliers for the player's own units/safe)",
        "  startingElixir, maxElixir: numbers (0 = use default 5/10; battle-init overrides)",
        "  coins, gems, trophies: numbers (one-shot grants; added once when the target receives this grant)",
        "  maxLevels: bool (maxes every card's level)",
        "  _revoke: bool (wipes every admin perk the target has; use when the super-admin says הסר/בטל/revoke)",
        "",
        "CUSTOM JS (use only if no built-in flag fits):",
        "  `customJS` is a JS statement or expression that runs ONCE on the target's device when this grant is applied. Available variables at runtime:",
        "    adminHacks, playerStats (.coins, .gems, .levels, .username), units, buildings, auras, playerSafe, enemySafe, CONFIG, CARDS, showTransientToast, saveStats, saveAdminHacks.",
        "  Mutate them directly — the game reads them live. Example: 'setInterval(()=>units.filter(u=>u.team===\"player\"&&!u.isDead).forEach(u=>{u.hp=Math.min(u.maxHp,u.hp+10)}),1000);'",
        "  For one-shot stat bumps that don't fit coins/gems/trophies, still prefer customJS that mutates the state and calls saveStats().",
        "  Keep customJS short, side-effects only, no return value, no imports, no await.",
        "",
        "Omit `flags` and `customJS` entirely if the user is just chatting or asking a question.",
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
        flags: parsed.flags || null,
        customJS: typeof parsed.customJS === 'string' ? parsed.customJS : null
    };
}
window.callGeminiGrantAI = callGeminiGrantAI;

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
    if (f.maxLevels) bits.push('רמות מקס');
    return bits.join(', ');
}

async function submitGrantAdmin() {
    // Only the super-admin can use this — defence in depth on top of the
    // visibility toggle on #grant-admin-btn.
    if (playerStats.username !== ADMIN_USERNAME) {
        console.warn('🚫 grant-admin called from non-super-admin');
        return;
    }

    const target = (document.getElementById('grant-admin-target').value || '').trim();
    const descEl = document.getElementById('grant-admin-desc');
    const desc = (descEl.value || '').trim();
    const result = document.getElementById('grant-admin-result');
    result.innerText = '';

    if (!target) { result.style.color = '#e74c3c'; result.innerText = 'חסר שם משתמש'; return; }
    if (!desc)   { result.style.color = '#e74c3c'; result.innerText = 'חסר תיאור של מה לתת לו'; return; }

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
    const anyOneShot = parsed.coins > 0 || parsed.gems > 0 || parsed.trophies > 0 || parsed.maxLevels;
    const hasCustomJS = customJS && customJS.trim().length > 0;
    if (!parsed._revoke && !anyHack && !anyMult && !anyElixirOverride && !anyOneShot && !hasCustomJS) {
        // No concrete grant change — treat as pure chat.
        return;
    }

    // Fresh grantId so the target applies one-shot rewards idempotently and
    // any customJS payload runs exactly once per re-grant.
    const flags = { ...parsed, grantId: 'g-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) };
    if (hasCustomJS) flags.customJS = customJS;

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
