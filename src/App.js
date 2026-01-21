import React, { useState, useEffect, useRef } from 'react';

// Import from logic modules
import { 
    generateRehabHand, 
    sortTiles, 
    getAllTiles 
} from './logic/WinTrainingLogic.js';

import { 
    generateEfficiencyHand, 
    testShanten 
} from './logic/EfficiencyTrainingLogic.js';

// Unicode Mahjong Tile Mapping
const TILE_UNICODE = {
    // Manzu (Characters) - 🀇-🀏
    '1m': '🀇', '2m': '🀈', '3m': '🀉', '4m': '🀊', '5m': '🀋', '6m': '🀌', '7m': '🀍', '8m': '🀎', '9m': '🀏',
    // Pinzu (Circles) - 🀙-🀡
    '1p': '🀙', '2p': '🀚', '3p': '🀛', '4p': '🀜', '5p': '🀝', '6p': '🀞', '7p': '🀟', '8p': '🀠', '9p': '🀡',
    // Souzu (Bamboo) - 🀐-🀘
    '1s': '🀐', '2s': '🀑', '3s': '🀒', '4s': '🀓', '5s': '🀔', '6s': '🀕', '7s': '🀖', '8s': '🀗', '9s': '🀘'
};

const tileStyle = {
    width: '50px', height: '70px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 'normal',
    cursor: 'pointer', fontSize: '42px',
    userSelect: 'none'
};

