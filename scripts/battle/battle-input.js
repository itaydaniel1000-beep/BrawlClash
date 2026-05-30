// battle-input.js - Canvas Interaction and Ghost Rendering

// The canvas element is stretched to fill its container (no letterbox), so
// every pixel of the rendered element corresponds directly to a scaled pixel
// of the 600×900 internal buffer. Direct proportional mapping is enough.
function clientToCanvasCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
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
    // Sirius — copy-spell. While selected, every click on an enemy entity
    // spawns a player-team copy of that entity at the same position. Cost
    // is dynamic: copied card's cost + 1 elixir surcharge. spawnEntity
    // auto-deducts the copied card's base cost, so we deduct the +1 here
    // by hand. Untargetable / non-CARDS entities (amber-trail, safes,
    // porters) refuse to copy. The card is consumed on success; missed
    // clicks keep it armed for another try.
    if (selectedCardId === 'sirius') {
        const candidates = units.concat(buildings, auras).filter(e =>
            e && e.team === 'enemy' && !e.isDead &&
            Math.hypot((e.x || 0) - x, (e.y || 0) - y) <= ((e.radius || 15) + 20));
        if (!candidates.length) {
            if (typeof showTransientToast === 'function') showTransientToast('🎯 לחץ על אויב כדי לשכפל');
            return { placed: false };
        }
        candidates.sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
        const target = candidates[0];
        const enemyType = target.type;
        const enemyCard = enemyType ? CARDS[enemyType] : null;
        if (!enemyCard || enemyCard.type === 'spell') {
            // Porter / safe / fire-trail / sirius itself — not in CARDS as a
            // placeable, or another spell (can't copy a copy-spell). Refuse.
            if (typeof showTransientToast === 'function') showTransientToast('⚠️ אי אפשר לשכפל את הדמות הזו');
            return { placed: false };
        }
        // Bruce is explicitly blocked from being cloned (user spec) — too
        // strong as a double-cost copy ladder; cloning a Bruce for cost+1
        // would let the player overrun the field with tanks for cheap.
        if (enemyType === 'bruce') {
            if (typeof showTransientToast === 'function') showTransientToast('⚠️ אי אפשר לשכפל את ברוס');
            return { placed: false };
        }
        const totalCost = (enemyCard.cost || 0) + 1;
        const canAffordCopy = playerElixir >= (totalCost - 0.01) || adminHacks.infiniteElixir || adminHacks.freeCards;
        if (!canAffordCopy) {
            if (typeof showTransientToast === 'function') showTransientToast(`🧪 צריך ${totalCost} אליקסיר לשכפל את ${enemyCard.name}`);
            return { placed: false };
        }
        // Pay the +1 surcharge by hand. spawnEntity will subtract the
        // copied card's base cost on top of this.
        if (!adminHacks.infiniteElixir && !adminHacks.freeCards) {
            playerElixir = Math.max(0, playerElixir - 1);
        }
        spawnEntity(target.x, target.y, 'player', enemyType);
        // Consume the sirius slot — no chain-cloning even with shift held,
        // because each click resolves a unique target and the player should
        // re-pick to avoid accidental duplicate clones.
        selectedCardId = null;
        document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
        if (typeof showTransientToast === 'function') showTransientToast(`👯 שוכפל: ${enemyCard.name}`);
        return { placed: true, cardId: 'sirius' };
    }

    // Raps — stealth bomber spell. Tapping any in-bounds point detonates
    // an 8-bomb hex cluster centred at the click. Each bomb has Spike's
    // pin radius (55) and the layout is hex-packed (3-2-3) so adjacent
    // circles are tangent. Bombs explode SEQUENTIALLY — bomb 0 first,
    // bomb 7 last — each dealing 500 dmg to enemies still inside their
    // radius at detonation. Raps himself never appears on the field
    // (pure spell), so no unit / no HP bar / no visibility worry.
    if (selectedCardId === 'raps') {
        const insideBorder = x >= 10 && x <= (CONFIG.CANVAS_WIDTH - 10) &&
                             y >= 10 && y <= (CONFIG.CANVAS_HEIGHT - 10);
        if (!insideBorder) return { placed: false };
        const rapsCard = CARDS['raps'];
        const canAffordRaps = playerElixir >= (rapsCard.cost - 0.01) ||
                              adminHacks.infiniteElixir || adminHacks.freeCards;
        if (!canAffordRaps) {
            if (typeof showTransientToast === 'function') showTransientToast('🧪 אין מספיק אליקסיר לראפס');
            return { placed: false };
        }
        if (!adminHacks.infiniteElixir && !adminHacks.freeCards) {
            playerElixir = Math.max(0, playerElixir - rapsCard.cost);
        }
        // Hex-pack 8 bombs around the click point. Bomb radius is 55, so
        // the horizontal step is 2*r = 110 and the vertical step is r*√3
        // ≈ 95.26 — exact tangent spacing.
        const r = 55;
        const vstep = r * Math.sqrt(3);
        const offsets = [
            [-2*r, -vstep], [   0, -vstep], [ 2*r, -vstep],   // top row
            [  -r,      0], [   r,      0],                   // middle row (offset)
            [-2*r,  vstep], [   0,  vstep], [ 2*r,  vstep]    // bottom row
        ];
        offsets.forEach(([dx, dy], i) => {
            const bx = x + dx;
            const by = y + dy;
            try {
                const bomb = new Aura(bx, by, 'player', 'raps-bomb');
                bomb._bombIndex = i;
                auras.push(bomb);
            } catch (e) { /* ignore — one missing bomb shouldn't break the cast */ }
        });
        try { AudioController.play('spawn'); } catch (e) {}
        // Shift / long-press → keep card selected to chain-cast.
        // Otherwise consume the slot.
        if (!shiftHeld) {
            selectedCardId = null;
            document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
        }
        if (typeof showTransientToast === 'function') showTransientToast('💣 ראפס - 8 פצצות שוגרו');
        return { placed: true, cardId: 'raps' };
    }

    // Rosa — defensive shield-spell. Mirror image of Sirius: while held,
    // every PLAYER-team entity is tagged with a coral glow; clicking one
    // applies a 500-HP shield bubble that drains 25 HP/sec. Stacks on top
    // of any existing shield. Skips entities that can't really benefit
    // (trunk is invulnerable, bubbles fly past in seconds, trail tiles
    // are ephemeral). Costs the flat rosa cost.
    if (selectedCardId === 'rosa') {
        const candidates = units.concat(buildings, auras).filter(e =>
            e && e.team === 'player' && !e.isDead &&
            !e.isInvulnerable &&
            e.type !== 'fire-trail' && e.type !== 'trunk-trail' &&
            e.type !== 'bubble' && e.type !== 'trunk' &&
            (e.maxHp || 0) > 0 &&
            Math.hypot((e.x || 0) - x, (e.y || 0) - y) <= ((e.radius || 15) + 20));
        if (!candidates.length) {
            if (typeof showTransientToast === 'function') showTransientToast('🎯 לחץ על דמות שלך כדי להעניק מגן');
            return { placed: false };
        }
        candidates.sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
        const target = candidates[0];
        const card = CARDS['rosa'];
        const canAfford = playerElixir >= (card.cost - 0.01) || adminHacks.infiniteElixir || adminHacks.freeCards;
        if (!canAfford) {
            if (typeof showTransientToast === 'function') showTransientToast('🧪 אין מספיק אליקסיר לרוזה');
            return { placed: false };
        }
        if (!adminHacks.infiniteElixir && !adminHacks.freeCards) {
            playerElixir = Math.max(0, playerElixir - card.cost);
        }
        // Stack on top of any existing shield (e.g. mr-p SP2's 500). Decay
        // is keyed on _shieldDecayInterval — Mr-P's static shield doesn't
        // set this, so it never drains; Rosa's does, so it ticks down.
        target.shieldHp = (target.shieldHp || 0) + 500;
        target._shieldDecayInterval = 1000;   // tick every 1000 ms
        target._shieldDecayAmount   = 25;     // –25 HP per tick
        target._shieldDecayLast     = performance.now();
        // Card is consumed — no chain-spam. Player re-picks for another cast.
        selectedCardId = null;
        document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
        if (typeof showTransientToast === 'function') showTransientToast(`🛡️ +500 מגן ל${CARDS[target.type] ? CARDS[target.type].name : 'דמות'}`);
        return { placed: true, cardId: 'rosa' };
    }

    // Admin "delete enemy unit" toggle — consume the click, remove the clicked
    // enemy entity (unit / building / aura), and STAY ARMED. The 🗑️ button
    // itself is the toggle — tap it again to disarm.
    if (typeof isSelectingDeleteTarget !== 'undefined' && isSelectingDeleteTarget) {
        const candidates = units.concat(buildings, auras).filter(e =>
            e && e.team === 'enemy' && !e.isDead &&
            Math.hypot((e.x || 0) - x, (e.y || 0) - y) <= ((e.radius || 15) + 20));
        if (candidates.length) {
            candidates.sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
            const victim = candidates[0];
            victim.isDead = true;
            victim.hp = 0;
            if (typeof showTransientToast === 'function') showTransientToast('🗑️ הדמות נמחקה');
            // P2P: the enemy we just killed is the OPPONENT's player-team unit
            // on their screen. Without this broadcast the unit only dies in
            // our local sim and they keep fighting with what looks (to them)
            // like a still-alive unit.
            try {
                if (typeof currentBattleRoom !== 'undefined' && currentBattleRoom &&
                    window.NetworkManager && typeof window.NetworkManager.broadcastDeleteUnit === 'function') {
                    window.NetworkManager.broadcastDeleteUnit(
                        victim.x, victim.y, victim.type || null, victim.radius || 20
                    );
                }
            } catch (e) { /* ignore — local kill already happened */ }
        }
        // Mode stays armed — user clicks the 🗑️ button again to disarm.
        return { placed: false };
    }

    // Bonnie transform mode — clicking on a player-team Bonnie kills the
    // Bonnie in place and spawns a "transformed" Bruce at her position.
    // The Bruce is flagged so unit-logic.js's target picker excludes the
    // safe (per user spec — "תוקף דברים אחרים חוץ מהכספת") and so the
    // draw routine paints a golden halo to mark him as transformed.
    // Built directly via `new Unit(...)` (NOT spawnEntity) so the auto-
    // broadcast doesn't double-spawn on the opponent's screen — instead
    // we send a single BONNIE_MORPH message that the receiver handles
    // identically (kill their enemy-team Bonnie + spawn an enemy-team
    // tagged Bruce). The transform itself is FREE (Bonnie's ability),
    // not a paid Bruce placement.
    if (typeof isSelectingBonnieTransform !== 'undefined' && isSelectingBonnieTransform) {
        const clickedBonnie = (typeof buildings !== 'undefined' ? buildings : [])
            .find(b => b && b.team === 'player' && b.type === 'bonnie' && !b.isDead &&
                        Math.hypot(b.x - x, b.y - y) <= (b.radius || 22) * 2);
        if (clickedBonnie) {
            const sx = clickedBonnie.x, sy = clickedBonnie.y;
            clickedBonnie.isDead = true;
            clickedBonnie.hp = 0;
            const bruce = new Unit(sx, sy, 15, 'player', 'bruce');
            bruce._isFromBonnie = true;
            bruce._skipSafe     = true;
            units.push(bruce);
            try { AudioController.play('spawn'); } catch (e) { /* ignore */ }
            // P2P: broadcast a single morph message — receiver replays the
            // same kill+spawn on their side at the mirrored position.
            try {
                if (typeof currentBattleRoom !== 'undefined' && currentBattleRoom &&
                    window.NetworkManager && typeof window.NetworkManager.broadcastBonnieMorph === 'function') {
                    window.NetworkManager.broadcastBonnieMorph(sx, sy);
                }
            } catch (e) { /* ignore — local morph already happened */ }
            // Stay armed if there are more Bonnies — let the player chain-
            // transform; otherwise drop the mode + reset the button colour.
            // Shift / long-press FORCES the mode to stay armed regardless,
            // mirroring the card placement behaviour (per user spec —
            // "every button should work like a card").
            const moreBonnies = (typeof buildings !== 'undefined' ? buildings : [])
                .some(b => b && b.team === 'player' && b.type === 'bonnie' && !b.isDead);
            if (!shiftHeld && !moreBonnies) {
                isSelectingBonnieTransform = false;
                const btn = document.getElementById('bonnie-transform-btn');
                if (btn) btn.style.backgroundColor = '#a29bfe';
            }
        }
        return { placed: false };
    }

    // 🩰✨ Gigi teleport target — handled BEFORE the icecream block so
    // a Gigi-mode click never accidentally falls through to other
    // modes. If the click lands inside ANY eligible Gigi's teleport
    // range circle, move that Gigi to the click point, mark her
    // _gigiTeleported = true, exit mode. If outside every range, just
    // exit mode silently (per user spec: clicking outside cancels).
    if (typeof isSelectingGigiTeleport !== 'undefined' && isSelectingGigiTeleport) {
        const eligibleGigis = units.filter(u => u && u.team === 'player' && u.type === 'gigi' &&
                                                !u.isDead && !u._gigiTeleported);
        // Pick the Gigi whose circle the click lands in. If multiple
        // overlap (uncommon), prefer the one closest to the click —
        // most intuitive when ranges overlap.
        let target = null, bestDist = Infinity;
        for (const g of eligibleGigis) {
            const d = Math.hypot(g.x - x, g.y - y);
            const range = g._gigiTeleportRange || 200;
            if (d <= range && d < bestDist) { target = g; bestDist = d; }
        }
        if (target) {
            target.x = x;
            target.y = y;
            target._gigiTeleported = true;
            // Sparkle puff at both ends so the teleport reads on screen.
            if (typeof particles !== 'undefined' && typeof Particle === 'function') {
                const colors = ['#e91e63', '#f48fb1', '#fff', '#9c27b0'];
                for (let i = 0; i < 12; i++) {
                    try { particles.push(new Particle(x, y, colors[i % colors.length])); } catch (_) {}
                }
            }
            if (typeof showTransientToast === 'function') showTransientToast('🩰✨ גיגי שוגרה');
        }
        // Shift / long-press AND there's still an eligible Gigi left →
        // keep the mode armed for chain-teleporting (matches the card
        // shift-spam behaviour). Otherwise exit cleanly.
        const moreEligible = units.some(u => u && u.team === 'player' && u.type === 'gigi' &&
                                             !u.isDead && !u._gigiTeleported);
        if (!shiftHeld || !moreEligible) {
            isSelectingGigiTeleport = false;
            const btn = document.getElementById('gigi-teleport-btn');
            if (btn) btn.style.backgroundColor = '#e91e63';
        }
        return { placed: false };
    }

    // 🍦 Barry ice-cream placement — anywhere on the map (no half / EMZ
    // restriction). Consumes one charge from the first Barry that has
    // one. Capped at 4 ice creams per team on the field. We route the
    // actual spawn through spawnEntity() so P2P sync, audio and on-field
    // bookkeeping all happen for free, the same way every other aura does.
    if (typeof isSelectingIcecream !== 'undefined' && isSelectingIcecream) {
        const myBarry = units.find(u => u.team === 'player' && u.type === 'barry' &&
                                        !u.isDead && (u._icecreamReady || 0) > 0);
        const onField = auras.filter(a => a.team === 'player' && a.type === 'icecream' && !a.isDead).length;
        let placedThisClick = false;
        if (!myBarry) {
            // No more ready charges → always exit mode (nothing to repeat).
            isSelectingIcecream = false;
        } else if (onField >= 4) {
            if (typeof showTransientToast === 'function') showTransientToast('🍦 כבר 4 גלידות במגרש');
            isSelectingIcecream = false;
        } else {
            myBarry._icecreamReady = Math.max(0, (myBarry._icecreamReady || 0) - 1);
            spawnEntity(x, y, 'player', 'icecream');
            placedThisClick = true;
        }
        // Shift / long-press AND we successfully placed AND there's
        // still a ready charge AND the field cap isn't reached → keep
        // the mode armed so the next click drops another. Matches the
        // card chain-spawn behaviour.
        if (placedThisClick) {
            const stillReady = units.some(u => u.team === 'player' && u.type === 'barry' &&
                                               !u.isDead && (u._icecreamReady || 0) > 0);
            const cone = auras.filter(a => a.team === 'player' && a.type === 'icecream' && !a.isDead).length;
            if (!shiftHeld || !stillReady || cone >= 4) {
                isSelectingIcecream = false;
            }
        }
        const btn = document.getElementById('icecream-btn');
        if (btn) btn.style.backgroundColor = isSelectingIcecream ? '#e74c3c' : '#3498db';
        return { placed: false };
    }

    if (isSelectingBullDash) {
        let clickedBull = units.find(u => u.team === 'player' && u.type === 'bull' && !u.hasDashed && Math.hypot(u.x - x, u.y - y) <= u.radius * 2);
        if (clickedBull) {
            clickedBull.triggerDash(performance.now());
            // P2P: tell the opponent to dash the same bull on their side
            // (it's `team='enemy'` over there, otherwise it just walks).
            try {
                if (typeof currentBattleRoom !== 'undefined' && currentBattleRoom &&
                    window.NetworkManager && typeof window.NetworkManager.broadcastBullDash === 'function') {
                    window.NetworkManager.broadcastBullDash(clickedBull.x, clickedBull.y);
                }
            } catch (e) { /* ignore — local dash already fired */ }
            // Shift / long-press FORCES the mode to stay armed regardless,
            // matching the card-spam pattern. Otherwise: stay armed only
            // if there's another Bull left to dash.
            const moreBullsAvailable = units.some(u => u.team === 'player' && u.type === 'bull' && !u.hasDashed);
            if (!shiftHeld && !moreBullsAvailable) {
                isSelectingBullDash = false;
                const dashBtn = document.getElementById('bull-dash-btn');
                if (dashBtn) dashBtn.style.backgroundColor = '#8c7ae6';
            }
        }
        return { placed: false };
    }

    // Amber path mode — every click adds a waypoint instead of placing a unit.
    // After 6 waypoints we auto-commit (spawn Amber at waypoints[0] and walk
    // through the rest). The 🎯 button can also be tapped a second time to
    // commit early with however many waypoints exist.
    if (typeof isSelectingAmberPath !== 'undefined' && isSelectingAmberPath) {
        // Caps only apply to AMBER (her balance leash). Every other walking
        // unit (bruce / leon / bull) gets unlimited waypoints with no
        // per-step distance cap, per user request.
        const isAmber = (_pendingPathCardId === 'amber');
        if (isAmber) {
            if (_amberPendingPath.length < 6) {
                const SQUARE_PX = 50;
                const MAX_STEP_PX = SQUARE_PX * 5; // 250
                if (_amberPendingPath.length > 0) {
                    const prev = _amberPendingPath[_amberPendingPath.length - 1];
                    const d = Math.hypot(x - prev.x, y - prev.y);
                    if (d > MAX_STEP_PX) {
                        if (typeof showTransientToast === 'function') {
                            showTransientToast('🎯 הצעד רחוק מדי — מקסימום 5 משבצות מהנקודה הקודמת');
                        }
                        return { placed: false };
                    }
                }
                _amberPendingPath.push({ x, y });
            }
            if (_amberPendingPath.length >= 6) {
                commitAmberPath();
            }
        } else {
            // Non-Amber walking units: unlimited waypoints, no distance cap.
            _amberPendingPath.push({ x, y });
        }
        return { placed: false };
    }

    // Each side places only on its own half of the field (or inside an EMZ
    // aura their team owns). For the local human the player side is the
    // BOTTOM half (y > height/2). Cards flagged `placeInEnemyHalf` (e.g.
    // Barry) flip the rule — they can ONLY be placed in the TOP half.
    const bottomHalf = y > (CONFIG.CANVAS_HEIGHT / 2);
    const topHalf    = !bottomHalf;
    const insideOwnEmz = auras.some(a => a.team === 'player' && a.type === 'emz' && !a.isFrozen && Math.hypot(x - a.x, y - a.y) <= a.radius);
    const _sel = selectedFreezeCardId || selectedCardId;
    const _selCard = _sel ? CARDS[_sel] : null;
    const enemyHalfCard = !!(_selCard && _selCard.placeInEnemyHalf);
    const validSide = enemyHalfCard ? topHalf : (bottomHalf || insideOwnEmz);
    const insideBorder = x >= 10 && x <= (CONFIG.CANVAS_WIDTH - 10) &&
                         y >= 10 && y <= (CONFIG.CANVAS_HEIGHT - 10);

    if (selectedFreezeCardId) {
        const freezeCard = CARDS[selectedFreezeCardId];
        const canAffordFreeze = playerElixir >= (freezeCard.cost - 0.01) || adminHacks.infiniteElixir || adminHacks.freeCards;
        if (!canAffordFreeze) return { placed: false };
        if (!validSide || !insideBorder) return { placed: false };

        const freezeToContinue = selectedFreezeCardId;
        spawnEntity(x, y, 'player', selectedFreezeCardId, true);
        if (shiftHeld) {
            // Mirror the regular-card path: while shift is held (or we're in
            // a long-press) keep the freeze card selected so successive clicks
            // / auto-repeat ticks keep placing freeze units.
            selectedFreezeCardId = freezeToContinue;
        } else {
            selectedFreezeCardId = null;
            document.querySelectorAll('.card').forEach(c => c.style.boxShadow = 'none');
        }
        return { placed: true, cardId: freezeToContinue, isFreeze: true };
    }

    if (!selectedCardId) return { placed: false };

    const card = CARDS[selectedCardId];
    const canAfford = playerElixir >= (card.cost - 0.01) || adminHacks.infiniteElixir || adminHacks.freeCards;
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

