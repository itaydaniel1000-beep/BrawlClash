/* ===== הזירה בתלת-ממד =====
   כל הטלפונים רואים את הזירה מאותה זווית: המאמנים עומדים בשורה בצד הקרוב,
   הפוקימון הפראי על במה בצד הרחוק, והמצלמה מאחורי המאמנים.
   המודול רק מצייר. את המצב הוא מקבל מ-ui.js דרך Arena.sync. */

import * as THREE from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

const PLAYER_COLORS = [0x4f8cff, 0xff6b6b, 0x3ddc84, 0xffb84d, 0xc07bff];
const WILD_POS = new THREE.Vector3(0, 0, -4.4);
const SPOT_Z = 3.4;
const MON_Z = -2.0;     // הפוקימון עומד לפני המאמן, לכיוון הפראי

let renderer, scene, camera, root, clock;
let running = false, mounted = null;
let world = null;             // אובייקטים קבועים
const players = new Map();    // pid -> {group, disc, ring, trainer, sprite, shadow, mon, x}
let wild = null;              // {sprite, shadow, id, hp, boss, aura, inBall}
let ball = null;
const tweens = [];
const particles = [];
let busyUntil = 0;
let state = {myPid: null, cur: null, n: 0};
let tagLayer = null, fxLayer = null, ro = null;
// מצלמה: נקודת בסיס, ומעליה "התמקדות" זמנית בפעולה
const cam = {basePos: null, baseLook: null, pos: null, look: null, focus: null, shake: 0};
function focus(pos, look, dur, delay = 0, amt = 1) {
  tween(.01, () => { cam.focus = {pos, look, amt, until: now() + dur}; }, delay);
}
function shakeCam(power) { cam.shake = Math.max(cam.shake, power); }

const texCache = {};
const loader = new THREE.TextureLoader();
function artTex(dex) {
  if (!texCache[dex]) {
    const t = loader.load(`art/${dex}.png`);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    texCache[dex] = t;
  }
  return texCache[dex];
}

const now = () => performance.now() / 1000;
const ease = t => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;

function tween(dur, fn, delay = 0, done) {
  tweens.push({start: now() + delay, dur, fn, done});
}

/* ---------- טקסטורות מצוירות ---------- */

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function noiseFill(ctx, w, h, base, spread, count) {
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < count; i++) {
    const v = (Math.random() - .5) * spread;
    ctx.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
}

const shadowTex = () => canvasTex(128, 128, (ctx, w) => {
  const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  g.addColorStop(0, "rgba(0,0,0,.5)"); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, w);
});

const sparkTex = () => canvasTex(64, 64, (ctx, w) => {
  const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.35, "rgba(255,255,255,.6)"); g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, w);
});

/* ---------- בניית העולם ---------- */

