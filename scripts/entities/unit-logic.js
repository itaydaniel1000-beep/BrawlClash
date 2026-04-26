// unit-logic.js - Unit Update and Draw logic (Prototype extensions)
Unit.prototype.update = function(dt, now) {
    if (this.isDead || this.isFrozen) return;

    let speedMult = 1;
    let atkSpeedMult = 1;
    let damageMult = 1;

    let dmgBoost = (this.team === 'player' && typeof hasStarPower === 'function' && hasStarPower('8bit', 'sp2')) ? 0.3 : 0.1;

    auras.forEach(a => {
        if (a.isDead || a.isFrozen) return;
        let distToAura = Math.hypot(this.x - a.x, this.y - a.y);
        if (distToAura <= a.radius) {
            if (a.team === this.team) {
                if (a.type === 'max') {
                    speedMult *= 1.5;
                } else if (a.type === '8bit') {
                    damageMult *= (1 + dmgBoost);
                }
            } else {
                if (a.type === 'spike') {
                    let canSlow = true;
                    if (this.team === 'player' && hasStarPower('max', 'sp2')) {
                        let inMaxAura = auras.some(ma => ma.team === this.team && ma.type === 'max' && !ma.isDead && !ma.isFrozen && Math.hypot(this.x - ma.x, this.y - ma.y) <= ma.radius);
                        if (inMaxAura) canSlow = false;
                    }
                    if (canSlow) speedMult *= 0.5;
                } else if (a.type === 'tara') {
                    let dx = a.x - this.x;
                    let dy = a.y - this.y;
                    let dist = Math.hypot(dx, dy);
                    if (dist > 5) {
                        let pullStrength = 150;
                        this.x += (dx / dist) * pullStrength * (dt / 1000);
                        this.y += (dy / dist) * pullStrength * (dt / 1000);
                    }
                } else if (a.type === 'emz' && a.team === 'player' && hasStarPower('emz', 'sp1')) {
                    damageMult *= 1.2; 
                }
            }
        }
    });

    if (this.type === 'leon' && this.team === 'player' && hasStarPower('leon', 'sp2') && this.isInvisible) {
        speedMult *= 1.25;
    }

    // === Player-drawn path follow (any walking unit) =====================
    // If the unit was spawned with a waypoints[] (commitAmberPath or
    // SYNC_SPAWN), it walks the chosen route in order before falling back
    // to its per-type AI. Amber additionally dies on path-end (her trail
    // is the whole point); every other unit just resumes its default
    // targeting once the path is exhausted.
    let onPath = false;
    if (this.waypoints && this.waypoints.length > 0 && this._currentWp < this.waypoints.length) {
        const wp = this.waypoints[this._currentWp];
        const dist = Math.hypot(wp.x - this.x, wp.y - this.y);
        if (dist <= 20) {
            this._currentWp++;
            if (this._currentWp >= this.waypoints.length) {
                if (this.type === 'amber') {
                    this.isDead = true;
                    return;
                }
                // Non-Amber: clear so the per-type AI below picks up.
                this.waypoints = [];
                this._currentWp = 0;
            }
        }
        if (this._currentWp < this.waypoints.length) {
            const next = this.waypoints[this._currentWp];
            this.target = { x: next.x, y: next.y, isDead: false, radius: 0, takeDamage: () => {} };
            onPath = true;
        }
    }

    if (onPath) {
        // Move toward the next waypoint at base speed (no attack mid-path,
        // even for melee types — the player explicitly steered them here).
        const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        const dashMult = (now < (this.dashEndTime || 0)) ? 5 : 1;
        this.x += Math.cos(angle) * this.speed * speedMult * dashMult * (dt / 1000);
        this.y += Math.sin(angle) * this.speed * speedMult * dashMult * (dt / 1000);
        // Pacifist (Amber): drop a fire-trail aura behind us as we walk.
        if (this.isPacifist) {
            if (!this._lastTrailTime || (now - this._lastTrailTime) > 250) {
                try {
                    const trail = new Aura(this.x, this.y, this.team, 'fire-trail');
                    trail._owner = this;
                    if (typeof auras !== 'undefined') auras.push(trail);
                } catch (e) {}
                this._lastTrailTime = now;
            }
        }
        return;
    }

    if (this.type === 'bull' || this.type === 'porter') {
        let enemies = units.concat(buildings, auras).concat([playerSafe, enemySafe].filter(s => s)).filter(e => e && e.team !== this.team && !e.isInvisible && !e.isDead && !e.isFrozen && !isAmberOrTrail(e));
        this.target = enemies.length > 0 ? enemies.sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y))[0] : null;

        // Bull's dash: lock onto the first target when dash starts, end dash when that target dies.
        if (this.type === 'bull' && this.dashEndTime) {
            if (!this.dashTarget) {
                this.dashTarget = this.target;
            } else if (this.dashTarget.isDead) {
                this.dashEndTime = 0;
                this.dashTarget = null;
            }
        }
    } else if (this.type === 'amber') {
        // No waypoints (free-roam): chase nearest enemy. When she reaches
        // the enemy she vanishes — her job in free-roam mode is to lay
        // down a single trail line from spawn → nearest enemy and then
        // exit. Path-mode is handled by the top-level path branch above.
        const enemies = units.concat(buildings, auras)
            .concat([playerSafe, enemySafe].filter(s => s))
            .filter(e => e && e.team !== this.team && !e.isInvisible && !e.isDead && !e.isFrozen && !isAmberOrTrail(e));
        this.target = enemies.length > 0
            ? enemies.sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y))[0]
            : null;
        if (this.target && !this.target.isDead) {
            const dContact = Math.hypot(this.target.x - this.x, this.target.y - this.y);
            if (dContact <= (this.target.radius || 15) + this.radius) {
                this.isDead = true;
                return;
            }
        }
    } else {
        this.target = this.team === 'player' ? enemySafe : playerSafe;
    }

    // Amber is a pacifist — she NEVER stops to attack, just walks. She also
    // emits a fire-trail aura behind her every ~250ms; the fire deals
    // 25 dmg/sec to anyone standing in it (see aura.js 'fire-trail' subtype).
    if (this.isPacifist) {
        if (!this._lastTrailTime || (now - this._lastTrailTime) > 250) {
            try {
                const trail = new Aura(this.x, this.y, this.team, 'fire-trail');
                // Back-reference so the trail can self-extinguish when its
                // owner dies — without this, fires lingered for up to ~2.5s
                // after Amber vanished. See aura.js update() for the kill.
                trail._owner = this;
                if (typeof auras !== 'undefined') auras.push(trail);
            } catch (e) {}
            this._lastTrailTime = now;
        }
        if (this.target && !this.target.isDead) {
            const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
            this.x += Math.cos(angle) * this.speed * speedMult * (dt / 1000);
            this.y += Math.sin(angle) * this.speed * speedMult * (dt / 1000);
        }
        return;
    }

    if (this.target && !this.target.isDead) {
        let dist = Math.hypot(this.target.x - this.x, this.target.y - this.y);
        if (dist <= this.attackRange + this.target.radius) {
            if (now - this.lastAttackTime > this.attackSpeed * atkSpeedMult) {
                if (this.isInvisible) this.isInvisible = false; 

                let dmg = this.attackDamage * damageMult;
                if (this.hasAmbush) {
                    dmg *= 2;
                    this.hasAmbush = false; 
                }

                this.target.takeDamage(dmg);
                this.lastAttackTime = now;

                // Bull's dash ends as soon as the dashed-to target dies; he should not auto-dash to the next enemy
                if (this.type === 'bull' && this.target.isDead && this.dashEndTime) {
                    this.dashEndTime = 0;
                }

                if (this.type === 'bruce' && this.team === 'player' && hasStarPower('bruce', 'sp2')) {
                    this.target.isFrozen = true;
                    setTimeout(() => { if (this.target) this.target.isFrozen = false; }, 1000);
                }

                if (typeof MeleeEffect === 'function') projectiles.push(new MeleeEffect(this.x + (this.target.x - this.x) * 0.5, this.y + (this.target.y - this.y) * 0.5));
            }
        } else {
            let angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
            let dashMult = (now < (this.dashEndTime || 0)) ? 5 : 1; 

            if (this.type === 'bull' && this.team === 'player' && hasStarPower('bull', 'sp2') && dashMult > 1) {
                this.shieldHp = 500;
            }

            if (this.type === 'bull') {
                this.isInvisible = (dashMult > 1);
            }

            this.x += Math.cos(angle) * this.speed * speedMult * dashMult * (dt / 1000);
            this.y += Math.sin(angle) * this.speed * speedMult * dashMult * (dt / 1000);

            if (dashMult > 1 && Math.random() > 0.5 && typeof MeleeEffect === 'function') {
                projectiles.push(new MeleeEffect(this.x, this.y));
            }
        }
    }
};

