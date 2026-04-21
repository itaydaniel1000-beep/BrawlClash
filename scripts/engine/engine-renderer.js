// engine-renderer.js - Canvas Drawing Functions

function drawBackground(ctx) {
    if (!ctx) return;
    
    // Safety check for globals
    const width = (typeof CONFIG !== 'undefined' ? CONFIG.CANVAS_WIDTH : 600) || 600;
    const height = (typeof CONFIG !== 'undefined' ? CONFIG.CANVAS_HEIGHT : 900) || 900;
    
    ctx.save();
    
    // 1. Base Grass (Bright Green)
    ctx.fillStyle = '#4cd137'; 
    ctx.fillRect(0, 0, width, height);
    
    // 2. Checkerboard Pattern
    const tileSize = 50;
    ctx.fillStyle = '#44bd32'; // Darker Green
    for (let y = 0; y < height; y += tileSize) {
        for (let x = 0; x < width; x += tileSize) {
            if ((Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0) {
                ctx.fillRect(x, y, tileSize, tileSize);
            }
        }
    }

    // 3. Field Details (Fidelity details)
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    const detailPoints = [
        {x: 60, y: 60, s: '🌸'}, {x: 540, y: 60, s: '🌸'},
        {x: 60, y: 840, s: '🌿'}, {x: 540, y: 840, s: '🌿'},
        {x: 300, y: 250, s: '🌼'}
    ];
    detailPoints.forEach(p => ctx.fillText(p.s, p.x, p.y));

    // 4. White Field Lines (Ultra Robust)
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