function buildWorld() {
  scene = new THREE.Scene();
  scene.background = canvasTex(4, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#3d9bff"); g.addColorStop(.55, "#8fd0ff"); g.addColorStop(1, "#e9f7ff");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
  scene.fog = new THREE.Fog(0xd6efff, 26, 60);

  scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x6aa84f, 1.35));
  const sun = new THREE.DirectionalLight(0xfff6e0, 1.5);
  sun.position.set(-5, 12, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 40});
  sun.shadow.bias = -0.0015;
  sun.shadow.radius = 4;
  scene.add(sun);

  root = new THREE.Group();
  scene.add(root);
  const rand = mulberry(7);

  // דשא בהיר
  const grass = canvasTex(256, 256, (ctx, w, h) => noiseFill(ctx, w, h, "#7fd05c", .1, 5000));
  grass.wrapS = grass.wrapT = THREE.RepeatWrapping;
  grass.repeat.set(16, 16);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(45, 48), new THREE.MeshLambertMaterial({map: grass}));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);

  // מגרש סגלגל עם פסי כיסוח וקווים לבנים
  const field = canvasTex(512, 768, (ctx, w, h) => {
    ctx.fillStyle = "#8fdc68"; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? "rgba(255,255,255,.07)" : "rgba(0,60,0,.05)";
      ctx.fillRect(0, i * h / 8, w, h / 8);
    }
    ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w / 2 - 14, h / 2 - 14, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(30, h / 2); ctx.lineTo(w - 30, h / 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(w / 2, h / 2, 64, 0, Math.PI * 2); ctx.stroke();
  });
  const fieldMesh = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshLambertMaterial({map: field, transparent: true}));
  fieldMesh.scale.set(6.2, 9.4, 1);
  fieldMesh.rotation.x = -Math.PI / 2;
  fieldMesh.position.set(0, 0.01, -0.6);
  fieldMesh.receiveShadow = true;
  root.add(fieldMesh);

  // העיגול של הפוקימון הפראי
  const spot = canvasTex(256, 256, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, "rgba(255,255,255,.35)"); g.addColorStop(.8, "rgba(255,255,255,.12)"); g.addColorStop(.86, "rgba(255,255,255,.95)"); g.addColorStop(.92, "rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, w);
  });
  const stageRing = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4), new THREE.MeshBasicMaterial({map: spot, transparent: true, depthWrite: false}));
  stageRing.rotation.x = -Math.PI / 2;
  stageRing.position.set(WILD_POS.x, 0.03, WILD_POS.z);
  root.add(stageRing);

  // עצים עגולים
  const trunkMat = new THREE.MeshLambertMaterial({color: 0x8a5a36});
  const leafMats = [0x4caf50, 0x5cc35a, 0x3f9e48, 0x6fcf5f].map(c => new THREE.MeshLambertMaterial({color: c}));
  const props = [];
  for (let i = 0; i < 52; i++) {
    const a = rand() * Math.PI * 2;
    const r = 10.5 + rand() * 15;
    const x = Math.cos(a) * r, z = Math.sin(a) * r - 4;
    if (z > 1 && Math.abs(x) < 16) continue;
    const t = new THREE.Group();
    const h = 1.1 + rand() * 1;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.16, .22, h, 8), trunkMat);
    trunk.position.y = h / 2;
    t.add(trunk);
    const mat = leafMats[i % leafMats.length];
    const blobs = 2 + Math.floor(rand() * 3);
    for (let k = 0; k < blobs; k++) {
      const rr = .75 + rand() * .45;
      const b = new THREE.Mesh(new THREE.SphereGeometry(rr, 16, 12), mat);
      b.position.set((rand() - .5) * .9, h + .5 + rand() * .6, (rand() - .5) * .9);
      t.add(b);
    }
    t.traverse(o => { o.castShadow = true; });
    t.position.set(x, 0, z);
    t.scale.setScalar(.9 + rand() * .8);
    t.rotation.y = rand() * Math.PI * 2;
    root.add(t);
    props.push({node: t, kind: i % 3 === 0 ? "tree2" : "tree", h: 3.4, pick: i});
  }
  // שיחים ופרחים
  const bushMat = new THREE.MeshLambertMaterial({color: 0x5dbb4c});
  for (let i = 0; i < 22; i++) {
    const a = rand() * Math.PI * 2, r = 7.6 + rand() * 4;
    const x = Math.cos(a) * r, z = Math.sin(a) * r - 2;
    if (z > 3 && Math.abs(x) < 8) continue;
    const rock = rand() < .4;
    const m = new THREE.Group();
    const blob = new THREE.Mesh(new THREE.SphereGeometry(.45 + rand() * .3, 14, 10), bushMat);
    blob.position.y = .2; blob.scale.y = .75; blob.castShadow = true;
    m.add(blob);
    m.position.set(x, 0, z);
    m.rotation.y = rand() * Math.PI * 2;
    root.add(m);
    props.push({node: m, kind: rock ? "rock" : "bush", h: rock ? .7 + rand() * .5 : .8 + rand() * .4});
  }
  const flowerCols = [0xffffff, 0xffe066, 0xff8fab, 0xffb3c6, 0xa0c4ff];
  const flowerGeo = new THREE.SphereGeometry(.07, 6, 4);
  const flowerMats = flowerCols.map(c => new THREE.MeshBasicMaterial({color: c}));
  for (let i = 0; i < 220; i++) {
    const x = (rand() - .5) * 30, z = (rand() - .5) * 26 - 3;
    if (Math.abs(x) < 6.6 && Math.abs(z + .6) < 9.8) continue;   // לא על המגרש
    const f = new THREE.Mesh(flowerGeo, flowerMats[i % flowerMats.length]);
    f.position.set(x, .06, z);
    root.add(f);
  }
  // גבעות רחוקות
  const hillMats = [0x74c15a, 0x66b350].map(c => new THREE.MeshLambertMaterial({color: c}));
  for (let i = 0; i < 8; i++) {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(6 + rand() * 6, 20, 12), hillMats[i % 2]);
    hill.scale.y = .4;
    hill.position.set(-28 + i * 8 + rand() * 3, -1.2, -32 - rand() * 6);
    root.add(hill);
  }
  // עננים
  const cloudTex = canvasTex(256, 128, (ctx, w, h) => {
    ctx.fillStyle = "#fff";
    [[70, 80, 42], [120, 62, 52], [175, 78, 40], [110, 92, 40], [150, 95, 34]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); });
  });
  const clouds = [];
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Sprite(new THREE.SpriteMaterial({map: cloudTex, transparent: true, opacity: .92, fog: false, depthWrite: false}));
    const sz = 7 + rand() * 6;
    c.scale.set(sz, sz / 2, 1);
    c.position.set(-40 + rand() * 80, 9 + rand() * 7, -38 - rand() * 10);
    root.add(c);
    clouds.push(c);
  }

  world = {shadow: shadowTex(), spark: sparkTex(), stageRing, clouds, props};
}

function mulberry(a) {
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ---------- מודלים מ-Meshy ----------
   נטענים ברקע. עד שהם מגיעים (או אם נכשלו) רואים את הצורות הפשוטות. */
const MODELS = {};
const gltf = new GLTFLoader();

function fitModel(obj, height) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj, true);
  const size = box.getSize(new THREE.Vector3());
  const k = height / (size.y || 1);
  obj.scale.multiplyScalar(k);
  obj.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(obj, true);
  const c = box2.getCenter(new THREE.Vector3());
  obj.position.x -= c.x;
  obj.position.z -= c.z;
  obj.position.y -= box2.min.y;
  obj.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(mt => {
        if (!mt) return;
        if (mt.map) mt.map.anisotropy = 4;
        if ("metalness" in mt) { mt.metalness = 0; mt.roughness = .85; }
      });
    }
  });
  const wrap = new THREE.Group();
  wrap.add(obj);
  return wrap;
}

