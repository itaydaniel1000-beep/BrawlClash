// ui-star-powers.js - Star Power Selection UI

function renderSPSelection() {
    const container = document.getElementById('sp-cards-container');
    if (!container) return;
    container.innerHTML = '';

    // Show every brawler that has configured star powers
    Object.keys(STAR_POWERS).forEach(key => {
        const card = CARDS[key];
        const sps = STAR_POWERS[key];
        if (!card || !sps || sps.length === 0) return;

        const cardItem = document.createElement('div');
        cardItem.className = 'sp-card-item';
        cardItem.innerHTML = `
            <div class="sp-card-icon">${card.icon}</div>
            <div class="sp-card-name">${card.name}</div>
            <div class="sp-options" id="options-${key}"></div>
        `;

        const optionsContainer = cardItem.querySelector(`#options-${key}`);
        sps.forEach(sp => {
            const btn = document.createElement('div');
            btn.className = `sp-option-btn ${playerStarPowers[key] === sp.id ? 'selected' : ''}`;
            btn.innerHTML = `
                <span class="sp-name">${sp.name}</span>
                <span class="sp-desc">${sp.desc}</span>
            `;
            btn.onclick = (e) => {
                e.stopPropagation();
                playerStarPowers[key] = sp.id;
                localStorage.setItem(_userKey('sp'), JSON.stringify(playerStarPowers));
                renderSPSelection();
            };
            optionsContainer.appendChild(btn);
        });

        container.appendChild(cardItem);
    });
}
