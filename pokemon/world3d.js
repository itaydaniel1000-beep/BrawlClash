/* ===== העולם בתלת-ממד =====
   מפה גדולה עם עיירה באמצע (מרכז פוקימון ובית המורה למתקפות), דשא גבוה,
   עצים, ופוקימונים פראיים שמסתובבים. השחקן הולך עם החיצים / WASD או
   עם הג'ויסטיק בטלפון, והמצלמה עוקבת מאחור מלמעלה.
   המודול רק מצייר ומזיז. מה קורה כשנוגעים בפראי - wui.js מחליט. */

import * as THREE from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

const SIZE = 110;              // חצי רוחב המפה
const TOWN_R = 15;             // בעיירה אין פראיים
const WILD_COUNT = 16;
const SPEED = 5.2;
const CENTER = new THREE.Vector3(-6, 0, -6);
const TUTOR = new THREE.Vector3(7, 0, -6);
const MODEL_YAW = 0;           // המודל של המאמן כבר מסתכל קדימה (+z)

let renderer, scene, camera, clock, sun, root;
let mounted = null, tagLayer = null, running = false, paused = false;
const keys = {};
const joy = {x: 0, y: 0, active: false};
const me = {pos: new THREE.Vector3(0, 0, 6), heading: 0, moving: false, run: false, node: null, follower: null};
const wilds = [];
const others = new Map();
const obstacles = [];          // {x, z, r} - אי אפשר לעבור דרכם
let propList = [];             // עצים וסלעים - כדי להסתיר את מי שעומד בין המצלמה לשחקן
const world = {};              // דברים שזזים בעיירה (המים במזרקה)
const tex = {};
const gltf = new GLTFLoader();
let trainerG = null;
let cb = {onEncounter() {}, onPlace() {}};
let lastPlace = null;

const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- טקסטורות ---------- */

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function noise(ctx, w, h, base, n) {
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    const v = Math.random() * 40 - 20;
    ctx.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 30},${v > 0 ? 200 : 0},${Math.abs(v) / 260})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2 + Math.random() * 3);
  }
}

function artTex(dex) {
  if (!tex[dex]) {
    const t = new THREE.TextureLoader().load(ART_URL(dex));
    t.colorSpace = THREE.SRGBColorSpace;
    tex[dex] = t;
  }
  return tex[dex];
}

function shadowTex() {
  return tex.shadow || (tex.shadow = canvasTex(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0, "rgba(0,0,0,.45)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  }));
}

function makeShadow(s) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({map: shadowTex(), transparent: true, depthWrite: false}));
  m.rotation.x = -Math.PI / 2;
  m.position.y = .03;
  return m;
}

function monSprite(id, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({map: artTex(POKEMON[id].dex), transparent: true}));
  s.center.set(.5, 0);
  s.scale.set(size, size, 1);
  return s;
}

/* ---------- העולם ---------- */