function loadModel(name) {
  return new Promise(res => {
    gltf.load(`models/${name}.glb`, g => { MODELS[name] = g; res(g); }, undefined, () => res(null));
  });
}

function placeProps(kind) {
  const g = MODELS[kind];
  if (!g) return;
  for (const pr of world.props) {
    if (pr.kind !== kind) continue;
    const m = fitModel(g.scene.clone(true), pr.h);
    if (kind !== "bush") pr.node.clear();   // לשיח משאירים כדור ירוק בפנים, כי המודל דליל
    pr.node.add(m);
  }
}

function trainerModel() {
  const g = MODELS.trainer;
  if (!g) return null;
  const obj = SkeletonUtils.clone(g.scene);
  const inner = fitModel(obj, 1.55);
  // המודל מסתכל למצלמה, ואנימציית העמידה מסובבת את הגוף הצידה - מתקנים כדי שהגב יהיה אלינו
  inner.rotation.y = -1.87;
  const wrap = new THREE.Group();
  wrap.add(inner);
  if (g.animations && g.animations.length) {
    const mixer = new THREE.AnimationMixer(obj);
    const clip = g.animations.find(a => /idle/i.test(a.name)) || g.animations[0];
    const act = mixer.clipAction(clip);
    act.time = Math.random() * clip.duration;
    act.play();
    const cc = g.animations.find(a => /cheer/i.test(a.name));
    wrap.userData.mixer = mixer;
    wrap.userData.idle = act;
    wrap.userData.cheer = cc ? mixer.clipAction(cc) : null;
  }
  return wrap;
}

function swapTrainers() {
  for (const [, p] of players) {
    const m = trainerModel();
    if (!m) return;
    m.position.copy(p.trainer.position);
    m.rotation.y = p.trainer.rotation.y;
    p.group.remove(p.trainer);
    p.group.add(m);
    p.trainer = m;
  }
}

function loadAllModels() {
  ["tree", "tree2", "bush", "rock"].forEach(k => loadModel(k).then(() => placeProps(k)));
  loadModel("trainer").then(g => { if (g) swapTrainers(); });
}

/* ---------- מאמן ---------- */

function makeTrainer(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({color});
  const skin = new THREE.MeshLambertMaterial({color: 0xf2c79e});
  const dark = new THREE.MeshLambertMaterial({color: 0x2b3446});
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(.2, .22, .55, 10), dark);
  legs.position.y = .28;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.24, .3, .6, 12), mat);
  body.position.y = .82;
  const head = new THREE.Mesh(new THREE.SphereGeometry(.25, 16, 12), skin);
  head.position.y = 1.36;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(.265, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat);
  cap.position.y = 1.4;
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .04, 16, 1, false, 0, Math.PI), mat);
  brim.rotation.y = Math.PI / 2;
  brim.position.set(0, 1.42, -.2);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(.36, .4, .18), dark);
  pack.position.set(0, .88, .3);
  g.add(legs, body, head, cap, brim, pack);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* ---------- ספרייט של פוקימון ---------- */

function makeMonSprite(id, size) {
  const d = POKEMON[id];
  const mat = new THREE.SpriteMaterial({map: artTex(d.dex), transparent: true, alphaTest: .05});
  const s = new THREE.Sprite(mat);
  s.center.set(.5, .04);
  s.scale.set(size, size, 1);
  s.userData = {id, size, baseY: 0, flash: 0, grey: false};
  return s;
}

function makeShadow(size) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size * .55), new THREE.MeshBasicMaterial({map: world.shadow, transparent: true, depthWrite: false}));
  m.rotation.x = -Math.PI / 2;
  m.position.y = .03;
  return m;
}

function setSpriteMon(p, mon) {
  if (p.sprite && p.sprite.userData.id === mon.id) { p.mon = mon; return; }
  if (p.sprite) p.group.remove(p.sprite);
  p.sprite = makeMonSprite(mon.id, 1.55);
  p.sprite.position.set(.35, 0, MON_Z);
  p.group.add(p.sprite);
  p.mon = mon;
  // קופץ החוצה
  p.sprite.scale.set(.01, .01, 1);
  const s = p.sprite;
  tween(.35, t => { const k = ease(t) * 1.55; s.scale.set(k, k, 1); });
}

/* ---------- סנכרון עם המצב ---------- */

function spotX(i, n) {
  const gap = Math.min(2.3, 9.2 / Math.max(1, n));
  return (i - (n - 1) / 2) * gap;
}

function leadMon(team, prefer) {
  const pm = prefer && team[prefer.index];
  if (pm && pm.id === prefer.id && pm.hp > 0) return pm;
  return team.find(m => m.hp > 0) || team[0] || null;
}

