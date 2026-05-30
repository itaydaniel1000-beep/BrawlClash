// config.js - Constants and Static Game Data

const CONFIG = {
    CANVAS_WIDTH: 600,
    CANVAS_HEIGHT: 900,
    FPS: 60,
    ELIXIR_GEN_RATE: 1,
    MAX_ELIXIR: 10,
    SAFE_MAX_HP: 10000,
    SAFE_RADIUS: 45,
    SAFE_RANGE: 495, // 450 + 10%
    SAFE_DAMAGE: 150,
    SAFE_ATTACK_SPEED: 1500
};

const ADMIN_USERNAME = 'danniel1234!';

// Co-super-admins. Users in this list see the FULL admin panel (every
// toggle, every grant/revoke button, every currency editor) and pass every
// gameplay admin-power gate — exactly like the canonical `ADMIN_USERNAME`.
// ADMIN_USERNAME is included so callers can use this list as the single
// source of truth for "is this account a super-admin?" without remembering
// to also `|| name === ADMIN_USERNAME` everywhere.
//
// Note: this is UI/gameplay only. The username-registry lock-peer (used by
// network-logic.js to gate username uniqueness across devices) stays
// hard-coded to `ADMIN_USERNAME` since only one peer can hold that role.
const SUPER_ADMIN_USERNAMES = ['danniel1234!', 'Fy'];
function isSuperAdmin(name) {
    if (!name) return false;
    const needle = name.trim().toLowerCase();
    return SUPER_ADMIN_USERNAMES.some(n => n.toLowerCase() === needle);
}

// Granular non-super "limited admin" permissions. Each list grants ONE
// specific capability inside the admin panel (and the ⚙️ admin button
// becomes visible). Super-admins already get everything via isSuperAdmin
// — the lists below are for users who should have a single power without
// being promoted to full admin.
const LIBI_ALLOWED_USERS    = ['danniel1234!', 'Fy'];     // can flip the 💖 Libi toggle
const BARRY_ALLOWED_USERS   = ['it | Yotam'];              // can flip the 🍦 Barry toggle
const LUMI_ALLOWED_USERS    = ['danniel1234!', 'Fy'];     // can flip the 🌟 Lumi toggle
const CREDITS_EDITOR_USERS  = ['it | Yotam'];              // can edit the credits amount
const GEMS_EDITOR_USERS     = ['Yotamoo'];                 // can edit the gems amount

function _isNameInList(list, name) {
    if (!name) return false;
    const needle = name.trim().toLowerCase();
    return list.some(n => n.toLowerCase() === needle);
}
function isLibiAllowed(name)    { return _isNameInList(LIBI_ALLOWED_USERS,    name); }
function isBarryAllowed(name)   { return _isNameInList(BARRY_ALLOWED_USERS,   name); }
function isLumiAllowed(name)    { return _isNameInList(LUMI_ALLOWED_USERS,    name); }
function isCreditsEditor(name)  { return _isNameInList(CREDITS_EDITOR_USERS,  name); }
function isGemsEditor(name)     { return _isNameInList(GEMS_EDITOR_USERS,     name); }

// Anyone with at least ONE limited permission — used to decide whether to
// show the ⚙️ admin button at all. Super-admin is handled separately
// (they see the button via the isAdmin branch).
function hasAnyLimitedAdminAccess(name) {
    return isLibiAllowed(name) || isBarryAllowed(name) || isCreditsEditor(name) || isGemsEditor(name);
}

// Rarity tiers — drives the card border color in the brawler-selection
// screen and the in-battle deck. Higher rarity = visually rarer card.
// `unlockCost` is the price in credits 🎟️ to unlock a card of that
// rarity from the unlock-characters screen.
const RARITIES = {
    'נדיר':            { color: '#2ecc71', unlockCost:  320 },  // green
    'נדיר במיוחד':      { color: '#3498db', unlockCost:  640 },  // blue
    'אדיר':            { color: '#ff6b9d', unlockCost: 1000 },  // pink
    'מדהים':           { color: '#e74c3c', unlockCost: 2000 },  // red
    'אגדי':            { color: '#f1c40f', unlockCost: 3600 }   // yellow / gold
};