// Pixel-art torch sprite for Amber. Each character in the grid below is a
// single rendered pixel — sampled colour-by-colour from the reference
// image the user shared. No curves, no gradients, no white background:
// just discrete coloured cells on transparent canvas.
//
// Color legend (PALETTE keys):
//   R = red flame outer            (#E74C3C)
//   r = red flame edge / shadow    (#C0392B)
//   O = orange flame mid layer     (#F39C12)
//   Y = yellow flame core          (#F1C40F)
//   D = brown handle main          (#5C2E1F)
//   d = handle shadow (right side) (#3E1E12)
//   L = light brown highlight      (#8B4F39)
//   C = collar / cup main          (#4A2418)
//   c = collar darkest accent      (#2D1408)
//   '.' or ' ' = transparent
//
// Frozen: the warm palette swaps to cool blues (B/b/F/f) so the visual
// still reads "torch is out / paused" without breaking the silhouette.
const _AMBER_TORCH_PALETTE = {
    // Flame: warmer / more orange-leaning red than v9.99 to match the
    // reference, with a brighter yellow accent in the inner core.
    R: '#E84128', r: '#C0392B',
    O: '#F08020', Y: '#FFB02E',
    M: '#FFD24A',
    D: '#6B362A', d: '#46211A',
    L: '#8E5240',
    C: '#5A2A1E', c: '#2E1208',
    // Frozen variants
    B: '#5E7A8C', b: '#3D5466',
    F: '#9DD3FF', f: '#74B9FF', N: '#C7E5FF'
};

