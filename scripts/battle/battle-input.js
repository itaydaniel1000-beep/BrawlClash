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

function handleCanvasClick(e) {
    if (!canvas) return;
    e.preventDefault();
    const { x, y } = clientToCanvasCoords(e.clientX, e.clientY);
    const shiftHeld = e.shiftKey;

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

    if (selectedFreezeCardId) {
        const freezeCard = CARDS[selectedFreezeCardId];
        const canAffordFreeze = playerElixir >= (freezeCard.cost - 0.01) || adminHacks.infiniteElixir;
        if (!canAffordFreeze) return; // Not enough elixir — can't place

        let valid = y > (CONFIG.CANVAS_HEIGHT / 2) || auras.some(a => a.team === 'player' && a.type === 'emz' && !a.isFrozen && Math.hypot(x - a.x, y - a.y) <= a.radius);
        if (!valid) return;

        spawnEntity(x, y, 'player', selectedFreezeCardId, true);
        selectedFreezeCardId = null;
        document.querySelectorAll('.card').forEach(c => c.style.boxShadow = 'none');
        return;
    }

    if (!selectedCardId) return;

    const card = CARDS[selectedCardId];
    const canAfford = playerElixir >= (card.cost - 0.01) || adminHacks.infiniteElixir;
    if (!canAfford) return; // Not enough elixir — can't place

    let valid = y > (CONFIG.CANVAS_HEIGHT / 2) || auras.some(a => a.team === 'player' && a.type === 'emz' && !a.isFrozen && Math.hypot(x - a.x, y - a.y) <= a.radius);

    if (valid) {
        const cardToContinue = selectedCardId;
        spawnEntity(x, y, 'player', selectedCardId);

        if (shiftHeld) {
            // Keep the card selected even if elixir is depleted — it will wait until there's
            // enough elixir for the next placement instead of being auto-deselected.
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

    let valid = mouseY > (CONFIG.CANVAS_HEIGHT / 2) || auras.some(a => a.team === 'player' && a.type === 'emz' && !a.isFrozen && Math.hypot(mouseX - a.x, mouseY - a.y) <= a.radius);

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
