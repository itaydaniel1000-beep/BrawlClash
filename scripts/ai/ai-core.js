// ai-core.js - Base AI Behavior and Update Loop

function aiUpdate(dt, now) {
    if (!enemySafe || enemySafe.isDead || currentBattleRoom) return;
    
    if (difficulty === 'easy') aiUpdateEasy(dt, now);
    else if (difficulty === 'normal') aiUpdateNormal(dt, now);
    else if (difficulty === 'hard') aiUpdateHard(dt, now);
}

function canAIAfford(type) {
    return enemyElixir >= CARDS[type].cost;
}

function aiSpawn(x, y, type) {
    if (canAIAfford(type)) {
        spawnEntity(x, y, 'enemy', type);
        return true;
    }
    return false;
}
