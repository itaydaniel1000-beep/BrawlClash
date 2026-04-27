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

        // Path-following state — any walking unit can carry a player-chosen
        // route. Empty array = no path = default per-type AI takes over.
        // Populated by battle-spawn.js when spawnEntity is called with a
        // `waypoints` argument (from commitAmberPath / SYNC_SPAWN).
        this.waypoints = [];
        this._currentWp = 0;

        if (type === 'bruce') {
            // Bumped base from 1200 → 1860 (and attackDamage 150 → 232) so
            // every device shows the same HP for Bruce regardless of local
            // level, P2P state, or cached scripts. Matches the level-12
            // scaled value the PC was already showing.
            this.maxHp = 1860; this.hp = 1860; this.attackDamage = 232; this.speed = 50; this.color = '#8c7ae6';
        } else if (type === 'bull') {
            this.maxHp = 1150; this.hp = 1150; this.attackDamage = 280; this.speed = 50; this.color = '#341f97';
        } else if (type === 'leon') {
            this.maxHp = 900; this.hp = 900; this.attackDamage = 200; this.speed = 50 * 1.3; this.color = '#00cec9';
            this.isInvisible = true; 
            this.hasAmbush = (team === 'player' && hasStarPower('leon', 'sp1'));
        } else if (type === 'porter') {
            this.maxHp = 100; this.hp = 100; this.attackDamage = 50; this.speed = 70; this.color = '#54a0ff';
            if (team === 'player' && hasStarPower('mr-p', 'sp2')) {
                this.shieldHp = 500;
            }
        } else if (type === 'bubble') {
            // Bubble — chewing-gum projectile. Untargetable (handled in
            // isAmberOrTrail), invulnerable to damage (isPacifist short-
            // circuit), drag-aimed by the player on spawn. Movement is
            // velocity-based (not target-chasing): unit-logic.js applies
            // `_velocity` per-frame and bounces off canvas walls. Dies
            // after `_stepsRemaining` × `_stepSize` px of travel.
            this.maxHp = 100; this.hp = 100;
            this.attackDamage = 100;
            this.speed = 450;          // 9× base 50 — only used as
                                       // sling magnitude on launch
                                       // (user request: 3× of original
                                       // 150 → 450)
            this.color = '#FF69B4';
            this.isPacifist = true;    // skip standard attack code path
            this.isBubble = true;
            this._velocity = { x: 0, y: 0 };  // set by commitBubbleSling()
            this._hitTargets = new Set();      // one-shot per enemy
            this._stepsRemaining = 18;
            this._stepSize = 50;       // px per "step"
            this._distSinceStep = 0;
        } else if (type === 'amber') {
            // Pacifist fire-walker. attackDamage = 0 + isPacifist flag tells
            // unit-logic.js to skip the attack code-path entirely (otherwise
            // she'd stop next to enemies and "attack" them with 0 dmg
            // forever — instead we want her to keep walking through them
            // and let the trail do the work). Speed 75 = 1.5× the Bruce
            // baseline of 50, per user spec.
            this.maxHp = 700; this.hp = 700;
            this.attackDamage = 0; this.speed = 75; this.color = '#e67e22';
            this.isPacifist = true;
            // (waypoints / _currentWp inherited from the base init above.)
            this._spawnTime = performance.now();
            this._lastTrailTime = 0;
            // Free-roam lifetime cap. In path mode she dies the moment she
            // reaches the last waypoint (regardless of this clock); in
            // no-path mode this is what eventually ends the run.
            this._maxLifetime = 8000;
        }

        // Level scaling removed per user request — every unit uses its base
        // stats (Bruce is always 1860 HP, Bull always 1150 HP, etc.) so both
        // devices agree on the exact same numbers regardless of each player's
        // local upgrade level or cached scripts. Simplest possible sync rule:
        // what you see is what the opponent sees.
    }

    takeDamage(amount) {
        if (this.isInvisible || this.isFrozen) return;
        // Amber is invulnerable to damage. She disappears ONLY when she
        // finishes her path (handled in unit-logic.js by setting
        // `this.isDead = true` after the last waypoint) OR via the admin
        // 🗑️ delete-unit power (which writes `isDead` directly, bypassing
        // takeDamage). Enemy attacks just bounce off her — she's a
        // pacifist fire-walker, not a tank. The HP bar stays at 700/700
        // for her whole run.
        if (this.isPacifist) return;
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