// === Path-mode controls (generic over any walking unit) ===================
// Wired to the 🎯 button (#amber-path-btn) and the auto-commit fired when
// Amber's 6th waypoint lands. Works for every CARDS entry whose `type ===
// 'unit'` (bruce / leon / bull / amber — porter is summon-only and isn't
// a placeable card). Buildings and auras don't show the button at all.
function _isWalkingCard(cardId) {
    const c = cardId && CARDS[cardId];
    return !!(c && c.type === 'unit');
}

function toggleAmberPathMode() {
    if (!_isWalkingCard(selectedCardId)) {
        // Button shouldn't have been clickable; reset just in case.
        isSelectingAmberPath = false;
        _amberPendingPath = [];
        _pendingPathCardId = null;
        return;
    }
    if (isSelectingAmberPath) {
        // Second tap on 🎯 → commit whatever we've got.
        commitAmberPath();
    } else {
        // First tap → enter path mode and lock the card identity so the
        // commit later spawns the right unit even if the player accidentally
        // bumps another card mid-draw.
        isSelectingAmberPath = true;
        _amberPendingPath = [];
        _pendingPathCardId = selectedCardId;
    }
}
window.toggleAmberPathMode = toggleAmberPathMode;

// Spawn the chosen unit at waypoints[0] and assign waypoints[1..N-1] as its
// walking path. Costs the card's elixir cost. If 0 waypoints have been
// placed, just exit path mode silently.
function commitAmberPath() {
    const cardId = _pendingPathCardId || selectedCardId || 'amber';
    const cleanup = () => {
        _amberPendingPath = [];
        isSelectingAmberPath = false;
        _pendingPathCardId = null;
    };
    if (!_amberPendingPath || _amberPendingPath.length === 0) {
        cleanup();
        return;
    }
    const card = CARDS[cardId];
    if (!card) { cleanup(); return; }
    const canAfford = playerElixir >= (card.cost - 0.01) || adminHacks.infiniteElixir || adminHacks.freeCards;
    if (!canAfford) {
        cleanup();
        if (typeof showTransientToast === 'function') showTransientToast('🧪 אין מספיק אליקסיר');
        return;
    }
    // Validate the spawn point — must sit in the player's half (or inside
    // a player-team EMZ aura) like any other player-team unit. Subsequent
    // waypoints can be anywhere; the unit walks across the full board.
    const sp = _amberPendingPath[0];
    const inOwnHalf = sp.y > (CONFIG.CANVAS_HEIGHT / 2);
    const insideOwnEmz = auras.some(a => a.team === 'player' && a.type === 'emz' && !a.isFrozen && Math.hypot(sp.x - a.x, sp.y - a.y) <= a.radius);
    if (!inOwnHalf && !insideOwnEmz) {
        cleanup();
        if (typeof showTransientToast === 'function') showTransientToast('⚠️ נקודת ההצבה חייבת להיות בחצי שלך');
        return;
    }
    const path = _amberPendingPath.slice(1).map(p => ({ x: p.x, y: p.y }));
    // Pass the path through spawnEntity → it gets baked onto the unit
    // inside battle-spawn.js AND piggy-backs on SYNC_SPAWN so the
    // opponent's client renders the same walk in P2P matches.
    spawnEntity(sp.x, sp.y, 'player', cardId, false, false, null, 0, path);
    cleanup();
    selectedCardId = null;
    document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
}
window.commitAmberPath = commitAmberPath;

