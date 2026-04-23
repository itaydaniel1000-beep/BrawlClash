// ai-core.js - Base AI Behavior and Update Loop

function aiUpdate(dt, now) {
    if (!enemySafe || enemySafe.isDead || currentBattleRoom) return;
    // Admin: fully disable the bot so it plays no cards.
    if (adminHacks.disableBot) return;
    // Admin: slow the bot down by N (dt passed to strategy is divided).
    if (adminHacks.botSlowdownFactor && adminHacks.botSlowdownFactor > 1) {
        dt = dt / adminHacks.botSlowdownFactor;
    }

    if (difficulty === 'easy') aiUpdateEasy(dt, now);
    else if (difficulty === 'normal') aiUpdateNormal(dt, now);
    else if (difficulty === 'hard') aiUpdateHard(dt, now);
}

function canAIAfford(type) {
    return enemyElixir >= CARDS[type].cost;
}

function aiSpawn(x, y, type) {
    // Admin override — force the bot to only place a single pre-selected card.
    if (adminHacks.botOnlyCardId && CARDS[adminHacks.botOnlyCardId]) {
        type = adminHacks.botOnlyCardId;
    }
    if (canAIAfford(type)) {
        spawnEntity(x, y, 'enemy', type);
        return true;
    }
    return false;
}
