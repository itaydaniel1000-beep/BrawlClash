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

/* ---------- ניווט בין מסכים ---------- */

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.toggle("active", screen.id === id);
  });

  if (id !== "videoPlayer") {
    stopAnimation();
  }

  if (id === "quiz") startQuest();
  else if (typeof stopQuestLoop === "function") stopQuestLoop();

  /* הכרזה מונפשת רק כשרואים אותה */
  if (id === "home") startBanner();
  else stopBanner();

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
          <canvas class="thumb-art" width="384" height="158" data-thumb="${video.id}"></canvas>
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

  paintThumbnails();
}

/* כל כרטיס מקבל פריים אמיתי מהסרטון שלו במקום אייקון */
function paintThumbnails() {
  const stage = document.createElement("canvas");
  stage.width = 960;
  stage.height = 540;
  const scene = stage.getContext("2d");
  scene.imageSmoothingEnabled = false;

  document.querySelectorAll("canvas[data-thumb]").forEach(thumb => {
    const movie = movieFor(thumb.dataset.thumb);
    const ctx = thumb.getContext("2d");

    if (!movie) {
      ctx.fillStyle = "#dbeaf8";
      ctx.fillRect(0, 0, thumb.width, thumb.height);
      return;
    }

    /* השוט השני בדרך כלל מציג את הנושא, לא רק נוף פתיחה */
    const shot = movie.shots[Math.min(1, movie.shots.length - 1)];
    scene.fillStyle = "#ffffff";
    scene.fillRect(0, 0, 960, 540);

    try {
      shot.draw(scene, shot.duration * 0.55, 960, 540);
    } catch (error) {
      shot.draw(scene, 0.5, 960, 540);
    }

    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(stage, 0, 0, thumb.width, thumb.height);
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

/* ---------- מסע הגיבור ---------- */

let quest = null;
let questRaf = null;
let questLast = 0;
let questLocked = false;
let questPending = null;   /* מה קורה אחרי מסך הביניים שמוצג כרגע */

const QUEST_SAVE_KEY = "kesef-hacham-quest";

/* ---------- צלילי המשחק ---------- */

/* הצלילים מסונתזים בדפדפן, בלי קבצים. מכבדים את מתג הקול הראשי. */
let sfxCtx = null;

function sfxAudio() {
  if (!speech.enabled) return null;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    if (!sfxCtx) sfxCtx = new Ctor();
    if (sfxCtx.state === "suspended") sfxCtx.resume();
    return sfxCtx;
  } catch (error) {
    return null;
  }
}

/* צליל אחד: תדר, מתי מתחיל, כמה נמשך */
function tone(ctx, freq, start, dur, type, peak, endFreq) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const at = ctx.currentTime + start;

  osc.type = type || "triangle";
  osc.frequency.setValueAtTime(freq, at);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, at + dur);

  /* עלייה מהירה ודעיכה רכה, כדי שלא יישמע נקישה */
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak || 0.16, at + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(at);
  osc.stop(at + dur + 0.03);
}

/* רעש לבן קצר - לשאגה ולהתרסקות */
function noise(ctx, start, dur, peak, filterHz) {
  const frames = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);

  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(filterHz || 900, ctx.currentTime + start);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(peak || 0.2, ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(ctx.currentTime + start);
}

