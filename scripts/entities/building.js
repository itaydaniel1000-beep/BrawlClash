// building.js - Building Class for Turrets and Spawners

class Building extends Entity {
    constructor(x, y, team, type) {
        super(x, y, 75, team);
        this.type = type;
        this.spawnTime = performance.now();
        this.lastTickTime = performance.now();
        this.attackRange = 0; 
        this.attackSpeed = 1000;
        this.lastAttackTime = 0;
        this.lastSpawnTime = performance.now();
        this.lastHealTime = performance.now(); 
        this.icon = CARDS[type].icon;

        if (type === 'scrappy') {
            this.maxHp = 800; this.hp = 800; this.color = '#e1b12c'; this.attackDamage = 60; this.attackSpeed = 500;
            this.attackRange = 150; 
        } else if (type === 'penny') {
            this.maxHp = 600; this.hp = 600; this.color = '#c23616'; this.attackDamage = 200; this.attackSpeed = 2500;
            this.attackRange = 299; 
        } else if (type === 'mr-p') {
            this.maxHp = 1000; this.hp = 1000; this.color = '#54a0ff'; this.attackRange = 0;
        } else if (type === 'bonnie') {
            // Long-range sniper. Range 450 (≈ half the canvas), damage 250,
            // 5-second cooldown — exactly half Penny's fire rate so the
            // user-spec "פי 2 איטי יותר" lands precisely. Higher HP than
            // Penny (700 vs 600) since she's slower and a more inviting
            // target for the opponent's chasers.
            this.maxHp = 700; this.hp = 700;
            this.color = '#a29bfe';
            this.attackDamage = 250;
            this.attackSpeed = 5000;
            this.attackRange = 450;
        } else if (type === 'cake') {
            // 🎂 Birthday cake — limited-time event tower (May 21 → 27).
            // Stationary candle-launcher: every 2 seconds picks the
            // nearest enemy within 200 px and fires a flaming-candle
            // projectile dealing 100 damage. Only 1 cake per team can
            // be on the field at a time (cap enforced in battle-spawn.js).
            this.maxHp = 1500; this.hp = 1500;
            this.color = '#ff6b9d';
            this.attackDamage = 100;
            this.attackSpeed = 2000;      // ms between shots
            this.attackRange = 200;
            this.lastAttackTime = 0;
        } else if (type === 'lumi') {
            // 🌟 Lumi — admin-only "danger-zone" tower. Three concentric
            // damage rings + a 2-second mass-freeze on placement.
            //   • r1 (innermost, 70 px):  500 HP/sec to anyone inside
            //   • r2 (middle, 140 px = 2× r1): 1000 HP/sec to anyone in
            //     the r1→r2 ring
            //   • r3 (outer, 280 px = 4× r1): 1000 HP/sec to anyone in
            //     the r2→r3 ring
            //   Damage does NOT stack — each enemy takes only the rate
            //   of whichever band they're standing in (user spec).
            // On placement, every enemy unit / building / aura on the
            // map is frozen for 2 seconds — a one-time "world stop" so
            // the damage zones get an uninterrupted opening burst.
            this.maxHp = 2000; this.hp = 2000;
            this.color = '#8e44ad';
            this.attackRange = 0;       // no separate projectile attack
            // Ring radii. ×2 nesting per the original spec.
            //   r1 = 22  → matches Lumi's sprite radius
            //   r2 = 44  = 2 × r1
            //   r3 = 88  = 4 × r1 (also 2 × r2)
            this.lumiR1 = 22;
            this.lumiR2 = 44;
            this.lumiR3 = 88;
            // Per-ring Y offsets — each ring stacks ABOVE the one below
            // it as a vertical tower. X stays at Lumi.x for every ring
            // so the column is straight upward (no horizontal spread).
            //   Inner ring  bottom edge sits on Lumi's top edge
            //     → centre dy = -(r1 + spriteRadius) = -(22 + 22) = -44
            //   Middle ring bottom edge sits on inner ring's top edge
            //     → inner top = lumiR1Dy - r1 = -44 - 22 = -66
            //     → middle centre dy = -66 - r2 = -110
            //   Outer ring  bottom edge sits on middle ring's top edge
            //     → middle top = lumiR2Dy - r2 = -110 - 44 = -154
            //     → outer centre dy = -154 - r3 = -242
            // Total tower extends from y-22 (Lumi top) to y-330 (outer top).
            this.lumiR1Dy = -(this.lumiR1 + 22);                            //  -44
            this.lumiR2Dy = this.lumiR1Dy - this.lumiR1 - this.lumiR2;      // -110
            this.lumiR3Dy = this.lumiR2Dy - this.lumiR2 - this.lumiR3;      // -242
            // Self-destruct timer — Lumi only lives for 1 second after
            // placement. The damage zones do their burst, then Lumi
            // disappears. The placement freeze (2 s) continues independently
            // via its own setTimeout above, so the world-stop outlives Lumi.
            this._lumiSpawnTime = performance.now();
            this._lumiLifetimeMs = 1000;
            this.lumiDmgInner = 500;
            this.lumiDmgMid   = 1000;
            this.lumiDmgOuter = 1000;
            // Placement-time mass freeze. Deferred via Promise.resolve()
            // so the constructor finishes before we mutate the global
            // entity lists (otherwise the freeze loop could see THIS
            // building mid-init and trip a different code path).
            const oppTeam = team === 'player' ? 'enemy' : 'player';
            const _self = this;
            Promise.resolve().then(() => {
                try {
                    const targets = (typeof units !== 'undefined' ? units : [])
                        .concat(typeof buildings !== 'undefined' ? buildings : [])
                        .concat(typeof auras !== 'undefined' ? auras : []);
                    const frozen = [];
                    targets.forEach(e => {
                        if (e && e !== _self && e.team === oppTeam && !e.isDead && !e.isFrozen) {
                            e.isFrozen = true;
                            frozen.push(e);
                        }
                    });
                    // Visual sparkle at Lumi's spot to mark the world-stop.
                    if (typeof particles !== 'undefined') {
                        const colors = ['#8e44ad', '#9b59b6', '#bb8fce', '#fff', '#f1c40f'];
                        for (let i = 0; i < 24; i++) {
                            try { particles.push(new Particle(_self.x, _self.y, colors[i % colors.length])); } catch (_) {}
                        }
                    }
                    setTimeout(() => {
                        frozen.forEach(e => { if (e && !e.isDead) e.isFrozen = false; });
                    }, 2000);
                } catch (_) {}
            });
        }

        // Level scaling removed — matches unit-core.js. Every building uses
        // its base stats (Scrappy always 800, Penny always 600, Mr-P always
        // 1000) so both devices agree regardless of local upgrade levels.
    }

