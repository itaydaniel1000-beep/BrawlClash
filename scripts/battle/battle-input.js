// battle-input.js - Canvas Interaction and Ghost Rendering

// The canvas element is stretched to fill its container (no letterbox), so
// every pixel of the rendered element corresponds directly to a scaled pixel
// of the 600×900 internal buffer. Direct proportional mapping is enough.
function clientToCanvasCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
    };
}

// --- Long-press = continuous Shift-placement (touch + mouse) --------------
// Tapping places once (normal behaviour). Holding the pointer down while a
// card is selected *keeps the card selected* for the duration of the hold,
// repeatedly placing it at the current pointer position whenever the player
// can afford it. Releasing ends the hold and deselects the card.
const LONG_PRESS_MS = 400;      // first auto-repeat delay
const AUTO_REPEAT_MS = 250;     // subsequent auto-repeat cadence
let autoPlaceTimer = null;      // setTimeout handle for next auto-repeat
let lastPointerPos = null;      // { x, y } internal coords, tracked via pointermove
let isLongPressing = false;     // set once the 400 ms threshold is crossed

function _selectCard(cardId) {
    if (!cardId || !CARDS[cardId]) return;
    if (selectedCardId === cardId) return;
    selectedCardId = cardId;
    selectedFreezeCardId = null;
    document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
    const el = document.getElementById(`card-${cardId}`);
    if (el) el.classList.add('selected');
}

