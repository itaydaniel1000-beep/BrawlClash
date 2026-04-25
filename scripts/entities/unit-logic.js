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

    if (this.type === 'bull' || this.type === 'porter') {
        let enemies = units.concat(buildings, auras).concat([playerSafe, enemySafe].filter(s => s)).filter(e => e && e.team !== this.team && !e.isInvisible && !e.isDead && !e.isFrozen);
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
        // Path-mode: chase the next waypoint. When close enough advance the
        // pointer; once exhausted she dies (her job was to lay the trail
        // along the chosen path, then she's spent).
        if (this.waypoints && this.waypoints.length > 0 && this._currentWp < this.waypoints.length) {
            const wp = this.waypoints[this._currentWp];
            // Lightweight target shim — needs `.x/.y/.isDead/.radius/.takeDamage`
            // so the move-toward-target code below treats it like an entity
            // without us having to special-case the math.
            this.target = { x: wp.x, y: wp.y, isDead: false, radius: 0, takeDamage: () => {} };
            const dist = Math.hypot(wp.x - this.x, wp.y - this.y);
            if (dist <= 20) {
                this._currentWp++;
                if (this._currentWp >= this.waypoints.length) {
                    // Last waypoint reached — Amber's role is complete.
                    this.isDead = true;
                    return;
                }
            }
        } else {
            // No waypoints — chase nearest enemy (any non-frozen, non-invisible
            // enemy entity, including the safe). She walks indefinitely;
            // the only ways for her to disappear are: finishing a chosen
            // path (handled above) or the admin 🗑️ delete power.
            const enemies = units.concat(buildings, auras)
                .concat([playerSafe, enemySafe].filter(s => s))
                .filter(e => e && e.team !== this.team && !e.isInvisible && !e.isDead && !e.isFrozen);
            this.target = enemies.length > 0
                ? enemies.sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y))[0]
                : null;
        }
        // (No lifetime cap — Amber lives until she completes her chosen
        //  path, gets admin-deleted, or the match ends.)
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

Unit.prototype.draw = function(ctx) {
    if (this.isInvisible && this.team !== 'player' && this.type !== 'bull') return; 

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