// 16 columns × 28 rows. Rows 0–14 = flame (with two distinct curling
// side-wisps), 15–17 = collar, 18–27 = tapered handle.
//
// Color legend:
//   R = red flame outer            r = red flame edge / shadow
//   O = orange mid layer           Y = yellow inner flame
//   M = bright yellow accent       (very small bright spot)
//   D = brown handle main          d = handle right-side shadow
//   L = light brown highlight      C = collar / cup main
//   c = collar darkest accent
//   '.' = transparent
const _AMBER_TORCH_GRID = [
    '........RR......',  //  0  flame tip
    '.......RRRR.....',  //  1
    '......RRrrRR....',  //  2
    '....r.RRYYRR..r.',  //  3  both wisps start (cols 4, 14)
    '...rR.RYOOYR.rR.',  //  4  wisps continue outward
    '..rRR.RYOOYRrRR.',  //  5  wisps thickening, inner widening
    '.rRR.RYOOOMYRR..',  //  6  left wisp tail + bright accent
    '.RR.RRYOOOOYRR..',  //  7  flame body widens, left wisp ends
    'RRR.RRYOOOOYRR..',  //  8
    'RRRRYOOOOOOOYRRR',  //  9  max width — full bulb
    '.RRRYOOOOOOOYRR.',  // 10
    '..RRYYOOOOOYYRR.',  // 11
    '...RRYYYOOOYYRR.',  // 12
    '....RRYYYYYRR...',  // 13  flame narrows toward base
    '.....RRRRRRR....',  // 14  flame base
    '....CCCCCCCC....',  // 15  collar top (slightly wider)
    '...cCCccccCCc...',  // 16  collar middle (shading band)
    '....CCCCCCCC....',  // 17  collar bottom
    '....LDDDDDDD....',  // 18  handle top (8 wide)
    '....LDDDDDDD....',  // 19
    '....LDDDDDDd....',  // 20
    '....LDDDDDDd....',  // 21
    '.....LDDDDDd....',  // 22  taper to 7 wide
    '.....LDDDDDd....',  // 23
    '......LDDDDd....',  // 24  taper to 6 wide
    '......LDDDDd....',  // 25
    '.......LDDDd....',  // 26  taper to 5 wide
    '........DDd.....'   // 27  pointed bottom
];

const _AMBER_FROZEN_SUBS = {
    R:'F', r:'f', O:'F', Y:'F', M:'N',
    D:'B', d:'b', L:'b',
    C:'b', c:'b'
};

// === Bruce — angry red bear face ==========================================
//
// Color legend:
//   R = bright red bear body       r = darker red shadow on edges
//   H = red highlight (top of head)
//   N = black nose                 E = black eye
//   W = white fang
//   '.' = transparent
//
// Frozen variants:
//   I = ice blue main              i = darker ice blue
const _BRUCE_PALETTE = {
    R: '#BF1F26', r: '#8E1418', H: '#DD3036',
    N: '#1A1A1A', E: '#1A1A1A',
    W: '#F5F5F5',
    I: '#9DD3FF', i: '#74B9FF'
};

// 16 columns × 14 rows. Round face with two ears, eyes, nose, and two fangs
// hanging at the bottom. Mirrored / centered on column 7.5.
const _BRUCE_GRID = [
    '..RR........RR..',  //  0  ear tops
    '.RRRR......RRRR.',  //  1  ear bodies
    '.RRRR......RRRR.',  //  2
    'RRRRRRRRRRRRRRRR',  //  3  top of face (full width)
    'RHHRRRRRRRRRRHHR',  //  4  highlights (top corners)
    'rRRREE....EERRRr',  //  5  small black eyes (cols 4-5, 10-11)
    'rRRRRRRRRRRRRRRr',  //  6
    'rRRRRRNNNNRRRRRr',  //  7  nose top (4 wide)
    'rRRRRNNNNNNRRRRr',  //  8  nose middle (6 wide)
    'rRRRRNNNNNNRRRRr',  //  9
    'rrRRRRNNNNRRRRrr',  // 10  nose narrows
    '.rRRRWW..WWRRRr.',  // 11  fangs visible
    '..rrWW....WWrr..',  // 12  fang tips
    '.....W....W.....'   // 13  fang very tips
];

const _BRUCE_FROZEN_SUBS = { R:'I', r:'i', H:'I' };

// === Scrappy — golden-retriever dog face ==================================
//
// Per user request: use Gemini's EXACT output verbatim, including the
// truncated 10-row grid (rows 10-12 absent) and the in-row space gaps
// on the right side of rows 2-5 / 8-9. The user is aware this leaves
// visible holes in the silhouette and an unfinished bottom — that's the
// design they explicitly asked for.
//
// Color legend (from Gemini's palette):
//   B = main brown fur (golden retriever)   b = darker shadow brown
//   H = tan highlight                       W = white blaze
//   E = black eye                           n = black nose
//   P = pink tongue
//   '.' or ' ' = transparent
//
// Frozen variants:
//   F = ice blue main                       f = darker iced blue
//   N = light frosted highlight
const _SCRAPPY_PALETTE = {
    B: '#C69C6D', b: '#8C6239',
    H: '#EBD6B3',
    W: '#FFFFFF',
    E: '#222222', n: '#111111',
    P: '#FF9999',
    F: '#9DD3FF', f: '#74B9FF', N: '#B0DAE6'
};

// 15 cols × 10 rows — Gemini's verbatim output. Spaces inside the rows
// render as transparent (the renderer treats ' ' the same as '.'),
// which is what produces the visible gaps the user opted into.
const _SCRAPPY_GRID = [
    '.....HHBHH.....',  //  0  קודקוד
    '..bbHBBWBBHbb..',  //  1  אוזניים צדדיות
    '.bbHBBBWBBB bB.',  //  2
    '.bHBBBBWBBBB b.',  //  3
    '.bHBBEBWBEBB b.',  //  4  עיניים
    '.bHBBBBWBBBB b.',  //  5
    '..HBBBBnBBBBb..',  //  6  אף במרכז
    '..HBBWWWWWBBb..',  //  7  אזור הפה
    '...HWWWPWW b...',  //  8  לשון מבצבצת
    '....HWPPP b....'   //  9
];

const _SCRAPPY_FROZEN_SUBS = {
    B: 'F', b: 'f',
    H: 'N'
    // W / E / n / P stay — they read through ice
};

