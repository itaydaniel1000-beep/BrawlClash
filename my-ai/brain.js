/* המוח: מודל שפה אמיתי שרץ על כרטיס המסך דרך WebGPU.
   בלי שרת, בלי מפתח, בלי חשבון. אחרי ההורדה הראשונה הוא שמור בדפדפן. */

const CDN = "https://esm.run/@mlc-ai/web-llm@0.2.87";

/* Qwen3 ולא Qwen3.5: ל-3.5 יש ארכיטקטורה חדשה שמפילה את כרטיס המסך
   (RTX 5070) כבר בתשובה הראשונה. Qwen3 רץ עליו חלק. */
export const BRAINS = {
  fast:   { id: "Qwen3-1.7B-q4f16_1-MLC", gb: 1.0, name: "מהיר" },
  normal: { id: "Qwen3-4B-q4f16_1-MLC",   gb: 2.1, name: "חכם" },
  genius: { id: "Qwen3-8B-q4f16_1-MLC",   gb: 4.3, name: "גאון" }
};

let webllm = null;
let engine = null;
let loadedId = null;
let worker = null;
let loadAttempt = 0;
let busy = Promise.resolve();   /* כל הבקשות למודל עוברות בתור אחד */

export const brain = {
  state: "idle",                /* idle | loading | ready | unsupported | failed */
  progress: 0,
  text: "",
  brainKey: null,
  listeners: new Set(),
  on(fn) { this.listeners.add(fn); fn(this); return () => this.listeners.delete(fn); }
};

function set(state, progress, text) {
  brain.state = state;
  if (progress != null) brain.progress = progress;
  if (text != null) brain.text = text;
  brain.listeners.forEach(fn => { try { fn(brain); } catch (e) { console.error(e); } });
}

export async function gpuOk() {
  if (!("gpu" in navigator)) return false;
  try { return !!(await navigator.gpu.requestAdapter()); } catch { return false; }
}

export async function isCached(key) {
  try {
    webllm = webllm || await import(CDN);
    return await webllm.hasModelInCache(BRAINS[key].id);
  } catch { return false; }
}

/* הורדה עמידה: כל קובץ של המודל יורד בחתיכות של 16MB.
   אם החיבור נופל, מנסים שוב רק את החתיכה ההיא ולא את כל הקובץ.
   הקבצים נשמרים בדיוק במקום ש-WebLLM מחפש אותם, אז אחר כך הוא
   מוצא הכול מוכן ולא מוריד כלום. */
export async function prefetch(modelId, onProgress, isCurrent = () => true) {
  webllm = webllm || await import(CDN);
  const rec = webllm.prebuiltAppConfig.model_list.find(m => m.model_id === modelId);
  if (!rec) return;
  const base = rec.model.replace(/\/?$/, "/") + "resolve/main/";
  const cache = await caches.open("webllm/model");
  const have = new Set((await cache.keys()).map(r => r.url));

  let listUrl = base + "tensor-cache.json";
  let list = await cache.match(listUrl);
  if (!list) {
    let r = await fetch(listUrl);
    if (!r.ok) { listUrl = base + "ndarray-cache.json"; r = await fetch(listUrl); }
    if (!r.ok) return;
    await cache.put(listUrl, r.clone());
    list = r;
  }
  const records = (await list.json()).records;
  const total = records.reduce((s, r) => s + r.nbytes, 0);
  let done = records.filter(r => have.has(base + r.dataPath)).reduce((s, r) => s + r.nbytes, 0);
  const report = () => onProgress(done / total);
  report();

  const CH = 16 * 1024 * 1024;
  for (const r of records) {
    const url = base + r.dataPath;
    if (have.has(url)) continue;
    const parts = [];
    for (let off = 0; off < r.nbytes; off += CH) {
      const end = Math.min(off + CH, r.nbytes) - 1;
      for (let t = 0; ; t++) {
        if (!isCurrent()) return;
        try {
          const res = await fetch(url, { headers: { Range: `bytes=${off}-${end}` } });
          if (res.status !== 206 && res.status !== 200) throw new Error("http " + res.status);
          const buf = await res.arrayBuffer();
          if (buf.byteLength !== end - off + 1) throw new Error("short read");
          parts.push(buf); done += buf.byteLength; report();
          break;
        } catch (e) {
          if (t > 20) throw e;
          await new Promise(ok => setTimeout(ok, 1500 + t * 1000));
        }
      }
    }
    await cache.put(url, new Response(new Blob(parts), {
      headers: { "Content-Type": "application/octet-stream", "Content-Length": String(r.nbytes) }
    }));
  }
}

export async function loadBrain(key) {
  const b = BRAINS[key] || BRAINS.normal;
  if (loadedId === b.id && brain.state === "ready") return;
  brain.brainKey = key;

  if (!(await gpuOk())) { set("unsupported", 0, "אין כאן כרטיס מסך שתומך"); return; }

  const attempt = ++loadAttempt;
  set("loading", 0, "מתחיל");
  /* אינטרנט איטי נתקע לפעמים באמצע קובץ. כל מה שכבר ירד שמור,
     אז ניסיון חוזר ממשיך מאותה נקודה. */
  for (let tries = 0; tries < 8; tries++) {
    try {
      webllm = webllm || await import(CDN);
      /* 95% מהפס הוא ההורדה, 5% הוא ההעלאה לכרטיס המסך */
      await prefetch(b.id, p => set("loading", p * 0.95, "מוריד"), () => attempt === loadAttempt);
      if (attempt !== loadAttempt) return;
      const onProg = r => {
        if (attempt !== loadAttempt) return;
        const p = typeof r.progress === "number" ? r.progress : 0;
        set("loading", 0.95 + p * 0.05, r.text || "");
      };
      if (engine) {
        engine.setInitProgressCallback?.(onProg);
        await engine.reload(b.id, { context_window_size: 8192 });
      } else {
        worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
        engine = await webllm.CreateWebWorkerMLCEngine(worker, b.id, {
          initProgressCallback: onProg
        }, { context_window_size: 8192 });
      }
      if (attempt !== loadAttempt) return;
      loadedId = b.id;
      set("ready", 1, "");
      return;
    } catch (err) {
      console.error("brain:", err);
      if (attempt !== loadAttempt) return;
      try { worker?.terminate(); } catch {}
      worker = null; engine = null; loadedId = null;
      await new Promise(r => setTimeout(r, 3000 + tries * 2000));
    }
  }
  set("failed", 0, "הטעינה נכשלה");
}

