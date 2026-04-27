// aura.js - Aura Class for Area of Effect Abilities

class Aura extends Entity {
    constructor(x, y, team, type) {
        super(x, y, 110, team); 
        this.type = type;
        this.maxHp = type === 'emz' ? 800 : 1500; this.hp = this.maxHp;
        this.spawnTime = performance.now();
        this.lastTickTime = performance.now();

        if (type === 'pam') {
            this.radius = 82; 
            this.color = 'rgba(46, 204, 113, 0.3)';
            this.maxHp = 700; this.hp = this.maxHp;
        } else if (type === 'max') {
            this.radius = 82; 
            this.color = 'rgba(241, 196, 15, 0.3)';
            this.maxHp = 700; this.hp = this.maxHp;
        } else if (type === '8bit') {
            this.radius = 110; 
            if (team === 'player' && hasStarPower('8bit', 'sp1')) {
                this.radius *= 1.5;
            }
            this.color = 'rgba(232, 67, 147, 0.3)';
            this.maxHp = 1200; this.hp = this.maxHp;
        } else if (type === 'emz') {
            this.radius = 132; 
            this.color = 'rgba(156, 136, 255, 0.3)';
            this.maxHp = 1000; this.hp = this.maxHp;
        } else if (type === 'spike') {
            this.radius = 55; 
            this.color = 'rgba(46, 204, 113, 0.4)'; 
            this.maxHp = 1000; this.hp = this.maxHp;
        } else if (type === 'tara') {
            this.radius = 110; 
            this.color = 'rgba(45, 52, 54, 0.6)'; 
            this.maxHp = 1500; this.hp = this.maxHp;
        } else if (type === 'fire') {
            this.radius = 50;
            this.color = 'rgba(232, 65, 24, 0.4)';
            this.maxHp = 99999; this.hp = this.maxHp;
        } else if (type === 'fire-trail') {
            // Spawned by Amber as she walks. Smaller / shorter-lived than the
            // generic 'fire' aura and ticks 25 dmg/sec instead of 20. Treated
            // as invulnerable (huge maxHp) so enemies can't shoot it down —
            // the lifetime check in update() is what removes it.
            this.radius = 28;
            this.color = 'rgba(231, 76, 60, 0.45)';
            this.maxHp = 99999; this.hp = this.maxHp;
        } else if (type === 'trunk-trail') {
            // Spawned by Trunk as he random-walks. Doesn't damage anyone —
            // its only effect is the one-shot +20% damage buff applied in
            // unit-logic.js when a same-team unit steps on the tile (the
            // tile self-destructs the same frame). HP-bar hidden,
            // untargetable.
            //
            // Radius split (per user request — visual stays compact, but
            // the absorb-area grows so units don't have to stand exactly
            // on the speck to consume it):
            //   • this.radius        = 24 — COLLISION. unit-logic.js
            //                            uses this for the step-on check.
            //                            Doubled twice from the v13.6
            //                            baseline (6 → 12 → 24).
            //   • this._visualRadius =  6 — DRAW only. Pixel scatter is
            //                            still confined to 6 px so the
            //                            tile reads the same as before.
            this.radius        = 24;
            this._visualRadius = 6;
            this.color = 'rgba(165, 94, 234, 0.45)';
            this.maxHp = 99999; this.hp = this.maxHp;
            this.isHealthHidden = true;
            this.isInvulnerable = true;
        }

        // Level scaling removed — matches unit-core.js. Every aura uses its
        // base stats so both devices agree regardless of local upgrade levels.
    }