// Spawn a Bubble at (sx, sy) with launch direction (dirX, dirY) — both
// already normalised (unit vector). Bubble's `speed` field becomes the
// magnitude of `_velocity`. Costs the bubble card's elixir; refuses to
// fire if the player can't afford. Called from handleCanvasRelease when
// a drag-aim sling is released with sufficient drag distance.
function commitBubbleSling(sx, sy, dirX, dirY, isFreeze = false) {
    const card = CARDS['bubble'];
    if (!card) return;
    const canAfford = playerElixir >= (card.cost - 0.01) || adminHacks.infiniteElixir || adminHacks.freeCards;
    if (!canAfford) {
        if (typeof showTransientToast === 'function') showTransientToast('🧪 אין מספיק אליקסיר לבאבל');
        return;
    }
    spawnEntity(sx, sy, 'player', 'bubble', isFreeze);
    // Find the bubble we just created (last unit pushed) and set its
    // velocity vector. spawnEntity already deducted elixir. Velocity is
    // baked in even when isFrozen=true so the unfreeze pulse just flips
    // the flag and the bubble is already pointed in the right direction.
    for (let i = units.length - 1; i >= 0; i--) {
        const u = units[i];
        if (u && u.type === 'bubble' && u.team === 'player' && !u.isDead) {
            const speed = u.speed || 300;
            u._velocity = { x: dirX * speed, y: dirY * speed };
            break;
        }
    }
    // Card stays selected so the player can chain-launch bubbles. Drag
    // again to fire another. Picking a different card / pressing Esc
    // clears it normally.
}
window.commitBubbleSling = commitBubbleSling;