function buildWorld() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fd8ff);
  scene.fog = new THREE.Fog(0xbfe6ff, 30, 75);
  scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x5c9a46, 1.3));
  sun = new THREE.DirectionalLight(0xfff3dc, 1.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 70});
  sun.shadow.bias = -0.0015;
  scene.add(sun, sun.target);
  root = new THREE.Group();
  scene.add(root);
  world.water = null;

  const grass = canvasTex(256, 256, (c, w, h) => noise(c, w, h, "#72c450", 6000));
  grass.wrapS = grass.wrapT = THREE.RepeatWrapping;
  grass.repeat.set(60, 60);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(SIZE * 2 + 60, SIZE * 2 + 60), new THREE.MeshLambertMaterial({map: grass}));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);

  // שבילים בעיירה
  const pathMat = new THREE.MeshLambertMaterial({map: canvasTex(128, 128, (c, w, h) => noise(c, w, h, "#d8c18f", 2000))});
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(TOWN_R - 2, 40), pathMat);
  plaza.rotation.x = -Math.PI / 2; plaza.position.y = .02; plaza.receiveShadow = true;
  root.add(plaza);
  for (const [w, h, x, z] of [[4, SIZE * 2, 0, 0], [SIZE * 2, 4, 0, 0]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), pathMat);
    p.rotation.x = -Math.PI / 2; p.position.set(x, .015, z); p.receiveShadow = true;
    root.add(p);
  }

  building(CENTER, 0xe8463c, "🏥");
  building(TUTOR, 0x3b7be8, "📖");
  buildTown();

  // דשא גבוה: איפה שהפראיים גרים
  const tuft = canvasTex(64, 64, (c) => {
    for (let i = 0; i < 14; i++) {
      c.strokeStyle = i % 2 ? "#3f8f2c" : "#56a83a"; c.lineWidth = 4;
      c.beginPath(); const x = 6 + i * 4; c.moveTo(x, 64); c.quadraticCurveTo(x + rand(-6, 6), 30, x + rand(-10, 10), rand(4, 20)); c.stroke();
    }
  });
  const tuftMat = new THREE.MeshLambertMaterial({map: tuft, transparent: true, alphaTest: .4, side: THREE.DoubleSide});
  const tuftGeo = new THREE.PlaneGeometry(1.1, .9);
  tuftGeo.translate(0, .45, 0);
  const count = 2600;
  const inst = new THREE.InstancedMesh(tuftGeo, tuftMat, count);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  let n = 0;
  for (let patch = 0; patch < 34 && n < count; patch++) {
    const a = Math.random() * Math.PI * 2, d = rand(TOWN_R + 6, SIZE - 8);
    const cx = Math.cos(a) * d, cz = Math.sin(a) * d, r = rand(4, 9);
    for (let i = 0; i < 80 && n < count; i++) {
      const aa = Math.random() * Math.PI * 2, dd = Math.sqrt(Math.random()) * r;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI);
      sc.setScalar(rand(.8, 1.3));
      m4.compose(new THREE.Vector3(cx + Math.cos(aa) * dd, 0, cz + Math.sin(aa) * dd), q, sc);
      inst.setMatrixAt(n++, m4);
    }
  }
  inst.count = n;
  root.add(inst);

  // עצים וסלעים - קודם צורות פשוטות, ואחר כך המודלים מ-Meshy
  const props = [];
  for (let i = 0; i < 170; i++) {
    const a = Math.random() * Math.PI * 2, d = rand(TOWN_R + 4, SIZE + 12);
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (Math.abs(x) < 4 || Math.abs(z) < 4) continue;
    const kind = i % 5 === 0 ? "rock" : i % 3 === 0 ? "tree2" : "tree";
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = Math.random() * Math.PI * 2;
    const h = kind === "rock" ? rand(.8, 1.6) : rand(3.4, 5.2);
    const simple = kind === "rock"
      ? new THREE.Mesh(new THREE.DodecahedronGeometry(h * .55), new THREE.MeshLambertMaterial({color: 0x9a968c}))
      : new THREE.Mesh(new THREE.ConeGeometry(1.4, h, 8), new THREE.MeshLambertMaterial({color: 0x3f8f3a}));
    simple.position.y = kind === "rock" ? h * .35 : h / 2;
    simple.castShadow = true;
    g.add(simple);
    root.add(g);
    props.push({g, kind, h});
    obstacles.push({x, z, r: kind === "rock" ? h * .5 : .8});
  }
  // גבול המפה: שורת עצים צפופה
  for (let i = 0; i < 90; i++) {
    const a = i / 90 * Math.PI * 2;
    const g = new THREE.Group();
    g.position.set(Math.cos(a) * (SIZE + 4), 0, Math.sin(a) * (SIZE + 4));
    const c = new THREE.Mesh(new THREE.ConeGeometry(2, 6, 8), new THREE.MeshLambertMaterial({color: 0x2f7a32}));
    c.position.y = 3;
    g.add(c);
    root.add(g);
    props.push({g, kind: "tree", h: 6});
  }
  propList = props;
  ["tree", "tree2", "rock"].forEach(k => gltf.load(`models/${k}.glb`, m => {
    props.filter(p => p.kind === k).forEach(p => { p.g.clear(); p.g.add(fit(m.scene.clone(true), p.h)); });
  }));
}

const lam = color => new THREE.MeshLambertMaterial({color});

function box(w, h, d, color, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === "number" ? lam(color) : color);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

