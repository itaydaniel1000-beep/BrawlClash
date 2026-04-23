// engine-physics.js - Game State Updates and Entity Processing

function update(dt, now) {
    if (currentState === GAME_STATE.PLAYING) {
        if (adminHacks.infiniteElixir) playerElixir = playerMaxElixir;
        
        let elixirGenRate = CONFIG.ELIXIR_GEN_RATE;
        if (adminHacks.rapidFire) elixirGenRate *= 3;
        if (playerStarPowers['max'] === 'sp1' && units.some(u => u.team === 'player' && u.type === 'max')) {
            elixirGenRate *= 1.1;
        }
        playerElixir = Math.min(playerMaxElixir, playerElixir + (elixirGenRate * dt / 1000));
        let aiGenMult = difficulty === 'hard' ? 1.5 : 1.0;
        enemyElixir += (CONFIG.ELIXIR_GEN_RATE * aiGenMult * dt / 1000);
    }

    let oldEnemyCount = units.concat(buildings, auras).filter(e => e.team === 'enemy' && e.type !== 'porter').length;

    [...auras, ...buildings, ...units, ...projectiles, ...floatingTexts, ...particles, playerSafe, enemySafe].forEach(e => {
        if (!e) return;
        if (e.isFrozen) {
            if (!e.freezeHoverStart) {
                e.freezeHoverStart = now;
                e.lastFrostbiteTime = now;
            }
            if (now - e.freezeHoverStart > 3000) {
                if (now - e.lastFrostbiteTime > 1000) {
                    e.hp -= (e.maxHp || e.hp) * 0.05;
                    e.lastFrostbiteTime = now;
                    if (e.hp <= 0) e.isDead = true;
                }
            }
        } else {
            e.freezeHoverStart = null;
        }

        if (e.update) e.update(dt, now);
        if (e.isDead && !e.deathLogged && e.team === 'enemy' && e.type && CARDS[e.type]) {
            e.deathLogged = true;
            aiDeaths.push({ type: e.type, x: e.x, y: e.y, time: now });
            pendingRebuilds.push({ type: e.type, x: e.x, y: e.y });
        }
    });

    aiDeaths = aiDeaths.filter(d => now - d.time <= 20000);

    auras = auras.filter(e => !e.isDead);
    buildings = buildings.filter(e => !e.isDead);
    units = units.filter(e => !e.isDead);
    projectiles = projectiles.filter(e => !e.isDead);
    floatingTexts = floatingTexts.filter(e => !e.isDead);
    particles = particles.filter(e => !e.isDead);
    
    if (screenShakeTime > 0) screenShakeTime--;

    let newEnemyCount = units.filter(e => e.team === 'enemy' && e.type !== 'porter').length + buildings.filter(e => e.team === 'enemy').length + auras.filter(e => e.team === 'enemy').length;
    let deathsThisFrame = oldEnemyCount - newEnemyCount;
    if (deathsThisFrame > 0) {
        playerKills += deathsThisFrame;
        playerMaxElixir = Math.min(20, 10 + Math.floor(playerKills / 3));
    }

    // In multiplayer, don't run local AI — the opponent is a real player whose actions arrive via PeerJS.
    if (!currentBattleRoom) {
        aiUpdate(dt, now);
    }
    updateUI();

    if (playerSafe && enemySafe && (playerSafe.isDead || enemySafe.isDead)) {
        if (currentState !== GAME_STATE.GAMEOVER) {
            let winStatus = "lose";
            if (playerSafe.isDead) {
                playerTrophies = Math.max(0, playerTrophies - 3);
                winStatus = "lose";
            } else {
                playerTrophies += 8;
                winStatus = "win";
            }
            localStorage.setItem('brawlclash_trophies', playerTrophies);

            if (currentBattleRoom && window.NetworkManager) {
                const iWon = (winStatus === "win");
                window.NetworkManager.updateBattleResult(currentBattleRoom, iWon, 'safe_destroyed');
            }
        }

        currentState = GAME_STATE.GAMEOVER;
        const resultText = document.getElementById('game-over-title');
        if (resultText) resultText.innerText = playerSafe.isDead ? "הפסדת!" : "ניצחון!";
        AudioController.play(playerSafe.isDead ? 'lose' : 'win');
        const overMenu = document.getElementById('game-over-menu');
        if (overMenu) overMenu.classList.add('active');

        if (currentBattleRoom) {
            setTimeout(() => { currentBattleRoom = null; }, 3000);
        }
    }
}