function playSfx(name) {
  const ctx = sfxAudio();
  if (!ctx) return;

  if (name === "good") {
    tone(ctx, 523.25, 0, 0.13, "triangle", 0.15);
    tone(ctx, 659.25, 0.09, 0.13, "triangle", 0.15);
    tone(ctx, 783.99, 0.18, 0.26, "triangle", 0.17);
  } else if (name === "bad") {
    tone(ctx, 311.13, 0, 0.16, "sine", 0.13);
    tone(ctx, 233.08, 0.12, 0.3, "sine", 0.12);
  } else if (name === "lantern") {
    tone(ctx, 420, 0, 0.34, "sine", 0.12, 90);
  } else if (name === "step") {
    tone(ctx, 180, 0, 0.09, "sine", 0.07, 120);
    tone(ctx, 180, 0.22, 0.09, "sine", 0.06, 120);
  } else if (name === "tick") {
    tone(ctx, 880, 0, 0.06, "square", 0.06);
  } else if (name === "world") {
    /* עולם שוחרר: פנפרה קצרה */
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
      tone(ctx, f, i * 0.1, i === 4 ? 0.55 : 0.14, "triangle", 0.16));
  } else if (name === "win") {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone(ctx, f, i * 0.12, i === 3 ? 0.5 : 0.16, "triangle", 0.17));
    tone(ctx, 1318.5, 0.52, 0.6, "triangle", 0.13);
  } else if (name === "fail") {
    tone(ctx, 392, 0, 0.22, "sawtooth", 0.09, 330);
    tone(ctx, 294, 0.18, 0.26, "sawtooth", 0.09, 233);
    tone(ctx, 196, 0.4, 0.6, "sine", 0.11, 130);
  } else if (name === "roar") {
    /* שאגת הדרקון */
    noise(ctx, 0, 0.7, 0.22, 420);
    tone(ctx, 110, 0, 0.7, "sawtooth", 0.13, 62);
    tone(ctx, 74, 0.05, 0.75, "square", 0.1, 48);
  } else if (name === "fire") {
    noise(ctx, 0, 0.55, 0.18, 1600);
  } else if (name === "strike") {
    /* מכה בדרקון */
    tone(ctx, 1200, 0, 0.09, "square", 0.14, 500);
    noise(ctx, 0.02, 0.28, 0.16, 2600);
    tone(ctx, 320, 0.06, 0.34, "triangle", 0.13, 180);
  } else if (name === "hurt") {
    noise(ctx, 0, 0.3, 0.2, 700);
    tone(ctx, 220, 0, 0.34, "sawtooth", 0.12, 96);
  } else if (name === "setback") {
    tone(ctx, 392, 0, 0.3, "sine", 0.11, 196);
    tone(ctx, 262, 0.22, 0.5, "sine", 0.1, 131);
  }
}

/* ---------- שמירת ההתקדמות ---------- */

function saveQuest() {
  try {
    localStorage.setItem(QUEST_SAVE_KEY, JSON.stringify(quest.save()));
  } catch (error) {
    /* מצב גלישה פרטית או אחסון מלא - המשחק ממשיך בלי שמירה */
  }
}

function clearQuestSave() {
  try {
    localStorage.removeItem(QUEST_SAVE_KEY);
  } catch (error) {}
}