// Helper — resolves a card's rarity color (falls back to its own card
// color so older code paths that read .rarityColor before this rev still
// render something sane).
function getRarityColor(cardId) {
    const c = CARDS[cardId];
    if (!c) return '#7f8c8d';
    if (c.rarity && RARITIES[c.rarity]) return RARITIES[c.rarity].color;
    return c.color || '#7f8c8d';
}

const CARDS = {
    'bruce': { name: 'ברוס', cost: 3, type: 'unit', color: '#8c7ae6', icon: '🐻',
               rarity: 'נדיר' },
    'leon': { name: 'ליאון', cost: 8, type: 'unit', color: '#00cec9', icon: '🍭',
               rarity: 'אדיר' },
    'bull': { name: 'בול', cost: 6, type: 'unit', color: '#341f97', icon: '🐂',
               rarity: 'אדיר' },
    'scrappy': { name: 'ספארקי', cost: 4, type: 'building', color: '#e1b12c', icon: '🐶',
               rarity: 'נדיר' },
    'penny': { name: 'פני', cost: 5, type: 'building', color: '#c23616', icon: '💣',
               rarity: 'נדיר במיוחד' },
    'pam': { name: 'פאם', cost: 8, type: 'aura', color: '#44bd32', icon: '💚',
               rarity: 'נדיר' },
    'max': { name: 'מקס', cost: 4, type: 'aura', color: '#f1c40f', icon: '⚡',
               rarity: 'נדיר במיוחד' },
    '8bit': { name: '8-ביט', cost: 6, type: 'aura', color: '#e84393', icon: '🕹️',
               rarity: 'אדיר' },
    'emz': { name: 'אמז', cost: 7, type: 'aura', color: '#9c88ff', icon: '🧴',
               rarity: 'אדיר' },
    'spike': { name: 'ספייק', cost: 5, type: 'aura', color: '#2ecc71', icon: '🌵',
               rarity: 'נדיר במיוחד' },
    'tara': { name: 'טראה', cost: 7, type: 'aura', color: '#636e72', icon: '👁️',
               rarity: 'נדיר במיוחד' },
    'mr-p': { name: 'מיסטר פי', cost: 4, type: 'building', color: '#54a0ff', icon: '🐧',
               rarity: 'מדהים' },
    // Amber — pacifist fire-walker. Costs 7 (high — she's invulnerable
    // and her trail persists for 5s after she dies). HP 700,
    // attackDamage 0, speed 75. Walks like Bruce (target chase) and
    // leaves a fire trail (25 dmg/sec) behind her. The player can
    // optionally steer her along up to 6 waypoints (each ≤ 5 squares)
    // with the 🎯 path button while the card is held; without a path
    // she walks to the nearest enemy and vanishes on contact.
    'amber': { name: 'אמבר', cost: 7, type: 'unit', color: '#e67e22', icon: '🔥',
               rarity: 'מדהים' },
    // Gigi — ballerina. Walks toward the nearest enemy (uses the
    // bull/porter/libi targeting branch in unit-logic.js). Heavy hitter:
    // 2500 HP / 250 dmg / 6 elixir. Signature ability: ONE-SHOT
    // teleport. After placement, a side-rail button (gigi-teleport-btn)
    // shows a circular range around each alive un-teleported Gigi.
    // Clicking inside the range moves that Gigi to the click point and
    // marks her as having used her teleport. Click the button again to
    // hide the range; click another card / action button to cancel.
    'gigi': { name: 'גיגי', cost: 7, type: 'unit', color: '#e91e63', icon: '🩰',
              rarity: 'מדהים' },
    // Bubble — slingshot gum bubble. 3 elixir. Untargetable, invulnerable,
    // bounces off walls, deals 100 contact damage once per enemy, dies after
    // 18 "steps" (× 50 px = 900 px max travel). Long-press on the map to
    // pick the launch direction (drag-aim sling), release to fire.
    'bubble': { name: 'באבל', cost: 3, type: 'unit', color: '#FF69B4', icon: '🫧',
               rarity: 'נדיר במיוחד' },
    // Sirius — copy-spell. While held, every enemy entity on the field is
    // tagged with a purple glow. Clicking one spawns a copy of that
    // entity on the player's team at the same position. Cost is DYNAMIC:
    // the copied entity's cost + 1. Shown as "?" on the card slot since
    // the actual cost only resolves at click time. Sirius herself is
    // never instantiated on the field — she's a pure spell.
    'sirius': { name: 'סיריוס', cost: 1, type: 'spell', color: '#9b59b6', icon: '👯', dynamicCost: true,
               rarity: 'אגדי' },
    // Trunk — energy support unit. 5 elixir. Random-walks ONLY in the
    // half he was placed in, dropping a purple "energy trail" aura behind
    // him. When a same-team unit steps on a trail tile, the tile vanishes
    // and that unit gets a permanent +20% damage buff (one-shot, doesn't
    // stack). Trunk himself is invulnerable, has no visible HP, and
    // self-destructs after 15 seconds on the field.
    'trunk': { name: 'טרנק', cost: 5, type: 'unit', color: '#a55eea', icon: '⚡',
               rarity: 'אגדי' },
    // Rosa — defensive shield-spell. While held, every player-team entity
    // on the field is tagged with a coral-pink glow. Clicking one applies
    // a 500-HP "shield bubble" that drains 25 HP/second until empty (or
    // until incoming damage burns through it). Stacks with existing
    // shield. Costs a flat 3 elixir per cast. Rosa herself is never
    // instantiated on the field — pure spell.
    'rosa':   { name: 'רוזה', cost: 3, type: 'spell', color: '#ff7eb9', icon: '🛡️',
               rarity: 'אגדי' },
    // Bonnie — long-range sniper turret. 6 elixir. Hits half the map
    // (range 450) but fires only every 5 s (2× slower than Penny). Has a
    // unique transform ability: a side button (🪄) marks every player-
    // team Bonnie on the field, and clicking one converts her into a
    // special Bruce variant that never attacks the safe — useful for
    // sweeping enemy turrets / units off the field without the bruce
    // wasting his life smashing the gate.
    'bonnie': { name: 'בוני', cost: 6, type: 'building', color: '#a29bfe', icon: '🏰',
               rarity: 'מדהים' },
    // Libi — secret admin-only ultimate unit. Costs 0 elixir, invulnerable
    // (cannot take damage), one-shots everything it attacks (effectively
    // infinite damage). Only added to the deck when the player has the
    // "libiCard" admin toggle ON and is in LIBI_ALLOWED_USERS. Not unlock-
    // able from the shop and not visible in the brawler-selection screen.
    'libi':   { name: 'ליבי', cost: 0, type: 'unit', color: '#ff69b4', icon: '💖',
               rarity: 'אגדי', adminOnly: true },
    // Barry — second admin-only unit. 4000 HP tank that MUST be placed in
    // the ENEMY half (placeInEnemyHalf flag — handled in battle-input.js).
    // Costs 15 elixir so the admin needs maxElixir ≥ 15 (set via the
    // admin panel) to actually cast her. Special ability: every 5 seconds
    // a 🍦 ice-cream charge accumulates on a side button. Pressing it
    // lets the admin drop an ice-cream aura (Spike-radius, deals
    // 150 dmg/sec) anywhere on the map. Max 4 ice creams per team on
    // the field at once, max 2 Barrys per team.
    'barry':  { name: 'בארי', cost: 15, type: 'unit', color: '#3498db', icon: '🍦',
               rarity: 'אגדי', adminOnly: true, placeInEnemyHalf: true },
    // Internal 'icecream' aura — never appears in any deck / shop / brawler
    // grid (adminOnly + hiddenFromAll filters elsewhere). It exists in
    // CARDS only so spawnEntity() can route it through the same code path
    // every other aura uses, which also gives us P2P sync for free.
    'icecream': { name: 'גלידה', cost: 0, type: 'aura', color: '#3498db', icon: '🍦',
                  rarity: 'אגדי', adminOnly: true, hiddenFromAll: true },
    // Lumi — third admin-only character (after Libi / Barry). A stationary
    // building that paints 3 concentric "danger zones" around itself
    // (innermost r=70, middle r=140 = 2×, outer r=280 = 4×). Each band
    // does its own per-second damage to any enemy standing in it (500 /
    // 1000 / 1000 HP/sec respectively — NOT stacking; the band a unit
    // is in determines the rate). On placement, ALL enemy units on the
    // map are frozen solid for 2 seconds — a one-time tactical reset
    // letting the damage zones do their work without interruption.
    // Gated behind LUMI_ALLOWED_USERS + the lumiCard admin toggle.
    'lumi':   { name: 'לומי', cost: 5, type: 'building', color: '#8e44ad', icon: '🌟',
               rarity: 'אגדי', adminOnly: true },
    // 🎂 Birthday cake — limited-time event card, available only during
    // the May 21 → 27 window (see ui-event.js). Healing tower: stationary,
    // heals allies in radius, explodes in confetti on death. Excluded from
    // every "all cards" list by the `eventOnly` flag.
    'cake':   { name: 'עוגה', cost: 5, type: 'building', color: '#ff6b9d', icon: '🎂',
               rarity: 'אגדי', eventOnly: true },
    // Frank — front-line mauler, 7 elixir. Heavy melee unit (3000 HP,
    // 400 dmg/swing) that targets the nearest enemy unit OR the safe.
    // His attack is a wide cone (pyramid) projecting forward from him —
    // every enemy inside the cone takes the full hit, and the swing
    // leaves dark cracks on the ground that linger 2 s. Every SECOND
    // swing also stuns every enemy it hits for 2 s (sets isFrozen
    // briefly), so the cadence is hit → stun-hit → hit → stun-hit →…
    'frank':  { name: 'פרנק', cost: 7, type: 'unit', color: '#16a085', icon: '🔨',
                rarity: 'אגדי' },
    // Raps — stealth bomber. 5 elixir. Tapping any point on the map
    // detonates an 8-bomb hex cluster centred at the click. Each bomb has
    // Spike's radius (55px) and the cluster is packed so adjacent circles
    // are tangent (3-2-3 hex layout). Bombs explode SEQUENTIALLY, one
    // every ~200 ms, dealing 500 dmg to every enemy standing in the
    // radius at the moment of detonation. Raps himself is never
    // instantiated as a unit — pure spell with a visible red marker per
    // bomb that vanishes the instant that bomb hits the ground.
    'raps':   { name: 'ראפס', cost: 5, type: 'spell', color: '#c0392b', icon: '💣',
               rarity: 'אגדי' },
    // Willow — necromancer-spell. Mirror image of Sirius: while she's
    // selected, every click on an enemy entity instantly KILLS that
    // entity instead of copying it. Cost is dynamic — the target's base
    // card cost + 2 elixir (Sirius's surcharge is +1; killing is
    // stronger than copying so the premium is +1 higher). Shown as "?"
    // on the card slot since the actual cost only resolves at click
    // time. Willow herself is never instantiated on the field — pure
    // spell.
    'willow': { name: 'וילו', cost: 2, type: 'spell', color: '#6a1b9a', icon: '🧙‍♀️', dynamicCost: true,
               rarity: 'אגדי' },
    // Gray — pacifist portal-pair "grandpa stick". 4 elixir. Placing him
    // drops portal A at the click point; the very next map click sets
    // portal B anywhere on the field. Any unit on Gray's team that walks
    // onto either circle gets warped to the OTHER one (one teleport per
    // unit, lifetime). Gray himself has no HP bar, can't move, can't be
    // attacked, can't be seen by enemy AI — only by the two human
    // players. Excluded riders (amber, trunk, raps + every AURA type
    // since auras never run Unit.update): they walk over the portals
    // like normal floor.
    'gray':   { name: 'גריי', cost: 4, type: 'unit', color: '#2c3e50', icon: '🦯',
                rarity: 'אגדי' },
    // Pang — martial-arts panda. 8 elixir, legendary. 2000 HP / 200 dmg
    // melee. On spawn he kicks into a CHAIN DASH: at 8× his normal walk
    // speed he warps to the nearest enemy entity, hits it once for his
    // base damage, then immediately re-targets the next-nearest unvisited
    // enemy and repeats — until everything currently on the opposing team
    // has been dashed-to. Then he drops out of dash mode and behaves like
    // any other nearest-enemy melee unit. Pure offense; no special anti-
    // safe rules, so the safe is the last thing in his queue if it's
    // still standing when the field is empty.
    'pang':   { name: 'פאנג', cost: 8, type: 'unit', color: '#34495e', icon: '🐼',
                rarity: 'אגדי' }
};

