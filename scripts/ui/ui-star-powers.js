// ui-star-powers.js - Star Power Selection UI

function renderSPSelection() {
    const container = document.getElementById('sp-cards-container');
    if (!container) return;
    container.innerHTML = '';

    // When the admin "כל הסטאר פאוורים" hack is engaged, every
    // hasStarPower() check returns true in gameplay — both SP1 AND SP2
    // are active for every brawler simultaneously. The selection UI
    // mirrors that by highlighting BOTH buttons as selected so the
    // player sees what's actually live on the field. The saved
    // playerStarPowers choice is still respected as the "fallback"
    // once admin is turned off, so a click below still records the
    // preference.
    const _allOn = (typeof adminHacks !== 'undefined') && !!adminHacks.allStarPowers;
    if (_allOn) {
        const banner = document.createElement('div');
        banner.style.cssText = 'background:rgba(241, 196, 15, 0.18); border:1px solid #f1c40f; color:#f1c40f; border-radius:10px; padding:8px 12px; margin-bottom:10px; font-size:0.9rem; text-align:center;';
        banner.textContent = '🛡️ אדמין: "כל הסטאר פאוורים" פעיל — כל הכוחות מופעלים בקרב';
        container.appendChild(banner);
    }

    // Show every brawler that has configured star powers
    Object.keys(STAR_POWERS).forEach(key => {
        const card = CARDS[key];
        const sps = STAR_POWERS[key];
        if (!card || !sps || sps.length === 0) return;

        const cardItem = document.createElement('div');
        cardItem.className = 'sp-card-item';
        const spIcon = (typeof getCardIconHTML === 'function')
            ? getCardIconHTML(key, 'width: 32px; height: auto; display: inline-block; image-rendering: pixelated; vertical-align: middle;')
            : card.icon;
        cardItem.innerHTML = `
            <div class="sp-card-icon">${spIcon}</div>
            <div class="sp-card-name">${card.name}</div>
            <div class="sp-options" id="options-${key}"></div>
        `;

        const optionsContainer = cardItem.querySelector(`#options-${key}`);
        sps.forEach(sp => {
            const btn = document.createElement('div');
            // Highlight as "selected" when EITHER the player's saved choice
            // matches OR the admin all-on flag is set.
            const isSelected = _allOn || (playerStarPowers[key] === sp.id);
            btn.className = `sp-option-btn ${isSelected ? 'selected' : ''}`;
            btn.innerHTML = `
                <span class="sp-name">${sp.name}</span>
                <span class="sp-desc">${sp.desc}</span>
            `;
            btn.onclick = (e) => {
                e.stopPropagation();
                // Always record the user's pick — so the moment admin is
                // turned off the right SP comes back as their default.
                playerStarPowers[key] = sp.id;
                localStorage.setItem(_userKey('sp'), JSON.stringify(playerStarPowers));
                renderSPSelection();
            };
            optionsContainer.appendChild(btn);
        });

        container.appendChild(cardItem);
    });
}