function emblem(draw, size) {
  return new THREE.MeshBasicMaterial({map: canvasTex(128, 128, draw), transparent: true});
}

/* כדור פוקימון מצויר - לשלט של המרכז */
function ballFace(c) {
  c.fillStyle = "#1d2230"; c.beginPath(); c.arc(64, 64, 62, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#e8322c"; c.beginPath(); c.arc(64, 64, 55, Math.PI, 0); c.fill();
  c.fillStyle = "#fafafa"; c.beginPath(); c.arc(64, 64, 55, 0, Math.PI); c.fill();
  c.fillStyle = "#1d2230"; c.fillRect(8, 58, 112, 12);
  c.beginPath(); c.arc(64, 64, 20, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#fff"; c.beginPath(); c.arc(64, 64, 12, 0, Math.PI * 2); c.fill();
}

function building(pos, roof, icon) {
  const g = new THREE.Group();
  g.position.copy(pos);
  const center = icon === "🏥";
  const glass = new THREE.MeshLambertMaterial({color: 0x7fc8ff, emissive: 0x16466e, transparent: true, opacity: .85});
  // קירות ובסיס
  box(6.6, .3, 5.6, 0xc9c2b3, 0, .15, 0, g);
  box(6, 3.2, 5, center ? 0xfdfdfb : 0xf3e3c3, 0, 1.75, 0, g);
  box(6.1, .45, 5.1, roof, 0, 3.1, 0, g);                       // פס צבעוני מתחת לגג
  if (center) {
    // גג שטוח עם כיפה אדומה, דלת זכוכית רחבה וכדור גדול מעל הכניסה
    box(6.4, .35, 5.4, 0xe8322c, 0, 3.55, 0, g);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), lam(0xe8322c));
    dome.position.set(0, 3.7, -.6); dome.castShadow = true; g.add(dome);
    box(2.4, 2.1, .12, glass, 0, 1.35, 2.52, g);
    box(.12, 2.1, .14, 0xd0d6dc, 0, 1.35, 2.55, g);
    for (const x of [-2.15, 2.15]) box(1.2, 1, .1, glass, x, 1.9, 2.52, g);
    const sign = new THREE.Mesh(new THREE.CircleGeometry(.75, 32), emblem(ballFace));
    sign.position.set(0, 3.1, 2.62); g.add(sign);
  } else {
    // בית עץ עם גג משופע כחול, ארובה, חלונות ושלט ספר
    const gable = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.1, 6.4, 3, 1), lam(roof));
    gable.rotation.z = Math.PI / 2; gable.rotation.x = Math.PI / 2 * 0 ; gable.rotation.y = Math.PI / 2;
    gable.scale.set(1, 1, .55); gable.position.set(0, 4.35, 0); gable.castShadow = true; g.add(gable);
    box(.6, 1.4, .6, 0x8a5a3c, 1.8, 5, -1, g);
    box(1.3, 2, .12, 0x7a4b2a, 0, 1.3, 2.52, g);
    for (const x of [-2, 2]) { box(1.1, 1, .1, glass, x, 1.9, 2.52, g); box(1.3, .12, .2, 0xffffff, x, 1.35, 2.55, g); }
    const sign = new THREE.Mesh(new THREE.CircleGeometry(.6, 32), emblem(c => {
      c.fillStyle = "#fff"; c.beginPath(); c.arc(64, 64, 60, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#2f7fe0"; c.lineWidth = 8; c.stroke();
      c.font = "70px serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(icon, 64, 70);
    }));
    sign.position.set(0, 2.85, 2.62); g.add(sign);
  }
  // שלט צף מעל - רואים מרחוק לאן הולכים
  const top = new THREE.Sprite(new THREE.SpriteMaterial({map: canvasTex(128, 128, c => {
    c.fillStyle = "#fff"; c.beginPath(); c.arc(64, 64, 58, 0, Math.PI * 2); c.fill();
    c.strokeStyle = center ? "#e8322c" : "#2f7fe0"; c.lineWidth = 10; c.stroke();
    c.font = "70px serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(icon, 64, 70);
  })}));
  top.position.set(0, 7, 0); top.scale.set(1.6, 1.6, 1);
  g.add(top);
  g.userData.sign = top;
  root.add(g);
  obstacles.push({x: pos.x, z: pos.z, r: 3.4});
  return g;
}

