/* ===== משחקי כסף נוספים: טנקים נגד בלונים, וציד הונאות ===== */
(function () {
  const TW = 640;
  const TH = 470;
  const GROUND = 430;
  const BALLOON_COLORS = ["#e8574a", "#3f8fd8", "#f0a93f", "#7b5cd6", "#4f9e5c"];
  const FONT = 'system-ui, "Segoe UI", Arial, sans-serif';

  /* ---------- שאלות ---------- */

  const TANK_KNOW = [
    {
      "src": "מתוך הסרטון: מה זה בכלל כסף?",
      "q": "מובי רוצה תפוח ואין לו כסף. איך אנשים היו משיגים דברים לפני שהיה כסף?",
      "a": [
        "סחר חליפין, מחליפים דבר בדבר",
        "משלמים בכרטיס אשראי",
        "לוקחים הלוואה מהבנק"
      ],
      "why": "ינשוף: ככה עבד העולם פעם, וזה נקרא סחר חליפין."
    },
    {
      "src": "מתוך הסרטון: מה זה בכלל כסף?",
      "q": "מובי שואל למה לנייר קטן יש ערך. מה התשובה של ינשוף?",
      "a": [
        "כי כולנו מסכימים שהוא שווה משהו",
        "כי הוא עשוי מנייר יקר",
        "כי המדינה מחליטה מחדש כל יום"
      ],
      "why": "כסף הוא אמון, לא רק נייר."
    },
    {
      "src": "מתוך הסרטון: צורך או רצון?",
      "q": "מובי רוצה נעליים חדשות, אבל יש לו נעליים שלמות בבית. מה זה?",
      "a": [
        "רצון, לא צורך",
        "צורך דחוף",
        "הוצאה שחייבים"
      ],
      "why": "ינשוף: זה רצון, לא צורך, וזה בסדר גמור."
    },
    {
      "src": "מתוך הסרטון: צורך או רצון?",
      "q": "מובי שואל אם אסור לו לקנות דברים שהוא רוצה. מה ינשוף עונה?",
      "a": [
        "מותר, אחרי שמכסים צרכים",
        "אסור לקנות דברים שרוצים",
        "קודם מתפנקים ואז צרכים"
      ],
      "why": "מותר, אבל קודם מכסים צרכים ואז מתפנקים ממה שנשאר."
    },
    {
      "src": "מתוך הסרטון: בונים תקציב ראשון",
      "q": "ינשוף מלמד את מובי לבנות תקציב. מה זה תקציב?",
      "a": [
        "תוכנית: כמה נכנס וכמה יוצא",
        "חשבון בנק מיוחד",
        "רשימת קניות"
      ],
      "why": "ינשוף: תקציב זה פשוט תוכנית של כמה נכנס וכמה יוצא."
    },
    {
      "src": "מתוך הסרטון: בונים תקציב ראשון",
      "q": "בונים תקציב בשלושה שלבים. מה עושים בשלב הראשון?",
      "a": [
        "רושמים את כל ההכנסות",
        "מחליטים מה לקנות",
        "פותחים כרטיס אשראי"
      ],
      "why": "שלב 1: רושמים את כל ההכנסות, כמו דמי כיס, עבודה ומתנות."
    },
    {
      "src": "מתוך הסרטון: בונים תקציב ראשון",
      "q": "בתקציב צריך להחליט כמה כסף הולך לחיסכון. מתי עושים את זה?",
      "a": [
        "לפני שמוציאים, לא אחרי",
        "בסוף החודש, ממה שנשאר",
        "רק כשיש בונוס"
      ],
      "why": "מחליטים כמה הולך לחיסכון לפני שמוציאים, לא אחרי."
    },
    {
      "src": "מתוך הסרטון: הכלל של 50-30-20",
      "q": "מובי קיבל 100 שקל, וינשוף מלמד אותו כלל לחלוקה. איך מחלקים לפי 50-30-20?",
      "a": [
        "50 צרכים, 30 רצונות, 20 חיסכון",
        "50 חיסכון, 30 צרכים, 20 רצונות",
        "50 רצונות, 30 חיסכון, 20 צרכים"
      ],
      "why": "50 לצרכים, 30 לרצונות ו-20 לחיסכון."
    },
    {
      "src": "מתוך הסרטון: הכלל של 50-30-20",
      "q": "מובי קיבל 100 שקל והחליט לחסוך 20. מתי הוא מעביר אותם לחיסכון?",
      "a": [
        "מיד, לפני שהוא מתחרט",
        "בסוף החודש",
        "אחרי שהוא קונה מה שרוצה"
      ],
      "why": "חיסכון ראשון, פיתויים אחר כך."
    },
    {
      "src": "מתוך הסרטון: קרן חירום - הכרית הרכה",
      "q": "ינשוף שואל מה יקרה אם הטלפון של מובי ישבר מחר ואין לו כסף. מה פותר את זה?",
      "a": [
        "קרן חירום, כסף ששמור להפתעות",
        "כסף לחופשה",
        "השקעה במניות"
      ],
      "why": "קרן חירום היא כסף ששמור רק להפתעות."
    },
    {
      "src": "מתוך הסרטון: קרן חירום - הכרית הרכה",
      "q": "מבוגרים שואפים לקרן חירום של 3 עד 6 חודשי הוצאות. מה ינשוף מציע למי שרק מתחיל?",
      "a": [
        "סכום שמכסה תיקון או קנייה דחופה אחת",
        "לחכות עד שיש 6 חודשי הוצאות",
        "לא להתחיל לפני הבגרות"
      ],
      "why": "להתחיל בסכום שמכסה תיקון או קנייה דחופה אחת, וזה כבר המון."
    },
    {
      "src": "מתוך הסרטון: ריבית דריבית - הקסם השקט",
      "q": "100 שקל בריבית של 10% בשנה הופכים ל-110 אחרי שנה. למה אחרי שנתיים יש 121 ולא 120?",
      "a": [
        "כי גם הרווח של השנה הראשונה מרוויח",
        "כי הבנק מוסיף בונוס",
        "כי המחירים עולים"
      ],
      "why": "גם ה-10 שקל שהרווחת מרוויחים, וזו ריבית דריבית."
    },
    {
      "src": "מתוך הסרטון: ריבית דריבית - הקסם השקט",
      "q": "ינשוף מראה למובי איך 100 שקל גדלים לאורך שנים. מי החבר הכי טוב של הכסף, לפי מובי?",
      "a": [
        "הזמן",
        "המזל",
        "הבנק"
      ],
      "why": "הזמן הוא החבר הכי טוב של הכסף."
    },
    {
      "src": "מתוך הסרטון: סיכון מול תשואה",
      "q": "מובי ראה פרסומת שמבטיחה 300% רווח בחודש בלי סיכון. מה ינשוף אומר?",
      "a": [
        "זה לא קיים: תשואה גבוהה היא סיכון גבוה",
        "זו הזדמנות מצוינת",
        "זה בסדר אם הפרסומת מפורסמת"
      ],
      "why": "תשואה גבוהה תמיד מגיעה עם סיכון גבוה."
    },
    {
      "src": "מתוך הסרטון: סיכון מול תשואה",
      "q": "ינשוף אומר למובי לא לשים את כל הביצים בסל אחד. מה זה אומר בכסף?",
      "a": [
        "מפזרים ולא שמים הכול במקום אחד",
        "קונים ביצים רק בסופר",
        "חוסכים רק בקופסה"
      ],
      "why": "מפזרים, כלומר לא שמים את כל הכסף במקום אחד."
    },
    {
      "src": "מתוך הסרטון: אשראי, הלוואות ומה שביניהם",
      "q": "מובי חושב שכרטיס אשראי הוא כסף חינם. מה ינשוף עונה?",
      "a": [
        "זה כסף מושאל שצריך להחזיר",
        "נכון, זה כסף חינם",
        "זו מתנה מהבנק"
      ],
      "why": "ינשוף: ממש לא, זה כסף מושאל שצריך להחזיר."
    },
    {
      "src": "מתוך הסרטון: אשראי, הלוואות ומה שביניהם",
      "q": "כשקונים באשראי ולא מחזירים בזמן, מה קורה?",
      "a": [
        "משלמים ריבית, ולפעמים על הריבית",
        "לא קורה כלום",
        "הבנק מוחק את החוב"
      ],
      "why": "משלמים ריבית, ולפעמים ריבית על הריבית."
    },
    {
      "src": "מתוך הסרטון: אשראי, הלוואות ומה שביניהם",
      "q": "אחרי שמובי הבין איך אשראי עובד, הוא קבע לעצמו כלל חדש. מה הכלל?",
      "a": [
        "לא קונה באשראי מה שאין לי לשלם",
        "קונה הכול באשראי",
        "מחזיר רק חלק בכל חודש"
      ],
      "why": "לא קונה באשראי מה שאין לי כסף לשלם עליו."
    },
    {
      "src": "מתוך הסרטון: מבצע או מלכודת?",
      "q": "מובי ראה מבצע 1+1 חינם וחשב שחסך חצי. למה ינשוף אומר שלא תמיד חסכו?",
      "a": [
        "כי הוצאת כסף שלא תכננת",
        "כי המוצר פג תוקף",
        "כי המחיר תמיד עולה"
      ],
      "why": "אם לא היית קונה אחד במחיר מלא, לא חסכת."
    },
    {
      "src": "מתוך הסרטון: מבצע או מלכודת?",
      "q": "ינשוף מסביר איך מבדילים בין מבצע אמיתי למלכודת. מתי מבצע באמת שווה?",
      "a": [
        "כשקונים את זה בכל מקרה והמחיר נמוך",
        "כשהשלט גדול וצבעוני",
        "כשכתוב חינם"
      ],
      "why": "כשהיית קונה את המוצר בכל מקרה, והמחיר באמת נמוך יותר."
    },
    {
      "src": "מתוך הסרטון: מבצע או מלכודת?",
      "q": "אחרי השיעור על מבצעים, מובי מחליט מה לבדוק בכל קנייה. מה הוא יבדוק?",
      "a": [
        "את מחיר היחידה, לא את השלט",
        "רק את הצבע של השלט",
        "רק את שם המותג"
      ],
      "why": "מעכשיו הוא בודק את מחיר היחידה, לא את השלט."
    },
    {
      "src": "מתוך הסרטון: מציבים מטרה כספית",
      "q": "מובי רוצה אופניים ב-1,200 שקל ומרגיש שזה המון. מה הסוד לפי ינשוף?",
      "a": [
        "לחלק את המטרה לצעדים קטנים",
        "לחכות לבונוס",
        "לא לספר לאף אחד"
      ],
      "why": "מטרה גדולה מחולקת לצעדים קטנים."
    },
    {
      "src": "מתוך הסרטון: מציבים מטרה כספית",
      "q": "מובי הבין שאפשר לחסוך לאופניים. מה הוא עושה כדי להתחיל?",
      "a": [
        "מסמן על הקיר ומתחיל היום",
        "מחכה לשנה הבאה",
        "קונה אותם באשראי"
      ],
      "why": "הוא מסמן את זה על הקיר ומתחיל היום."
    }
  ];

  const TANK_MATH = [
    {
      "src": "מתוך הסרטון: הכלל של 50-30-20",
      "q": "מובי קיבל 100 שקל ומחלק לפי 50-30-20 (צרכים, רצונות, חיסכון). כמה הולך לחיסכון?",
      "a": [
        "20",
        "30",
        "50"
      ],
      "why": "20 אחוז הולכים לחיסכון, כלומר 20 שקל."
    },
    {
      "src": "מתוך הסרטון: הכלל של 50-30-20",
      "q": "מובי מחלק 100 שקל לפי 50-30-20 (צרכים, רצונות, חיסכון). כמה הולך לצרכים?",
      "a": [
        "50",
        "20",
        "30"
      ],
      "why": "50 מתוך 100 הולכים לצרכים."
    },
    {
      "src": "מתוך הסרטון: הכלל של 50-30-20",
      "q": "מובי מחלק 100 שקל לפי 50-30-20 (צרכים, רצונות, חיסכון). כמה הולך לרצונות?",
      "a": [
        "30",
        "20",
        "50"
      ],
      "why": "30 מתוך 100 הולכים לרצונות."
    },
    {
      "src": "מתוך הסרטון: ריבית דריבית - הקסם השקט",
      "q": "ינשוף שואל: 100 שקל גדלים ב-10% בשנה. כמה יש אחרי שנה?",
      "a": [
        "110",
        "120",
        "100"
      ],
      "why": "10% מ-100 הם 10, אז 110."
    },
    {
      "src": "מתוך הסרטון: ריבית דריבית - הקסם השקט",
      "q": "100 שקל גדלים ב-10% בשנה בריבית דריבית. כמה יהיה אחרי שנתיים?",
      "a": [
        "121",
        "120",
        "110"
      ],
      "why": "לא 120: גם ה-10 שקל שהרווחת מרוויחים, אז 121."
    },
    {
      "src": "מתוך הסרטון: ריבית דריבית - הקסם השקט",
      "q": "100 שקל בריבית דריבית של 10% הפכו ל-110 אחרי שנה. כמה הרווח בשנה השנייה?",
      "a": [
        "11",
        "10",
        "21"
      ],
      "why": "10% מ-110 הם 11, ולכן יש בסך הכול 121."
    },
    {
      "src": "מתוך הסרטון: מציבים מטרה כספית",
      "q": "מובי רוצה אופניים ב-1,200 שקל, ויחסוך אותו סכום בכל חודש במשך שנה. כמה בחודש?",
      "a": [
        "100",
        "120",
        "12"
      ],
      "why": "1,200 חלקי 12 חודשים זה 100 שקל בחודש."
    },
    {
      "src": "מתוך הסרטון: מציבים מטרה כספית",
      "q": "מובי רוצה אופניים ב-1,200 שקל, והפעם תוך 6 חודשים במקום שנה. כמה בחודש?",
      "a": [
        "200",
        "100",
        "600"
      ],
      "why": "1,200 חלקי 6 חודשים זה 200 שקל בחודש."
    },
    {
      "src": "מתוך הסרטון: קרן חירום - הכרית הרכה",
      "q": "בקרן חירום שואפים ל-3 עד 6 חודשי הוצאות. אם ההוצאות הן 2,000 שקל בחודש, כמה זה 3 חודשים?",
      "a": [
        "6,000",
        "2,000",
        "12,000"
      ],
      "why": "3 כפול 2,000 זה 6,000."
    },
    {
      "src": "מתוך הסרטון: מבצע או מלכודת?",
      "q": "בחנות יש מבצע 1+1 חינם על מוצר שעולה 20 שקל. כמה משלמים על שני מוצרים?",
      "a": [
        "20",
        "40",
        "10"
      ],
      "why": "משלמים רק על אחד, אבל רק אם היית קונה אותו בכל מקרה."
    },
    {
      "src": "מתוך הסרטון: סיכון מול תשואה",
      "q": "מובי ראה פרסומת שמבטיחה 300% רווח על 100 שקל. אם זה היה אמיתי, כמה היה לו בסך הכול?",
      "a": [
        "400",
        "300",
        "103"
      ],
      "why": "100 ועוד 300 זה 400. אבל ינשוף: רווח כזה בלי סיכון לא קיים."
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
      blurb: "שאלה מתוך הסרטונים של האתר ושלושה בלונים עם תשובות. פוצצו את הנכון לפני שנגמר הזמן.",
      skill: "לזכור מה למדתם בסרטונים",
      config: () => ({questions: TANK_KNOW, count: 8, need: 6}),
      art: tileTank
    },
    {
      id: "tank-math", game: "tank", title: "טנקים: חשבון כספי",
      blurb: "החישובים מהסרטונים: 50-30-20, ריבית דריבית, מטרות וקרן חירום. כוונו אל התוצאה הנכונה.",
      skill: "לחשב בראש את מה שלמדתם בסרטונים",
      config: () => ({questions: TANK_MATH, count: 8, need: 6}),
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
