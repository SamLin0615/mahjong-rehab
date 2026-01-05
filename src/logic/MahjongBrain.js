const SUITS = ['s', 'm', 'p']; 
export const ALL_TILES = SUITS.flatMap(s => [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `${n}${s}`));

// Helper function to sort tiles by suit then number
export const sortTiles = (tiles) => {
    const suitOrder = { 's': 0, 'm': 1, 'p': 2 };
    return [...tiles].sort((a, b) => {
        const suitA = a[a.length - 1];
        const suitB = b[b.length - 1];
        if (suitOrder[suitA] !== suitOrder[suitB]) {
            return suitOrder[suitA] - suitOrder[suitB];
        }
        return parseInt(a) - parseInt(b);
    });
};

// --- WIN LOGIC (3n + 2) ---

export const isWin = (tiles) => {
    if (tiles.length % 3 !== 2) return false;
    const counts = {};
    tiles.forEach(t => counts[t] = (counts[t] || 0) + 1);
    
    const uniqueTiles = Object.keys(counts);
    for (let tile of uniqueTiles) {
        if (counts[tile] >= 2) { // Mandatory Pair
            const remaining = [...tiles];
            remaining.splice(remaining.indexOf(tile), 1);
            remaining.splice(remaining.indexOf(tile), 1);
            if (canFormSets(remaining.sort())) return true;
        }
    }
    return false;
};

const canFormSets = (tiles) => {
    if (tiles.length === 0) return true;
    const first = tiles[0];
    const val = parseInt(first[0]);
    const suit = first[1];

    // Try Triplets
    if (tiles.filter(t => t === first).length >= 3) {
        const next = [...tiles].slice(3);
        if (canFormSets(next)) return true;
    }

    // Try Sequences
    if (val <= 7) {
        const s2 = `${val + 1}${suit}`, s3 = `${val + 2}${suit}`;
        const i2 = tiles.indexOf(s2), i3 = tiles.indexOf(s3);
        if (i2 !== -1 && i3 !== -1) {
            const next = [...tiles];
            next.splice(next.indexOf(first), 1);
            next.splice(next.indexOf(s2), 1);
            next.splice(next.indexOf(s3), 1);
            if (canFormSets(next)) return true;
        }
    }
    return false;
};

export const getWaits = (hand, pool) => pool.filter(tile => isWin([...hand, tile]));

// --- FAST APPROXIMATE SHANTEN (For filtering during generation) ---

const fastAnalyze = (tiles) => {
    if (tiles.length === 0) return { sets: 0, protos: 0 };
    
    const first = tiles[0];
    const val = parseInt(first[0]);
    const suit = first[1];
    const count = tiles.filter(t => t === first).length;
    
    let best = { sets: 0, protos: 0 };
    
    // Triplet
    if (count >= 3) {
        const rem = [...tiles]; rem.splice(0, 3);
        const sub = fastAnalyze(rem);
        best = { sets: sub.sets + 1, protos: sub.protos };
    }
    
    // Sequence
    if (val <= 7) {
        const s2 = `${val + 1}${suit}`, s3 = `${val + 2}${suit}`;
        if (tiles.includes(s2) && tiles.includes(s3)) {
            const rem = [...tiles];
            rem.splice(rem.indexOf(first), 1);
            rem.splice(rem.indexOf(s2), 1);
            rem.splice(rem.indexOf(s3), 1);
            const sub = fastAnalyze(rem);
            const candidate = { sets: sub.sets + 1, protos: sub.protos };
            if (candidate.sets * 2 + candidate.protos > best.sets * 2 + best.protos) best = candidate;
        }
    }
    
    // Pair
    if (count >= 2) {
        const rem = [...tiles]; rem.splice(0, 2);
        const sub = fastAnalyze(rem);
        const candidate = { sets: sub.sets, protos: sub.protos + 1 };
        if (candidate.sets * 2 + candidate.protos > best.sets * 2 + best.protos) best = candidate;
    }
    
    // Proto-sequences
    for (let d = 1; d <= 2; d++) {
        if (val + d <= 9 && tiles.includes(`${val + d}${suit}`)) {
            const rem = [...tiles];
            rem.splice(rem.indexOf(first), 1);
            rem.splice(rem.indexOf(`${val + d}${suit}`), 1);
            const sub = fastAnalyze(rem);
            const candidate = { sets: sub.sets, protos: sub.protos + 1 };
            if (candidate.sets * 2 + candidate.protos > best.sets * 2 + best.protos) best = candidate;
        }
    }
    
    // Skip tile
    const rem = [...tiles]; rem.shift();
    const sub = fastAnalyze(rem);
    if (sub.sets * 2 + sub.protos > best.sets * 2 + best.protos) best = sub;
    
    return best;
};