/* העיירה: גדר עם פתחים לשבילים, מזרקה, פנסים וערוגות פרחים */
function buildTown() {
  const fence = new THREE.Group();
  const R = TOWN_R - 1;
  const postGeo = new THREE.BoxGeometry(.22, 1, .22), postMat = lam(0xffffff);
  for (let i = 0; i < 72; i++) {
    const a = i / 72 * Math.PI * 2;
    const x = Math.cos(a) * R, z = Math.sin(a) * R;
    if (Math.abs(x) < 3 || Math.abs(z) < 3) continue;      // פתחים לשבילים
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(x, .5, z); post.castShadow = true; fence.add(post);
    const b = (i + .5) / 72 * Math.PI * 2;
    const nx = Math.cos(b) * R, nz = Math.sin(b) * R;
    if (Math.abs(nx) < 3 || Math.abs(nz) < 3) continue;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(.1, .14, 2 * Math.PI * R / 72 + .1), postMat);
    rail.position.set(nx, .7, nz); rail.rotation.y = -b; fence.add(rail);
    const rail2 = rail.clone(); rail2.position.y = .35; fence.add(rail2);
  }
  root.add(fence);

  // מזרקה
  const f = new THREE.Group();
  f.position.set(0, 0, 1);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.1, .6, 32), lam(0xd9d4c7));
  rim.position.y = .3; rim.castShadow = rim.receiveShadow = true;
  const water = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, .1, 32), new THREE.MeshLambertMaterial({color: 0x4fb6ff, emissive: 0x0d3c66}));
  water.position.y = .55;
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(.25, .35, 1.4, 12), lam(0xd9d4c7));
  pillar.position.y = 1; pillar.castShadow = true;
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(.8, .5, .25, 20), lam(0xd9d4c7));
  bowl.position.y = 1.7;
  f.add(rim, water, pillar, bowl);
  root.add(f);
  obstacles.push({x: 0, z: 1, r: 2.1});
  world.water = water;

  // פנסים
  for (const [x, z] of [[-3, 9], [3, 9], [-3, -11], [3, -11], [10, 3], [-10, 3]]) {
    const lp = new THREE.Group();
    lp.position.set(x, 0, z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, 2.6, 8), lam(0x3a4256));
    pole.position.y = 1.3;
    const head = new THREE.Mesh(new THREE.SphereGeometry(.22, 12, 8), new THREE.MeshLambertMaterial({color: 0xfff6c8, emissive: 0xffd36a}));
    head.position.y = 2.7;
    lp.add(pole, head);
    root.add(lp);
    obstacles.push({x, z, r: .25});
  }

  // ערוגות פרחים בעיירה ופרחים בשדות
  const flowerTex = ["#ff6b8a", "#ffd34d", "#ffffff", "#b38cff", "#ff8c42"].map(col => canvasTex(32, 32, c => {
    c.fillStyle = col;
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; c.beginPath(); c.arc(16 + Math.cos(a) * 7, 16 + Math.sin(a) * 7, 6, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = "#ffcc33"; c.beginPath(); c.arc(16, 16, 5, 0, Math.PI * 2); c.fill();
  }));
  const geo = new THREE.PlaneGeometry(.45, .45);
  geo.rotateX(-Math.PI / 2);
  flowerTex.forEach((t, k) => {
    const n = 260;
    const inst = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({map: t, transparent: true, alphaTest: .5}), n);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      let x, z;
      if (i < 40) {
        // ערוגות ליד הבתים
        const bed = [[-6, -2.4], [7, -2.4], [-9, 6], [9, 6]][i % 4];
        x = bed[0] + rand(-1.6, 1.6); z = bed[1] + rand(-.5, .5);
      } else {
        const a = Math.random() * Math.PI * 2, dd = rand(TOWN_R + 2, SIZE - 4);
        x = Math.cos(a) * dd; z = Math.sin(a) * dd;
      }
      m4.makeRotationY(Math.random() * Math.PI);
      m4.setPosition(x, .06 + k * .002, z);
      inst.setMatrixAt(i, m4);
    }
    root.add(inst);
  });
}

