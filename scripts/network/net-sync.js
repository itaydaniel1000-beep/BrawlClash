// net-sync.js - Multiplayer Game Synchronization

// Build the admin-buff payload piggy-backed onto every spawn so the opponent's
// client renders the same souped-up unit the admin actually placed locally.
// NOTE: `adminHacks` is `let` in globals.js, so `window.adminHacks` is undefined
// — we rely on the bare name resolving through lexical scope (net-sync.js loads
// after globals.js) to read the real values.
function _collectSpawnBuffs() {
    const h = (typeof adminHacks !== 'undefined') ? adminHacks : {};
    return {
        doubleDamage: !!h.doubleDamage,
        superSpeed: !!h.superSpeed,
        godMode: !!h.godMode,
        // Parametric multipliers ride the wire so the opponent's render of
        // admin-buffed spawns matches what the admin actually sees.
        speedMultiplier: +h.speedMultiplier || 0,
        dmgMultiplier: +h.dmgMultiplier || 0,
        hpMultiplier: +h.hpMultiplier || 0
    };
}

NetworkManager.syncSpawn = function(roomId, x, y, unitType, isFrozen) {
    const buffs = _collectSpawnBuffs();
    // Send our card's current level too. `Unit`/`Building`/`Aura` apply
    // `getLevelScale(type)` only for team==='player' spawns, so a remote
    // spawn arrives at base stats on the opponent's screen — the unit looks
    // weaker than it is on the sender's screen. Shipping the level lets
    // the receiver scale it to match.
    const level = (typeof playerStats !== 'undefined' && playerStats.levels && playerStats.levels[unitType]) || 1;
    Object.values(this.connections).forEach(conn => {
        if (conn.open) {
            conn.send({
                type: 'SYNC_SPAWN',
                x: CONFIG.CANVAS_WIDTH - x,
                y: CONFIG.CANVAS_HEIGHT - y,
                unitType: unitType,
                buffs: buffs,
                isFrozen: !!isFrozen,
                level: level
            });
        }
    });
};

