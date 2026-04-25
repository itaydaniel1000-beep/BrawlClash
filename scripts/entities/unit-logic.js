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

// Procedural torch sprite for Amber. Replaces the standard "circle + icon"
// unit draw with a brown wooden handle topped with a 3-layer animated
// flame. No white background — just the torch on transparent canvas. The
// team is conveyed by a small colored glow at the base of the handle so
// the player can still tell which side a torch belongs to.
function _drawAmberTorch(ctx, cx, cy, team, isFrozen, isInvisible) {
    const now = performance.now();
    ctx.save();
    if (isInvisible) ctx.globalAlpha = 0.5;

    // Team-color base glow — replaces the unit circle's role of "this is
    // mine vs theirs" without putting a colored ring around the whole sprite.
    const ringColor = team === 'player'
        ? 'rgba(0, 168, 255, 0.55)'
        : 'rgba(232, 65, 24, 0.55)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 18, 9, 3.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = ringColor;
    ctx.fill();

    // === Handle (brown trapezoid, wider at top) ===
    const handleTopY    = cy - 4;
    const handleBottomY = cy + 18;
    const topHalfW      = 6;
    const botHalfW      = 3;

    // Body of the handle.
    ctx.beginPath();
    ctx.moveTo(cx - topHalfW, handleTopY);
    ctx.lineTo(cx + topHalfW, handleTopY);
    ctx.lineTo(cx + botHalfW, handleBottomY);
    ctx.lineTo(cx - botHalfW, handleBottomY);
    ctx.closePath();
    ctx.fillStyle = isFrozen ? '#4a6577' : '#5a3a2a';
    ctx.fill();

    // Lighter highlight stripe on the left side for a 3D feel.
    ctx.beginPath();
    ctx.moveTo(cx - topHalfW, handleTopY);
    ctx.lineTo(cx - topHalfW + 2, handleTopY);
    ctx.lineTo(cx - botHalfW + 1, handleBottomY);
    ctx.lineTo(cx - botHalfW, handleBottomY);
    ctx.closePath();
    ctx.fillStyle = isFrozen ? '#5e7a8c' : '#7a5040';
    ctx.fill();

    // Darker collar where the flame emerges.
    ctx.fillStyle = isFrozen ? '#384e5e' : '#3d2418';
    ctx.fillRect(cx - 7, handleTopY - 2, 14, 3.5);

    if (isFrozen) {
        // When frozen, swap the flame for a frosty cap so the visual still
        // reads "the torch is out / paused".
        ctx.beginPath();
        ctx.arc(cx, handleTopY - 6, 7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(116, 185, 255, 0.9)';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    } else {
        // === Flame: 3 layers (outer red → mid orange → inner yellow) ===
        const flicker = Math.sin(now / 110 + cx + cy) * 0.18;
        const flameBaseY = handleTopY - 1;
        const flameTipY  = handleTopY - 24 + flicker * 5;

        // Outer red flame — wider, with a pointy top and curvy sides.
        ctx.beginPath();
        ctx.moveTo(cx - 10, flameBaseY);
        ctx.bezierCurveTo(cx - 13, flameBaseY - 8, cx - 7, flameBaseY - 17, cx - 3, flameTipY + 7);
        ctx.bezierCurveTo(cx - 1, flameTipY,    cx + 1, flameTipY,    cx + 3, flameTipY + 7);
        ctx.bezierCurveTo(cx + 7, flameBaseY - 17, cx + 13, flameBaseY - 8, cx + 10, flameBaseY);
        ctx.closePath();
        ctx.fillStyle = '#e74c3c';
        ctx.fill();

        // Side wisps — two small curling tongues, asymmetric like the ref.
        ctx.beginPath();
        ctx.moveTo(cx - 9, flameBaseY - 4);
        ctx.bezierCurveTo(cx - 17, flameBaseY - 14, cx - 14, flameBaseY - 21, cx - 9, flameBaseY - 16);
        ctx.bezierCurveTo(cx - 8, flameBaseY - 12, cx - 8, flameBaseY - 8, cx - 9, flameBaseY - 4);
        ctx.closePath();
        ctx.fillStyle = '#e74c3c';
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 8, flameBaseY - 6);
        ctx.bezierCurveTo(cx + 18, flameBaseY - 13, cx + 16, flameBaseY - 22, cx + 11, flameBaseY - 18);
        ctx.bezierCurveTo(cx + 9, flameBaseY - 14, cx + 8, flameBaseY - 10, cx + 8, flameBaseY - 6);
        ctx.closePath();
        ctx.fillStyle = '#e74c3c';
        ctx.fill();

        // Mid orange flame — sits in front of the red one.
        ctx.beginPath();
        ctx.moveTo(cx - 7, flameBaseY);
        ctx.bezierCurveTo(cx - 9, flameBaseY - 7, cx - 4, flameBaseY - 13, cx - 2, flameTipY + 11);
        ctx.bezierCurveTo(cx - 1, flameTipY + 5, cx + 1, flameTipY + 5, cx + 2, flameTipY + 11);
        ctx.bezierCurveTo(cx + 4, flameBaseY - 13, cx + 9, flameBaseY - 7, cx + 7, flameBaseY);
        ctx.closePath();
        ctx.fillStyle = '#f39c12';
        ctx.fill();

        // Inner yellow core — small bright vertical ellipse.
        ctx.beginPath();
        ctx.ellipse(cx, flameBaseY - 9 + flicker * 2, 2.5, 6, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#f1c40f';
        ctx.fill();
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
