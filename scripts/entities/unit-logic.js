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
    R: '#E74C3C', r: '#C0392B',
    O: '#F39C12', Y: '#F1C40F',
    D: '#5C2E1F', d: '#3E1E12',
    L: '#8B4F39',
    C: '#4A2418', c: '#2D1408',
    B: '#5E7A8C', b: '#3D5466',
    F: '#9DD3FF', f: '#74B9FF'
};

// 14 columns × 24 rows. Rows 0–11 = flame, 12–13 = collar, 14–23 = handle.
const _AMBER_TORCH_GRID = [
    '......RR......',
    '.....RRRR.....',
    '....RRrrRR....',
    '...RRrYYrRR..R',
    '..RRRYOOYRRR.R',
    '.RRRYOOOOYRRRR',
    'RRRRYOOOOOYRR.',
    'RRRRYOOOOOYR..',
    '.RRRYOOOOOYR..',
    '..RRYYOOOYYR..',
    '..RRRYYYYRR...',
    '...RRRRRRR....',
    '....CCCCCC....',
    '...cCCCCCCc...',
    '...LDDDDDDD...',
    '...LDDDDDDd...',
    '...LDDDDDDd...',
    '....LDDDDDd...',
    '....LDDDDDd...',
    '....LDDDDDd...',
    '....LDDDDDd...',
    '.....LDDDDd...',
    '.....LDDDDd...',
    '.....LDDDDd...'
];

const _AMBER_FROZEN_SUBS = {
    R:'F', r:'f', O:'F', Y:'F',
    D:'B', d:'b', L:'b',
    C:'b', c:'b'
};

// Cached PNG data URL of the same pixel-art torch, baked at first request
// to a small offscreen canvas. Used by every DOM-based card UI (deck card,
// brawler list, upgrade modal, guide entry, star-power card) so the icon
// matches what the player sees on the field instead of falling back to
// the 🔥 emoji.
let _amberIconDataUrlCache = null;
function _getAmberIconDataUrl() {
    if (_amberIconDataUrlCache) return _amberIconDataUrlCache;
    try {
        const PIX = 4; // bigger render → crisp when CSS scales it down
        const COLS = 14;
        const ROWS = _AMBER_TORCH_GRID.length;
        const off = document.createElement('canvas');
        off.width  = COLS * PIX;
        off.height = ROWS * PIX;
        const ictx = off.getContext('2d');
        for (let r = 0; r < ROWS; r++) {
            const line = _AMBER_TORCH_GRID[r];
            for (let c = 0; c < COLS; c++) {
                const ch = line[c];
                if (ch === '.' || ch === ' ') continue;
                const color = _AMBER_TORCH_PALETTE[ch];
                if (!color) continue;
                ictx.fillStyle = color;
                ictx.fillRect(c * PIX, r * PIX, PIX, PIX);
            }
        }
        _amberIconDataUrlCache = off.toDataURL('image/png');
    } catch (e) { _amberIconDataUrlCache = null; }
    return _amberIconDataUrlCache;
}
window._getAmberIconDataUrl = _getAmberIconDataUrl;

// HTML snippet to drop into a card-icon container. For amber: an <img> of
// the pre-rendered torch sprite scaled to fit the slot. For everything
// else: the original emoji unchanged. `imgStyle` lets the caller tune the
// size — defaults match the existing emoji size for inline use.
function getCardIconHTML(cardId, imgStyle) {
    if (cardId === 'amber') {
        const url = _getAmberIconDataUrl();
        if (url) {
            const style = imgStyle ||
                'width: 28px; height: auto; display: inline-block; image-rendering: pixelated; vertical-align: middle;';
            return '<img src="' + url + '" alt="amber" style="' + style + '">';
        }
    }
    const c = CARDS[cardId];
    return c ? c.icon : '';
}
window.getCardIconHTML = getCardIconHTML;

function _drawAmberTorch(ctx, cx, cy, team, isFrozen, isInvisible) {
    ctx.save();
    if (isInvisible) ctx.globalAlpha = 0.5;

    // Per-tile flicker so multiple torches don't pulse in lockstep. Flame
    // rows (0–11) shimmer ±1.5 px vertically; handle stays put.
    const now = performance.now();
    const flick = Math.floor(Math.sin(now / 130 + cx + cy) * 1.5);

    const PIX = 2;          // each grid cell = 2 canvas pixels
    const cols = 14;
    const rows = _AMBER_TORCH_GRID.length;
    // Centre the handle on (cx, cy). Handle area = rows 12–23, midpoint 17.5.
    const anchorRow = 17.5;

    // Team-color base glow under the torch (drawn FIRST so torch sits on top).
    const ringColor = team === 'player'
        ? 'rgba(0, 168, 255, 0.55)'
        : 'rgba(232, 65, 24, 0.55)';
    const baseY = cy + (rows - anchorRow) * PIX - PIX;
    ctx.beginPath();
    ctx.ellipse(cx, baseY, 10, 3.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = ringColor;
    ctx.fill();

    // Render the pixel grid.
    for (let r = 0; r < rows; r++) {
        const line = _AMBER_TORCH_GRID[r];
        for (let c = 0; c < cols; c++) {
            let ch = line[c];
            if (ch === '.' || ch === ' ') continue;
            if (isFrozen && _AMBER_FROZEN_SUBS[ch]) ch = _AMBER_FROZEN_SUBS[ch];
            const color = _AMBER_TORCH_PALETTE[ch];
            if (!color) continue;
            // Flame rows shimmer; handle / collar stay still.
            const yOff = (r < 12 && !isFrozen) ? flick : 0;
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
}

Unit.prototype.draw = function(ctx) {
    if (this.isInvisible && this.team !== 'player' && this.type !== 'bull') return;

    // Amber gets a custom torch sprite (no circle, no emoji, no white bg).
    // Keep the per-team identification via a small colored base glow inside
    // _drawAmberTorch. HP bar is still drawn below for consistency, even
    // though Amber is invulnerable — the bar stays at 700/700 her whole run.
    if (this.type === 'amber') {
        _drawAmberTorch(ctx, this.x, this.y, this.team, this.isFrozen, this.isInvisible);
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
