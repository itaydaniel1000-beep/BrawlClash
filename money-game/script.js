/* ===== כסף חכם — לוגיקת האפליקציה ===== */

/* ---------- טיפים יומיים ---------- */

const dailyTips = [
  "לפני כל קנייה גדולה חכו 24 שעות. אם עדיין בא לכם - כנראה באמת התכוונתם.",
  "חיסכון קטן וקבוע עדיף על חיסכון גדול שקורה רק לפעמים.",
  "ריבית דריבית היא כמו כדור שלג: ככל שמתחילים מוקדם יותר, הוא גדל יותר.",
  "לפני שקונים, שאלו: זה צורך או רצון? שתי התשובות בסדר, אבל כדאי לדעת מה מהן.",
  "כסף שלא רואים - לא מוציאים. העבירו את החיסכון לחשבון נפרד ביום שמקבלים כסף.",
  "השוו מחירים בשלוש חנויות לפני קנייה יקרה. זה לוקח חמש דקות ויכול לחסוך מאות שקלים.",
  "כתבו כל הוצאה במשך שבוע אחד. רוב האנשים מופתעים מהתוצאה."
];

/* ---------- ספריית השיעורים ---------- */

const videos = [
  {
    id: "money-basics",
    title: "מה זה בכלל כסף?",
    description:
      "ינשוף ומובי מגלים איך אנשים עברו מסחר חליפין לשקלים, ולמה כולנו מסכימים שלנייר קטן יש ערך.",
    category: "basics",
    categoryLabel: "יסודות",
    icon: "💰",
    duration: "3:20",
    topic: "כסף",
    script: [
      { who: "owl", text: "מובי, מה היית עושה אם היית רוצה תפוח ואין לך כסף?" },
      { who: "mobi", text: "מחליף! נותן גבינה ומקבל תפוח." },
      { who: "owl", text: "בדיוק ככה עבד העולם פעם. זה נקרא סחר חליפין." },
      { who: "mobi", text: "אבל מה אם מי שיש לו תפוחים לא אוהב גבינה?" },
      { who: "owl", text: "בעיה! ולכן המציאו כסף - משהו שכולם מוכנים לקבל." },
      { who: "mobi", text: "אז לכסף יש ערך רק כי כולנו מסכימים על זה?" },
      { who: "owl", text: "נכון מאוד. כסף הוא אמון, לא רק נייר." }
    ]
  },
  {
    id: "needs-wants",
    title: "צורך או רצון?",
    description:
      "ההבדל בין מה שאנחנו חייבים לבין מה שבא לנו - הכלי הכי פשוט לשלוט בהוצאות.",
    category: "basics",
    categoryLabel: "יסודות",
    icon: "🤔",
    duration: "2:45",
    topic: "צרכנות",
    script: [
      { who: "mobi", text: "ינשוף, אני חייב את הנעליים החדשות! חייב!" },
      { who: "owl", text: "יש לך נעליים שלמות בבית?" },
      { who: "mobi", text: "כן... אבל האלה יותר יפות." },
      { who: "owl", text: "אז זה רצון, לא צורך. וזה בסדר גמור!" },
      { who: "mobi", text: "אז אסור לי לקנות דברים שאני רוצה?" },
      { who: "owl", text: "מותר. פשוט קודם מכסים צרכים, ואז מתפנקים ממה שנשאר." },
      { who: "mobi", text: "הבנתי - קודם החובה, אחר כך הכיף." }
    ]
  },
  {
    id: "budget",
    title: "בונים תקציב ראשון",
    description: "שלושה שלבים פשוטים להכנת תקציב חודשי שבאמת עובד, בלי אקסל מסובך.",
    category: "basics",
    categoryLabel: "יסודות",
    icon: "🧾",
    duration: "4:10",
    topic: "תקציב",
    script: [
      { who: "owl", text: "תקציב זה פשוט תוכנית: כמה נכנס, כמה יוצא." },
      { who: "mobi", text: "נשמע משעמם..." },
      { who: "owl", text: "עד שאתה מגלה שנשאר לך כסף בסוף החודש." },
      { who: "mobi", text: "אוקיי, איך מתחילים?" },
      { who: "owl", text: "שלב 1: רושמים את כל ההכנסות. דמי כיס, עבודה, מתנות." },
      { who: "owl", text: "שלב 2: רושמים הוצאות קבועות ומשתנות." },
      { who: "mobi", text: "ושלב 3?" },
      { who: "owl", text: "מחליטים כמה הולך לחיסכון - לפני שמוציאים, לא אחרי." }
    ]
  },
  {
    id: "saving-habit",
    title: "הכלל של 50-30-20",
    description:
      "איך לחלק כל שקל שנכנס: צרכים, רצונות וחיסכון - בלי לחשב כלום בראש.",
    category: "saving",
    categoryLabel: "חיסכון",
    icon: "🏦",
    duration: "3:35",
    topic: "חיסכון",
    script: [
      { who: "mobi", text: "קיבלתי 100 שקל! מה עושים?" },
      { who: "owl", text: "מחלקים. 50 לצרכים, 30 לרצונות, 20 לחיסכון." },
      { who: "mobi", text: "למה דווקא ככה?" },
      { who: "owl", text: "זה כלל אצבע פשוט שקל לזכור וקשה להתבלבל בו." },
      { who: "mobi", text: "ואם החיסכון קטן מדי?" },
      { who: "owl", text: "אז מגדילים. אבל 20 אחוז זו התחלה מצוינת." },
      { who: "mobi", text: "אני מעביר את ה-20 שקל עכשיו, לפני שאני מתחרט." },
      { who: "owl", text: "זה בדיוק הרעיון. חיסכון ראשון, פיתויים אחר כך." }
    ]
  },
  {
    id: "emergency-fund",
    title: "קרן חירום - הכרית הרכה",
    description: "למה כדאי לשמור סכום בצד לימים גשומים, וכמה בדיוק צריך בקרן.",
    category: "saving",
    categoryLabel: "חיסכון",
    icon: "🛟",
    duration: "3:05",
    topic: "קרן חירום",
    script: [
      { who: "owl", text: "מה קורה אם הטלפון שלך נשבר מחר?" },
      { who: "mobi", text: "אוי... אין לי כסף לזה." },
      { who: "owl", text: "בשביל זה יש קרן חירום - כסף ששמור רק להפתעות." },
      { who: "mobi", text: "כמה צריך בקרן?" },
      { who: "owl", text: "מבוגרים שואפים ל-3 עד 6 חודשי הוצאות." },
      { who: "mobi", text: "ואני?" },
      { who: "owl", text: "התחל בסכום שמכסה תיקון או קנייה דחופה אחת. זה כבר המון." }
    ]
  },
  {
    id: "compound",
    title: "ריבית דריבית - הקסם השקט",
    description: "הכוח שגורם לכסף לייצר כסף. ככל שמתחילים מוקדם, האפקט גדול יותר.",
    category: "investing",
    categoryLabel: "השקעות",
    icon: "📈",
    duration: "4:25",
    topic: "ריבית דריבית",
    script: [
      { who: "owl", text: "מובי, אם 100 שקל גדלים ב-10 אחוז בשנה - כמה יש אחרי שנה?" },
      { who: "mobi", text: "110 שקל. קל!" },
      { who: "owl", text: "ואחרי שנתיים?" },
      { who: "mobi", text: "120?" },
      { who: "owl", text: "לא - 121. כי גם ה-10 שקל שהרווחת מרוויחים." },
      { who: "mobi", text: "שקל אחד. וואו." },
      { who: "owl", text: "אחרי 30 שנה זה כבר יותר מפי 17. זו ריבית דריבית." },
      { who: "mobi", text: "אז הזמן הוא החבר הכי טוב של הכסף!" }
    ]
  },
  {
    id: "risk",
    title: "סיכון מול תשואה",
    description: "למה השקעה שמבטיחה רווח ענק בלי סיכון היא כמעט תמיד סימן אזהרה.",
    category: "investing",
    categoryLabel: "השקעות",
    icon: "⚖️",
    duration: "3:50",
    topic: "סיכון פיננסי",
    script: [
      { who: "mobi", text: "ראיתי פרסומת: 300 אחוז רווח בחודש, בלי סיכון!" },
      { who: "owl", text: "עצור. מה השמעת עכשיו?" },
      { who: "mobi", text: "בלי סיכון..." },
      { who: "owl", text: "זה לא קיים. תשואה גבוהה תמיד מגיעה עם סיכון גבוה." },
      { who: "mobi", text: "אז איך יודעים מה בטוח?" },
      { who: "owl", text: "מפזרים. לא שמים את כל הכסף במקום אחד." },
      { who: "mobi", text: "כמו לא לשים את כל הביצים בסל אחד." },
      { who: "owl", text: "בדיוק. ואם משהו נשמע טוב מדי - הוא כנראה כזה." }
    ]
  },
  {
    id: "credit",
    title: "אשראי, הלוואות ומה שביניהם",
    description: "כסף שאינו שלכם עולה כסף. איך להשתמש באשראי בלי ליפול למלכודת.",
    category: "smart",
    categoryLabel: "צרכנות חכמה",
    icon: "💳",
    duration: "4:00",
    topic: "אשראי",
    script: [
      { who: "mobi", text: "כרטיס אשראי זה כסף חינם, נכון?" },
      { who: "owl", text: "ממש לא. זה כסף מושאל שצריך להחזיר." },
      { who: "mobi", text: "ואם לא מחזירים בזמן?" },
      { who: "owl", text: "אז משלמים ריבית - ולפעמים ריבית על הריבית." },
      { who: "mobi", text: "זו ריבית דריבית שעובדת נגדי!" },
      { who: "owl", text: "קלטת. לכן משלמים את כל החוב בכל חודש." },
      { who: "mobi", text: "כלל חדש: לא קונה באשראי מה שאין לי כסף לשלם עליו." }
    ]
  },
  {
    id: "smart-shopping",
    title: "מבצע או מלכודת?",
    description: "טריקים שחנויות משתמשות בהם, ואיך לזהות מתי המבצע באמת משתלם.",
    category: "smart",
    categoryLabel: "צרכנות חכמה",
    icon: "🛒",
    duration: "3:15",
    topic: "צרכנות נבונה",
    script: [
      { who: "mobi", text: "1+1 חינם! חסכתי חצי!" },
      { who: "owl", text: "היית קונה גם אחד במחיר מלא?" },
      { who: "mobi", text: "אמממ... לא ממש." },
      { who: "owl", text: "אז לא חסכת. הוצאת כסף שלא תכננת להוציא." },
      { who: "mobi", text: "אז מתי מבצע באמת שווה?" },
      { who: "owl", text: "כשהיית קונה את המוצר בכל מקרה, והמחיר באמת נמוך יותר." },
      { who: "mobi", text: "מעכשיו אני בודק את מחיר היחידה, לא את השלט." }
    ]
  },
  {
    id: "goals",
    title: "מציבים מטרה כספית",
    description: "איך להפוך חלום גדול לתוכנית חודשית קטנה שאפשר באמת לעמוד בה.",
    category: "saving",
    categoryLabel: "חיסכון",
    icon: "🎯",
    duration: "2:55",
    topic: "מטרות פיננסיות",
    script: [
      { who: "mobi", text: "אני רוצה אופניים ב-1200 שקל. זה המון." },
      { who: "owl", text: "תוך כמה זמן אתה רוצה אותם?" },
      { who: "mobi", text: "שנה?" },
      { who: "owl", text: "אז זה 100 שקל בחודש. עדיין המון?" },
      { who: "mobi", text: "פתאום זה נשמע אפשרי!" },
      { who: "owl", text: "זה הסוד: מטרה גדולה מחולקת לצעדים קטנים." },
      { who: "mobi", text: "אני מסמן את זה על הקיר ומתחיל היום." }
    ]
  }
];

