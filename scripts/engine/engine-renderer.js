// engine-renderer.js - Canvas Drawing Functions

function drawBackground(ctx) {
    if (!ctx) return;
    ctx.save();
    
    // Draw Grass Base
    ctx.fillStyle = '#4cd137'; 
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    
    // Draw Checkerboard Tiles (High Fidelity)
    const tileSize = 60;
    ctx.fillStyle = '#44bd32'; // Slightly darker green
    for (let y = 0; y < CONFIG.CANVAS_HEIGHT; y += tileSize) {
        for (let x = 0; x < CONFIG.CANVAS_WIDTH; x += tileSize) {
            if ((Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0) {
                ctx.fillRect(x, y, tileSize, tileSize);
            }
        }
    }

    // Add some random details (Grass tufts / Flowers)
    const seed = 12345; // Static seed for consistency
    const seededRandom = (s) => {
        const x = Math.sin(s) * 10000;
        return x - Math.floor(x);
    };

    ctx.font = '14px Arial';
    for (let i = 0; i < 40; i++) {
        const rx = seededRandom(i * 13) * CONFIG.CANVAS_WIDTH;
        const ry = seededRandom(i * 17) * CONFIG.CANVAS_HEIGHT;
        const type = seededRandom(i * 19);
        
        ctx.globalAlpha = 0.3;
        if (type > 0.8) {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(rx, ry, 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.strokeStyle = '#2d3436';
            ctx.beginPath();
            ctx.moveTo(rx, ry);
            ctx.lineTo(rx - 2, ry - 4);
            ctx.moveTo(rx, ry);
            ctx.lineTo(rx + 2, ry - 4);
            ctx.stroke();
        }
    }
    ctx.globalAlpha = 1.0;

    // Center area and lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; 
    ctx.lineWidth = 4;
    
    // Center Line
    ctx.beginPath(); 
    ctx.moveTo(0, CONFIG.CANVAS_HEIGHT / 2); 
    ctx.lineTo(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT / 2); 
    ctx.stroke();
    
    // Center Circle
    ctx.beginPath(); 
    ctx.arc(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, 80, 0, Math.PI * 2); 
    ctx.stroke();
    
    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
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
