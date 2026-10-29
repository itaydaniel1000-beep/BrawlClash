# -*- coding: utf-8 -*-
"""
צופה בגיליון גוגל ומודיע כשמשהו חדש נוסף בו.

    python watch.py            רץ ברקע ובודק כל 30 שניות
    python watch.py --once     בדיקה אחת ויציאה
    python watch.py --reset    מוחק את הזיכרון, כך שהכול ייחשב חדש בפעם הבאה

הגיליון חייב להיות משותף כ"כל מי שיש לו הקישור - מציג". בלי זה גוגל
מחזיר 401 גם לבקשה הזאת, כי אין פה שום התחברות - וזו הנקודה: סקריפט
בלי סיסמאות ובלי מפתחות הוא סקריפט שלא יישבר בעוד חודש.

מה הוא עושה כשהוא מוצא שורה חדשה:
  1. כותב אותה ל-pending.jsonl, שזה התור שקלוד קורא
  2. מקפיץ הודעה על המסך, כדי שתדע מיד
הוא לא פונה לקלוד בעצמו. סקריפט לא יכול לדחוף הודעה לשיחה, ולכן
ההודעה על המסך היא מה שסוגר את הלולאה - אתה רואה, ואתה אומר לי.
"""

import argparse
import csv
import hashlib
import io
import json
import os
import subprocess
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
SHEET_ID = "19AmPdeEfKEZj6nHfHnXlQgGOczE4wwroY6OkJyu7sp4"
GID = "0"
STATE_PATH = os.path.join(HERE, "state.json")
PENDING_PATH = os.path.join(HERE, "pending.jsonl")
LOG_PATH = os.path.join(HERE, "watch.log")
INTERVAL = 30

CSV_URL = ("https://docs.google.com/spreadsheets/d/{id}/export"
           "?format=csv&gid={gid}").format(id=SHEET_ID, gid=GID)

# פקודת ההתראה היא מחרוזת קבועה. הכותרת והגוף מגיעים אליה דרך משתני
# סביבה ולא נתפרים לתוכה, כי הטקסט מגיע מהגיליון - כלומר ממקור שכל מי
# שיש לו הקישור יכול לערוך. טקסט כזה לעולם לא נכנס לפקודה שרצה.
TOAST_PS = (
    '[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications,'
    ' ContentType=WindowsRuntime] > $null;'
    '$t = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent('
    '[Windows.UI.Notifications.ToastTemplateType]::ToastText02);'
    '$n = $t.GetElementsByTagName("text");'
    '$n.Item(0).AppendChild($t.CreateTextNode($env:WATCH_TITLE)) > $null;'
    '$n.Item(1).AppendChild($t.CreateTextNode($env:WATCH_BODY)) > $null;'
    '[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('
    '"Sheet Watcher").Show([Windows.UI.Notifications.ToastNotification]::new($t));'
)


def log(msg):
    line = "%s  %s" % (datetime.now().strftime("%H:%M:%S"), msg)
    print(line, flush=True)
    with io.open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def fetch_rows():
    """מחזיר את שורות הגיליון, או זורק שגיאה מוסברת."""
    req = urllib.request.Request(CSV_URL, headers={"User-Agent": "sheet-watcher/1"})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            raw = r.read()
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            raise RuntimeError(
                "גוגל דורש התחברות (HTTP %d). שתפו את הגיליון כ'כל מי שיש "
                "לו הקישור - מציג' ונסו שוב." % e.code)
        raise RuntimeError("גוגל החזיר HTTP %d" % e.code)

    text = raw.decode("utf-8-sig", errors="replace")
    if text.lstrip().startswith("<"):
        raise RuntimeError("קיבלנו דף HTML במקום נתונים - כנראה מסך התחברות.")
    return [row for row in csv.reader(io.StringIO(text))]


def row_key(row):
    """טביעת אצבע של שורה. שינוי בתוך שורה קיימת נחשב גם הוא לחדש."""
    joined = "\u001f".join(cell.strip() for cell in row)
    return hashlib.sha1(joined.encode("utf-8")).hexdigest()[:16]


def load_state():
    if not os.path.exists(STATE_PATH):
        return {"seen": [], "first_run": True}
    with io.open(STATE_PATH, encoding="utf-8") as f:
        return json.load(f)


def save_state(state):
    with io.open(STATE_PATH, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def notify(title, body):
    """הודעה על המסך. נכשלת בשקט - התראה שלא עלתה היא לא סיבה להפיל צופה."""
    env = dict(os.environ, WATCH_TITLE=title, WATCH_BODY=body)
    try:
        subprocess.run(["powershell", "-NoProfile", "-NonInteractive",
                        "-Command", TOAST_PS],
                       env=env, timeout=20, capture_output=True)
    except Exception as e:
        log("ההתראה לא עלתה (%s) - ממשיכים" % type(e).__name__)


def check(state):
    """בדיקה אחת. מחזיר כמה שורות חדשות נמצאו."""
    rows = fetch_rows()
    if not rows:
        return 0

    header, body = rows[0], rows[1:]
    seen = set(state.get("seen", []))
    fresh = []

    for i, row in enumerate(body, start=2):
        if not any(cell.strip() for cell in row):
            continue
        k = row_key(row)
        if k not in seen:
            fresh.append({"line": i, "key": k, "cells": row})
        seen.add(k)

    state["seen"] = sorted(seen)

    # בריצה הראשונה כל הגיליון "חדש". רושמים אותו בלי להציף בהתראות.
    if state.get("first_run"):
        state["first_run"] = False
        state["header"] = header
        save_state(state)
        log("ריצה ראשונה: נרשמו %d שורות קיימות, בלי התראה." % len(fresh))
        return 0

    if fresh:
        with io.open(PENDING_PATH, "a", encoding="utf-8") as f:
            for item in fresh:
                item["at"] = datetime.now().isoformat(timespec="seconds")
                item["header"] = header
                f.write(json.dumps(item, ensure_ascii=False) + "\n")

        first = " | ".join(c for c in fresh[0]["cells"] if c.strip())[:90]
        notify("יש משהו חדש בגיליון",
               first if len(fresh) == 1
               else "%d שורות חדשות. הראשונה: %s" % (len(fresh), first))
        log("נמצאו %d שורות חדשות" % len(fresh))

    save_state(state)
    return len(fresh)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--once", action="store_true", help="בדיקה אחת ויציאה")
    ap.add_argument("--reset", action="store_true", help="מחיקת הזיכרון")
    ap.add_argument("--interval", type=int, default=INTERVAL)
    args = ap.parse_args()

    if args.reset:
        for p in (STATE_PATH, PENDING_PATH):
            if os.path.exists(p):
                os.remove(p)
        log("הזיכרון נמחק.")
        return 0

    state = load_state()

    if args.once:
        try:
            check(state)
        except RuntimeError as e:
            log("שגיאה: %s" % e)
            return 1
        return 0

    log("מתחיל. בודק כל %d שניות. Ctrl+C לעצירה." % args.interval)
    fails = 0
    while True:
        try:
            check(state)
            fails = 0
        except RuntimeError as e:
            fails += 1
            # לא מציפים את הלוג באותה שגיאה שוב ושוב
            if fails in (1, 5) or fails % 40 == 0:
                log("שגיאה (%d ברצף): %s" % (fails, e))
        except Exception as e:
            log("תקלה לא צפויה: %s: %s" % (type(e).__name__, e))
        time.sleep(args.interval)


if __name__ == "__main__":
    sys.exit(main() or 0)