/* ---------- שאלות החידון ---------- */

const quizQuestions = [
  {
    question: "מה ההבדל בין צורך לבין רצון?",
    answers: [
      "צורך הוא משהו שאנחנו חייבים כדי לחיות, רצון הוא משהו שנעים לנו שיהיה",
      "אין הבדל אמיתי, זו רק מילה אחרת",
      "צורך הוא משהו יקר, רצון הוא משהו זול",
      "רצון הוא משהו שקונים במבצע"
    ],
    correct: 0,
    explain: "צרכים (אוכל, קורת גג) באים קודם. רצונות זה מה שמתפנקים בו ממה שנשאר."
  },
  {
    question: "לפי כלל 50-30-20, כמה מההכנסה הולך לחיסכון?",
    answers: ["50 אחוז", "30 אחוז", "20 אחוז", "10 אחוז"],
    correct: 2,
    explain: "50 לצרכים, 30 לרצונות ו-20 לחיסכון - כלל אצבע פשוט שקל לזכור."
  },
  {
    question: "מה זו ריבית דריבית?",
    answers: [
      "ריבית שמשלמים פעמיים בשנה",
      "ריבית שמחושבת גם על הרווחים הקודמים, לא רק על הסכום ההתחלתי",
      "ריבית שהבנק מחזיר בסוף השנה",
      "עמלה שגובים על העברת כספים"
    ],
    correct: 1,
    explain: "הרווחים עצמם מתחילים להרוויח. לכן הזמן הוא הגורם החשוב ביותר בהשקעה."
  },
  {
    question: "כמה כסף מומלץ שיהיה בקרן חירום של משק בית?",
    answers: [
      "הוצאות של 3 עד 6 חודשים",
      "בדיוק 1000 שקל",
      "הוצאות של שנתיים",
      "לא צריך קרן חירום אם יש כרטיס אשראי"
    ],
    correct: 0,
    explain: "3-6 חודשי הוצאות נותנים מספיק זמן להתאושש מאובדן הכנסה או מהוצאה מפתיעה."
  },
  {
    question: "מישהו מציע לכם השקעה עם 300 אחוז רווח מובטח ובלי סיכון. מה עושים?",
    answers: [
      "משקיעים מיד לפני שנגמר",
      "משקיעים חצי מהכסף, ליתר ביטחון",
      "נמנעים - תשואה גבוהה בלי סיכון היא סימן מובהק להונאה",
      "לוקחים הלוואה כדי להשקיע יותר"
    ],
    correct: 2,
    explain: "אין תשואה גבוהה בלי סיכון. הבטחה כזו היא כמעט תמיד הונאה."
  },
  {
    question: "מה קורה כשלא מחזירים את מלוא חוב כרטיס האשראי בסוף החודש?",
    answers: [
      "כלום, זה שירות חינם",
      "מצטברת ריבית, ולעיתים גם ריבית על הריבית",
      "הבנק מוחק את החוב אחרי שנה",
      "מקבלים הנחה בחודש הבא"
    ],
    correct: 1,
    explain: "חוב אשראי הוא ריבית דריבית שעובדת נגדכם. משתלם לסגור אותו כל חודש."
  },
  {
    question: "מבצע 1+1 על מוצר שלא תכננתם לקנות. האם חסכתם כסף?",
    answers: [
      "כן, חסכתם 50 אחוז",
      "כן, תמיד כדאי לנצל מבצעים",
      "לא - הוצאתם כסף על משהו שלא היה בתוכנית",
      "תלוי אם שילמתם באשראי"
    ],
    correct: 2,
    explain: "מבצע חוסך כסף רק כשהייתם קונים את המוצר גם בלעדיו."
  },
  {
    question: "מה המשמעות של פיזור השקעות?",
    answers: [
      "לחלק את הכסף בין השקעות שונות כדי להקטין סיכון",
      "להשקיע רק במניה אחת שמאמינים בה",
      "לפזר את הכסף בין כמה בנקים",
      "למכור הכול כשהשוק יורד"
    ],
    correct: 0,
    explain: "פיזור מקטין את הנזק אם השקעה אחת נכשלת. לא שמים כל הביצים בסל אחד."
  },
  {
    question: "מהו הצעד הראשון בבניית תקציב?",
    answers: [
      "לקצץ בכל ההוצאות",
      "לפתוח תוכנית חיסכון בבנק",
      "לרשום את כל ההכנסות וההוצאות בפועל",
      "לבקש העלאה בשכר"
    ],
    correct: 2,
    explain: "בלי לדעת לאן הכסף הולך אי אפשר לנהל אותו. מדידה קודמת לשינוי."
  },
  {
    question: "רוצים לקנות משהו ב-1200 שקל בעוד שנה. כמה צריך לחסוך בחודש?",
    answers: ["50 שקל", "100 שקל", "120 שקל", "200 שקל"],
    correct: 1,
    explain: "1200 חלקי 12 חודשים = 100 שקל בחודש. כך מטרה גדולה הופכת לצעד קטן."
  }
];