function fit(obj, height) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj, true);
  const k = height / ((box.max.y - box.min.y) || 1);
  obj.scale.multiplyScalar(k);
  obj.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(obj, true);
  const c = b2.getCenter(new THREE.Vector3());
  obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= b2.min.y;
  obj.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true;
    if (o.material) { o.material.metalness = 0; o.material.roughness = .85; }
  });
  const w = new THREE.Group();
  w.add(obj);
  return w;
}

/* ---------- מאמנים ---------- */

function trainerNode() {
  const wrap = new THREE.Group();
  const holder = new THREE.Group();
  wrap.add(holder);
  wrap.add(makeShadow(1.2));
  const simple = new THREE.Mesh(new THREE.CapsuleGeometry(.3, .9, 4, 8), new THREE.MeshLambertMaterial({color: 0x3a6fd8}));
  simple.position.y = .75;
  holder.add(simple);
  wrap.userData = {holder, mixer: null, acts: {}, cur: null};
  if (trainerG) dressTrainer(wrap);
  return wrap;
}

function dressTrainer(wrap) {
  const u = wrap.userData;
  if (u.mixer) return;
  const obj = SkeletonUtils.clone(trainerG.scene);
  const f = fit(obj, 1.6);
  f.rotation.y = MODEL_YAW;
  u.holder.clear();
  u.holder.add(f);
  u.mixer = new THREE.AnimationMixer(obj);
  for (const clip of trainerG.animations) {
    const name = /walk/i.test(clip.name) ? "walk" : /run/i.test(clip.name) ? "run" : /cheer/i.test(clip.name) ? "cheer" : /idle/i.test(clip.name) ? "idle" : null;
    if (!name) continue;
    // ההליכה מגיעה עם תזוזה קדימה של האגן - אנחנו מזיזים בעצמנו
    const c = clip.clone();
    c.tracks = c.tracks.filter(t => !(t.name.endsWith(".position") && /hip/i.test(t.name)));
    u.acts[name] = u.mixer.clipAction(c);
  }
  play(wrap, "idle");
}

function play(wrap, name) {
  const u = wrap.userData;
  if (!u.mixer || u.cur === name || !u.acts[name]) return;
  const next = u.acts[name];
  next.reset().fadeIn(.2).play();
  if (u.cur && u.acts[u.cur]) u.acts[u.cur].fadeOut(.2);
  u.cur = name;
}

function follower(id) {
  const s = monSprite(id, .95);
  const g = new THREE.Group();
  g.add(s, makeShadow(.8));
  g.userData = {id, sprite: s};
  return g;
}

/* ---------- פוקימונים פראיים ---------- */

const WILD_POOL = Object.keys(POKEMON).filter(id => !ITEMS[id] && id !== CONFIG.boss.id && (POKEMON[id].catch || 0) >= .1 && WSTATS[POKEMON[id].dex]);

function pickSpecies(lvl) {
  // פוקימון שעוד לא אמור להתפתח ברמה הזאת - נראה טבעי יותר
  for (let i = 0; i < 30; i++) {
    const id = WILD_POOL[Math.floor(Math.random() * WILD_POOL.length)];
    if (Math.random() > (POKEMON[id].catch || .2) * 1.8) continue;
    return id;
  }
  return WILD_POOL[Math.floor(Math.random() * WILD_POOL.length)];
}

function spawnWild() {
  let x, z, tries = 0;
  do {
    const a = Math.random() * Math.PI * 2, d = rand(7, 30);
    x = me.pos.x + Math.cos(a) * d; z = me.pos.z + Math.sin(a) * d;
    tries++;
  } while ((Math.hypot(x, z) < TOWN_R + 3 || Math.hypot(x, z) > SIZE - 4) && tries < 20);
  if (tries >= 20) return;
  const dist = Math.hypot(x, z);
  const lvl = Math.max(2, Math.min(60, Math.round(2 + (dist - TOWN_R) / 3 + rand(-2, 2))));
  const id = pickSpecies(lvl);
  const size = .9 + Math.min(1.2, (WSTATS[POKEMON[id].dex] || [50])[0] / 90);
  const g = new THREE.Group();
  const s = monSprite(id, size);
  g.add(s, makeShadow(size * .8));
  g.position.set(x, 0, z);
  root.add(g);
  wilds.push({uid: Math.random().toString(36).slice(2, 9), id, lvl, g, s, size, dir: Math.random() * Math.PI * 2, t: 0, home: new THREE.Vector3(x, 0, z)});
}

