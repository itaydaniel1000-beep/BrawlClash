#!/usr/bin/env bash
# מפרסם את money-game/ לאתר הציבורי https://itaydaniel1000-beep.github.io/kesef-hacham/
#
# BrawlClash הוא המקור. המאגר kesef-hacham הוא רק ראי שלו, ולכן צריך
# להריץ את זה אחרי כל שינוי שנדחף ל-main - אחרת האתר הציבורי יישאר מאחור.
#
#   ./publish-kesef.sh
#
# פעם זה עבד עם `git subtree push`, אבל הוא סורק מחדש את כל ההיסטוריה
# של המאגר בכל הרצה. עם כמה מאות קומיטים זה הפסיק לסיים בכלל - הרצה
# אחת נהרגה אחרי חצי שעה בלי להוציא שורה. במקום זה אנחנו בונים קומיט
# אחד שהעץ שלו הוא בדיוק money-game/, ודוחפים אותו. זה מיידי, כי שום
# היסטוריה לא נסרקת. הראי יוצא שרשרת של תצלומים, וזה כל מה שהוא צריך
# להיות - את ההיסטוריה האמיתית מחזיק BrawlClash.
set -euo pipefail

cd "$(dirname "$0")"

if [ -n "$(git status --porcelain money-game)" ]; then
  echo "יש שינויים ב-money-game שלא נשמרו ב-git. תחילה commit, ואז פרסום." >&2
  git status --short money-game >&2
  exit 1
fi

if ! git remote get-url kesef >/dev/null 2>&1; then
  git remote add kesef https://github.com/itaydaniel1000-beep/kesef-hacham.git
  echo "נוסף remote בשם kesef"
fi

git fetch --quiet kesef main
PARENT=$(git rev-parse FETCH_HEAD)
TREE=$(git rev-parse HEAD:money-game)

if [ "$TREE" = "$(git rev-parse "$PARENT^{tree}")" ]; then
  echo "האתר כבר מעודכן - התיקייה זהה למה שמפורסם."
  exit 0
fi

COMMIT=$(git commit-tree "$TREE" -p "$PARENT" -m "$(git log -1 --format='%s')

מראה את money-game/ מתוך BrawlClash@$(git rev-parse --short HEAD)")

git push --quiet kesef "$COMMIT:refs/heads/main"

echo "פורסם. האתר יתעדכן תוך כדקה:"
echo "  https://itaydaniel1000-beep.github.io/kesef-hacham/"