/* ---------- ניווט בין מסכים ---------- */

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.toggle("active", screen.id === id);
  });

  if (id !== "videoPlayer") {
    stopAnimation();
  }

  if (id === "quiz" && !quizStarted) {
    startQuiz();
  }

  window.scrollTo({top: 0, behavior: "smooth"});
}

/* ---------- ספריית הסרטונים ---------- */

let activeFilter = "all";

function renderVideos() {
  const grid = document.getElementById("videoGrid");
  const list = videos.filter(
    video => activeFilter === "all" || video.category === activeFilter
  );

  if (!list.length) {
    grid.innerHTML = '<div class="empty-state">לא נמצאו שיעורים בקטגוריה הזו.</div>';
    return;
  }

  grid.innerHTML = list
    .map(
      video => `
      <button class="video-card" data-category="${video.category}" data-id="${video.id}">
        <div class="video-thumb">
          <span>${video.icon}</span>
          <span class="video-duration">${video.duration}</span>
        </div>
        <div class="video-body">
          <span class="tag">${video.categoryLabel}</span>
          <h3>${video.title}</h3>
          <p>${video.description}</p>
        </div>
      </button>`
    )
    .join("");

  grid.querySelectorAll(".video-card").forEach(card => {
    card.addEventListener("click", () => openVideo(card.dataset.id));
  });
}