function syncPlayers(S) {
  const seen = new Set();
  const n = S.players.length;
  S.players.forEach((pl, i) => {
    seen.add(pl.pid);
    let p = players.get(pl.pid);
    if (!p) {
      const color = PLAYER_COLORS[i % PLAYER_COLORS.length];
      const group = new THREE.Group();
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(.85, .9, .08, 32), new THREE.MeshLambertMaterial({color: 0xffffff}));
      disc.position.y = .04; disc.receiveShadow = true;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.9, .06, 8, 40), new THREE.MeshBasicMaterial({color}));
      ring.rotation.x = Math.PI / 2; ring.position.y = .1;
      const trainer = trainerModel() || makeTrainer(color);
      trainer.position.set(-.75, 0, .35);
      trainer.rotation.y = -.25;
      const shadow = makeShadow(1.3);
      shadow.position.set(.35, 0, MON_Z);
      group.add(disc, ring, trainer, shadow);
      group.position.set(spotX(i, n), 0, SPOT_Z + 3);
      root.add(group);
      p = {group, disc, ring, trainer, shadow, sprite: null, mon: null, color, x: spotX(i, n), prefer: null};
      players.set(pl.pid, p);
    }
    p.x = spotX(i, n);
    p.name = pl.name;
    const mon = leadMon(pl.team, p.prefer);
    if (mon) setSpriteMon(p, mon);
    else if (p.sprite) { p.group.remove(p.sprite); p.sprite = null; p.mon = null; }
    if (p.sprite) p.sprite.userData.grey = mon.hp <= 0;
    p.shadow.visible = !!p.sprite;
  });
  for (const [pid, p] of players) {
    if (!seen.has(pid)) { root.remove(p.group); players.delete(pid); }
  }
}

function syncWild(S) {
  const w = S.wild;
  if (w && (!wild || wild.id !== w.id || wild.leaving)) {
    if (wild) removeWildNow();
    spawnWild(w);
  } else if (!w && wild && !wild.leaving) {
    leaveWild();
  }
  if (wild && w) { wild.hp = w.hp; wild.maxHp = w.maxHp; }
}

function spawnWild(w) {
  const size = w.boss ? 3.6 : (w.id === "snorlax" || w.id === "lapras") ? 3 : 2.5;
  const sprite = makeMonSprite(w.id, size);
  sprite.position.set(WILD_POS.x, 0, WILD_POS.z);
  const shadow = makeShadow(size * .9);
  shadow.position.set(WILD_POS.x, .04, WILD_POS.z);
  root.add(sprite, shadow);
  wild = {sprite, shadow, id: w.id, boss: !!w.boss, hp: w.hp, maxHp: w.maxHp, size, leaving: false, squash: true};
  sprite.scale.set(.01, .01, 1);
  const at = Math.max(now(), busyUntil);
  burst(new THREE.Vector3(WILD_POS.x, 1.2, WILD_POS.z), w.boss ? 0xc77dff : 0xffffff, 26, 2.2, at - now());
  flashScreen(at - now());
  tween(.01, () => shakeCam(w.boss ? .6 : .3), at - now() + .1);
  focus(...wildView(), w.boss ? 2.2 : 1.6, at - now(), .8);
  const ww = wild;
  tween(.55, t => { const k = Math.max(.01, ease(t) * size); sprite.scale.set(k, k, 1); }, at - now(), () => { ww.squash = false; });
  if (w.boss) {
    const aura = new THREE.Mesh(new THREE.TorusGeometry(2, .08, 8, 48), new THREE.MeshBasicMaterial({color: 0xc77dff, transparent: true, opacity: .8}));
    aura.rotation.x = Math.PI / 2;
    aura.position.set(WILD_POS.x, .08, WILD_POS.z);
    root.add(aura);
    wild.aura = aura;
  }
  world.stageRing.material.color.set(w.boss ? 0xff7a95 : 0xffffff);
  window.Sfx && Sfx.play("appear");
}

function removeWildNow() {
  if (!wild) return;
  root.remove(wild.sprite, wild.shadow);
  if (wild.aura) root.remove(wild.aura);
  wild = null;
}

function leaveWild() {
  const w = wild;
  w.leaving = true;
  const at = Math.max(now(), busyUntil) - now();
  if (w.inBall) {
    // נתפס: הכדור עף אל המאמן
    const b = ball;
    if (b) tween(.6, t => { b.position.y = lerp(b.position.y, 3, t * .2); b.scale.setScalar(1 - t); }, at, () => { root.remove(b); if (ball === b) ball = null; });
    tween(.6, () => {}, at, () => { if (wild === w) removeWildNow(); });
    return;
  }
  const fainted = w.hp <= 0;
  w.squash = true;
  tween(fainted ? .9 : .6, t => {
    const k = Math.max(.01, w.size * (1 - ease(t)));
    if (fainted) { w.sprite.material.rotation = -ease(Math.min(1, t * 1.6)) * Math.PI / 2 * .9; w.sprite.position.y = -t * .3; }
    else w.sprite.scale.set(k, k, 1);
    w.sprite.material.opacity = 1 - t;
    w.shadow.material.opacity = 1 - t;
  }, at, () => { if (wild === w) removeWildNow(); });
  if (fainted) burst(new THREE.Vector3(WILD_POS.x, .8, WILD_POS.z), 0xdddddd, 14, 1.4, at);
}

