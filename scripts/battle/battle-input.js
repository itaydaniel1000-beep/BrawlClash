// battle-input.js - Canvas Interaction and Ghost Rendering

// The <canvas> is styled with `object-fit: contain` (game.css), which letterboxes
// its internal buffer inside the rendered element box when the element's aspect
// ratio differs from the canvas's 2:3. Naive `(clientX - rect.left) * (canvas.width
// / rect.width)` produces wrong coordinates inside those letterbox bars — the unit
// ends up offset from where the cursor actually is. This helper computes the
// real drawn-content box and maps from screen coords into the canvas's 600×900
// internal space correctly.
function clientToCanvasCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const canvasAspect = canvas.width / canvas.height;   // 600/900 = 2/3
    const rectAspect = rect.width / rect.height;

    let contentW, contentH, contentLeft, contentTop;
    if (rectAspect > canvasAspect) {
        // Rendered element is wider than the content — letterbox bars on left/right
        contentH = rect.height;
        contentW = rect.height * canvasAspect;
        contentLeft = rect.left + (rect.width - contentW) / 2;
        contentTop = rect.top;
    } else {
        // Rendered element is taller — letterbox bars on top/bottom
        contentW = rect.width;
        contentH = rect.width / canvasAspect;
        contentLeft = rect.left;
        contentTop = rect.top + (rect.height - contentH) / 2;
    }
    return {
        x: (clientX - contentLeft) * (canvas.width / contentW),
        y: (clientY - contentTop) * (canvas.height / contentH)
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
    if (isSelectingBullDash) {
        let clickedBull = units.find(u => u.team === 'player' && u.type === 'bull' && !u.hasDashed && Math.hypot(u.x - x, u.y - y) <= u.radius * 2);
        if (clickedBull) {
            clickedBull.triggerDash(performance.now());
            const moreBullsAvailable = units.some(u => u.team === 'player' && u.type === 'bull' && !u.hasDashed);
            if (!moreBullsAvailable) {
                isSelectingBullDash = false;
                const dashBtn = document.getElementById('bull-dash-btn');
                if (dashBtn) dashBtn.style.backgroundColor = '#8c7ae6';
            }
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
        const canAffordFreeze = playerElixir >= (freezeCard.cost - 0.01) || adminHacks.infiniteElixir;
        if (!canAffordFreeze) return { placed: false };
        if (!validSide || !insideBorder) return { placed: false };

        spawnEntity(x, y, 'player', selectedFreezeCardId, true);
        selectedFreezeCardId = null;
        document.querySelectorAll('.card').forEach(c => c.style.boxShadow = 'none');
        return { placed: true };
    }

    if (!selectedCardId) return { placed: false };

    const card = CARDS[selectedCardId];
    const canAfford = playerElixir >= (card.cost - 0.01) || adminHacks.infiniteElixir;
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

function _scheduleAutoRepeat(cardId, delay) {
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
        _selectCard(cardId);

        const pos = lastPointerPos;
        if (pos) {
            // Pass shiftHeld=true so a successful placement doesn't deselect
            // the card mid-hold — the selection must stay stable throughout.
            _placeAtInternal(pos.x, pos.y, /* shiftHeld */ true);
        }

        // Keep scheduling as long as the pointer is held. We only stop inside
        // handleCanvasRelease (or if the card disappears from CARDS).
        _scheduleAutoRepeat(cardId, AUTO_REPEAT_MS);
    }, delay);
}

function handleCanvasPress(e) {
    if (!canvas) return;
    e.preventDefault();

    const cardBeforePlace = selectedCardId;
    const res = _placeAt(e.clientX, e.clientY, !!e.shiftKey);

    // Start the long-press timer. If it fires while the pointer is still
    // down, we enter long-press mode: the card stays selected throughout
    // and is placed repeatedly at the pointer's current position.
    clearTimeout(autoPlaceTimer);
    autoPlaceTimer = null;
    isLongPressing = false;
    if (res && cardBeforePlace && !e.shiftKey) {
        _scheduleAutoRepeat(cardBeforePlace, LONG_PRESS_MS);
    }
}

function handleCanvasRelease() {
    clearTimeout(autoPlaceTimer);
    autoPlaceTimer = null;
    if (isLongPressing) {
        // Long-press ended — the card was held during the press and should
        // now be released (deselected), mirroring keyboard Shift being lifted.
        isLongPressing = false;
        selectedCardId = null;
        document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
    }
}

function handleCanvasPointerMove(e) {
    if (!canvas) return;
    const pt = clientToCanvasCoords(e.clientX, e.clientY);
    lastPointerPos = pt;
    mouseX = pt.x;
    mouseY = pt.y;
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

    ctx.save();
    ctx.globalAlpha = 0.4;

    // Match the placement rule in _placeAtInternal — player's side is the
    // bottom half of the field (plus anywhere inside an own-team EMZ aura).
    const insideBorder = mouseX >= 10 && mouseX <= (CONFIG.CANVAS_WIDTH - 10) &&
                         mouseY >= 10 && mouseY <= (CONFIG.CANVAS_HEIGHT - 10);
    const bottomHalf = mouseY > (CONFIG.CANVAS_HEIGHT / 2);
    const insideOwnEmz = auras.some(a => a.team === 'player' && a.type === 'emz' && !a.isFrozen && Math.hypot(mouseX - a.x, mouseY - a.y) <= a.radius);
    let valid = insideBorder && (bottomHalf || insideOwnEmz);

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

    if (selectedFreezeCardId) {
        ctx.strokeStyle = '#74b9ff';
        ctx.lineWidth = 4;
        ctx.stroke();
    }
    ctx.restore();
}
