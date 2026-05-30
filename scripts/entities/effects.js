// effects.js - Visual Effects and Feedback Elements

class ExplosionEffect {
    constructor(x, y, radius) {
        this.x = x; this.y = y; this.radius = radius; this.age = 0; this.isDead = false;
    }
    update(dt) { this.age += dt; if (this.age > 300) this.isDead = true; }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = 1 - (this.age / 300);
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffa502'; ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
    }
}

class MeleeEffect {
    constructor(x, y) {
        this.x = x; this.y = y; this.age = 0; this.isDead = false;
    }
    update(dt) { this.age += dt; if (this.age > 150) this.isDead = true; }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = 1 - (this.age / 150);
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x - 5, this.y - 5, 10, 10);
        ctx.restore();
        ctx.globalAlpha = 1;
    }
}

class FloatingText {
    constructor(x, y, text, color) {
        this.x = x; this.y = y; this.text = text; this.color = color;
        this.age = 0; this.isDead = false;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = -Math.random() * 2 - 1;
    }
    update(dt) {
        this.x += this.vx; this.y += this.vy;
        this.age += dt; if (this.age > 800) this.isDead = true;
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = 1 - (this.age / 800);
        ctx.fillStyle = this.color; ctx.font = 'bold 16px Assistant'; ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// Frank's pyramid-cone hammer strike leaves jagged dark cracks on the
// ground. Tip at Frank, base opening forward toward his swing direction.
// Lingers 2 s then vanishes. Pure visual — no damage logic here (that
// already resolved at the swing moment in unit-logic.js).
class CrackEffect {
    constructor(x, y, angle, length, halfAngle) {
        this.x         = x;
        this.y         = y;
        this.angle     = angle;
        this.length    = length;
        this.halfAngle = halfAngle || (Math.PI / 5);
        this.age       = 0;
        this.isDead    = false;
        // Pre-roll the jagged crack lines so they don't flicker per frame.
        // 5 cracks spread across the cone, each a 5-segment zigzag.
        this.cracks = [];
        const N_CRACKS = 5;
        for (let i = 0; i < N_CRACKS; i++) {
            // Crack radial direction within the cone (-halfAngle..+halfAngle)
            const t = (N_CRACKS === 1) ? 0 : (i / (N_CRACKS - 1)) * 2 - 1;
            const radial = t * this.halfAngle * 0.85;
            const cos = Math.cos(radial), sin = Math.sin(radial);
            const segs = [];
            const segCount = 5;
            for (let s = 1; s <= segCount; s++) {
                const r = (s / segCount) * this.length;
                // Local (axis-aligned, then rotated by `angle` in draw)
                const lx = r * cos + (Math.random() - 0.5) * 8;
                const ly = r * sin + (Math.random() - 0.5) * 8;
                segs.push({ x: lx, y: ly });
            }
            this.cracks.push(segs);
        }
    }
    update(dt) {
        this.age += dt;
        if (this.age > 2000) this.isDead = true;
    }
    draw(ctx) {
        const t = this.age / 2000;
        const alpha = Math.max(0, 1 - t);
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        // Translucent earth-tone cone fill so the player can read the
        // AoE footprint even after the swing finishes.
        const tip   = 0;
        const baseR = this.length;
        ctx.fillStyle = `rgba(101, 67, 33, ${(alpha * 0.28).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(tip, 0);
        ctx.lineTo(baseR * Math.cos(this.halfAngle),  baseR * Math.sin(this.halfAngle));
        ctx.lineTo(baseR * Math.cos(this.halfAngle), -baseR * Math.sin(this.halfAngle));
        ctx.closePath();
        ctx.fill();
        // Cracks — dark zigzag lines radiating from Frank's feet outward.
        ctx.strokeStyle = `rgba(28, 18, 10, ${alpha.toFixed(3)})`;
        ctx.lineWidth = 2.5;
        ctx.lineCap   = 'round';
        for (const segs of this.cracks) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            for (const p of segs) ctx.lineTo(p.x, p.y);
            ctx.stroke();
        }
        ctx.restore();
    }
}
window.CrackEffect = CrackEffect;

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        this.vx = (Math.random() - 0.5) * 5;
        this.vy = (Math.random() - 0.5) * 5;
        this.size = Math.random() * 5 + 2;
        this.age = 0; this.isDead = false;
    }
    update(dt) {
        this.x += this.vx; this.y += this.vy;
        this.age += dt; if (this.age > 500) this.isDead = true;
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = 1 - (this.age / 500);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        ctx.restore();
    }
}
