// ai-strategies.js - AI Difficulty Levels (player-equivalent stats; smart play)
//
// All three difficulties now share the SAME reactive brain — the only thing
// that changes per difficulty is the bot's reaction cooldown (how often it
// considers an action). Stats are deliberately identical to the player's
// (no HP/damage/elixir multipliers — see battle-spawn.js + engine-physics.js).
// The challenge comes from how well it reacts to whatever the player does.

// ----- helpers used by the brain ------------------------------------------------
// Count how many of OUR (enemy team) units of a given type are already on the
// field — used to dodge the 2-bruce hard cap and to avoid building duplicate
// turrets.
function _aiCountOnField(type) {
    const inUnits     = units.filter(u => u.team === 'enemy' && u.type === type).length;
    const inBuildings = buildings.filter(b => b.team === 'enemy' && b.type === type).length;
    const inAuras     = auras.filter(a => a.team === 'enemy' && a.type === type).length;
    return inUnits + inBuildings + inAuras;
}

// "Affordable AND legal" — has the elixir to play `type`, and not at the
// 2-bruce-per-team cap. Returns the card-id or null.
function _aiAffordable(type) {
    if (!type || !CARDS[type] || CARDS[type].adminOnly || CARDS[type].eventOnly) return null;
    if (enemyElixir < CARDS[type].cost) return null;
    if (type === 'bruce' && _aiCountOnField('bruce') >= 2) return null;
    return type;
}

// Pick the first affordable card from a priority list — used for counters
// where order matters (most-preferred → least-preferred).
function _aiFirstAffordable(list) {
    for (const t of list) {
        const ok = _aiAffordable(t);
        if (ok) return ok;
    }
    return null;
}