// === Max — yellow lightning bolt (v2 — thicker) ===========================
//
// Sprite redesigned by Gemini. Verification claim of "cols=17" was wrong
// — actual row lengths ranged 16-20. Normalised to **cols=20** by right-
// padding every short row with dots so nothing is clipped and the
// thicker bolt the user wanted renders intact.
//
// Color legend:
//   Y = main bolt yellow            y = orange-ish shadow (defined,
//                                       unused in this draft)
//   W = core white glow
//   '.' or ' ' = transparent
//
// Frozen variants (warm yellows → cool ice):
//   F = ice blue main               f = darker iced blue
//   N = light frosted highlight
const _MAX_PALETTE = {
    Y: '#FFD700', y: '#FFA500', W: '#FFFFFF',
    F: '#9DD3FF', f: '#74B9FF', N: '#B0DAE6'
};

// 25 cols × 21 rows — Gemini v4. Bolt has new asymmetric "L"-shaped
// top: rows 0-2 start at the upper-right (cols 12-17), then jumps left
// to rows 3-7 (cols 4-12), middle branch at rows 8-9, then a second
// zigzag down-right from rows 10-20. All rows padded right to 25 chars
// (Gemini's actual lengths ranged 16-25).
const _MAX_GRID = [
    '...............WWW.......',  //  0  top-right (rightmost spark)
    '............WYYYW........',  //  1  top wide part
    '..........WYYYYW.........',  //  2  bolt curves left
    '......WYYYYYW............',  //  3
    '.......WYYYYW............',  //  4
    '......WYYYYW.............',  //  5  first zag
    '.....WYYYYW..............',  //  6
    '....WYYYYW...............',  //  7
    '...WYYYYYYYYW............',  //  8  middle branch
    '....WYYYYYYYW............',  //  9
    '.......WYYYYYYW..........',  // 10  ← anchorRow
    '......WYYYYYW............',  // 11
    '.....WYYYYYW.............',  // 12
    '....WYYYYYW..............',  // 13
    '.....WYYYYYW.............',  // 14  second zag
    '......WYYYYW.............',  // 15
    '.......WYYW..............',  // 16
    '........WYYW.............',  // 17
    '.........WYYW............',  // 18
    '..........WYW............',  // 19
    '.............W...........'   // 20  tip
];

const _MAX_FROZEN_SUBS = {
    Y: 'F', y: 'f', W: 'N'
};

// === Penny — round bomb with lit fuse =====================================
//
// Sprite designed by Gemini (verified: all 16 rows × 16 chars). Original
// content was left-aligned (max-width row at cols 0-12), so shifted +2
// cols to the right to centre the bomb within the 16-col grid — keeps
// the visual centre on the unit's position instead of offset to the left.
//
// Color legend:
//   B = main dark grey iron        b = bomb shadow / outline
//   H = iron highlight (lit side)
//   K = brown fuse                 k = dark fuse (shadow)
//   Y = spark yellow               y = spark orange
//   W = spark white core
//   '.' or ' ' = transparent
//
// Frozen variants (warm → cool):
//   F = ice main                   f = darker ice
//   N = light frosted highlight
const _PENNY_PALETTE = {
    B: '#333333', b: '#1A1A1A',
    H: '#555555',
    K: '#8B4513', k: '#5D2E0A',
    Y: '#FFD700', y: '#FF8C00',
    W: '#FFFFFF',
    F: '#9DD3FF', f: '#74B9FF', N: '#B0DAE6'
};

// v3 redesign: bomb body now dominates the sprite (~70% of grid area
// instead of ~50% in v11.6). The card icon was showing the bomb as a
// small dot in the lower half because the upper half was mostly empty
// (sparks + fuse with lots of dead space). Compacted the spark/fuse
// area to 4 rows and extended the bomb body to 11 rows, with the
// max-width band hitting the full 16 cols.
const _PENNY_GRID = [
    '........y.Y.....',  //  0  small spark cluster (top)
    '.......YWy......',  //  1  flame
    '........K.......',  //  2  fuse start
    '.......K........',  //  3  fuse winds slightly
    '....HHHHHHH.....',  //  4  metal nozzle band (wider — 7 px)
    '...HBBBBBBBBb...',  //  5  bomb begins (10 wide)
    '..HBBBBBBBBBBb..',  //  6  (12 wide)
    '.HBBBBBBBBBBBBb.',  //  7  (14 wide)
    'HBBBBBBBBBBBBBBb',  //  8  max width (16 — full grid)
    'HBBBBBBBBBBBBBBb',  //  9  max
    'HBBBBBBBBBBBBBBb',  // 10  ← anchorRow (visual centre of bomb body)
    '.HBBBBBBBBBBBBb.',  // 11  (14)
    '.bBBBBBBBBBBBBb.',  // 12  (14, b on left edge)
    '..bBBBBBBBBBBb..',  // 13  (12)
    '...bbBBBBBBbb...',  // 14  (10)
    '....bbbbbbbb....'   // 15  bottom shadow (8)
];

const _PENNY_FROZEN_SUBS = {
    B: 'F', b: 'f',
    H: 'N',
    K: 'f', k: 'f'
    // Y / y / W stay — sparks visible through ice tint
};

// === Tara — single staring eye ============================================
//
// Sprite designed by Gemini (verified: 14 rows × 18 chars). Two
// bug-fixes applied before integration:
//   • Row 10 used `h` (lowercase) which wasn't defined in Gemini's
//     palette — would have rendered as transparent. Changed to `s`
//     (existing dark shadow char) so the under-eye shadow renders.
//   • Rows 11-13 were entirely empty (just dots). Trimmed — they
//     served no purpose, just inflated the sprite's height. Final
//     grid is 11 rows.
//
// Color legend:
//   S = main eyelid grey            s = eyelid shadow
//   H = eyelid highlight (light)    W = eye white (sclera)
//   E = pupil black                 e = pupil/iris shadow (defined,
//                                       unused — kept for future tweaks)
//   '.' = transparent
//
// Frozen variants:
//   F = ice main                    f = darker ice
//   N = light frosted highlight
const _TARA_PALETTE = {
    S: '#4A4A4A', s: '#2A2A2A',
    H: '#7A7A7A',
    W: '#FFFFFF',
    E: '#000000', e: '#333333',
    F: '#9DD3FF', f: '#74B9FF', N: '#B0DAE6'
};