function _scheduleAutoRepeat(cardId, delay, isFreeze) {
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
        if (isFreeze) {
            // Re-arm the freeze placement; clear any non-freeze selection.
            selectedFreezeCardId = cardId;
            selectedCardId = null;
        } else {
            _selectCard(cardId);
        }

        const pos = lastPointerPos;
        if (pos) {
            // Pass shiftHeld=true so a successful placement doesn't deselect
            // the card mid-hold — the selection must stay stable throughout.
            _placeAtInternal(pos.x, pos.y, /* shiftHeld */ true);
        }

        // Keep scheduling as long as the pointer is held. We only stop inside
        // handleCanvasRelease (or if the card disappears from CARDS).
        _scheduleAutoRepeat(cardId, AUTO_REPEAT_MS, isFreeze);
    }, delay);
}

function handleCanvasPress(e) {
    if (!canvas) return;
    e.preventDefault();

    // Bubble drag-aim: when the bubble card is held — REGULAR or FREEZE —
    // every press starts a sling-aim drag instead of placing a unit. The
    // press point is the anchor (where the bubble will spawn); the drag
    // direction at release becomes the launch velocity. No long-press
    // auto-repeat for bubble. In freeze mode the bubble is born frozen
    // with its velocity already baked in, so when the unfreeze wave hits
    // it, it actually starts moving instead of sitting still (was a bug
    // before — frozen-placed bubble stayed stuck on thaw because the
    // standard click-place path never set _velocity).
    const isBubbleRegular = (selectedCardId === 'bubble');
    const isBubbleFreeze  = (selectedFreezeCardId === 'bubble');
    if (isBubbleRegular || isBubbleFreeze) {
        const pt = clientToCanvasCoords(e.clientX, e.clientY);
        // Anchor must sit in the player's half (or inside an own EMZ aura).
        const inOwnHalf = pt.y > (CONFIG.CANVAS_HEIGHT / 2);
        const insideOwnEmz = auras.some(a => a.team === 'player' && a.type === 'emz' && !a.isFrozen && Math.hypot(pt.x - a.x, pt.y - a.y) <= a.radius);
        const insideBorder = pt.x >= 10 && pt.x <= (CONFIG.CANVAS_WIDTH - 10) &&
                             pt.y >= 10 && pt.y <= (CONFIG.CANVAS_HEIGHT - 10);
        if ((inOwnHalf || insideOwnEmz) && insideBorder) {
            _bubbleDragging       = true;
            _bubbleDraggingFreeze = isBubbleFreeze;
            _bubbleAnchor         = { x: pt.x, y: pt.y };
            _bubbleCurrent        = { x: pt.x, y: pt.y };
        }
        return;
    }

    // Capture which card was held BEFORE placement (the place call may clear
    // it). Either a normal card or a freeze card — auto-repeat needs to know
    // which kind it is so it can re-arm the right slot on every tick.
    const cardBeforePlace = selectedCardId || selectedFreezeCardId;
    const wasFreeze = !!selectedFreezeCardId;
    const res = _placeAt(e.clientX, e.clientY, !!e.shiftKey);

    // Start the long-press timer. If it fires while the pointer is still
    // down, we enter long-press mode: the card stays selected throughout
    // and is placed repeatedly at the pointer's current position.
    clearTimeout(autoPlaceTimer);
    autoPlaceTimer = null;
    isLongPressing = false;
    // Spell-type cards (sirius / rosa) are one-shot — never auto-repeat,
    // otherwise a long-press would chain-cast them and burn elixir on
    // unintended duplicate clones / shields.
    const _isSpellHeld = cardBeforePlace && CARDS[cardBeforePlace] && CARDS[cardBeforePlace].type === 'spell';
    if (res && cardBeforePlace && !_isSpellHeld && !e.shiftKey) {
        _scheduleAutoRepeat(cardBeforePlace, LONG_PRESS_MS, wasFreeze);
    }
}

