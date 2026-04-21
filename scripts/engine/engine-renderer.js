// engine-renderer.js - Canvas Drawing Functions

function drawBackground(ctx) {
    if (!ctx) return;
    const width = CONFIG.CANVAS_WIDTH || 600;
    const height = CONFIG.CANVAS_HEIGHT || 900;
    
    ctx.save();
    
    // 1. Base Grass (Bright Green)
    ctx.fillStyle = '#4cd137'; 
    ctx.fillRect(0, 0, width, height);
    
    // 2. Checkerboard Pattern
    const tileSize = 60;
    ctx.fillStyle = '#44bd32'; // Darker Green
    for (let y = 0; y < height; y += tileSize) {
        for (let x = 0; x < width; x += tileSize) {
            if ((Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0) {
                ctx.fillRect(x, y, tileSize, tileSize);
            }
        }
    }

    // 3. Field Details (Small flowers/grass)
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ffffff';
    // Fixed positions for details to avoid random overhead
    const details = [
        [100, 100], [200, 150], [500, 120], [400, 250], [50, 400],
        [550, 450], [300, 600], [150, 700], [450, 800], [250, 350]
    ];
    details.forEach(p => {
        ctx.beginPath();
        ctx.arc(p[0], p[1], 2, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // 4. White Field Lines (Must draw last to be visible)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'; 
    ctx.lineWidth = 5;
    
    // Center Line
    ctx.beginPath(); 
    ctx.moveTo(0, height / 2); 
    ctx.lineTo(width, height / 2); 
    ctx.stroke();
    
    // Center Circle
    ctx.beginPath(); 
    ctx.arc(width / 2, height / 2, 80, 0, Math.PI * 2); 
    ctx.stroke();
    
    // Outer Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 6;
    ctx.strokeRect(5, 5, width - 10, height - 10);
    
    ctx.restore();
}

function draw(ctx) {
    if (!ctx) return;
    const width = CONFIG.CANVAS_WIDTH || 600;
    const height = CONFIG.CANVAS_HEIGHT || 900;

    ctx.clearRect(0, 0, width, height);
    
    ctx.save();
    if (typeof screenShakeTime !== 'undefined' && screenShakeTime > 0) {
        ctx.translate((Math.random() - 0.5) * screenShakeIntensity, (Math.random() - 0.5) * screenShakeIntensity);
    }
    
    drawBackground(ctx);
    
    // Collect all drawable entities
    let entities = [];
    if (typeof auras !== 'undefined') entities = entities.concat(auras);
    if (typeof buildings !== 'undefined') entities = entities.concat(buildings);
    if (typeof units !== 'undefined') entities = entities.concat(units);
    if (typeof projectiles !== 'undefined') entities = entities.concat(projectiles);
    if (typeof floatingTexts !== 'undefined') entities = entities.concat(floatingTexts);
    if (typeof particles !== 'undefined') entities = entities.concat(particles);
    
    if (typeof playerSafe !== 'undefined' && playerSafe) entities.push(playerSafe);
    if (typeof enemySafe !== 'undefined' && enemySafe) entities.push(enemySafe);

    entities.forEach(e => {
        try {
            if (e && typeof e.draw === 'function') e.draw(ctx);
        } catch (err) {
            // Silently catch drawing errors for single entities
        }
    });
    
    ctx.restore();

    if (typeof currentState !== 'undefined' && currentState === GAME_STATE.PLAYING && (selectedCardId || selectedFreezeCardId)) {
        if (typeof drawGhost === 'function') drawGhost(ctx);
    }
}