/* ---------- אפקטים ---------- */

function burst(pos, color, count, speed, delay = 0) {
  const t0 = now() + delay;
  for (let i = 0; i < count; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({map: world.spark, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}));
    const s = .25 + Math.random() * .35;
    m.scale.set(s, s, 1);
    m.position.copy(pos);
    m.visible = false;
    const v = new THREE.Vector3(Math.random() - .5, Math.random() * .9 + .1, Math.random() - .5).normalize().multiplyScalar(speed * (.5 + Math.random()));
    root.add(m);
    particles.push({m, v, t0, life: .7 + Math.random() * .4, g: 2.5});
  }
}

function rise(pos, color, count, delay = 0) {
  const t0 = now() + delay;
  for (let i = 0; i < count; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({map: world.spark, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}));
    m.scale.set(.25, .25, 1);
    m.position.set(pos.x + (Math.random() - .5) * 1.2, pos.y + Math.random() * .3, pos.z + (Math.random() - .5) * .8);
    m.visible = false;
    root.add(m);
    particles.push({m, v: new THREE.Vector3(0, 1 + Math.random(), 0), t0: t0 + Math.random() * .5, life: 1.1, g: 0});
  }
}

function projectile(from, to, color, delay, dur, onHit) {
  const m = new THREE.Sprite(new THREE.SpriteMaterial({map: world.spark, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}));
  m.scale.set(.9, .9, 1);
  m.visible = false;
  root.add(m);
  tween(dur, t => {
    m.visible = true;
    m.position.lerpVectors(from, to, t);
    m.position.y += Math.sin(t * Math.PI) * 1.2;
    if (Math.random() < .6) trail(m.position, color);
  }, delay, () => { root.remove(m); onHit && onHit(); });
}

function trail(pos, color) {
  const m = new THREE.Sprite(new THREE.SpriteMaterial({map: world.spark, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}));
  m.scale.set(.4, .4, 1);
  m.position.copy(pos);
  root.add(m);
  particles.push({m, v: new THREE.Vector3(0, .2, 0), t0: now(), life: .35, g: 0});
}

function shake(sprite, delay) {
  const base = sprite.position.x;
  tween(.45, t => { sprite.position.x = base + Math.sin(t * 40) * .18 * (1 - t); }, delay, () => { sprite.position.x = base; });
  tween(.01, () => { sprite.userData.flash = 1; }, delay);
}

function floatText(pos, text, cls, delay = 0) {
  setTimeout(() => {
    if (!fxLayer || !camera) return;
    const v = pos.clone().project(camera);
    const r = fxLayer.getBoundingClientRect();
    const el = document.createElement("div");
    el.className = "float " + (cls || "");
    el.textContent = text;
    el.style.left = `${(v.x + 1) / 2 * r.width}px`;
    el.style.top = `${(1 - v.y) / 2 * r.height}px`;
    fxLayer.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }, delay * 1000);
}

function wildTop() {
  return new THREE.Vector3(WILD_POS.x, wild ? wild.size * .8 : 2, WILD_POS.z);
}

function playerWorld(pid, y = .9) {
  const p = players.get(pid);
  if (!p) return null;
  return new THREE.Vector3(p.group.position.x + .35, y, p.group.position.z + MON_Z);
}

const wildView = (amt = .75) => [new THREE.Vector3(WILD_POS.x + 2.2, 2.3, WILD_POS.z + 6.2), new THREE.Vector3(WILD_POS.x, 1.2, WILD_POS.z)];
function playerView(pid) {
  const p = players.get(pid);
  if (!p) return null;
  const x = p.group.position.x;
  return [new THREE.Vector3(x - 1.6, 2, SPOT_Z + 3.4), new THREE.Vector3(x * .4, 1.1, WILD_POS.z + 1)];
}

/* הבזק לבן על כל המסך */
function flashScreen(delay = 0) {
  setTimeout(() => {
    if (!fxLayer) return;
    const f = document.createElement("div");
    f.className = "flash";
    fxLayer.appendChild(f);
    setTimeout(() => f.remove(), 700);
  }, delay * 1000);
}

/* קפיצה קטנה (שמחה) עם מעיכה */
function hop(sprite, delay, times = 2) {
  const u = sprite.userData;
  tween(.36 * times, t => {
    const ph = (t * times) % 1;
    sprite.position.y = Math.sin(ph * Math.PI) * .45;
    const sq = ph < .12 ? 1 - ph * 1.5 : 1;
    sprite.scale.set(u.size / sq, u.size * sq, 1);
  }, delay, () => sprite.scale.set(u.size, u.size, 1));
}