function handleCanvasRelease() {
    // Bubble drag-aim release: launch the bubble in the drag direction at
    // base speed. Min drag of 12 px to filter accidental taps. If this
    // drag started in freeze mode, spawn the bubble frozen — velocity is
    // pre-baked, so on thaw it begins flying immediately.
    if (_bubbleDragging) {
        const wasFreeze = _bubbleDraggingFreeze;
        _bubbleDragging       = false;
        _bubbleDraggingFreeze = false;
        const dx = _bubbleCurrent.x - _bubbleAnchor.x;
        const dy = _bubbleCurrent.y - _bubbleAnchor.y;
        const dragDist = Math.hypot(dx, dy);
        if (dragDist >= 12) {
            commitBubbleSling(_bubbleAnchor.x, _bubbleAnchor.y, dx / dragDist, dy / dragDist, wasFreeze);
            // Only consume the freeze slot if we actually launched (mirrors
            // the regular freeze-place flow). Tapping without dragging keeps
            // the freeze card armed for another try.
            if (wasFreeze && (typeof shiftHeld === 'undefined' || !shiftHeld)) {
                selectedFreezeCardId = null;
                document.querySelectorAll('.card').forEach(c => c.style.boxShadow = 'none');
            }
        }
        return;
    }

    clearTimeout(autoPlaceTimer);
    autoPlaceTimer = null;
    if (isLongPressing) {
        // Long-press ended — the card (regular or freeze) was held during
        // the press and should now be released, mirroring keyboard Shift
        // being lifted. Clear BOTH selection slots so a freeze long-press
        // also deselects cleanly.
        isLongPressing = false;
        selectedCardId = null;
        selectedFreezeCardId = null;
        document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
        document.querySelectorAll('.card').forEach(c => c.style.boxShadow = 'none');
    }
}

