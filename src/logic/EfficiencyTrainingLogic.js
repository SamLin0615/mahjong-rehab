// EfficiencyTrainingLogic.js - All logic related to efficiency training and shanten calculation

import { isWin, sortTiles, SUITS } from './WinTrainingLogic';

// ===== FAST SHANTEN CALCULATION (For filtering during generation) =====

const fastAnalyze = (tiles) => {
    if (tiles.length === 0) return { sets: 0, protos: 0 };
    
    const first = tiles[0];
    const val = parseInt(first[0]);
    const suit = first[1];
    const count = tiles.filter(t => t === first).length;
    
    let best = { sets: 0, protos: 0 };
    
    // Try forming a triplet
    if (count >= 3) {
        const rem = [...tiles];
        rem.splice(0, 3);
        const sub = fastAnalyze(rem);
        best = { sets: sub.sets + 1, protos: sub.protos };
    }
    
    // Try forming a sequence
    if (val <= 7) {
        const s2 = `${val + 1}${suit}`;
        const s3 = `${val + 2}${suit}`;
        if (tiles.includes(s2) && tiles.includes(s3)) {
            const rem = [...tiles];
            rem.splice(rem.indexOf(first), 1);
            rem.splice(rem.indexOf(s2), 1);
            rem.splice(rem.indexOf(s3), 1);
            const sub = fastAnalyze(rem);
            const candidate = { sets: sub.sets + 1, protos: sub.protos };
            if (candidate.sets * 2 + candidate.protos > best.sets * 2 + best.protos) {
                best = candidate;
            }
        }
    }
    
    // Try forming a pair (proto-set)
    if (count >= 2) {
        const rem = [...tiles];
        rem.splice(0, 2);
        const sub = fastAnalyze(rem);
        const candidate = { sets: sub.sets, protos: sub.protos + 1 };
        if (candidate.sets * 2 + candidate.protos > best.sets * 2 + best.protos) {
            best = candidate;
        }
    }
    
    // Try proto-sequences (two tiles that could become a sequence)
    for (let d = 1; d <= 2; d++) {
        if (val + d <= 9 && tiles.includes(`${val + d}${suit}`)) {
            const rem = [...tiles];
            rem.splice(rem.indexOf(first), 1);
            rem.splice(rem.indexOf(`${val + d}${suit}`), 1);
            const sub = fastAnalyze(rem);
            const candidate = { sets: sub.sets, protos: sub.protos + 1 };
            if (candidate.sets * 2 + candidate.protos > best.sets * 2 + best.protos) {
                best = candidate;
            }
        }
    }
    
    // Try skipping this tile
    const rem = [...tiles];
    rem.shift();
    const sub = fastAnalyze(rem);
    if (sub.sets * 2 + sub.protos > best.sets * 2 + best.protos) {
        best = sub;
    }
    
    return best;
};

export const fastShanten = (tiles) => {
    if (tiles.length === 0) return -1;
    
    const sorted = sortTiles(tiles);
    const setsNeeded = Math.floor(tiles.length / 3);
    
    const counts = {};
    tiles.forEach(t => counts[t] = (counts[t] || 0) + 1);
    
    let minShanten = 100;
    
    // Try with each possible pair
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
    
    // Try without a dedicated pair
    const { sets, protos } = fastAnalyze(sorted);
    const missing = Math.max(0, setsNeeded - sets);
    const useful = Math.min(protos, missing + 1);
    const shanten = missing - useful + 1;
    minShanten = Math.min(minShanten, shanten);
    
    return minShanten;
};

// ===== PRECISE SHANTEN CALCULATION (Simulation-based) =====

// Check if a hand is tenpai (0-shanten) - one tile away from winning
const isTenpai = (tiles, pool) => {
    const uniquePool = [...new Set(pool)];
    for (let draw of uniquePool) {
        if (isWin([...tiles, draw])) {
            return true;
        }
    }
    return false;
};

// Check if a hand is 1-shanten - two tiles away from winning
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

// Check if a hand is 2-shanten - three tiles away from winning
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

// Cache for shanten calculations
const shantenCache = new Map();

export const clearShantenCache = () => {
    shantenCache.clear();
};

