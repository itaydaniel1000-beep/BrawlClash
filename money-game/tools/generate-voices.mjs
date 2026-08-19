/**
 * מפיק קבצי MP3 לכל משפט בשיעורים, בעזרת שירות TTS מבוסס AI.
 *
 * הרצה:
 *   node tools/generate-voices.mjs --list          הצגת הקולות הזמינים בחשבון
 *   node tools/generate-voices.mjs                 הפקת כל הקבצים החסרים
 *   node tools/generate-voices.mjs --force         הפקה מחדש של הכול
 *
 * דורש משתני סביבה:
 *   ספק elevenlabs:  TTS_PROVIDER=elevenlabs  ELEVENLABS_API_KEY=...
 *   ספק azure:       TTS_PROVIDER=azure       AZURE_SPEECH_KEY=...  AZURE_SPEECH_REGION=westeurope
 *
 * הקבצים נשמרים ל-money-game/audio/<video-id>-<index>.mp3
 * הסקריפט מדלג על קבצים שכבר קיימים, כדי לא לבזבז מכסה.
 */

import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const audioDir = path.join(root, "audio");

const provider = (process.env.TTS_PROVIDER || "elevenlabs").toLowerCase();
const listOnly = process.argv.includes("--list");
const force = process.argv.includes("--force");

/* ---------- קולות הדמויות ---------- */
/* אחרי הרצת --list מדביקים כאן את המזהים שנבחרו */

const characterVoices = {
  elevenlabs: {
    owl: process.env.VOICE_OWL || "",
    mobi: process.env.VOICE_MOBI || "",
    /* v3 הוא האקספרסיבי ביותר; אם הוא לא זמין בחשבון נופלים ל-multilingual_v2 */
    model: process.env.TTS_MODEL || "eleven_v3",
    fallbackModel: "eleven_multilingual_v2"
  },
  azure: {
    owl: process.env.VOICE_OWL || "he-IL-AvriNeural",
    mobi: process.env.VOICE_MOBI || "he-IL-HilaNeural"
  }
};

/* ---------- קריאת הדיאלוגים מתוך script.js ---------- */

function loadVideos() {
  const source = fs.readFileSync(path.join(root, "script.js"), "utf8");
  const start = source.indexOf("const videos = [");

  if (start === -1) throw new Error("לא נמצא מערך videos בתוך script.js");

  const end = source.indexOf("\n];", start) + 3;
  const block = source.slice(start, end);

  return new Function(`${block}; return videos;`)();
}

/* ---------- ספקי TTS ---------- */

