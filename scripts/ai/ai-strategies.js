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

    // 🛡️ DEFENSIVE-FORTRESS BUILD QUEUE — see engine-core.js initGame.
    // The queue holds the next-up entry of a 4-building line in front
    // of the bot's safe. While the queue is NOT empty the bot SAVES
    // ALL its elixir for the next piece — no defensive counters, no
    // offensive pushes, no opportunistic spawns. Without this lock
    // the bot would burn elixir on cheap Bruce / Bull / Leon plays
    // (3-4 cost) and never accumulate the 8 needed for Pam, so the
    // fortress would never build. Once the queue is empty the lock
    // lifts and the normal AI cycle resumes.
    const fortressQ = window._botFortressQueue;
    if (fortressQ && fortressQ.length > 0) {
        const next = fortressQ[0];
        const card = (typeof CARDS === 'object' && CARDS[next.type]) ? CARDS[next.type] : null;
        const cost = (card && typeof card.cost === 'number') ? card.cost : 0;
        if (enemyElixir >= cost) {
            try {
                spawnEntity(next.x, next.y, 'enemy', next.type);
                fortressQ.shift();
                lastAIActionTime = now;
            } catch (e) { /* spawn failed — leave queue alone, try next tick */ }
        }
        // Whether we built or are still saving — block the rest of the
        // AI tick so no Bruce / Bull / Leon / etc. spawn drains the
        // elixir we're waiting to spend on the fortress.
        return;
    }

    // 🔥 MR-P PUNISH — when the player has 3+ Mr-P spawners on the field
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

    if (playerMrPs.length >= 3) {
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

            // 4 Ambers spawn at the same instant, each starting 90° apart
            // around the outer ring. They all walk the same 6-lap sequence
            // (outer/middle/inner ×2) so the formation stays in lock-step:
            // at any frame, four Ambers sit on opposite sides of whichever
            // ring they're on, painting fire-trails in parallel. Coverage
            // builds 4× faster than with a single Amber.
            //
            // 12 waypoints per ring + 1 closing waypoint = 13 per pass.
            const RINGS = [150, 100, 50, 150, 100, 50];
            const OFFSETS = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];   // 12-o'clock, 3, 6, 9
            let spawned = 0;
            OFFSETS.forEach(baseOffset => {
                const waypoints = [{ x: spawnX, y: spawnY }];
                RINGS.forEach((r) => {
                    // Each Amber's starting angle is the SAME `baseOffset`
                    // for every ring — keeps the 4 of them quartered
                    // around the safe through every revolution.
                    for (let i = 0; i <= 12; i++) {
                        const angle = baseOffset + (i / 12) * Math.PI * 2;
                        waypoints.push({
                            x: botSafeX + r * Math.cos(angle),
                            y: botSafeY + r * Math.sin(angle)
                        });
                    }
                });
                try {
                    const rOut = spawnEntity(spawnX, spawnY, 'enemy', 'amber', false, false, null, 0, waypoints);
                    if (rOut !== null && rOut !== undefined) {
                        spawned++;
                        // Boost speed for the long orbit path. 400 px/s
                        // finishes the full tour (~3800 px) in ~10 s.
                        const justSpawned = (typeof units !== 'undefined' && units.length)
                                          ? units[units.length - 1] : null;
                        if (justSpawned && justSpawned.type === 'amber' &&
                            justSpawned.team === 'enemy') {
                            justSpawned.speed = 400;
                        }
                    } else {
                        console.warn(`   ↳ Amber #${spawned + 1} spawnEntity returned null (blocked by a cap?)`);
                    }
                } catch (e) {
                    console.warn(`   ↳ Amber #${spawned + 1} spawnEntity threw`, e);
                }
            });
            console.log(`🔥 AI Amber-orbit FIRED: ${playerMrPs.length} Mr-Ps → ${spawned} Ambers, ${RINGS.length} laps × ${OFFSETS.length} quartered (r=${RINGS.join('/')})`);
            if (typeof showTransientToast === 'function') {
                showTransientToast(`🔥 הבוט שולח ${spawned} אמברות סביב הכספת שלו!`);
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

    // 1) REACTIVE MIRROR COUNTER — per user spec, the bot's main job is
    //    to MATCH whatever the player sends. For every unit type the
    //    player has on the field, the bot tries to keep an equal count
    //    of the SAME type on its own side, so any threat the player
    //    sends gets a 1:1 counter that can actually win the fight.
    //
    //    Algorithm:
    //      • Count the player's units by type, the bot's by type
    //      • Walk the player's units and pick the type with the largest
    //        deficit (player_count > bot_count). Skip un-spawnable cards
    //        (no CARDS entry, admin-only, event-only).
    //      • Spawn the matching type at the same x lane as the threat,
    //        just below the bot's safe (y=100), if affordable.
    //
    //    Auras / buildings / specials are excluded from the mirror —
    //    they can't be physically countered with a same-type spawn.
    //    The fall-through cases (defensive AoE, push, etc.) still run
    //    below for those scenarios.
    const playerUnits = units.filter(u => u && u.team === 'player' && !u.isDead &&
                                          !u.isInvisible && !u.isFrozen);
    if (playerUnits.length > 0) {
        const myUnitCounts = {};
        units.forEach(u => {
            if (u && u.team === 'enemy' && !u.isDead) {
                myUnitCounts[u.type] = (myUnitCounts[u.type] || 0) + 1;
            }
        });
        const playerByType = {};
        playerUnits.forEach(u => {
            playerByType[u.type] = (playerByType[u.type] || 0) + 1;
        });

        // Find the type with the largest deficit we can actually spawn.
        let bestType = null, bestDeficit = 0, bestTarget = null;
        for (const u of playerUnits) {
            const type = u.type;
            const card = CARDS[type];
            if (!card) continue;
            // Skip non-mirrorable: spells, auras (Pam/Max etc. don't
            // walk and can't "counter" anything mid-field), porters
            // (admin-only spawn).
            if (card.type !== 'unit') continue;
            if (card.adminOnly || card.eventOnly) continue;
            const deficit = (playerByType[type] || 0) - (myUnitCounts[type] || 0);
            if (deficit > bestDeficit && _aiAffordable(type)) {
                bestType = type;
                bestDeficit = deficit;
                bestTarget = u;
            }
        }

        if (bestType && bestTarget) {
            if (aiSpawn(bestTarget.x, 100, bestType)) {
                lastAIActionTime = now;
                return;
            }
        }
    }

    // 1b) FALLBACK DEFENSIVE COUNTER — if the player has units we can't
    //     mirror (Amber, Libi, Barry, etc.) BUT they've crossed into our
    //     half, send a bruiser/AoE answer the old-school way.
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