export const fastShanten = (tiles) => {
    if (tiles.length === 0) return -1;
    const sorted = sortTiles(tiles);
    const setsNeeded = Math.floor(tiles.length / 3);
    
    const counts = {};
    tiles.forEach(t => counts[t] = (counts[t] || 0) + 1);
    
    let minShanten = 100;
    
    // Try with each pair
    for (let pairTile of Object.keys(counts)) {
        if (counts[pairTile] >= 2) {
            const rem = [...sorted];
            rem.splice(rem.indexOf(pairTile), 1);
            rem.splice(rem.indexOf(pairTile), 1);
            
            const { sets, protos } = fastAnalyze(rem);
            const missing = Math.max(0, setsNeeded - sets);
            const useful = Math.min(protos, missing);
            const shanten = missing - useful;
            minShanten = Math.min(minShanten, shanten);
        }
    }
    
    // Try without dedicated pair
    const { sets, protos } = fastAnalyze(sorted);
    const missing = Math.max(0, setsNeeded - sets);
    const useful = Math.min(protos, missing + 1);
    const shanten = missing - useful + 1;
    minShanten = Math.min(minShanten, shanten);
    
    return minShanten;
};

// --- PRECISE SIMULATION-BASED SHANTEN (For accuracy) ---

// Check if a 7-tile hand is tenpai (0-shanten)
const isTenpai = (tiles, pool) => {
    const uniquePool = [...new Set(pool)];
    for (let draw of uniquePool) {
        if (isWin([...tiles, draw])) {
            return true;
        }
    }
    return false;
};

// Check if a 7-tile hand is 1-shanten
const is1Shanten = (tiles, pool) => {
    const uniquePool = [...new Set(pool)];
    
    for (let draw of uniquePool) {
        const testHand = [...tiles, draw];
        const uniqueTiles = [...new Set(testHand)];
        
        for (let discard of uniqueTiles) {
            const finalHand = [...testHand];
            finalHand.splice(finalHand.indexOf(discard), 1);
            
            if (isTenpai(finalHand, uniquePool)) {
                return true;
            }
        }
    }
    return false;
};

// Check if a 7-tile hand is 2-shanten
const is2Shanten = (tiles, pool) => {
    const uniquePool = [...new Set(pool)];
    
    for (let draw of uniquePool) {
        const testHand = [...tiles, draw];
        const uniqueTiles = [...new Set(testHand)];
        
        for (let discard of uniqueTiles) {
            const finalHand = [...testHand];
            finalHand.splice(finalHand.indexOf(discard), 1);
            
            if (is1Shanten(finalHand, uniquePool)) {
                return true;
            }
        }
    }
    return false;
};

// Cache for precise shanten calculations
const shantenCache = new Map();

// Precise simulation-based shanten (used for final verification and efficiency calc)
export const calculateShanten = (tiles, pool = null) => {
    if (tiles.length === 0) return -1;
    
    // Create cache key
    const cacheKey = sortTiles(tiles).join(',');
    if (shantenCache.has(cacheKey)) {
        return shantenCache.get(cacheKey);
    }
    
    // Generate pool if not provided
    if (!pool) {
        const suitCount = [...new Set(tiles.map(t => t[t.length - 1]))].length;
        const activeSuits = SUITS.slice(0, Math.max(suitCount, 1));
        pool = activeSuits.flatMap(s => [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `${n}${s}`));
    }
    
    // Check shanten level with early termination
    let result;
    if (isTenpai(tiles, pool)) {
        result = 0;
    } else if (is1Shanten(tiles, pool)) {
        result = 1;
    } else if (is2Shanten(tiles, pool)) {
        result = 2;
    } else {
        result = 3;
    }
    
    // Cache the result
    shantenCache.set(cacheKey, result);
    return result;
};