function removeWild(w) {
  root.remove(w.g);
  const i = wilds.indexOf(w);
  if (i >= 0) wilds.splice(i, 1);
}

/* ---------- תנועה ---------- */

function blocked(x, z) {
  if (Math.hypot(x, z) > SIZE) return true;
  for (const o of obstacles) if (Math.hypot(x - o.x, z - o.z) < o.r + .35) return true;
  return false;
}

function inputDir() {
  let x = 0, z = 0;
  if (keys.ArrowUp || keys.KeyW) z -= 1;
  if (keys.ArrowDown || keys.KeyS) z += 1;
  if (keys.ArrowLeft || keys.KeyA) x -= 1;
  if (keys.ArrowRight || keys.KeyD) x += 1;
  if (joy.active) { x = joy.x; z = joy.y; }
  const len = Math.hypot(x, z);
  if (len > 1) { x /= len; z /= len; }
  return {x, z, len: Math.min(1, len)};
}

function frame() {
  if (!running) return;
  requestAnimationFrame(frame);
  const dt = Math.min(.05, clock.getDelta());
  const t = clock.elapsedTime;

  // השחקן
  const d = paused ? {x: 0, z: 0, len: 0} : inputDir();
  me.moving = d.len > .08;
  if (me.moving) {
    const sp = SPEED * (d.len > .85 || keys.ShiftLeft ? 1.35 : .8);
    const nx = me.pos.x + d.x * sp * dt, nz = me.pos.z + d.z * sp * dt;
    if (!blocked(nx, me.pos.z)) me.pos.x = nx;
    if (!blocked(me.pos.x, nz)) me.pos.z = nz;
    const want = Math.atan2(d.x, d.z);
    let diff = want - me.heading;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    me.heading += diff * Math.min(1, dt * 12);
    me.run = d.len > .85 || !!keys.ShiftLeft;
  }
  me.node.position.copy(me.pos);
  me.node.rotation.y = me.heading;
  play(me.node, me.moving ? (me.run ? "run" : "walk") : "idle");
  if (me.node.userData.mixer) me.node.userData.mixer.update(dt * (me.moving && me.run ? 1.1 : 1));

  // הפוקימון שהולך אחרי
  if (me.follower) {
    const fp = me.follower.position;
    const back = new THREE.Vector3(me.pos.x - Math.sin(me.heading) * 1.4, 0, me.pos.z - Math.cos(me.heading) * 1.4);
    if (fp.distanceTo(back) > .2) fp.lerp(back, Math.min(1, dt * 4));
    me.follower.userData.sprite.position.y = me.moving ? Math.abs(Math.sin(t * 9)) * .12 : 0;
  }

  // פראיים: מסתובבים לאט ליד הבית שלהם
  for (const w of wilds.slice()) {
    w.t -= dt;
    if (w.t <= 0) { w.dir = Math.random() * Math.PI * 2; w.t = rand(1.5, 4); w.still = Math.random() < .4; }
    if (!w.still && !paused) {
      const nx = w.g.position.x + Math.sin(w.dir) * dt * 1.1, nz = w.g.position.z + Math.cos(w.dir) * dt * 1.1;
      if (!blocked(nx, nz) && Math.hypot(nx - w.home.x, nz - w.home.z) < 6 && Math.hypot(nx, nz) > TOWN_R + 1) w.g.position.set(nx, 0, nz);
      else w.t = 0;
    }
    w.s.position.y = Math.abs(Math.sin(t * 3 + w.home.x)) * .1;
    const dist = w.g.position.distanceTo(me.pos);
    if (dist > 55) { removeWild(w); continue; }
    if (!paused && dist < (w.size * .45 + .5)) { paused = true; cb.onEncounter({uid: w.uid, id: w.id, lvl: w.lvl}); }
  }
  if (wilds.length < WILD_COUNT && Math.random() < .05) spawnWild();

  // שחקנים אחרים: מתקרבים בהדרגה למקום שהגיע מהרשת
  for (const [, o] of others) {
    o.node.position.lerp(o.target, Math.min(1, dt * 8));
    let diff = o.r - o.node.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    o.node.rotation.y += diff * Math.min(1, dt * 10);
    play(o.node, o.mv ? "walk" : "idle");
    if (o.node.userData.mixer) o.node.userData.mixer.update(dt);
    if (o.follower) {
      const back = new THREE.Vector3(o.node.position.x - Math.sin(o.node.rotation.y) * 1.4, 0, o.node.position.z - Math.cos(o.node.rotation.y) * 1.4);
      o.follower.position.lerp(back, Math.min(1, dt * 4));
    }
  }

  // מקומות מיוחדים
  let place = null;
  if (me.pos.distanceTo(CENTER) < 5.2) place = "center";
  else if (me.pos.distanceTo(TUTOR) < 5.2) place = "tutor";
  else {
    let best = null, bd = 3.2;
    for (const [pid, o] of others) { const dd = o.node.position.distanceTo(me.pos); if (dd < bd) { bd = dd; best = pid; } }
    if (best) place = "player:" + best;
  }
  if (place !== lastPlace) { lastPlace = place; cb.onPlace(place); }

  // מצלמה: מאחור ולמעלה, כמו במשחקי פוקימון
  const camTarget = new THREE.Vector3(me.pos.x, 11.5, me.pos.z + 13);
  camera.position.lerp(camTarget, Math.min(1, dt * 5));
  camera.lookAt(me.pos.x, .8, me.pos.z - 1);
  sun.position.set(me.pos.x - 12, 24, me.pos.z + 10);
  sun.target.position.copy(me.pos);

  // עץ שעומד בין המצלמה לשחקן נעלם, אחרת לא רואים את השחקן
  for (const p of propList) {
    const gp = p.g.position;
    p.g.visible = !(gp.z > me.pos.z - .5 && gp.z < me.pos.z + 12 && Math.abs(gp.x - me.pos.x) < (p.kind === "rock" ? 1.2 : 2.6));
  }

  if (world.water) world.water.material.emissive.setHSL(.57, .7, .14 + Math.sin(t * 2) * .04);

  positionTags();
  renderer.render(scene, camera);
}