// Doubled height (per user "פי 2" request) — every original row is
// duplicated so the on-canvas sprite appears exactly 2× as tall while
// keeping the same width and silhouette. Total rows: 11 → 22.
const _TARA_GRID = [
    '......HHHHHH......',  //  0  brow (was orig 0)
    '......HHHHHH......',  //  1
    '....HHSSSSSSHH....',  //  2  upper eyelid (was orig 1)
    '....HHSSSSSSHH....',  //  3
    '..HHSSSSSSSSSSHH..',  //  4  (was orig 2)
    '..HHSSSSSSSSSSHH..',  //  5
    '.HSSWWWWWWWWWWSSs.',  //  6  sclera (was orig 3)
    '.HSSWWWWWWWWWWSSs.',  //  7
    'HSSWWWWEEEEWWWWSSs',  //  8  pupil (was orig 4)
    'HSSWWWWEEEEWWWWSSs',  //  9
    'HSSWWWWEEEEWWWWSSs',  // 10  ← anchorRow (was orig 5, pupil centre)
    'HSSWWWWEEEEWWWWSSs',  // 11
    'HSSWWWWEEEEWWWWSSs',  // 12  (was orig 6)
    'HSSWWWWEEEEWWWWSSs',  // 13
    '.HSSWWWWWWWWWWSSs.',  // 14  (was orig 7)
    '.HSSWWWWWWWWWWSSs.',  // 15
    '..HHSSSSSSSSSSss..',  // 16  lower eyelid (was orig 8)
    '..HHSSSSSSSSSSss..',  // 17
    '....HHssssssHH....',  // 18  (was orig 9)
    '....HHssssssHH....',  // 19
    '......ssssss......',  // 20  under-eye shadow (was orig 10)
    '......ssssss......'   // 21
];

const _TARA_FROZEN_SUBS = {
    S: 'F', s: 'f',
    H: 'N'
    // W (sclera) / E (pupil) stay — they read through ice
};

// === Pam — green healing heart ============================================
//
// Sprite designed by Gemini (verified clean: all 15 rows × 17 chars).
// Replaces the 💚 emoji that sat in the centre of Pam's healing aura.
//
// Color legend:
//   G = main healing green          g = dark forest shadow / right edge
//   H = pale mint highlight         W = pure white shine accent
//   '.' = transparent
//
// Frozen variants (greens swap to ice):
//   F = ice main                    f = darker ice
//   N = light frosted highlight
const _PAM_PALETTE = {
    G: '#4ADE80', g: '#166534',
    H: '#BBF7D0',
    W: '#FFFFFF',
    F: '#9DD3FF', f: '#74B9FF', N: '#B0DAE6'
};

// 17 cols × 15 rows. Heart silhouette with two lobes at top and a
// pointed bottom. Light from upper-left (H highlights on left edge,
// g shadows on right edge). Bright white WW shine accent at rows 3-4
// suggests a glossy 3D feel.
const _PAM_GRID = [
    '..HHHHH...HHHHH..',  //  0  twin lobe tops
    '.HGGGGGH.HGGGGGg.',  //  1  upper lobes widen
    'HGGGGGGGHGGGGGGGg',  //  2  full lobe width
    'HGGWWGGGGGGGGGGGg',  //  3  WW shine on left lobe
    'HGGWWGGGGGGGGGGGg',  //  4
    'HGGGGGGGGGGGGGGGg',  //  5  lobes merge
    '.HGGGGGGGGGGGGGg.',  //  6  heart starts narrowing
    '.HGGGGGGGGGGGGGg.',  //  7
    '..HGGGGGGGGGGGg..',  //  8  ← anchorRow
    '...HGGGGGGGGGg...',  //  9
    '....HGGGGGGGg....',  // 10
    '.....HGGGGGg.....',  // 11
    '......HGGGg......',  // 12
    '.......HGg.......',  // 13
    '........g........'   // 14  pointed bottom
];

const _PAM_FROZEN_SUBS = {
    G: 'F', g: 'f',
    H: 'N'
    // W (white shine) stays — reads through ice tint
};

// === Bull — angry smoking bull ============================================
//
// Sprite designed by Gemini. Bug-fixes applied before integration:
//   • Rows 4-7 used `h` (lowercase) which wasn't defined in the
//     palette — would have left holes in the horn outer edges.
//     Changed to `H` (existing highlight char) so the horns render
//     with proper outer-edge highlights.
//   • Rows 15-23 were 22 chars long (Gemini claimed 23). Padded
//     each with 1 dot on the right.
//   • Row 24 was 21 chars; re-centred to symmetric 23.
//   • Trailing empty row 25 trimmed.
//
// Color legend:
//   B = main brown bull body        b = darker brown shadow
//   H = brown highlight (lit edge)
//   K = bone-white horn             k = horn shadow
//   E = red glowing eyes
//   G = mid-grey smoke              g = darker smoke
//   S = white smoke core
//   '.' = transparent
//
// Frozen variants:
//   F = ice main                    f = darker ice
//   N = light frosted highlight
const _BULL_PALETTE = {
    B: '#5D4037', b: '#3E2723',
    H: '#8D6E63',
    K: '#D7CCC8', k: '#A1887F',
    E: '#FF0000',
    G: '#BDBDBD', g: '#757575',
    S: '#EEEEEE',
    F: '#9DD3FF', f: '#74B9FF', N: '#B0DAE6'
};