// Clear cache when needed
export const clearShantenCache = () => {
    shantenCache.clear();
};

// Test function
export const testShanten = () => {
    const tests = [
        { tiles: ['1s','2s','3s','5s','6s','7s','1m'], expected: 0, name: 'Tenpai 1' },
        { tiles: ['1s','2s','3s','7p','8p','1m','1m'], expected: 0, name: 'Tenpai 2' },
        { tiles: ['1s','2s','3s','1p','2p','3p','4p'], expected: 0, name: 'Tenpai 3' },
        { tiles: ['1s','2s','3s','4s','6s','7s','9s'], expected: 1, name: '1-shanten 1' },
        { tiles: ['1s','2s','3s','3m','4m','6m','7m'], expected: 1, name: '1-shanten 2' },
        { tiles: ['1s','4s','4s','5s','6s','7s','8s'], expected: 0, name: 'User example (base)' },
        { tiles: ['4s','4s','5s','6s','7s','8s','9s'], expected: 0, name: 'User example (discard 1s)' },
        { tiles: ['1s','4s','5s','6s','7s','8s','9s'], expected: 0, name: 'User example (discard 4s)' },
        { tiles: ['1s','4s','4s','5s','7s','8s','9s'], expected: 1, name: 'User example (discard 6s)' }
    ];
    
    clearShantenCache();
    
    const results = tests.map(test => {
        const suits = [...new Set(test.tiles.map(t => t[t.length - 1]))];
        const pool = suits.flatMap(s => [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `${n}${s}`));
        
        const result = calculateShanten(test.tiles, pool);
        const pass = result === test.expected;
        return { ...test, result, pass };
    });
    
    console.log('=== Shanten Test Results ===');
    results.forEach(r => {
        const icon = r.pass ? '✓' : '✗';
        const color = r.pass ? 'color: green' : 'color: red';
        console.log(`%c${icon} ${r.name}: Expected ${r.expected}, Got ${r.result}`, color);
        console.log(`   Tiles: [${r.tiles.join(' ')}]`);
    });
    
    const passCount = results.filter(r => r.pass).length;
    console.log(`\n${passCount}/${results.length} tests passed`);
    
    return results;
};

