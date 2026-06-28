# הקמת האתר — Firebase + Netlify

האתר נמצא בקובץ אחד: `index.html`. צריך לעשות 2 דברים:
**(א)** לחבר בסיס נתונים משותף (Firebase) **(ב)** להעלות לאינטרנט (Netlify).

---

## ✅ חלק א' — Firebase — כבר בוצע!

פרויקט Firebase בשם **`itay-yotam`** כבר נוצר, Firestore הופעל, ה-config כבר מודבק
ב-`index.html`, וכללי ההרשאה פורסמו (גישה רק למסמך `shared/data`, ללא תפוגה).
נבדק ועובד. **אין צורך לעשות שום דבר בחלק הזה.** (ההוראות נשמרו למטה רק לתיעוד.)

לוח הבקרה: https://console.firebase.google.com/project/itay-yotam

---

## חלק א' (לתיעוד בלבד) — Firebase

### 1. יצירת פרויקט
1. היכנס ל-https://console.firebase.google.com
2. לחץ **Add project** / "הוסף פרויקט", תן שם (למשל `itay-yotam`), המשך עד הסוף. אפשר לכבות Google Analytics.

### 2. הפעלת Firestore
1. בתפריט השמאלי: **Build → Firestore Database**
2. **Create database**
3. בחר **Start in test mode** (גישה פתוחה ל-30 יום) → **Next** → בחר מיקום → **Enable**

> הערה: "test mode" פותח את הנתונים לכולם למשך 30 יום. לשימוש פרטי בין שניכם זה בסדר. אם תרצה אחר כך אבטחה אמיתית — תגיד לי ונוסיף.

### 3. העתקת ה-config
1. בפינה: גלגל שיניים ⚙️ → **Project settings**
2. גלול ל-**Your apps** → לחץ על אייקון הווב **`</>`**
3. תן כינוי (למשל `web`) → **Register app**
4. תקבל בלוק שנראה ככה:
   ```js
   const firebaseConfig = {
     apiKey: "AIza........",
     authDomain: "itay-yotam.firebaseapp.com",
     projectId: "itay-yotam",
     storageBucket: "itay-yotam.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234:web:abcd"
   };
   ```

### 4. הדבקה בקוד
1. פתח את `index.html`
2. חפש בראש הקובץ את `const firebaseConfig = {`
3. החלף את הערכים `YOUR_...` בערכים האמיתיים שקיבלת.
4. שמור.

זהו — מרגע זה האתר עובד בשיתוף. אפשר לבדוק מקומית: פתח את `index.html` בשני חלונות, היכנס באחד כאיתי וכתוב, ובשני כיותם ולחץ "לראות מה הוא רשם".

---

## חלק ב' — Netlify (להעלות לאינטרנט, חינם)

### הדרך הכי קלה (גרירה):
1. היכנס ל-https://app.netlify.com (הרשם חינם, אפשר עם Google/GitHub)
2. בעמוד הראשי, חפש את האזור **"Want to deploy a new site without connecting to Git? Drag and drop your site output folder here"**
3. **גרור לשם את התיקייה `my-site`** (כל התיקייה, לא רק הקובץ).
4. תוך כ-10 שניות תקבל כתובת כמו `https://random-name-123.netlify.app`
5. אפשר לשנות את השם תחת **Site settings → Change site name**.

### לעדכן את האתר בעתיד:
פשוט גרור שוב את התיקייה לאותו אתר (תחת **Deploys**), או הגדר חיבור ל-Git לעדכון אוטומטי.

---

## סדר מומלץ
1. קודם Firebase (חלקים 1–4) — כדי שהשיתוף יעבוד.
2. אחר כך Netlify — כדי לקבל כתובת לשלוח ליותם.

תקוע במשהו? תגיד לי באיזה שלב ואני אעזור.
