# -*- coding: utf-8 -*-
"""
מחליף את שרידי הקול הישן בסרטון הראשון בקול של שאר האתר.

    python tools/regen_first_movie.py --list    מה ישתנה, בלי לייצר
    python tools/regen_first_movie.py           מייצר
    python tools/regen_first_movie.py --undo    מחזיר מהגיבוי

הרקע: "מה זה בכלל כסף?" הופק בשני שלבים. 24 שורות נוצרו ב-SpeechGen
(הקול "אורן") לפני שעברנו ל-edge-tts, ועוד 10 אחר כך. התוצאה היא
שהקול של המספר מתחלף באמצע הסרטון, וזה נשמע כמו תקלה.

28 ההקלטות של איתי ב-needs-wants לא נוגעים בהן: הסקריפט קורא רק את
movie.js, שבו יושב הסרטון הראשון בלבד.

הדמויות מקבלות גובה וקצב משלהן. בלי זה הפועל, הרועה והסנדלר יישמעו
בדיוק כמו המספר - וזו הסיבה שהגרסה הישנה כיוונה להם טון.

למה פייתון ולא mjs כמו שאר הכלים: node לא נמצא ב-PATH של הסביבה הזאת,
ו-edge_tts עובד מפייתון בלי בעיה.
"""

import argparse
import asyncio
import io
import json
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
VOICE = os.path.join(ROOT, "voice")
BACKUP = os.path.join(VOICE, "_old-speechgen")
LEDGER = os.path.join(VOICE, "generated.json")

# קול, גובה וקצב לכל דובר. הסטייה מהמספר היא מה שמשאיר אותם נבדלים.
PROFILES = {
    "narrator":  ("he-IL-AvriNeural", "+0Hz",  "+0%"),
    "farmer":    ("he-IL-AvriNeural", "-12Hz", "-5%"),
    "shepherd":  ("he-IL-AvriNeural", "-22Hz", "-8%"),
    "shoemaker": ("he-IL-AvriNeural", "+12Hz", "+4%"),
    "crowd":     ("he-IL-HilaNeural", "+8Hz",  "+6%"),
}

# אותו עיבוד כמו שאר הקבצים. סף -55dB ולא גבוה יותר, כי ב-TTS אין
# רעש חדר וסף אגרסיבי חותך את ההברה הראשונה.
FILTER = (
    "silenceremove=start_periods=1:start_silence=0.15:start_threshold=-55dB:detection=rms,"
    "areverse,"
    "silenceremove=start_periods=1:start_silence=0.20:start_threshold=-55dB:detection=rms,"
    "areverse,"
    "loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000"
)


def first_movie_cues():
    src = io.open(os.path.join(ROOT, "movie.js"), encoding="utf-8").read()
    start = src.index("  cues: [")
    end = src.index("\n  ]", start)
    cues = []
    for m in re.finditer(r"\{([^{}]*)\}", src[start:end]):
        body = m.group(1)
        cid = re.search(r'id:\s*"([^"]+)"', body)
        txt = re.search(r'text:\s*"([^"]*)"', body)
        who = re.search(r'who:\s*"([^"]+)"', body)
        if cid and txt:
            cues.append({"id": cid.group(1), "text": txt.group(1),
                         "who": who.group(1) if who else "narrator"})
    return cues


def speak(text, profile, dest):
    import edge_tts
    voice, pitch, rate = profile
    raw = dest + ".raw.mp3"
    asyncio.run(edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(raw))
    if not os.path.exists(raw) or os.path.getsize(raw) == 0:
        raise RuntimeError("no audio produced")
    subprocess.run(["ffmpeg", "-v", "error", "-i", raw, "-af", FILTER,
                    "-c:a", "libmp3lame", "-b:a", "128k", "-ac", "1", "-y", dest],
                   check=True)
    os.remove(raw)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--undo", action="store_true")
    args = ap.parse_args()

    ledger = set(json.load(io.open(LEDGER, encoding="utf-8")))
    cues = first_movie_cues()
    todo = [c for c in cues if c["id"] not in ledger]

    if args.undo:
        if not os.path.isdir(BACKUP):
            print("no backup to restore")
            return 1
        n = 0
        for f in os.listdir(BACKUP):
            shutil.copyfile(os.path.join(BACKUP, f), os.path.join(VOICE, f))
            ledger.discard(os.path.splitext(f)[0])
            n += 1
        io.open(LEDGER, "w", encoding="utf-8").write(
            json.dumps(sorted(ledger), ensure_ascii=False, indent=2))
        print("restored %d files" % n)
        return 0

    print()
    print("lines in the first movie : %d" % len(cues))
    print("already on the new voice : %d" % (len(cues) - len(todo)))
    print("to replace               : %d" % len(todo))
    print()
    counts = {}
    for c in todo:
        counts[c["who"]] = counts.get(c["who"], 0) + 1
    for who, n in sorted(counts.items(), key=lambda kv: -kv[1]):
        v, p, r = PROFILES.get(who, PROFILES["narrator"])
        print("   %-11s %2d   %-6s %-7s %s" % (who, n, v.replace("he-IL-", ""), p, r))

    if args.list or not todo:
        return 0

    # גיבוי לפני שנוגעים. אם התוצאה גרועה יותר, --undo מחזיר.
    os.makedirs(BACKUP, exist_ok=True)
    saved = 0
    for c in todo:
        src = os.path.join(VOICE, c["id"] + ".mp3")
        if os.path.exists(src):
            shutil.copyfile(src, os.path.join(BACKUP, c["id"] + ".mp3"))
            saved += 1
    print()
    print("backed up %d files to voice/_old-speechgen/" % saved)
    print()

    done, failed = 0, []
    for c in todo:
        prof = PROFILES.get(c["who"], PROFILES["narrator"])
        sys.stdout.write("%-6s %-11s " % (c["id"], c["who"]))
        sys.stdout.flush()
        try:
            speak(c["text"], prof, os.path.join(VOICE, c["id"] + ".mp3"))
            ledger.add(c["id"])
            done += 1
            print("ok")
        except Exception as e:
            failed.append(c["id"])
            msg = str(e).split("\n")[0]
            print("FAILED " + msg[:70])
            # 403 מ-edge-tts הוא כמעט תמיד גרסה ישנה, לא באג אצלנו
            if "403" in msg:
                print("        -> pip install --upgrade edge-tts")

    io.open(LEDGER, "w", encoding="utf-8").write(
        json.dumps(sorted(ledger), ensure_ascii=False, indent=2))

    print()
    print("replaced %d lines" % done)
    if failed:
        print("failed %d: %s" % (len(failed), ", ".join(failed)))
    print()
    print("next: node tools/rebuild-voice-manifest.mjs  (to refresh durations)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
