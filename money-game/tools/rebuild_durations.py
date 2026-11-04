# -*- coding: utf-8 -*-
"""
מודד מחדש את אורך כל קובץ קול ומעדכן את voice-durations.js.

    python tools/rebuild_durations.py

מקבילה בפייתון ל-rebuild-voice-manifest.mjs, לסביבות שבהן node לא זמין.
היא נוגעת רק באורכים; את manifest.json היא לא משנה, כי הרשימה שם לא
השתנתה - רק התוכן של הקבצים.

למה זה חשוב: buildMovie מתזמן כל שורה לפי האורך המדוד שלה. אם האורך
בקובץ לא תואם למה שבאודיו, שורה תיחתך באמצע כשהשורה הבאה מתחילה.
"""

import io
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
VOICE = os.path.join(ROOT, "voice")
OUT = os.path.join(ROOT, "voice-durations.js")

AUDIO = (".mp3", ".m4a", ".wav", ".ogg", ".oga", ".webm", ".aac", ".flac")


def duration(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                        "format=duration", "-of", "csv=p=0", path],
                       capture_output=True, text=True, timeout=30)
    try:
        return round(float(r.stdout.strip()), 2)
    except ValueError:
        return None


def main():
    # הסדר נשמר לפי manifest.json, כדי שה-diff יישאר קריא
    manifest = json.load(io.open(os.path.join(VOICE, "manifest.json"),
                                 encoding="utf-8"))
    order = manifest.get("lines", [])

    on_disk = {}
    for name in os.listdir(VOICE):
        stem, ext = os.path.splitext(name)
        if ext.lower() in AUDIO:
            on_disk[stem] = os.path.join(VOICE, name)

    # קודם מה שרשום במניפסט, ואז כל השאר
    ids = [i for i in order if i in on_disk]
    ids += sorted(k for k in on_disk if k not in order)

    old = {}
    if os.path.exists(OUT):
        txt = io.open(OUT, encoding="utf-8").read()
        for line in txt.splitlines():
            if ":" in line and '"' in line:
                k = line.split('"')[1]
                try:
                    old[k] = float(line.split(":")[1].strip().rstrip(","))
                except ValueError:
                    pass

    rows, changed, missing = [], [], []
    for cue_id in ids:
        d = duration(on_disk[cue_id])
        if d is None:
            missing.append(cue_id)
            continue
        rows.append((cue_id, d))
        if cue_id in old and abs(old[cue_id] - d) >= 0.05:
            changed.append((cue_id, old[cue_id], d))

    body = ",\n".join('  "%s": %s' % (k, v) for k, v in rows)
    io.open(OUT, "w", encoding="utf-8").write(
        "/* נוצר אוטומטית על ידי tools/rebuild_durations.py - אין לערוך ביד. */\n"
        "const VOICE_DURATIONS = {\n" + body + "\n};\n")

    print("measured %d files" % len(rows))
    if missing:
        print("unreadable: %s" % ", ".join(missing))
    print("changed by 0.05s or more: %d" % len(changed))
    for cue_id, a, b in changed:
        print("   %-18s %5.2f -> %5.2f  (%+.2f)" % (cue_id, a, b, b - a))
    return 0


if __name__ == "__main__":
    sys.exit(main())