/* תקיפה של שחקן: הפוקימון קופץ קדימה, יורה כדור אנרגיה, הפראי נרעד */
function fxAttack(fx) {
  const p = players.get(fx.pid);
  if (!p || !wild) return;
  p.prefer = {index: fx.index, id: fx.id};
  const mon = {id: fx.id, hp: 1};
  setSpriteMon(p, p.mon && p.mon.id === fx.id ? p.mon : mon);
  const s = p.sprite;
  const color = new THREE.Color(TYPES[POKEMON[fx.id].types[0]].color);
  const pv = playerView(fx.pid);
  if (pv) focus(pv[0], pv[1], .5, 0, .8);
  focus(...wildView(), .9, .55, .75);
  tween(.5, t => { s.position.z = MON_Z - Math.sin(t * Math.PI) * 1.1; s.position.y = Math.sin(t * Math.PI) * .5; }, .05);
  const from = playerWorld(fx.pid, 1.1);
  const w = wild;
  projectile(from, new THREE.Vector3(WILD_POS.x, 1.6, WILD_POS.z), color, .3, .5, () => {
    if (wild !== w) return;
    if (fx.mult > 0) { shake(w.sprite, 0); burst(new THREE.Vector3(WILD_POS.x, 1.5, WILD_POS.z), color, 18, 2.4); shakeCam(fx.mult > 1 ? .35 : .15); }
    if (fx.mult > 1 && p.sprite === s) hop(s, .25);
    floatText(wildTop(), fx.mult === 0 ? "אין השפעה" : `‎-${fx.dmg}`, fx.mult > 1 ? "up" : fx.mult < 1 ? "down" : "");
    window.Sfx && Sfx.play(fx.mult > 1 ? "superhit" : fx.mult === 0 ? "miss" : "hit");
  });
  busyUntil = now() + 1.1;
}

/* תור הפראי: מסתער על כל מטרה בתורה */
function fxWildAttack(fx) {
  if (!wild) return;
  const w = wild;
  const color = new THREE.Color(TYPES[POKEMON[w.id].types[0]].color);
  fx.hits.forEach((h, k) => {
    const delay = .2 + k * .75;
    const p = players.get(h.pid);
    if (!p) return;
    tween(.01, () => {
      p.prefer = {index: h.index, id: h.id};
      if (!p.sprite || p.sprite.userData.id !== h.id) setSpriteMon(p, {id: h.id, hp: 1});
    }, delay);
    const tv = playerView(h.pid);
    if (tv) focus(tv[0], tv[1], .7, delay, .7);
    tween(.45, t => { w.sprite.position.z = WILD_POS.z + Math.sin(t * Math.PI) * 1.4; w.sprite.position.y = Math.sin(t * Math.PI) * .4; }, delay);
    const to = playerWorld(h.pid, 1);
    projectile(new THREE.Vector3(WILD_POS.x, 1.6, WILD_POS.z), to, color, delay + .15, .45, () => {
      if (!p.sprite) return;
      if (h.mult > 0) { shake(p.sprite, 0); burst(to, color, 14, 2); shakeCam(.2); }
      floatText(new THREE.Vector3(to.x, 2.3, to.z), h.mult === 0 ? "אין השפעה" : `‎-${h.dmg}`, "hurt");
      if (h.ko) { const sp = p.sprite; sp.userData.falling = true; tween(.5, t => { sp.material.rotation = t * Math.PI / 2 * .9; sp.position.y = -t * .2; }, .2, () => { sp.userData.grey = true; }); }
      window.Sfx && Sfx.play("hurt");
    });
  });
  busyUntil = now() + .4 + fx.hits.length * .75;
}

/* זריקת כדור: עף בקשת, הפראי נבלע, הכדור מתנדנד, ואז נתפס או בורח */
function makeBall() {
  const g = new THREE.Group();
  const r = .26;
  const red = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({color: 0xe3262e}));
  const white = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshLambertMaterial({color: 0xf5f5f5}));
  const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.01, .04, 20), new THREE.MeshLambertMaterial({color: 0x222222}));
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .05, 14), new THREE.MeshLambertMaterial({color: 0xffffff}));
  btn.rotation.x = Math.PI / 2; btn.position.z = r;
  g.add(red, white, band, btn);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function fxWheel(S) {
  const wh = S.wheel;
  if (!wh || !wild) return;
  const w = wild;
  if (ball) root.remove(ball);
  ball = makeBall();
  const b = ball;
  root.add(b);
  const from = playerWorld(wh.pid, 1.2) || new THREE.Vector3(0, 1.2, SPOT_Z);
  const land = new THREE.Vector3(WILD_POS.x, .26, WILD_POS.z + .3);
  const hit = new THREE.Vector3(WILD_POS.x, 1.6, WILD_POS.z + .2);
  b.position.copy(from);
  window.Sfx && Sfx.play("throw");
  focus(new THREE.Vector3(WILD_POS.x + 1.4, 1.7, WILD_POS.z + 4.4), new THREE.Vector3(WILD_POS.x, .6, WILD_POS.z), 3.9, .4, .85);
  tween(.7, t => {
    b.position.lerpVectors(from, hit, t);
    b.position.y += Math.sin(t * Math.PI) * 2.2;
    b.rotation.x = -t * 12;
  }, 0, () => {
    burst(hit, 0xffffff, 22, 2);
    w.inBall = true;
    window.Sfx && Sfx.play("absorb");
  });
  tween(.3, t => { const k = Math.max(.01, w.size * (1 - t)); w.sprite.scale.set(k, k, 1); w.sprite.position.y = t; }, .7);
  tween(.4, t => { b.position.lerpVectors(hit, land, ease(t)); b.position.y = lerp(hit.y, land.y, t * t); b.rotation.x = 0; }, .75);
  for (let k = 0; k < 3; k++) {
    tween(.45, t => { b.rotation.z = Math.sin(t * Math.PI * 2) * .5; }, 1.35 + k * .7, () => window.Sfx && Sfx.play("wobble"));
  }
  tween(.01, () => {
    if (wh.success) {
      burst(new THREE.Vector3(land.x, 1, land.z), 0xffe066, 30, 2.2);
      const cp = players.get(wh.pid);
      if (cp && cp.sprite) hop(cp.sprite, .3, 3);
      cheer(wh.pid, 0);
      window.Sfx && Sfx.play("caught");
    } else {
      burst(new THREE.Vector3(land.x, 1, land.z), 0xffffff, 26, 2.6);
      shakeCam(.25);
      root.remove(b);
      if (ball === b) ball = null;
      w.inBall = false;
      tween(.35, t => { const k = Math.max(.01, w.size * ease(t)); w.sprite.scale.set(k, k, 1); w.sprite.position.y = 1 - t; });
      window.Sfx && Sfx.play("escape");
    }
  }, 3.45);
  busyUntil = now() + 3.6;
}