    update(dt, now) {
        if (this.isDead || this.isFrozen) return;

        // Rosa's shield decays at 25 HP/sec while the aura lives.
        if (typeof this._decayShield === 'function') this._decayShield(now);

        // Fire-trail lifetime rule (per user's spec):
        //   • While Amber is ALIVE → the tile never expires on its own.
        //   • The moment Amber dies → start a 5-second countdown; when it
        //     hits 0 the tile vanishes. Per-Amber: each Amber's trails
        //     extinguish 5s after THAT Amber's own death (the back-ref
        //     comes from unit-logic.js when each tile spawns).
        if (this.type === 'fire-trail' && this._owner && this._owner.isDead) {
            if (!this._ownerDiedAt) this._ownerDiedAt = now;
            if (now - this._ownerDiedAt > 5000) {
                this.isDead = true;
                return;
            }
        }
        // Trunk-trail per user request ("שהכוח שלו לא יעלם עד שלא דורכים
        // עליו" — the power doesn't disappear until someone steps on it):
        // the tile is permanent. Trunk's own 15-s timer killing him does NOT
        // remove his trails — they wait on the field forever for a friendly
        // unit to walk over them. The only way a tile vanishes is via the
        // step-on consumption in unit-logic.js.

        if (now - this.lastTickTime > 1000) {
            let enemies = units.concat(buildings, auras).filter(e => e.team !== this.team && !e.isFrozen);
            if (this.type === 'pam') {
                let allies = units.concat(buildings, auras).concat([playerSafe, enemySafe].filter(s => s)).filter(e => e && e.team === this.team && !e.isFrozen);
                allies.forEach(a => {
                    if (a !== this && Math.hypot(this.x - a.x, this.y - a.y) <= this.radius) {
                        a.hp = Math.min(a.maxHp, a.hp + 15);
                    }
                });
            } else if (this.type === 'emz' && this.team === 'player' && hasStarPower('emz', 'sp2')) {
                let count = enemies.filter(e => Math.hypot(e.x - this.x, e.y - this.y) <= this.radius).length;
                this.hp = Math.min(this.maxHp, this.hp + count * 30);
            } else if (this.type === 'fire') {
                enemies.forEach(e => {
                    if (Math.hypot(e.x - this.x, e.y - this.y) <= this.radius) e.takeDamage(20);
                });
            } else if (this.type === 'fire-trail') {
                enemies.forEach(e => {
                    if (Math.hypot(e.x - this.x, e.y - this.y) <= this.radius) e.takeDamage(25);
                });
            }
            this.lastTickTime = now;
        }

        let lifetime = 999999;
        if (this.type === 'spike') lifetime = (this.team === 'player' && hasStarPower('spike', 'sp2')) ? 15000 : 10000;
        if (this.type === 'tara') lifetime = 3000;
        if (this.type === 'fire') lifetime = 3000;
        // 'fire-trail' deliberately omitted — it never expires.

        if (now - this.spawnTime > lifetime) {
            this.isDead = true;
        }
    }

