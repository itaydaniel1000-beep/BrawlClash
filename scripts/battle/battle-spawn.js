// battle-spawn.js - Entity Spawning and Initial Interaction

function spawnEntity(x, y, team, typeStr, isFrozen = false, isRemote = false, remoteBuffs = null) {
    if (team === 'player' && currentBattleRoom && !isRemote) {
        if (window.NetworkManager) {
            window.NetworkManager.syncSpawn(currentBattleRoom, x, y, typeStr);
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

    let entity;
    if (card.type === 'unit') {
        entity = new Unit(x, y, 15, team, typeStr);
        if (buffs.doubleDamage) entity.attackDamage *= 2;
        if (buffs.superSpeed) {
            entity.speed *= 2;
            entity.attackSpeed /= 2;
        }
        units.push(entity);
    } else if (card.type === 'building') {
        entity = new Building(x, y, team, typeStr);
        if (buffs.doubleDamage) entity.attackDamage *= 2;
        buildings.push(entity);
    } else if (card.type === 'aura') {
        entity = new Aura(x, y, team, typeStr);
        if (buffs.doubleDamage) entity.attackDamage *= 1.5;
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

    if (isFrozen) entity.isFrozen = true;
    AudioController.play('spawn');

    if (difficulty === 'hard' && team === 'enemy' && !currentBattleRoom) {
        entity.maxHp *= 1.3;
        entity.hp = entity.maxHp;
        if (entity.attackDamage !== undefined) entity.attackDamage *= 0.8;
    }
}
window.spawnEntity = spawnEntity;
