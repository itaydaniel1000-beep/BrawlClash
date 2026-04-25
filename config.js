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

const CARDS = {
    'bruce': { name: 'ברוס', cost: 3, type: 'unit', color: '#8c7ae6', icon: '🐻' },
    'leon': { name: 'ליאון', cost: 8, type: 'unit', color: '#00cec9', icon: '🍭' },
    'bull': { name: 'בול', cost: 6, type: 'unit', color: '#341f97', icon: '🐂' },
    'scrappy': { name: 'ספארקי', cost: 4, type: 'building', color: '#e1b12c', icon: '🐶' },
    'penny': { name: 'פני', cost: 5, type: 'building', color: '#c23616', icon: '💣' },
    'pam': { name: 'פאם', cost: 8, type: 'aura', color: '#44bd32', icon: '💚' },
    'max': { name: 'מקס', cost: 4, type: 'aura', color: '#f1c40f', icon: '⚡' },
    '8bit': { name: '8-ביט', cost: 6, type: 'aura', color: '#e84393', icon: '🕹️' },
    'emz': { name: 'אמז', cost: 7, type: 'aura', color: '#9c88ff', icon: '🧴' },
    'spike': { name: 'ספייק', cost: 5, type: 'aura', color: '#2ecc71', icon: '🌵' },
    'tara': { name: 'טראה', cost: 7, type: 'aura', color: '#636e72', icon: '👁️' },
    'mr-p': { name: 'מיסטר פי', cost: 4, type: 'building', color: '#54a0ff', icon: '🐧' },
    // Amber — pacifist fire-walker. Costs 7 (high — she's invulnerable
    // and her trail persists for 5s after she dies). HP 700,
    // attackDamage 0, speed 75. Walks like Bruce (target chase) and
    // leaves a fire trail (25 dmg/sec) behind her. The player can
    // optionally steer her along up to 6 waypoints (each ≤ 5 squares)
    // with the 🎯 path button while the card is held; without a path
    // she walks to the nearest enemy and vanishes on contact.
    'amber': { name: 'אמבר', cost: 7, type: 'unit', color: '#e67e22', icon: '🔥' }
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