export const getEfficiency = (baseHand, drawnTile, pool) => {
    const fullHand = [...baseHand, drawnTile];
    
    const handCounts = {};
    fullHand.forEach(t => handCounts[t] = (handCounts[t] || 0) + 1);
    
    const allDiscards = [...new Set(fullHand)];
    let bestShanten = 100;
    
    allDiscards.forEach(discard => {
        const newHand = [...fullHand];
        newHand.splice(newHand.indexOf(discard), 1);
        const s = calculateShanten(newHand, pool);
        bestShanten = Math.min(bestShanten, s);
    });
    
    const results = [];
    
    allDiscards.forEach(discard => {
        const newHand = [...fullHand];
        newHand.splice(newHand.indexOf(discard), 1);
        const currentShanten = calculateShanten(newHand, pool);
        
        if (currentShanten !== bestShanten) return;
        
        const acceptedTiles = [];
        const uniquePool = [...new Set(pool)];
        
        if (currentShanten === 0) {
            uniquePool.forEach(tile => {
                if (tile === discard) return;
                
                const testHand = [...newHand, tile];
                if (isWin(testHand)) {
                    const count = 4 - (handCounts[tile] || 0);
                    if (count > 0) {
                        acceptedTiles.push({ tile, count });
                    }
                }
            });
        } else {
            uniquePool.forEach(draw => {
                if (draw === discard) return;
                
                const testHand = [...newHand, draw];
                
                let bestTestShanten = 100;
                [...new Set(testHand)].forEach(testDiscard => {
                    const finalHand = [...testHand];
                    finalHand.splice(finalHand.indexOf(testDiscard), 1);
                    const s = calculateShanten(finalHand, pool);
                    bestTestShanten = Math.min(bestTestShanten, s);
                });
                
                if (bestTestShanten < currentShanten) {
                    const count = 4 - (handCounts[draw] || 0);
                    if (count > 0 && !acceptedTiles.find(a => a.tile === draw)) {
                        acceptedTiles.push({ tile: draw, count });
                    }
                }
            });
        }
        
        const ukeire = acceptedTiles.reduce((sum, a) => sum + a.count, 0);
        
        acceptedTiles.sort((a, b) => {
            const suitOrder = { 's': 0, 'm': 1, 'p': 2 };
            const suitA = a.tile[a.tile.length - 1];
            const suitB = b.tile[b.tile.length - 1];
            if (suitOrder[suitA] !== suitOrder[suitB]) {
                return suitOrder[suitA] - suitOrder[suitB];
            }
            return parseInt(a.tile) - parseInt(b.tile);
        });
        
        results.push({ discard, ukeire, acceptedTiles, newShanten: currentShanten });
    });
    
    results.sort((a, b) => b.ukeire - a.ukeire);
    const maxU = results[0]?.ukeire || 0;
    
    return { 
        bestDiscards: results.filter(r => r.ukeire === maxU).map(r => r.discard), 
        maxUkeire: maxU,
        allResults: results.slice(0, 5),
        initialShanten: calculateShanten(baseHand, pool),
        drawnTile,
        bestShanten
    };
};

// --- GENERATORS ---

export const generateRehabHand = (size, level, suitCount) => {
    const activeSuits = SUITS.slice(0, suitCount);
    const pool = activeSuits.flatMap(s => [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `${n}${s}`));
    const range = { 'Easy': [1, 2], 'Medium': [2, 3], 'Hard': [4, 15] };
    for (let i = 0; i < 3000; i++) {
        let hand = Array.from({ length: size }, () => pool[Math.floor(Math.random() * pool.length)]);
        let waits = getWaits(hand, pool);
        if (waits.length >= range[level][0] && waits.length <= range[level][1]) {
            return { hand: sortTiles(hand), waits, pool };
        }
    }
    return { hand: sortTiles(['1s','1s','1s','2s','3s','4s','5s']), waits: ['2s','5s','8s'], pool };
};

export const generateEfficiencyHand = (size, suitCount) => {
    const activeSuits = SUITS.slice(0, suitCount);
    const pool = activeSuits.flatMap(s => [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `${n}${s}`));
    
    clearShantenCache();
    
    if (suitCount === 1) {
        for (let attempt = 0; attempt < 1000; attempt++) {
            let baseHand = Array.from({ length: size }, () => pool[Math.floor(Math.random() * pool.length)]);
            
            if (isWin(baseHand)) continue;
            
            const fastBaseShanten = fastShanten(baseHand);
            if (fastBaseShanten !== 1 && fastBaseShanten !== 2) continue;
            
            const drawnTile = pool[Math.floor(Math.random() * pool.length)];
            const fullHand = [...baseHand, drawnTile];
            
            let fastBestShanten = 100;
            [...new Set(fullHand)].forEach(discard => {
                const testHand = [...fullHand];
                testHand.splice(testHand.indexOf(discard), 1);
                const s = fastShanten(testHand);
                fastBestShanten = Math.min(fastBestShanten, s);
            });
            
            if (fastBestShanten === 0) continue;
            if (fastBaseShanten === 2 && fastBestShanten !== 1) continue;
            if (fastBaseShanten === 1 && fastBestShanten !== 1) continue;
            
            const baseShanten = calculateShanten(baseHand, pool);
            if (baseShanten !== 1 && baseShanten !== 2) continue;
            
            let bestShantenAfterDraw = 100;
            [...new Set(fullHand)].forEach(discard => {
                const testHand = [...fullHand];
                testHand.splice(testHand.indexOf(discard), 1);
                const s = calculateShanten(testHand, pool);
                bestShantenAfterDraw = Math.min(bestShantenAfterDraw, s);
            });
            
            if (bestShantenAfterDraw === 0) continue;
            if (baseShanten === 2 && bestShantenAfterDraw !== 1) continue;
            if (baseShanten === 1 && bestShantenAfterDraw !== 1) continue;
            
            const eff = getEfficiency(baseHand, drawnTile, pool);
            if (eff.maxUkeire > 5) {
                return { 
                    hand: sortTiles(fullHand),
                    baseHand: sortTiles(baseHand),
                    drawnTile,
                    pool, 
                    efficiency: eff 
                };
            }
        }
    }
    
    return generateByBreaking(size, suitCount, pool);
};

