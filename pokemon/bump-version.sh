#!/usr/bin/env bash
# מוסיף מספר גרסה חדש לכל הקבצים שהדפים טוענים (?v=...).
# להריץ לפני כל העלאה: ככה הדפדפן מוריד את כל הקבצים מחדש וביחד,
# ולא מערבב קובץ ישן מהזיכרון עם קובץ חדש - מה שגורם למשחק להיתקע.
set -euo pipefail
cd "$(dirname "$0")"
v=$(date +%Y%m%d%H%M)
for f in index.html world.html; do
  sed -E -i "s/(src|href)=\"([a-z0-9-]+\.(js|css))(\?v=[0-9]+)?\"/\1=\"\2?v=$v\"/g" "$f"
done
echo "גרסה $v"
