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

    // 3. Field Details (decorative emojis)
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    const detailPoints = [
        {x: 60, y: 60, s: '🌸'}, {x: 540, y: 60, s: '🌸'},
        {x: 60, y: 840, s: '🌿'}, {x: 540, y: 840, s: '🌿'},
        {x: 300, y: 250, s: '🌼'}
    ];
    detailPoints.forEach(p => ctx.fillText(p.s, p.x, p.y));

    // 4. White Field Lines
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

        // Sirius copy-spell highlight — when sirius is held, every enemy
        // entity on the field gets a pulsing purple ring so the player
        // can see exactly which targets are clickable. Only enemies with
        // a CARDS entry (i.e. copyable types) are highlighted; porters /
        // safes / amber-trail are skipped since they can't be cloned.
        if (typeof selectedCardId !== 'undefined' && selectedCardId === 'sirius') {
            const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 220);
            const allEnemies = []
                .concat(typeof units      !== 'undefined' ? units      : [])
                .concat(typeof buildings  !== 'undefined' ? buildings  : [])
                .concat(typeof auras      !== 'undefined' ? auras      : []);
            ctx.save();
            for (const e of allEnemies) {
                if (!e || e.isDead || e.team !== 'enemy') continue;
                const t = e.type;
                if (!t) continue;
                const card = (typeof CARDS !== 'undefined') ? CARDS[t] : null;
                if (!card || card.type === 'spell') continue; // not copyable
                const r = (e.radius || 18) + 6;
                ctx.beginPath();
                ctx.arc(e.x || 0, e.y || 0, r, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(155, 89, 182, ${0.55 + 0.35 * pulse})`;
                ctx.lineWidth = 3;
                ctx.setLineDash([6, 4]);
                ctx.stroke();
                ctx.setLineDash([]);
                // Faint inner fill so the enemy reads as "highlighted" even
                // through dense overlap.
                ctx.beginPath();
                ctx.arc(e.x || 0, e.y || 0, r - 3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(155, 89, 182, ${0.10 + 0.10 * pulse})`;
                ctx.fill();
            }
            ctx.restore();
        }

        // Bubble drag-aim sling preview — pink dashed line from anchor to
        // pointer + a faded bubble preview at the anchor + a red arrow
        // head at the pointer end so the player can see exactly which
        // direction the bubble will launch on release.
        if (typeof _bubbleDragging !== 'undefined' && _bubbleDragging) {
            const ax = _bubbleAnchor.x,  ay = _bubbleAnchor.y;
            const cx = _bubbleCurrent.x, cy = _bubbleCurrent.y;
            const dx = cx - ax, dy = cy - ay;
            const dragLen = Math.hypot(dx, dy);

            ctx.save();

            // Faded bubble at the anchor (where it'll spawn).
            ctx.globalAlpha = 0.5;
            if (typeof _drawCustomSprite === 'function') {
                _drawCustomSprite(ctx, 'bubble', ax, ay, 'player', false, false);
            } else {
                ctx.beginPath();
                ctx.arc(ax, ay, 12, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 105, 180, 0.5)';
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            if (dragLen >= 12) {
                // Dashed sling line from anchor to pointer.
                ctx.strokeStyle = 'rgba(255, 105, 180, 0.9)';
                ctx.lineWidth = 3;
                ctx.setLineDash([8, 5]);
                ctx.beginPath();
                ctx.moveTo(ax, ay);
                ctx.lineTo(cx, cy);
                ctx.stroke();
                ctx.setLineDash([]);

                // Arrow head — small triangle at the pointer end pointing
                // along the drag direction.
                const ang = Math.atan2(dy, dx);
                const ahLen = 14;
                const ahAng = Math.PI / 6;  // 30°
                ctx.fillStyle = '#FF1493';
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx - ahLen * Math.cos(ang - ahAng),
                           cy - ahLen * Math.sin(ang - ahAng));
                ctx.lineTo(cx - ahLen * Math.cos(ang + ahAng),
                           cy - ahLen * Math.sin(ang + ahAng));
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        }
        // Amber path-mode preview — dotted line + numbered orange circles
        // showing the waypoints the player has placed so far. Lets them see
        // the chosen route before committing on the 6th click / 🎯 tap.
        if (typeof isSelectingAmberPath !== 'undefined' && isSelectingAmberPath &&
            typeof _amberPendingPath !== 'undefined' && _amberPendingPath.length > 0) {
            ctx.save();

            // Reachable-area indicator — ONLY for Amber's path (her steps
            // are capped at 5 squares each, so the ring shows the valid
            // next-click zone). Other walking units have no per-step cap,
            // so no indicator. Also hidden once Amber's 6-waypoint cap
            // is reached.
            const isAmberPath = (typeof _pendingPathCardId !== 'undefined' && _pendingPathCardId === 'amber');
            if (isAmberPath && _amberPendingPath.length < 6) {
                const last = _amberPendingPath[_amberPendingPath.length - 1];
                const REACH = 250;
                ctx.beginPath();
                ctx.arc(last.x, last.y, REACH, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(231, 126, 34, 0.10)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(231, 126, 34, 0.85)';
                ctx.lineWidth = 2;
                ctx.setLineDash([6, 4]);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Dotted line connecting waypoints in order.
            if (_amberPendingPath.length >= 2) {
                ctx.strokeStyle = 'rgba(231, 126, 34, 0.85)';
                ctx.lineWidth = 3;
                ctx.setLineDash([10, 6]);
                ctx.beginPath();
                ctx.moveTo(_amberPendingPath[0].x, _amberPendingPath[0].y);
                for (let i = 1; i < _amberPendingPath.length; i++) {
                    ctx.lineTo(_amberPendingPath[i].x, _amberPendingPath[i].y);
                }
                ctx.stroke();
                ctx.setLineDash([]);
            }
            // Numbered circles at each waypoint. The first one (spawn point)
            // is drawn slightly larger and labelled "1" to make it visually
            // obvious where Amber will appear.
            _amberPendingPath.forEach((p, idx) => {
                const r = (idx === 0) ? 14 : 11;
                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.fillStyle = (idx === 0) ? '#e67e22' : '#f39c12';
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 13px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(String(idx + 1), p.x, p.y);
            });
            ctx.restore();
        }

        // Live remaining-path preview for every player-team WALKING UNIT
        // that's already been placed and is mid-walk along a chosen
        // route. Each waypoint the unit hasn't reached yet stays drawn
        // (line + numbered circle) until it arrives. Enemy-team paths
        // are NOT drawn — those waypoints are the opponent's tactical
        // info and shouldn't be exposed to us.
        if (typeof units !== 'undefined') {
            for (const u of units) {
                if (!u || u.isDead || u.team !== 'player') continue;
                if (!u.waypoints || u.waypoints.length === 0) continue;
                const idxFrom = (typeof u._currentWp === 'number') ? u._currentWp : 0;
                if (idxFrom >= u.waypoints.length) continue;

                const remaining = u.waypoints.slice(idxFrom);
                ctx.save();
                // Dotted line: start at Amber's CURRENT position, then through
                // every still-pending waypoint in order, so the visual reflects
                // exactly where she'll travel from this frame onwards.
                ctx.strokeStyle = 'rgba(231, 126, 34, 0.7)';
                ctx.lineWidth = 3;
                ctx.setLineDash([10, 6]);
                ctx.beginPath();
                ctx.moveTo(u.x, u.y);
                for (const wp of remaining) ctx.lineTo(wp.x, wp.y);
                ctx.stroke();
                ctx.setLineDash([]);

                // Numbered circles, numbered by the ORIGINAL index in the
                // chosen path (so the player still recognises "this is
                // step 4 of my plan" even after step 3 is gone).
                remaining.forEach((wp, k) => {
                    const originalIdx = idxFrom + k; // 0-based
                    ctx.beginPath();
                    ctx.arc(wp.x, wp.y, 11, 0, Math.PI * 2);
                    ctx.fillStyle = '#f39c12';
                    ctx.fill();
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 13px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(String(originalIdx + 1), wp.x, wp.y);
                });
                ctx.restore();
            }
        }
    }
}
