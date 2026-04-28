// config.js - Constants and Static Game Data

const CONFIG = {
    CANVAS_WIDTH: 600,
    CANVAS_HEIGHT: 900,
    FPS: 60,
    ELIXIR_GEN_RATE: 1,
    MAX_ELIXIR: 10,
    SAFE_MAX_HP: 5000,
    SAFE_RADIUS: 45,
    SAFE_RANGE: 495, // 450 + 10%
    SAFE_DAMAGE: 150,
    SAFE_ATTACK_SPEED: 1500
};

const ADMIN_USERNAME = 'danniel1234!';

// Rarity tiers — drives the card border color in the brawler-selection
// screen and the in-battle deck. Higher rarity = visually rarer card.
const RARITIES = {
    'נדיר':            { color: '#2ecc71' },  // green
    'נדיר במיוחד':      { color: '#3498db' },  // blue
    'אדיר':            { color: '#ff6b9d' },  // pink
    'מדהים':           { color: '#e74c3c' },  // red
    'אגדי':            { color: '#f1c40f' }   // yellow / gold
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
               rarity: 'מדהים' }
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