function _placeAtInternal(x, y, shiftHeld) {
    // Admin "delete enemy unit" toggle — consume the click, remove the clicked
    // enemy entity (unit / building / aura), and STAY ARMED. The 🗑️ button
    // itself is the toggle — tap it again to disarm.
    if (typeof isSelectingDeleteTarget !== 'undefined' && isSelectingDeleteTarget) {
        const candidates = units.concat(buildings, auras).filter(e =>
            e && e.team === 'enemy' && !e.isDead &&
            Math.hypot((e.x || 0) - x, (e.y || 0) - y) <= ((e.radius || 15) + 20));
        if (candidates.length) {
            candidates.sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
            const victim = candidates[0];
            victim.isDead = true;
            victim.hp = 0;
            if (typeof showTransientToast === 'function') showTransientToast('🗑️ הדמות נמחקה');
            // P2P: the enemy we just killed is the OPPONENT's player-team unit
            // on their screen. Without this broadcast the unit only dies in
            // our local sim and they keep fighting with what looks (to them)
            // like a still-alive unit.
            try {
                if (typeof currentBattleRoom !== 'undefined' && currentBattleRoom &&
                    window.NetworkManager && typeof window.NetworkManager.broadcastDeleteUnit === 'function') {
                    window.NetworkManager.broadcastDeleteUnit(
                        victim.x, victim.y, victim.type || null, victim.radius || 20
                    );
                }
            } catch (e) { /* ignore — local kill already happened */ }
        }
        // Mode stays armed — user clicks the 🗑️ button again to disarm.
        return { placed: false };
    }

    if (isSelectingBullDash) {
        let clickedBull = units.find(u => u.team === 'player' && u.type === 'bull' && !u.hasDashed && Math.hypot(u.x - x, u.y - y) <= u.radius * 2);
        if (clickedBull) {
            clickedBull.triggerDash(performance.now());
            // P2P: tell the opponent to dash the same bull on their side
            // (it's `team='enemy'` over there, otherwise it just walks).
            try {
                if (typeof currentBattleRoom !== 'undefined' && currentBattleRoom &&
                    window.NetworkManager && typeof window.NetworkManager.broadcastBullDash === 'function') {
                    window.NetworkManager.broadcastBullDash(clickedBull.x, clickedBull.y);
                }
            } catch (e) { /* ignore — local dash already fired */ }
            const moreBullsAvailable = units.some(u => u.team === 'player' && u.type === 'bull' && !u.hasDashed);
            if (!moreBullsAvailable) {
                isSelectingBullDash = false;
                const dashBtn = document.getElementById('bull-dash-btn');
                if (dashBtn) dashBtn.style.backgroundColor = '#8c7ae6';
            }
        }
        return { placed: false };
    }

    // Amber path mode — every click adds a waypoint instead of placing a unit.
    // After 6 waypoints we auto-commit (spawn Amber at waypoints[0] and walk
    // through the rest). The 🎯 button can also be tapped a second time to
    // commit early with however many waypoints exist.
    if (typeof isSelectingAmberPath !== 'undefined' && isSelectingAmberPath) {
        // Caps only apply to AMBER (her balance leash). Every other walking
        // unit (bruce / leon / bull) gets unlimited waypoints with no
        // per-step distance cap, per user request.
        const isAmber = (_pendingPathCardId === 'amber');
        if (isAmber) {
            if (_amberPendingPath.length < 6) {
                const SQUARE_PX = 50;
                const MAX_STEP_PX = SQUARE_PX * 5; // 250
                if (_amberPendingPath.length > 0) {
                    const prev = _amberPendingPath[_amberPendingPath.length - 1];
                    const d = Math.hypot(x - prev.x, y - prev.y);
                    if (d > MAX_STEP_PX) {
                        if (typeof showTransientToast === 'function') {
                            showTransientToast('🎯 הצעד רחוק מדי — מקסימום 5 משבצות מהנקודה הקודמת');
                        }
                        return { placed: false };
                    }
                }
                _amberPendingPath.push({ x, y });
            }
            if (_amberPendingPath.length >= 6) {
                commitAmberPath();
            }
        } else {
            // Non-Amber walking units: unlimited waypoints, no distance cap.
            _amberPendingPath.push({ x, y });
        }
        return { placed: false };
    }

    // Each side places only on its own half of the field (or inside an EMZ
    // aura their team owns). For the local human the player side is the
    // BOTTOM half (y > height/2).
    const bottomHalf = y > (CONFIG.CANVAS_HEIGHT / 2);
    const insideOwnEmz = auras.some(a => a.team === 'player' && a.type === 'emz' && !a.isFrozen && Math.hypot(x - a.x, y - a.y) <= a.radius);
    const validSide = bottomHalf || insideOwnEmz;
    const insideBorder = x >= 10 && x <= (CONFIG.CANVAS_WIDTH - 10) &&
                         y >= 10 && y <= (CONFIG.CANVAS_HEIGHT - 10);

    if (selectedFreezeCardId) {
        const freezeCard = CARDS[selectedFreezeCardId];
        const canAffordFreeze = playerElixir >= (freezeCard.cost - 0.01) || adminHacks.infiniteElixir || adminHacks.freeCards;
        if (!canAffordFreeze) return { placed: false };
        if (!validSide || !insideBorder) return { placed: false };

        const freezeToContinue = selectedFreezeCardId;
        spawnEntity(x, y, 'player', selectedFreezeCardId, true);
        if (shiftHeld) {
            // Mirror the regular-card path: while shift is held (or we're in
            // a long-press) keep the freeze card selected so successive clicks
            // / auto-repeat ticks keep placing freeze units.
            selectedFreezeCardId = freezeToContinue;
        } else {
            selectedFreezeCardId = null;
            document.querySelectorAll('.card').forEach(c => c.style.boxShadow = 'none');
        }
        return { placed: true, cardId: freezeToContinue, isFreeze: true };
    }

    if (!selectedCardId) return { placed: false };

    const card = CARDS[selectedCardId];
    const canAfford = playerElixir >= (card.cost - 0.01) || adminHacks.infiniteElixir || adminHacks.freeCards;
    if (!canAfford) return { placed: false };

    if (validSide && insideBorder) {
        const cardToContinue = selectedCardId;
        spawnEntity(x, y, 'player', selectedCardId);

        if (shiftHeld) {
            selectedCardId = cardToContinue;
            document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
            const cardEl = document.getElementById(`card-${cardToContinue}`);
            if (cardEl) cardEl.classList.add('selected');
        } else {
            selectedCardId = null;
            document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
        }
        return { placed: true, cardId: cardToContinue };
    }
    return { placed: false };
}

function _placeAt(clientX, clientY, shiftHeld) {
    const pt = clientToCanvasCoords(clientX, clientY);
    lastPointerPos = pt;
    return _placeAtInternal(pt.x, pt.y, shiftHeld);
}