function setupFilters() {
  document.querySelectorAll(".filter").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filter").forEach(other => other.classList.remove("active"));
      button.classList.add("active");
      activeFilter = button.dataset.filter;
      renderVideos();
    });
  });
}

/* ---------- מנוע הקול (Web Speech API) ---------- */

const speech = {
  supported: typeof window !== "undefined" && "speechSynthesis" in window,
  ready: false,
  enabled: true,
  voices: {owl: null, mobi: null},
  keepAlive: null,
  /* קבצי קול מוקלטים מראש (AI). אם קיימים - הם עדיפים על קול הדפדפן */
  files: null,
  lines: null,
  lineFiles: null,
  audio: null
};

/* טוען את רשימת קבצי הקול שהופקו מראש בעזרת tools/generate-voices.mjs */
async function loadVoiceFiles() {
  try {
    const response = await fetch("audio/manifest.json", {cache: "no-cache"});
    if (!response.ok) return;

    const manifest = await response.json();
    if (Array.isArray(manifest.files) && manifest.files.length) {
      speech.files = new Set(manifest.files);
    }
  } catch (error) {
    /* אין קבצי קול - ממשיכים עם קול הדפדפן */
  }

  updateVoiceNote();
}

/* טוען את רשימת ההקלטות של שורות הסרטון (voice/manifest.json) */
async function loadMovieVoices() {
  try {
    const response = await fetch("voice/manifest.json", {cache: "no-cache"});
    if (!response.ok) return;

    const manifest = await response.json();
    if (Array.isArray(manifest.lines) && manifest.lines.length) {
      speech.lines = new Set(manifest.lines);
      /* המניפסט שומר את שם הקובץ האמיתי, כך שכל פורמט עובד */
      speech.lineFiles = manifest.files || null;
    }
  } catch (error) {
    /* אין הקלטות - ממשיכים עם קול הדפדפן */
  }
}

