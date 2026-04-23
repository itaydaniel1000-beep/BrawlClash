// entity-base.js - Base Class for Game Objects

class Entity {
    constructor(x, y, radius, team) {
        this.x = x; this.y = y; this.radius = radius; this.team = team;
        this.hp = 100;
        this.maxHp = 100;
        this.isDead = false;
        this.isFrozen = false;
        this.lastDamageTime = 0;
        this.shieldHp = 0;
        this.spawnTime = performance.now();
        this.deathLogged = false;
    }

    takeDamage(amount) {
        if (this.isDead) return;
        if (this.team === 'player' && adminHacks.godMode) return;
        // When the opponent is the admin, their entities (enemy on our screen)
        // inherit godMode — exchanged at battle start via ADMIN_CONFIG.
        if (this.team === 'enemy' && typeof opponentAdminHacks !== 'undefined' && opponentAdminHacks.godMode) return;

        let finalAmount = amount;
        if (this.team === 'enemy' && adminHacks.doubleDamage) finalAmount *= 2;

        if (this.type === 'bruce' && this.team === 'player' && playerStarPowers['bruce'] === 'sp1') {
            finalAmount *= 0.7; 
        }

        if (this.type === 'bull' && this.team === 'player' && playerStarPowers['bull'] === 'sp1') {
            if (this.hp > this.maxHp * 0.7) finalAmount *= 0.7; 
        }

        if (this.shieldHp > 0) {
            if (finalAmount <= this.shieldHp) {
                this.shieldHp -= finalAmount;
                finalAmount = 0;
            } else {
                finalAmount -= this.shieldHp;
                this.shieldHp = 0;
            }
        }

        this.hp -= finalAmount;
        this.lastDamageTime = performance.now();
        
        floatingTexts.push(new FloatingText(this.x, this.y, `-${Math.round(finalAmount)}`, '#ff7675'));
        
        // Screen shake on heavy hits was intentionally disabled per user request —
        // the shake felt disorienting during fast exchanges. Re-enable by restoring
        // the `screenShakeTime = 10; screenShakeIntensity = 5;` block here.

        if (this.hp <= 0) {
            this.hp = 0;
            this.isDead = true;
            AudioController.play('death');

            for(let i=0; i<10; i++) particles.push(new Particle(this.x, this.y, this.color || '#fff'));

            if (this.type === 'penny' && this.team === 'player' && playerStarPowers['penny'] === 'sp2') {
                for (let i = 0; i < 4; i++) {
                    let fakeTarget = { x: this.x + (Math.random() - 0.5) * 200, y: this.y + (Math.random() - 0.5) * 200, radius: 20 };
                    projectiles.push(new Projectile(this.x, this.y, fakeTarget, 200, this.team, false));
                }
            }
        }
    }
    drawHpBar(ctx, yOffset = 2) {
        ctx.save();
        const hpPercent = Math.max(0, this.hp / this.maxHp);
        const barWidth = 40;
        const barHeight = 6;

        if (this.shieldHp > 0) {
            ctx.fillStyle = '#7ed6df'; 
            ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - yOffset - barHeight - 2, barWidth * (this.shieldHp / 500), barHeight / 2);
        }

        ctx.fillStyle = '#000';
        ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - yOffset, barWidth, barHeight);
        ctx.fillStyle = this.team === 'player' ? '#74b9ff' : '#ff7675';
        ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - yOffset, barWidth * hpPercent, barHeight);
        ctx.restore();
    }
}

class Safe extends Entity {
    constructor(x, y, team) {
        super(x, y, CONFIG.SAFE_RADIUS, team);
        this.maxHp = CONFIG.SAFE_MAX_HP;
        this.hp = CONFIG.SAFE_MAX_HP;
        this.lastAttackTime = 0;
    }
    update(dt, now) {
        if (this.isDead || this.isFrozen) return; 

        let atkSpeedMult = 1;
        let damageMult = 1;
        auras.forEach(a => {
            if (!a.isFrozen && a.team === this.team && Math.hypot(this.x - a.x, this.y - a.y) <= a.radius) {
                if (a.type === 'max') atkSpeedMult = 0.5;
                if (a.type === '8bit') damageMult = 1.1; 
            }
        });

        if (difficulty === 'hard' && this.team === 'enemy') {
            damageMult *= 0.8; 
        }

        if (now - this.lastAttackTime > CONFIG.SAFE_ATTACK_SPEED * atkSpeedMult) {
            let target = this.findTargetInHalf();
            // Admin: safeShoots — the player's safe also targets enemies on the
            // enemy half (not just ones that crossed into its own half).
            if (!target && this.team === 'player' && adminHacks.safeShoots) {
                const foes = units.concat(buildings, auras).filter(u => u.team === 'enemy' && !u.isInvisible && !u.isFrozen && !u.isDead);
                if (foes.length) {
                    foes.sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y));
                    target = foes[0];
                }
            }
            if (target) {
                projectiles.push(new Projectile(this.x, this.y, target, CONFIG.SAFE_DAMAGE * damageMult, this.team, false));
                this.lastAttackTime = now;
            }
        }

        // Admin: safeHeals — every second heal player allies within 200 px.
        if (this.team === 'player' && adminHacks.safeHeals) {
            if (!this._lastHealTick) this._lastHealTick = 0;
            if (now - this._lastHealTick > 1000) {
                this._lastHealTick = now;
                units.concat(buildings, auras).filter(e => e.team === 'player' && !e.isDead && Math.hypot(e.x - this.x, e.y - this.y) <= 200).forEach(e => {
                    if (e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + 50);
                });
            }
        }

        // Admin: safeRegen — passive self-healing at N HP/second.
        if (this.team === 'player' && adminHacks.safeRegen > 0 && this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + adminHacks.safeRegen * dt / 1000);
        }
    }
    findTargetInHalf() {
        let enemies = units.concat(buildings, auras).filter(u => u.team !== this.team && !u.isInvisible && !u.isFrozen);
        let validEnemies = enemies.filter(e => {
            let inHalf = this.team === 'player' ? e.y > CONFIG.CANVAS_HEIGHT / 2 : e.y < CONFIG.CANVAS_HEIGHT / 2;
            return inHalf && Math.hypot(e.x - this.x, e.y - this.y) <= CONFIG.SAFE_RANGE;
        });
        if (validEnemies.length > 0) {
            validEnemies.sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y));
            return validEnemies[0];
        }
        return null;
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        const safeColor = this.isFrozen ? '#74b9ff' : (this.team === 'player' ? '#0984e3' : '#d63031');

        ctx.fillStyle = safeColor;
        ctx.fillRect(-this.radius - 6, -this.radius - 6, (this.radius + 6) * 2, (this.radius + 6) * 2);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeRect(-this.radius - 6, -this.radius - 6, (this.radius + 6) * 2, (this.radius + 6) * 2);

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = safeColor;
        ctx.fill();

        ctx.fillStyle = '#ffeaa7';
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        const hpPercent = Math.max(0, this.hp / this.maxHp);
        ctx.fillStyle = '#000'; ctx.fillRect(this.x - 40, this.y - 60, 80, 10);
        ctx.fillStyle = this.team === 'player' ? '#74b9ff' : '#ff7675';
        ctx.fillRect(this.x - 40, this.y - 60, 80 * hpPercent, 10);
        ctx.fillStyle = 'white'; ctx.font = '12px Arial'; ctx.textAlign = 'center';
        ctx.fillText(`${Math.floor(this.hp)}`, this.x, this.y - 50);
    }
}