// === Path-mode controls (generic over any walking unit) ===================
// Wired to the 🎯 button (#amber-path-btn) and the auto-commit fired when
// Amber's 6th waypoint lands. Works for every CARDS entry whose `type ===
// 'unit'` (bruce / leon / bull / amber — porter is summon-only and isn't
// a placeable card). Buildings and auras don't show the button at all.
function _isWalkingCard(cardId) {
    const c = cardId && CARDS[cardId];
    return !!(c && c.type === 'unit');
}

function toggleAmberPathMode() {
    if (!_isWalkingCard(selectedCardId)) {
        // Button shouldn't have been clickable; reset just in case.
        isSelectingAmberPath = false;
        _amberPendingPath = [];
        _pendingPathCardId = null;
        return;
    }
    if (isSelectingAmberPath) {
        // Second tap on 🎯 → commit whatever we've got.
        commitAmberPath();
    } else {
        // First tap → enter path mode and lock the card identity so the
        // commit later spawns the right unit even if the player accidentally
        // bumps another card mid-draw.
        isSelectingAmberPath = true;
        _amberPendingPath = [];
        _pendingPathCardId = selectedCardId;
    }
}
window.toggleAmberPathMode = toggleAmberPathMode;

// Spawn the chosen unit at waypoints[0] and assign waypoints[1..N-1] as its
// walking path. Costs the card's elixir cost. If 0 waypoints have been
// placed, just exit path mode silently.
function commitAmberPath() {
    const cardId = _pendingPathCardId || selectedCardId || 'amber';
    const cleanup = () => {
        _amberPendingPath = [];
        isSelectingAmberPath = false;
        _pendingPathCardId = null;
    };
    if (!_amberPendingPath || _amberPendingPath.length === 0) {
        cleanup();
        return;
    }
    const card = CARDS[cardId];
    if (!card) { cleanup(); return; }
    const canAfford = playerElixir >= (card.cost - 0.01) || adminHacks.infiniteElixir || adminHacks.freeCards;
    if (!canAfford) {
        cleanup();
        if (typeof showTransientToast === 'function') showTransientToast('🧪 אין מספיק אליקסיר');
        return;
    }
    // Validate the spawn point — must sit in the player's half (or inside
    // a player-team EMZ aura) like any other player-team unit. Subsequent
    // waypoints can be anywhere; the unit walks across the full board.
    const sp = _amberPendingPath[0];
    const inOwnHalf = sp.y > (CONFIG.CANVAS_HEIGHT / 2);
    const insideOwnEmz = auras.some(a => a.team === 'player' && a.type === 'emz' && !a.isFrozen && Math.hypot(sp.x - a.x, sp.y - a.y) <= a.radius);
    if (!inOwnHalf && !insideOwnEmz) {
        cleanup();
        if (typeof showTransientToast === 'function') showTransientToast('⚠️ נקודת ההצבה חייבת להיות בחצי שלך');
        return;
    }
    const path = _amberPendingPath.slice(1).map(p => ({ x: p.x, y: p.y }));
    // Pass the path through spawnEntity → it gets baked onto the unit
    // inside battle-spawn.js AND piggy-backs on SYNC_SPAWN so the
    // opponent's client renders the same walk in P2P matches.
    spawnEntity(sp.x, sp.y, 'player', cardId, false, false, null, 0, path);
    cleanup();
    selectedCardId = null;
    document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
}
window.commitAmberPath = commitAmberPath;

// Spawn a Bubble at (sx, sy) with launch direction (dirX, dirY) — both
// already normalised (unit vector). Bubble's `speed` field becomes the
// magnitude of `_velocity`. Costs the bubble card's elixir; refuses to
// fire if the player can't afford. Called from handleCanvasRelease when
// a drag-aim sling is released with sufficient drag distance.
function commitBubbleSling(sx, sy, dirX, dirY) {
    const card = CARDS['bubble'];
    if (!card) return;
    const canAfford = playerElixir >= (card.cost - 0.01) || adminHacks.infiniteElixir || adminHacks.freeCards;
    if (!canAfford) {
        if (typeof showTransientToast === 'function') showTransientToast('🧪 אין מספיק אליקסיר לבאבל');
        return;
    }
    spawnEntity(sx, sy, 'player', 'bubble');
    // Find the bubble we just created (last unit pushed) and set its
    // velocity vector. spawnEntity already deducted elixir.
    for (let i = units.length - 1; i >= 0; i--) {
        const u = units[i];
        if (u && u.type === 'bubble' && u.team === 'player' && !u.isDead) {
            const speed = u.speed || 300;
            u._velocity = { x: dirX * speed, y: dirY * speed };
            break;
        }
    }
    // Card stays selected so the player can chain-launch bubbles. Drag
    // again to fire another. Picking a different card / pressing Esc
    // clears it normally.
}
window.commitBubbleSling = commitBubbleSling;

