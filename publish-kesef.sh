#!/usr/bin/env bash
# מפרסם את money-game/ לאתר הציבורי https://itaydaniel1000-beep.github.io/kesef-hacham/
#
# BrawlClash הוא המקור. המאגר kesef-hacham הוא רק ראי שלו, ולכן צריך
# להריץ את זה אחרי כל שינוי שנדחף ל-main - אחרת האתר הציבורי יישאר מאחור.
#
#   ./publish-kesef.sh
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

echo "דוחף את money-game/ כשורש המאגר kesef-hacham…"
git subtree push --prefix=money-game kesef main

echo
echo "פורסם. האתר יתעדכן תוך כדקה:"
echo "  https://itaydaniel1000-beep.github.io/kesef-hacham/"