// iWon: boolean from the sender's perspective. Receiver inverts it.
NetworkManager.updateBattleResult = function(roomId, iWon, reason) {
    Object.values(this.connections).forEach(conn => {
        if (conn.open) {
            conn.send({
                type: 'GAME_OVER',
                winnerIsYou: !iWon,
                reason: reason || 'safe_destroyed'
            });
        }
    });

    // Also save to Firebase if active
    if (this.db) {
        this.db.ref('battles/' + roomId).set({
            iWon: iWon,
            reason: reason || 'safe_destroyed',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    }
};

// At battle start, each client broadcasts whether it's running the admin panel
// and with which toggles. The receiver stores this in `opponentAdminHacks` so
// that buffs tied to the admin's own entities (notably godMode on their safe,
// which isn't re-spawned mid-game and so can't piggy-back on SYNC_SPAWN) are
// respected on the non-admin's screen.
NetworkManager.sendAdminConfig = function() {
    const h = (typeof adminHacks !== 'undefined') ? adminHacks : {};
    const isAdmin = (typeof playerStats !== 'undefined' &&
        typeof ADMIN_USERNAME !== 'undefined' &&
        playerStats && playerStats.username === ADMIN_USERNAME);
    const payload = {
        type: 'ADMIN_CONFIG',
        isAdmin: !!isAdmin,
        hacks: {
            infiniteElixir: !!h.infiniteElixir,
            godMode: !!h.godMode,
            doubleDamage: !!h.doubleDamage,
            superSpeed: !!h.superSpeed,
            speedMultiplier: +h.speedMultiplier || 0,
            dmgMultiplier: +h.dmgMultiplier || 0,
            hpMultiplier: +h.hpMultiplier || 0,
            safeHpMultiplier: +h.safeHpMultiplier || 0
        }
    };
    Object.values(this.connections).forEach(conn => {
        if (conn.open) {
            try { conn.send(payload); } catch (e) { /* ignore */ }
        }
    });
};

// "Cancel admin" was turned on locally and the opponent just declared they
// ARE an admin via ADMIN_CONFIG — ask them to suspend their hacks for the
// duration of this match. Their client backs up adminHacks, wipes them,
// and restores them when the battle ends. Only effective during an active
// P2P match; no-op otherwise.
NetworkManager.sendSuspendAdmin = function() {
    Object.values(this.connections).forEach(conn => {
        if (conn.open) {
            try { conn.send({ type: 'SUSPEND_ADMIN' }); } catch (e) { /* ignore */ }
        }
    });
};

// Tell the opponent to un-freeze the units WE just unfroze — same batch rule,
// just on the other team's perspective.
NetworkManager.broadcastReleaseFreeze = function() {
    Object.values(this.connections).forEach(conn => {
        if (conn.open) {
            try { conn.send({ type: 'RELEASE_FREEZE' }); } catch (e) {}
        }
    });
};

// Our safe just fired at (targetX, targetY). Tell the opponent so their
// `enemySafe` (== our safe, viewed from the other side) fires the same shot at
// the same target, instead of each client independently picking a different
// victim from its local sim. Coords are flipped into the receiver's space.
NetworkManager.broadcastSafeFire = function(targetX, targetY, damage) {
    Object.values(this.connections).forEach(conn => {
        if (conn.open) {
            try {
                conn.send({
                    type: 'SAFE_FIRE',
                    targetX: CONFIG.CANVAS_WIDTH  - targetX,
                    targetY: CONFIG.CANVAS_HEIGHT - targetY,
                    damage: damage
                });
            } catch (e) { /* ignore */ }
        }
    });
};

// Broadcast an emote to every connected peer. The local side also displays
// its own emote immediately so the sender sees it float over their half of
// the field (not just the opponent's copy).
NetworkManager.sendEmote = function(roomId, sender, emoteId) {
    if (typeof displayEmote === 'function') {
        try { displayEmote(sender, emoteId); } catch (e) {}
    }
    Object.values(this.connections).forEach(conn => {
        if (conn.open) {
            try { conn.send({ type: 'EMOTE', sender, emoteId }); } catch (e) {}
        }
    });
};

// Fired when the local player quits a P2P battle voluntarily. The opponent
// receives winnerIsYou=true with reason=forfeit so they see a proper win screen
// instead of being silently stranded.
NetworkManager.notifyForfeit = function() {
    Object.values(this.connections).forEach(conn => {
        if (conn.open) {
            try {
                conn.send({
                    type: 'GAME_OVER',
                    winnerIsYou: true,
                    reason: 'forfeit'
                });
            } catch (e) { /* swallow — we're leaving anyway */ }
        }
    });
};

// Treat any mid-battle close as a forfeit by the remote side.
function _watchConnectionForMidBattleClose(conn) {
    if (!conn || conn._bcCloseWatched) return;
    conn._bcCloseWatched = true;
    conn.on('close', () => {
        // currentState and GAME_STATE are `let`/`const` in globals.js/config.js — they're
        // in scope here at script level (both files load before net-sync.js), but they
        // don't attach to `window`, so we access them via their bare names.
        const inBattle = typeof currentBattleRoom !== 'undefined' && !!currentBattleRoom;
        const notOver = typeof currentState !== 'undefined'
            && typeof GAME_STATE !== 'undefined'
            && currentState !== GAME_STATE.GAMEOVER;
        console.log('[GAME-OVER-DIAG v9.36] connection close: inBattle=' + inBattle + ' notOver=' + notOver + ' — will force forfeit=' + (inBattle && notOver));
        if (inBattle && notOver && typeof handleNetworkGameOver === 'function') {
            handleNetworkGameOver({ winnerIsYou: true, reason: 'forfeit' });
        }
    });
}
NetworkManager._watchConnectionForMidBattleClose = _watchConnectionForMidBattleClose;

// Connect to another player's code (pure 3-digit number) and send an invite.
NetworkManager.joinRoom = function(roomCode) {
    if (!this.peer) {
        if (typeof showTransientToast === 'function') {
            showTransientToast("החיבור לרשת עדיין לא מוכן - נסה שוב בעוד רגע");
        }
        return;
    }

    // Normalise whatever the user typed into a 3-digit string. Accept either the
    // raw digits or — for backwards compat with anyone still sharing the old
    // "BC-123" style — strip a leading "BC-" prefix before padding.
    let targetId = (roomCode || '').trim().toUpperCase().replace(/^BC-/, '');
    targetId = targetId.replace(/\D/g, '');
    if (targetId.length === 0) return;
    if (targetId.length < 3) targetId = targetId.padStart(3, '0');

    if (targetId === this.peer.id) {
        if (typeof showTransientToast === 'function') {
            showTransientToast("זה הקוד שלך! שלח אותו לחבר כדי שיוכל להזמין אותך.");
        } else {
            console.warn("זה הקוד שלך!");
        }
        return;
    }

    console.log("📡 Attempting to connect to " + targetId);
    const conn = this.peer.connect(targetId, { reliable: true });

    const failTimer = setTimeout(() => {
        if (!conn.open) {
            try { conn.close(); } catch (e) {}
            if (typeof showTransientToast === 'function') {
                showTransientToast("לא הצלחנו להתחבר לקוד " + targetId);
            }
        }
    }, 6000);

    conn.on('open', () => {
        clearTimeout(failTimer);
        const roomId = "ROOM-" + Math.random().toString(36).substr(2, 6).toUpperCase();
        this.connections[conn.peer] = conn;
        NetworkManager._watchConnectionForMidBattleClose(conn);
        conn.send({
            type: 'BATTLE_INVITE',
            sender: this.currentUsername || 'אנונימי',
            roomId: roomId
        });
        console.log("📨 Invite sent to " + targetId + " for room " + roomId);

        // Listen for the response on this outgoing connection too
        conn.on('data', (data) => {
            if (data.type === 'INVITE_ACCEPTED') {
                window.currentBattleRoom = data.roomId;
                window.isHost = true;
                window.dispatchEvent(new CustomEvent('battleAccepted', {
                    detail: { roomId: data.roomId, opponent: targetId, isHost: true }
                }));
            } else if (data.type === 'INVITE_DECLINED') {
                window.dispatchEvent(new CustomEvent('remoteInviteDeclined'));
            } else if (data.type === 'SYNC_SPAWN') {
                if (typeof handleRemoteSpawn === 'function') handleRemoteSpawn(data);
            } else if (data.type === 'GAME_OVER') {
                if (typeof handleNetworkGameOver === 'function') handleNetworkGameOver(data);
            } else if (data.type === 'ADMIN_CONFIG') {
                if (typeof handleAdminConfig === 'function') handleAdminConfig(data);
            } else if (data.type === 'EMOTE') {
                if (typeof displayEmote === 'function') displayEmote(data.sender, data.emoteId);
            } else if (data.type === 'RELEASE_FREEZE') {
                if (typeof handleRemoteReleaseFreeze === 'function') handleRemoteReleaseFreeze();
            } else if (data.type === 'SAFE_FIRE') {
                if (typeof handleRemoteSafeFire === 'function') handleRemoteSafeFire(data);
            } else if (data.type === 'SUSPEND_ADMIN') {
                if (typeof handleSuspendAdmin === 'function') handleSuspendAdmin();
            }
        });
    });

    conn.on('error', (err) => {
        clearTimeout(failTimer);
        console.error("📡 Connect error:", err);
    });
};