    draw(ctx) {
        // Fire trail — render as a flickering flame blob (no border, no HP
        // bar, no icon). Each tick we randomise the radius slightly and
        // cross-fade between two warm-orange tones so the trail visibly
        // shimmers instead of looking like static circles. Returns early
        // before the standard aura draw block so none of that runs.
        if (this.type === 'fire-trail') {
            // Both PLAYERS see every fire trail (own and opponent's). The
            // earlier "hide from enemy team" rule was reverted at user
            // request — they wanted the visual feedback on both screens.
            // The "enemy doesn't see Amber" semantic now lives entirely
            // in target-selection (see `isAmberOrTrail` in globals.js):
            // in-game CHARACTERS skip Amber and her trail when picking
            // who to attack, but the trail still RENDERS for the human
            // looking at the screen.
            const now = performance.now();
            // Two regimes:
            //   • owner alive → steady 0.55 alpha (no fade — the tile is
            //     persistent until 5s after Amber dies).
            //   • owner dead  → fade across the 5s grace window so the
            //     batch dims together and winks out at deathTime + 5s.
            let alpha = 0.55;
            if (this._owner && this._owner.isDead && this._ownerDiedAt) {
                const f = Math.min(1, (now - this._ownerDiedAt) / 5000);
                alpha = 0.55 * (1 - f);
            }
            const flicker = 0.8 + 0.2 * Math.sin(now / 90 + (this.x + this.y));
            const r = this.radius * flicker;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter'; // additive blend → glow
            // Outer warm halo
            ctx.beginPath();
            ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(231, 76, 60, ${alpha.toFixed(3)})`;
            ctx.fill();
            // Inner bright core
            ctx.beginPath();
            ctx.arc(this.x, this.y, r * 0.55, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(241, 196, 15, ${(alpha * 0.9).toFixed(3)})`;
            ctx.fill();
            ctx.restore();
            return;
        }

        // Trunk trail — scattered purple pixels (per user spec: "סגול,
        // עשוי מפיקסלים מפוזרים"). Each pixel breathes between a regular
        // deep violet and a glowing bright lilac (per user request:
        // "שהפיקסלים יאבבו בסגול זוהר לסגול רגיל"). Every pixel has its
        // own phase offset so the cluster shimmers organically — never
        // all-bright or all-dim at the same instant.
        // Pixel offsets and phases are derived from the trail's own (x, y)
        // via a tiny deterministic hash so BOTH P2P clients see the exact
        // same scatter pattern + the same per-pixel pulse timing at
        // every tile. Persists until consumed — no fade.
        if (this.type === 'trunk-trail') {
            const now = performance.now();
            // Tiny seeded scatter — same input → same output on both sides.
            const seedBase = Math.floor(this.x * 7) ^ Math.floor(this.y * 13);
            const _hash = (i) => {
                let t = (seedBase + i * 0x9E3779B9) | 0;
                t = Math.imul(t ^ t >>> 15, 1 | t);
                t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
                return ((t ^ t >>> 14) >>> 0) / 4294967296;
            };
            // Two anchor colours we interpolate between, per pixel:
            //   regular  = deep violet (#a55eea — same as Trunk's body)
            //   glowing  = bright lilac (#e0b3ff)
            const regR = 165, regG = 94,  regB = 234;
            const gloR = 224, gloG = 179, gloB = 255;
            // Use the cosmetic _visualRadius (not this.radius — that's
            // the larger collision area now). Keeps the cluster looking
            // identical to the v13.6 version even though the absorb-area
            // is 2× bigger.
            const visR = this._visualRadius || this.radius;
            ctx.save();
            for (let i = 0; i < 7; i++) {
                const ang  = _hash(i * 3)     * Math.PI * 2;
                const dist = _hash(i * 3 + 1) * visR;            // scatter inside visR
                const px = Math.round(this.x + Math.cos(ang) * dist);
                const py = Math.round(this.y + Math.sin(ang) * dist);
                // Per-pixel phase offset (0..2π) keeps each pixel out of
                // sync with its neighbours so the cluster shimmers
                // organically instead of strobing.
                const phase = _hash(i * 3 + 2) * Math.PI * 2;
                // Sin wave 0..1 over an ~880 ms cycle — long enough to
                // read as a "breathe" rather than a flicker.
                const t = 0.5 + 0.5 * Math.sin(now / 140 + phase);
                const r = Math.round(regR + (gloR - regR) * t);
                const g = Math.round(regG + (gloG - regG) * t);
                const b = Math.round(regB + (gloB - regB) * t);
                // Alpha also rides the wave so the bright phase actually
                // looks brighter (not just shifted in hue).
                const alpha = (0.65 + 0.35 * t).toFixed(3);
                // Glow only activates near the peak of the wave — saves
                // GPU on the dim half-cycle and keeps the "off" pixels
                // reading as flat colour.
                if (t > 0.55) {
                    ctx.shadowColor = `rgba(${gloR}, ${gloG}, ${gloB}, ${alpha})`;
                    ctx.shadowBlur = 4 + 4 * (t - 0.55) / 0.45; // 4..8 px halo
                } else {
                    ctx.shadowBlur = 0;
                }
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                // Bright-phase pixels render as 2 px so the glow has
                // something to bloom from; dim-phase ones stay 1 px.
                const sz = (t > 0.5) ? 2 : 1;
                ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
            }
            ctx.restore();
            return;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.isFrozen ? 'rgba(116, 185, 255, 0.2)' : this.color;
        ctx.fill();
        ctx.strokeStyle = this.isFrozen ? '#fff' : (this.team === 'player' ? '#fff' : '#ff4757');
        ctx.lineWidth = this.isFrozen ? 4 : 2;
        ctx.stroke();

        if (this.type !== 'fire' && CARDS[this.type]) {
            // If this aura type has a custom pixel-art sprite registered
            // (e.g. spike → cactus), draw THAT at the centre instead of
            // the emoji icon. The translucent area-of-effect circle above
            // still renders so the player sees the slow / heal / pull zone.
            const reg = (typeof window !== 'undefined') ? window._CUSTOM_SPRITES : null;
            if (reg && reg[this.type] && typeof window._drawCustomSprite === 'function') {
                window._drawCustomSprite(ctx, this.type, this.x, this.y, this.team, this.isFrozen, false);
            } else {
                ctx.font = '32px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                const pulse = (Math.sin(performance.now() / 200) + 1) / 2;
                const glowSize = 10 + pulse * 20;

                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur = glowSize;

                ctx.fillText(CARDS[this.type].icon, this.x, this.y);

                if (pulse > 0.5) {
                    ctx.shadowBlur = glowSize * 1.5;
                    ctx.fillText(CARDS[this.type].icon, this.x, this.y);
                }

                ctx.shadowBlur = 0;
            }
        }

        if (typeof this.drawShieldBubble === 'function') this.drawShieldBubble(ctx);
        this.drawHpBar(ctx, -20);
        ctx.restore();
    }
}