function hasVoiceFile(videoId, index) {
  return Boolean(speech.files && speech.files.has(`${videoId}-${index}`));
}

/* מנגן קובץ MP3 מוקלט ומחזיר הבטחה שמסתיימת בסוף ההשמעה */
function playVoiceFile(videoId, index) {
  return new Promise(resolve => {
    const audio = new Audio(`audio/${videoId}-${index}.mp3`);
    speech.audio = audio;

    let done = false;
    const finish = ok => {
      if (done) return;
      done = true;
      resolve(ok);
    };

    audio.onended = () => finish(true);
    audio.onerror = () => finish(false);
    audio.play().catch(() => finish(false));
  });
}

/* לכל דמות אופי קולי משלה.
   כשיש רק קול אחד במחשב מפרידים ביניהם בכוח, בעזרת גובה צליל קיצוני.
   כשיש שני קולות אמיתיים - הם כבר נשמעים שונה, אז נוגעים הרבה פחות. */
const voiceProfileSets = {
  shared: {
    owl: {pitch: 0.75, rate: 1.0},
    mobi: {pitch: 1.45, rate: 1.14}
  },
  distinct: {
    owl: {pitch: 0.95, rate: 1.0},
    mobi: {pitch: 1.12, rate: 1.08}
  }
};

let voiceProfiles = voiceProfileSets.shared;

/* דוברים בסרטון: קריין ודמויות. כל אחד עם טון משלו,
   כדי שגם בקול הדפדפן יישמעו כמו אנשים שונים. */
const speakerProfiles = {
  narrator: {pitch: 0.95, rate: 1.0},
  farmer: {pitch: 1.12, rate: 1.06},
  shepherd: {pitch: 0.78, rate: 0.97},
  shoemaker: {pitch: 0.68, rate: 0.94},
  crowd: {pitch: 1.3, rate: 1.12},
  shopper: {pitch: 1.22, rate: 1.05}
};

/* דירוג קולות: מעדיפים קול עברי טבעי, ואז כל קול עברי, ואז ברירת מחדל */
function rankVoice(voice) {
  let score = 0;
  const name = voice.name.toLowerCase();

  if (/^(he|iw)/i.test(voice.lang)) score += 100;
  if (/google/.test(name)) score += 30;
  if (/natural|neural|online/.test(name)) score += 25;
  if (!voice.localService) score += 10;

  return score;
}

function pickVoices() {
  if (!speech.supported) return;

  const all = window.speechSynthesis.getVoices();
  if (!all.length) return;

  const hebrew = all
    .filter(voice => /^(he|iw)/i.test(voice.lang))
    .sort((a, b) => rankVoice(b) - rankVoice(a));

  if (!hebrew.length) {
    speech.voices.owl = null;
    speech.voices.mobi = null;
    speech.ready = true;
    updateVoiceNote();
    return;
  }

  /* מנסים לתת לינשוף קול גברי ולמובי קול נשי, לפי שמות קולות מוכרים */
  const male = hebrew.find(voice => /avri|asaf/i.test(voice.name));
  const female = hebrew.find(voice => /hila|carmit/i.test(voice.name));

  let owl = male || hebrew[0];
  let mobi = female || hebrew.find(voice => voice !== owl) || hebrew[0];

  /* אם במקרה יצא אותו קול לשניהם אבל יש עוד אפשרות - מפרידים */
  if (owl === mobi && hebrew.length >= 2) {
    mobi = hebrew.find(voice => voice !== owl);
  }

  speech.voices.owl = owl;
  speech.voices.mobi = mobi;

  voiceProfiles = owl === mobi ? voiceProfileSets.shared : voiceProfileSets.distinct;

  speech.ready = true;
  updateVoiceNote();
}

function initVoices() {
  if (!speech.supported) {
    updateVoiceNote();
    return;
  }

  pickVoices();
  window.speechSynthesis.onvoiceschanged = pickVoices;

  /* בחלק מהדפדפנים רשימת הקולות נטענת באיחור */
  let tries = 0;
  const retry = setInterval(() => {
    if (speech.ready || tries++ > 20) {
      clearInterval(retry);
      if (!speech.ready) updateVoiceNote();
      return;
    }
    pickVoices();
  }, 250);
}

function updateVoiceNote() {
  const note = document.getElementById("voiceNote");
  const toggle = document.getElementById("voiceToggle");
  if (!note || !toggle) return;

  /* יש קבצי קול מוקלטים - לא תלויים בדפדפן בכלל */
  if (speech.files) {
    note.classList.add("hidden");
    toggle.disabled = false;
    return;
  }

  if (!speech.supported) {
    note.textContent = "🔇 הדפדפן הזה לא תומך בהקראה קולית. השיעור ירוץ עם כתוביות בלבד.";
    note.classList.remove("hidden");
    toggle.disabled = true;
    return;
  }

  if (speech.ready && !speech.voices.owl) {
    note.textContent =
      "🔇 לא נמצא קול בעברית במחשב. אפשר להוסיף קול בהגדרות המערכת (שפה ודיבור), ובינתיים השיעור ירוץ עם כתוביות.";
    note.classList.remove("hidden");
    toggle.disabled = true;
    return;
  }

  note.classList.add("hidden");
  toggle.disabled = false;
}

