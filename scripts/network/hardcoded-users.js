// hardcoded-users.js — Source-of-truth snapshots for specific named users.
//
// Per user request: "I want only the user 'Amit David' with code 1234 to
// have on the server that remembers the user and the details." Since we
// have no real backend, this file IS the server — it's a static lookup
// baked into the deployed JS. When a user logs in with a username + a
// "code" that matches an entry here, the snapshot is loaded onto their
// device (overriding whatever empty namespace the new device has).
//
// Limitations:
//   • Updates the user makes during play are NOT written back here. To
//     "remember" new progress, the snapshot below has to be manually
//     edited in source + committed + pushed.
//   • Only the hardcoded usernames get this treatment. Everyone else
//     still relies on the regular local-storage / join-request flows.
//   • The "code" is checked in plain-text against the supplied password
//     at login time. Combined with the username it acts as a per-user
//     access gate — knowing one without the other doesn't unlock.

const HARDCODED_USERS = {
    'Amit David': {
        code: '1234',
        snapshot: {
            stats: {
                coins:        5000,
                gems:         100,
                credits:      300,
                pp:           500,
                tokens:       0,
                hasBrawlPass: false,
                adFree:       false
            },
            trophies: 250,
            levels:   {},                       // per-card power levels
            unlockedCards: ['bruce', 'leon', 'bull', 'pam', 'scrappy', 'penny'],
            claimedTiers:        [],
            claimedPremiumTiers: [],
            claimedTrophyTiers:  [1, 2],
            dailyQuests:         [],
            questsLastRefresh:   '',
            deck: ['bruce', 'leon', 'bull', 'pam', 'scrappy', 'penny'],
            starPowers: {},
            favoriteBrawler: null
        }
    }
};

// Returns the matching snapshot (and code) for a username, or null. Code
// equality is checked separately by the caller — this function just looks
// up by name.
function getHardcodedUser(name) {
    if (!name) return null;
    const entry = HARDCODED_USERS[name];
    return entry || null;
}
window.getHardcodedUser = getHardcodedUser;

// Apply a hardcoded snapshot the same way _applyHostResourceSync does —
// mutate globals in place + save + refresh UI. This deliberately mirrors
// the cloud-restore path so the rest of the app can't tell where the
// data came from.
function applyHardcodedSnapshot(snap) {
    if (!snap || typeof playerStats === 'undefined') return false;
    if (snap.stats) {
        if (typeof snap.stats.coins        === 'number')  playerStats.coins        = snap.stats.coins;
        if (typeof snap.stats.gems         === 'number')  playerStats.gems         = snap.stats.gems;
        if (typeof snap.stats.credits      === 'number')  playerStats.credits      = snap.stats.credits;
        if (typeof snap.stats.pp           === 'number')  playerStats.pp           = snap.stats.pp;
        if (typeof snap.stats.tokens       === 'number')  playerStats.tokens       = snap.stats.tokens;
        if (typeof snap.stats.hasBrawlPass === 'boolean') playerStats.hasBrawlPass = snap.stats.hasBrawlPass;
        if (typeof snap.stats.adFree       === 'boolean') playerStats.adFree       = snap.stats.adFree;
    }
    if (typeof snap.trophies === 'number') window.playerTrophies = snap.trophies;
    if (snap.levels && typeof snap.levels === 'object') {
        playerStats.levels = Object.assign({}, snap.levels);
    }
    const _replaceArray = (field) => {
        if (Array.isArray(snap[field])) playerStats[field] = snap[field].slice();
    };
    _replaceArray('unlockedCards');
    _replaceArray('claimedTiers');
    _replaceArray('claimedPremiumTiers');
    _replaceArray('claimedTrophyTiers');
    _replaceArray('dailyQuests');
    if (typeof snap.questsLastRefresh === 'string') playerStats.questsLastRefresh = snap.questsLastRefresh;
    if (Array.isArray(snap.deck) && typeof window.playerDeck !== 'undefined') {
        window.playerDeck.length = 0;
        snap.deck.forEach(c => window.playerDeck.push(c));
    }
    if (snap.starPowers && typeof window.playerStarPowers !== 'undefined') {
        Object.keys(window.playerStarPowers).forEach(k => delete window.playerStarPowers[k]);
        Object.assign(window.playerStarPowers, snap.starPowers);
    }
    if (typeof snap.favoriteBrawler === 'string' || snap.favoriteBrawler === null) {
        window.favoriteBrawler = snap.favoriteBrawler;
    }
    try { if (typeof saveStats === 'function') saveStats(); } catch (e) {}
    try { if (typeof updateStatsUI === 'function') updateStatsUI(); } catch (e) {}
    try { if (typeof updateHomeScreen === 'function') updateHomeScreen(); } catch (e) {}
    return true;
}
window.applyHardcodedSnapshot = applyHardcodedSnapshot;
