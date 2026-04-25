// engine-input.js - Event Listeners and Input Handling

function handleNetworkGameOver(data) {
    console.log('[GAME-OVER-DIAG v9.39] handleNetworkGameOver called with data=' + JSON.stringify(data));
    if (currentState === GAME_STATE.GAMEOVER) return;

    // SANITY GUARD: reject bogus 'safe_destroyed' GAME_OVER messages that fire
    // the instant a P2P match starts (observed with a mid-version opponent
    // whose client detected a 'safe death' that didn't actually happen).
    // Conditions to drop:
    //   • we're <5 seconds into the match (battle just started)
    //   • BOTH of our own safes are still alive with HP > 0
    //   • reason is 'safe_destroyed' (forfeit messages stay legal because those
    //     are user-initiated via the quit button)
    try {
        const reason = data && data.reason;
        const bothAlive = playerSafe && enemySafe && !playerSafe.isDead && !enemySafe.isDead &&
            (playerSafe.hp > 0) && (enemySafe.hp > 0);
        const justStarted = typeof window._matchStartedAt === 'number' && (performance.now() - window._matchStartedAt) < 5000;
        if (reason === 'safe_destroyed' && bothAlive && justStarted) {
            console.warn('[GAME-OVER-DIAG v9.39] ignoring bogus GAME_OVER — match just started and both safes alive. ' +
                'playerSafe=' + playerSafe.hp + '/' + playerSafe.maxHp +
                ' enemySafe=' + enemySafe.hp + '/' + enemySafe.maxHp);
            if (typeof showTransientToast === 'function') {
                showTransientToast('⚠️ התעלמנו מגיים-אובר שווא מהיריב (הכספות עדיין בחיים)');
            }
            return;
        }
    } catch (e) { /* don't block a real game-over on a guard error */ }

    currentState = GAME_STATE.GAMEOVER;
    // Back-compat: older payloads sent a bare `winner` username. New payloads send
    // `{winnerIsYou, reason}` from the sender's perspective. Also accept a plain
    // string in case some older client connects.
    let isWin = false;
    let reason = 'safe_destroyed';
    if (data && typeof data === 'object') {
        if (typeof data.winnerIsYou === 'boolean') {
            isWin = data.winnerIsYou;
        } else if (typeof data.winner === 'string') {
            isWin = (data.winner === playerStats.username);
        }
        if (typeof data.reason === 'string') reason = data.reason;
    } else if (typeof data === 'string') {
        isWin = (data === playerStats.username);
    }

    const resultText = document.getElementById('game-over-title');
    if (resultText) {
        if (reason === 'forfeit' && isWin) {
            resultText.innerText = "ניצחון! היריב עזב את הקרב";
        } else if (reason === 'forfeit' && !isWin) {
            resultText.innerText = "יצאת מהקרב";
        } else {
            resultText.innerText = isWin ? "ניצחון רשתי!" : "הפסד רשתי!";
        }
    }
    AudioController.play(isWin ? 'win' : 'lose');
    const overMenu = document.getElementById('game-over-menu');
    if (overMenu) overMenu.classList.add('active');

    // If the opponent's "ביטול אדמין" suspended our hacks for this match,
    // restore them now that the battle is over.
    if (typeof restoreSuspendedAdmin === 'function') restoreSuspendedAdmin();

    // Clear battle-room after a beat so the next game starts fresh.
    setTimeout(() => { currentBattleRoom = null; }, 3000);
}

// True only when the LOCAL user is genuinely entitled to use `cancelAdmin`
// (super-admin OR a grant that explicitly includes cancelAdmin). We can't
// trust `adminHacks.cancelAdmin` on its own because adminHacks lives in
// shared localStorage — a leaked `true` from a previous super-admin session
// would otherwise let any random account neutralise an opponent's powers.
function _userMayCancelAdmin() {
    try {
        const isSuper = (typeof playerStats !== 'undefined' && playerStats &&
                         typeof ADMIN_USERNAME !== 'undefined' &&
                         playerStats.username === ADMIN_USERNAME);
        if (isSuper) return true;
        const grants  = (typeof _loadAdminGrants === 'function') ? _loadAdminGrants() : {};
        const myGrant = (typeof playerStats !== 'undefined' && playerStats && playerStats.username && grants[playerStats.username]) || null;
        return !!(myGrant && !myGrant._revoke && myGrant.cancelAdmin);
    } catch (e) { return false; }
}

