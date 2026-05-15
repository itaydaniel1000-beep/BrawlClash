// ai-strategies.js - Implementation of AI Difficulty Levels

function aiUpdateEasy(dt, now) {
    // Reduced cooldown 3000 → 1800 ms for a noticeably more aggressive bot.
    if (now - lastAIActionTime > 1800) {
        // Skip cards flagged `adminOnly` (e.g. the Libi ultimate) — the bot
        // must never roll one of them on its own. Also restrict to units +
        // buildings (skip spells/auras) so the bot doesn't waste turns on
        // cards it can't use intelligently (sirius, rosa, fire trails, etc).
        let options = Object.keys(CARDS).filter(k => {
            const c = CARDS[k];
            return c && !c.adminOnly && (c.type === 'unit' || c.type === 'building');
        });
        let choice = options[Math.floor(Math.random() * options.length)];
        if (aiSpawn(Math.random() * CONFIG.CANVAS_WIDTH, 100, choice)) {
            lastAIActionTime = now;
        }
    }
}

function aiUpdateNormal(dt, now) {
    // Reduced cooldown 2000 → 1100 ms — the bot reacts almost twice as fast.
    if (now - lastAIActionTime > 1100) {
        let players = units.filter(u => u.team === 'player');
        if (players.length > 0) {
            let target = players[0];
            let options = Object.keys(CARDS).filter(k => CARDS[k].type === 'unit' && !CARDS[k].adminOnly);
            let choice = options[Math.floor(Math.random() * options.length)];
            if (aiSpawn(target.x, 100, choice)) lastAIActionTime = now;
        } else {
            aiUpdateEasy(dt, now);
        }
    }
}

function aiUpdateHard(dt, now) {
    if (aiWavePreparation) {
        if (now - aiWaveStartTime > 4000 || enemyElixir >= 9.5) {
            aiWavePreparation = false;
        } else {
            return; 
        }
    }

    if (enemyElixir < 2) {
        aiWavePreparation = true;
        aiWaveStartTime = now;
        aiWaveUnitsSpawned = 0;
        return;
    }

    // Reduced cooldown 1500 → 700 ms on hard — relentless pressure.
    if (now - lastAIActionTime > 700) {
        let dangerousPlayers = units.filter(u => u.team === 'player' && u.y < CONFIG.CANVAS_HEIGHT * 0.4);
        if (dangerousPlayers.length > 0) {
            let target = dangerousPlayers[0];
            let choice = (dangerousPlayers.length > 2) ? 'emz' : 'bull';
            if (aiSpawn(target.x, 100, choice)) {
                lastAIActionTime = now;
                return;
            }
        }

        let counters = aiDeaths.filter(d => now - d.time < 10000);
        if (counters.length > 0 && Math.random() > 0.5) {
            let toRebuild = counters[0];
            if (aiSpawn(toRebuild.x, 100, toRebuild.type)) {
                aiDeaths = aiDeaths.filter(d => d !== toRebuild);
                lastAIActionTime = now;
                return;
            }
        }

        const buildOptions = ['scrappy', 'penny', 'mr-p'];
        let currentBuildings = buildings.filter(b => b.team === 'enemy').map(b => b.type);
        let buildChoice = buildOptions.find(o => !currentBuildings.includes(o));
        if (buildChoice && enemyElixir > 6) {
            if (aiSpawn(Math.random() * 400 + 100, 150, buildChoice)) {
                lastAIActionTime = now;
                return;
            }
        }

        let unitOptions = ['bull', 'bruce', 'leon'];
        let unitChoice = unitOptions[Math.floor(Math.random() * unitOptions.length)];
        if (aiSpawn(Math.random() * 400 + 100, 100, unitChoice)) {
            lastAIActionTime = now;
        }
    }
}