// 23 cols × 25 rows. Standing bull silhouette: floating smoke wisps at
// top, curved horns, head with red eyes + smoking nostrils, broad
// shoulders, body, split legs, and a base shadow.
const _BULL_GRID = [
    '.......g.G.S.g.........',  //  0  smoke wisps (flicker)
    '..g.G.S.g.....g.G.S.g..',  //  1  smoke wisps
    '..G.S.g.........g.S.G..',  //  2  smoke wisps
    'KKKk...............kKKK',  //  3  horn tips
    'HKKKk.............kKKKH',  //  4  horns (h→H fixed)
    '.HKKKk...........kKKKH.',  //  5
    '..HKKKkk.......kkKKKH..',  //  6
    '...HKKKKkkkkkkkKKKKH...',  //  7
    '....HHBBBBBBBBBBBb.....',  //  8  head top
    '...HBBBBBBBBBBBBBBb....',  //  9
    '..HBBBEBBBBBBBEBBBBb...',  // 10  red glowing eyes
    '..HBBBBBBBBBBBBBBBBb...',  // 11
    '..HBBBBBBBBBBBBBBBBb...',  // 12
    '..HBBBBBBgGgBBBBBBBb...',  // 13  smoke from nostrils
    '..HBBBBBBGSGBBBBBBBb...',  // 14  smoke from nostrils
    'HHHHHBBBBBBBBBBBBbbbbb.',  // 15  shoulders ← anchorRow (+1 right)
    'HBBBBBBBBBBBBBBBBBBBBb.',  // 16  body (+1 right)
    'HBBBBBBBBBBBBBBBBBBBBb.',  // 17  (+1)
    'HBBBBBBBBBBBBBBBBBBBBb.',  // 18  (+1)
    'HBBBBBBBBBBBBBBBBBBBBb.',  // 19  (+1)
    '.HBBBBBBBBBBBBBBBBBBb..',  // 20  body narrows (+1)
    '..HBBBbb.....bbbBBBb...',  // 21  legs split (+1)
    '..HBBBbb.....bbbBBBb...',  // 22  (+1)
    '..HBBBbb.....bbbBBBb...',  // 23  (+1)
    '...bbbbb.......bbbbb...'   // 24  feet (re-centred)
];

const _BULL_FROZEN_SUBS = {
    B: 'F', b: 'f',
    H: 'N',
    K: 'N', k: 'f',
    G: 'F', g: 'f', S: 'N'
    // E (red eyes) stays — glow visible through frost
};

// === Spike — cute cactus with pink flower on top (redesign v2) ============
//
// 23 cols × 18 rows. Designed via the 9-step sprite protocol:
// reference analysis → resolution → silhouette → shading → details →
// colors → animation (none — static plant) → verification → implement.
//
// Color legend:
//   G = main cactus green          g = dark green shadow / right edge
//   H = bright green highlight     (upper-left light source)
//   Y = yellow dot (5 asymmetric)
//   P = pink flower outer petal    p = dark pink flower center
//   '.' = transparent
//
// Frozen variants (greens swap to ice; yellow + pink stay — read through tint):
//   F = ice-tinted green main      f = darker iced green
//   N = light frosted highlight
const _SPIKE_PALETTE = {
    G: '#5BC55C', g: '#2A8438', H: '#87E085',
    Y: '#F4D03F',
    P: '#E91E63', p: '#AD1457',
    F: '#7FCEDB', f: '#5C9DC0', N: '#B0DAE6'
};

const _SPIKE_GRID = [
    '.........PPPPP.........',  //  0  flower outer
    '........PPPpPPP........',  //  1  flower + dark pink center
    '..........GGg..........',  //  2  stem
    '.........HGGGg.........',  //  3  stem + H + g
    '.......GGGGGGGGg.......',  //  4  body 9
    '......GGGGGGGGGGg......',  //  5  body 11
    '.....HGGGGGGGGGGGg.....',  //  6  body 13 + H
    '....HGGGGGGGGGGGGGg....',  //  7  body 15 + H
    '...HHGGGGYGGGGGGGGGg...',  //  8  body 17 + HH + ⭐ dot 1 (col 9)
    '..HHGGGGGGGGGGGGGGGGg..',  //  9  body 19 (max) + HH
    '..HGGGGGGGGGGGGGGGGGg..',  // 10  body 19 + H
    '..GGGGGGGGGGGGYGGGGGg..',  // 11  body 19 + ⭐ dot 2 (col 14)
    '..GGGGGGGGGGGGGGGGGGg..',  // 12  body 19
    '..GGGGGGGGGGGGGGGGGGg..',  // 13  body 19
    '..GGGGGYGGGGGGGGGGGGg..',  // 14  body 19 ← anchorRow + ⭐ dot 3 (col 7)
    '..GGGGGGGGGGGGGGGGGGg..',  // 15  body 19
    '..GGGGGGGGGGGGGYGGGGg..',  // 16  body 19 + ⭐ dot 4 (col 15)
    '..GGGGGGGGGGGGGGGGGGg..',  // 17  body 19
    '..GGGGGGGGYGGGGGGGGGg..',  // 18  body 19 + ⭐ dot 5 (col 10)
    '...GGGGGGGGGGGGGGGGg...',  // 19  body 17
    '...GGGGGGGGGGGGGGGGg...',  // 20  body 17
    '....GGGGGGGGGGGGGGg....',  // 21  body 15
    '.....GGGGGGGGGGGGg.....',  // 22  body 13
    '......GGGGGGGGGGg......'   // 23  rounded base 11
];