function handleRemoteSpawn(data) {
    // Verified in a two-tab in-browser simulation: stripping the buffs
    // when cancelAdmin is on does NOT cause the match to end on placement.
    // The regression the user reported must live elsewhere (stale cache,
    // mid-version opponent, etc.). Re-enabling the feature.
    const cancelling = _userMayCancelAdmin() &&
        !!(typeof adminHacks !== 'undefined' && adminHacks.cancelAdmin);
    const buffs = cancelling ? null : (data.buffs || null);
    spawnEntity(data.x, data.y, 'enemy', data.unitType, !!data.isFrozen, true, buffs, data.level || 1);
}

// The opponent's safe just fired — mirror the shot on our screen so BOTH
// clients agree on which of our units is being targeted. Without this every
// client runs its own safe-targeting logic and picks a different victim when
// two candidates are close in distance, causing the "phone shoots one unit,
// PC shoots the other" desync.
function handleRemoteSafeFire(data) {
    if (!enemySafe || enemySafe.isDead || enemySafe.isFrozen) return;
    // Try to lock onto the nearest live player-team entity to the flipped
    // target coords so the projectile homes correctly when the unit moves.
    // If nothing is close (unit already died, etc.), fall back to a stationary
    // phantom target at the given coords so the tracer still renders.
    const candidates = units.concat(buildings, auras).filter(e => e && e.team === 'player' && !e.isDead);
    let target = null;
    let bestDist = 80; // tolerance — units drift a bit between the two sims
    candidates.forEach(e => {
        const d = Math.hypot(e.x - data.targetX, e.y - data.targetY);
        if (d < bestDist) { bestDist = d; target = e; }
    });
    if (!target) {
        // Phantom target: the sender's unit drifted out of our 80px tolerance
        // or already died. Fire a "dud" projectile towards the coords so
        // something visibly happens; a no-op takeDamage keeps Projectile.hit()
        // from throwing when it arrives.
        target = { x: data.targetX, y: data.targetY, isDead: false, takeDamage: () => {} };
    }
    const dmg = (typeof data.damage === 'number' && isFinite(data.damage)) ? data.damage : CONFIG.SAFE_DAMAGE;
    projectiles.push(new Projectile(enemySafe.x, enemySafe.y, target, dmg, 'enemy', false));
}
window.handleRemoteSafeFire = handleRemoteSafeFire;

