// battle-logic.js - Combat Spawning and Interaction

function spawnEntity(x, y, team, typeStr, isFrozen = false, isRemote = false) {
    if (team === 'player' && currentBattleRoom && !isRemote) {
        if (window.NetworkManager) {
            window.NetworkManager.syncSpawn(currentBattleRoom, x, y, typeStr);
        }
    }

    x = Math.max(20, Math.min(CONFIG.CANVAS_WIDTH - 20, x));
    y = Math.max(20, Math.min(CONFIG.CANVAS_HEIGHT - 20, y));

    if (team === 'enemy') {
        let boundary = CONFIG.CANVAS_HEIGHT / 2;
        if (y > boundary) {
            let insideEmz = auras.some(a => a.team === 'enemy' && a.type === 'emz' && !a.isFrozen && Math.hypot(x - a.x, y - a.y) <= a.radius);
            if (!insideEmz) y = boundary - 10; 
        }
    }

    let card = CARDS[typeStr];
    if (team === 'player' && !adminHacks.infiniteElixir) {
        playerElixir -= card.cost;
    } else if (team === 'enemy' && !currentBattleRoom) {
        enemyElixir -= card.cost;
    }

    let entity;
    if (card.type === 'unit') {
        entity = new Unit(x, y, 15, team, typeStr);
        if (team === 'player') {
            if (adminHacks.doubleDamage) entity.attackDamage *= 2;
            if (adminHacks.superSpeed) {
                entity.speed *= 2;
                entity.attackSpeed /= 2;
            }
        }
        units.push(entity);
    } else if (card.type === 'building') {
        entity = new Building(x, y, team, typeStr);
        if (team === 'player' && adminHacks.doubleDamage) entity.attackDamage *= 2;
        buildings.push(entity);
    } else if (card.type === 'aura') {
        entity = new Aura(x, y, team, typeStr);
        if (team === 'player' && adminHacks.doubleDamage) entity.attackDamage *= 1.5; // Aura damage buff
        auras.push(entity);

        if (typeStr === 'pam' && team === 'player' && playerStarPowers['pam'] === 'sp1') {
            let allies = units.concat(buildings, auras).concat([playerSafe, enemySafe].filter(s => s)).filter(e => e && e.team === team && !e.isDead);
            allies.forEach(a => {
                if (Math.hypot(a.x - x, a.y - y) <= entity.radius) {
                    a.hp = Math.min(a.maxHp, a.hp + 500);
                }
            });
        }
    }

    if (isFrozen) entity.isFrozen = true;
    AudioController.play('spawn');

    if (difficulty === 'hard' && team === 'enemy' && !currentBattleRoom) {
        entity.maxHp *= 1.3;
        entity.hp = entity.maxHp;
        if (entity.attackDamage !== undefined) entity.attackDamage *= 0.8;
    }
}

function handleCanvasClick(e) {
    if (!canvas) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const shiftHeld = e.shiftKey;

    if (isSelectingBullDash) {
        let clickedBull = units.find(u => u.team === 'player' && u.type === 'bull' && !u.hasDashed && Math.hypot(u.x - x, u.y - y) <= u.radius * 2);
        if (clickedBull) {
            clickedBull.triggerDash(performance.now());
            // Auto-deactivate if no more bulls can dash
            const moreBullsAvailable = units.some(u => u.team === 'player' && u.type === 'bull' && !u.hasDashed);
            if (!moreBullsAvailable) {
                isSelectingBullDash = false;
                const dashBtn = document.getElementById('bull-dash-btn');
                if (dashBtn) dashBtn.style.backgroundColor = '#8c7ae6'; // Reset to default purple
            }
        }
        return;
    }

    if (selectedFreezeCardId) {
        let valid = y > (CONFIG.CANVAS_HEIGHT / 2) || auras.some(a => a.team === 'player' && a.type === 'emz' && !a.isFrozen && Math.hypot(x - a.x, y - a.y) <= a.radius);
        if (!valid) return;

        spawnEntity(x, y, 'player', selectedFreezeCardId, true);
        selectedFreezeCardId = null;
        document.querySelectorAll('.card').forEach(c => c.style.boxShadow = 'none');
        return;
    }

    if (!selectedCardId) return;

    let valid = y > (CONFIG.CANVAS_HEIGHT / 2) || auras.some(a => a.team === 'player' && a.type === 'emz' && !a.isFrozen && Math.hypot(x - a.x, y - a.y) <= a.radius);

    if (valid) {
        const cardToContinue = selectedCardId; 
        spawnEntity(x, y, 'player', selectedCardId);

        if (shiftHeld) {
            const canAffordNext = playerElixir >= (CARDS[cardToContinue].cost - 0.01) || adminHacks.infiniteElixir;
            if (canAffordNext) {
                selectedCardId = cardToContinue;
                const cardEl = document.getElementById(`card-${cardToContinue}`);
                if (cardEl) cardEl.classList.add('selected');
            } else {
                selectedCardId = null;
                document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
            }
        } else {
            selectedCardId = null;
            document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
        }
    }
}

