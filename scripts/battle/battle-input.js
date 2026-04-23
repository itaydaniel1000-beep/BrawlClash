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

// --- Long-press = Shift shortcut (touch + mouse) ---------------------------
// Holding the pointer on the canvas for ≥LONG_PRESS_MS after a placement acts
// like Shift was held during the click: the card stays selected so the next
// tap places another of the same unit. Works on both phone (tap-and-hold) and
// desktop (mouse press-and-hold).
let longPressTimer = null;
const LONG_PRESS_MS = 400;

function _retroactivelyReselect(cardId) {
    if (!cardId || !CARDS[cardId]) return;
    if (selectedCardId) return; // either already shift-held or another card was picked
    selectedCardId = cardId;
    document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
    const cardEl = document.getElementById(`card-${cardId}`);
    if (cardEl) cardEl.classList.add('selected');
}

function _placeAt(clientX, clientY, shiftHeld) {
    const { x, y } = clientToCanvasCoords(clientX, clientY);

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
        return;
    }

    // The whole white-bordered field is placeable; spawnEntity clamps near the edge.
    const inMap = x >= 10 && x <= (CONFIG.CANVAS_WIDTH - 10) &&
                  y >= 10 && y <= (CONFIG.CANVAS_HEIGHT - 10);

    if (selectedFreezeCardId) {
        const freezeCard = CARDS[selectedFreezeCardId];
        const canAffordFreeze = playerElixir >= (freezeCard.cost - 0.01) || adminHacks.infiniteElixir;
        if (!canAffordFreeze) return;
        if (!inMap) return;

        spawnEntity(x, y, 'player', selectedFreezeCardId, true);
        selectedFreezeCardId = null;
        document.querySelectorAll('.card').forEach(c => c.style.boxShadow = 'none');
        return;
    }

    if (!selectedCardId) return;

    const card = CARDS[selectedCardId];
    const canAfford = playerElixir >= (card.cost - 0.01) || adminHacks.infiniteElixir;
    if (!canAfford) return;

    if (inMap) {
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
    }
}

function handleCanvasPress(e) {
    if (!canvas) return;
    e.preventDefault();

    // Capture the card selection BEFORE placement so the long-press timer
    // can restore it if the user keeps the pointer pressed past the threshold.
    const cardBeforePlace = selectedCardId;

    _placeAt(e.clientX, e.clientY, !!e.shiftKey);

    // Start (or restart) the long-press timer. If it fires while the user is
    // still pressing, treat it as Shift — re-select the card that was just
    // placed so the next tap places another of the same type.
    clearTimeout(longPressTimer);
    if (cardBeforePlace && !e.shiftKey) {
        longPressTimer = setTimeout(() => {
            _retroactivelyReselect(cardBeforePlace);
            longPressTimer = null;
        }, LONG_PRESS_MS);
    }
}

function handleCanvasRelease() {
    clearTimeout(longPressTimer);
    longPressTimer = null;
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

    // Match the placement rule in handleCanvasClick — anywhere inside the
    // outer white border is a valid spot.
    let valid = mouseX >= 10 && mouseX <= (CONFIG.CANVAS_WIDTH - 10) &&
                mouseY >= 10 && mouseY <= (CONFIG.CANVAS_HEIGHT - 10);

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
