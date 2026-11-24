/* ===== משחקי כסף נוספים: טנקים נגד בלונים, וציד הונאות ===== */
(function () {
  const TW = 640;
  const TH = 470;
  const GROUND = 430;
  const BALLOON_COLORS = ["#e8574a", "#3f8fd8", "#f0a93f", "#7b5cd6", "#4f9e5c"];
  const FONT = 'system-ui, "Segoe UI", Arial, sans-serif';

  /* ---------- שאלות ---------- */

  /* כיתות: כל סרטון שייך לטווח כיתות. כשנבחרה כיתה, משחקי הטנקים שואלים רק על הסרטונים שלה.
     אם אין מספיק שאלות לכיתה (למשל בשאלות חשבון), משלימים משאלות מכיתות סמוכות. */
  const VGRADE = {"money-basics": [3, 4], "needs-wants": [3, 4], "budget": [4, 5], "smart-shopping": [4, 5], "goals": [4, 5],
    "saving-habit": [5, 6], "emergency-fund": [5, 6], "compound": [6, 7], "risk": [6, 7], "credit": [6, 7]};
  const inGrade = (vid, g) => !!VGRADE[vid] && g >= VGRADE[vid][0] && g <= VGRADE[vid][1];
  function tankConfig(list) {
    const g = Number(window.ARCADE_GRADE) || 0;
    let pool = list;
    if (g) {
      pool = list.filter(q => inGrade(q.vid, g));
      /* ההשלמה היא מהכיתה הקרובה ביותר, ורק כמה שחסר. אחרת כיתה ג׳ בשאלות
         החשבון קיבלה את כל השאלות, ריבית דריבית של כיתה ז׳ בכלל זה, רק כי
         לכיתה ג׳ עצמה אין שאלות חשבון. הבחירה מתוך הכיתה הרחוקה מוגרלת,
         כדי שלא תהיה אותה שאלה בכל משחק. */
      for (let d = 1; d <= 4 && pool.length < 8; d++) {
        const near = list.filter(q => pool.indexOf(q) < 0 && (inGrade(q.vid, g - d) || inGrade(q.vid, g + d)));
        pool = pool.concat(shuffled(near).slice(0, 8 - pool.length));
      }
    }
    const count = Math.min(8, pool.length);
    /* "need" לא יכול לעבור את מספר השאלות, אחרת אי אפשר לנצח */
    return {questions: pool, count: count, need: Math.min(count, Math.max(3, Math.round(count * 0.75)))};
  }

  const TANK_KNOW = [
    {
      "vid": "money-basics",
      "src": "מתוך הסרטון: מה זה בכלל כסף? (כיתות ג׳-ד׳)",
      "q": "האיכר רוצה נעליים ומציע תפוחים, אבל הסנדלר לא רוצה תפוחים. מה הבעיה בסחר חליפין?",
      "a": [
        "כל אחד צריך לרצות בדיוק את מה שיש לשני",
        "אי אפשר להחליף דברים בכלל",
        "תמיד משלמים עמלה"
      ],
      "why": "כדי שעסקה תצליח, כל אחד צריך לרצות בדיוק את מה שיש לשני, וזה כמעט אף פעם לא קורה."
    },
    {
      "vid": "money-basics",
      "src": "מתוך הסרטון: מה זה בכלל כסף? (כיתות ג׳-ד׳)",
      "q": "בסרטון אומרים שלנייר של שטר עצמו אין ערך. מה נותן לכסף ערך?",
      "a": [
        "ההסכמה של כולנו שיש לו ערך",
        "המתכת שהוא עשוי ממנה",
        "ההחלטה של הבנק"
      ],
      "why": "כסף הוא הסכמה: כולנו מסכימים שיש לו ערך, והוא בנוי כולו על אמון."
    },
    {
      "vid": "money-basics",
      "src": "מתוך הסרטון: מה זה בכלל כסף? (כיתות ג׳-ד׳)",
      "q": "האיכר החליף תפוחים בגבינה טרייה. איך קוראים לזה?",
      "a": [
        "סחר חליפין",
        "אשראי",
        "חיסכון"
      ],
      "why": "זה נקרא סחר חליפין: מחליפים דבר בדבר."
    },
    {
      "vid": "needs-wants",
      "src": "מתוך הסרטון: צורך או רצון? (כיתות ג׳-ד׳)",
      "q": "קונה בחנות ממש רוצה אופניים. מה הטריק הפשוט שמציעים לפני שקונים?",
      "a": [
        "מחכים יום אחד ובודקים אם עדיין רוצים",
        "קונים מיד לפני שנגמר",
        "שואלים חבר"
      ],
      "why": "אם למחרת עדיין רוצים, כנראה באמת התכוונו. רוב הפעמים מגלים שכבר לא כל כך רצינו."
    },
    {
      "vid": "needs-wants",
      "src": "מתוך הסרטון: צורך או רצון? (כיתות ג׳-ד׳)",
      "q": "איזה מהבאים הוא צורך, לפי הסרטון?",
      "a": [
        "אוכל, מים ובגדים",
        "צעצוע חדש",
        "נעליים יפות יותר"
      ],
      "why": "צורך הוא מה שחייבים כדי לחיות: אוכל, מים, בגדים וקורת גג."
    },
    {
      "vid": "needs-wants",
      "src": "מתוך הסרטון: צורך או רצון? (כיתות ג׳-ד׳)",
      "q": "מה הסדר הנכון בין צרכים לרצונות?",
      "a": [
        "קודם מכסים צרכים ורק אחר כך רצונות",
        "קודם רצונות ואז צרכים",
        "אסור בכלל לקנות רצונות"
      ],
      "why": "קודם הצרכים ואחר כך הרצונות. מותר גם ליהנות, העיקר לדעת מה זה מה."
    },
    {
      "vid": "budget",
      "src": "מתוך הסרטון: בונים תקציב ראשון (כיתות ד׳-ה׳)",
      "q": "בסרטון מסבירים מה זה תקציב. מה הוא?",
      "a": [
        "תוכנית: כמה כסף נכנס וכמה יוצא",
        "חשבון בנק מיוחד",
        "רשימת קניות"
      ],
      "why": "תקציב הוא פשוט תוכנית: כמה כסף נכנס וכמה כסף יוצא."
    },
    {
      "vid": "budget",
      "src": "מתוך הסרטון: בונים תקציב ראשון (כיתות ד׳-ה׳)",
      "q": "בבניית תקציב, מה רושמים בשלב הראשון?",
      "a": [
        "כל שקל שנכנס",
        "כל שקל שיוצא",
        "רק את החיסכון"
      ],
      "why": "שלב ראשון: רושמים כל שקל שנכנס, כמו דמי כיס, עבודה ומתנות."
    },
    {
      "vid": "budget",
      "src": "מתוך הסרטון: בונים תקציב ראשון (כיתות ד׳-ה׳)",
      "q": "בשלב השלישי בתקציב מחליטים כמה הולך לחיסכון. מתי מעבירים אותו?",
      "a": [
        "מיד, לפני שמוציאים על משהו אחר",
        "בסוף החודש, ממה שנשאר",
        "רק כשיש כסף עודף"
      ],
      "why": "מעבירים אותו מיד, כי מה שנשאר בסוף החודש כמעט אף פעם לא מגיע לחיסכון."
    },
    {
      "vid": "budget",
      "src": "מתוך הסרטון: בונים תקציב ראשון (כיתות ד׳-ה׳)",
      "q": "רוני חרג מהתקציב ומתחיל לחשוש שנכשל. מה אומרים בסרטון?",
      "a": [
        "פשוט מתקנים בשבוע הבא",
        "מוותרים על התקציב",
        "מענישים את עצמנו"
      ],
      "why": "בודקים כדי לדעת איפה אנחנו, לא כדי להעניש. ואם חרגתם, מתקנים בשבוע הבא."
    },
    {
      "vid": "saving-habit",
      "src": "מתוך הסרטון: הכלל של 50-30-20 (כיתות ה׳-ו׳)",
      "q": "קיבלתם מאה שקל. איך מחלקים אותם לפי הכלל 50-30-20?",
      "a": [
        "50 צרכים, 30 רצונות, 20 חיסכון",
        "50 חיסכון, 30 צרכים, 20 רצונות",
        "50 רצונות, 30 חיסכון, 20 צרכים"
      ],
      "why": "50 אחוז לצרכים, 30 לרצונות ו-20 לחיסכון."
    },
    {
      "vid": "saving-habit",
      "src": "מתוך הסרטון: הכלל של 50-30-20 (כיתות ה׳-ו׳)",
      "q": "בכלל 50-30-20, איזה חלק מעבירים ראשון?",
      "a": [
        "את החיסכון, ביום שמקבלים את הכסף",
        "את הרצונות",
        "את הצרכים"
      ],
      "why": "את החיסכון מעבירים ראשון, לפני שמספיקים להתפתות למשהו אחר."
    },
    {
      "vid": "emergency-fund",
      "src": "מתוך הסרטון: קרן חירום - הכרית הרכה (כיתות ה׳-ו׳)",
      "q": "הטלפון של רוני נשבר דווקא לפני הטיול, ולא היה לו כסף בצד. מה היה עוזר לו?",
      "a": [
        "קרן חירום, כסף ששמור להפתעות",
        "כרטיס אשראי נוסף",
        "השקעה במניות"
      ],
      "why": "קרן חירום היא כסף ששמור רק להפתעות. בלי כסף בצד, הפתעה הופכת לבעיה גדולה."
    },
    {
      "vid": "emergency-fund",
      "src": "מתוך הסרטון: קרן חירום - הכרית הרכה (כיתות ה׳-ו׳)",
      "q": "מבוגרים שואפים ל-3 עד 6 חודשי הוצאות בקרן חירום. מה אומרים בסרטון למי שרק מתחיל?",
      "a": [
        "סכום שמכסה תיקון אחד או קנייה דחופה אחת",
        "לא להתחיל עד שיש 6 חודשים",
        "לחכות לגיל 18"
      ],
      "why": "אם רק מתחילים, לא צריך סכום ענק. העיקר שיהיה משהו ולא כלום."
    },
    {
      "vid": "emergency-fund",
      "src": "מתוך הסרטון: קרן חירום - הכרית הרכה (כיתות ה׳-ו׳)",
      "q": "על מה מותר להוציא כסף מקרן חירום?",
      "a": [
        "רק על הפתעות וחירום",
        "על חופשה",
        "על קנייה שבא לנו"
      ],
      "why": "קרן חירום היא לא לחופשה ולא לקנייה שבא לנו, רק לחירום."
    },
    {
      "vid": "compound",
      "src": "מתוך הסרטון: ריבית דריבית - הקסם השקט (כיתות ו׳-ז׳)",
      "q": "100 שקל גדלים ב-10% בשנה. למה אחרי שנתיים יש 121 ולא 120?",
      "a": [
        "כי גם הרווח של השנה הראשונה מרוויח",
        "כי הבנק מוסיף בונוס",
        "כי המחירים עולים"
      ],
      "why": "גם העשרה שקל שהרווחתם מתחילים להרוויח, וזו ריבית דריבית."
    },
    {
      "vid": "compound",
      "src": "מתוך הסרטון: ריבית דריבית - הקסם השקט (כיתות ו׳-ז׳)",
      "q": "מה קובע יותר בריבית דריבית, לפי הסרטון?",
      "a": [
        "הזמן",
        "הסכום ההתחלתי",
        "המזל"
      ],
      "why": "לא הסכום קובע, אלא הזמן. מי שמתחיל מוקדם נותן לכסף הרבה יותר זמן לגדול."
    },
    {
      "vid": "compound",
      "src": "מתוך הסרטון: ריבית דריבית - הקסם השקט (כיתות ו׳-ז׳)",
      "q": "רוני תוהה אם כדאי להתחיל לחסוך עכשיו או בגיל עשרים. מה אומרים בסרטון?",
      "a": [
        "הזמן הכי טוב להתחיל הוא תמיד עכשיו",
        "כדאי לחכות לגיל עשרים",
        "לא משנה מתי מתחילים"
      ],
      "why": "הזמן הכי טוב להתחיל הוא תמיד עכשיו."
    },
    {
      "vid": "risk",
      "src": "מתוך הסרטון: סיכון מול תשואה (כיתות ו׳-ז׳)",
      "q": "רוני ראה פרסומת שמבטיחה רווח ענק בלי סיכון. מה אומרים על השקעה כזאת?",
      "a": [
        "היא לא קיימת, ובדרך כלל מנסים לרמות",
        "היא הזדמנות מצוינת",
        "היא בטוחה אם הפרסומת מפורסמת"
      ],
      "why": "השקעה שמבטיחה רווח גבוה בלי סיכון פשוט לא קיימת."
    },
    {
      "vid": "risk",
      "src": "מתוך הסרטון: סיכון מול תשואה (כיתות ו׳-ז׳)",
      "q": "מה הקשר בין רווח לסיכון, לפי הסרטון?",
      "a": [
        "ככל שהרווח האפשרי גדול יותר, גם הסיכון",
        "רווח גבוה הוא תמיד בטוח",
        "אין קשר ביניהם"
      ],
      "why": "ככל שהרווח האפשרי גדול יותר, כך גם הסיכון. אין דרך לעקוף את החוק הזה."
    },
    {
      "vid": "risk",
      "src": "מתוך הסרטון: סיכון מול תשואה (כיתות ו׳-ז׳)",
      "q": "מה זה פיזור, כשמדברים על סיכון?",
      "a": [
        "לא שמים את כל הביצים בסל אחד",
        "קונים רק מניה אחת",
        "מוכרים הכול"
      ],
      "why": "מחלקים את הכסף בין כמה מקומות. אם סל אחד נופל, נשארו עוד."
    },
    {
      "vid": "credit",
      "src": "מתוך הסרטון: אשראי, הלוואות ומה שביניהם (כיתות ו׳-ז׳)",
      "q": "רוני אומר שכרטיס אשראי נראה בדיוק כמו כסף. מה אומרים בסרטון?",
      "a": [
        "הוא כסף מושאל שצריך להחזיר",
        "הוא כסף חינם",
        "הוא מתנה מהבנק"
      ],
      "why": "כרטיס אשראי נראה כמו כסף אבל הוא כסף מושאל שצריך להחזיר."
    },
    {
      "vid": "credit",
      "src": "מתוך הסרטון: אשראי, הלוואות ומה שביניהם (כיתות ו׳-ז׳)",
      "q": "מה קורה אם לא מחזירים את כל חוב האשראי בזמן?",
      "a": [
        "מצטברת ריבית, גם על הריבית הקודמת",
        "לא קורה כלום",
        "הבנק מוחק את החוב"
      ],
      "why": "מצטברת ריבית שמחושבת גם על הריבית הקודמת, וזו ריבית דריבית שעובדת נגדכם."
    },
    {
      "vid": "credit",
      "src": "מתוך הסרטון: אשראי, הלוואות ומה שביניהם (כיתות ו׳-ז׳)",
      "q": "מה הכלל הפשוט לאשראי, לפי הסרטון?",
      "a": [
        "לא קונים בכרטיס משהו שאין לנו כסף לשלם עליו",
        "קונים הכול בכרטיס",
        "משלמים רק חצי בכל חודש"
      ],
      "why": "אם אין לכם את הכסף היום, גם מחר לא יהיה."
    },
    {
      "vid": "smart-shopping",
      "src": "מתוך הסרטון: מבצע או מלכודת? (כיתות ד׳-ה׳)",
      "q": "רוני תמיד לוקח כשכתוב 1+1. מה השאלה היחידה שחשובה?",
      "a": [
        "האם הייתי קונה את המוצר גם בלי המבצע",
        "כמה אחוזים כתוב על השלט",
        "מי המותג"
      ],
      "why": "אם הייתם קונים בכל מקרה, המבצע חוסך. אם לא, לא חסכתם כלום."
    },
    {
      "vid": "smart-shopping",
      "src": "מתוך הסרטון: מבצע או מלכודת? (כיתות ד׳-ה׳)",
      "q": "מתי מבצע באמת חוסך כסף?",
      "a": [
        "כשהייתם קונים את המוצר בכל מקרה",
        "תמיד",
        "כשכתוב עליו חינם"
      ],
      "why": "בכל מצב אחר, המבצע הוא פשוט הוצאה בתחפושת."
    },
    {
      "vid": "smart-shopping",
      "src": "מתוך הסרטון: מבצע או מלכודת? (כיתות ד׳-ה׳)",
      "q": "איזה טריק מציעים כדי להשוות מחירים?",
      "a": [
        "להשוות מחיר ליחידה: מחלקים את המחיר בכמות",
        "לבחור תמיד את האריזה הגדולה",
        "להסתכל על גודל השלט"
      ],
      "why": "לפעמים האריזה הגדולה דווקא יקרה יותר, ולכן מחלקים את המחיר בכמות ומשווים."
    },
    {
      "vid": "goals",
      "src": "מתוך הסרטון: מציבים מטרה כספית (כיתות ד׳-ה׳)",
      "q": "רוני רוצה אופניים ב-1,200 שקל ואומר שאין לו סיכוי. מה הסוד לפי הסרטון?",
      "a": [
        "לחלק את המטרה לצעדים קטנים",
        "לחכות לבונוס",
        "להתייאש מהר"
      ],
      "why": "מטרה גדולה מחולקת לצעדים קטנים, וכל צעד לבד הוא קטן לגמרי."
    },
    {
      "vid": "goals",
      "src": "מתוך הסרטון: מציבים מטרה כספית (כיתות ד׳-ה׳)",
      "q": "איפה כדאי לסמן את ההתקדמות לקראת מטרה?",
      "a": [
        "איפה שרואים כל יום: לוח, מחברת או טלפון",
        "רק בסוף השנה",
        "אין צורך לסמן"
      ],
      "why": "כשרואים את הפס מתמלא, הרבה יותר קל להמשיך."
    },
    {
      "vid": "money-basics",
      "src": "מתוך הסרטון: מה זה בכלל כסף? (כיתות ג׳-ד׳)",
      "q": "בהתחלה כולם הסכימו לקבל דברים מסוימים כדי לקנות ולמכור. מה היו הדברים האלה?",
      "a": [
        "צדפים, אבנים יקרות וגושי מתכת",
        "שטרות נייר",
        "כרטיסי אשראי"
      ],
      "why": "בהתחלה היו אלה צדפים, אבנים יקרות או גושי מתכת."
    },
    {
      "vid": "money-basics",
      "src": "מתוך הסרטון: מה זה בכלל כסף? (כיתות ג׳-ד׳)",
      "q": "למה מטבעות המתכת היו באותו גודל ובאותו ערך?",
      "a": [
        "כדי שאי אפשר יהיה לרמות",
        "כדי שיהיו יפים",
        "כדי שיהיו כבדים"
      ],
      "why": "לכולם אותו גודל ואותו ערך, ולכן אי אפשר לרמות."
    },
    {
      "vid": "money-basics",
      "src": "מתוך הסרטון: מה זה בכלל כסף? (כיתות ג׳-ד׳)",
      "q": "איזו בעיה במטבעות מתכת גרמה להמציא שטרות נייר?",
      "a": [
        "הם כבדים מאוד לסחוב",
        "הם זולים מדי",
        "הם נשברים"
      ],
      "why": "מטבעות היו כבדים מאוד, ושטרות נייר קלים לשאת בכיס."
    },
    {
      "vid": "money-basics",
      "src": "מתוך הסרטון: מה זה בכלל כסף? (כיתות ג׳-ד׳)",
      "q": "איך מעבירים היום את רוב הכסף בעולם?",
      "a": [
        "בכרטיס או בטלפון, כמספרים במחשב",
        "רק במטבעות מתכת",
        "רק בשטרות נייר"
      ],
      "why": "היום רוב הכסף הוא מספרים במחשב, שמעבירים בכרטיס או בטלפון בלי לגעת בהם."
    },
    {
      "vid": "needs-wants",
      "src": "מתוך הסרטון: צורך או רצון? (כיתות ג׳-ד׳)",
      "q": "איזו שאלה אחת עוזרת בכל החלטה על הוצאה?",
      "a": [
        "אני חייב את זה, או שאני רק רוצה?",
        "כמה זה עולה?",
        "מי עוד קנה את זה?"
      ],
      "why": "זו השאלה שעוזרת בכל החלטה: חייבים או רק רוצים."
    },
    {
      "vid": "needs-wants",
      "src": "מתוך הסרטון: צורך או רצון? (כיתות ג׳-ד׳)",
      "q": "מה נחשב רצון, לפי הסרטון?",
      "a": [
        "צעצוע חדש, ממתק או נעליים יפות יותר",
        "אוכל ומים",
        "בגדים וקורת גג"
      ],
      "why": "רצון הוא משהו שנעים שיהיה לנו, אבל אפשר גם בלי. וזה בסדר גמור."
    },
    {
      "vid": "needs-wants",
      "src": "מתוך הסרטון: צורך או רצון? (כיתות ג׳-ד׳)",
      "q": "מה אומרים בסרטון על השלטים והמוזיקה בחנות?",
      "a": [
        "הם בנויים כדי שהכול ייראה לנו חשוב",
        "הם עוזרים לבחור רק צרכים",
        "הם מורידים מחירים"
      ],
      "why": "השלטים והמוזיקה בנויים בדיוק בשביל זה, כדי שהכול ייראה כמו משהו שחייבים."
    },
    {
      "vid": "needs-wants",
      "src": "מתוך הסרטון: צורך או רצון? (כיתות ג׳-ד׳)",
      "q": "מה המסר בסוף הסרטון?",
      "a": [
        "לא לוותר על רצונות, רק לדעת מה זה מה לפני שמוציאים",
        "לוותר על כל הרצונות",
        "לקנות רק צרכים"
      ],
      "why": "וזו כל התשובה: לא לוותר, רק לדעת."
    },
    {
      "vid": "needs-wants",
      "src": "מתוך הסרטון: צורך או רצון? (כיתות ג׳-ד׳)",
      "q": "איפה מופיע החיסכון בסדר ההוצאות, לפי הסרטון?",
      "a": [
        "הוא לא נשאר אחרון בתור",
        "תמיד בסוף הרשימה",
        "הוא לא חשוב"
      ],
      "why": "הסרטון אומר שהחיסכון לא נשאר אחרון בתור."
    }
  ];

  const TANK_MATH = [
    {
      "vid": "saving-habit",
      "src": "מתוך הסרטון: הכלל של 50-30-20 (כיתות ה׳-ו׳)",
      "q": "קיבלתם מאה שקל ומחלקים לפי 50-30-20 (צרכים, רצונות, חיסכון). כמה הולך לחיסכון?",
      "a": [
        "20",
        "30",
        "50"
      ],
      "why": "20 אחוז לחיסכון, כלומר 20 שקל."
    },
    {
      "vid": "saving-habit",
      "src": "מתוך הסרטון: הכלל של 50-30-20 (כיתות ה׳-ו׳)",
      "q": "קיבלתם מאה שקל ומחלקים לפי 50-30-20 (צרכים, רצונות, חיסכון). כמה הולך לצרכים?",
      "a": [
        "50",
        "20",
        "30"
      ],
      "why": "50 אחוז הולכים לצרכים, כלומר 50 שקל מהמאה."
    },
    {
      "vid": "saving-habit",
      "src": "מתוך הסרטון: הכלל של 50-30-20 (כיתות ה׳-ו׳)",
      "q": "קיבלתם מאה שקל ומחלקים לפי 50-30-20 (צרכים, רצונות, חיסכון). כמה הולך לרצונות?",
      "a": [
        "30",
        "20",
        "50"
      ],
      "why": "30 אחוז לרצונות, כלומר 30 שקל."
    },
    {
      "vid": "compound",
      "src": "מתוך הסרטון: ריבית דריבית - הקסם השקט (כיתות ו׳-ז׳)",
      "q": "100 שקל גדלים ב-10% בשנה. כמה יש אחרי שנה?",
      "a": [
        "110",
        "120",
        "100"
      ],
      "why": "10% מ-100 הם 10, ולכן אחרי שנה יש 110."
    },
    {
      "vid": "compound",
      "src": "מתוך הסרטון: ריבית דריבית - הקסם השקט (כיתות ו׳-ז׳)",
      "q": "100 שקל גדלים ב-10% בשנה בריבית דריבית. כמה יהיה אחרי שנתיים?",
      "a": [
        "121",
        "120",
        "110"
      ],
      "why": "לא 120, כי גם העשרה שקל שהרווחתם מרוויחים. יוצא 121."
    },
    {
      "vid": "compound",
      "src": "מתוך הסרטון: ריבית דריבית - הקסם השקט (כיתות ו׳-ז׳)",
      "q": "100 שקל בריבית דריבית של 10% הפכו ל-110 אחרי שנה. כמה הרווח בשנה השנייה?",
      "a": [
        "11",
        "10",
        "21"
      ],
      "why": "10% מ-110 הם 11, ולכן אחרי שנתיים יש 121."
    },
    {
      "vid": "compound",
      "src": "מתוך הסרטון: ריבית דריבית - הקסם השקט (כיתות ו׳-ז׳)",
      "q": "אחרי 30 שנה, 100 שקל בריבית דריבית הופכים ליותר מפי כמה?",
      "a": [
        "17",
        "3",
        "30"
      ],
      "why": "אחרי שלושים שנה אותם 100 שקל הופכים ליותר מפי שבע עשרה."
    },
    {
      "vid": "goals",
      "src": "מתוך הסרטון: מציבים מטרה כספית (כיתות ד׳-ה׳)",
      "q": "רוני רוצה אופניים ב-1,200 שקל ויחסוך סכום קבוע בכל חודש במשך שנה. כמה בחודש?",
      "a": [
        "100",
        "120",
        "12"
      ],
      "why": "1,200 חלקי 12 חודשים זה 100 שקל בחודש."
    },
    {
      "vid": "emergency-fund",
      "src": "מתוך הסרטון: קרן חירום - הכרית הרכה (כיתות ה׳-ו׳)",
      "q": "בקרן חירום שואפים ל-3 עד 6 חודשי הוצאות. אם ההוצאות הן 2,000 שקל בחודש, כמה זה 3 חודשים?",
      "a": [
        "6,000",
        "2,000",
        "12,000"
      ],
      "why": "3 כפול 2,000 זה 6,000 שקל."
    },
    {
      "vid": "emergency-fund",
      "src": "מתוך הסרטון: קרן חירום - הכרית הרכה (כיתות ה׳-ו׳)",
      "q": "בקרן חירום שואפים ל-3 עד 6 חודשי הוצאות. אם ההוצאות הן 2,000 שקל בחודש, כמה זה 6 חודשים?",
      "a": [
        "12,000",
        "6,000",
        "8,000"
      ],
      "why": "6 כפול 2,000 זה 12,000 שקל."
    },
    {
      "vid": "smart-shopping",
      "src": "מתוך הסרטון: מבצע או מלכודת? (כיתות ד׳-ה׳)",
      "q": "כדי להשוות מחיר ליחידה מחלקים את המחיר בכמות. חבילה של 10 יחידות עולה 50 שקל. כמה עולה יחידה?",
      "a": [
        "5",
        "10",
        "40"
      ],
      "why": "50 חלקי 10 זה 5 שקלים ליחידה."
    }
  ];

  const HUNT_MESSAGES = [
    {from: "SMS · 050-1234567", text: "זכיתם ב-10,000 ש״ח! שלחו מספר כרטיס אשראי כדי לקבל את הפרס.", scam: true,
     why: "גוף אמיתי לא מבקש פרטי אשראי כדי לתת פרס."},
    {from: "הבנק שלכם", text: "חיוב של 39.90 ש״ח עבור המנוי שלכם בוצע ביום ראשון.", scam: false,
     why: "הודעת עדכון רגילה, בלי קישור ובלי בקשה לפרטים."},
    {from: "חברת שליחויות", text: "החבילה שלכם תקועה. לחצו על הקישור ושלמו 3 ש״ח דמי טיפול.", scam: true,
     why: "תשלום קטן בקישור הוא דרך נפוצה לגנוב פרטי אשראי."},
    {from: "אמא", text: "העברתי לך 50 ש״ח. תבדוק באפליקציה של הבנק.", scam: false,
     why: "מי שמכירים, ובודקים באפליקציה הרשמית ולא בקישור."},
    {from: "הודעה חשובה", text: "החשבון שלך ייחסם בעוד שעה! היכנסו מיד: bank-login-help.example", scam: true,
     why: "לחץ של זמן וקישור לא רשמי הם סימנים להונאה."},
    {from: "חברת החשמל", text: "החשבונית החודשית זמינה באזור האישי באתר החברה.", scam: false,
     why: "אין לחץ ואין בקשה לפרטים, והיא מפנה לאתר הרשמי."},
    {from: "מספר לא מוכר", text: "אני נציג השקעות. תכפילו כל סכום תוך שבוע, בלי סיכון!", scam: true,
     why: "אין השקעה בלי סיכון שמכפילה כסף בשבוע."},
    {from: "בית הספר", text: "תזכורת: מחר טיול שנתי. להביא בקבוק מים וכובע.", scam: false,
     why: "אין בקשה לכסף או לפרטים אישיים."},
    {from: "WhatsApp · מספר חדש", text: "אמא, זה המספר החדש שלי. תעבירי לי 800 ש״ח דחוף לתיקון הטלפון.", scam: true,
     why: "התחזות לבן משפחה. מתקשרים למספר הישן כדי לוודא."},
    {from: "חנות הספרים", text: "קיבלתם קופון 10% הנחה לקנייה הבאה, בתוקף עד סוף החודש.", scam: false,
     why: "הנחה רגילה, בלי בקשה לתשלום מראש או לפרטים אישיים."},
    {from: "הודעה רשמית", text: "מגיע לכם החזר של 1,840 ש״ח. הכניסו קוד זהות וסיסמת בנק להמשך.", scam: true,
     why: "גוף רשמי לעולם לא מבקש סיסמת בנק."},
    {from: "אפליקציית הקניות", text: "קוד האימות שלך הוא 482915. אל תשתפו אותו עם אף אחד.", scam: false,
     why: "זה קוד שביקשתם בעצמכם, וההודעה אומרת לא לשתף."}
  ];

  /* ---------- ציורים ---------- */

  function xTank(ctx, cx, by, s, body) {
    const S = n => Math.round(n * s);
    ctx.fillStyle = "#2f3a2c";
    ctx.fillRect(cx - S(2), by - S(66), S(5), S(30));
    ctx.fillStyle = "#3b3f46";
    ctx.fillRect(cx - S(34), by - S(14), S(68), S(14));
    ctx.fillStyle = "#6b7280";
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(cx - S(24) + i * S(16), by - S(7), S(5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = body || "#5f8f4a";
    ctx.fillRect(cx - S(28), by - S(28), S(56), S(15));
    ctx.fillStyle = "#4d7a3b";
    ctx.fillRect(cx - S(17), by - S(40), S(34), S(14));
    ctx.fillStyle = "rgba(255,255,255,.25)";
    ctx.fillRect(cx - S(14), by - S(37), S(14), S(3));
  }

  function xBalloon(ctx, cx, cy, rx, ry, color) {
    ctx.strokeStyle = "rgba(22,35,58,.45)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy + ry);
    ctx.quadraticCurveTo(cx - 8, cy + ry + 14, cx + 3, cy + ry + 26);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, cy + ry - 1);
    ctx.lineTo(cx - 6, cy + ry + 8);
    ctx.lineTo(cx + 6, cy + ry + 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.28)";
    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.45, cy - ry * 0.45, rx * 0.16, ry * 0.26, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function wrapLines(ctx, text, maxW) {
    const words = text.split(" ");
    const lines = [];
    let cur = "";
    words.forEach(w => {
      const test = cur ? cur + " " + w : w;
      if (cur && ctx.measureText(test).width > maxW) { lines.push(cur); cur = w; }
      else cur = test;
    });
    if (cur) lines.push(cur);
    return lines;
  }

  function balloonText(ctx, text, cx, cy, rx, ry) {
    ctx.save();
    ctx.direction = "rtl";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "rgba(0,0,0,.35)";
    ctx.shadowBlur = 2;
    const maxW = rx * 1.5;
    let size = 16;
    let lines;
    for (; size >= 10; size--) {
      ctx.font = "800 " + size + "px " + FONT;
      lines = wrapLines(ctx, text, maxW);
      if (lines.length * (size + 2) <= ry * 1.55) break;
    }
    const lh = size + 2;
    const top = cy - ((lines.length - 1) * lh) / 2;
    lines.forEach((ln, i) => ctx.fillText(ln, cx, top + i * lh));
    ctx.restore();
  }

  /* ---------- טנקים נגד בלונים ---------- */

  const MG_TANK = {
    howto: "הזיזו את הטנק (חצים או גרירה) וירו (רווח או לחיצה) על הבלון עם התשובה הנכונה.",
    build(host, cfg, api) {
      const rounds = shuffled(cfg.questions).slice(0, cfg.count || 8);
      mgHead(host, this.howto, cfg.need, rounds.length);
      const dots = mgDots(host, rounds.length);

      const canvas = mgCanvas(TW, TH, "tank-canvas");
      host.appendChild(canvas);
      const ctx = canvas.getContext("2d");

      const pad = mgEl("div", "tank-pad");
      const bL = mgEl("button", "tank-btn", "◀ שמאלה");
      const bF = mgEl("button", "tank-btn tank-fire", "ירי");
      const bR = mgEl("button", "tank-btn", "ימינה ▶");
      [bL, bF, bR].forEach(b => { b.type = "button"; pad.appendChild(b); });
      host.appendChild(pad);
      const feedback = mgFeedback(host);

      const st = {
        x: TW / 2, target: null, wantFire: false, kl: false, kr: false, bl: false, br: false,
        bullet: null, lastShot: -9, time: 0, elapsed: 0, limit: 28,
        round: null, index: 0, qText: "", src: "", answerCb: null, balloons: [], parts: [], done: false
      };
      let raf = 0;
      let alive = true;
      let prev = 0;

      function stopAll() {
        alive = false;
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", onKey);
        document.removeEventListener("keyup", onKeyUp);
      }

      function usable(e) {
        const t = e.target;
        if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return false;
        return canvas.isConnected && canvas.offsetParent !== null;
      }
      function onKey(e) {
        if (!usable(e)) return;
        const k = e.key;
        if (k === "ArrowLeft" || k === "a" || k === "A") { st.kl = true; e.preventDefault(); }
        else if (k === "ArrowRight" || k === "d" || k === "D") { st.kr = true; e.preventDefault(); }
        else if ((k === " " || k === "ArrowUp") && !(e.target && e.target.tagName === "BUTTON")) {
          e.preventDefault();
          fire();
        }
      }
      function onKeyUp(e) {
        const k = e.key;
        if (k === "ArrowLeft" || k === "a" || k === "A") st.kl = false;
        if (k === "ArrowRight" || k === "d" || k === "D") st.kr = false;
      }
      document.addEventListener("keydown", onKey);
      document.addEventListener("keyup", onKeyUp);

      function holdBtn(btn, key) {
        const on = e => { e.preventDefault(); st[key] = true; };
        const off = () => { st[key] = false; btn.blur(); };
        btn.addEventListener("pointerdown", on);
        btn.addEventListener("pointerup", off);
        btn.addEventListener("pointerleave", off);
        btn.addEventListener("pointercancel", off);
      }
      holdBtn(bL, "bl");
      holdBtn(bR, "br");
      bF.addEventListener("pointerdown", e => { e.preventDefault(); fire(); });
      bF.addEventListener("pointerup", () => bF.blur());

      function pointerX(e) {
        const r = canvas.getBoundingClientRect();
        return ((e.clientX - r.left) * TW) / r.width;
      }
      canvas.addEventListener("pointerdown", e => {
        e.preventDefault();
        st.target = pointerX(e);
        st.wantFire = true;
      });
      canvas.addEventListener("pointermove", e => {
        if (e.pointerType === "mouse" || e.buttons) st.target = pointerX(e);
      });

      function fire() {
        if (st.done || !st.round || st.bullet) return;
        if (st.time - st.lastShot < 0.35) return;
        st.lastShot = st.time;
        st.bullet = {x: st.x, y: GROUND - 74};
        if (typeof playSfx === "function") { try { playSfx("tap"); } catch (err) {} }
      }

      function pop(b) {
        b.popped = true;
        for (let i = 0; i < 16; i++) {
          const a = (Math.PI * 2 * i) / 16;
          st.parts.push({x: b.x, y: b.y, vx: Math.cos(a) * (90 + Math.random() * 90),
            vy: Math.sin(a) * (90 + Math.random() * 90), life: 0.55, color: b.color});
        }
      }

      function settle(idx, timeout) {
        if (st.done) return;
        st.done = true;
        st.bullet = null;
        const hit = idx == null ? null : st.balloons[idx];
        const ok = !!(hit && hit.right);
        if (hit) pop(hit);
        dots.mark(st.index, ok);
        feedback.show(ok, (timeout ? "נגמר הזמן. " : ok ? "פגיעה! " : "לא זו התשובה. ") + st.round.why);
        st.answerCb(ok, st.round.why);
      }

      function update(dt) {
        st.time += dt;
        const dir = (st.kr || st.br ? 1 : 0) - (st.kl || st.bl ? 1 : 0);
        if (dir) {
          st.x += dir * 300 * dt;
          st.target = null;
          st.wantFire = false;
        } else if (st.target != null) {
          const diff = st.target - st.x;
          const step = 380 * dt;
          if (Math.abs(diff) <= step) {
            st.x = st.target;
            st.target = null;
            if (st.wantFire) { st.wantFire = false; fire(); }
          } else st.x += Math.sign(diff) * step;
        }
        st.x = Math.max(34, Math.min(TW - 34, st.x));

        st.balloons.forEach(b => {
          if (b.popped) return;
          b.x += b.vx * dt;
          if (b.x < b.rx + 4) { b.x = b.rx + 4; b.vx = Math.abs(b.vx); }
          if (b.x > TW - b.rx - 4) { b.x = TW - b.rx - 4; b.vx = -Math.abs(b.vx); }
          b.y = b.baseY + Math.sin(st.time * b.sp + b.ph) * 8;
        });

        if (st.bullet) {
          st.bullet.y -= 640 * dt;
          const bu = st.bullet;
          if (bu.y < -10) st.bullet = null;
          else if (!st.done) {
            for (let i = 0; i < st.balloons.length; i++) {
              const b = st.balloons[i];
              if (b.popped) continue;
              const dx = (bu.x - b.x) / b.rx;
              const dy = (bu.y - b.y) / (b.ry + 3);
              if (dx * dx + dy * dy <= 1) { settle(i, false); break; }
            }
          }
        }

        if (!st.done && st.round) {
          st.elapsed += dt;
          if (st.elapsed >= st.limit) settle(null, true);
        }
        st.parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.life -= dt; });
        st.parts = st.parts.filter(p => p.life > 0);
      }

      function draw() {
        const g = ctx.createLinearGradient(0, 0, 0, TH);
        g.addColorStop(0, "#bfe0ff");
        g.addColorStop(1, "#eef8ff");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, TW, TH);
        ctx.fillStyle = "rgba(255,255,255,.8)";
        [[90, 40, 34], [150, 46, 26], [470, 30, 30], [525, 38, 22]].forEach(c => {
          ctx.beginPath(); ctx.arc(c[0], c[1], c[2], 0, Math.PI * 2); ctx.fill();
        });
        ctx.fillStyle = "#7da35a";
        ctx.fillRect(0, GROUND, TW, TH - GROUND);
        ctx.fillStyle = "#5f8444";
        ctx.fillRect(0, GROUND, TW, 5);

        /* שעון */
        const left = Math.max(0, 1 - st.elapsed / st.limit);
        ctx.fillStyle = "rgba(22,35,58,.15)";
        ctx.fillRect(0, 0, TW, 8);
        ctx.fillStyle = left > 0.25 ? "#1f7a5a" : "#d94a4a";
        ctx.fillRect(0, 0, TW * left, 8);

        /* השאלה בתוך המסך, למעלה, עם שם הסרטון שממנו היא לקוחה */
        ctx.fillStyle = "rgba(255,255,255,.93)";
        ctx.strokeStyle = "#16233a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(12, 14, TW - 24, 84, 12); else ctx.rect(12, 14, TW - 24, 84);
        ctx.fill();
        ctx.stroke();
        ctx.save();
        ctx.direction = "rtl";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        let top = 22;
        if (st.src) {
          ctx.font = "700 12px " + FONT;
          ctx.fillStyle = "#1f7a5a";
          ctx.fillText("🎬 " + st.src, TW / 2, 28);
          top = 34;
        }
        ctx.fillStyle = "#16233a";
        const room = 96 - top - 2;
        let qs = 21;
        let qLines;
        for (; qs >= 12; qs--) {
          ctx.font = "800 " + qs + "px " + FONT;
          qLines = wrapLines(ctx, st.qText, TW - 56);
          if (qLines.length * (qs + 3) <= room) break;
        }
        const qTop = top + room / 2 - ((qLines.length - 1) * (qs + 3)) / 2;
        qLines.forEach((ln, i) => ctx.fillText(ln, TW / 2, qTop + i * (qs + 3)));
        ctx.restore();

        st.balloons.forEach(b => {
          if (b.popped) return;
          xBalloon(ctx, b.x, b.y, b.rx, b.ry, b.color);
          balloonText(ctx, b.text, b.x, b.y, b.rx, b.ry);
          if (st.done && b.right) {
            ctx.strokeStyle = "#1f7a5a";
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.ellipse(b.x, b.y, b.rx + 4, b.ry + 4, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        });

        if (st.bullet) {
          ctx.fillStyle = "#f5c542";
          ctx.strokeStyle = "#16233a";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(st.bullet.x, st.bullet.y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        xTank(ctx, st.x, GROUND + 2, 1, "#5f8f4a");
        st.parts.forEach(p => {
          ctx.globalAlpha = Math.max(0, p.life / 0.55);
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
        });
        ctx.globalAlpha = 1;
      }

      function frame(ts) {
        if (!alive) return;
        if (!canvas.isConnected) { stopAll(); return; }
        if (canvas.offsetParent === null) { prev = ts; raf = requestAnimationFrame(frame); return; }
        const dt = Math.min(0.05, ((ts - prev) / 1000) || 0);
        prev = ts;
        update(dt);
        draw();
        raf = requestAnimationFrame(frame);
      }

      function setupRound(round, index, answer) {
        feedback.clear();
        st.round = round;
        st.index = index;
        st.answerCb = answer;
        st.done = false;
        st.bullet = null;
        st.elapsed = 0;
        st.parts = [];
        st.qText = "שאלה " + (index + 1) + ": " + round.q;
        st.src = round.src || "";
        const opts = shuffled(round.a.map((text, i) => ({text, right: i === 0})));
        const xs = shuffled([120, 320, 520]);
        const ys = [160, 240, 320];
        const cols = shuffled(BALLOON_COLORS);
        st.balloons = opts.map((o, i) => ({
          text: o.text, right: o.right, color: cols[i], rx: 62, ry: 44,
          x: xs[i], baseY: ys[i], y: ys[i], vx: (Math.random() < 0.5 ? -1 : 1) * (36 + Math.random() * 36),
          sp: 1.3 + Math.random(), ph: Math.random() * 6, popped: false
        }));
      }

      const wrapApi = {
        finish(won) { stopAll(); api.finish(won); },
        progress() { return api.progress.apply(api, arguments); }
      };
      mgRunner(rounds, cfg.need, wrapApi, setupRound);
      raf = requestAnimationFrame(frame);
    }
  };

  /* ---------- ציד הונאות ---------- */

  const MG_HUNT = {
    howto: "הודעות קופצות. לחצו רק על הונאות. הודעה אמיתית - תשאירו, והיא תיעלם.",
    build(host, cfg, api) {
      const msgs = shuffled(cfg.messages).slice(0, cfg.count || 10);
      mgHead(host, this.howto, cfg.need, msgs.length);
      const dots = mgDots(host, msgs.length);
      const board = mgEl("div", "hunt-board");
      const slots = [];
      for (let i = 0; i < 4; i++) {
        const s = mgEl("div", "hunt-slot");
        board.appendChild(s);
        slots.push(s);
      }
      host.appendChild(board);
      const feedback = mgFeedback(host);
      const ms = cfg.ms || 4500;

      mgRunner(msgs, cfg.need, api, (item, index, answer) => {
        feedback.clear();
        slots.forEach(s => { s.innerHTML = ""; });
        const slot = slots[Math.floor(Math.random() * slots.length)];
        const card = mgEl("button", "hunt-card");
        card.type = "button";
        card.appendChild(mgEl("span", "hunt-from", item.from));
        card.appendChild(mgEl("span", "hunt-text", item.text));
        const bar = mgEl("span", "hunt-bar");
        card.appendChild(bar);
        slot.appendChild(card);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          bar.style.transitionDuration = ms + "ms";
          bar.style.width = "0%";
        }));

        let settled = false;
        function done(tapped) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          card.disabled = true;
          const ok = tapped ? item.scam : !item.scam;
          card.classList.add(ok ? "right" : "wrong");
          bar.style.display = "none";
          let lead;
          if (tapped) lead = item.scam ? "פוצצתם הונאה! " : "זו הודעה אמיתית. ";
          else lead = item.scam ? "פספסתם הונאה. " : "נכון, אפשר להשאיר. ";
          dots.mark(index, ok);
          feedback.show(ok, lead + item.why);
          answer(ok, item.why);
        }
        const timer = setTimeout(() => { if (card.isConnected) done(false); else settled = true; }, ms);
        card.addEventListener("click", () => done(true));
      });
    }
  };

  MINIGAMES.tank = MG_TANK;
  MINIGAMES.hunt = MG_HUNT;

  /* ---------- הוספה לתפריט המשחקים ---------- */

  function tileTank(ctx, W, H) {
    ctx.fillStyle = "#e8574a";
    ctx.beginPath(); ctx.ellipse(W / 2 - 34, H / 2 - 20, 18, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3f8fd8";
    ctx.beginPath(); ctx.ellipse(W / 2 + 30, H / 2 - 30, 16, 20, 0, 0, Math.PI * 2); ctx.fill();
    xTank(ctx, W / 2, H - 12, 0.8, "#5f8f4a");
  }

  ARCADE_GAMES.push(
    {
      id: "tank-know", game: "tank", title: "טנקים נגד בלונים",
      blurb: "שאלה מתוך הסרטונים של הכיתה שלכם ושלושה בלונים עם תשובות. פוצצו את הנכון לפני שנגמר הזמן.",
      skill: "לזכור מה למדתם בסרטונים",
      config: () => tankConfig(TANK_KNOW),
      art: tileTank
    },
    {
      id: "tank-math", game: "tank", title: "טנקים: חשבון כספי",
      blurb: "החישובים מהסרטונים: 50-30-20, ריבית דריבית, מטרות וקרן חירום. כוונו אל התוצאה הנכונה.",
      skill: "לחשב בראש את מה שלמדתם בסרטונים",
      config: () => tankConfig(TANK_MATH),
      art: tileTank
    },
    {
      id: "scam-hunt", game: "hunt", title: "ציד הונאות",
      blurb: "הודעות קופצות על המסך. לחצו על ההונאות ותשאירו את האמיתיות.",
      skill: "לזהות הונאה במבט מהיר",
      config: () => ({messages: HUNT_MESSAGES, count: 10, need: 7, ms: 4500}),
      art: (ctx, W, H) => {
        ctx.fillStyle = "#f0e6cc";
        ctx.fillRect(W / 2 - 40, H / 2 - 28, 80, 56);
        ctx.fillStyle = "#c97a1f";
        ctx.fillRect(W / 2 - 30, H / 2 - 16, 60, 6);
        ctx.fillRect(W / 2 - 30, H / 2 - 2, 44, 6);
        ctx.fillStyle = "#d94a4a";
        ctx.beginPath(); ctx.arc(W / 2 + 36, H / 2 + 22, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "800 20px " + FONT;
        ctx.textAlign = "center";
        ctx.fillText("!", W / 2 + 36, H / 2 + 29);
      }
    }
  );
})();

