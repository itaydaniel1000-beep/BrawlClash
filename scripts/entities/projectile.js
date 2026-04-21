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

        if (this.sourceType === 'penny' && this.team === 'player' && playerStarPowers['penny'] === 'sp1') {
            auras.push(new Aura(this.targetX, this.targetY, this.team, 'fire'));
        }

        if (this.sourceType === 'scrappy' && this.team === 'player' && playerStarPowers['scrappy'] === 'sp1' && !this.hasBounced) {
            let enemies = units.concat(buildings).filter(e => e.team !== this.team && !e.isDead && e !== this.target);
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
            let enemies = units.concat(buildings, auras).concat([playerSafe, enemySafe].filter(s => s)).filter(e => e && e.team !== this.team && !e.isDead);
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
