// battle-spawn.js - Entity Spawning and Initial Interaction

function spawnEntity(x, y, team, typeStr, isFrozen = false, isRemote = false, remoteBuffs = null, remoteLevel = 0) {
    if (team === 'player' && currentBattleRoom && !isRemote) {
        if (window.NetworkManager) {
            window.NetworkManager.syncSpawn(currentBattleRoom, x, y, typeStr, isFrozen);
        }
    }

    x = Math.max(20, Math.min(CONFIG.CANVAS_WIDTH - 20, x));
    y = Math.max(20, Math.min(CONFIG.CANVAS_HEIGHT - 20, y));

    if (team === 'enemy') {
        let boundary = CONFIG.CANVAS_HEIGHT / 2;
        if (y > boundary) {
            let insideEmz = auras.some(a => a.team === 'enemy' && a.type === 'emz' && !a.isFrozen && Math.hypot(x - a.x, y - a.y) <= a.radius);
            if (!insideEmz) y = boundary - 10;
        }
    }

    let card = CARDS[typeStr];
    if (team === 'player' && !adminHacks.infiniteElixir) {
        playerElixir = Math.max(0, playerElixir - card.cost);
    } else if (team === 'enemy' && !currentBattleRoom) {
        enemyElixir = Math.max(0, enemyElixir - card.cost);
    }

    // Buff source: local admin hacks for our own spawns, remote buffs piggy-backed
    // on the wire for opponent spawns. This lets the admin's boosted units hit just as
    // hard on the opponent's screen even though they have no admin panel of their own.
    // `adminHacks` is a `let` in globals.js so window.adminHacks is undefined;
    // use the bare name for reliable lexical-scope access.
    const buffs = isRemote
        ? (remoteBuffs || {})
        : (team === 'player' ? ((typeof adminHacks !== 'undefined') ? adminHacks : {}) : {});

    // Custom admin-granted multipliers (speed / damage / hp) stack ON TOP of
    // the boolean hacks — so "speed x4" gives 4× base speed even if `superSpeed`
    // is also on. Only the local player's spawns get them; remote units pick
    // up the values from `remoteBuffs` so opponents see the same buffed unit.
    const speedMult = Math.max(1, buffs.speedMultiplier || 0);
    const dmgMult   = Math.max(1, buffs.dmgMultiplier || 0);
    const hpMult    = Math.max(1, buffs.hpMultiplier || 0);
    const atkSpdMult = Math.max(1, (team === 'player' ? adminHacks.attackSpeedMultiplier : 0) || 0);
    const radMult   = Math.max(1, (team === 'player' ? adminHacks.radiusMultiplier : 0) || 0);

    let entity;
    if (card.type === 'unit') {
        entity = new Unit(x, y, 15, team, typeStr);
        if (buffs.doubleDamage) entity.attackDamage *= 2;
        if (buffs.superSpeed) {
            entity.speed *= 2;
            entity.attackSpeed /= 2;
        }
        if (speedMult > 1) { entity.speed *= speedMult; entity.attackSpeed /= speedMult; }
        if (dmgMult > 1)   { entity.attackDamage *= dmgMult; }
        if (hpMult > 1)    { entity.maxHp *= hpMult; entity.hp = entity.maxHp; }
        if (atkSpdMult > 1){ entity.attackSpeed /= atkSpdMult; }
        if (radMult > 1)   { entity.radius *= radMult; }
        if (team === 'player' && adminHacks.infiniteRange)       entity.attackRange = 9999;
        if (team === 'player' && adminHacks.permanentInvisible)  { entity.isInvisible = true; entity._permInvis = true; }
        units.push(entity);
    } else if (card.type === 'building') {
        entity = new Building(x, y, team, typeStr);
        if (buffs.doubleDamage) entity.attackDamage *= 2;
        if (dmgMult > 1) entity.attackDamage *= dmgMult;
        if (hpMult > 1)  { entity.maxHp *= hpMult; entity.hp = entity.maxHp; }
        if (atkSpdMult > 1){ entity.attackSpeed /= atkSpdMult; }
        if (radMult > 1)   { entity.radius *= radMult; }
        if (team === 'player' && adminHacks.infiniteRange) entity.attackRange = 9999;
        buildings.push(entity);
    } else if (card.type === 'aura') {
        entity = new Aura(x, y, team, typeStr);
        if (buffs.doubleDamage) entity.attackDamage *= 1.5;
        if (dmgMult > 1) entity.attackDamage *= dmgMult;
        if (hpMult > 1)  { entity.maxHp *= hpMult; entity.hp = entity.maxHp; }
        if (radMult > 1) entity.radius *= radMult;
        auras.push(entity);

        if (typeStr === 'pam' && team === 'player' && playerStarPowers['pam'] === 'sp1') {
            let allies = units.concat(buildings, auras).concat([playerSafe, enemySafe].filter(s => s)).filter(e => e && e.team === team && !e.isDead);
            allies.forEach(a => {
                if (Math.hypot(a.x - x, a.y - y) <= entity.radius) {
                    a.hp = Math.min(a.maxHp, a.hp + 500);
                }
            });
        }
    }

    // Remote-spawn level scaling was previously applied here so the opponent's
    // render of a levelled-up unit matched the sender's. We REMOVED that in
    // favour of a simpler rule: in P2P matches, ignore level scaling entirely
    // on both sides (see unit-core.js / building.js / aura.js). This is fairer
    // — both players play with the same base stats regardless of who happens
    // to have upgraded which brawler further — and it's the only way to
    // guarantee the two screens agree on HP and damage without shipping every
    // player's full level table across the wire.

    if (isFrozen) entity.isFrozen = true;
    AudioController.play('spawn');

    // Vs-bot: scale the AI's enemy units by the SAME level scale the player's
    // own units of that type get, so a level-12 Bruce (1860 HP on the player's
    // side) fights a level-12 Bruce (1860 HP) — not a base-stats 1200-HP copy.
    // Keeps the bot match visually consistent with the player's progression.
    // Skip in P2P (remote spawns, currentBattleRoom) — the level-scaling rule
    // there is "both sides use base stats" (see unit-core.js / building.js).
    if (team === 'enemy' && !isRemote && !currentBattleRoom &&
        card && card.type && typeof getLevelScale === 'function') {
        const botScale = getLevelScale(typeStr);
        if (botScale > 1) {
            if (entity.maxHp) { entity.maxHp *= botScale; entity.hp = entity.maxHp; }
            if (entity.attackDamage !== undefined) entity.attackDamage *= botScale;
        }
    }

    if (difficulty === 'hard' && team === 'enemy' && !currentBattleRoom) {
        entity.maxHp *= 1.3;
        entity.hp = entity.maxHp;
        if (entity.attackDamage !== undefined) entity.attackDamage *= 0.8;
    }

    // Enemy-nerf: admin-granted weakening of bot units (HP and damage divided).
    // Applied only to locally-simulated enemies (not remote P2P spawns, since the
    // opponent would be a real player who shouldn't be retroactively nerfed).
    if (team === 'enemy' && !isRemote && !currentBattleRoom) {
        const nerf = adminHacks.enemyNerfFactor || 0;
        if (nerf > 1) {
            entity.maxHp /= nerf;
            entity.hp = entity.maxHp;
            if (entity.attackDamage !== undefined) entity.attackDamage /= nerf;
        }
    }

    // Full refund — instantly return the elixir that was deducted above.
    if (team === 'player' && !isRemote && adminHacks.fullRefund && card && card.cost) {
        playerElixir = Math.min(playerMaxElixir, playerElixir + card.cost);
    }
}
window.spawnEntity = spawnEntity;