// Precise shanten calculation with caching
export const calculateShanten = (tiles, pool = null) => {
    if (tiles.length === 0) return -1;
    
    // Check cache
    const cacheKey = sortTiles(tiles).join(',');
    if (shantenCache.has(cacheKey)) {
        return shantenCache.get(cacheKey);
    }
    
    // Generate pool if not provided
    if (!pool) {
        const suitCount = [...new Set(tiles.map(t => t[t.length - 1]))].length;
        const activeSuits = SUITS.slice(0, Math.max(suitCount, 1));
        pool = activeSuits.flatMap(s => 
            [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `${n}${s}`)
        );
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
    
    // Cache and return
    shantenCache.set(cacheKey, result);
    return result;
};

// ===== EFFICIENCY CALCULATION (Ukeire) =====

// Get relevant tiles to test as draws based on hand composition
function getRelevantDraws(hand) {
    const relevant = new Set();
    const uniqueTiles = [...new Set(hand)];
    
    uniqueTiles.forEach(tile => {
        const num = parseInt(tile);
        const suit = tile[tile.length - 1];
        
        // Add tiles within ±2 range (sufficient for all valid melds)
        for (let offset = -2; offset <= 2; offset++) {
            const neighborNum = num + offset;
            if (neighborNum >= 1 && neighborNum <= 9) {
                relevant.add(`${neighborNum}${suit}`);
            }
        }
    });
    
    return relevant;
}

export const getEfficiency = (baseHand, drawnTile, pool) => {
    console.log('  --- getEfficiency START ---');
    const totalStart = performance.now();
    const fullHand = [...baseHand, drawnTile];
    
    // Count tiles in hand for availability calculation
    const handCounts = {};
    fullHand.forEach(t => handCounts[t] = (handCounts[t] || 0) + 1);
    
    // Find all unique possible discards
    const allDiscards = [...new Set(fullHand)];
    console.log(`  Analyzing ${allDiscards.length} possible discards`);
    
    // Find the best shanten achievable after any discard
    const bestShantenStart = performance.now();
    let calculateShantenCalls = 0;
    let bestShanten = 100;
    allDiscards.forEach(discard => {
        const newHand = [...fullHand];
        newHand.splice(newHand.indexOf(discard), 1);
        calculateShantenCalls++;
        const s = calculateShanten(newHand, pool);
        bestShanten = Math.min(bestShanten, s);
    });
    const bestShantenDuration = performance.now() - bestShantenStart;
    console.log(`  Find best shanten: ${calculateShantenCalls} calculateShanten calls in ${bestShantenDuration.toFixed(2)}ms`);
    
    const results = [];
    
    // Analyze each possible discard
    const analyzeStart = performance.now();
    let totalCalculateShantenInAnalyze = 0;
    let totalIsWinCalls = 0;
    let totalDrawsChecked = 0;
    let totalDrawsSkipped = 0;
    
    // Cache for this efficiency call
    const drawCache = new Map();
    
    allDiscards.forEach((discard, discardIdx) => {
        const discardStart = performance.now();
        const newHand = [...fullHand];
        newHand.splice(newHand.indexOf(discard), 1);
        totalCalculateShantenInAnalyze++;
        const currentShanten = calculateShanten(newHand, pool);
        
        // Only consider discards that achieve the best shanten
        if (currentShanten !== bestShanten) return;
        
        const acceptedTiles = [];
        
        // Get only relevant draws based on hand composition
        const relevantDraws = getRelevantDraws(newHand);
        const uniquePool = [...new Set(pool)];
        
        const skippedTiles = uniquePool.length - relevantDraws.size;
        totalDrawsSkipped += skippedTiles;
        console.log(`    Discard ${discard}: testing ${relevantDraws.size} relevant draws (skipped ${skippedTiles})`);
        
        let discardCalculateShantenCalls = 0;
        let discardIsWinCalls = 0;
        let cacheHits = 0;
        
        if (currentShanten === 0) {
            // If tenpai, find winning tiles - only check relevant draws
            relevantDraws.forEach(tile => {
                if (tile === discard) return;
                
                totalDrawsChecked++;
                const testHand = [...newHand, tile];
                discardIsWinCalls++;
                totalIsWinCalls++;
                if (isWin(testHand)) {
                    const count = 4 - (handCounts[tile] || 0);
                    if (count > 0) {
                        acceptedTiles.push({ tile, count });
                    }
                }
            });
        } else {
            // If not tenpai, find tiles that improve shanten - only check relevant draws
            relevantDraws.forEach(draw => {
                if (draw === discard) return;
                
                totalDrawsChecked++;
                const testHand = [...newHand, draw];
                
                // Create cache key for this draw test
                const handKey = sortTiles(newHand).join(',');
                const cacheKey = `${handKey}:${draw}`;
                
                let bestTestShanten = 100;
                
                // Check cache first
                if (drawCache.has(cacheKey)) {
                    cacheHits++;
                    bestTestShanten = drawCache.get(cacheKey);
                } else {
                    // Find best shanten after drawing and discarding
                    [...new Set(testHand)].forEach(testDiscard => {
                        const finalHand = [...testHand];
                        finalHand.splice(finalHand.indexOf(testDiscard), 1);
                        discardCalculateShantenCalls++;
                        totalCalculateShantenInAnalyze++;
                        const s = calculateShanten(finalHand, pool);
                        bestTestShanten = Math.min(bestTestShanten, s);
                    });
                    
                    // Cache the result
                    drawCache.set(cacheKey, bestTestShanten);
                }
                
                // If this draw improves the hand
                if (bestTestShanten < currentShanten) {
                    const count = 4 - (handCounts[draw] || 0);
                    if (count > 0 && !acceptedTiles.find(a => a.tile === draw)) {
                        acceptedTiles.push({ tile: draw, count });
                    }
                }
            });
        }
        
        // Calculate total acceptance (ukeire)
        const ukeire = acceptedTiles.reduce((sum, a) => sum + a.count, 0);
        
        // Sort accepted tiles for display
        acceptedTiles.sort((a, b) => {
            const suitOrder = { 's': 0, 'm': 1, 'p': 2 };
            const suitA = a.tile[a.tile.length - 1];
            const suitB = b.tile[b.tile.length - 1];
            if (suitOrder[suitA] !== suitOrder[suitB]) {
                return suitOrder[suitA] - suitOrder[suitB];
            }
            return parseInt(a.tile) - parseInt(b.tile);
        });
        
        const discardDuration = performance.now() - discardStart;
        console.log(`    Discard #${discardIdx + 1} (${discard}): ${discardDuration.toFixed(2)}ms, ${discardCalculateShantenCalls} shanten calls, ${discardIsWinCalls} isWin calls, ${cacheHits} cache hits`);
        
        results.push({ 
            discard, 
            ukeire, 
            acceptedTiles, 
            newShanten: currentShanten 
        });
    });
    
    const analyzeDuration = performance.now() - analyzeStart;
    console.log(`  Analyze summary:`);
    console.log(`    Total draws checked: ${totalDrawsChecked}`);
    console.log(`    Total draws skipped: ${totalDrawsSkipped}`);
    console.log(`    Reduction: ${totalDrawsSkipped > 0 ? ((totalDrawsSkipped / (totalDrawsChecked + totalDrawsSkipped)) * 100).toFixed(1) : 0}%`);
    console.log(`    Total calculateShanten: ${totalCalculateShantenInAnalyze} calls`);
    console.log(`    Total isWin: ${totalIsWinCalls} calls`);
    console.log(`    Cache size: ${drawCache.size} entries`);
    console.log(`    Time: ${analyzeDuration.toFixed(2)}ms`);
    
    // Sort results by ukeire (descending)
    results.sort((a, b) => b.ukeire - a.ukeire);
    const maxU = results[0]?.ukeire || 0;
    
    const totalDuration = performance.now() - totalStart;
    console.log(`  Total getEfficiency: ${totalDuration.toFixed(2)}ms`);
    console.log(`  --- getEfficiency END ---\n`);
    
    return { 
        bestDiscards: results.filter(r => r.ukeire === maxU).map(r => r.discard), 
        maxUkeire: maxU,
        allResults: results.slice(0, 5),
        initialShanten: calculateShanten(baseHand, pool),
        drawnTile,
        bestShanten
    };
};

// ===== HAND GENERATION =====

// Check if hand has more than 4 of any tile
const hasInvalidTileCount = (hand) => {
    const counts = {};
    hand.forEach(t => counts[t] = (counts[t] || 0) + 1);
    return Object.values(counts).some(count => count > 4);
};

export const generateEfficiencyHand = (size, suitCount) => {
    console.time('generateEfficiencyHand');
    
    const activeSuits = SUITS.slice(0, suitCount);
    const pool = activeSuits.flatMap(s => 
        [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `${n}${s}`)
    );
    
    clearShantenCache();
    
    // For single suit, use random generation
    if (suitCount === 1) {
        console.log('Using random generation for single suit');
        for (let attempt = 0; attempt < 1000; attempt++) {
            let baseHand = Array.from({ length: size }, () => 
                pool[Math.floor(Math.random() * pool.length)]
            );
            
            // Skip if hand has more than 4 of any tile
            if (hasInvalidTileCount(baseHand)) continue;
            
            if (isWin(baseHand)) continue;
            
            // Quick filter with fast shanten
            console.time('fastShanten');
            const fastBaseShanten = fastShanten(baseHand);
            console.timeEnd('fastShanten');
            if (fastBaseShanten !== 1 && fastBaseShanten !== 2) continue;
            
            const drawnTile = pool[Math.floor(Math.random() * pool.length)];
            const fullHand = [...baseHand, drawnTile];
            
            // Skip if full hand has more than 4 of any tile
            if (hasInvalidTileCount(fullHand)) continue;
            
            // Check if draw improves shanten
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
            
            // Verify with precise shanten
            console.time('calculateShanten');
            const baseShanten = calculateShanten(baseHand, pool);
            console.timeEnd('calculateShanten');
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
            
            console.time('getEfficiency');
            const eff = getEfficiency(baseHand, drawnTile, pool);
            console.timeEnd('getEfficiency');
            
            if (eff.maxUkeire > 5) {
                console.log(`Generated hand on attempt ${attempt + 1}, ukeire: ${eff.maxUkeire}`);
                console.timeEnd('generateEfficiencyHand');
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
    
    // For multiple suits, use breaking method
    console.log('Using breaking method for multiple suits');
    const result = generateByBreaking(size, suitCount, pool);
    console.timeEnd('generateEfficiencyHand');
    return result;
};

const generateByBreaking = (size, suitCount, pool) => {
    console.time('generateByBreaking');
    const activeSuits = SUITS.slice(0, suitCount);
    
    for (let attempt = 0; attempt < 500; attempt++) {
        const completeHand = generateCompleteHand(size, activeSuits);
        if (!completeHand) continue;
        
        // Skip if hand has more than 4 of any tile
        if (hasInvalidTileCount(completeHand)) continue;
        
        // For 2+ suits, ensure no tile appears exactly 4 times
        if (suitCount >= 2) {
            const counts = {};
            completeHand.forEach(t => counts[t] = (counts[t] || 0) + 1);
            if (Object.values(counts).some(count => count === 4)) continue;
        }
        
        const initialShanten = fastShanten(completeHand);
        if (initialShanten !== 0) continue;
        
        let baseHand = [...completeHand];
        let currentShanten = 0;
        let targetShanten = Math.random() > 0.5 ? 1 : 2;
        let breakAttempts = 0;
        const maxBreakAttempts = 20;
        
        // Break the hand to reach target shanten
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
            
            // Skip if this creates invalid tile counts
            if (hasInvalidTileCount(testHand)) continue;
            
            // For 2+ suits, skip if any tile appears exactly 4 times
            if (suitCount >= 2) {
                const counts = {};
                testHand.forEach(t => counts[t] = (counts[t] || 0) + 1);
                if (Object.values(counts).some(count => count === 4)) continue;
            }
            
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
        
        // Skip if full hand has invalid tile counts
        if (hasInvalidTileCount(fullHand)) continue;
        
        // For 2+ suits, skip if any tile appears exactly 4 times
        if (suitCount >= 2) {
            const counts = {};
            fullHand.forEach(t => counts[t] = (counts[t] || 0) + 1);
            if (Object.values(counts).some(count => count === 4)) continue;
        }
        
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
        
        console.time('getEfficiency');
        const eff = getEfficiency(baseHand, drawnTile, pool);
        console.timeEnd('getEfficiency');
        
        if (eff.maxUkeire > 3) {
            console.log(`Generated hand on attempt ${attempt + 1}, ukeire: ${eff.maxUkeire}`);
            console.timeEnd('generateByBreaking');
            return { 
                hand: sortTiles(fullHand),
                baseHand: sortTiles(baseHand),
                drawnTile,
                pool, 
                efficiency: eff 
            };
        }
    }
    
    console.warn('Failed to generate hand using breaking method');
    console.timeEnd('generateByBreaking');
    return null;
};

const generateCompleteHand = (size, suits) => {
    const setsNeeded = Math.floor(size / 3);
    const hand = [];
    
    // Generate sets (triplets or sequences)
    for (let i = 0; i < setsNeeded; i++) {
        const suit = suits[Math.floor(Math.random() * suits.length)];
        
        if (Math.random() > 0.5) {
            // Sequence
            const start = Math.floor(Math.random() * 7) + 1;
            hand.push(`${start}${suit}`, `${start + 1}${suit}`, `${start + 2}${suit}`);
        } else {
            // Triplet
            const val = Math.floor(Math.random() * 9) + 1;
            hand.push(`${val}${suit}`, `${val}${suit}`, `${val}${suit}`);
        }
    }
    
    // Add pair
    const pairSuit = suits[Math.floor(Math.random() * suits.length)];
    const pairVal = Math.floor(Math.random() * 9) + 1;
    hand.push(`${pairVal}${pairSuit}`, `${pairVal}${pairSuit}`);
    
    return hand.slice(0, size);
};

// ===== TESTING =====

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