// engine-physics.js - Game State Updates and Entity Processing

function update(dt, now) {
    // Admin time-scale: `<1` slows the game, `>1` speeds it up, `~0` freezes it.
    // Applied globally by scaling the delta every update consumer below uses.
    if (adminHacks.timeScale && adminHacks.timeScale > 0) {
        dt = dt * adminHacks.timeScale;
    }

    // Keep the 🗑️ delete-enemy-unit button in sync with the admin flag +
    // current game state so it only shows up during an active battle.
    // Also requires the local user to actually be admin / have the
    // matching grant — otherwise a stale `adminHacks.deleteUnit = true`
    // value (left over from a previous owner of this browser session
    // or a tutorial that didn't fully clean up) wouldn't surface the
    // button to a non-admin player.
    const delBtn = document.getElementById('admin-delete-btn');
    if (delBtn) {
        let _isAdminUser = false;
        try {
            const isSuper = (typeof playerStats !== 'undefined' && playerStats &&
                             typeof ADMIN_USERNAME !== 'undefined' &&
                             playerStats.username === ADMIN_USERNAME);
            const grants  = (typeof _loadAdminGrants === 'function') ? _loadAdminGrants() : {};
            const granted = !!(playerStats && playerStats.username && grants && grants[playerStats.username]);
            _isAdminUser  = isSuper || granted;
        } catch (e) { _isAdminUser = false; }

        const show = _isAdminUser && !!adminHacks.deleteUnit && currentState === GAME_STATE.PLAYING;
        delBtn.style.display = show ? 'block' : 'none';
        if (!show && isSelectingDeleteTarget) {
            isSelectingDeleteTarget = false;
            if (typeof _resetDeleteUnitButtonStyle === 'function') _resetDeleteUnitButtonStyle();
        }
    }

    if (currentState === GAME_STATE.PLAYING) {
        if (adminHacks.infiniteElixir) playerElixir = playerMaxElixir;

        let elixirGenRate = CONFIG.ELIXIR_GEN_RATE;
        if (adminHacks.rapidFire) elixirGenRate *= 3;
        if (adminHacks.elixirRateMultiplier && adminHacks.elixirRateMultiplier > 1) {
            elixirGenRate *= adminHacks.elixirRateMultiplier;
        }
        if (hasStarPower('max', 'sp1') && units.some(u => u.team === 'player' && u.type === 'max')) {
            elixirGenRate *= 1.1;
        }
        playerElixir = Math.min(playerMaxElixir, playerElixir + (elixirGenRate * dt / 1000));
        let aiGenMult = difficulty === 'hard' ? 1.5 : 1.0;
        enemyElixir += (CONFIG.ELIXIR_GEN_RATE * aiGenMult * dt / 1000);
    }

    // Kill-tally exclusion list. Amber + her fire-trail tiles ALL expire at
    // once 5s after she dies, so a single frame can drop the enemy count by
    // 6-7 entries — which used to give the local player a huge max-elixir
    // boost they didn't earn (and the Amber-owner saw "the enemy got an
    // elixir charge for free" on their screen). Porter is also already
    // excluded since the bot summons swarms of them.
    const _isCountedEnemy = (e) =>
        e && e.team === 'enemy' &&
        e.type !== 'porter' &&
        e.type !== 'amber' &&
        e.type !== 'fire-trail' &&
        e.type !== 'trunk' &&
        e.type !== 'trunk-trail' &&
        e.type !== 'bubble';

    let oldEnemyCount = units.concat(buildings, auras).filter(_isCountedEnemy).length;

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

        // Post-release HP ceiling lock: when the player releases a unit from
        // freeze, the user explicitly does NOT want the HP to refill. We
        // snapshot hp in releaseAllFreeze / handleRemoteReleaseFreeze and
        // clamp it here so friendly healers (Pam, Scrappy SP2, safeHeals,
        // etc.) can't push it upward for a brief window. Downward motion
        // (damage, frostbite) is unaffected — only upward is capped.
        if (e._postReleaseHpCapUntil) {
            if (now < e._postReleaseHpCapUntil) {
                if (typeof e._postReleaseHpCap === 'number' && e.hp > e._postReleaseHpCap) {
                    e.hp = e._postReleaseHpCap;
                }
            } else {
                delete e._postReleaseHpCap;
                delete e._postReleaseHpCapUntil;
            }
        }

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

    let newEnemyCount = units.concat(buildings, auras).filter(_isCountedEnemy).length;
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
            console.log('[GAME-OVER-DIAG v9.36] local game-over: playerSafe.isDead=' + playerSafe.isDead +
                ' (hp=' + playerSafe.hp + '/' + playerSafe.maxHp + ') enemySafe.isDead=' + enemySafe.isDead +
                ' (hp=' + enemySafe.hp + '/' + enemySafe.maxHp + ')');
            let winStatus = "lose";
            if (playerSafe.isDead) {
                playerTrophies = Math.max(0, playerTrophies - 3);
                winStatus = "lose";
            } else {
                playerTrophies += 8;
                winStatus = "win";
            }
            localStorage.setItem(_userKey('trophies'), playerTrophies);

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

        // If ביטול אדמין suspended our hacks for this match, restore them now
        // that the battle has ended (safe destroyed on one side).
        if (typeof restoreSuspendedAdmin === 'function') restoreSuspendedAdmin();

        if (currentBattleRoom) {
            setTimeout(() => { currentBattleRoom = null; }, 3000);
        }
    }
}