const providers = {
  async listVoices() {
    return providers[provider].list();
  },

  elevenlabs: {
    check() {
      if (!process.env.ELEVENLABS_API_KEY) {
        throw new Error("חסר ELEVENLABS_API_KEY בסביבה");
      }
    },

    async list() {
      const response = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: {"xi-api-key": process.env.ELEVENLABS_API_KEY}
      });

      if (!response.ok) throw new Error(`שגיאת רשימת קולות: ${response.status}`);

      const data = await response.json();
      return data.voices.map(voice => ({
        id: voice.voice_id,
        name: voice.name,
        info: [voice.labels?.gender, voice.labels?.age, voice.labels?.accent]
          .filter(Boolean)
          .join(", ")
      }));
    },

    async speak(text, who) {
      const config = characterVoices.elevenlabs;
      const voiceId = config[who];

      if (!voiceId) {
        throw new Error(`לא הוגדר קול עבור "${who}". הריצו --list ואז הגדירו VOICE_OWL / VOICE_MOBI`);
      }

      const attempt = async modelId => {
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
          {
            method: "POST",
            headers: {
              "xi-api-key": process.env.ELEVENLABS_API_KEY,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              text,
              model_id: modelId,
              voice_settings: {stability: 0.45, similarity_boost: 0.8, style: 0.35}
            })
          }
        );

        if (!response.ok) {
          const detail = await response.text();
          const error = new Error(`שגיאת הפקה ${response.status}: ${detail}`);
          error.status = response.status;
          throw error;
        }

        return Buffer.from(await response.arrayBuffer());
      };

      try {
        return await attempt(config.model);
      } catch (error) {
        /* המודל המבוקש לא זמין בחשבון - מנסים את הגיבוי פעם אחת */
        if (config.model !== config.fallbackModel && (error.status === 400 || error.status === 422)) {
          console.log(`\n   ↪ ${config.model} לא זמין, עובר ל-${config.fallbackModel}`);
          config.model = config.fallbackModel;
          return attempt(config.fallbackModel);
        }
        throw error;
      }
    }
  },

  azure: {
    check() {
      if (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION) {
        throw new Error("חסרים AZURE_SPEECH_KEY או AZURE_SPEECH_REGION בסביבה");
      }
    },

    async list() {
      const region = process.env.AZURE_SPEECH_REGION;
      const response = await fetch(
        `https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`,
        {headers: {"Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY}}
      );

      if (!response.ok) throw new Error(`שגיאת רשימת קולות: ${response.status}`);

      const data = await response.json();
      return data
        .filter(voice => /^he-/i.test(voice.Locale))
        .map(voice => ({
          id: voice.ShortName,
          name: voice.LocalName,
          info: `${voice.Gender}, ${voice.Locale}`
        }));
    },

    async speak(text, who) {
      const region = process.env.AZURE_SPEECH_REGION;
      const voice = characterVoices.azure[who];

      /* SSML מאפשר לכוונן גובה צליל וקצב לכל דמות */
      const prosody = who === "owl" ? 'rate="-4%" pitch="-8%"' : 'rate="+8%" pitch="+12%"';
      const ssml = `<speak version="1.0" xml:lang="he-IL"><voice name="${voice}"><prosody ${prosody}>${escapeXml(
        text
      )}</prosody></voice></speak>`;

      const response = await fetch(
        `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
        {
          method: "POST",
          headers: {
            "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3"
          },
          body: ssml
        }
      );

      if (!response.ok) {
        throw new Error(`שגיאת הפקה ${response.status}: ${await response.text()}`);
      }

      return Buffer.from(await response.arrayBuffer());
    }
  }
};

function escapeXml(text) {
  return text.replace(/[<>&'"]/g, c =>
    ({"<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;"}[c])
  );
}

/* ---------- ריצה ---------- */

async function main() {
  const engine = providers[provider];
  if (!engine) throw new Error(`ספק לא מוכר: ${provider}`);

  engine.check();

  if (listOnly) {
    const voices = await engine.list();
    console.log(`\nקולות זמינים אצל ${provider}:\n`);
    voices.forEach(voice => console.log(`  ${voice.id}\n    ${voice.name}  (${voice.info})\n`));
    console.log("הגדירו VOICE_OWL ו-VOICE_MOBI למזהים שבחרתם, ואז הריצו שוב בלי --list.\n");
    return;
  }

  const videos = loadVideos();
  fs.mkdirSync(audioDir, {recursive: true});

  let made = 0;
  let skipped = 0;
  let characters = 0;

  for (const video of videos) {
    for (let i = 0; i < video.script.length; i++) {
      const line = video.script[i];
      const file = path.join(audioDir, `${video.id}-${i}.mp3`);

      if (!force && fs.existsSync(file)) {
        skipped++;
        continue;
      }

      process.stdout.write(`🎙  ${video.id}-${i} … `);
      const audio = await engine.speak(line.text, line.who);
      fs.writeFileSync(file, audio);

      characters += line.text.length;
      made++;
      console.log(`${(audio.length / 1024).toFixed(0)}KB`);

      /* מרווח קטן כדי לא להיתקל בהגבלת קצב */
      await new Promise(resolve => setTimeout(resolve, 350));
    }
  }

  /* רשימת הקבצים הקיימים, כדי שהאתר יידע מה זמין בלי לנסות ולקבל 404 */
  const available = [];
  for (const video of videos) {
    for (let i = 0; i < video.script.length; i++) {
      if (fs.existsSync(path.join(audioDir, `${video.id}-${i}.mp3`))) {
        available.push(`${video.id}-${i}`);
      }
    }
  }

  fs.writeFileSync(
    path.join(audioDir, "manifest.json"),
    JSON.stringify({provider, files: available}, null, 2)
  );

  console.log(
    `\n✅ הופקו ${made} קבצים (${characters} תווים), דולגו ${skipped} שכבר היו קיימים.`
  );
  console.log(`📄 manifest.json מכיל ${available.length} רשומות.`);
  console.log(`📁 ${audioDir}\n`);
}

main().catch(error => {
  console.error(`\n❌ ${error.message}\n`);
  process.exit(1);
});