function handleMouseMove(e) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top) * scaleY;
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

function buildDeck() {
    const dashBtn = document.getElementById('bull-dash-btn');
    if (dashBtn) {
        document.body.appendChild(dashBtn);
        dashBtn.style.display = 'none';
    }

    const left = document.getElementById('deck-left');
    const right = document.getElementById('deck-right');
    const center = document.getElementById('deck-center');
    
    if (left) left.innerHTML = '';
    if (right) right.innerHTML = '';
    if (center) center.innerHTML = '';

    let releaseBtn = document.createElement('button');
    releaseBtn.id = 'release-freeze-btn';
    releaseBtn.innerText = 'שחרור פריז';
    releaseBtn.style.display = 'none';
    releaseBtn.style.backgroundColor = '#0984e3';
    releaseBtn.style.color = 'white';
    releaseBtn.style.border = '2px solid white';
    releaseBtn.style.borderRadius = '8px';
    releaseBtn.style.padding = '10px';
    releaseBtn.style.fontFamily = "'Fredoka One', cursive";
    releaseBtn.style.cursor = 'pointer';
    releaseBtn.style.boxShadow = '0 4px #74b9ff';
    releaseBtn.onclick = (e) => {
        e.stopPropagation();
        [...units, ...buildings, ...auras].forEach(ent => {
            if (ent.team === 'player' && ent.isFrozen) ent.isFrozen = false;
        });
    };

    playerDeck.forEach((id) => {
        const card = CARDS[id];
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.flexDirection = 'column-reverse'; // Force snowflake to the bottom using reverse order
        container.style.alignItems = 'center';
        container.style.gap = '5px';

        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.id = `card-${id}`;
        cardEl.style.borderColor = card.color;
        cardEl.innerHTML = `
            <div class="card-cost">${card.cost}</div>
            <div class="card-icon">${card.icon}</div>
            <div class="card-name">${card.name}</div>
        `;

        // cardEl append removed from here, it will be added after checking for Bull row requirements
        
        let fBtn = document.createElement('div');
        fBtn.className = 'freeze-icon';
        fBtn.innerText = '❄️';
        fBtn.style.cssText = 'background:#74b9ff; border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center; border:2px solid white; cursor:pointer; font-size:18px; box-shadow:0 2px #0984e3;';
        fBtn.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
            selectedFreezeCardId = id;
            selectedCardId = null;
            cardEl.style.boxShadow = '0 0 12px 6px #74b9ff';
        };

        // Snowflake is FIRST in DOM, so in column-reverse it appears at the BOTTOM
        container.appendChild(fBtn);

        if (id === 'bull') {
            const dBtn = document.getElementById('bull-dash-btn');
            if (dBtn) {
                const bullRow = document.createElement('div');
                bullRow.style.display = 'flex';
                bullRow.style.flexDirection = 'row-reverse'; // Ensure Dash is on the LEFT in RTL
                bullRow.style.alignItems = 'center';
                bullRow.style.gap = '10px';
                
                dBtn.style.position = 'static';
                dBtn.style.display = 'none';
                dBtn.style.margin = '0';
                
                bullRow.appendChild(cardEl); // Child 1 in row-reverse = Right
                bullRow.appendChild(dBtn);   // Child 0 in row-reverse = Left
                container.appendChild(bullRow);
            } else {
                container.appendChild(cardEl);
            }
        } else {
            container.appendChild(cardEl);
        }

        cardEl.onclick = () => {
            document.querySelectorAll('.card').forEach(c => {
                c.classList.remove('selected');
                c.style.boxShadow = 'none';
            });
            if (playerElixir >= (CARDS[id].cost - 0.01) || adminHacks.infiniteElixir) {
                selectedCardId = id;
                selectedFreezeCardId = null;
                cardEl.classList.add('selected');
            }
        };

        if (card.type === 'aura' && right) right.appendChild(container);
        else if (card.type === 'building' && left) {
            left.appendChild(container);
            if (id === 'scrappy') left.appendChild(releaseBtn);
        } else if (center) center.appendChild(container);
    });
}
