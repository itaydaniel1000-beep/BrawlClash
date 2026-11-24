# -*- coding: utf-8 -*-
"""
מחשב מחדש את חותמת הגרסה ב-index.html.

    python tools/stamp.py

כל קובץ JS ו-CSS שהדף טוען מקבל ?v=<חותמת>, והחותמת היא תמצית של
התוכן של כולם יחד. כשמשהו משתנה החותמת משתנה, והדפדפן מוריד את
הקבצים החדשים במקום להגיש גרסה שמורה.

חשוב גם ל-voice-durations.js: התזמון של כל שורה בסרטון נגזר ממנו,
ודפדפן שמגיש אותו מהמטמון יריץ את הסרטון לפי אורכי הקלטות ישנים.
"""

import hashlib
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = os.path.join(ROOT, "index.html")

html = open(PAGE, encoding="utf-8", newline="").read()

# כל נכס שמופיע בדף עם ?v=
assets = re.findall(r'(?:src|href)="([^"?]+\.(?:js|css))\?v=[^"]*"', html)
seen = []
for a in assets:
    if a not in seen:
        seen.append(a)

missing = [a for a in seen if not os.path.exists(os.path.join(ROOT, a))]
if missing:
    print("חסרים קבצים: " + ", ".join(missing), file=sys.stderr)
    sys.exit(1)

h = hashlib.sha1()
for a in sorted(seen):
    h.update(a.encode("utf-8"))
    h.update(open(os.path.join(ROOT, a), "rb").read())
stamp = h.hexdigest()[:8]

old = set(re.findall(r'\?v=([0-9a-f]{8})"', html))
new_html = re.sub(r'(\?v=)[0-9a-f]{8}(")', r"\g<1>" + stamp + r"\g<2>", html)

if new_html == html:
    print("החותמת כבר מעודכנת: " + stamp)
else:
    open(PAGE, "w", encoding="utf-8", newline="\n").write(new_html)
    print("חותמת: " + ", ".join(sorted(old)) + " -> " + stamp)
print("%d נכסים" % len(seen))