export default function App() {
    const [mode, setMode] = useState('WIN'); 
    const [settings, setSettings] = useState({ size: 7, level: 'Easy', suits: 1 });
    const [gameState, setGameState] = useState({ hand: [], waits: [], found: [], wrong: [], pool: [], efficiency: null, drawnTile: null });
    const [metrics, setMetrics] = useState({ time: 0, errors: 0, active: false });
    const [loading, setLoading] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => {
        if (metrics.active) timerRef.current = setInterval(() => setMetrics(m => ({ ...m, time: m.time + 1 })), 1000);
        else clearInterval(timerRef.current);
        return () => clearInterval(timerRef.current);
    }, [metrics.active]);

    const startNewGame = () => {
        setLoading(true);
        // Use setTimeout to allow UI to update with loading state
        setTimeout(() => {
            const data = mode === 'WIN' 
                ? generateRehabHand(settings.size, settings.level, settings.suits)
                : generateEfficiencyHand(settings.size, settings.suits);
            
            if (data) {
                setGameState({ ...data, found: [], wrong: [] });
                setMetrics({ time: 0, errors: 0, active: true });
            } else {
                alert('Failed to generate hand. Please try again.');
            }
            setLoading(false);
        }, 100);
    };

    const handleAction = (item, index) => {
        if (!metrics.active) return;
        if (mode === 'WIN') {
            if (gameState.waits.includes(item)) {
                if (!gameState.found.includes(item)) {
                    const next = [...gameState.found, item];
                    setGameState(p => ({ ...p, found: next }));
                    if (next.length === gameState.waits.length) setMetrics(m => ({ ...m, active: false }));
                }
            } else {
                setGameState(p => ({ ...p, wrong: [...p.wrong, item] }));
                setMetrics(m => ({ ...m, errors: m.errors + 1 }));
            }
        } else {
            if (gameState.efficiency && gameState.efficiency.bestDiscards.includes(item)) {
                setMetrics(m => ({ ...m, active: false }));
            } else {
                setGameState(p => ({ ...p, wrong: [...p.wrong, index] }));
                setMetrics(m => ({ ...m, errors: m.errors + 1 }));
            }
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f4f4f4', minHeight: '100vh' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <button onClick={() => setMode('WIN')} style={{ padding: '10px 20px', background: mode === 'WIN' ? '#2c3e50' : '#bdc3c7', color: '#fff', border: 'none', borderRadius: '4px', marginRight: '10px', cursor: 'pointer' }}>Win Training (和牌)</button>
                <button onClick={() => setMode('EFF')} style={{ padding: '10px 20px', background: mode === 'EFF' ? '#2c3e50' : '#bdc3c7', color: '#fff', border: 'none', borderRadius: '4px', marginRight: '10px', cursor: 'pointer' }}>Efficiency (上听)</button>
                <button onClick={() => { testShanten(); alert('Check browser console (F12) for test results'); }} style={{ padding: '10px 20px', background: '#e67e22', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Test Shanten</button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px', background: '#fff', padding: '15px', borderRadius: '8px', flexWrap: 'wrap', maxWidth: '800px', margin: '0 auto 20px' }}>
                <select value={settings.size} onChange={e => setSettings({...settings, size: parseInt(e.target.value)})} style={{ padding: '8px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <option value={7}>7 Tiles</option>
                    <option value={13}>13 Tiles</option>
                </select>
                {mode === 'WIN' && (
                    <select value={settings.level} onChange={e => setSettings({...settings, level: e.target.value})} style={{ padding: '8px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <option value="Easy">Easy (1-2 waits)</option>
                        <option value="Medium">Medium (2-3 waits)</option>
                        <option value="Hard">Hard (4+ waits)</option>
                    </select>
                )}
                <select value={settings.suits} onChange={e => setSettings({...settings, suits: parseInt(e.target.value)})} style={{ padding: '8px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <option value={1}>1 Suit</option>
                    <option value={2}>2 Suits</option>
                    <option value={3}>3 Suits</option>
                </select>
                <button onClick={startNewGame} disabled={loading} style={{ background: loading ? '#95a5a6' : '#27ae60', color: '#fff', border: 'none', padding: '8px 20px', cursor: loading ? 'not-allowed' : 'pointer', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold' }}>
                    {loading ? 'Generating...' : 'Generate Hand'}
                </button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '10px', fontSize: '18px', fontWeight: 'bold' }}>
                {mode === 'WIN' ? `Find the tiles that complete this hand:` : `Which tile should you discard? (Click to select)`}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px', flexWrap: 'wrap', maxWidth: '900px', margin: '0 auto 30px' }}>
                {gameState.hand.map((tile, i) => {
                    const isDrawnTile = mode === 'EFF' && gameState.drawnTile && tile === gameState.drawnTile && i === gameState.hand.length - 1;
                    const isWrong = mode === 'EFF' && gameState.wrong.includes(i);
                    return (
                        <div 
                            key={i} 
                            onClick={() => mode === 'EFF' && !isWrong && handleAction(tile, i)} 
                            style={{ 
                                ...tileStyle,
                                marginRight: isDrawnTile ? '10px' : '0',
                                cursor: mode === 'EFF' ? (isWrong ? 'not-allowed' : 'pointer') : 'default',
                                opacity: isWrong ? 0.3 : 1,
                                filter: isDrawnTile ? 'drop-shadow(0 0 8px #f39c12)' : 'none'
                            }}
                        >
                            {TILE_UNICODE[tile] || tile}
                        </div>
                    );
                })}
            </div>

            {mode === 'WIN' && (
                <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                    {['s', 'm', 'p'].slice(0, settings.suits).map(suit => {
                        const suitTiles = (gameState.pool.length > 0 ? gameState.pool : getAllTiles(settings.suits))
                            .filter(tile => tile.endsWith(suit));
                        
                        return (
                            <div key={suit} style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                {suitTiles.map(tile => {
                                    const isWrong = gameState.wrong.includes(tile);
                                    const isFound = gameState.found.includes(tile);
                                    return (
                                        <div 
                                            key={tile} 
                                            onClick={() => !isWrong && handleAction(tile)} 
                                            style={{ 
                                                ...tileStyle,
                                                margin: '3px',
                                                cursor: isWrong ? 'not-allowed' : 'pointer',
                                                opacity: isWrong ? 0.3 : 1,
                                                filter: isFound ? 'drop-shadow(0 0 8px #2ecc71)' : 'none'
                                            }}
                                        >
                                            {TILE_UNICODE[tile] || tile}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            )}

            <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '18px' }}>
                <span><strong>Time:</strong> {metrics.time}s | <strong>Errors:</strong> {metrics.errors}</span>
                {!metrics.active && gameState.hand.length > 0 && <h2 style={{ color: '#27ae60', marginTop: '10px' }}>✓ Finished!</h2>}
                
                {mode === 'EFF' && !metrics.active && gameState.efficiency && (
                    <div style={{ marginTop: '20px', textAlign: 'left', maxWidth: '800px', margin: '20px auto', background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Results:</h3>
                        <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px' }}>
                            Base hand: <strong>{gameState.efficiency.initialShanten}-shanten</strong> ({gameState.hand.length - 1} tiles)
                        </p>
                        <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px' }}>
                            Drew: <span style={{ fontSize: '32px', display: 'inline-block', verticalAlign: 'middle', margin: '0 8px', filter: 'drop-shadow(0 0 4px #f39c12)' }}>{TILE_UNICODE[gameState.efficiency.drawnTile] || gameState.efficiency.drawnTile}</span>
                        </p>
                        <p style={{ margin: '0 0 15px 0', color: '#27ae60', fontSize: '14px', fontWeight: 'bold' }}>
                            Best achievable: {gameState.efficiency.bestShanten}-shanten
                            {gameState.efficiency.bestShanten === 0 && ' (TENPAI!)'}
                        </p>
                        <p style={{ margin: '0 0 15px 0', color: '#666', fontSize: '13px', fontStyle: 'italic' }}>
                            {gameState.efficiency.bestShanten === 0 
                                ? 'Showing which discard reaches tenpai with most winning tiles'
                                : 'Showing which discard has most acceptance for further improvement'}
                        </p>
                        {gameState.efficiency.allResults.map((result, idx) => (
                            <div key={idx} style={{ 
                                marginBottom: '15px', 
                                padding: '15px', 
                                background: idx === 0 ? '#d4edda' : '#f8f9fa',
                                borderRadius: '4px',
                                border: idx === 0 ? '2px solid #27ae60' : '1px solid #ddd'
                            }}>
                                <div style={{ marginBottom: '8px' }}>
                                    <strong style={{ color: idx === 0 ? '#27ae60' : '#333', fontSize: '16px' }}>
                                        {idx === 0 ? '✓ Best Discard: ' : `#${idx + 1}: Discard `}
                                        <span style={{ fontSize: '32px', display: 'inline-block', verticalAlign: 'middle', margin: '0 8px' }}>
                                            {TILE_UNICODE[result.discard] || result.discard}
                                        </span>
                                    </strong>
                                    <span style={{ marginLeft: '10px', fontSize: '14px', color: '#666' }}>
                                        → {result.newShanten}-shanten
                                    </span>
                                </div>
                                <div style={{ fontSize: '14px', color: '#555', marginBottom: '8px' }}>
                                    <strong>Total Acceptance: {result.ukeire} tiles</strong>
                                </div>
                                <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                                    {result.acceptedTiles.length > 0 ? (
                                        <>
                                            <strong>{result.newShanten === 0 ? 'Winning tiles:' : 'Accepted tiles:'}</strong><br/>
                                            {result.acceptedTiles.map((a, i) => (
                                                <span key={i} style={{ 
                                                    display: 'inline-block',
                                                    margin: '4px',
                                                    fontSize: '28px'
                                                }}>
                                                    {TILE_UNICODE[a.tile] || a.tile} <span style={{ fontSize: '14px', color: '#666' }}>× {a.count}</span>
                                                </span>
                                            ))}
                                        </>
                                    ) : (
                                        <span style={{ color: '#999' }}>No improving tiles</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}