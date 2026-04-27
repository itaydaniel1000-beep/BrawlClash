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

    // Rosa-style "shield bubble" — translucent cyan halo wrapped around
    // the entity whenever shieldHp > 0. Subtle outer glow + softer inner
    // fill so it reads as a transparent bubble. Pulses very gently with
    // time. Called from each subclass's draw() AFTER the entity sprite
    // has been drawn so the bubble sits on top.
    drawShieldBubble(ctx) {
        if (!this.shieldHp || this.shieldHp <= 0) return;
        const now = performance.now();
        const r = (this.radius || 18) + 6;
        const pulse = 0.85 + 0.15 * Math.sin(now / 240 + (this.x + this.y) / 50);
        ctx.save();
        // Outer translucent fill
        ctx.beginPath();
        ctx.arc(this.x, this.y, r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(126, 214, 223, 0.18)';
        ctx.fill();
        // Bright cyan rim
        ctx.lineWidth = 2;
        ctx.strokeStyle = `rgba(126, 214, 223, ${(0.55 * pulse).toFixed(3)})`;
        ctx.stroke();
        // Tiny highlight arc top-left to sell "glass bubble" feel
        ctx.beginPath();
        ctx.arc(this.x, this.y, r * pulse, Math.PI * 1.1, Math.PI * 1.45);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = `rgba(255, 255, 255, ${(0.55 * pulse).toFixed(3)})`;
        ctx.stroke();
        ctx.restore();
    }

    // Time-based shield decay (used by Rosa's 500-HP/25-per-sec shield).
    // Anyone with `_shieldDecayInterval` set will see their shieldHp tick
    // down by `_shieldDecayAmount` every interval ms. Mr-P SP2's shield
    // doesn't set the interval, so it never drains. Called once per frame
    // from each subclass's update() (Unit/Building/Aura) so frozen
    // entities pause their shield decay along with everything else.
    _decayShield(now) {
        if (this.shieldHp <= 0 || !this._shieldDecayInterval) return;
        if (!this._shieldDecayLast) this._shieldDecayLast = now;
        while (now - this._shieldDecayLast >= this._shieldDecayInterval) {
            this.shieldHp = Math.max(0, this.shieldHp - (this._shieldDecayAmount || 25));
            this._shieldDecayLast += this._shieldDecayInterval;
            if (this.shieldHp <= 0) {
                // Shield fully drained — clear the decay state so the
                // entity goes back to "no shield" cleanly. (The HP-bar's
                // shield strip + the bubble visual hide automatically
                // when shieldHp is 0.)
                this._shieldDecayInterval = 0;
                this._shieldDecayAmount   = 0;
                this._shieldDecayLast     = 0;
                break;
            }
        }
    }

    takeDamage(amount) {
        if (this.isDead) return;
        // Trunk is immortal by design — damage just bounces off. Same code
        // path the godMode admin hack uses, no need to touch hp/lastDamageTime.
        if (this.isInvulnerable) return;
        if (this.team === 'player' && adminHacks.godMode) return;
        // When the opponent is the admin, their entities (enemy on our screen)
        // inherit godMode — exchanged at battle start via ADMIN_CONFIG.
        if (this.team === 'enemy' && typeof opponentAdminHacks !== 'undefined' && opponentAdminHacks.godMode) return;

        let finalAmount = amount;
        // `doubleDamage` applies twice in the admin's side of a P2P match:
        // once at spawn (via SYNC_SPAWN buffs → attackDamage *= 2) and once
        // here at takeDamage time. The opponent only sees the spawn-time
        // doubling, so the admin's HP drops 2× faster than the opponent's
        // copy. In P2P we rely purely on the spawn buff (units/buildings/auras)
        // and on the pre-baked `dmg` inside SAFE_FIRE (safe projectiles), so
        // skip the takeDamage doubling here to avoid the double-apply.
        const inP2PForDmg = (typeof currentBattleRoom !== 'undefined' && !!currentBattleRoom);
        if (this.team === 'enemy' && adminHacks.doubleDamage && !inP2PForDmg) finalAmount *= 2;

        if (this.type === 'bruce' && this.team === 'player' && hasStarPower('bruce', 'sp1')) {
            finalAmount *= 0.7; 
        }

        if (this.type === 'bull' && this.team === 'player' && hasStarPower('bull', 'sp1')) {
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

            if (this.type === 'penny' && this.team === 'player' && hasStarPower('penny', 'sp2')) {
                for (let i = 0; i < 4; i++) {
                    let fakeTarget = { x: this.x + (Math.random() - 0.5) * 200, y: this.y + (Math.random() - 0.5) * 200, radius: 20 };
                    projectiles.push(new Projectile(this.x, this.y, fakeTarget, 200, this.team, false));
                }
            }
        }
    }
    drawHpBar(ctx, yOffset = 2) {
        // Trunk + any other entity flagged as "health hidden" never shows
        // a bar (per design — the player isn't supposed to see HP). Trunk
        // is also immortal anyway, so the bar would always read full.
        if (this.isHealthHidden) return;
        ctx.save();
        const hpPercent = Math.max(0, this.hp / this.maxHp);
        // A little taller than before so the numeric label fits INSIDE the
        // coloured bar without getting squashed.
        const barWidth = 50;
        const barHeight = 13;
        const barY = this.y - this.radius - yOffset - barHeight;

        if (this.shieldHp > 0) {
            ctx.fillStyle = '#7ed6df';
            ctx.fillRect(this.x - barWidth / 2, barY - (barHeight / 2) - 2, barWidth * (this.shieldHp / 500), barHeight / 2);
        }

        ctx.fillStyle = '#000';
        ctx.fillRect(this.x - barWidth / 2, barY, barWidth, barHeight);
        ctx.fillStyle = this.team === 'player' ? '#74b9ff' : '#ff7675';
        ctx.fillRect(this.x - barWidth / 2, barY, barWidth * hpPercent, barHeight);

        // Numeric HP readout rendered ON TOP of the bar, centred both axes.
        const label = Math.max(0, Math.round(this.hp)) + '/' + Math.round(this.maxHp);
        ctx.font = 'bold 10px "Assistant", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.strokeText(label, this.x, barY + barHeight / 2);
        ctx.fillStyle = '#fff';
        ctx.fillText(label, this.x, barY + barHeight / 2);
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

        // In P2P, the ENEMY safe is really the opponent's own safe viewed from
        // our side. Each client used to independently run safe-targeting for
        // BOTH safes, and because unit positions drift slightly between sims
        // the two copies would pick different victims ("on his screen the safe
        // shoots unit A, on mine it shoots unit B"). Solution: let each client
        // be authoritative only over its OWN player-safe, and receive the
        // opponent's shots via SAFE_FIRE messages (see handleRemoteSafeFire).
        const inP2P = (typeof currentBattleRoom !== 'undefined' && !!currentBattleRoom);
        if (inP2P && this.team === 'enemy') {
            // safeHeals / safeRegen below are player-team only, so returning here is fine.
            return;
        }

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

        // In P2P, the safe has no SYNC_SPAWN buffs (it's created at game start),
        // so admin-hack damage boosts must be pre-baked into `dmg` here so the
        // value that lands in SAFE_FIRE's broadcast already reflects them. We
        // disabled the duplicate takeDamage-time doubling above, so doing it
        // here is now the ONLY place the admin's `doubleDamage` gets applied.
        if (inP2P && this.team === 'player') {
            if (adminHacks.doubleDamage) damageMult *= 2;
            if (adminHacks.dmgMultiplier && adminHacks.dmgMultiplier > 1) {
                damageMult *= adminHacks.dmgMultiplier;
            }
        }

        if (now - this.lastAttackTime > CONFIG.SAFE_ATTACK_SPEED * atkSpeedMult) {
            let target = this.findTargetInHalf();
            // Admin: safeShoots — the player's safe also targets enemies on the
            // enemy half (not just ones that crossed into its own half).
            if (!target && this.team === 'player' && adminHacks.safeShoots) {
                const foes = units.concat(buildings, auras).filter(u => u.team === 'enemy' && !u.isInvisible && !u.isFrozen && !u.isDead && !isAmberOrTrail(u));
                if (foes.length) {
                    foes.sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y));
                    target = foes[0];
                }
            }
            if (target) {
                const dmg = CONFIG.SAFE_DAMAGE * damageMult;
                projectiles.push(new Projectile(this.x, this.y, target, dmg, this.team, false));
                this.lastAttackTime = now;
                // Tell the peer exactly which target we locked onto, so their
                // enemy-safe mirrors this shot at the same unit instead of
                // re-picking from its own drift-offset simulation.
                if (inP2P && this.team === 'player' &&
                    window.NetworkManager && typeof window.NetworkManager.broadcastSafeFire === 'function') {
                    try { window.NetworkManager.broadcastSafeFire(target.x, target.y, dmg); } catch (e) {}
                }
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
        let enemies = units.concat(buildings, auras).filter(u => u.team !== this.team && !u.isInvisible && !u.isFrozen && !isAmberOrTrail(u));
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
        // Slightly taller Safe bar so the numeric label fits inside it.
        const sfW = 92, sfH = 16, sfY = this.y - 62;
        ctx.fillStyle = '#000'; ctx.fillRect(this.x - sfW / 2, sfY, sfW, sfH);
        ctx.fillStyle = this.team === 'player' ? '#74b9ff' : '#ff7675';
        ctx.fillRect(this.x - sfW / 2, sfY, sfW * hpPercent, sfH);
        ctx.font = 'bold 12px "Assistant", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = `${Math.max(0, Math.floor(this.hp))}/${Math.round(this.maxHp)}`;
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.9)';
        ctx.strokeText(label, this.x, sfY + sfH / 2);
        ctx.fillStyle = 'white';
        ctx.fillText(label, this.x, sfY + sfH / 2);
    }
}