function handleCanvasPointerMove(e) {
    if (!canvas) return;
    const pt = clientToCanvasCoords(e.clientX, e.clientY);
    lastPointerPos = pt;
    mouseX = pt.x;
    mouseY = pt.y;
    // Bubble drag-aim: track the moving end of the sling so the dashed
    // arrow follows the pointer in the renderer preview.
    if (_bubbleDragging) {
        _bubbleCurrent = { x: pt.x, y: pt.y };
    }
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

    // Bubble has its own drag-aim sling preview in engine-renderer.js.
    // Skip the standard pointer-following ghost so we don't double-draw.
    if (cardKey === 'bubble') return;
    // Sirius is a copy-spell — the player clicks an enemy, not an empty
    // tile. The pointer-following ghost would be misleading; the enemy
    // highlight ring (drawn elsewhere) is the entire visual cue.
    if (cardKey === 'sirius') return;
    // Rosa is the player-team mirror of Sirius (shield spell on click).
    // Same reason — the highlight ring on every player-team entity IS
    // the cue; a pointer-following ghost would clutter.
    if (cardKey === 'rosa') return;

    // Raps shows its own preview — 8 hex-packed red circles showing
    // exactly where the cluster will land. No pointer-following emoji.
    if (cardKey === 'raps') {
        ctx.save();
        const r = 55;
        const vstep = r * Math.sqrt(3);
        const offsets = [
            [-2*r, -vstep], [   0, -vstep], [ 2*r, -vstep],
            [  -r,      0], [   r,      0],
            [-2*r,  vstep], [   0,  vstep], [ 2*r,  vstep]
        ];
        for (const [dx, dy] of offsets) {
            ctx.beginPath();
            ctx.arc(mouseX + dx, mouseY + dy, r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(231, 76, 60, 0.32)';
            ctx.fill();
            ctx.strokeStyle = '#7B1010';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        ctx.restore();
        return;
    }

    ctx.save();
    ctx.globalAlpha = 0.4;

    // Match the placement rule in _placeAtInternal — player's side is the
    // bottom half of the field (plus anywhere inside an own-team EMZ aura).
    const insideBorder = mouseX >= 10 && mouseX <= (CONFIG.CANVAS_WIDTH - 10) &&
                         mouseY >= 10 && mouseY <= (CONFIG.CANVAS_HEIGHT - 10);
    const bottomHalf = mouseY > (CONFIG.CANVAS_HEIGHT / 2);
    const insideOwnEmz = auras.some(a => a.team === 'player' && a.type === 'emz' && !a.isFrozen && Math.hypot(mouseX - a.x, mouseY - a.y) <= a.radius);
    let valid = insideBorder && (bottomHalf || insideOwnEmz);

    // For any card with a custom pixel-art sprite (amber, bruce, ...),
    // draw the sprite inside a faintly-tinted placement halo so the
    // ghost matches the on-field unit. Every other card keeps the
    // emoji-on-coloured-circle ghost.
    const hasCustomSprite = (typeof _CUSTOM_SPRITES !== 'undefined' &&
                             _CUSTOM_SPRITES[cardKey] &&
                             typeof _drawCustomSprite === 'function');
    if (hasCustomSprite) {
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 30, 0, Math.PI * 2);
        ctx.fillStyle = valid ? 'rgba(255,255,255,0.18)' : 'rgba(231, 76, 60, 0.4)';
        ctx.fill();
        ctx.strokeStyle = valid ? '#fff' : '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        _drawCustomSprite(ctx, cardKey, mouseX, mouseY, 'player', false, false);
    } else {
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
    }

    if (selectedFreezeCardId) {
        ctx.strokeStyle = '#74b9ff';
        ctx.lineWidth = 4;
        ctx.stroke();
    }
    ctx.restore();

    // 🌟 Lumi placement preview — draw the 3 stacked rings exactly where
    // they'll appear after release. Same geometry as the constructor:
    //   r1 = 22, dy = -44     (inner ring bottom on sprite top)
    //   r2 = 44, dy = -110    (middle bottom on inner top)
    //   r3 = 88, dy = -242    (outer  bottom on middle top)
    // Faded fills + dashed rims to read as a preview vs the real rings.
    if (cardKey === 'lumi' && valid) {
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 2;
        const drawPreviewRing = (cy, radius, fill, rim) => {
            ctx.beginPath();
            ctx.arc(mouseX, cy, radius, 0, Math.PI * 2);
            ctx.fillStyle   = fill;
            ctx.fill();
            ctx.strokeStyle = rim;
            ctx.stroke();
        };
        // OUTER first so inner rings paint on top — same paint order as
        // the actual building.js draw().
        drawPreviewRing(mouseY - 242, 88, 'rgba(231,76,60,0.08)',  'rgba(231,76,60,0.5)');
        drawPreviewRing(mouseY - 110, 44, 'rgba(155,89,182,0.10)', 'rgba(155,89,182,0.55)');
        drawPreviewRing(mouseY -  44, 22, 'rgba(142,68,173,0.18)', 'rgba(142,68,173,0.75)');
        ctx.restore();
    }
}