/* המאמן קופץ משמחה ואז חוזר לעמוד רגיל */
function cheer(pid, delay) {
  const p = players.get(pid);
  const u = p && p.trainer.userData;
  if (!u || !u.cheer) return;
  tween(.01, () => {
    u.cheer.reset().setEffectiveWeight(1).fadeIn(.3).play();
    u.idle.fadeOut(.3);
  }, delay);
  tween(.01, () => {
    u.idle.reset().fadeIn(.4).play();
    u.cheer.fadeOut(.4);
  }, delay + 2.8);
}

/* החלמה: נצנוצים ירוקים עולים */
function healFx(pid) {
  const pos = playerWorld(pid, .3);
  if (pos) rise(pos, 0x7dffb0, 14);
}

/* ---------- לולאה ---------- */

function frame() {
  if (!running) return;
  requestAnimationFrame(frame);
  const t = now();
  const dt = Math.min(.05, clock.getDelta());

  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    if (t < tw.start) continue;
    const k = Math.min(1, (t - tw.start) / tw.dur);
    tw.fn(k);
    if (k >= 1) { tweens.splice(i, 1); tw.done && tw.done(); }
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    if (t < p.t0) continue;
    p.m.visible = true;
    const age = (t - p.t0) / p.life;
    if (age >= 1) { root.remove(p.m); p.m.material.dispose(); particles.splice(i, 1); continue; }
    p.v.y -= p.g * dt;
    p.m.position.addScaledVector(p.v, dt);
    p.m.material.opacity = 1 - age;
  }

  // מאמנים: נכנסים למקום, נושמים, ומי שבתור מסומן
  for (const [pid, p] of players) {
    const gp = p.group.position;
    gp.x = lerp(gp.x, p.x, .12);
    gp.z = lerp(gp.z, SPOT_Z, .08);
    const active = pid === state.cur;
    p.ring.material.color.set(active ? 0xffd34d : p.color);
    p.ring.scale.setScalar(active ? 1 + Math.sin(t * 6) * .06 : 1);
    if (p.trainer.userData.mixer) p.trainer.userData.mixer.update(dt);
    else p.trainer.position.y = Math.sin(t * 2 + p.x) * .02;
    p.disc.material.color.set(pid === state.myPid ? 0xdfeaff : 0xffffff);
    if (p.sprite) {
      const u = p.sprite.userData;
      p.sprite.position.y = Math.max(p.sprite.position.y * .85, u.grey ? 0 : Math.abs(Math.sin(t * 2.4 + p.x)) * .06);
      tint(p.sprite, u);
      if (u.grey) p.sprite.material.rotation = Math.PI / 2 * .9;
      else if (!u.falling) p.sprite.material.rotation = 0;
    }
  }
  if (wild && !wild.leaving) {
    const u = wild.sprite.userData;
    tint(wild.sprite, u);
    if (!wild.inBall) wild.sprite.position.y = Math.max(wild.sprite.position.y * .9, Math.abs(Math.sin(t * 1.8)) * .08);
    if (!wild.inBall && !wild.squash) { const k = 1 + Math.sin(t * 2.2) * .025; wild.sprite.scale.set(wild.size / k, wild.size * k, 1); }
    if (wild.aura) { wild.aura.rotation.z = t; wild.aura.scale.setScalar(1 + Math.sin(t * 3) * .05); }
  }

  // מצלמה: מתנדנדת לאט, ומתקרבת למה שקורה
  if (cam.basePos) {
    const dp = cam.basePos.clone(), dl = cam.baseLook.clone();
    dp.x += Math.sin(t * .23) * .4;
    dp.y += Math.sin(t * .31) * .15;
    if (cam.focus && t < cam.focus.until) { dp.lerp(cam.focus.pos, cam.focus.amt); dl.lerp(cam.focus.look, cam.focus.amt); }
    cam.pos.lerp(dp, .045);
    cam.look.lerp(dl, .045);
    camera.position.copy(cam.pos);
    if (cam.shake > .001) {
      camera.position.x += (Math.random() - .5) * cam.shake;
      camera.position.y += (Math.random() - .5) * cam.shake;
      cam.shake *= .88;
    }
    camera.lookAt(cam.look);
  }
  if (world.clouds) world.clouds.forEach((c, i) => { c.position.x += dt * (.25 + i * .03); if (c.position.x > 45) c.position.x = -45; });

  positionTags();
  renderer.render(scene, camera);
}

