// logic/index.js - Central export point for all logic modules

// Re-export from WinTrainingLogic
export { 
    sortTiles, 
    isWin, 
    getWaits, 
    generateRehabHand, 
    getAllTiles,
    SUITS
} from './WinTrainingLogic';

// Re-export from EfficiencyTrainingLogic
export { 
    fastShanten,
    calculateShanten,
    clearShantenCache,
    getEfficiency,
    generateEfficiencyHand,
    testShanten
} from './EfficiencyTrainingLogic.js';