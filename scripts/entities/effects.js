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
