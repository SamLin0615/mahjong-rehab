// WinTrainingLogic.js - All logic related to win detection and training

export const SUITS = ['s', 'm', 'p']; 

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

// Check if a hand is a winning hand (3n + 2 structure)
export const isWin = (tiles) => {
    if (tiles.length % 3 !== 2) return false;
    
    const counts = {};
    tiles.forEach(t => counts[t] = (counts[t] || 0) + 1);
    
    const uniqueTiles = Object.keys(counts);
    for (let tile of uniqueTiles) {
        if (counts[tile] >= 2) { // Try this tile as the pair
            const remaining = [...tiles];
            remaining.splice(remaining.indexOf(tile), 1);
            remaining.splice(remaining.indexOf(tile), 1);
            if (canFormSets(remaining.sort())) return true;
        }
    }
    return false;
};

// Check if tiles can form valid sets (triplets and sequences)
const canFormSets = (tiles) => {
    if (tiles.length === 0) return true;
    
    const first = tiles[0];
    const val = parseInt(first[0]);
    const suit = first[1];

    // Try forming a triplet with the first tile
    if (tiles.filter(t => t === first).length >= 3) {
        const next = [...tiles].slice(3);
        if (canFormSets(next)) return true;
    }

    // Try forming a sequence starting with the first tile
    if (val <= 7) {
        const s2 = `${val + 1}${suit}`;
        const s3 = `${val + 2}${suit}`;
        const i2 = tiles.indexOf(s2);
        const i3 = tiles.indexOf(s3);
        
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

// Get all tiles that complete the hand (waiting tiles)
export const getWaits = (hand, pool) => {
    // Count tiles already in hand
    const handCounts = {};
    hand.forEach(t => handCounts[t] = (handCounts[t] || 0) + 1);
    
    return pool.filter(tile => {
        // Don't consider tiles where we already have 4 copies
        if (handCounts[tile] >= 4) return false;
        
        return isWin([...hand, tile]);
    });
};

// Check if hand has more than 4 of any tile
const hasInvalidTileCount = (hand) => {
    const counts = {};
    hand.forEach(t => counts[t] = (counts[t] || 0) + 1);
    return Object.values(counts).some(count => count > 4);
};

// Generate a not-tenpai hand for Hard mode
const generateNotTenpaiHand = (size, suitCount) => {
    console.log('Generating not-tenpai hand for Hard mode');
    
    const activeSuits = SUITS.slice(0, suitCount);
    const pool = activeSuits.flatMap(s => 
        [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `${n}${s}`)
    );
    
    // First generate a tenpai hand
    for (let attempt = 0; attempt < 1000; attempt++) {
        let hand = Array.from({ length: size }, () => 
            pool[Math.floor(Math.random() * pool.length)]
        );
        
        if (hasInvalidTileCount(hand)) continue;
        
        // For 2+ suits, ensure no tile appears exactly 4 times
        if (suitCount >= 2) {
            const counts = {};
            hand.forEach(t => counts[t] = (counts[t] || 0) + 1);
            if (Object.values(counts).some(count => count === 4)) continue;
        }
        
        const waits = getWaits(hand, pool);
        if (waits.length >= 1 && waits.length <= 4) {
            // Now modify one tile to make it not-tenpai
            const randomIndex = Math.floor(Math.random() * hand.length);
            const originalTile = hand[randomIndex];
            const tileNum = parseInt(originalTile[0]);
            const tileSuit = originalTile[1];
            
            // Generate offset (-2, -1, +1, or +2)
            const offsets = [-2, -1, 1, 2];
            const offset = offsets[Math.floor(Math.random() * offsets.length)];
            const newNum = Math.max(1, Math.min(9, tileNum + offset));
            const newTile = `${newNum}${tileSuit}`;
            
            // Only proceed if the new tile is different
            if (newTile !== originalTile) {
                hand[randomIndex] = newTile;
                
                // Check if it's invalid tile count after modification
                if (hasInvalidTileCount(hand)) continue;
                
                // For 2+ suits, ensure no tile appears exactly 4 times after modification
                if (suitCount >= 2) {
                    const counts = {};
                    hand.forEach(t => counts[t] = (counts[t] || 0) + 1);
                    if (Object.values(counts).some(count => count === 4)) continue;
                }
                
                // Verify it's actually not tenpai now
                const newWaits = getWaits(hand, pool);
                if (newWaits.length === 0) {
                    console.log(`Generated not-tenpai hand on attempt ${attempt + 1}`);
                    return { 
                        hand: sortTiles(hand), 
                        waits: newWaits,
                        isTenpai: false,
                        pool 
                    };
                }
            }
        }
    }
    
    console.warn('Failed to generate not-tenpai hand, falling back to regular generation');
    return null;
};

// Generate a training hand with specified parameters
export const generateRehabHand = (size, level, suitCount) => {
    console.time('generateRehabHand');
    
    const activeSuits = SUITS.slice(0, suitCount);
    const pool = activeSuits.flatMap(s => 
        [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `${n}${s}`)
    );
    
    // For Hard mode: 10% chance to generate not-tenpai hand
    if (level === 'Hard' && Math.random() < 0.1) {
        const notTenpaiResult = generateNotTenpaiHand(size, suitCount);
        if (notTenpaiResult) {
            console.timeEnd('generateRehabHand');
            return notTenpaiResult;
        }
    }
    
    // Define wait count requirements for each difficulty level
    const waitRequirements = {
        'Easy': { 
            lowWaitPercentage: 85,  // 85% have ≤3 waits
            maxLowWaits: 3 
        },
        'Medium': { 
            highWaitPercentage: 60, // 60% have ≥3 waits
            minHighWaits: 3 
        },
        'Hard': { 
            highWaitPercentage: 80, // 80% have ≥3 waits
            minHighWaits: 3
        }
    };
    
    const requirements = waitRequirements[level];
    
    // Try to generate a valid hand (with timeout)
    for (let attempt = 0; attempt < 3000; attempt++) {
        // Generate random hand
        let hand = Array.from({ length: size }, () => 
            pool[Math.floor(Math.random() * pool.length)]
        );
        
        // Skip if hand has more than 4 of any tile
        if (hasInvalidTileCount(hand)) continue;
        
        // For 2+ suits, ensure no tile appears exactly 4 times
        if (suitCount >= 2) {
            const counts = {};
            hand.forEach(t => counts[t] = (counts[t] || 0) + 1);
            if (Object.values(counts).some(count => count === 4)) continue;
        }
        
        // Check if it meets the wait criteria
        console.time('getWaits');
        let waits = getWaits(hand, pool);
        console.timeEnd('getWaits');
        
        // Apply difficulty-specific wait requirements
        let meetsRequirement = false;
        
        if (level === 'Easy') {
            // 85% should have ≤3 waits
            const shouldBeLowWait = Math.random() < (requirements.lowWaitPercentage / 100);
            if (shouldBeLowWait) {
                meetsRequirement = waits.length >= 1 && waits.length <= requirements.maxLowWaits;
            } else {
                meetsRequirement = waits.length > requirements.maxLowWaits && waits.length <= 15;
            }
        } else if (level === 'Medium') {
            // 60% should have ≥3 waits
            const shouldBeHighWait = Math.random() < (requirements.highWaitPercentage / 100);
            if (shouldBeHighWait) {
                meetsRequirement = waits.length >= requirements.minHighWaits && waits.length <= 15;
            } else {
                meetsRequirement = waits.length >= 1 && waits.length < requirements.minHighWaits;
            }
        } else { // Hard
            // 80% should have ≥3 waits
            const shouldBeHighWait = Math.random() < (requirements.highWaitPercentage / 100);
            if (shouldBeHighWait) {
                meetsRequirement = waits.length >= requirements.minHighWaits && waits.length <= 15;
            } else {
                meetsRequirement = waits.length >= 1 && waits.length < requirements.minHighWaits;
            }
        }
        
        if (meetsRequirement) {
            console.log(`Generated hand on attempt ${attempt + 1} with ${waits.length} waits (${level} mode)`);
            console.timeEnd('generateRehabHand');
            return { 
                hand: sortTiles(hand), 
                waits, 
                isTenpai: true,
                pool 
            };
        }
    }
    
    // Fallback hand if generation fails
    console.warn('Failed to generate hand within 3000 attempts, using fallback');
    console.timeEnd('generateRehabHand');
    return { 
        hand: sortTiles(['1s','1s','1s','2s','3s','4s','5s']), 
        waits: ['2s','5s','8s'], 
        isTenpai: true,
        pool 
    };
};

// Get all available tiles for a given suit count
export const getAllTiles = (suitCount) => {
    const activeSuits = SUITS.slice(0, suitCount);
    return activeSuits.flatMap(s => 
        [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `${n}${s}`)
    );
};