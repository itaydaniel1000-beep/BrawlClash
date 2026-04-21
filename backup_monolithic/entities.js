// entities.js - Game Object Classes

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
        
        if (this instanceof Safe && finalAmount > 50) {
            screenShakeTime = 10; 
            screenShakeIntensity = 5;
        }

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
            if (target) {
                projectiles.push(new Projectile(this.x, this.y, target, CONFIG.SAFE_DAMAGE * damageMult, this.team, false));
                this.lastAttackTime = now;
            }
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

        let atkSpeedMult = 1;
        let damageMult = 1;
        auras.forEach(a => {
            if (!a.isFrozen && a.team === this.team && Math.hypot(this.x - a.x, this.y - a.y) <= a.radius) {
                if (a.type === 'max') atkSpeedMult = 0.5; 
                if (a.type === '8bit') damageMult = 1.1; 
            }
        });

        if (this.type === 'scrappy' && this.team === 'player' && playerStarPowers['scrappy'] === 'sp2') {
            if (now - this.lastHealTime > 1000) {
                this.hp = Math.min(this.maxHp, this.hp + 50);
                this.lastHealTime = now;
            }
        }

        if (this.type === 'mr-p') {
            let spawnInterval = 5000; 
            if (this.team === 'player' && playerStarPowers['mr-p'] === 'sp1') {
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
            let enemies = units.concat(buildings, auras).concat([playerSafe, enemySafe].filter(s => s)).filter(e => e && e.team !== this.team && !e.isInvisible && !e.isFrozen);
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

        this.drawHpBar(ctx, -49);
    }
}

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
            const scale = getLevelScale(type);
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