function toggleVoice() {
  speech.enabled = !speech.enabled;

  const label = speech.enabled ? "🔊 קול פועל" : "🔇 קול מושתק";
  ["voiceToggle", "movieVoice"].forEach(id => {
    const button = document.getElementById(id);
    if (button) button.textContent = label;
  });

  if (!speech.enabled) cancelSpeech();
}

function canSpeak() {
  if (!speech.enabled) return false;
  if (speech.files) return true;
  return speech.supported && Boolean(speech.voices.owl);
}

function cancelSpeech() {
  if (speech.audio) {
    speech.audio.pause();
    speech.audio.onended = null;
    speech.audio.onerror = null;
    speech.audio = null;
  }

  if (!speech.supported) return;

  window.speechSynthesis.cancel();

  if (speech.keepAlive) {
    clearInterval(speech.keepAlive);
    speech.keepAlive = null;
  }
}

/* מקריא משפט אחד ומחזיר הבטחה שמסתיימת כשהדיבור נגמר.
   סדר עדיפויות: קובץ AI מוקלט מראש, ואם אין - קול הדפדפן. */
async function speakLine(text, who, videoId, index) {
  if (!speech.enabled) return false;

  if (hasVoiceFile(videoId, index)) {
    const played = await playVoiceFile(videoId, index);
    if (played) return true;
    /* הקובץ נכשל - ממשיכים לקול הדפדפן */
  }

  return speakWithBrowser(text, who);
}

function speakWithBrowser(text, who) {
  return new Promise(resolve => {
    if (!speech.supported || !speech.enabled || !speech.voices[who]) {
      resolve(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const profile = voiceProfiles[who];

    /* אינטונציה: שאלות עולות בסוף, קריאות נאמרות מהר וקצת חזק יותר */
    let pitch = profile.pitch;
    let rate = profile.rate;

    if (/\?\s*$/.test(text)) {
      pitch += 0.12;
      rate -= 0.02;
    } else if (/!\s*$/.test(text)) {
      pitch += 0.06;
      rate += 0.07;
    }

    /* שינוי זעיר בין משפטים כדי שלא יישמע מונוטוני */
    pitch += (animationStep % 3) * 0.02 - 0.02;

    utterance.voice = speech.voices[who];
    utterance.lang = speech.voices[who].lang || "he-IL";
    utterance.pitch = Math.min(2, Math.max(0.1, pitch));
    utterance.rate = Math.min(2, Math.max(0.5, rate));
    utterance.volume = 1;

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (speech.keepAlive) {
        clearInterval(speech.keepAlive);
        speech.keepAlive = null;
      }
      resolve(true);
    };

    utterance.onend = finish;
    utterance.onerror = finish;

    window.speechSynthesis.speak(utterance);

    /* עקיפה לבאג ידוע בכרום שמשתיק דיבור ארוך אחרי כ-15 שניות */
    if (speech.keepAlive) clearInterval(speech.keepAlive);
    speech.keepAlive = setInterval(() => {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 9000);
  });
}

/* ---------- נרטור לסרטוני האנימציה ---------- */

/* משמיע שורה בסרטון.
   סדר עדיפויות: הקלטה אמיתית מ-voice/<id>.mp3, ואם אין - קול הדפדפן. */
function narrate(text, who, id) {
  if (!speech.enabled) return false;

  /* הקלטה אמיתית, אם הופקה מראש */
  if (id && speech.lines && speech.lines.has(id)) {
    cancelSpeech();
    const name = (speech.lineFiles && speech.lineFiles[id]) || `${id}.mp3`;
    const audio = new Audio(`voice/${name}`);
    speech.audio = audio;
    audio.play().catch(() => {});
    return true;
  }

  if (!speech.supported) return false;

  const speaker = speakerProfiles[who] ? who : "narrator";
  const voice = speech.voices.owl;
  /* הקולות עדיין נטענים - מדווחים כישלון כדי שהמשפט ינוסה שוב */
  if (!voice) return false;

  window.speechSynthesis.cancel();

  const profile = speakerProfiles[speaker];
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang || "he-IL";
  utterance.pitch = Math.min(2, Math.max(0.1, profile.pitch));
  utterance.rate = Math.min(2, Math.max(0.5, profile.rate));
  utterance.volume = 1;

  window.speechSynthesis.speak(utterance);

  if (speech.keepAlive) clearInterval(speech.keepAlive);
  speech.keepAlive = setInterval(() => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }
  }, 9000);

  return true;
}

/* ---------- נגן סרטוני האנימציה ---------- */

let moviePlayer = null;