    update(dt, now) {
        if (this.isDead || this.isFrozen) return;

        // Rosa's shield decays at 25 HP/sec while the building lives.
        if (typeof this._decayShield === 'function') this._decayShield(now);

        let atkSpeedMult = 1;
        let damageMult = 1;
        auras.forEach(a => {
            if (!a.isFrozen && a.team === this.team && Math.hypot(this.x - a.x, this.y - a.y) <= a.radius) {
                if (a.type === 'max') atkSpeedMult = 0.5; 
                if (a.type === '8bit') damageMult = 1.1; 
            }
        });

        if (this.type === 'scrappy' && this.team === 'player' && hasStarPower('scrappy', 'sp2')) {
            if (now - this.lastHealTime > 1000) {
                this.hp = Math.min(this.maxHp, this.hp + 50);
                this.lastHealTime = now;
            }
        }

        // 🌟 Lumi — per-frame damage tick to every enemy inside any of
        // the 3 concentric rings. Damage rate depends on WHICH band the
        // enemy is in (no stacking — user spec). Multiplies by dt/1000
        // so the per-second numbers (500 / 1000 / 1000) come out right
        // regardless of frame rate. Safe is also damaged (it's a target).
        if (this.type === 'lumi') {
            // Self-destruct after _lumiLifetimeMs (1 s) — Lumi is a burst
            // weapon, not a persistent tower. Mark dead and exit before
            // running the damage tick so the dying frame doesn't deal one
            // last hit.
            if (this._lumiSpawnTime && (now - this._lumiSpawnTime) >= (this._lumiLifetimeMs || 1000)) {
                this.hp = 0;
                this.isDead = true;
                return;
            }
            // Each ring now has its own centre (see constructor — they
            // stack vertically rather than being concentric). Damage uses
            // INNER → MIDDLE → OUTER priority so an enemy that happens to
            // overlap with multiple rings still pays only the rate of the
            // innermost band that contains them (matches the user's "no
            // stacking, smallest wins" rule).
            const cxAll = this.x;   // x is the same for all rings
            const cy1 = this.y + (this.lumiR1Dy || 0);
            const cy2 = this.y + (this.lumiR2Dy || 0);
            const cy3 = this.y + (this.lumiR3Dy || 0);
            const enemies = units.concat(buildings, auras)
                .concat([playerSafe, enemySafe].filter(s => s))
                .filter(e => e && e.team !== this.team && !e.isDead && !e.isInvisible && !e.isFrozen &&
                             (typeof isAmberOrTrail !== 'function' || !isAmberOrTrail(e)));
            const dtSec = (dt || 0) / 1000;
            enemies.forEach(e => {
                const ex = e.x || 0, ey = e.y || 0;
                let dmgRate = 0;
                if      (Math.hypot(ex - cxAll, ey - cy1) <= this.lumiR1) dmgRate = this.lumiDmgInner;
                else if (Math.hypot(ex - cxAll, ey - cy2) <= this.lumiR2) dmgRate = this.lumiDmgMid;
                else if (Math.hypot(ex - cxAll, ey - cy3) <= this.lumiR3) dmgRate = this.lumiDmgOuter;
                else return;
                if (dmgRate > 0 && typeof e.takeDamage === 'function') {
                    e.takeDamage(dmgRate * dtSec * damageMult);
                }
            });
        }

        // 🎂 Cake — every 2 s, fire a flaming-candle projectile at the
        // closest enemy in range. Picks units / buildings / auras / safe,
        // same target selection as Penny / Scrappy. Damage 100, range 200.
        if (this.type === 'cake') {
            if (now - this.lastAttackTime > (this.attackSpeed * atkSpeedMult)) {
                const candidates = units.concat(buildings, auras)
                    .concat([playerSafe, enemySafe].filter(s => s))
                    .filter(e => e && e.team !== this.team && !e.isDead && !e.isInvisible && !e.isFrozen &&
                                 (typeof isAmberOrTrail !== 'function' || !isAmberOrTrail(e)) &&
                                 Math.hypot((e.x || 0) - this.x, (e.y || 0) - this.y) <= this.attackRange);
                if (candidates.length > 0) {
                    candidates.sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y));
                    const target = candidates[0];
                    const dmg = this.attackDamage * damageMult;
                    projectiles.push(new Projectile(this.x, this.y, target, dmg, this.team, false));
                    this.lastAttackTime = now;
                }
            }
        }

        if (this.type === 'mr-p') {
            let spawnInterval = 5000; 
            if (this.team === 'player' && hasStarPower('mr-p', 'sp1')) {
                spawnInterval = 3000; 
            }

            if (now - this.lastSpawnTime > spawnInterval) {
                let porter = new Unit(this.x, this.y, 10, this.team, 'porter');
                if (this.isFrozen) porter.isFrozen = true;
                units.push(porter);
                this.lastSpawnTime = now;
                return; 
            }
        }

        if (now - this.lastAttackTime > this.attackSpeed * atkSpeedMult && this.attackRange > 0) {
            let enemies = units.concat(buildings, auras).concat([playerSafe, enemySafe].filter(s => s)).filter(e => e && e.team !== this.team && !e.isInvisible && !e.isFrozen && !isAmberOrTrail(e));
            let inRange = enemies.filter(e => Math.hypot(e.x - this.x, e.y - this.y) <= this.attackRange);
            if (inRange.length > 0) {
                inRange.sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y));
                let target = inRange[0];

                let isSplash = false; 
                projectiles.push(new Projectile(this.x, this.y, target, this.attackDamage * damageMult, this.team, isSplash, this.type));
                this.lastAttackTime = now;
            }
        }
    }

    draw(ctx) {
        // Frozen ENEMY buildings are hidden from us — they're held back on
        // the opponent's side and only become visible when the opponent
        // releases their freeze.
        if (this.isFrozen && this.team === 'enemy') return;

        // 🌟 Lumi — render the 3 concentric danger zones BEFORE the
        // building chrome so the rings sit under the sprite. Each ring
        // is a translucent fill + a brighter rim. Rings are STATIC —
        // no pulse animation — so the player sees exactly where each
        // damage band starts and ends. Colour gets hotter (purple →
        // magenta → red-orange) as you go further out to match the
        // damage gradient.
        if (this.type === 'lumi') {
            // Per-ring centres — matches the damage check in update() so
            // visuals and hitboxes stay locked. X is the same for all
            // rings; Y is offset per ring (see constructor).
            const cxAll = this.x;
            const drawRing = (cy, radius, fill, rim) => {
                ctx.save();
                ctx.beginPath();
                ctx.arc(cxAll, cy, radius, 0, Math.PI * 2);
                ctx.fillStyle   = fill;
                ctx.fill();
                ctx.lineWidth   = 3;
                ctx.strokeStyle = rim;
                ctx.stroke();
                ctx.restore();
            };
            // Paint OUTER first so the smaller rings sit on top — gives
            // them the visual priority that matches their damage priority
            // in the update() check.
            drawRing(this.y + (this.lumiR3Dy || 0), this.lumiR3, 'rgba(231,76,60,0.12)',  'rgba(231,76,60,0.55)');   // red-orange
            drawRing(this.y + (this.lumiR2Dy || 0), this.lumiR2, 'rgba(155,89,182,0.16)', 'rgba(155,89,182,0.65)');  // magenta
            drawRing(this.y + (this.lumiR1Dy || 0), this.lumiR1, 'rgba(142,68,173,0.30)', 'rgba(142,68,173,0.85)');  // deep purple
        }
        // Custom pixel-art sprite (e.g. scrappy's dog face). Replaces the
        // standard "circle + emoji" rendering when the building's type is
        // registered in _CUSTOM_SPRITES. HP bar still draws below for
        // consistency. Returns early so the legacy circle path doesn't
        // run on top.
        if (typeof _CUSTOM_SPRITES !== 'undefined' && _CUSTOM_SPRITES[this.type] &&
            typeof _drawCustomSprite === 'function') {
            _drawCustomSprite(ctx, this.type, this.x, this.y, this.team, this.isFrozen, false);
            if (typeof this.drawShieldBubble === 'function') this.drawShieldBubble(ctx);
            this.drawHpBar(ctx, -49);
            return;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, 22, 0, Math.PI * 2);
        ctx.fillStyle = this.isFrozen ? '#74b9ff' : (this.team === 'player' ? '#00a8ff' : '#e84118');
        if (this.isFrozen) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#fff';
        }
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.icon, this.x, this.y);
        ctx.restore();

        if (typeof this.drawShieldBubble === 'function') this.drawShieldBubble(ctx);
        this.drawHpBar(ctx, -49);
    }
}