const generateByBreaking = (size, suitCount, pool) => {
    const activeSuits = SUITS.slice(0, suitCount);
    
    for (let attempt = 0; attempt < 500; attempt++) {
        const completeHand = generateCompleteHand(size, activeSuits);
        if (!completeHand) continue;
        
        const initialShanten = fastShanten(completeHand);
        if (initialShanten !== 0) continue;
        
        let baseHand = [...completeHand];
        let currentShanten = 0;
        let targetShanten = Math.random() > 0.5 ? 1 : 2;
        let breakAttempts = 0;
        const maxBreakAttempts = 20;
        
        while (currentShanten < targetShanten && breakAttempts < maxBreakAttempts) {
            breakAttempts++;
            
            const replaceIdx = Math.floor(Math.random() * baseHand.length);
            const oldTile = baseHand[replaceIdx];
            
            let newTile;
            do {
                newTile = pool[Math.floor(Math.random() * pool.length)];
            } while (newTile === oldTile);
            
            const testHand = [...baseHand];
            testHand[replaceIdx] = newTile;
            
            const newShanten = fastShanten(testHand);
            
            if (newShanten > currentShanten) {
                baseHand = testHand;
                currentShanten = newShanten;
            }
        }
        
        if (currentShanten !== 1 && currentShanten !== 2) continue;
        
        const preciseShanten = calculateShanten(baseHand, pool);
        if (preciseShanten !== currentShanten) continue;
        
        const drawnTile = pool[Math.floor(Math.random() * pool.length)];
        const fullHand = [...baseHand, drawnTile];
        
        let bestShantenAfterDraw = 100;
        [...new Set(fullHand)].forEach(discard => {
            const testHand = [...fullHand];
            testHand.splice(testHand.indexOf(discard), 1);
            const s = calculateShanten(testHand, pool);
            bestShantenAfterDraw = Math.min(bestShantenAfterDraw, s);
        });
        
        if (bestShantenAfterDraw === 0) continue;
        
        if (preciseShanten === 2 && bestShantenAfterDraw !== 1) continue;
        if (preciseShanten === 1 && bestShantenAfterDraw !== 1) continue;
        
        const eff = getEfficiency(baseHand, drawnTile, pool);
        
        if (eff.maxUkeire > 3) {
            return { 
                hand: sortTiles(fullHand),
                baseHand: sortTiles(baseHand),
                drawnTile,
                pool, 
                efficiency: eff 
            };
        }
    }
    
    return null;
};

const generateCompleteHand = (size, suits) => {
    const setsNeeded = Math.floor(size / 3);
    const hand = [];
    
    for (let i = 0; i < setsNeeded; i++) {
        const suit = suits[Math.floor(Math.random() * suits.length)];
        
        if (Math.random() > 0.5) {
            const start = Math.floor(Math.random() * 7) + 1;
            hand.push(`${start}${suit}`, `${start + 1}${suit}`, `${start + 2}${suit}`);
        } else {
            const val = Math.floor(Math.random() * 9) + 1;
            hand.push(`${val}${suit}`, `${val}${suit}`, `${val}${suit}`);
        }
    }
    
    const pairSuit = suits[Math.floor(Math.random() * suits.length)];
    const pairVal = Math.floor(Math.random() * 9) + 1;
    hand.push(`${pairVal}${pairSuit}`, `${pairVal}${pairSuit}`);
    
    return hand.slice(0, size);
};