// Receive the opponent's admin settings at battle start. Stored globally so
// entity-base can consult them when resolving damage against enemy-team entities
// (the admin's own units/safe on our screen).
function handleAdminConfig(data) {
    if (!data || !data.hacks) return;
    const h = data.hacks;

    // cancelAdmin TWO-WAY: strip opponent effects on OUR screen AND tell the
    // opponent's client to suspend its own adminHacks for the match so their
    // buffs also disappear on THEIR screen. Without this, the admin would
    // still see their own buffed units/safe. The opponent restores their
    // adminHacks automatically when the battle ends.
    //
    // We refuse to act on `adminHacks.cancelAdmin` unless the local user
    // is genuinely entitled to it (super-admin OR a stored grant that
    // explicitly includes cancelAdmin). Without this gate, a leaked
    // cancelAdmin=true in shared localStorage would let any random
    // account neutralise an opponent's admin powers.
    const iAmCancelling = _userMayCancelAdmin() &&
        !!(typeof adminHacks !== 'undefined' && adminHacks.cancelAdmin);
    const opponentHasAnyHack = !!(
        data.isAdmin || h.infiniteElixir || h.godMode || h.doubleDamage || h.superSpeed ||
        h.speedMultiplier > 1 || h.dmgMultiplier > 1 || h.hpMultiplier > 1 || h.safeHpMultiplier > 1
    );
    if (iAmCancelling && opponentHasAnyHack) {
        opponentAdminHacks = {
            isAdmin: false, infiniteElixir: false, godMode: false,
            doubleDamage: false, superSpeed: false,
            speedMultiplier: 0, dmgMultiplier: 0, hpMultiplier: 0, safeHpMultiplier: 0
        };
        // Tell the opponent to stand down for this match. Their client will
        // zero the gameplay-affecting adminHacks fields and restore them on
        // battle end. The bogus-GAME_OVER guard below protects us against
        // any weirdness that a mid-version opponent's suspend flow might
        // trigger on their side.
        if (window.NetworkManager && typeof window.NetworkManager.sendSuspendAdmin === 'function') {
            try { window.NetworkManager.sendSuspendAdmin(); } catch (e) { /* ignore */ }
        }
        if (typeof showTransientToast === 'function') {
            showTransientToast('🛡️ ביטול אדמין פעיל — הכוחות של היריב הושבתו על שני המסכים');
        }
        return;
    }

    opponentAdminHacks = {
        isAdmin: !!data.isAdmin,
        infiniteElixir: !!h.infiniteElixir,
        godMode: !!h.godMode,
        doubleDamage: !!h.doubleDamage,
        superSpeed: !!h.superSpeed,
        // Numeric multipliers — needed so the opponent's safe / spawns reflect
        // the admin's boosts on THIS client too (the sender's own copy already
        // had them applied locally).
        speedMultiplier: +h.speedMultiplier || 0,
        dmgMultiplier:   +h.dmgMultiplier   || 0,
        hpMultiplier:    +h.hpMultiplier    || 0,
        safeHpMultiplier:+h.safeHpMultiplier|| 0
    };

    // Retroactively buff `enemySafe` on this client — the safe is created at
    // `initGame` before the ADMIN_CONFIG usually arrives, so without this
    // update it stays at base 5000 HP while the admin's OWN safe on their
    // screen is already boosted. Result: the "phone" side keeps dealing tons
    // of damage to a "tiny" enemy safe that matches what the admin sees.
    if (typeof enemySafe !== 'undefined' && enemySafe &&
        opponentAdminHacks.safeHpMultiplier > 1 && !enemySafe._opponentSafeBuffApplied) {
        enemySafe.maxHp *= opponentAdminHacks.safeHpMultiplier;
        enemySafe.hp = enemySafe.maxHp;
        enemySafe._opponentSafeBuffApplied = true;
    }

    if (data.isAdmin) {
        const active = [];
        if (h.godMode) active.push('גוד מוד');
        if (h.doubleDamage) active.push('נזק כפול');
        if (h.superSpeed) active.push('מהירות-על');
        if (h.infiniteElixir) active.push('אליקסיר אינסופי');
        if (h.hpMultiplier > 1) active.push(`חיים ×${h.hpMultiplier}`);
        if (h.dmgMultiplier > 1) active.push(`נזק ×${h.dmgMultiplier}`);
        if (h.safeHpMultiplier > 1) active.push(`כספת ×${h.safeHpMultiplier}`);
        if (active.length > 0 && typeof showTransientToast === 'function') {
            showTransientToast(`⚠️ היריב הוא אדמין: ${active.join(', ')}`);
        }
    }
}
window.handleAdminConfig = handleAdminConfig;

// Admin fields that get wiped during a cancelAdmin suspend. We include the
// bot/enemy panel fields too even though the bot doesn't run during a P2P
// match — leaving them set looks weird in the locked panel, and the user
// expects the entire admin section to be uniformly suspended.
// UI/meta fields (cancelAdmin / canGrantAdmin / canRevokeAdmin) are NOT
// suspended; the player can still flip those for the next match.
const _GAMEPLAY_ADMIN_FIELDS = [
    // Units
    'infiniteElixir', 'godMode', 'doubleDamage', 'superSpeed',
    'speedMultiplier', 'dmgMultiplier', 'hpMultiplier',
    'attackSpeedMultiplier', 'radiusMultiplier',
    'infiniteRange', 'permanentInvisible',
    // Elixir
    'startingElixir', 'maxElixir', 'elixirRateMultiplier',
    'freeCards', 'fullRefund',
    // Safe
    'safeHpMultiplier', 'safeShoots', 'safeHeals', 'safeRegen', 'doubleSafe',
    // Bot / enemy panel section — included so suspend covers the whole UI
    'disableBot', 'botSlowdownFactor', 'enemyNerfFactor', 'botOnlyCardId',
    // Game-wide
    'timeScale', 'autoIncome', 'allStarPowers',
    'deleteUnit'
];

