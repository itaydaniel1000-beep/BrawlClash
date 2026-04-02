// ai-logic.js - Bot behavior and strategy

function aiUpdate(dt, now) {
    if (aiDelayTimer > now) return;

    // Hard AI uses fluid strategy, so we only force blind rebuilds for Easy/Normal
    if (difficulty !== 'hard') {
        for (let i = 0; i < pendingRebuilds.length; i++) {
            let rebuild = pendingRebuilds[i];
            let count = aiDeaths.filter(d => d.type === rebuild.type && Math.hypot(d.x - rebuild.x, d.y - rebuild.y) < 30).length;
            if (count >= 3) {
                pendingRebuilds.splice(i, 1);
                i--; continue;
            }
            if (enemyElixir >= CARDS[rebuild.type].cost) {
                spawnEntity(rebuild.x, rebuild.y, 'enemy', rebuild.type);
                pendingRebuilds.splice(i, 1);
                aiDelayTimer = now + 600;
                return;
            }
        }
    }

    if (difficulty === 'easy') {
        // Random placement
        if (enemyElixir >= 7) {
            let cards = Object.keys(CARDS).filter(c => CARDS[c].cost <= enemyElixir);
            if (cards.length > 0) {
                let card = cards[Math.floor(Math.random() * cards.length)];
                let x = Math.random() * (CONFIG.CANVAS_WIDTH - 60) + 30;
                let y = Math.random() * (CONFIG.CANVAS_HEIGHT / 2 - 60) + 30;
                spawnEntity(x, y, 'enemy', card);
                aiDelayTimer = now + 1000;
            }
        }
    } else if (difficulty === 'normal') {
        // Reactive
        if (enemyElixir >= 4) {
            // Find incoming player units (visible only)
            let incoming = units.concat(buildings).filter(u => u.team === 'player' && !u.isInvisible);
            if (incoming.length > 0) {
                // Defend lane
                let targetLoc = incoming[0].x;
                if (enemyElixir >= 9 && Math.random() > 0.5) spawnEntity(targetLoc, 100, 'enemy', 'pam');
                else spawnEntity(targetLoc, 150, 'enemy', 'scrappy');
                aiDelayTimer = now + 1500;
            } else if (enemyElixir >= 8) {
                // Push
                spawnEntity(CONFIG.CANVAS_WIDTH / 2, 100, 'enemy', 'leon');
                aiDelayTimer = now + 2000;
            }
        }
    } else if (difficulty === 'hard') {
        // God-Tier AI Strategy
        let playerUnitsTanks = units.filter(u => u.team === 'player' && !u.isInvisible && !u.isFrozen && (u.type === 'bruce' || u.type === 'bull' || u.type === 'leon'));
        let safeUnderAttack = (now - (enemySafe.lastDamageTime || 0) < 3000) || units.some(u => u.team === 'player' && !u.isInvisible && !u.isFrozen && u.y < 250);
        let playerIsWeak = units.filter(u => u.team === 'player' && !u.isInvisible && !u.isFrozen).length === 0 && buildings.filter(b => b.team === 'player' && !b.isInvisible && !b.isFrozen).length === 0;

        // Base cluster logic: AI builds an impenetrable fortress overlapping perfectly
        let clusterX = CONFIG.CANVAS_WIDTH / 2;
        let clusterY = 160;
        let pams = auras.filter(a => a.team === 'enemy' && a.type === 'pam' && !a.isFrozen);
        let inPamHeal = (x, y) => pams.some(p => Math.hypot(p.x - x, p.y - y) <= p.radius);

        // PRIORITY 1: CRITICAL DEFENSE (Save the Safe!)
        if (safeUnderAttack) {
            let threats = units.filter(u => u.team === 'player' && u.y < 350).sort((a, b) => a.y - b.y);
            if (threats.length > 0) {
                let t = threats[0];
                if (enemyElixir >= CARDS['bruce'].cost && Math.random() > 0.3) {
                    let defUnit = (Math.random() > 0.85 && enemyElixir >= CARDS['bull'].cost) ? 'bull' : 'bruce';
                    spawnEntity(t.x, Math.max(80, t.y - 40), 'enemy', defUnit);
                    aiDelayTimer = now + 400; return;
                }
                if (enemyElixir >= CARDS['emz'].cost && Math.random() > 0.5) {
                    spawnEntity(enemySafe.x, enemySafe.y + 70, 'enemy', 'emz'); 
                    aiDelayTimer = now + 500; return;
                }
                if (enemyElixir >= CARDS['scrappy'].cost) {
                    spawnEntity(enemySafe.x + (Math.random() * 60 - 30), enemySafe.y + 50, 'enemy', 'scrappy');
                    aiDelayTimer = now + 400; return;
                }
            }
        }

        // PRIORITY 2: COUNTER IMMINENT PUSHES STRATEGICALLY
        if (playerUnitsTanks.length >= 2 || (playerUnitsTanks.length > 0 && playerUnitsTanks[0].type === 'bull')) {
            let incomingThreats = playerUnitsTanks.filter(u => u.y < CONFIG.CANVAS_HEIGHT / 2 + 150);
            if (incomingThreats.length > 0) {
                let massX = incomingThreats.reduce((sum, u) => sum + u.x, 0) / incomingThreats.length;
                let leadY = Math.min(...incomingThreats.map(u => u.y));

                // Drop a Pam block exactly where they are walking to stall them inside heal
                if (enemyElixir >= CARDS['pam'].cost && !inPamHeal(massX, leadY - 100)) {
                    spawnEntity(massX, Math.max(120, leadY - 100), 'enemy', 'pam');
                    aiDelayTimer = now + 500; return;
                }
                // Back it up with heavy artillery
                if (enemyElixir >= CARDS['penny'].cost) {
                    spawnEntity(massX + (Math.random() * 80 - 40), Math.max(90, leadY - 150), 'enemy', 'penny');
                    aiDelayTimer = now + 600; return;
                }
                if (enemyElixir >= CARDS['scrappy'].cost) {
                    spawnEntity(massX + (Math.random() * 60 - 30), Math.max(100, leadY - 100), 'enemy', 'scrappy');
                    aiDelayTimer = now + 500; return;
                }
            }
        }

        // PRIORITY 3: PUNISH WEAKNESS OR OPEN LANES
        if (playerIsWeak && enemyElixir >= Math.max(12, CARDS['leon'].cost)) {
            let atkX = Math.random() > 0.5 ? 80 : CONFIG.CANVAS_WIDTH - 80; 
            spawnEntity(atkX, CONFIG.CANVAS_HEIGHT / 2 - 50, 'enemy', 'leon'); 
            aiDelayTimer = now + 800; return;
        }

        // PRIORITY 4: ESTABLISH QUICK DEFENSE THEN BUILD THE DEATH-HUB
        if (enemyElixir >= 4) {
            let myBuildings = buildings.filter(b => b.team === 'enemy');
            let scrappys = myBuildings.filter(b => b.type === 'scrappy');

            if (scrappys.length < 2 && enemyElixir >= CARDS['scrappy'].cost) {
                spawnEntity(enemySafe.x + (Math.random() * 100 - 50), enemySafe.y + 60, 'enemy', 'scrappy');
                aiDelayTimer = now + 500; return;
            }

            if (pams.length === 0 && enemyElixir >= CARDS['pam'].cost) {
                spawnEntity(clusterX, clusterY, 'enemy', 'pam');
                aiDelayTimer = now + 600; return;
            }

            let pennys = myBuildings.filter(b => b.type === 'penny');
            if (pams.length > 0 && pennys.length < 2 && enemyElixir >= CARDS['penny'].cost) {
                let p = pams[0];
                if (p) {
                    spawnEntity(p.x + (Math.random() * 60 - 30), p.y + (Math.random() * 40 - 20), 'enemy', 'penny');
                    aiDelayTimer = now + 500; return;
                }
            }

            let eightBits = auras.filter(a => a.team === 'enemy' && a.type === '8bit');
            if (pams.length > 0 && pennys.length > 0 && eightBits.length === 0 && enemyElixir >= CARDS['8bit'].cost) {
                let p = pams[0];
                if (p) {
                    spawnEntity(p.x, p.y, 'enemy', '8bit');
                    aiDelayTimer = now + 500; return;
                }
            }

            let maxes = auras.filter(a => a.team === 'enemy' && a.type === 'max');
            if (eightBits.length > 0 && maxes.length === 0 && enemyElixir >= CARDS['max'].cost) {
                let p = pams[0];
                if (p) {
                    spawnEntity(p.x, p.y, 'enemy', 'max');
                    aiDelayTimer = now + 500; return;
                }
            }

            if (maxes.length > 0) {
                if (!aiWavePreparation && enemyElixir >= 35) {
                    aiWavePreparation = true;
                    aiWaveUnitsSpawned = 0;
                    aiWaveStartTime = now;
                }

                if (aiWavePreparation) {
                    let p = pams[0];
                    if (!p) {
                        aiWavePreparation = false; 
                        return;
                    }
                    let spawnX = p.x;
                    let spawnY = p.y + 60; 

                    if (aiWaveUnitsSpawned < 10) {
                        let unitTypes = ['bruce', 'bruce', 'scrappy', 'bull', 'leon', 'bruce', 'bruce', 'scrappy', 'bull', 'leon'];
                        let type = unitTypes[aiWaveUnitsSpawned];
                        let cost = CARDS[type].cost;

                        if (enemyElixir >= cost) {
                            spawnEntity(spawnX + (Math.random() * 120 - 60), spawnY + (Math.random() * 60), 'enemy', type, true);
                            aiWaveUnitsSpawned++;
                            aiDelayTimer = now + 200; 
                            return;
                        }
                    }

                    if (aiWaveUnitsSpawned >= 10 || (enemyElixir < 3 && aiWaveUnitsSpawned >= 5)) {
                        units.concat(buildings, auras).forEach(ent => {
                            if (ent.team === 'enemy' && ent.isFrozen) {
                                ent.isFrozen = false;
                            }
                        });
                        aiWavePreparation = false;
                        aiDelayTimer = now + 6000; 
                    }
                }
            }
        }
    }
}