const _SPIKE_FROZEN_SUBS = {
    G: 'F', g: 'f', H: 'N'
    // P, p, Y stay — pink and yellow read through the ice tint
};

// === Sprite registry — drives every custom-art surface ====================
//
// Each entry maps a CARDS type string to:
//   grid       : array of strings, one per row (every row same length = cols)
//   palette    : { char → hex color }
//   frozenSubs : { char → char } applied when the entity is frozen
//   cols       : grid width (could derive but cheaper as a number)
//   anchorRow  : which grid row sits at the unit's (cx, cy) centre
//   flickerRows: rows < this index shimmer ±1.5 px vertically (set to 0 for
//                static sprites)
//   teamGlow   : { x, y, rx, ry } — translucent ellipse under the sprite to
//                colour-code which side it belongs to. y is added to the
//                bottom edge of the sprite.
const _CUSTOM_SPRITES = {
    amber: {
        grid:        _AMBER_TORCH_GRID,
        palette:     _AMBER_TORCH_PALETTE,
        frozenSubs:  _AMBER_FROZEN_SUBS,
        cols:        16,
        anchorRow:   22.5,
        flickerRows: 15,
        teamGlow:    { x: 0, y: -2, rx: 10, ry: 3.5 }
    },
    bruce: {
        grid:        _BRUCE_GRID,
        palette:     _BRUCE_PALETTE,
        frozenSubs:  _BRUCE_FROZEN_SUBS,
        cols:        16,
        anchorRow:   6.5,
        flickerRows: 0,
        teamGlow:    { x: 0, y: 4, rx: 14, ry: 4 }
    },
    scrappy: {
        grid:        _SCRAPPY_GRID,
        palette:     _SCRAPPY_PALETTE,
        frozenSubs:  _SCRAPPY_FROZEN_SUBS,
        cols:        15,
        // Values copied verbatim from Gemini's pasted registry entry.
        anchorRow:   6,
        flickerRows: 0,
        teamGlow:    { x: 0, y: 2, rx: 8, ry: 3 }
    },
    max: {
        grid:        _MAX_GRID,
        palette:     _MAX_PALETTE,
        frozenSubs:  _MAX_FROZEN_SUBS,
        cols:        25,    // Gemini's v4 claim was 17 — actual rows ranged
                            // 16-25 chars. Padded all to 25 (the true max)
                            // so nothing gets clipped or holes from
                            // undefined-cell reads.
        anchorRow:   10,
        flickerRows: 6,     // top 6 rows shimmer (lightning glow)
        teamGlow:    null   // aura — AOE circle already shows team
    },
    penny: {
        grid:        _PENNY_GRID,
        palette:     _PENNY_PALETTE,
        frozenSubs:  _PENNY_FROZEN_SUBS,
        cols:        16,
        anchorRow:   10,
        flickerRows: 2,    // top 2 rows (sparks + flame) shimmer
        teamGlow:    { x: 0, y: 3, rx: 10, ry: 3 }
    },
    tara: {
        grid:        _TARA_GRID,
        palette:     _TARA_PALETTE,
        frozenSubs:  _TARA_FROZEN_SUBS,
        cols:        18,
        anchorRow:   10,   // pupil centre row (doubled from 5)
        flickerRows: 0,    // static eye, no shimmer
        teamGlow:    null  // aura — AOE circle already shows team
    },
    pam: {
        grid:        _PAM_GRID,
        palette:     _PAM_PALETTE,
        frozenSubs:  _PAM_FROZEN_SUBS,
        cols:        17,
        anchorRow:   8,    // visual centre of the heart
        flickerRows: 4,    // top 4 rows pulse (heart "beats" / shimmers)
        teamGlow:    null  // aura — AOE circle conveys team
    },
    bull: {
        grid:        _BULL_GRID,
        palette:     _BULL_PALETTE,
        frozenSubs:  _BULL_FROZEN_SUBS,
        cols:        23,
        anchorRow:   15,   // shoulders row — ties body to unit hitbox
        flickerRows: 3,    // top 3 rows of smoke wisps shimmer
        teamGlow:    { x: 0, y: 4, rx: 14, ry: 4 }
    },
    spike: {
        grid:        _SPIKE_GRID,
        palette:     _SPIKE_PALETTE,
        frozenSubs:  _SPIKE_FROZEN_SUBS,
        cols:        23,
        // Anchor at row 14 — body spans rows 4-23 (20 rows), midpoint
        // 13.5; using 14 puts the unit's nominal centre just below the
        // visual centre (matches the offset from the original 18-row
        // version where anchor 11 sat just below body-mid 10.5).
        // Flower + stem float above. Auras don't need a team glow —
        // the AOE circle already shows ownership.
        anchorRow:   14,
        flickerRows: 0,
        teamGlow:    null
    }
};
// Expose so aura.js / building.js can reuse the registry without
// duplicating the Aura sprites table.
window._CUSTOM_SPRITES = _CUSTOM_SPRITES;

// Cached PNG data URLs per type. Built on first request to a small
// offscreen canvas at PIX=4 so DOM <img> renders stay crisp when CSS
// scales them down to the icon slots.
const _customIconCache = {};
function _getCustomSpriteDataUrl(type) {
    if (_customIconCache[type] !== undefined) return _customIconCache[type];
    const def = _CUSTOM_SPRITES[type];
    if (!def) { _customIconCache[type] = null; return null; }
    try {
        const PIX = 4;
        const COLS = def.cols;
        const ROWS = def.grid.length;
        const off = document.createElement('canvas');
        off.width  = COLS * PIX;
        off.height = ROWS * PIX;
        const ictx = off.getContext('2d');
        for (let r = 0; r < ROWS; r++) {
            const line = def.grid[r];
            for (let c = 0; c < COLS; c++) {
                const ch = line && line[c];
                if (!ch || ch === '.' || ch === ' ') continue;
                const color = def.palette[ch];
                if (!color) continue;
                ictx.fillStyle = color;
                ictx.fillRect(c * PIX, r * PIX, PIX, PIX);
            }
        }
        _customIconCache[type] = off.toDataURL('image/png');
    } catch (e) { _customIconCache[type] = null; }
    return _customIconCache[type];
}
window._getCustomSpriteDataUrl = _getCustomSpriteDataUrl;
// Backwards-compat alias for the old amber-only helper.
window._getAmberIconDataUrl = function() { return _getCustomSpriteDataUrl('amber'); };

