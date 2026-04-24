// unit-core.js - Unit Class Definition and State
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
            // Level scaling is DISABLED in P2P matches: each player's local
            // progression would otherwise give them a different HP/damage
            // number for the same unit on each device (bruce at level-1 has
            // 1200 HP on the phone, at level-12 he has 1860 HP on the PC).
            // That also made damage vs the opponent's safe look asymmetric
            // between the two screens. In P2P we flatten everyone to base
            // stats for fairness and sync. Vs-bot still uses level scaling.
            const inP2PForScale = (typeof currentBattleRoom !== 'undefined' && !!currentBattleRoom);
            const scale = (!inP2PForScale && typeof getLevelScale === 'function') ? getLevelScale(type) : 1;
            this.maxHp *= scale;
            this.hp = this.maxHp;
            this.attackDamage *= scale;
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
            this.dashTarget = null; // will be locked in on the next update tick
        }
    }
}
window.Unit = Unit;
