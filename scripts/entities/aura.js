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
        }

        // Level scaling removed — matches unit-core.js. Every aura uses its
        // base stats so both devices agree regardless of local upgrade levels.
    }

    update(dt, now) {
        if (this.isDead || this.isFrozen) return;

        // Fire-trail tiles die the moment their owner (Amber) dies — the
        // user reported the trail outliving her by ~5s, which felt wrong.
        // The back-reference is set in unit-logic.js when each tile spawns.
        if (this.type === 'fire-trail' && this._owner && this._owner.isDead) {
            this.isDead = true;
            return;
        }

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
        if (this.type === 'fire-trail') lifetime = 2500;

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
            const now = performance.now();
            const age = now - this.spawnTime;
            const lifeFrac = Math.min(1, age / 2500);
            const alpha = 0.55 * (1 - lifeFrac); // fade out over its lifetime
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

        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.isFrozen ? 'rgba(116, 185, 255, 0.2)' : this.color;
        ctx.fill();
        ctx.strokeStyle = this.isFrozen ? '#fff' : (this.team === 'player' ? '#fff' : '#ff4757');
        ctx.lineWidth = this.isFrozen ? 4 : 2;
        ctx.stroke();

        if (this.type !== 'fire' && CARDS[this.type]) {
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

        this.drawHpBar(ctx, -20);
        ctx.restore();
    }
}