function _scheduleAutoRepeat(cardId, delay, isFreeze) {
    clearTimeout(autoPlaceTimer);
    autoPlaceTimer = setTimeout(() => {
        // If release fired while we were waiting, the timer's already cleared.
        if (!autoPlaceTimer) return;
        if (!CARDS[cardId]) { autoPlaceTimer = null; return; }

        // Crossing the LONG_PRESS_MS threshold flips us into long-press mode.
        // The card is KEPT SELECTED for the entire hold — even while the
        // player is out of elixir — so placements resume automatically as
        // soon as the elixir bar refills.
        isLongPressing = true;
        if (isFreeze) {
            // Re-arm the freeze placement; clear any non-freeze selection.
            selectedFreezeCardId = cardId;
            selectedCardId = null;
        } else {
            _selectCard(cardId);
        }

        const pos = lastPointerPos;
        if (pos) {
            // Pass shiftHeld=true so a successful placement doesn't deselect
            // the card mid-hold — the selection must stay stable throughout.
            _placeAtInternal(pos.x, pos.y, /* shiftHeld */ true);
        }

        // Keep scheduling as long as the pointer is held. We only stop inside
        // handleCanvasRelease (or if the card disappears from CARDS).
        _scheduleAutoRepeat(cardId, AUTO_REPEAT_MS, isFreeze);
    }, delay);
}

function handleCanvasPress(e) {
    if (!canvas) return;
    e.preventDefault();

    // Bubble drag-aim: when the bubble card is held, every press starts a
    // sling-aim drag instead of placing a unit. The press point is the
    // anchor (where the bubble will spawn); the drag direction at release
    // becomes the launch velocity. No long-press auto-repeat for bubble.
    if (selectedCardId === 'bubble') {
        const pt = clientToCanvasCoords(e.clientX, e.clientY);
        // Anchor must sit in the player's half (or inside an own EMZ aura).
        const inOwnHalf = pt.y > (CONFIG.CANVAS_HEIGHT / 2);
        const insideOwnEmz = auras.some(a => a.team === 'player' && a.type === 'emz' && !a.isFrozen && Math.hypot(pt.x - a.x, pt.y - a.y) <= a.radius);
        const insideBorder = pt.x >= 10 && pt.x <= (CONFIG.CANVAS_WIDTH - 10) &&
                             pt.y >= 10 && pt.y <= (CONFIG.CANVAS_HEIGHT - 10);
        if ((inOwnHalf || insideOwnEmz) && insideBorder) {
            _bubbleDragging = true;
            _bubbleAnchor   = { x: pt.x, y: pt.y };
            _bubbleCurrent  = { x: pt.x, y: pt.y };
        }
        return;
    }

    // Capture which card was held BEFORE placement (the place call may clear
    // it). Either a normal card or a freeze card — auto-repeat needs to know
    // which kind it is so it can re-arm the right slot on every tick.
    const cardBeforePlace = selectedCardId || selectedFreezeCardId;
    const wasFreeze = !!selectedFreezeCardId;
    const res = _placeAt(e.clientX, e.clientY, !!e.shiftKey);

    // Start the long-press timer. If it fires while the pointer is still
    // down, we enter long-press mode: the card stays selected throughout
    // and is placed repeatedly at the pointer's current position.
    clearTimeout(autoPlaceTimer);
    autoPlaceTimer = null;
    isLongPressing = false;
    if (res && cardBeforePlace && !e.shiftKey) {
        _scheduleAutoRepeat(cardBeforePlace, LONG_PRESS_MS, wasFreeze);
    }
}