/* מוריד את <think>...</think> אם המודל החליט לחשוב בקול */
function clean(text) {
  return fixScript(text.replace(/<think>[\s\S]*?(<\/think>|$)/g, "").replace(/^\s+/, ""));
}

/* המודל אומן בעיקר על אנגלית וסינית, ובאמצע מילה עברית הוא מחליק לפעמים
   לאותיות רוסיות שנשמעות אותו דבר ("קосמית"). בתוך מילה עברית מחליפים
   אותן באות העברית המתאימה, ותווים סיניים/יפניים פשוט נזרקים. */
const CYR = { "а":"א","б":"ב","в":"ו","г":"ג","д":"ד","е":"","ж":"ז","з":"ז","и":"י","й":"י","к":"ק","л":"ל","м":"מ","н":"נ","о":"ו","п":"פ","р":"ר","с":"ס","т":"ת","у":"ו","ф":"פ","х":"ח","ц":"צ","ч":"צ","ш":"ש","щ":"ש","ы":"י","э":"א","ю":"יו","я":"יא","ь":"","ъ":"" };
function fixScript(s) {
  s = s.replace(/[぀-ヿ㐀-鿿가-힯豈-﫿]+/g, "");
  /* מילה רוסית שלמה בתוך טקסט עברי - נזרקת יחד עם המרכאות שסביבה */
  if (/[֐-׿]/.test(s)) s = s.replace(/(?<![֐-׿Ѐ-ӿ])["'״]?[Ѐ-ӿ]{2,}["'״]?(?![֐-׿Ѐ-ӿ])\s?/g, "");
  return s.replace(/[֐-׿Ѐ-ӿ]+/g, w => {
    if (!/[֐-׿]/.test(w) || !/[Ѐ-ӿ]/.test(w)) return w;
    return w.replace(/[Ѐ-ӿ]/g, ch => CYR[ch.toLowerCase()] ?? "");
  });
}

/**
 * שולח שיחה ומקבל תשובה בזרימה.
 * onText נקרא עם כל הטקסט שהצטבר עד עכשיו.
 */
/* WebGPU מאבד לפעמים את כרטיס המסך (טאב שהוסתר, מחשב שנרדם, דרייבר
   שהתאפס). אז זורקים את המנוע הישן וטוענים מחדש מהעותק השמור - זה לוקח
   שניות ולא הורדה. */
const LOST = /Instance|disposed|device|lost|GPU|mapAsync/i;
async function recover() {
  try { worker?.terminate(); } catch {}
  worker = null; engine = null; loadedId = null;
  if (document.visibilityState !== "visible") {
    await new Promise(ok => {
      const on = () => { if (document.visibilityState === "visible") { document.removeEventListener("visibilitychange", on); ok(); } };
      document.addEventListener("visibilitychange", on);
    });
  }
  await loadBrain(brain.brainKey);
}

export function chat(messages, opts = {}) {
  const run = async () => {
    try { return await chatOnce(messages, opts); }
    catch (err) {
      if (!LOST.test(String(err && err.message || err))) throw err;
      console.warn("brain lost, reloading:", err);
      await recover();
      return await chatOnce(messages, opts);
    }
  };
  const p = busy.then(run, run);
  busy = p.catch(() => {});
  return p;
}

async function chatOnce(messages, { onText, temperature = 0.7, maxTokens = 700 } = {}) {
  {
    if (!engine || brain.state !== "ready") throw new Error("not ready");
    const isGemma = /gemma/i.test(loadedId || "");
    if (isGemma && messages[0]?.role === "system") {
      /* לג'מה אין תפקיד "system" - ההנחיות נכנסות לתחילת ההודעה הראשונה */
      const [sys, ...rest] = messages;
      const i = rest.findIndex(m => m.role === "user");
      if (i >= 0) rest[i] = { role: "user", content: sys.content + "\n\n---\n\n" + rest[i].content };
      messages = rest.slice(i >= 0 ? i : 0);
      /* וגם חייבים לסירוגין: משתמש, עוזר, משתמש... */
      messages = messages.reduce((out, m) => {
        const last = out[out.length - 1];
        if (last && last.role === m.role) last.content += "\n\n" + m.content;
        else out.push({ ...m });
        return out;
      }, []);
    }
    /* repetition_penalty מעביר את הדגימה למעבד הרגיל ומאט פי 10 - לכן אין */
    const stream = await engine.chat.completions.create({
      messages, stream: true, temperature, top_p: 0.9,
      max_tokens: maxTokens,
      ...(isGemma ? {} : { extra_body: { enable_thinking: false } })
    });
    let raw = "";
    for await (const chunk of stream) {
      const piece = chunk.choices[0]?.delta?.content || "";
      if (!piece) continue;
      raw += piece;
      onText?.(clean(raw));
    }
    return clean(raw).trim();
  }
}

export function stop() {
  try { engine?.interruptGenerate(); } catch {}
}