// The opponent has cancelAdmin on — back up our gameplay adminHacks, zero
// them out, undo the retroactive safe HP boost that initGame applied, AND
// roll back every spawn-time buff that's currently baked into existing
// player-team entities (doubleDamage, hpMult, dmgMult, speed/atkSpd/radius
// multipliers, superSpeed, infiniteRange, permanentInvisible). Also remove
// the doubleSafe extra-safe and force-disarm the deleteUnit toggle.
// Idempotent (second call during the same match is a no-op).
function handleSuspendAdmin() {
    if (typeof adminHacks === 'undefined') return;
    if (window._suspendedAdminBackup) return; // already suspended

    const backup = {};
    _GAMEPLAY_ADMIN_FIELDS.forEach(k => { backup[k] = adminHacks[k]; });
    window._suspendedAdminBackup = backup;

    // Wipe every gameplay field. String fields (botOnlyCardId) reset to ''.
    _GAMEPLAY_ADMIN_FIELDS.forEach(k => {
        const v = adminHacks[k];
        if (typeof v === 'boolean') adminHacks[k] = false;
        else if (typeof v === 'number') adminHacks[k] = 0;
        else if (typeof v === 'string') adminHacks[k] = '';
    });
    // Also disarm the in-flight delete-unit selection mode so the floating
    // 🗑️ button can't keep deleting enemies even though deleteUnit is now off.
    if (typeof window.isSelectingDeleteTarget !== 'undefined') {
        window.isSelectingDeleteTarget = false;
    }

    // Compute total spawn-time multipliers that were baked into player-team
    // entities at their creation. We undo these per-entity below.
    const speedFactor    = (backup.superSpeed ? 2 : 1) * (backup.speedMultiplier > 1 ? backup.speedMultiplier : 1);
    const atkSpdFactor   = speedFactor * (backup.attackSpeedMultiplier > 1 ? backup.attackSpeedMultiplier : 1);
    const dmgFactorUnits = (backup.doubleDamage ? 2 : 1)   * (backup.dmgMultiplier > 1 ? backup.dmgMultiplier : 1);
    const dmgFactorAuras = (backup.doubleDamage ? 1.5 : 1) * (backup.dmgMultiplier > 1 ? backup.dmgMultiplier : 1); // auras use 1.5×, not 2×
    const hpFactor       = backup.hpMultiplier > 1 ? backup.hpMultiplier : 1;
    const radiusFactor   = backup.radiusMultiplier > 1 ? backup.radiusMultiplier : 1;

    try {
        // Roll back unit spawn buffs on every live player-team entity.
        const reset = (e, dmgFactor) => {
            if (!e || e.isDead) return;
            if (typeof e.attackDamage === 'number' && dmgFactor > 1) e.attackDamage /= dmgFactor;
            if (typeof e.speed === 'number' && speedFactor > 1) e.speed /= speedFactor;
            if (typeof e.attackSpeed === 'number' && atkSpdFactor > 1) e.attackSpeed *= atkSpdFactor;
            if (typeof e.maxHp === 'number' && hpFactor > 1) {
                const ratio = e.maxHp > 0 ? (e.hp / e.maxHp) : 1;
                e.maxHp /= hpFactor;
                e.hp = Math.max(0, Math.min(e.maxHp, e.maxHp * ratio));
            }
            if (typeof e.radius === 'number' && radiusFactor > 1) e.radius /= radiusFactor;
            if (backup.infiniteRange && e.attackRange === 9999) e.attackRange = 55; // best-guess base
            if (backup.permanentInvisible && e._permInvis) {
                e.isInvisible = false;
                e._permInvis = false;
            }
        };
        if (typeof units     !== 'undefined') units    .filter(u => u && u.team === 'player').forEach(u => reset(u, dmgFactorUnits));
        if (typeof buildings !== 'undefined') buildings.filter(b => b && b.team === 'player').forEach(b => reset(b, dmgFactorUnits));
        if (typeof auras     !== 'undefined') auras    .filter(a => a && a.team === 'player').forEach(a => reset(a, dmgFactorAuras));
    } catch (e) { /* keep going even on a per-entity reset error */ }

    // Roll back the safeHpMultiplier boost on our own safe.
    try {
        if (typeof playerSafe !== 'undefined' && playerSafe &&
            backup.safeHpMultiplier && backup.safeHpMultiplier > 1) {
            const ratio = playerSafe.maxHp > 0 ? (playerSafe.hp / playerSafe.maxHp) : 1;
            const baseMax = (typeof CONFIG !== 'undefined' && CONFIG.SAFE_MAX_HP) ? CONFIG.SAFE_MAX_HP : 5000;
            playerSafe.maxHp = baseMax;
            playerSafe.hp = Math.min(baseMax, Math.max(0, baseMax * ratio));
        }
    } catch (e) { /* don't block suspend on a safe-reset error */ }

    // Roll back the elixir-bar bonuses that initGame baked in at match start
    // (startingElixir override and maxElixir override). Without this, an admin
    // who started with e.g. 20 elixir keeps that elevated bar even after their
    // hacks are suspended, which lets them spam high-cost cards immediately.
    try {
        const baseStart = 5;
        const baseMax   = (typeof CONFIG !== 'undefined' && CONFIG.MAX_ELIXIR) ? CONFIG.MAX_ELIXIR : 10;
        // Roll back the maxElixir override first so the clamp below uses the
        // correct ceiling.
        if (backup.maxElixir && backup.maxElixir > baseMax) {
            if (typeof playerMaxElixir !== 'undefined') playerMaxElixir = baseMax;
        }
        // If the admin had a startingElixir bonus, bring the current bar down
        // to the baseline starting amount. We don't try to subtract "what they
        // already spent" — the cleanest semantic is "ביטול אדמין resets your
        // bar to the standard starting value", matching what initGame would
        // have done without the override.
        if (backup.startingElixir && backup.startingElixir > baseStart) {
            if (typeof playerElixir !== 'undefined') playerElixir = baseStart;
        }
        // Final clamp so playerElixir never exceeds the (possibly-just-reset)
        // max, regardless of which override was active.
        if (typeof playerElixir !== 'undefined' && typeof playerMaxElixir !== 'undefined' &&
            playerElixir > playerMaxElixir) {
            playerElixir = playerMaxElixir;
        }
        if (typeof updateUI === 'function') updateUI();
    } catch (e) { /* ignore — UI repaint will catch up next frame */ }

    // Remove the doubleSafe extra-safe so the admin doesn't keep two safes.
    try {
        if (backup.doubleSafe && typeof buildings !== 'undefined') {
            for (let i = buildings.length - 1; i >= 0; i--) {
                if (buildings[i] && buildings[i].isDecoy) buildings.splice(i, 1);
            }
        }
    } catch (e) { /* ignore */ }

    if (typeof showTransientToast === 'function') {
        showTransientToast('🛡️ היריב הפעיל ביטול-אדמין — כוחות האדמין שלך מושבתים עד סוף הקרב');
    }

    // If the admin panel is already open right now, repaint it as locked.
    try {
        const overlay = document.getElementById('admin-panel-overlay');
        if (overlay && typeof _refreshAdminSuspendedUI === 'function') _refreshAdminSuspendedUI(overlay);
    } catch (e) {}
}
window.handleSuspendAdmin = handleSuspendAdmin;

