// unit.js - Unit Class for Brawlers and Minions

class Unit extends Entity {
    constructor(x, y, radius, team, type) {
        super(x, y, radius, team);
        this.type = type;
        this.speed = 60; 
        this.attackRange = 55; 
        this.attackDamage = 50;
        this.attackSpeed = 1000;
        this.lastAttackTime = 0;
        this.target = null;
        this.color = CARDS[type] ? CARDS[type].color : '#fff';
        this.isInvisible = false;
        this.icon = CARDS[type] ? CARDS[type].icon : '🐧';
        this.hasDashed = false;

        if (type === 'bruce') {
            this.maxHp = 1200; this.hp = 1200; this.attackDamage = 150; this.speed = 50; this.color = '#8c7ae6';
        } else if (type === 'bull') {
            this.maxHp = 1150; this.hp = 1150; this.attackDamage = 280; this.speed = 50; this.color = '#341f97';
        } else if (type === 'leon') {
            this.maxHp = 900; this.hp = 900; this.attackDamage = 200; this.speed = 50 * 1.3; this.color = '#00cec9';
            this.isInvisible = true; 
            this.hasAmbush = (team === 'player' && playerStarPowers['leon'] === 'sp1');
        } else if (type === 'porter') {
            this.maxHp = 100; this.hp = 100; this.attackDamage = 50; this.speed = 70; this.color = '#54a0ff';
            if (team === 'player' && playerStarPowers['mr-p'] === 'sp2') {
                this.shieldHp = 500; 
            }
        }

        if (team === 'player') {
            const scale = getLevelScale(type);
            this.maxHp *= scale;
            this.hp = this.maxHp;
            this.attackDamage *= scale;
        }
    }

    update(dt, now) {
        if (this.isDead || this.isFrozen) return;

        let speedMult = 1;
        let atkSpeedMult = 1;
        let damageMult = 1;

        let dmgBoost = (playerStarPowers['8bit'] === 'sp2' && this.team === 'player') ? 0.3 : 0.1;

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
                        if (this.team === 'player' && playerStarPowers['max'] === 'sp2') {
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
                    } else if (a.type === 'emz' && a.team === 'player' && playerStarPowers['emz'] === 'sp1') {
                        damageMult *= 1.2; 
                    }
                }
            }
        });

        if (this.type === 'leon' && this.team === 'player' && playerStarPowers['leon'] === 'sp2' && this.isInvisible) {
            speedMult *= 1.25;
        }

        if (this.type === 'bull' || this.type === 'porter') {
            let enemies = units.concat(buildings, auras).concat([playerSafe, enemySafe].filter(s => s)).filter(e => e && e.team !== this.team && !e.isInvisible && !e.isDead && !e.isFrozen);
            this.target = enemies.length > 0 ? enemies.sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y))[0] : null;
        } else {
            this.target = this.team === 'player' ? enemySafe : playerSafe;
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

                    if (this.type === 'bruce' && this.team === 'player' && playerStarPowers['bruce'] === 'sp2') {
                        this.target.isFrozen = true;
                        setTimeout(() => { if (this.target) this.target.isFrozen = false; }, 1000);
                    }

                    projectiles.push(new MeleeEffect(this.x + (this.target.x - this.x) * 0.5, this.y + (this.target.y - this.y) * 0.5));
                }
            } else {
                let angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
                let dashMult = (now < (this.dashEndTime || 0)) ? 5 : 1; 

                if (this.type === 'bull' && this.team === 'player' && playerStarPowers['bull'] === 'sp2' && dashMult > 1) {
                    this.shieldHp = 500;
                }

                if (this.type === 'bull') {
                    this.isInvisible = (dashMult > 1);
                }

                this.x += Math.cos(angle) * this.speed * speedMult * dashMult * (dt / 1000);
                this.y += Math.sin(angle) * this.speed * speedMult * dashMult * (dt / 1000);

                if (dashMult > 1 && Math.random() > 0.5) {
                    projectiles.push(new MeleeEffect(this.x, this.y));
                }
            }
        }
    }

    takeDamage(amount) {
        if (this.isInvisible || this.isFrozen) return; 
        super.takeDamage(amount);
    }

    triggerDash(now) {
        if (this.type === 'bull' && !this.hasDashed) {
            this.dashEndTime = now + 1600; 
            this.hasDashed = true;
        }
    }

    draw(ctx) {
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

        if (isSelectingBullDash && this.team === 'player' && this.type === 'bull' && !this.hasDashed) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 15, 0, Math.PI * 2);
            ctx.strokeStyle = '#ff4757';
            ctx.lineWidth = 4;
            ctx.setLineDash([8, 8]);
            ctx.stroke();
            ctx.restore();
        }
    }
}