function loadQuestSave() {
  try {
    const raw = localStorage.getItem(QUEST_SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

/* ---------- לולאת הציור ---------- */

function questLoop(now) {
  if (!quest) return;
  const dt = Math.min(0.1, (now - questLast) / 1000);
  questLast = now;
  quest.render(dt);
  questRaf = requestAnimationFrame(questLoop);
}

function stopQuestLoop() {
  if (questRaf) cancelAnimationFrame(questRaf);
  questRaf = null;
}

function startQuestLoop() {
  stopQuestLoop();
  quest.render(0);
  questLast = performance.now();
  questRaf = requestAnimationFrame(questLoop);
}

/* ---------- מסכים ---------- */

const QUEST_PANELS = ["questBoard", "questWorld", "questWorldDone", "questSetback", "questBoss", "questEnd"];

function showQuestPanel(id) {
  QUEST_PANELS.forEach(name => {
    const el = document.getElementById(name);
    if (el) el.classList.toggle("hidden", name !== id);
  });
}

/* fresh - מסע חדש לגמרי. אחרת ממשיכים מהמקום שנשמר, אם יש. */
function startQuest(fresh) {
  const canvas = document.getElementById("questCanvas");
  if (!canvas) return;

  if (!quest) quest = new Quest(canvas);

  if (fresh) {
    quest.reset();
    clearQuestSave();
  } else if (!quest.load(loadQuestSave())) {
    quest.reset();
  }

  questLocked = false;
  questPending = null;
  stopBossLoop();
  saveQuest();

  /* פותחים בכרטיס העולם אם זה השלב הראשון בעולם, אחרת ישר בשלב */
  if (quest.step.indexInWorld === 0 && !quest.isBoss && !quest.cleared[quest.pos]) {
    showWorldCard();
  } else {
    enterStage();
  }
}

/* --- כרטיס פתיחת עולם --- */

function showWorldCard() {
  const world = quest.world;
  const index = quest.step.world;

  document.getElementById("questWorldNum").textContent = index + 1;
  document.getElementById("questWorldTotal").textContent = WORLDS.length;
  document.getElementById("questWorldName").textContent = world.name;
  document.getElementById("questWorldTag").textContent = world.tagline;

  const list = document.getElementById("questWorldStages");
  list.innerHTML = worldStages(world)
    .map(stage => `<li><span class="dot" style="background:${world.color}"></span>${stage.place}</li>`)
    .join("");

  paintWorldBanner(document.getElementById("questWorldArt"), index);
  showQuestPanel("questWorld");
  stopQuestLoop();
  playSfx("tick");
}

function enterWorld() {
  enterStage();
}

/* --- כרטיס סיום עולם --- */

function showWorldDone(worldIndex, next) {
  const world = WORLDS[worldIndex];
  document.getElementById("questWorldDoneName").textContent = world.name;
  document.getElementById("questWorldDoneText").textContent =
    `כל ${quest.worldProgress(worldIndex).total} האזורים בעולם הזה שוחררו. הצבע חזר אליהם.`;

  const list = document.getElementById("questWorldDoneLessons");
  list.innerHTML = worldStages(world)
    .map(stage => `<li><strong>${stage.place}</strong><span>${stage.lesson}</span></li>`)
    .join("");

  paintWorldBanner(document.getElementById("questWorldDoneArt"), worldIndex, true);

  const button = document.getElementById("questWorldDoneNext");
  button.textContent = next === "boss" ? "אל קרב הדרקון" : "אל העולם הבא";

  questPending = next;
  showQuestPanel("questWorldDone");
  stopQuestLoop();
  playSfx("world");
}

function questWorldDoneNext() {
  const next = questPending;
  questPending = null;

  if (next === "boss") {
    quest.goTo(quest.pos + 1);
    saveQuest();
    startBoss();
    return;
  }

  quest.goTo(quest.pos + 1);
  saveQuest();
  showWorldCard();
}

/* --- מסך נסיגה --- */

function showSetback(steps) {
  /* עברית: "שלב אחד", "שני שלבים", "שלושה שלבים" */
  const backwards = ["", "שלב אחד", "שני שלבים", "שלושה שלבים"][steps] || `${steps} שלבים`;

  document.getElementById("questSetbackText").textContent = steps > 0
    ? `הפנסים כבו. אתם נסוגים ${backwards} אחורה, אוספים שלושה פנסים חדשים, וממשיכים משם.`
    : "הפנסים כבו, אבל אתם עדיין בתחילת הדרך. שלושה פנסים חדשים, ומתחילים שוב מכאן.";
  document.getElementById("questSetbackPlace").textContent = quest.current.place;
  showQuestPanel("questSetback");
  stopQuestLoop();
  playSfx("setback");
}

function questSetbackNext() {
  enterStage();
}

/* ---------- שלב רגיל ---------- */

function enterStage() {
  if (quest.isBoss) return startBoss();

  questLocked = false;
  showQuestPanel("questBoard");
  renderStage();
  startQuestLoop();
}

function renderHud() {
  const step = quest.step;
  const world = quest.world;

  document.getElementById("questWorldLabel").textContent = world.name;
  document.getElementById("questWorldLabel").style.color = world.color;

  /* נקודות ההתקדמות: כל השלבים במסע, מקובצים לעולמות */
  const map = document.getElementById("questMap");
  map.innerHTML = quest.run.map((runStep, i) => {
    if (runStep.boss) {
      return `<span class="node boss ${quest.cleared[i] ? "done" : i === quest.pos ? "here" : ""}" title="קרב הדרקון"></span>`;
    }
    const state = quest.cleared[i] ? "done" : i === quest.pos ? "here" : "";
    const gap = i > 0 && quest.run[i - 1].world !== runStep.world ? " gap" : "";
    return `<span class="node${gap} ${state}" title="${runStep.stage.place}" style="--node-color:${WORLDS[runStep.world].color}"></span>`;
  }).join("");

  const lamps = document.getElementById("questLanterns");
  lamps.innerHTML = [0, 1, 2]
    .map(i => `<span class="lamp ${i < quest.lanterns ? "on" : ""}"></span>`)
    .join("");
}

/* הטקסט שנקרא בקול */
function stageSpeech() {
  const stage = quest.current;
  const intro = quest.pos === 0 ? QUEST_PROLOGUE + " " + stage.intro : stage.intro;
  const q = quest.currentQuestion;
  return `${stage.place}. ${intro} ${q ? q.question : MINIGAMES[stage.game].howto}`;
}

function speakIntro() {
  if (!quest) return;
  cancelSpeech();
  narrate(stageSpeech(), "narrator");
}

function renderStage() {
  const stage = quest.current;

  document.getElementById("questPlace").textContent = stage.place;
  document.getElementById("questIntro").textContent =
    quest.pos === 0 ? QUEST_PROLOGUE + " " + stage.intro : stage.intro;

  const result = document.getElementById("questResult");
  result.className = "quest-result hidden";
  result.textContent = "";
  document.getElementById("questNext").classList.add("hidden");

  const host = document.getElementById("questGame");
  host.innerHTML = "";
  host.className = "quest-game game-" + stage.game;

  if (stage.game === "quiz") buildQuizStage(host, stage);
  else buildMinigameStage(host, stage);

  renderHud();
  quest.render(0);
}

/* --- חידון --- */

function buildQuizStage(host, stage) {
  const q = quest.currentQuestion;

  const title = document.createElement("h3");
  title.className = "quest-question";
  title.textContent = q.question;
  host.appendChild(title);

  const box = document.createElement("div");
  box.className = "answers";
  box.id = "questAnswers";
  box.innerHTML = q.answers
    .map((text, i) => `<button class="answer" data-pick="${i}"><span class="answer-key">${i + 1}</span>${text}</button>`)
    .join("");
  host.appendChild(box);

  box.querySelectorAll(".answer").forEach(button => {
    button.addEventListener("click", () => pickAnswer(Number(button.dataset.pick)));
  });
}

function pickAnswer(index) {
  if (questLocked) return;
  questLocked = true;

  const q = quest.currentQuestion;
  const right = index === q.correct;

  document.querySelectorAll("#questAnswers .answer").forEach((button, i) => {
    button.disabled = true;
    if (i === q.correct) button.classList.add("correct");
    else if (i === index) button.classList.add("wrong");
  });

  finishStageAttempt(right);
}

/* --- משחקון --- */

function buildMinigameStage(host, stage) {
  const game = MINIGAMES[stage.game];
  if (!game) return finishStageAttempt(true);

  let settled = false;
  const api = {
    finish(won) {
      if (settled) return;
      settled = true;
      questLocked = true;
      finishStageAttempt(won);
    },
    progress(done, total, right, ok) {
      if (ok === true) playSfx("good");
      else if (ok === false) playSfx("bad");
    }
  };

  game.build(host, stage.config, api);
}

/* --- סיום ניסיון בשלב --- */

function finishStageAttempt(right) {
  const stage = quest.current;

  const result = document.getElementById("questResult");
  result.textContent = right ? stage.win : stage.lose;
  result.className = "quest-result " + (right ? "good" : "bad");

  if (right) {
    quest.clearStage();
    playSfx("good");
  } else {
    quest.missStage();
    playSfx("bad");
    if (quest.lanterns > 0) setTimeout(() => playSfx("lantern"), 260);
  }

  renderHud();
  saveQuest();

  const next = document.getElementById("questNext");
  if (!right && quest.lanterns <= 0) next.textContent = "הפנסים כבו";
  else if (right && quest.endsWorld) next.textContent = "העולם שוחרר";
  else if (right && quest.isLast) next.textContent = "לסיום המסע";
  else next.textContent = right ? "ממשיכים" : "לנסות שוב";

  next.classList.remove("hidden");
  next.focus();
}

function questNext() {
  /* נגמרו הפנסים - נסיגה */
  if (quest.lanterns <= 0) {
    const steps = quest.setback();
    saveQuest();
    return showSetback(steps);
  }

  /* השלב לא נפתר - מנסים שוב, עם תוכן מוגרל מחדש */
  if (!quest.cleared[quest.pos]) {
    quest.reroll();
    questLocked = false;
    saveQuest();
    return renderStage();
  }

  /* השלב האחרון במסע */
  if (quest.isLast) return finishQuest(true);

  /* סיום עולם */
  if (quest.endsWorld) {
    const worldIndex = quest.step.world;
    const nextStep = quest.run[quest.pos + 1];
    return showWorldDone(worldIndex, nextStep && nextStep.boss ? "boss" : "world");
  }

  /* ממשיכים בדרך */
  quest.travelTo(quest.pos + 1);
  playSfx("step");
  questLocked = false;
  saveQuest();
  renderStage();
}

/* ---------- קרב הדרקון ---------- */

let boss = null;
let bossRaf = null;
let bossLast = 0;
let bossLocked = false;

function stopBossLoop() {
  if (bossRaf) cancelAnimationFrame(bossRaf);
  bossRaf = null;
}

function startBoss() {
  const canvas = document.getElementById("bossCanvas");
  if (!canvas) return;

  boss = new DragonFight(canvas);
  bossLocked = true;

  showQuestPanel("questBoss");
  stopQuestLoop();

  document.getElementById("bossIntro").textContent = BOSS_STAGE.intro;
  document.getElementById("bossQuestionBox").classList.add("hidden");
  document.getElementById("bossStatus").textContent = "הדרקון נוחת על הבמה…";
  renderBossHud();

  boss.render(0);
  bossLast = performance.now();
  bossRaf = requestAnimationFrame(bossLoop);
  playSfx("roar");
}

function renderBossHud() {
  const hearts = document.getElementById("bossHearts");
  hearts.innerHTML = [];
  let html = "";
  for (let i = 0; i < BOSS_HEARTS; i++) {
    html += `<span class="heart ${i < boss.hearts ? "on" : ""}"></span>`;
  }
  hearts.innerHTML = html;

  document.getElementById("bossScore").textContent = `${boss.correct} / ${BOSS_TARGET}`;
  document.getElementById("bossRound").textContent =
    `שאלה ${Math.min(boss.round + 1, BOSS_ROUNDS)} מתוך ${BOSS_ROUNDS}`;

  const bar = document.querySelector("#bossHealth span");
  bar.style.width = Math.max(0, 100 - (boss.correct / BOSS_TARGET) * 100) + "%";
}

function bossLoop(now) {
  if (!boss) return;
  const dt = Math.min(0.1, (now - bossLast) / 1000);
  bossLast = now;
  boss.render(dt);

  /* מחזור ההתקפה: צובר כוח, תוקף, מתעייף - ואז נפתחת שאלה */
  if (boss.phase === "intro" && boss.phaseT > 1.9) {
    boss.setPhase("wind");
  } else if (boss.phase === "wind" && boss.phaseT > 0.65) {
    boss.setPhase("attack");
    playSfx("fire");
    document.getElementById("bossStatus").textContent = "הדרקון יורק אש!";
  } else if (boss.phase === "attack" && boss.phaseT > 1) {
    boss.setPhase("tired");
    openBossQuestion();
  } else if ((boss.phase === "strike" || boss.phase === "hit") && boss.phaseT > 1.35) {
    if (boss.correct >= BOSS_TARGET) return endBoss(true);
    if (boss.hearts <= 0) return endBoss(false);
    if (boss.round >= BOSS_ROUNDS) return endBoss(boss.correct >= BOSS_TARGET);
    boss.setPhase("wind");
    document.getElementById("bossQuestionBox").classList.add("hidden");
    document.getElementById("bossStatus").textContent = "הדרקון אוסף אוויר…";
  }

  bossRaf = requestAnimationFrame(bossLoop);
}

function openBossQuestion() {
  const q = boss.question;
  bossLocked = false;

  document.getElementById("bossStatus").textContent = "הדרקון מתנשם. עכשיו!";
  document.getElementById("bossQuestion").textContent = q.question;

  const box = document.getElementById("bossAnswers");
  box.innerHTML = q.answers
    .map((text, i) => `<button class="answer" data-pick="${i}"><span class="answer-key">${i + 1}</span>${text}</button>`)
    .join("");
  box.querySelectorAll(".answer").forEach(button => {
    button.addEventListener("click", () => bossAnswer(Number(button.dataset.pick)));
  });

  document.getElementById("bossQuestionBox").classList.remove("hidden");
  renderBossHud();
  playSfx("tick");
}

function bossAnswer(index) {
  if (bossLocked || !boss) return;
  bossLocked = true;

  const q = boss.question;
  const right = index === q.correct;

  document.querySelectorAll("#bossAnswers .answer").forEach((button, i) => {
    button.disabled = true;
    if (i === q.correct) button.classList.add("correct");
    else if (i === index) button.classList.add("wrong");
  });

  boss.answer(right);
  playSfx(right ? "strike" : "hurt");
  document.getElementById("bossStatus").textContent = right
    ? "פגיעה! הדרקון נרתע."
    : "הדרקון פגע בכם.";
  renderBossHud();
}

function endBoss(won) {
  stopBossLoop();
  boss.finish(won);

  /* נותנים לאנימציית הקריסה לרוץ לפני מסך הסיום */
  bossLast = performance.now();
  const outro = now => {
    const dt = Math.min(0.1, (now - bossLast) / 1000);
    bossLast = now;
    boss.render(dt);
    if (boss.deadP < 1 && won) {
      bossRaf = requestAnimationFrame(outro);
      return;
    }
    setTimeout(() => {
      if (won) {
        quest.cleared[quest.pos] = true;
        saveQuest();
        finishQuest(true);
      } else {
        const steps = quest.setback();
        saveQuest();
        showSetback(steps);
      }
    }, won ? 700 : 900);
  };

  document.getElementById("bossQuestionBox").classList.add("hidden");
  document.getElementById("bossStatus").textContent = won
    ? "הדרקון קורס!"
    : "הדרקון גבר עליכם.";

  if (won) bossRaf = requestAnimationFrame(outro);
  else setTimeout(() => outro(performance.now()), 500);
}

/* ---------- סיום המסע ---------- */

function finishQuest(won) {
  stopQuestLoop();
  stopBossLoop();
  clearQuestSave();
  showQuestPanel("questEnd");

  document.getElementById("questEndTitle").textContent = won
    ? "הקללה נשברה!"
    : "הקללה גברה הפעם";

  const stars = document.getElementById("questStars");
  stars.innerHTML = won
    ? [0, 1, 2].map(i => `<span class="star ${i < quest.lanterns ? "on" : ""}">★</span>`).join("")
    : "";

  const total = quest.run.length;
  document.getElementById("questEndText").textContent = won
    ? `הדרקון הובס, המכשף איבד את כוחו, והצבע חזר לשלושת העולמות. עברתם ${total} שלבים.`
    : `הגעתם ל-${quest.solved} שלבים מתוך ${total}.`;

  const recap = document.getElementById("questRecap");
  const recapTitle = document.getElementById("questRecapTitle");
  const learned = quest.run
    .map((step, i) => (quest.cleared[i] ? step.stage : null))
    .filter(Boolean);

  recap.innerHTML = learned
    .map(stage => `<li><strong>${stage.place}</strong><span>${stage.lesson}</span></li>`)
    .join("");
  recapTitle.classList.toggle("hidden", learned.length === 0);

  playSfx(won ? "win" : "fail");
}

/* ---------- מקלדת ---------- */

/* 1 עד 4 בוחרים תשובה, Enter ממשיך */
document.addEventListener("keydown", event => {
  const quiz = document.getElementById("quiz");
  if (!quest || !quiz || !quiz.classList.contains("active")) return;

  const tag = (event.target.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea") return;

  const bossOpen = !document.getElementById("questBoss").classList.contains("hidden");
  const boardOpen = !document.getElementById("questBoard").classList.contains("hidden");

  if (event.key >= "1" && event.key <= "4") {
    const scope = bossOpen ? "#bossAnswers" : "#questAnswers";
    const button = document.querySelector(`${scope} .answer[data-pick="${Number(event.key) - 1}"]`);
    if (button && !button.disabled) {
      event.preventDefault();
      if (bossOpen) bossAnswer(Number(event.key) - 1);
      else pickAnswer(Number(event.key) - 1);
    }
    return;
  }

  if (event.key === "Enter") {
    /* הכפתור הראשי של המסך שפתוח כרגע */
    const button = document.querySelector(
      ".quest-card:not(.hidden) .primary-button, " +
      (boardOpen ? "#questNext:not(.hidden)" : "#nothing"));
    if (button) {
      event.preventDefault();
      button.click();
    }
  }
});

/* ---------- אתחול ---------- */

function initTip() {
  const dayIndex = Math.floor(Date.now() / 86400000) % dailyTips.length;
  document.getElementById("homeTip").textContent = dailyTips[dayIndex];
}

document.addEventListener("DOMContentLoaded", () => {
  initTip();
  setupFilters();
  renderVideos();
  paintSiteArt();
  startBanner();
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