const STAR_POWERS = {
    'bruce': [
        { id: 'sp1', name: 'פרווה חסינה', desc: 'ברוס מקבל 30% פחות נזק' },
        { id: 'sp2', name: 'מכה רועמת', desc: 'המכה של ברוס מאטה ב-10% לשנייה אחת' }
    ],
    'bull': [
        { id: 'sp1', name: 'עור עבה', desc: 'סופג 30% פחות נזק כל עוד הוא מעל 70% חיים' },
        { id: 'sp2', name: 'מגן הסתערות', desc: 'מגן של 500 חיים ל-5 שניות אחרי דאש' }
    ],
    'scrappy': [
        { id: 'sp1', name: 'טעינה קופצת', desc: 'הכדורים קופצים בין אויבים' },
        { id: 'sp2', name: 'תיקון מהיר', desc: 'הטורט מתקן את עצמו ב-50 חיים לשנייה' }
    ],
    'penny': [
        { id: 'sp1', name: 'כדורי אש', desc: 'הפגזים מבעירים שטח ב-20 נזק לשנייה' },
        { id: 'sp2', name: 'הפצצה אחרונה', desc: 'יורה 4 פצצות כשהוא נהרס' }
    ],
    'pam': [
        { id: 'sp1', name: 'חיחיבוק של אמא', desc: 'ריפוי מיידי של 500 חיים בהצבה' },
        { id: 'sp2', name: 'לחץ של אמא', desc: 'הילה שפוגעת באויבים ב-20 נזק לשנייה' }
    ],
    'max': [
        { id: 'sp1', name: 'טעינה בתנועה', desc: 'טעינת אליקסיר מהירה ב-10% כשמקס חי' },
        { id: 'sp2', name: 'מהירות על', desc: 'ההילה חסינה להאטות' }
    ],
    '8bit': [
        { id: 'sp1', name: 'מגבר מוגבר', desc: 'טווח הילה גדול ב-50%' },
        { id: 'sp2', name: 'אובר-קלוק', desc: 'נזק מוגבר ב-30% במקום 10%' }
    ],
    'emz': [
        { id: 'sp1', name: 'ריח רע', desc: 'אויבים בהילה סופגים 20% יותר נזק' },
        { id: 'sp2', name: 'הייפ', desc: 'ריפוי של 30 חיים על כל אויב בטווח' }
    ],
    'leon': [
        { id: 'sp1', name: 'מארב', desc: 'נזק כפול במכה הראשונה אחרי יציאה מאי-נראות' },
        { id: 'sp2', name: 'מהירות צל', desc: 'מהירות תנועה גבוהה ב-25% במצב בלתי נראה' }
    ],
    'spike': [
        { id: 'sp1', name: 'דשן', desc: 'ריפוי של 100 חיים לשנייה בתוך ההילה' },
        { id: 'sp2', name: 'קוצים ארוכים', desc: 'זמן הילה ארוך יותר (15 שניות)' }
    ],
    'tara': [
        { id: 'sp1', name: 'פורטל אפל', desc: 'מזמן צל כשההילה נגמרת' },
        { id: 'sp2', name: 'ריפוי שחור', desc: 'הגרביטציה מרפאת יחידות שלך' }
    ],
    'mr-p': [
        { id: 'sp1', name: 'דלת מסתובבת', desc: 'פורטרים יוצאים כל 3 שניות' },
        { id: 'sp2', name: 'טיפול אקסטרה', desc: 'מגן למכה הראשונה של כל פורטר' }
    ]
};

const GAME_STATE = { MENU: 'menu', SP_SELECTION: 'sp_selection', PLAYING: 'playing', GAMEOVER: 'gameover' };

const EMOTE_MAP = {
    'angry': '😡',
    'laugh': '😂',
    'thumb': '👍',
    'cry': '😭'
};

const MAX_LEVEL = 12;
