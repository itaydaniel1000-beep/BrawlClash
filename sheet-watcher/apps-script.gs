/**
 * מודיע במייל ברגע שנכתב משהו חדש בגיליון.
 *
 * רץ על השרתים של גוגל, בתוך הגיליון עצמו, בתור בעל החשבון. לכן:
 *   - אין צורך לשתף את הגיליון עם אף אחד
 *   - אין סיסמה ואין מפתח ששמורים איפשהו על המחשב
 *   - זו דחיפה ברגע ההקלדה, לא בדיקה כל כמה שניות
 *   - זה עובד גם כשהמחשב כבוי
 *
 * התקנה:
 *   1. בגיליון: הרחבות (Extensions) -> Apps Script
 *   2. למחוק את מה שכתוב שם, להדביק את הקובץ הזה
 *   3. לבחור למעלה את הפונקציה setup ולהריץ אותה
 *   4. גוגל תבקש אישור. צריך לאשר - בלי זה אין לסקריפט רשות לשלוח מייל.
 *
 * אחרי זה אפשר לשכוח מזה. כל כתיבה בגיליון שולחת מייל.
 */

/* נושא קבוע, כדי שאפשר יהיה לסנן אותו בתיבה */
var SUBJECT = '[כסף חכם] שורה חדשה בגיליון';

/* כמה זמן להמתין בין מיילים, בשניות. מי שמקליד משפט ארוך בתא אחד
   מייצר כמה אירועי עריכה; בלי השהייה כזאת היינו מקבלים מייל על כל
   לחיצת מקש. */
var QUIET_SECONDS = 45;


function setup() {
  /* מוחקים טריגרים קודמים, אחרת כל הרצה של setup מוסיפה עוד אחד
     והמיילים מוכפלים */
  var existing = ScriptApp.getProjectTriggers();
  for (var i = 0; i < existing.length; i++) {
    ScriptApp.deleteTrigger(existing[i]);
  }

  ScriptApp.newTrigger('onSheetEdit')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();

  /* מייל בדיקה, כדי שתדעו מיד שזה עובד ולא תצטרכו לנחש */
  MailApp.sendEmail({
    to: Session.getEffectiveUser().getEmail(),
    subject: SUBJECT,
    body: 'ההתקנה הצליחה.\n\n' +
          'מעכשיו כל פעם שתכתבו משהו בגיליון יישלח מייל לכאן.\n' +
          'זה מייל הבדיקה, אין צורך לעשות איתו כלום.'
  });
}


function onSheetEdit(e) {
  if (!e || !e.range) return;

  var range = e.range;
  var sheet = range.getSheet();
  var value = String(range.getDisplayValue() || '').trim();

  /* מחיקה של תא היא לא "שורה חדשה" */
  if (!value) return;

  /* אם נכתב עוד משהו בשניות האחרונות, נותנים לזה להירגע ולא מציפים */
  var props = PropertiesService.getDocumentProperties();
  var now = Date.now();
  var last = Number(props.getProperty('lastMail') || 0);
  var pending = props.getProperty('pending') || '';

  var entry = sheet.getName() + ' ' + range.getA1Notation() + ': ' + value;
  pending = pending ? (pending + '\n' + entry) : entry;

  if (now - last < QUIET_SECONDS * 1000) {
    props.setProperty('pending', pending);
    return;
  }

  props.setProperty('pending', '');
  props.setProperty('lastMail', String(now));

  MailApp.sendEmail({
    to: Session.getEffectiveUser().getEmail(),
    subject: SUBJECT,
    body: pending + '\n\n' +
          'הגיליון: ' + SpreadsheetApp.getActive().getUrl()
  });
}


/**
 * שולח את מה שהצטבר ולא נשלח, אם מישהו הפסיק להקליד באמצע חלון
 * ההשהיה. מחובר לטריגר שרץ כל דקה - אופציונלי, אבל בלעדיו העריכה
 * האחרונה בכל רצף עלולה להישאר תקועה עד לעריכה הבאה.
 *
 * להפעלה: לבחור את הפונקציה הזאת ולהריץ installFlush פעם אחת.
 */
function flushPending() {
  var props = PropertiesService.getDocumentProperties();
  var pending = props.getProperty('pending') || '';
  if (!pending) return;

  var last = Number(props.getProperty('lastMail') || 0);
  if (Date.now() - last < QUIET_SECONDS * 1000) return;

  props.setProperty('pending', '');
  props.setProperty('lastMail', String(Date.now()));

  MailApp.sendEmail({
    to: Session.getEffectiveUser().getEmail(),
    subject: SUBJECT,
    body: pending + '\n\n' +
          'הגיליון: ' + SpreadsheetApp.getActive().getUrl()
  });
}


function installFlush() {
  ScriptApp.newTrigger('flushPending').timeBased().everyMinutes(1).create();
}