// Battle ended — restore the backed-up gameplay adminHacks. Safe HP isn't
// rolled forward (the fresh match will re-apply it at its own initGame).
function restoreSuspendedAdmin() {
    if (!window._suspendedAdminBackup) return;
    const backup = window._suspendedAdminBackup;
    try { Object.assign(adminHacks, backup); } catch (e) {}
    window._suspendedAdminBackup = null;
    if (typeof showTransientToast === 'function') {
        showTransientToast('🛡️ המשחק הסתיים — כוחות האדמין שלך חזרו');
    }
    // Repaint the admin panel as unlocked if it's open.
    try {
        const overlay = document.getElementById('admin-panel-overlay');
        if (overlay && typeof _refreshAdminSuspendedUI === 'function') _refreshAdminSuspendedUI(overlay);
    } catch (e) {}
}
window.restoreSuspendedAdmin = restoreSuspendedAdmin;

function handleShiftRelease(e) {
    if (e.key !== 'Shift') return;
    // Releasing Shift cancels any held card / freeze selection
    if (selectedCardId || selectedFreezeCardId) {
        selectedCardId = null;
        selectedFreezeCardId = null;
        document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
    }
    // Note: the admin "delete enemy" mode is a toggle on the 🗑️ button now,
    // not tied to Shift. Releasing Shift doesn't affect it.
}