/* ---------- תגיות שם ---------- */

function positionTags() {
  if (!tagLayer) return;
  const r = tagLayer.getBoundingClientRect();
  const v = new THREE.Vector3();
  const place = (el, pos, h) => {
    v.set(pos.x, h, pos.z).project(camera);
    const vis = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
    el.style.display = vis ? "" : "none";
    if (vis) { el.style.left = `${(v.x + 1) / 2 * r.width}px`; el.style.top = `${(1 - v.y) / 2 * r.height}px`; }
  };
  for (const [, o] of others) place(o.tag, o.node.position, 2.1);
  for (const w of wilds) {
    if (!w.tag) { w.tag = document.createElement("div"); w.tag.className = "wtag lvl"; w.tag.textContent = `רמה ${w.lvl}`; tagLayer.appendChild(w.tag); }
    place(w.tag, w.g.position, w.size + .3);
  }
  tagLayer.querySelectorAll(".wtag.lvl").forEach(el => { if (!wilds.some(w => w.tag === el)) el.remove(); });
}

/* ---------- שליטה ---------- */

function bindInput(container) {
  addEventListener("keydown", e => { if (!/INPUT|TEXTAREA/.test(e.target.tagName)) keys[e.code] = true; });
  addEventListener("keyup", e => { keys[e.code] = false; });
  addEventListener("blur", () => { for (const k in keys) keys[k] = false; });

  const pad = document.createElement("div");
  pad.className = "joy";
  pad.innerHTML = `<i class="knob"></i>`;
  container.appendChild(pad);
  const knob = pad.firstElementChild;
  let id = null, cx = 0, cy = 0;
  const R = 46;
  pad.addEventListener("pointerdown", e => {
    id = e.pointerId; pad.setPointerCapture(id);
    const b = pad.getBoundingClientRect(); cx = b.left + b.width / 2; cy = b.top + b.height / 2;
    joy.active = true; move(e);
  });
  const move = e => {
    if (e.pointerId !== id) return;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const l = Math.hypot(dx, dy);
    if (l > R) { dx *= R / l; dy *= R / l; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    joy.x = dx / R; joy.y = dy / R;
  };
  pad.addEventListener("pointermove", move);
  const end = e => { if (e.pointerId !== id) return; id = null; joy.active = false; joy.x = joy.y = 0; knob.style.transform = ""; };
  pad.addEventListener("pointerup", end);
  pad.addEventListener("pointercancel", end);
}

function resize() {
  if (!mounted) return;
  const w = mounted.clientWidth, h = mounted.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

/* ---------- ממשק ---------- */

const World3D = {
  ok: false,
  init(container, start, callbacks) {
    cb = {...cb, ...callbacks};
    mounted = container;
    container.prepend(renderer.domElement);
    tagLayer = container.querySelector(".wtags");
    me.pos.set(start.x || 0, 0, start.z || 6);
    me.node = trainerNode();
    root.add(me.node);
    bindInput(container);
    new ResizeObserver(resize).observe(container);
    resize();
    camera.position.set(me.pos.x, 11.5, me.pos.z + 13);
    for (let i = 0; i < WILD_COUNT * .6; i++) spawnWild();   // יש פראיים כבר מהרגע הראשון
    running = true;
    clock.getDelta();
    frame();
  },
  setLead(id) {
    if (me.follower && me.follower.userData.id === id) return;
    if (me.follower) root.remove(me.follower);
    me.follower = id ? follower(id) : null;
    if (me.follower) { me.follower.position.copy(me.pos); root.add(me.follower); }
  },
  pause(v) { paused = v; if (v) { for (const k in keys) keys[k] = false; joy.active = false; } },
  removeWild(uid) { const w = wilds.find(x => x.uid === uid); if (w) removeWild(w); },
  state: () => ({x: +me.pos.x.toFixed(2), z: +me.pos.z.toFixed(2), r: +me.heading.toFixed(2), mv: me.moving ? (me.run ? 2 : 1) : 0}),
  // נוחתים ליד מרכז הפוקימון (אחרי הפסד)
  toCenter() { me.pos.set(CENTER.x, 0, CENTER.z + 5.5); me.heading = 0; },
  cheer() { play(me.node, "cheer"); setTimeout(() => play(me.node, "idle"), 2500); },
  setPlayers(list, myPid) {
    const seen = new Set();
    for (const pid in list) {
      if (pid === myPid) continue;
      const p = list[pid];
      seen.add(pid);
      let o = others.get(pid);
      if (!o) {
        const node = trainerNode();
        node.position.set(p.x, 0, p.z);
        root.add(node);
        const tag = document.createElement("div");
        tag.className = "wtag player";
        tagLayer.appendChild(tag);
        o = {node, tag, target: new THREE.Vector3(p.x, 0, p.z), r: p.r, mv: 0, follower: null, lead: null};
        others.set(pid, o);
      }
      o.target.set(p.x, 0, p.z);
      o.r = p.r;
      o.mv = p.mv;
      o.tag.textContent = (p.busy ? "⚔️ " : "") + p.name;
      if (p.lead !== o.lead) {
        if (o.follower) root.remove(o.follower);
        o.lead = p.lead;
        o.follower = p.lead && POKEMON[p.lead] ? follower(p.lead) : null;
        if (o.follower) { o.follower.position.copy(o.node.position); root.add(o.follower); }
      }
    }
    for (const [pid, o] of others) {
      if (seen.has(pid)) continue;
      root.remove(o.node);
      if (o.follower) root.remove(o.follower);
      o.tag.remove();
      others.delete(pid);
    }
  }
};

try {
  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = "world-canvas";
  camera = new THREE.PerspectiveCamera(50, 1, .1, 200);
  clock = new THREE.Clock();
  buildWorld();
  addEventListener("resize", resize);
  gltf.load("models/trainer_world.glb", g => {
    trainerG = g;
    if (me.node) dressTrainer(me.node);
    for (const [, o] of others) dressTrainer(o.node);
  });
  World3D.ok = true;
} catch (e) {
  console.warn("3D לא זמין", e);
}

window.World3D = World3D;
window.dispatchEvent(new Event("world3d-ready"));