// HTML snippet to drop into any card-icon container. For cards in
// `_CUSTOM_SPRITES`, returns an <img> with the pre-rendered pixel art
// scaled by the optional inline `imgStyle`. Otherwise, the original emoji.
function getCardIconHTML(cardId, imgStyle) {
    if (_CUSTOM_SPRITES[cardId]) {
        const url = _getCustomSpriteDataUrl(cardId);
        if (url) {
            const style = imgStyle ||
                'width: 28px; height: auto; display: inline-block; image-rendering: pixelated; vertical-align: middle;';
            return '<img src="' + url + '" alt="' + cardId + '" style="' + style + '">';
        }
    }
    const c = CARDS[cardId];
    return c ? c.icon : '';
}
window.getCardIconHTML = getCardIconHTML;

// Render a registered sprite onto a canvas at (cx, cy). Returns true if it
// was rendered, false if the type isn't registered (so callers can fall
// through to the standard "circle + emoji" draw path).
function _drawCustomSprite(ctx, type, cx, cy, team, isFrozen, isInvisible) {
    const def = _CUSTOM_SPRITES[type];
    if (!def) return false;

    ctx.save();
    if (isInvisible) ctx.globalAlpha = 0.5;

    const now = performance.now();
    const flick = (def.flickerRows > 0)
        ? Math.floor(Math.sin(now / 130 + cx + cy) * 1.5)
        : 0;

    const PIX = 2;
    const cols = def.cols;
    const rows = def.grid.length;
    const anchorRow = def.anchorRow;

    // Team-color glow under the sprite (drawn FIRST so the sprite sits on top).
    if (def.teamGlow) {
        const ringColor = team === 'player'
            ? 'rgba(0, 168, 255, 0.55)'
            : 'rgba(232, 65, 24, 0.55)';
        const tg = def.teamGlow;
        const baseY = cy + (rows - anchorRow) * PIX + (tg.y || 0);
        ctx.beginPath();
        ctx.ellipse(cx + (tg.x || 0), baseY, tg.rx, tg.ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = ringColor;
        ctx.fill();
    }

    // Render the pixel grid.
    for (let r = 0; r < rows; r++) {
        const line = def.grid[r];
        for (let c = 0; c < cols; c++) {
            let ch = line[c];
            if (ch === '.' || ch === ' ') continue;
            if (isFrozen && def.frozenSubs && def.frozenSubs[ch]) ch = def.frozenSubs[ch];
            const color = def.palette[ch];
            if (!color) continue;
            const yOff = (r < def.flickerRows && !isFrozen) ? flick : 0;
            ctx.fillStyle = color;
            ctx.fillRect(
                Math.round(cx + (c - cols / 2) * PIX),
                Math.round(cy + (r - anchorRow) * PIX + yOff),
                PIX,
                PIX
            );
        }
    }
    ctx.restore();
    return true;
}
window._drawCustomSprite = _drawCustomSprite;
// Backwards-compat alias for the amber-only helper used by drawGhost.
window._drawAmberTorch = function(ctx, cx, cy, team, isFrozen, isInvisible) {
    return _drawCustomSprite(ctx, 'amber', cx, cy, team, isFrozen, isInvisible);
};

// Bare-name alias so existing call sites (drawGhost, Unit.prototype.draw)
// that still reference `_drawAmberTorch` keep working without code change.
function _drawAmberTorch(ctx, cx, cy, team, isFrozen, isInvisible) {
    return _drawCustomSprite(ctx, 'amber', cx, cy, team, isFrozen, isInvisible);
}

Unit.prototype.draw = function(ctx) {
    if (this.isInvisible && this.team !== 'player' && this.type !== 'bull') return;

    // Custom pixel-art sprite for any registered type (currently amber +
    // bruce). Replaces the standard "circle + emoji" rendering with a
    // bespoke design. HP bar still draws below for consistency. Returns
    // early so the legacy circle path doesn't run on top.
    if (typeof _CUSTOM_SPRITES !== 'undefined' && _CUSTOM_SPRITES[this.type]) {
        _drawCustomSprite(ctx, this.type, this.x, this.y, this.team, this.isFrozen, this.isInvisible);
        if (!this.isInvisible) this.drawHpBar(ctx);
        return;
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;

    if (this.isInvisible) ctx.globalAlpha = 0.5;
    if (this.isFrozen) {
        ctx.fillStyle = '#74b9ff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fff';
    }
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.team === 'player' ? '#00a8ff' : '#e84118';
    if (this.isFrozen) ctx.strokeStyle = '#fff';
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    ctx.font = '18px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.icon, this.x, this.y);
    ctx.restore();

    if (!this.isInvisible) this.drawHpBar(ctx);

    if (typeof isSelectingBullDash !== 'undefined' && isSelectingBullDash && this.team === 'player' && this.type === 'bull' && !this.hasDashed) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 15, 0, Math.PI * 2);
        ctx.strokeStyle = '#ff4757';
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 8]);
        ctx.stroke();
        ctx.restore();
    }
};
