// projectile.js - Projectile Class for Ranged Attacks

class Projectile extends Entity {
    constructor(x, y, target, damage, team, isSplash = false, sourceType = null) {
        super(x, y, 4, team);
        this.target = target;
        this.targetX = target.x;
        this.targetY = target.y;
        this.damage = damage;
        this.isSplash = isSplash;
        this.sourceType = sourceType;
        this.speed = 400;
        this.hasBounced = false;
        this.isDead = false;
    }

    update(dt, now) {
        if (this.isDead) return;

        // === Mo cascade bullet path =========================================
        // Mo's bullets fly in a FIXED direction at a fixed total range
        // (not a moving target). They die on either (a) any team-opposing
        // entity overlap mid-flight or (b) reaching their `_moMaxRange`
        // distance from the spawn point. hit() then spawns the next
        // cascade stage and bills the damage of THIS bullet.
        if (this._isMoBullet) {
            const stepX = Math.cos(this._moAngle) * this.speed * (dt / 1000);
            const stepY = Math.sin(this._moAngle) * this.speed * (dt / 1000);
            this.x += stepX;
            this.y += stepY;
            // 1) collision-along-path check
            try {
                const candidates = units.concat(buildings)
                    .concat([playerSafe, enemySafe].filter(s => s))
                    .filter(e => e && e.team !== this.team && !e.isDead && !e.isInvisible &&
                                 (typeof isAmberOrTrail !== 'function' || !isAmberOrTrail(e)));
                for (const e of candidates) {
                    if (Math.hypot((e.x || 0) - this.x, (e.y || 0) - this.y) <= ((e.radius || 15) + 4)) {
                        this._moHitTarget = e;
                        this.hit();
                        return;
                    }
                }
            } catch (err) { /* defensive — bullet still continues */ }
            // 2) range exhaustion check
            const traveled = Math.hypot(this.x - this._moStartX, this.y - this._moStartY);
            if (traveled >= this._moMaxRange) {
                this._moHitTarget = null;     // no on-impact victim — pure cascade
                this.hit();
                return;
            }
            return;
        }

        if (this.target && !this.target.isDead) {
            this.targetX = this.target.x;
            this.targetY = this.target.y;
        }

        let angle = Math.atan2(this.targetY - this.y, this.targetX - this.x);
        this.x += Math.cos(angle) * this.speed * (dt / 1000);
        this.y += Math.sin(angle) * this.speed * (dt / 1000);

        if (Math.hypot(this.targetX - this.x, this.targetY - this.y) < 10) {
            this.hit();
        }
    }

    hit() {
        if (this.isDead) return;

        // === Mo cascade hit handler =========================================
        // Bills the damage to the colliding entity (if any) and spawns the
        // next stage of bullets per the user spec:
        //   stage 1 (primary, dmg 500, r 80)  → 4 diagonals (dmg 100, r 50) + 1 straight (dmg 400, r 70)
        //   stage 2 (diagonal,           )    → no cascade
        //   stage 3 (straight,  dmg 400, r 70) → 4 diagonals (dmg 100, r 60)
        // Diagonal offsets are 45° / 135° / -45° / -135° from the bullet's
        // own travel angle, so the fan always opens around its current
        // direction rather than a fixed world axis.
        if (this._isMoBullet) {
            try {
                if (this._moHitTarget && !this._moHitTarget.isDead &&
                    typeof this._moHitTarget.takeDamage === 'function') {
                    this._moHitTarget.takeDamage(this.damage);
                }
                if (typeof spawnMoCascadeBullet === 'function') {
                    const DIAG = [Math.PI / 4, -Math.PI / 4, 3 * Math.PI / 4, -3 * Math.PI / 4];
                    if (this._moStage === 1) {
                        // 4 diagonals @ 100 dmg / 50 px
                        for (const da of DIAG) {
                            spawnMoCascadeBullet(this.x, this.y, this._moAngle + da, 100, 50, this.team, 2);
                        }
                        // 1 straight @ 400 dmg / 70 px (stage 3 — will itself fan out)
                        spawnMoCascadeBullet(this.x, this.y, this._moAngle, 400, 70, this.team, 3);
                    } else if (this._moStage === 3) {
                        for (const da of DIAG) {
                            spawnMoCascadeBullet(this.x, this.y, this._moAngle + da, 100, 60, this.team, 2);
                        }
                    }
                }
            } catch (err) { /* defensive — bullet still dies */ }
            this.isDead = true;
            return;
        }

        if (this.sourceType === 'penny' && this.team === 'player' && hasStarPower('penny', 'sp1')) {
            auras.push(new Aura(this.targetX, this.targetY, this.team, 'fire'));
        }

        if (this.sourceType === 'scrappy' && this.team === 'player' && hasStarPower('scrappy', 'sp1') && !this.hasBounced) {
            let enemies = units.concat(buildings).filter(e => e.team !== this.team && !e.isDead && e !== this.target && !isAmberOrTrail(e));
            let nextTarget = enemies.length > 0 ? enemies.sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y))[0] : null;
            if (nextTarget) {
                this.target = nextTarget;
                this.targetX = nextTarget.x;
                this.targetY = nextTarget.y;
                this.hasBounced = true;
                return; 
            }
        }

        if (this.isSplash) {
            let enemies = units.concat(buildings, auras).concat([playerSafe, enemySafe].filter(s => s)).filter(e => e && e.team !== this.team && !e.isDead && !isAmberOrTrail(e));
            enemies.forEach(e => {
                if (Math.hypot(e.x - this.targetX, e.y - this.targetY) <= 80) e.takeDamage(this.damage);
            });
            projectiles.push(new ExplosionEffect(this.targetX, this.targetY, 80));
        } else {
            if (this.target && !this.target.isDead) this.target.takeDamage(this.damage);
        }
        this.isDead = true;
    }

    draw(ctx) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.restore();
    }
}

// Spawns one bullet of Mo's cascade. Centralised because both the unit's
// initial volley (unit-logic.js) and the in-flight cascade (Projectile.hit
// above) call this with different stage / damage / range combos. The
// projectile is a standard Projectile subclass instance with a couple of
// `_mo*` tags that signal its travel rules to update() and hit().
function spawnMoCascadeBullet(x, y, angle, damage, maxRange, team, stage) {
    try {
        // Create a "throwaway" target far in front so the existing
        // Projectile.constructor's target.x / target.y reads don't NPE.
        // update() ignores this target entirely once _isMoBullet is set —
        // it uses _moAngle + _moStartX/Y / _moMaxRange to drive motion.
        const fakeTarget = { x: x + Math.cos(angle), y: y + Math.sin(angle), radius: 1 };
        const p = new Projectile(x, y, fakeTarget, damage, team, false, 'mo');
        p._isMoBullet  = true;
        p._moAngle     = angle;
        p._moStartX    = x;
        p._moStartY    = y;
        p._moMaxRange  = maxRange;
        p._moStage     = stage;     // 1 = primary, 2 = diagonal terminal, 3 = straight middle
        // Slightly faster than baseline (default 400) so the short-range
        // bullets visibly travel rather than appear-then-vanish.
        p.speed = 500;
        if (typeof projectiles !== 'undefined') projectiles.push(p);
    } catch (e) { /* swallow — one missing cascade bullet shouldn't crash the loop */ }
}
window.spawnMoCascadeBullet = spawnMoCascadeBullet;