function tint(sprite, u) {
  u.flash = Math.max(0, u.flash - .06);
  const c = sprite.material.color;
  if (u.grey) c.setRGB(.35, .35, .38);
  else c.setRGB(1, 1 - u.flash * .6, 1 - u.flash * .6);
}

/* תגיות השמות (HTML) יושבות מעל המאמנים */
function positionTags() {
  if (!tagLayer) return;
  const r = tagLayer.getBoundingClientRect();
  const v = new THREE.Vector3();
  tagLayer.querySelectorAll("[data-pid]").forEach(el => {
    const p = players.get(el.dataset.pid);
    if (!p) { el.style.display = "none"; return; }
    v.set(p.group.position.x - .75, 1.85, p.group.position.z + .35).project(camera);
    el.style.display = "";
    el.style.left = `${(v.x + 1) / 2 * r.width}px`;
    el.style.top = `${(1 - v.y) / 2 * r.height}px`;
  });
}

function resize() {
  if (!mounted) return;
  const w = mounted.clientWidth, h = mounted.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // מתרחקים רק כמה שצריך כדי שכל שורת המאמנים תיכנס
  const n = Math.max(2, state.n || 2);
  const half = spotX(n - 1, n) + 1.4;
  // כמה רחוק צריך לעמוד כדי שכל המאמנים ייכנסו לרוחב המסך
  const halfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
  const fit = Math.min(2.6, Math.max(1, ((half + 1.6) / halfFov + 2.2) / 8.4));
  cam.basePos = new THREE.Vector3(0, 2.9 * fit, 8.4 * fit + 1.2);
  cam.baseLook = new THREE.Vector3(0, 1.1, -2.6);
  if (!cam.pos || !cam.focus || now() > cam.focus.until) { cam.pos = cam.basePos.clone(); cam.look = cam.baseLook.clone(); }
  camera.updateProjectionMatrix();
}

/* ---------- ממשק ---------- */

const prev = {teams: new Map()};

const Arena = {
  ok: false,
  mount(container) {
    if (mounted === container) return;
    mounted = container;
    container.prepend(renderer.domElement);
    tagLayer = container.querySelector(".tags");
    fxLayer = container.querySelector(".fx-layer");
    if (window.ResizeObserver) { ro && ro.disconnect(); ro = new ResizeObserver(resize); ro.observe(container); }
    resize();
    if (!running) { running = true; clock.getDelta(); frame(); }
  },
  unmount() {
    running = false;
    mounted = null;
    for (const [, p] of players) root.remove(p.group);
    players.clear();
    removeWildNow();
    if (ball) { root.remove(ball); ball = null; }
    prev.teams.clear();
  },
  sync(S, myPid, cur, fx) {
    state.myPid = myPid;
    state.cur = cur;
    if (state.n !== S.players.length) { state.n = S.players.length; resize(); }
    if (S.phase === "starterPick" || S.phase === "waiting") for (const [, p] of players) p.prefer = null;
    syncPlayers(S);
    // החלמה: חיים שעלו
    S.players.forEach(pl => {
      const before = prev.teams.get(pl.pid);
      if (before) {
        const healed = pl.team.some((m, i) => before[i] && before[i].id === m.id && m.hp > before[i].hp);
        if (healed) healFx(pl.pid);
      }
      prev.teams.set(pl.pid, pl.team.map(m => ({id: m.id, hp: m.hp})));
    });
    if (fx && fx.kind === "damage") fxAttack(fx);
    if (fx && fx.kind === "wildAttack") fxWildAttack(fx);
    if (fx && fx.kind === "wheel") fxWheel(S);
    syncWild(S);
  }
};

try {
  const c = document.createElement("canvas");
  if (!(c.getContext("webgl2") || c.getContext("webgl"))) throw new Error("no webgl");
  renderer = new THREE.WebGLRenderer({antialias: true, alpha: false});
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = "arena-canvas";
  camera = new THREE.PerspectiveCamera(42, 1, .1, 120);
  clock = new THREE.Clock();
  buildWorld();
  loadAllModels();
  window.addEventListener("resize", resize);
  // טוענים מראש את כל התמונות
  Object.values(POKEMON).forEach(d => artTex(d.dex));
  Arena.ok = true;
} catch (e) {
  console.warn("3D לא זמין", e);
}

window.Arena = Arena;
window.dispatchEvent(new Event("arena-ready"));
