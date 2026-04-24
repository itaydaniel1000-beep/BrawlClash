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
            if (team === 'player' && playerStarPowers['8bit'] === 'sp1') {
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
        }

        if (team === 'player' && type !== 'fire') {
            // Mirror the Unit-class rule: skip level scaling in P2P so both
            // devices show the same HP for the same aura type, regardless
            // of each player's locally-stored upgrade level.
            const inP2PForScale = (
                (typeof currentBattleRoom !== 'undefined' && !!currentBattleRoom) ||
                (typeof window !== 'undefined' && !!window.currentBattleRoom)
            );
            const scale = inP2PForScale ? 1 : getLevelScale(type);
            this.maxHp *= scale;
            this.hp = this.maxHp;
        }
    }

    update(dt, now) {
        if (this.isDead || this.isFrozen) return;

        if (now - this.lastTickTime > 1000) {
            let enemies = units.concat(buildings, auras).filter(e => e.team !== this.team && !e.isFrozen);
            if (this.type === 'pam') {
                let allies = units.concat(buildings, auras).concat([playerSafe, enemySafe].filter(s => s)).filter(e => e && e.team === this.team && !e.isFrozen);
                allies.forEach(a => {
                    if (a !== this && Math.hypot(this.x - a.x, this.y - a.y) <= this.radius) {
                        a.hp = Math.min(a.maxHp, a.hp + 15);
                    }
                });
            } else if (this.type === 'emz' && this.team === 'player' && playerStarPowers['emz'] === 'sp2') {
                let count = enemies.filter(e => Math.hypot(e.x - this.x, e.y - this.y) <= this.radius).length;
                this.hp = Math.min(this.maxHp, this.hp + count * 30);
            } else if (this.type === 'fire') {
                enemies.forEach(e => {
                    if (Math.hypot(e.x - this.x, e.y - this.y) <= this.radius) e.takeDamage(20);
                });
            }
            this.lastTickTime = now;
        }

        let lifetime = 999999;
        if (this.type === 'spike') lifetime = (this.team === 'player' && playerStarPowers['spike'] === 'sp2') ? 15000 : 10000;
        if (this.type === 'tara') lifetime = 3000;
        if (this.type === 'fire') lifetime = 3000;

        if (now - this.spawnTime > lifetime) {
            this.isDead = true;
        }
    }

    draw(ctx) {
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