function initGameListeners() {
    if (canvas) {
        // Pointer events unify mouse + touch so long-press on a phone and
        // mouse press-and-hold on desktop both drive the same Shift-on-release
        // shortcut (see battle-input.js).
        canvas.removeEventListener('pointerdown', handleCanvasPress);
        canvas.addEventListener('pointerdown', handleCanvasPress);
        canvas.removeEventListener('pointerup', handleCanvasRelease);
        canvas.addEventListener('pointerup', handleCanvasRelease);
        canvas.removeEventListener('pointercancel', handleCanvasRelease);
        canvas.addEventListener('pointercancel', handleCanvasRelease);
        canvas.removeEventListener('pointerleave', handleCanvasRelease);
        canvas.addEventListener('pointerleave', handleCanvasRelease);
        // pointermove fires for both touch and mouse, keeping the ghost +
        // auto-repeat target glued to wherever the user is dragging.
        canvas.removeEventListener('pointermove', handleCanvasPointerMove);
        canvas.addEventListener('pointermove', handleCanvasPointerMove);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mousemove', handleMouseMove);
    }

    // Shift release cancels any currently held card — lets player hold a card only while Shift is pressed.
    window.removeEventListener('keyup', handleShiftRelease);
    window.addEventListener('keyup', handleShiftRelease);

    const homeSettingsBtn = document.getElementById('home-settings-btn');
    if (homeSettingsBtn) {
        homeSettingsBtn.onclick = (e) => {
            e.stopPropagation();
            const sidebar = document.getElementById('right-sidebar');
            if (sidebar) sidebar.classList.toggle('hidden');
        };
    }

    const socialBtn = document.querySelector('.social-btn');
    if (socialBtn) socialBtn.onclick = () => openPlayersTab();

    const emoteBtn = document.getElementById('emote-bubble-btn');
    if (emoteBtn) emoteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const selector = document.getElementById('emote-selector');
        if (selector) selector.classList.toggle('active');
    });

    const bullDashBtn = document.getElementById('bull-dash-btn');
    if (bullDashBtn) bullDashBtn.onclick = (e) => {
        e.stopPropagation();
        if (!isSelectingBullDash) {
            const bullsAvailable = units.some(u => u.team === 'player' && u.type === 'bull' && !u.hasDashed);
            if (!bullsAvailable) return;
        }
        isSelectingBullDash = !isSelectingBullDash;
        bullDashBtn.style.backgroundColor = isSelectingBullDash ? '#e74c3c' : '#8c7ae6';
    };

    document.addEventListener('click', () => {
        const selector = document.getElementById('emote-selector');
        if (selector) selector.classList.remove('active');
    });

    const quitBtn = document.getElementById('quit-btn');
    if (quitBtn) quitBtn.onclick = () => {
        // In P2P battles, tell the opponent we forfeited so they get a proper
        // victory screen instead of being silently stranded in the battle.
        if (currentBattleRoom && window.NetworkManager && typeof window.NetworkManager.notifyForfeit === 'function') {
            try { window.NetworkManager.notifyForfeit(); } catch (e) {}
            currentBattleRoom = null;
        }
        // If ביטול אדמין suspended our hacks for this match, bring them back.
        if (typeof restoreSuspendedAdmin === 'function') restoreSuspendedAdmin();
        gameLoopRunning = false;
        currentState = GAME_STATE.MENU;
        document.getElementById('pause-menu').classList.remove('active');
        goToLobby();
    };

    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) restartBtn.onclick = () => {
        document.getElementById('game-over-menu').classList.remove('active');
        goToLobby();
    };

    const gameOverCharBtn = document.getElementById('game-over-char-btn');
    if (gameOverCharBtn) gameOverCharBtn.onclick = () => {
        document.getElementById('game-over-menu').classList.remove('active');
        openScreen('char-selection-menu');
    };

    const resumeBtn = document.getElementById('resume-btn');
    if (resumeBtn) resumeBtn.onclick = () => {
        currentState = GAME_STATE.PLAYING;
        document.getElementById('pause-menu').classList.remove('active');
        lastTime = performance.now();
        gameLoopRunning = true;
        requestAnimationFrame(gameLoop);
    };

    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) pauseBtn.onclick = () => {
        currentState = GAME_STATE.PAUSED;
        document.getElementById('pause-menu').classList.add('active');
    };

    const playBtn = document.getElementById('lobby-start-btn');
    if (playBtn) playBtn.onclick = () => startGame();

    const charBtn = document.getElementById('lobby-char-btn');
    if (charBtn) charBtn.onclick = () => openScreen('char-selection-menu');

    const spBtn = document.getElementById('lobby-sp-btn');
    if (spBtn) {
        spEntrySource = 'lobby';
        spBtn.onclick = () => {
            spEntrySource = 'lobby';
            openScreen('sp-selection-menu');
        };
    }

    const passBtn = document.querySelector('.brawl-pass-btn');
    if (passBtn) passBtn.onclick = () => openScreen('brawl-pass-screen');

    const shopBtn = document.querySelector('.shop-btn');
    if (shopBtn) shopBtn.onclick = () => openScreen('shop-screen');

    const clubBtn = document.querySelector('.club-btn');
    if (clubBtn) clubBtn.onclick = () => {
        switchScreen('club-screen');
    };

    const confirmCharBtn = document.getElementById('confirm-char-btn');
    if (confirmCharBtn) confirmCharBtn.onclick = () => goToLobby();

    const confirmSpBtn = document.getElementById('confirm-sp-btn');
    if (confirmSpBtn) confirmSpBtn.onclick = () => {
        if (typeof spEntrySource !== 'undefined' && spEntrySource === 'battle') startGame();
        else goToLobby();
    };

    const starModeBtn = document.getElementById('star-mode-btn');
    if (starModeBtn) starModeBtn.onclick = () => {
        isStarringMode = !isStarringMode;
        starModeBtn.style.backgroundColor = isStarringMode ? '#e74c3c' : '#f1c40f';
    };
}
window.initGameListeners = initGameListeners;

document.addEventListener('DOMContentLoaded', () => {
    try {
        setupCanvas(); 
        initGameListeners();
        
        setTimeout(() => { 
            try {
                if (window.NetworkManager) {
                    initNetworkListeners(); 
                    if (playerStats.username) window.NetworkManager.init(playerStats.username);
                }
            } catch (netErr) {
                console.warn("⚠️ Network initialization delayed:", netErr);
            }
        }, 800);

        if (!playerStats.username) switchScreen('username-overlay');
        else goToLobby();
        
        updateStatsUI();
        console.log("🚀 BrawlClash modular engine initialized!");
    } catch (criticalErr) {
        console.error("❌ CRITICAL INITIALIZATION ERROR:", criticalErr);
        switchScreen('lobby-screen');
    }
});
