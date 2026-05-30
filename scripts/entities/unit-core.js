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
            this.speed = 300;          // 6× base 50 — only used as
                                       // sling magnitude on launch
                                       // (450 → 300, user asked to
                                       // dial back by 1.5×)
            this.color = '#FF69B4';
            this.isPacifist = true;    // skip standard attack code path
            this.isBubble = true;
            this._velocity = { x: 0, y: 0 };  // set by commitBubbleSling()
            this._hitTargets = new Set();      // one-shot per enemy
            this._stepsRemaining = 36; // user request: 18 → 36
            this._stepSize = 50;       // px per "step"
            this._distSinceStep = 0;
        } else if (type === 'trunk') {
            // Trunk — energy support unit. Random-walks inside the half he
            // was placed in, dropping purple energy-trail tiles behind him.
            // Same-team units stepping on a tile consume it and get a one-
            // time permanent +20% damage buff. Invulnerable (cannot die
            // from damage), HP bar hidden, self-destructs after 15 seconds.
            this.maxHp = 99999; this.hp = 99999;     // huge — can't be drained
            this.attackDamage = 0;
            this.speed = 60;                          // moderate roam
            this.color = '#a55eea';
            this.isPacifist        = true;            // skip attack code
            this.isInvulnerable    = true;            // takeDamage no-op
            this.isHealthHidden    = true;            // skip HP bar draw
            this.isTrunk           = true;            // movement branch flag
            this._spawnTime        = performance.now();
            this._trunkLifetime    = 15000;           // 15 s self-destruct
            this._trunkTarget      = null;            // current random walkpoint
            this._lastTrailTime    = 0;
            // Cache the half this trunk is bound to. Set once at spawn from
            // his y-coordinate (top half = enemy, bottom half = player) so
            // even if a Tara aura tries to drag him across, his random
            // walkpoints still respect his original side.
            //   y < height/2 → top  (enemy half)
            //   y ≥ height/2 → bottom (player half)
            this._trunkHalfBottom = this.y >= (CONFIG.CANVAS_HEIGHT / 2);
            // === Deterministic RNG state for P2P sync ===================
            // Both clients must seed the PRNG identically. SYNC_SPAWN
            // mirrors the spawn position ((W - x, H - y) on the receiver
            // side) so the two clients see DIFFERENT local (x, y) — using
            // local coords as the seed would diverge immediately.
            // Solution: derive the seed from CANONICAL "sender-space"
            // coordinates. Canonical = the sender's (player-team) coords
            // on both screens. The receiver un-mirrors his local enemy-
            // team coords back to canonical first, so both ends compute
            // the same hash.
            const _canonX = (team === 'player') ? this.x : (CONFIG.CANVAS_WIDTH  - this.x);
            const _canonY = (team === 'player') ? this.y : (CONFIG.CANVAS_HEIGHT - this.y);
            const _seedX = Math.floor(_canonX * 10);
            const _seedY = Math.floor(_canonY * 10);
            this._trunkRngState = ((_seedX * 73856093) ^ (_seedY * 19349663) ^ 0x9E3779B9) >>> 0;
        } else if (type === 'barry') {
            // Barry — admin-only ice-cream summoner. STATIONARY (speed 0):
            // she stays put wherever the admin drops her in the enemy half
            // and acts as a long-lived 4000-HP charge generator. She still
            // swings at any enemy that wanders into her 60px reach
            // (handled in unit-logic.js by routing 'barry' through the
            // nearest-enemy targeting branch — she'll only ever attack
            // what comes to her, since she can't chase).
            this.maxHp = 4000; this.hp = 4000;
            this.attackDamage = 150;
            this.speed = 0;                     // never moves
            this.attackRange = 60;
            this.attackSpeed = 900;
            this.color = '#3498db';
            this._icecreamReady = 0;            // charges ready to spend
            this._lastIcecreamTick = performance.now();
        } else if (type === 'libi') {
            // Libi — secret admin-only ultimate. Invulnerable (cannot die),
            // effectively infinite damage so a single contact one-shots
            // anything she touches (units, buildings, safe). Walks like
            // Bruce (target-chase). HP bar hidden because nothing can ever
            // drain it.
            this.maxHp = 1e9; this.hp = 1e9;
            this.attackDamage = 1e9;
            this.speed = 80;                  // a touch faster than bruce
            this.attackSpeed = 400;           // quick swings too
            this.attackRange = 60;
            this.color = '#ff69b4';
            this.isInvulnerable = true;       // takeDamage no-op (entity-base.js)
            this.isHealthHidden = true;       // skip HP bar — always full
        } else if (type === 'mo') {
            // Mo — mouse gunner. 1500 HP, walks like Bruce, fires a
            // cascading 3-stage bullet burst every 7.5 s (per user —
            // 5× slower than the original 1.5 s baseline; the cascade
            // is potent enough that a tighter cadence overwhelmed the
            // field). The cascade itself lives in unit-logic.js's
            // attack branch + the Mo projectile-update path in
            // projectile.js. Stats here are the standalone-unit
            // numbers; per-stage damage / range are constants in
            // those files.
            // Per-bullet damage tuned down by 65% across the entire
            // cascade (per user). Resulting numbers:
            //   primary (stage 1)       500 → 175
            //   diagonals (stage 2)     100 → 35
            //   straight follow (stage 3) 400 → 140
            this.maxHp = 1500; this.hp = 1500;
            this.attackDamage = 175;          // primary bullet only
            this.speed = 50;
            this.attackRange = 80;            // matches primary bullet travel
            this.attackSpeed = 7500;          // 1.5 s × 5 — slower cadence
            this.color = '#95a5a6';
        } else if (type === 'pang') {
            // Pang — chain-dash bruiser. 2000 HP / 200 dmg melee, Bruce-
            // pace movement so once the chain dash finishes he plays like
            // any other front-line melee. The actual chain-dash logic
            // lives in unit-logic.js's Pang block at the top of every
            // update; `_pangDashing` flips off the moment there's no
            // un-visited enemy left on the opposing team.
            this.maxHp = 2000; this.hp = 2000;
            this.attackDamage = 200;
            this.speed = 50;                 // Bruce baseline
            this.attackRange = 60;
            this.attackSpeed = 1000;
            this.color = '#34495e';
            this._pangDashing = true;        // chain dash starts immediately on spawn
            this._pangVisited = new Set();   // entity refs that already ate a dash
        } else if (type === 'gray') {
            // Gray — pacifist portal-pair. Stationary, invulnerable, no
            // HP bar. The actual teleport mechanic lives in
            // unit-logic.js's Unit.update (the gray-portal block at the
            // top of every tick). `_portalB` is set by battle-input.js
            // on the next map click after spawn (the second-click
            // hijacks via the _pendingGrayPortalB global).
            this.maxHp = 99999; this.hp = 99999;
            this.attackDamage = 0;
            this.speed = 0;                  // can't walk
            this.attackRange = 0;
            this.color = '#2c3e50';
            this.isPacifist     = true;      // skip the attack code-path
            this.isInvulnerable = true;      // takeDamage is a no-op
            this.isHealthHidden = true;      // skip the HP bar
            this._portalB = null;            // set by next click after placement
        } else if (type === 'frank') {
            // Frank — heavy front-line mauler. 3000 HP / 400 dmg per swing,
            // Bruce-pace movement. Targets the nearest enemy entity (incl.
            // the safe) like Bull/Gigi. attackRange a touch wider than
            // Bruce so the cone reaches without him climbing into the
            // enemy. Attack cadence 1500ms gives the cone room to breathe
            // between every-other-swing stun bursts.
            this.maxHp = 3000; this.hp = 3000;
            this.attackDamage = 400;
            this.speed = 50;                  // Bruce baseline
            this.attackRange = 70;            // a hair longer than Bruce (55)
            this.attackSpeed = 1500;          // 1 swing every 1.5 s
            this.color = '#16a085';
            this._frankSwingCount = 0;        // counts swings; every 2nd stuns
        } else if (type === 'gigi') {
            // Gigi — ballerina bruiser. Targets the nearest enemy (the
            // unit-logic.js `bull/porter/libi/barry` branch handles her
            // — see the type list there). One-shot teleport: each
            // Gigi instance can be teleported within a 200-px radius
            // ONCE during her lifetime; the side-rail button drives
            // the selection UI. `_gigiTeleported` flips to true on
            // teleport; the button visibility check filters it.
            this.maxHp = 2500; this.hp = 2500;
            this.attackDamage = 250;
            this.speed = 50;
            this.attackRange = 60;       // melee — Bruce-like reach
            this.attackSpeed = 1000;
            this.color = '#e91e63';
            this._gigiTeleported = false;
            this._gigiTeleportRange = 200;
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
