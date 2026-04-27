// battle-deck.js - In-Battle Deck Management

function releaseAllFreeze() {
    // Un-freeze but KEEP the current HP — the user doesn't want release to
    // double as a full heal. To make this airtight we also LOCK the HP as a
    // temporary ceiling for 2 seconds so no ambient healer (Pam aura at
    // 15 HP/s, Scrappy SP2 at 50 HP/s, admin safeHeals, etc.) can bump the
    // just-released unit back up. `hp` can still go DOWN normally — damage
    // and frostbite aren't affected, only upward motion is capped.
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    [...units, ...buildings, ...auras].filter(e => e.team === 'player' && e.isFrozen).forEach(e => {
        e.isFrozen = false;
        e._postReleaseHpCap = e.hp;
        e._postReleaseHpCapUntil = now + 2000;
    });
    AudioController.play('upgrade');
    // Tell the opponent to un-freeze the matching units on THEIR screen
    // (those same units are team='enemy' over there because remote spawns
    // flip sides). Without this the opponent keeps seeing them frozen.
    if (typeof currentBattleRoom !== 'undefined' && currentBattleRoom &&
        window.NetworkManager && typeof window.NetworkManager.broadcastReleaseFreeze === 'function') {
        try { window.NetworkManager.broadcastReleaseFreeze(); } catch (e) {}
    }
}
window.releaseAllFreeze = releaseAllFreeze;

// Handler invoked when an opponent tells us they released their frozen units.
// On this client those units are on the 'enemy' team, so we unfreeze that set.
function handleRemoteReleaseFreeze() {
    // Mirror the local rule: un-freeze + HP-ceiling lock for 2s, no heal.
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    [...units, ...buildings, ...auras].filter(e => e.team === 'enemy' && e.isFrozen).forEach(e => {
        e.isFrozen = false;
        e._postReleaseHpCap = e.hp;
        e._postReleaseHpCapUntil = now + 2000;
    });
}
window.handleRemoteReleaseFreeze = handleRemoteReleaseFreeze;

