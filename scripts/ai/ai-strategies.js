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
    // counter: she walks a straight vertical line from our safe to the
    // player's safe leaving a fire trail that fries the spawner cluster.
    //
    // The bot now spawns ONE Amber PER PLAYER MR-P, each on the same x
    // column as its target. If the player clustered all their Mr-Ps on
    // the left edge, the column of Ambers also sweeps the left edge,
    // covering exactly the strip the spawners occupy. Spread-out Mr-Ps
    // get a spread-out Amber response too — wherever the player builds,
    // the punish lands directly on top.
    //
    // 10-second cooldown stops the bot from chaining this every AI tick.
    // The check sits ABOVE the standard cooldown gate so it triggers
    // immediately on the threshold cross. ELIXIR COST IS BYPASSED for
    // this special punish — the cooldown is the only throttle. Otherwise
    // a player who keeps the bot's elixir drained could spawn-camp 5
    // Mr-Ps forever and the punish would never fire.
    if (!window._aiLastAmberAt)    window._aiLastAmberAt    = 0;
    if (!window._aiLastAmberLog)   window._aiLastAmberLog   = 0;
    if (!window._aiLastAmberCount) window._aiLastAmberCount = 0;
    const playerMrPs = buildings.filter(b => b.team === 'player' && b.type === 'mr-p' && !b.isDead);

    // Watcher log — fires once every 2 s whenever the player has ANY
    // Mr-P. Lets the user see in console exactly when their count
    // crosses the 5 threshold without needing to count visually.
    if (playerMrPs.length !== window._aiLastAmberCount) {
        console.log(`📊 player Mr-P count: ${playerMrPs.length}`);
        window._aiLastAmberCount = playerMrPs.length;
    }

    if (playerMrPs.length >= 5) {
        const cooldownLeft = 10000 - (now - window._aiLastAmberAt);
        if (cooldownLeft <= 0) {
            // Single Amber spawning next to the BOT's safe and immediately
            // walking 3 concentric rings around THAT safe (the bot's own).
            // Defensive perimeter pattern — every porter that the player's
            // Mr-P cluster pushes toward the bot's safe has to cross her
            // fire trail to reach it.
            const botSafeX  = (typeof enemySafe !== 'undefined' && enemySafe && enemySafe.x)
                              ? enemySafe.x  : (CONFIG.CANVAS_WIDTH  / 2);
            const botSafeY  = (typeof enemySafe !== 'undefined' && enemySafe && enemySafe.y)
                              ? enemySafe.y  : 60;
            // Spawn point — slightly below the safe so the first move is
            // out onto the outer ring instead of through the safe sprite.
            const spawnX = botSafeX;
            const spawnY = botSafeY + 40;

            // Build the path: spawn point → outer → middle → inner ring,
            // all centred on the BOT's safe. 12 waypoints per ring + 1
            // closing waypoint = 13 → full revolution.
            const waypoints = [{ x: spawnX, y: spawnY }];
            const RINGS = [150, 100, 50];
            RINGS.forEach((r, ringIdx) => {
                // First ring starts at the top of the circle (12-o'clock).
                // Subsequent rings start from the closest angle to the
                // previous ring's end to minimize the visible "jump".
                const startAngle = ringIdx === 0 ? -Math.PI / 2 : 0;
                for (let i = 0; i <= 12; i++) {
                    const angle = startAngle + (i / 12) * Math.PI * 2;
                    waypoints.push({
                        x: botSafeX + r * Math.cos(angle),
                        y: botSafeY + r * Math.sin(angle)
                    });
                }
            });

            let spawned = 0;
            try {
                const r = spawnEntity(spawnX, spawnY, 'enemy', 'amber', false, false, null, 0, waypoints);
                if (r !== null && r !== undefined) {
                    spawned = 1;
                    // Boost Amber's speed for this special path — the full
                    // 3-ring tour (~1900 px) would take ~25 s at her base
                    // 75 px/s. 250 px/s finishes in ~8 s, keeping the
                    // punish responsive without turning the match into
                    // "wait for Amber".
                    const justSpawned = (typeof units !== 'undefined' && units.length)
                                      ? units[units.length - 1] : null;
                    if (justSpawned && justSpawned.type === 'amber' &&
                        justSpawned.team === 'enemy') {
                        justSpawned.speed = 250;
                    }
                } else {
                    console.warn(`   ↳ Amber spawnEntity returned null (blocked by a cap?)`);
                }
            } catch (e) {
                console.warn(`   ↳ Amber spawnEntity threw`, e);
            }
            console.log(`🔥 AI Amber-orbit FIRED: ${playerMrPs.length} Mr-Ps → 1 Amber, 3 rings around BOT safe (r=${RINGS.join('/')})`);
            if (typeof showTransientToast === 'function') {
                showTransientToast(`🔥 הבוט שולח אמבר להגן על הכספת שלו!`);
            }
            window._aiLastAmberAt = now;
            lastAIActionTime = now;
            return;
        } else if (now - window._aiLastAmberLog > 3000) {
            console.warn(`🔥 AI Amber-sweep BLOCKED: ${playerMrPs.length} Mr-Ps, ` +
                `cooldown ${Math.ceil(cooldownLeft/1000)}s left ` +
                `(disableBot=${!!(typeof adminHacks !== 'undefined' && adminHacks.disableBot)})`);
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
