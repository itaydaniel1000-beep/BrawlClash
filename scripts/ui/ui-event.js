// ui-event.js — 🎂 Birthday event (21 May)
//
// Placeholder skeleton. The actual game mechanic — what the player
// DOES inside the event — is still being designed by the user, so this
// file currently renders a "coming soon" page. The structure here
// (constants for the dates, renderEventScreen, persistence keys) is
// already in place so plugging in the chosen mechanic is a one-function
// add.

// Event window — runs from a few days before the birthday through a few
// days after. The button stays visible only during this window.
const EVENT_BIRTHDAY_MONTH = 4;          // 0-indexed → May
const EVENT_BIRTHDAY_DAY   = 21;
const EVENT_OPEN_FROM_DAYS = 14;         // window opens 14 days before
const EVENT_CLOSE_AFTER_DAYS = 7;        // closes 7 days after

function _isEventActive(now) {
    now = now || new Date();
    const year = now.getFullYear();
    const birthday   = new Date(year, EVENT_BIRTHDAY_MONTH, EVENT_BIRTHDAY_DAY);
    const opens      = new Date(birthday.getTime() - EVENT_OPEN_FROM_DAYS    * 86400000);
    const closes     = new Date(birthday.getTime() + EVENT_CLOSE_AFTER_DAYS  * 86400000);
    return now >= opens && now <= closes;
}

// True only during the 7-day "cake is in your deck" window (May 21–27).
// The event button shows up earlier (countdown) but the actual character
// is only playable during this tighter window.
function _isCakeAvailable(now) {
    now = now || new Date();
    const year = now.getFullYear();
    const birthday = new Date(year, EVENT_BIRTHDAY_MONTH, EVENT_BIRTHDAY_DAY);
    const closes   = new Date(birthday.getTime() + 7 * 86400000);  // 7 days
    return now >= birthday && now < closes;
}
window._isCakeAvailable = _isCakeAvailable;

function _daysUntilBirthday(now) {
    now = now || new Date();
    const year = now.getFullYear();
    const birthday = new Date(year, EVENT_BIRTHDAY_MONTH, EVENT_BIRTHDAY_DAY);
    // If we're past this year's birthday, count toward next year.
    if (now > birthday) birthday.setFullYear(year + 1);
    return Math.ceil((birthday - now) / 86400000);
}

// Toggle the 🎉 sidebar button so it only appears during the active window.
function refreshEventButtonVisibility() {
    const btn = document.querySelector('.event-btn');
    if (!btn) return;
    btn.style.display = _isEventActive() ? 'flex' : 'none';
}
window.refreshEventButtonVisibility = refreshEventButtonVisibility;

// Body of the event screen. Re-renders every time the player opens the
// screen so the countdown / claim state stay live.
function renderEventScreen() {
    const container = document.getElementById('event-container');
    if (!container) return;
    const days = _daysUntilBirthday();
    const isBirthday = days === 0;
    const cakeNow = _isCakeAvailable();
    const headline = isBirthday
        ? '🎂 היום זה היום! יום ההולדת 🎂'
        : (days > 0 ? `⏰ עוד <b>${days}</b> ימים ליום ההולדת` : 'האירוע נמשך עוד מעט!');

    const cakeStatus = cakeNow
        ? `<div style="background:rgba(46,204,113,0.25); border:2px solid #2ecc71; color:#fff; padding:8px; border-radius:10px; text-align:center; margin-top:10px;">✅ הקלף פעיל בחפיסה שלך!</div>`
        : `<div style="background:rgba(0,0,0,0.35); border:2px dashed #fff; color:#fff; padding:8px; border-radius:10px; text-align:center; margin-top:10px;">${days > 0 ? `🔒 ייפתח ב-21 במאי (עוד ${days} ימים)` : 'תקופת האירוע הסתיימה'}</div>`;

    container.innerHTML = `
        <div style="background: rgba(0,0,0,0.35); border: 2px solid #fff; border-radius: 14px; padding: 14px; margin-bottom: 12px; text-align: center; color: #fff;">
            <div style="font-size: 1.1rem; margin-bottom: 4px;">${headline}</div>
            <div style="font-size: 0.85rem; opacity: 0.85;">האירוע לכבוד יום ההולדת של היוצר (21 במאי).</div>
        </div>
        <div style="background: rgba(255,255,255,0.15); border: 3px solid #f1c40f; border-radius: 14px; padding: 16px; color: #fff;">
            <div style="display:flex; align-items:center; gap:14px; justify-content:center; margin-bottom:8px;">
                <div style="font-size:3.5rem;">🎂</div>
                <div style="text-align:right;">
                    <div style="font-size:1.3rem; font-weight:bold;">עוגה</div>
                    <div style="font-size:0.85rem; opacity:0.85;">דמות אירוע מיוחדת</div>
                </div>
            </div>
            <div style="background:rgba(0,0,0,0.3); border-radius:10px; padding:10px; font-size:0.9rem; line-height:1.6;">
                🏠 בניין נייח שעולה <b>5 אליקסיר</b><br>
                ❤️ חיים: <b>1500</b><br>
                🕯️ יורה <b>נר להבה</b> לאויב הקרוב כל <b>2 שניות</b> (טווח 200, נזק 100)<br>
                💥 <b>כשהיא מתה</b> — כל היחידות של היריב במגרש מתות בו-זמנית<br>
                🎂💥 כפתור פיצוץ ייעודי מופיע כשהעוגה במגרש — קליק מפעיל את הפיצוץ<br>
                ⛔ <b>מקסימום עוגה אחת</b> במגרש בכל זמן<br>
                🗓️ זמין רק בין <b>21 במאי</b> ועד <b>27 במאי</b>
            </div>
            ${cakeStatus}
        </div>
    `;
}
window.renderEventScreen = renderEventScreen;
