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
    if (!deckContainer) return;
    deckContainer.innerHTML = '';
    
    playerDeck.forEach(cardId => {
        const card = CARDS[cardId];
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.id = `card-${cardId}`;
        cardEl.innerHTML = `
            <div class="card-cost">${card.cost}</div>
            <div class="card-icon">${card.icon}</div>
            <div class="card-freeze-btn" style="position:absolute; bottom:5px; left:5px; background:#74b9ff; border:2px solid white; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-size:0.7rem; cursor:pointer; color:white; box-shadow:0 2px #54a0ff; transition: transform 0.1s; z-index: 100;">🧊</div>
        `;
        
        cardEl.onclick = (e) => {
            e.stopPropagation();
            const canAfford = playerElixir >= (card.cost - 0.01) || adminHacks.infiniteElixir;
            if (!canAfford) return;

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
                const canAfford = playerElixir >= (card.cost - 0.01) || adminHacks.infiniteElixir;
                if (!canAfford) return;

                if (selectedFreezeCardId === cardId) {
                    selectedFreezeCardId = null;
                } else {
                    selectedFreezeCardId = cardId;
                    selectedCardId = null; 
                    document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
                }
            };
        }
        
        deckContainer.appendChild(cardEl);
    });
}
window.buildDeck = buildDeck;