function formatTime(seconds) {
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function setupMovie(movie) {
  const canvas = document.getElementById("movieCanvas");

  if (!moviePlayer || moviePlayer.movie !== movie) {
    moviePlayer = new MoviePlayer(canvas, movie);

    moviePlayer.onProgress = (time, total) => {
      document.getElementById("movieProgress").style.width = (time / total) * 100 + "%";
      document.getElementById("movieTime").textContent =
        `${formatTime(time)} / ${formatTime(total)}`;
    };

    moviePlayer.onEnd = () => {
      document.getElementById("movieToggle").textContent = "▶ צפייה שוב";
    };
  }

  moviePlayer.stop();
  document.getElementById("movieToggle").textContent = "▶ הפעלה";
}

function toggleMovie() {
  if (!moviePlayer) return;

  const button = document.getElementById("movieToggle");

  if (moviePlayer.playing) {
    moviePlayer.pause();
    button.textContent = "▶ המשך";
  } else {
    moviePlayer.play();
    button.textContent = "⏸ השהיה";
  }
}

function restartMovie() {
  if (!moviePlayer) return;
  moviePlayer.stop();
  moviePlayer.play();
  document.getElementById("movieToggle").textContent = "⏸ השהיה";
}

function seekMovie(event) {
  if (!moviePlayer) return;

  const bar = event.currentTarget;
  const rect = bar.getBoundingClientRect();
  /* הדף בכיוון ימין לשמאל, לכן מודדים מהקצה הימני */
  const ratio = (rect.right - event.clientX) / rect.width;
  moviePlayer.seek(ratio * moviePlayer.total);
}

/* ---------- נגן השיעור המונפש ---------- */

let currentVideo = null;
let animationTimer = null;
let animationStep = 0;
let playToken = 0;

function openVideo(id) {
  const video = videos.find(item => item.id === id);
  if (!video) return;

  currentVideo = video;
  animationStep = 0;

  document.getElementById("playerCategory").textContent = video.categoryLabel;
  document.getElementById("playerTitle").textContent = video.title;
  document.getElementById("playerDescription").textContent = video.description;

  document.getElementById("wikiLink").href =
    "https://he.wikipedia.org/wiki/Special:Search?search=" + encodeURIComponent(video.topic);
  document.getElementById("googleLink").href =
    "https://www.google.com/search?q=" + encodeURIComponent(video.topic + " חינוך פיננסי");

  /* לשיעור שיש לו סרטון אנימציה מוצג הקנבס במקום בועות הדיבור */
  const movie = movieFor(video.id);
  document.getElementById("movieStage").classList.toggle("hidden", !movie);
  document.getElementById("dialogueStage").classList.toggle("hidden", Boolean(movie));

  if (movie) {
    setupMovie(movie);
  } else {
    resetStage();
  }

  showScreen("videoPlayer");
}

/* מאתר סרטון אנימציה מלא עבור שיעור, אם קיים כזה */
function movieFor(videoId) {
  if (typeof moneyMovie !== "undefined" && moneyMovie.id === videoId) return moneyMovie;
  if (typeof extraMovies !== "undefined") {
    return extraMovies.find(function (movie) { return movie.id === videoId; }) || null;
  }
  return null;
}

function resetStage() {
  document.getElementById("owlSpeech").textContent = "לחצו על הפעלה כדי להתחיל";
  document.getElementById("mobiSpeech").textContent = "אני מוכן ללמוד!";
  document.getElementById("animationStatus").textContent = "השיעור מוכן להפעלה";
  setTalking(null);
}

function setTalking(who) {
  const owl = document.querySelector(".character.owl");
  const mobi = document.querySelector(".character.mobi");

  owl.classList.toggle("talking", who === "owl");
  mobi.classList.toggle("talking", who === "mobi");

  document.getElementById("owlSpeech").classList.toggle("dim", who === "mobi");
  document.getElementById("mobiSpeech").classList.toggle("dim", who === "owl");
}

function playAnimation() {
  if (!currentVideo) return;

  stopAnimation();
  animationStep = 0;
  document.getElementById("owlSpeech").textContent = "...";
  document.getElementById("mobiSpeech").textContent = "...";
  runAnimationStep(++playToken);
}

/* אורך הקראה משוער, לשימוש כשאין קול זמין */
function estimateReadingTime(text) {
  return Math.min(6500, Math.max(2200, text.length * 85));
}

async function runAnimationStep(token) {
  if (token !== playToken || !currentVideo) return;

  const script = currentVideo.script;

  if (animationStep >= script.length) {
    setTalking(null);
    document.getElementById("animationStatus").textContent = "🎉 השיעור הסתיים! אפשר לצפות שוב.";
    animationTimer = null;
    return;
  }

  const index = animationStep;
  const line = script[index];
  const bubble = line.who === "owl" ? "owlSpeech" : "mobiSpeech";

  document.getElementById(bubble).textContent = line.text;
  setTalking(line.who);
  document.getElementById("animationStatus").textContent =
    `${canSpeak() ? "🔊" : "▶"} משפט ${index + 1} מתוך ${script.length}`;

  animationStep++;

  const spoke = await speakLine(line.text, line.who, currentVideo.id, index);
  if (token !== playToken) return;

  /* אם הדמות דיברה, ממתינים רק נשימה קצרה בין משפטים */
  const gap = spoke ? 450 : estimateReadingTime(line.text);
  animationTimer = setTimeout(() => runAnimationStep(token), gap);
}

function stopAnimation() {
  playToken++;

  /* עוצר גם סרטון אנימציה שרץ, אם יש */
  if (moviePlayer && moviePlayer.playing) {
    moviePlayer.pause();
    const button = document.getElementById("movieToggle");
    if (button) button.textContent = "▶ המשך";
  }

  if (animationTimer) {
    clearTimeout(animationTimer);
    animationTimer = null;
  }

  cancelSpeech();
  setTalking(null);

  const status = document.getElementById("animationStatus");
  if (status && animationStep > 0 && currentVideo && animationStep < currentVideo.script.length) {
    status.textContent = "⏹ הסרטון נעצר";
  }
}

/* ---------- חידון ---------- */

let quizStarted = false;
let questionIndex = 0;
let score = 0;
let answered = false;

function startQuiz() {
  quizStarted = true;
  questionIndex = 0;
  score = 0;

  document.getElementById("quizBox").classList.remove("hidden");
  document.getElementById("quizResult").classList.add("hidden");

  renderQuestion();
}

function renderQuestion() {
  answered = false;

  const current = quizQuestions[questionIndex];
  const answersBox = document.getElementById("answers");
  const nextButton = document.getElementById("nextQuestion");

  document.getElementById("questionText").textContent = current.question;
  document.getElementById("questionProgress").textContent =
    `שאלה ${questionIndex + 1} מתוך ${quizQuestions.length} · ניקוד: ${score}`;
  document.getElementById("progress").style.width =
    (questionIndex / quizQuestions.length) * 100 + "%";

  answersBox.innerHTML = current.answers
    .map((answer, index) => `<button class="answer" data-index="${index}">${answer}</button>`)
    .join("");

  answersBox.querySelectorAll(".answer").forEach(button => {
    button.addEventListener("click", () => checkAnswer(Number(button.dataset.index)));
  });

  nextButton.disabled = true;
  nextButton.textContent =
    questionIndex === quizQuestions.length - 1 ? "לסיום החידון" : "השאלה הבאה";
}

function checkAnswer(index) {
  if (answered) return;
  answered = true;

  const current = quizQuestions[questionIndex];
  const buttons = document.querySelectorAll("#answers .answer");

  buttons.forEach((button, i) => {
    button.disabled = true;
    if (i === current.correct) button.classList.add("correct");
    else if (i === index) button.classList.add("wrong");
  });

  if (index === current.correct) score++;

  const explain = document.createElement("div");
  explain.className = "answer-explain";
  explain.textContent =
    (index === current.correct ? "✅ נכון! " : "❌ לא מדויק. ") + current.explain;
  document.getElementById("answers").after(explain);

  document.getElementById("questionProgress").textContent =
    `שאלה ${questionIndex + 1} מתוך ${quizQuestions.length} · ניקוד: ${score}`;
  document.getElementById("nextQuestion").disabled = false;
}

function nextQuestion() {
  document.querySelectorAll(".answer-explain").forEach(node => node.remove());

  questionIndex++;

  if (questionIndex >= quizQuestions.length) {
    showQuizResult();
    return;
  }

  renderQuestion();
}

function showQuizResult() {
  document.getElementById("progress").style.width = "100%";
  document.getElementById("quizBox").classList.add("hidden");
  document.getElementById("quizResult").classList.remove("hidden");
  document.getElementById("questionProgress").textContent = "סיימתם את כל השאלות!";

  const percent = Math.round((score / quizQuestions.length) * 100);
  let message;

  if (percent === 100) message = "מושלם! אתם מומחי כסף אמיתיים.";
  else if (percent >= 80) message = "מצוין! יש לכם בסיס פיננסי חזק.";
  else if (percent >= 60) message = "יפה מאוד. עוד קצת תרגול ותהיו שם.";
  else message = "התחלה טובה! שווה לצפות בכמה שיעורים ולנסות שוב.";

  document.getElementById("scoreText").textContent =
    `ענית נכון על ${score} מתוך ${quizQuestions.length} שאלות (${percent}%). ${message}`;

  quizStarted = false;
}

/* ---------- אתחול ---------- */

function initTip() {
  const dayIndex = Math.floor(Date.now() / 86400000) % dailyTips.length;
  document.getElementById("homeTip").textContent = dailyTips[dayIndex];
}

document.addEventListener("DOMContentLoaded", () => {
  initTip();
  setupFilters();
  renderVideos();
  initVoices();
  loadVoiceFiles();
  loadMovieVoices();
  loadMovieArt();
});

/* עצירת הדיבור כשעוזבים או ממזערים את הדף */
window.addEventListener("beforeunload", cancelSpeech);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopAnimation();
});