function handleCanvasRelease() {
    // Bubble drag-aim release: launch the bubble in the drag direction at
    // base speed. Min drag of 12 px to filter accidental taps.
    if (_bubbleDragging) {
        _bubbleDragging = false;
        const dx = _bubbleCurrent.x - _bubbleAnchor.x;
        const dy = _bubbleCurrent.y - _bubbleAnchor.y;
        const dragDist = Math.hypot(dx, dy);
        if (dragDist >= 12) {
            commitBubbleSling(_bubbleAnchor.x, _bubbleAnchor.y, dx / dragDist, dy / dragDist);
        }
        return;
    }

    clearTimeout(autoPlaceTimer);
    autoPlaceTimer = null;
    if (isLongPressing) {
        // Long-press ended — the card (regular or freeze) was held during
        // the press and should now be released, mirroring keyboard Shift
        // being lifted. Clear BOTH selection slots so a freeze long-press
        // also deselects cleanly.
        isLongPressing = false;
        selectedCardId = null;
        selectedFreezeCardId = null;
        document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
        document.querySelectorAll('.card').forEach(c => c.style.boxShadow = 'none');
    }
}

function handleCanvasPointerMove(e) {
    if (!canvas) return;
    const pt = clientToCanvasCoords(e.clientX, e.clientY);
    lastPointerPos = pt;
    mouseX = pt.x;
    mouseY = pt.y;
    // Bubble drag-aim: track the moving end of the sling so the dashed
    // arrow follows the pointer in the renderer preview.
    if (_bubbleDragging) {
        _bubbleCurrent = { x: pt.x, y: pt.y };
    }
}

// Back-compat wrapper — other code still references `handleCanvasClick`.
function handleCanvasClick(e) { return handleCanvasPress(e); }

function handleMouseMove(e) {
    if (!canvas) return;
    const { x, y } = clientToCanvasCoords(e.clientX, e.clientY);
    mouseX = x;
    mouseY = y;
}

function drawGhost(ctx) {
    const cardKey = selectedCardId || selectedFreezeCardId;
    const card = CARDS[cardKey];
    if (!card) return;

    // Bubble has its own drag-aim sling preview in engine-renderer.js.
    // Skip the standard pointer-following ghost so we don't double-draw.
    if (cardKey === 'bubble') return;

    ctx.save();
    ctx.globalAlpha = 0.4;

    // Match the placement rule in _placeAtInternal — player's side is the
    // bottom half of the field (plus anywhere inside an own-team EMZ aura).
    const insideBorder = mouseX >= 10 && mouseX <= (CONFIG.CANVAS_WIDTH - 10) &&
                         mouseY >= 10 && mouseY <= (CONFIG.CANVAS_HEIGHT - 10);
    const bottomHalf = mouseY > (CONFIG.CANVAS_HEIGHT / 2);
    const insideOwnEmz = auras.some(a => a.team === 'player' && a.type === 'emz' && !a.isFrozen && Math.hypot(mouseX - a.x, mouseY - a.y) <= a.radius);
    let valid = insideBorder && (bottomHalf || insideOwnEmz);

    // For any card with a custom pixel-art sprite (amber, bruce, ...),
    // draw the sprite inside a faintly-tinted placement halo so the
    // ghost matches the on-field unit. Every other card keeps the
    // emoji-on-coloured-circle ghost.
    const hasCustomSprite = (typeof _CUSTOM_SPRITES !== 'undefined' &&
                             _CUSTOM_SPRITES[cardKey] &&
                             typeof _drawCustomSprite === 'function');
    if (hasCustomSprite) {
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 30, 0, Math.PI * 2);
        ctx.fillStyle = valid ? 'rgba(255,255,255,0.18)' : 'rgba(231, 76, 60, 0.4)';
        ctx.fill();
        ctx.strokeStyle = valid ? '#fff' : '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        _drawCustomSprite(ctx, cardKey, mouseX, mouseY, 'player', false, false);
    } else {
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 30, 0, Math.PI * 2);
        ctx.fillStyle = valid ? card.color : 'rgba(231, 76, 60, 0.5)';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(card.icon, mouseX, mouseY);
    }

    if (selectedFreezeCardId) {
        ctx.strokeStyle = '#74b9ff';
        ctx.lineWidth = 4;
        ctx.stroke();
    }
    ctx.restore();
}