// ----- the single reactive brain ------------------------------------------------
// `cooldownMs` is how often this function will spawn anything. Lower = faster
// reaction. Difficulty levels just hand in different values.
function _aiReactiveStep(dt, now, cooldownMs) {
    // === PRIORITY CHECKS — run BEFORE the cooldown gate so they fire
    // as soon as conditions are met, regardless of when the bot last
    // acted on a generic strategy. ============================================

    // 🔥 MR-P PUNISH — when the player has 5+ Mr-P spawners on the field
    // they're playing a heavy spawner-turtle game. Amber is the perfect
    // counter: she walks a straight line from OUR safe to THEIR safe
    // leaving a fire trail that fries the spawner cluster + every porter
    // it produces. One Amber per 10-second window so the bot doesn't
    // burn its entire elixir bar repeatedly on the same state. Costs 7
    // elixir, so it only fires when the bot can actually afford it.
    //
    // We check this BEFORE the cooldown gate so the bot reacts instantly
    // when the player crosses the 5-Mr-P threshold instead of waiting
    // its turn in the AI cycle. Diagnostic console.log fires once per
    // 5-second window so we can see what's blocking when it doesn't fire.
    if (!window._aiLastAmberAt) window._aiLastAmberAt = 0;
    if (!window._aiLastAmberLog) window._aiLastAmberLog = 0;
    const playerMrPCount = buildings.filter(b => b.team === 'player' && b.type === 'mr-p' && !b.isDead).length;
    const amberCost = (CARDS && CARDS.amber && CARDS.amber.cost) || 7;
    if (playerMrPCount >= 5) {
        const cooldownLeft = 10000 - (now - window._aiLastAmberAt);
        const haveElixir   = enemyElixir >= amberCost;
        if (cooldownLeft <= 0 && haveElixir) {
            const startX = CONFIG.CANVAS_WIDTH / 2;
            const startY = 90;                                // just below the enemy safe
            const endX   = CONFIG.CANVAS_WIDTH / 2;
            const endY   = CONFIG.CANVAS_HEIGHT - 100;        // just above the player safe
            // spawnEntity sig: (x, y, team, type, isFrozen, isRemote, remoteBuffs, remoteLevel, waypoints)
            const result = spawnEntity(startX, startY, 'enemy', 'amber', false, false, null, 0, [
                { x: startX, y: startY },
                { x: endX,   y: endY   }
            ]);
            console.log(`🔥 AI Amber-sweep fired: player has ${playerMrPCount} Mr-P, bot elixir ${enemyElixir.toFixed(1)}, spawn result:`, result);
            window._aiLastAmberAt = now;
            lastAIActionTime = now;
            return;
        } else if (now - window._aiLastAmberLog > 5000) {
            // Why it's blocked — surface to console so the player can see.
            console.log(`🔥 AI Amber-sweep BLOCKED: player has ${playerMrPCount} Mr-P, ` +
                `bot elixir ${enemyElixir.toFixed(1)}/${amberCost} ${haveElixir ? '✓' : '✗'}, ` +
                `cooldown ${cooldownLeft > 0 ? Math.ceil(cooldownLeft/1000)+'s left' : 'ready ✓'}`);
            window._aiLastAmberLog = now;
        }
    }

    // === Normal AI cycle — gated by cooldown ===============================
    if (now - lastAIActionTime < cooldownMs) return;

    // 1) DEFENSIVE COUNTER — anything in the upper 40% (our half) is an
    //    immediate threat. Prefer AoE if there are multiple incoming threats,
    //    else a single bruiser (bull → bruce → leon).
    const incoming = units.filter(u => u.team === 'player' && u.y < CONFIG.CANVAS_HEIGHT * 0.4);
    if (incoming.length > 0) {
        const target = incoming[0];
        const choice = incoming.length >= 3
            ? _aiFirstAffordable(['emz', 'pam', 'bull', 'bruce'])         // crowd answer
            : _aiFirstAffordable(['bull', 'bruce', 'leon', 'porter']);    // single answer
        if (choice && aiSpawn(target.x, 100, choice)) {
            lastAIActionTime = now;
            return;
        }
    }

    // 2) PLAYER BUILDINGS — turrets / portals on the player's side are
    //    persistent threats. Send a high-HP brawler at them.
    const playerBuildings = buildings.filter(b => b.team === 'player' && !b.isDead);
    if (playerBuildings.length > 0) {
        const target = playerBuildings[0];
        const choice = _aiFirstAffordable(['bull', 'bruce']);
        if (choice && aiSpawn(target.x, 100, choice)) {
            lastAIActionTime = now;
            return;
        }
    }

    // 3) REBUILD RECENT LOSSES — if one of our units died in the last 10s,
    //    re-summon the same type at the spot it died (50% chance so the bot
    //    doesn't get stuck in an infinite re-spawn loop on the same lane).
    const recent = aiDeaths.filter(d => now - d.time < 10000);
    if (recent.length > 0 && Math.random() > 0.5) {
        const toRebuild = recent[0];
        const choice = _aiAffordable(toRebuild.type);
        if (choice && aiSpawn(toRebuild.x, 100, choice)) {
            aiDeaths = aiDeaths.filter(d => d !== toRebuild);
            lastAIActionTime = now;
            return;
        }
    }

    // 4) DEFENSIVE BUILDINGS — if we have a lot of elixir and not enough
    //    turrets on the field, drop one. Picks the first turret type we
    //    don't currently have out.
    const buildOptions = ['scrappy', 'penny', 'mr-p'];
    const currentTurrets = buildings.filter(b => b.team === 'enemy').map(b => b.type);
    const buildChoice = buildOptions.find(o => !currentTurrets.includes(o) && _aiAffordable(o));
    if (buildChoice && enemyElixir >= 6) {
        if (aiSpawn(Math.random() * 400 + 100, 150, buildChoice)) {
            lastAIActionTime = now;
            return;
        }
    }

    // 5) AGGRESSIVE PUSH — if elixir is full enough and nothing else needed
    //    handling, push a unit toward the player's safe. Prefer a tank.
    if (enemyElixir >= 4) {
        const choice = _aiFirstAffordable(['bull', 'bruce', 'leon', 'porter']);
        if (choice) {
            const x = Math.random() * 400 + 100;
            if (aiSpawn(x, 100, choice)) {
                lastAIActionTime = now;
                return;
            }
        }
    }
}

// ----- difficulty wrappers ------------------------------------------------------
// Same brain everywhere, different reaction cooldowns. Easy thinks slowly,
// hard reacts almost in real-time.
function aiUpdateEasy(dt, now)   { _aiReactiveStep(dt, now, 2000); }
function aiUpdateNormal(dt, now) { _aiReactiveStep(dt, now, 1200); }
function aiUpdateHard(dt, now)   { _aiReactiveStep(dt, now,  700); }
