// engine-renderer.js - Canvas Drawing Functions

function drawBackground(ctx) {
    if (!ctx) return;
    ctx.save();
    ctx.fillStyle = '#4cd137'; 
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; 
    ctx.lineWidth = 5;
    
    ctx.beginPath(); 
    ctx.moveTo(0, CONFIG.CANVAS_HEIGHT / 2); 
    ctx.lineTo(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT / 2); 
    ctx.stroke();
    
    ctx.beginPath(); 
    ctx.arc(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, 70, 0, Math.PI * 2); 
    ctx.stroke();
    
    ctx.strokeRect(5, 5, CONFIG.CANVAS_WIDTH - 10, CONFIG.CANVAS_HEIGHT - 10);
    ctx.restore();
}

function draw(ctx) {
    ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    
    ctx.save();
    if (screenShakeTime > 0) {
        ctx.translate((Math.random() - 0.5) * screenShakeIntensity, (Math.random() - 0.5) * screenShakeIntensity);
    }
    
    drawBackground(ctx);
    
    const entities = [...auras, ...buildings, ...units, ...projectiles, ...floatingTexts, ...particles];
    if (playerSafe) entities.push(playerSafe);
    if (enemySafe) entities.push(enemySafe);

    entities.forEach(e => {
        try {
            if (e && typeof e.draw === 'function') e.draw(ctx);
        } catch (err) {
            console.error("Error drawing entity:", e, err);
        }
    });
    
    ctx.restore();

    if (currentState === GAME_STATE.PLAYING && (selectedCardId || selectedFreezeCardId)) {
        drawGhost(ctx);
    }
}