function buildDeck() {
    const leftEl     = document.getElementById('deck-left');
    const rightEl    = document.getElementById('deck-right');
    const farRightEl = document.getElementById('deck-far-right');
    const centerEl   = document.getElementById('deck-center') || deckContainer;

    if (leftEl)     leftEl.innerHTML     = '';
    if (rightEl)    rightEl.innerHTML    = '';
    if (farRightEl) farRightEl.innerHTML = '';
    if (centerEl)   centerEl.innerHTML   = '';

    playerDeck.forEach(cardId => {
        const card = CARDS[cardId];
        if (!card) return;

        // Each deck slot is now a column: card on top, freeze button directly
        // below it (instead of the button overlapping the card art).
        const slot = document.createElement('div');
        slot.className = 'card-slot';
        slot.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:4px;';

        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.id = `card-${cardId}`;
        cardEl.style.borderColor = card.color;
        const iconHtml = (typeof getCardIconHTML === 'function')
            ? getCardIconHTML(cardId, 'width: 32px; height: auto; display: inline-block; image-rendering: pixelated; vertical-align: middle;')
            : card.icon;
        // Cards flagged `dynamicCost: true` (e.g. sirius) show "?" because
        // the actual price only resolves at click time. Fixed-cost spells
        // like rosa keep the normal numeric cost label.
        const costLabel = card.dynamicCost ? '?' : card.cost;
        cardEl.innerHTML = `
            <div class="card-cost">${costLabel}</div>
            <div class="card-icon">${iconHtml}</div>
            <div class="card-name">${card.name}</div>
        `;

        const freezeBtnEl = document.createElement('div');
        freezeBtnEl.className = 'card-freeze-btn';
        freezeBtnEl.style.cssText = 'background:#74b9ff; border:2px solid white; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-size:0.8rem; cursor:pointer; color:white; box-shadow:0 2px #54a0ff; transition: transform 0.1s;';
        freezeBtnEl.innerText = '🧊';
        // Spell-type cards (sirius) have no on-field entity to freeze, so
        // hide the 🧊 button entirely for them — pressing it would just
        // pick a freeze-spell that can't actually be placed.
        if (card.type === 'spell') {
            freezeBtnEl.style.display = 'none';
        }

        slot.appendChild(cardEl);
        slot.appendChild(freezeBtnEl);
        // The rest of the code still looks for `cardEl` — but we'll also
        // return the slot below so buildDeck appends IT (not the bare card)
        // to the deck container.
        cardEl._wrapperSlot = slot;
        cardEl._freezeBtn = freezeBtnEl;

        cardEl.onclick = (e) => {
            e.stopPropagation();
            const canAfford = playerElixir >= (card.cost - 0.01) || adminHacks.infiniteElixir || adminHacks.freeCards;
            if (!canAfford) return;

            // Picking a card cancels the Bull dash-selection mode
            if (typeof isSelectingBullDash !== 'undefined' && isSelectingBullDash) {
                isSelectingBullDash = false;
                const dashBtn = document.getElementById('bull-dash-btn');
                if (dashBtn) dashBtn.style.backgroundColor = '#8c7ae6';
            }
            // ...and the Bonnie transform-select mode
            if (typeof isSelectingBonnieTransform !== 'undefined' && isSelectingBonnieTransform) {
                isSelectingBonnieTransform = false;
                const bnBtn = document.getElementById('bonnie-transform-btn');
                if (bnBtn) bnBtn.style.backgroundColor = '#a29bfe';
            }

            if (selectedCardId === cardId) {
                selectedCardId = null;
                cardEl.classList.remove('selected');
            } else {
                selectedCardId = cardId;
                selectedFreezeCardId = null;
                document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
                cardEl.classList.add('selected');
            }
        };

        const freezeBtn = cardEl._freezeBtn || cardEl.querySelector('.card-freeze-btn');
        if (freezeBtn) {
            freezeBtn.onclick = (e) => {
                e.stopPropagation();
                const canAfford = playerElixir >= (card.cost - 0.01) || adminHacks.infiniteElixir || adminHacks.freeCards;
                if (!canAfford) return;

                // Picking a freeze cancels Bull dash-selection mode
                if (typeof isSelectingBullDash !== 'undefined' && isSelectingBullDash) {
                    isSelectingBullDash = false;
                    const dashBtn = document.getElementById('bull-dash-btn');
                    if (dashBtn) dashBtn.style.backgroundColor = '#8c7ae6';
                }
                // ...and the Bonnie transform-select mode
                if (typeof isSelectingBonnieTransform !== 'undefined' && isSelectingBonnieTransform) {
                    isSelectingBonnieTransform = false;
                    const bnBtn = document.getElementById('bonnie-transform-btn');
                    if (bnBtn) bnBtn.style.backgroundColor = '#a29bfe';
                }

                if (selectedFreezeCardId === cardId) {
                    selectedFreezeCardId = null;
                } else {
                    selectedFreezeCardId = cardId;
                    selectedCardId = null;
                    document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
                }
            };
        }

        // Distribute the deck across FOUR panels (per user request — the
        // 3-panel layout was still overflowing once the extras list
        // filled out). Layout:
        //   LEFT      — buildings/turrets only: penny, scrappy
        //   CENTER    — every unit-type card (bruce, leon, bull, amber,
        //               bubble, trunk) — drawn at the bottom by the
        //               underlying flexbox layout.
        //   RIGHT     — pam, max, 8bit, sirius (the "main extras" group)
        //   FAR-RIGHT — emz, tara, spike, mr-p, rosa (overflow extras
        //               that didn't fit on the regular right)
        // On narrow viewports the fixed side-panels sit off-screen, so
        // we collapse the whole deck into the centre row (which is
        // inside #app and gains a scroll/wrap layout via the mobile CSS).
        const collapseToCenter = window.innerWidth <= 600;
        const _RIGHT_SIDE     = new Set(['pam', 'max', '8bit', 'sirius']);
        const _FAR_RIGHT_SIDE = new Set(['emz', 'tara', 'spike', 'mr-p', 'rosa']);
        let target;
        if (collapseToCenter) target = centerEl;
        else if (_RIGHT_SIDE.has(cardId))     target = rightEl;
        else if (_FAR_RIGHT_SIDE.has(cardId)) target = farRightEl || rightEl;
        else if (card.type === 'unit')         target = centerEl;
        else                                   target = leftEl;   // penny, scrappy

        if (!target) target = centerEl;
        // Append the whole slot (card + freeze button below) so they stack.
        target.appendChild(cardEl._wrapperSlot || cardEl);
    });
}
window.buildDeck = buildDeck;
