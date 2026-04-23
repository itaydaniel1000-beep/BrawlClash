// engine-renderer.js - Canvas Drawing Functions

function drawBackground(ctx) {
    if (!ctx) return;
    
    // Safety check for globals
    const width = (typeof CONFIG !== 'undefined' ? CONFIG.CANVAS_WIDTH : 600) || 600;
    const height = (typeof CONFIG !== 'undefined' ? CONFIG.CANVAS_HEIGHT : 900) || 900;
    
    ctx.save();

    // Background + checkerboard + emoji details removed — the user wanted the
    // whole green field gone, leaving only the white map border, center line,
    // and center circle. The canvas itself has a transparent background (see
    // game.css), so anything we don't draw here falls through to the container.

    // White Field Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'; 
    ctx.lineWidth = 4;
    
    // Center Line
    ctx.beginPath(); 
    ctx.moveTo(0, height / 2); 
    ctx.lineTo(width, height / 2); 
    ctx.stroke();
    
    // Center Circle
    ctx.beginPath(); 
    ctx.arc(width / 2, height / 2, 70, 0, Math.PI * 2); 
    ctx.stroke();
    
    // Outer Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.strokeRect(10, 10, width - 20, height - 20);
    
    ctx.restore();
}

function draw(ctx) {
    if (!ctx) return;
    const width = (typeof CONFIG !== 'undefined' ? CONFIG.CANVAS_WIDTH : 600) || 600;
    const height = (typeof CONFIG !== 'undefined' ? CONFIG.CANVAS_HEIGHT : 900) || 900;

    ctx.clearRect(0, 0, width, height);
    
    ctx.save();
    if (typeof screenShakeTime !== 'undefined' && screenShakeTime > 0) {
        ctx.translate((Math.random() - 0.5) * screenShakeIntensity, (Math.random() - 0.5) * screenShakeIntensity);
    }
    
    drawBackground(ctx);
    
    // Safety collect
    let drawables = [];
    try {
        if (typeof auras !== 'undefined') drawables = drawables.concat(auras);
        if (typeof buildings !== 'undefined') drawables = drawables.concat(buildings);
        if (typeof units !== 'undefined') drawables = drawables.concat(units);
        if (typeof projectiles !== 'undefined') drawables = drawables.concat(projectiles);
        
        if (typeof playerSafe !== 'undefined' && playerSafe) drawables.push(playerSafe);
        if (typeof enemySafe !== 'undefined' && enemySafe) drawables.push(enemySafe);
    } catch(e) {}

    drawables.forEach(e => {
        try {
            if (e && !e.isDead && typeof e.draw === 'function') e.draw(ctx);
        } catch (err) {}
    });
    
    ctx.restore();

    if (typeof currentState !== 'undefined' && typeof GAME_STATE !== 'undefined' && currentState === GAME_STATE.PLAYING) {
        if ((typeof selectedCardId !== 'undefined' && selectedCardId) || (typeof selectedFreezeCardId !== 'undefined' && selectedFreezeCardId)) {
            if (typeof drawGhost === 'function') drawGhost(ctx);
        }
    }
}
