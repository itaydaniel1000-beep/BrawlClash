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


/* ===================================================================
   קליטת הערות מהאתר
   ===================================================================

   האתר שולח לכאן הערה, הסקריפט מוסיף אותה ללשונית "הערות", והטריגר
   שלמעלה שולח מייל. ככה הערה שנכתבת באתר מגיעה אליכם לבד.

   פריסה (אחרי setup):
     1. למעלה מימין: Deploy -> New deployment
     2. סוג: Web app
     3. Execute as: Me
     4. Who has access: Anyone      <- חובה, אחרת האתר לא יוכל לשלוח
     5. Deploy, ולהעתיק את הכתובת שמתקבלת
     6. להדביק אותה ב-money-game/comments.js, בשדה ENDPOINT

   "Anyone" נשמע מפחיד, אבל מה שחשוף פה הוא רק הפונקציה הזאת, והיא
   יודעת לעשות דבר אחד: להוסיף שורת טקסט. היא לא קוראת כלום ולא
   מחזירה כלום. */

var NOTES_SHEET = 'הערות';
var MAX_LEN = 500;          /* הערה ארוכה מזה נחתכת */
var MIN_GAP_SECONDS = 20;   /* מאותו שולח, כדי שלא יציפו */

function doPost(e) {
  try {
    var text = '';
    if (e && e.postData && e.postData.contents) {
      /* האתר שולח text/plain ולא JSON, כי בקשת JSON מפעילה preflight
         ש-Apps Script לא עונה עליו. התוכן עצמו הוא JSON. */
      try { text = String(JSON.parse(e.postData.contents).text || ''); }
      catch (err) { text = String(e.postData.contents); }
    }
    text = text.trim();
    if (!text) return ContentService.createTextOutput('empty');
    if (text.length > MAX_LEN) text = text.slice(0, MAX_LEN) + '…';

    /* חסימת הצפה: לא יותר מהערה אחת כל כמה שניות */
    var props = PropertiesService.getScriptProperties();
    var now = Date.now();
    var last = Number(props.getProperty('lastNote') || 0);
    if (now - last < MIN_GAP_SECONDS * 1000) {
      return ContentService.createTextOutput('too fast');
    }
    props.setProperty('lastNote', String(now));

    var ss = SpreadsheetApp.getActive();
    var sheet = ss.getSheetByName(NOTES_SHEET) || ss.insertSheet(NOTES_SHEET);

    /* התאריך נכתב כטקסט ולא כערך תאריך, כדי שהגיליון לא יעצב אותו
       מחדש וישנה את מה שרואים */
    var when = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(),
                                    'dd/MM/yyyy HH:mm');
    sheet.appendRow([text, when]);

    return ContentService.createTextOutput('ok');
  } catch (err) {
    /* לא מחזירים את השגיאה החוצה - אין סיבה שאתר ציבורי ידע מה נשבר */
    console.error(err);
    return ContentService.createTextOutput('error');
  }
}
