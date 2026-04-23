// battle-deck.js - In-Battle Deck Management

function releaseAllFreeze() {
    [...units, ...buildings, ...auras].filter(e => e.team === 'player' && e.isFrozen).forEach(e => {
        e.isFrozen = false;
        e.hp = e.maxHp || e.hp;
    });
    AudioController.play('upgrade');
}
window.releaseAllFreeze = releaseAllFreeze;

function buildDeck() {
    const leftEl = document.getElementById('deck-left');
    const rightEl = document.getElementById('deck-right');
    const centerEl = document.getElementById('deck-center') || deckContainer;

    if (leftEl) leftEl.innerHTML = '';
    if (rightEl) rightEl.innerHTML = '';
    if (centerEl) centerEl.innerHTML = '';

    playerDeck.forEach(cardId => {
        const card = CARDS[cardId];
        if (!card) return;

        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.id = `card-${cardId}`;
        cardEl.style.borderColor = card.color;
        cardEl.innerHTML = `
            <div class="card-cost">${card.cost}</div>
            <div class="card-icon">${card.icon}</div>
            <div class="card-name">${card.name}</div>
            <div class="card-freeze-btn" style="position:absolute; bottom:5px; left:5px; background:#74b9ff; border:2px solid white; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-size:0.7rem; cursor:pointer; color:white; box-shadow:0 2px #54a0ff; transition: transform 0.1s; z-index: 100;">🧊</div>
        `;

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

        const freezeBtn = cardEl.querySelector('.card-freeze-btn');
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

                if (selectedFreezeCardId === cardId) {
                    selectedFreezeCardId = null;
                } else {
                    selectedFreezeCardId = cardId;
                    selectedCardId = null;
                    document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
                }
            };
        }

        // Distribute by type: buildings → left, units → center, auras → right
        // mr-p is classified as building in CARDS but visually belongs with the auras.
        // On narrow viewports the fixed side-panels sit off-screen, so we collapse
        // the whole deck into the centre row (which is inside #app and gains a
        // scroll/wrap layout via the mobile CSS).
        const collapseToCenter = window.innerWidth <= 600;
        let target;
        if (collapseToCenter) target = centerEl;
        else if (card.type === 'building' && cardId !== 'mr-p') target = leftEl;
        else if (card.type === 'unit') target = centerEl;
        else target = rightEl;

        if (!target) target = centerEl;
        target.appendChild(cardEl);
    });
}
window.buildDeck = buildDeck;
