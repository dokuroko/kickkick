/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Trophy, User, Cpu, Sparkles } from 'lucide-react';
import { Player, Piece, GameState } from './types';
import { BOARD_NODES, SHORTCUTS, HOME_POSITIONS } from './constants';

const BOARD_IMAGE_URL = "https://storage.googleapis.com/mcp-prod-models-image-uploads/1742323215160-593532f786308.png";

const INITIAL_PIECES: Piece[] = [
  ...Array(4).fill(null).map((_, i) => ({ id: i, owner: 'A' as Player, position: -1, distanceTraveled: 0, isFinished: false })),
  ...Array(4).fill(null).map((_, i) => ({ id: i + 4, owner: 'B' as Player, position: -1, distanceTraveled: 0, isFinished: false })),
];

const KICK_IMAGES = [
  "https://storage.googleapis.com/mcp-prod-models-image-uploads/1742332345517-5789642345678.png",
  "https://storage.googleapis.com/mcp-prod-models-image-uploads/1742332346123-1234567890123.png"
];

export default function App() {
  const [game, setGame] = useState<GameState>({
    pieces: INITIAL_PIECES,
    currentPlayer: 'A',
    remainingSpins: 1,
    bankedSpins: [],
    selectedSpinIndex: null,
    status: 'spinning',
    winner: null,
    stepsCount: { A: 0, B: 0 },
    isSpinning: false,
    message: "玩家 A 的回合，請轉動轉盤",
    selectedPieceId: null,
    finishedPieces: [],
  });

  const [kickedPieceId, setKickedPieceId] = useState<number | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [showBattle, setShowBattle] = useState(false);
  const [battleCountdown, setBattleCountdown] = useState(10);
  const [battleImageIndex, setBattleImageIndex] = useState(0);
  const [finishedPieceId, setFinishedPieceId] = useState<number | null>(null);
  const [displaySpinValue, setDisplaySpinValue] = useState<number>(1);
  const [hasSpun, setHasSpun] = useState(false);
  const [possibleMoves, setPossibleMoves] = useState<{ pos: number; dist: number; pathStart: number | null }[]>([]);

  // Sound Effects
  const playSound = useCallback((type: 'turn' | 'spin' | 'move' | 'kick' | 'win') => {
    if (type === 'win') return; // YES音效取消
    const sounds = {
      turn: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
      spin: 'https://assets.mixkit.co/active_storage/sfx/2011/2011-preview.mp3', // Fast ticking
      move: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
      kick: 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3',
      win: 'https://assets.mixkit.co/active_storage/sfx/2014/2014-preview.mp3',
    };
    const audio = new Audio(sounds[type]);
    audio.volume = 0.5;
    audio.play().catch(() => {}); // Ignore autoplay blocks
  }, []);

  // Initial turn overlay
  useEffect(() => {
    playSound('turn');
  }, [playSound]);

  // Helper to get pieces at a position
  const getPiecesAt = (pos: number) => game.pieces.filter(p => p.position === pos && !p.isFinished);

  const handleSpin = () => {
    if (game.remainingSpins === 0 || game.isSpinning || game.winner) return;

    setGame(prev => ({ ...prev, isSpinning: true }));
    playSound('spin');

    // Slot machine animation: fast to slow (ultra fast)
    let count = 0;
    const maxCount = 6;
    let currentInterval = 5;

    const runSpinAnimation = () => {
      setDisplaySpinValue(Math.floor(Math.random() * 5) + 1);
      count++;
      if (count >= maxCount) {
        finalizeSpin();
      } else {
        currentInterval += 5; // Slow down
        setTimeout(runSpinAnimation, currentInterval);
      }
    };

    runSpinAnimation();

    const finalizeSpin = () => {
      const value = Math.floor(Math.random() * 5) + 1;
      setDisplaySpinValue(value);
      setHasSpun(true);
      
      setTimeout(() => {
        let extraSpins = 0;
        if (value === 4 || value === 5) {
          extraSpins = 1;
          setShowFlash(true);
          setTimeout(() => setShowFlash(false), 1000);
        }

        setGame(prev => {
          const newBanked = [...prev.bankedSpins, value];
          const nextRemaining = prev.remainingSpins - 1 + extraSpins;
          
          return {
            ...prev,
            bankedSpins: newBanked,
            remainingSpins: nextRemaining,
            isSpinning: false,
            // If no more spins, automatically select the first one if only one exists
            selectedSpinIndex: newBanked.length === 1 ? 0 : prev.selectedSpinIndex,
            status: nextRemaining > 0 ? 'spinning' : 'moving',
            message: nextRemaining > 0 
              ? `轉到了 ${value}！獲得額外機會！` 
              : `轉完了！請選擇步數並移動棋子`,
          };
        });
      }, 500);
    };
  };

  // Move Piece Logic
  const handlePieceClick = (pieceId: number) => {
    if (game.selectedSpinIndex === null || game.isSpinning || game.winner) return;
    const spinValue = game.bankedSpins[game.selectedSpinIndex];
    if (!spinValue) return;

    const piece = game.pieces.find(p => p.id === pieceId);
    if (!piece || piece.owner !== game.currentPlayer || piece.isFinished) return;

    // Calculate all possible final positions
    const targets = getPossibleFinalPositions(piece, spinValue);
    
    if (targets.length === 0) return;

    // Always show paths first
    setGame(prev => ({ ...prev, selectedPieceId: pieceId, message: "請選擇移動路徑" }));
    setPossibleMoves(targets);
  };

  const executeMove = (pieceId: number, finalPos: number, finalDistance: number) => {
    const piece = game.pieces.find(p => p.id === pieceId);
    if (!piece || game.selectedSpinIndex === null) return;

    const spinValue = game.bankedSpins[game.selectedSpinIndex];
    const piecesAtSamePos = getPiecesAt(piece.position).filter(p => p.owner === piece.owner);
    
    let newPieces = [...game.pieces];
    const movingPieces = piecesAtSamePos.length > 1 && piece.position !== -1 ? piecesAtSamePos : [piece];
    
    let isFinished = false;
    let newFinishedPieces = [...game.finishedPieces];

    if (finalDistance >= 20) {
      isFinished = true;
      setFinishedPieceId(pieceId);
      setTimeout(() => setFinishedPieceId(null), 2000);
    }

    // Update moving pieces
    movingPieces.forEach(p => {
      const idx = newPieces.findIndex(np => np.id === p.id);
      if (isFinished) {
        newPieces[idx] = { ...newPieces[idx], position: -2, distanceTraveled: finalDistance, isFinished: true, pathStart: null };
        newFinishedPieces.push(p.owner);
      } else {
        const moveInfo = possibleMoves.find(m => m.pos === finalPos && m.dist === finalDistance);
        newPieces[idx] = { ...newPieces[idx], position: finalPos, distanceTraveled: finalDistance, pathStart: moveInfo?.pathStart ?? null };
      }
    });

    playSound('move');
    setPossibleMoves([]);

    // Check for kicking
    let extraSpinFromKick = 0;
    if (!isFinished) {
      const opponentsAtTarget = newPieces.filter(p => p.position === finalPos && p.owner !== game.currentPlayer && !p.isFinished);
      if (opponentsAtTarget.length > 0) {
        extraSpinFromKick = 1;
        playSound('kick');
        
        // Kick Animation with 10s countdown
        setBattleCountdown(10);
        setShowBattle(true);
        
        const timer = setInterval(() => {
          setBattleCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              setShowBattle(false);
              return 0;
            }
            // Randomly change image every second for "random play" effect
            setBattleImageIndex(Math.floor(Math.random() * KICK_IMAGES.length));
            return prev - 1;
          });
        }, 1000);

        opponentsAtTarget.forEach(p => {
          const idx = newPieces.findIndex(np => np.id === p.id);
          newPieces[idx] = { ...newPieces[idx], position: -1, distanceTraveled: 0, pathStart: null };
          setKickedPieceId(p.id);
        });
        setTimeout(() => setKickedPieceId(null), 1000);
      }
    }

    const nextStepsCount = { ...game.stepsCount, [game.currentPlayer]: game.stepsCount[game.currentPlayer] + spinValue };

    // Check Win Condition
    const playerFinishedCount = newFinishedPieces.filter(p => p === game.currentPlayer).length;
    const allFinished = playerFinishedCount >= 4;

    if (allFinished) {
      playSound('win');
      setGame(prev => ({
        ...prev,
        pieces: newPieces,
        finishedPieces: newFinishedPieces,
        status: 'finished',
        winner: game.currentPlayer,
        stepsCount: nextStepsCount,
        message: `遊戲結束！ ${game.currentPlayer === 'A' ? '玩家' : '電腦'} 獲勝！`,
      }));
      return;
    }

    // Next Step Logic
    setGame(prev => {
      const newBanked = prev.bankedSpins.filter((_, i) => i !== prev.selectedSpinIndex);
      const nextRemainingSpins = prev.remainingSpins + extraSpinFromKick;
      
      // If still have banked spins or remaining spins, keep current player
      const hasMoreActions = newBanked.length > 0 || nextRemainingSpins > 0;
      const nextPlayer = hasMoreActions ? prev.currentPlayer : (prev.currentPlayer === 'A' ? 'B' : 'A');
      
      if (!hasMoreActions) {
        playSound('turn');
      }

      return {
        ...prev,
        pieces: newPieces,
        finishedPieces: newFinishedPieces,
        currentPlayer: nextPlayer,
        remainingSpins: nextRemainingSpins > 0 ? nextRemainingSpins : (newBanked.length > 0 ? 0 : 1),
        bankedSpins: newBanked,
        selectedSpinIndex: newBanked.length > 0 ? 0 : null,
        status: nextRemainingSpins > 0 ? 'spinning' : (newBanked.length > 0 ? 'moving' : 'spinning'),
        stepsCount: nextStepsCount,
        selectedPieceId: null,
        message: nextRemainingSpins > 0 
          ? `獲得額外機會！請再次轉動轉盤` 
          : (newBanked.length > 0 ? `請分配剩餘步數` : `${nextPlayer === 'A' ? '玩家' : '電腦'} 的回合，請轉動轉盤`),
      };
    });
    setHasSpun(false);
  };

  const getPossibleFinalPositions = (piece: Piece, spinValue: number) => {
    const findNext = (pos: number, dist: number, pathStart: number | null): { pos: number; dist: number; pathStart: number | null }[] => {
      // If already finished
      if (pos === -2) return [{ pos: -2, dist: dist + 1, pathStart: null }];
      
      // Starting from home
      if (pos === -1) return [{ pos: 1, dist: 1, pathStart: null }];

      // Node 0 is the finish entry - once reached, piece is finished
      if (pos === 0 && dist >= 10) {
        return [{ pos: -2, dist: dist + 1, pathStart: null }];
      }

      // Special case: Center node 23 allows branching if we are on a shortcut
      if (pos === 23 && pathStart !== null) {
        return [
          { pos: 24, dist: dist + 1, pathStart: 5 },  // Towards 15
          { pos: 28, dist: dist + 1, pathStart: 10 }, // Towards 0
          { pos: 22, dist: dist + 1, pathStart: 15 }, // Towards 5
          { pos: 27, dist: dist + 1, pathStart: 0 },  // Towards 10
        ];
      }

      // If in a diagonal path
      if (pathStart !== null) {
        const path = SHORTCUTS[pathStart];
        // If we are at the starting corner of this shortcut
        if (pos === pathStart) {
          return [{ pos: path[0], dist: dist + 1, pathStart }];
        }
        const idx = path.indexOf(pos);
        if (idx !== -1 && idx < path.length - 1) {
          const nextPos = path[idx + 1];
          // If next position is the destination corner, add saved distance
          const extraDist = [0, 5, 10, 15].includes(nextPos) ? 5 : 1;
          return [{ pos: nextPos, dist: dist + extraDist, pathStart: [0, 5, 10, 15].includes(nextPos) ? null : pathStart }];
        }
        // End of diagonal - return to outer loop
        return [{ pos: (pos + 1) % 20, dist: dist + 1, pathStart: null }];
      }

      // Outer loop
      return [{ pos: (pos + 1) % 20, dist: dist + 1, pathStart: null }];
    };

    let currentStates: { pos: number; dist: number; pathStart: number | null }[] = [];
    
    // Regular node - find if it's already on a diagonal
    let initialPathStart: number | null = piece.pathStart || null;
    if (piece.position !== -1 && initialPathStart === null) {
      for (const s in SHORTCUTS) {
        const p = SHORTCUTS[parseInt(s)];
        if (p.includes(piece.position)) {
          initialPathStart = parseInt(s);
          break;
        }
      }
    }
    
    // BRANCHING AT START ONLY
    if ([5, 10, 15].includes(piece.position)) {
      // Corner: choose outer or shortcut (Node 0 excluded)
      currentStates.push({ pos: piece.position, dist: piece.distanceTraveled, pathStart: null });
      currentStates.push({ pos: piece.position, dist: piece.distanceTraveled, pathStart: piece.position });
    } else if (piece.position === 23) {
      // Center: choose towards BL (path 5) or BR (path 10)
      currentStates.push({ pos: piece.position, dist: piece.distanceTraveled, pathStart: 5 });
      currentStates.push({ pos: piece.position, dist: piece.distanceTraveled, pathStart: 10 });
    } else {
      currentStates.push({ pos: piece.position, dist: piece.distanceTraveled, pathStart: initialPathStart });
    }

    // Simulate move steps
    for (let i = 0; i < spinValue; i++) {
      let nextStates: { pos: number; dist: number; pathStart: number | null }[] = [];
      currentStates.forEach(state => {
        nextStates.push(...findNext(state.pos, state.dist, state.pathStart));
      });
      currentStates = nextStates;
    }

    // Filter unique final positions
    return currentStates.map(s => ({ pos: s.pos, dist: s.dist, pathStart: s.pathStart }))
      .filter((v, i, a) => a.findIndex(t => t.pos === v.pos) === i);
  };

  // Computer AI
  useEffect(() => {
    if (game.currentPlayer === 'B' && game.status === 'spinning' && !game.isSpinning && !game.winner) {
      const timer = setTimeout(handleSpin, 1500);
      return () => clearTimeout(timer);
    }
    if (game.currentPlayer === 'B' && game.status === 'moving' && game.bankedSpins.length > 0 && !game.winner) {
      const timer = setTimeout(() => {
        // AI Strategy:
        // 1. If still have spins to do, wait (handled by status)
        // 2. If have banked spins, pick the best move for the CURRENT selected spin
        const spinValue = game.bankedSpins[game.selectedSpinIndex || 0];
        const movablePieces = game.pieces.filter(p => p.owner === 'B' && !p.isFinished);
        
        if (movablePieces.length > 0) {
          // Score each possible move for each piece
          const allMoves: { pieceId: number; pos: number; dist: number; score: number }[] = [];
          
          movablePieces.forEach(p => {
            const targets = getPossibleFinalPositions(p, spinValue);
            targets.forEach(t => {
              let score = t.dist; // Basic score: distance
              
              // Bonus for finishing
              if (t.pos === -2) score += 100;
              
              // Bonus for kicking
              const opponents = game.pieces.filter(op => op.position === t.pos && op.owner === 'A');
              if (opponents.length > 0) score += 50;
              
              // Bonus for stacking
              const allies = game.pieces.filter(al => al.position === t.pos && al.owner === 'B' && al.id !== p.id);
              if (allies.length > 0) score += 20 * allies.length;

              // Bonus for moving an existing stack
              const currentStack = game.pieces.filter(al => al.position === p.position && al.owner === 'B' && p.position !== -1);
              if (currentStack.length > 1) score += 15 * currentStack.length;

              allMoves.push({ pieceId: p.id, pos: t.pos, dist: t.dist, score });
            });
          });

          if (allMoves.length > 0) {
            const bestMove = allMoves.sort((a, b) => b.score - a.score)[0];
            executeMove(bestMove.pieceId, bestMove.pos, bestMove.dist);
          }
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [game.currentPlayer, game.status, game.isSpinning, game.bankedSpins, game.selectedSpinIndex]);

  const resetGame = () => {
    setGame({
      pieces: INITIAL_PIECES,
      currentPlayer: 'A',
      remainingSpins: 1,
      bankedSpins: [],
      selectedSpinIndex: null,
      status: 'spinning',
      winner: null,
      stepsCount: { A: 0, B: 0 },
      isSpinning: false,
      message: "玩家 A 的回合，請轉動轉盤",
      selectedPieceId: null,
      finishedPieces: [],
    });
  };

  // Render Pieces
  const renderPieces = () => {
    const posGroups: Record<number, Piece[]> = {};
    game.pieces.forEach(p => {
      if (p.isFinished) return;
      if (!posGroups[p.position]) posGroups[p.position] = [];
      posGroups[p.position].push(p);
    });

    const elements: React.ReactNode[] = [];

    Object.entries(posGroups).forEach(([posStr, pieces]) => {
      const pos = parseInt(posStr);
      const isHome = pos === -1;
      
      if (isHome) {
        pieces.forEach((p) => {
          const homeCoord = HOME_POSITIONS[p.owner][p.id % 4];
          elements.push(
            <PieceVisual 
              key={p.id} 
              piece={p} 
              coord={{ x: homeCoord.x, y: homeCoord.y }} 
              onClick={() => handlePieceClick(p.id)}
              isKicked={kickedPieceId === p.id}
              canMove={game.status === 'moving' && game.currentPlayer === p.owner && !game.selectedPieceId}
            />
          );
        });
        return;
      }

      const coord = BOARD_NODES[pos] || { x: 50, y: 50 };
      const owner = pieces[0].owner;
      elements.push(
        <PieceVisual 
          key={`stack-${pos}`} 
          piece={pieces[0]} 
          coord={{ x: coord.x, y: coord.y }} 
          stackSize={pieces.length}
          onClick={() => handlePieceClick(pieces[0].id)}
          isFinished={finishedPieceId === pieces[0].id}
          canMove={game.bankedSpins.length > 0 && game.currentPlayer === owner && !game.selectedPieceId && !game.isSpinning}
        />
      );
    });

    // Render possible moves
    possibleMoves.forEach((move, i) => {
      const isFinish = move.pos === -2;
      const coord = isFinish 
        ? { x: -8, y: 10 } // Position in the finish zone
        : (BOARD_NODES[move.pos] || { x: 50, y: 50 });
      
      elements.push(
        <motion.div
          key={`move-target-${i}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.8 }}
          style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
          className="absolute w-8 h-8 -ml-4 -mt-4 bg-yellow-400 rounded-full border-2 border-white shadow-lg cursor-pointer z-50 flex items-center justify-center pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation();
            if (game.selectedPieceId !== null) {
              executeMove(game.selectedPieceId, move.pos, move.dist);
            }
          }}
        >
          <span className="text-[10px] font-bold text-stone-900">GO</span>
        </motion.div>
      );
    });

    return elements;
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-4 font-sans text-stone-800 overflow-hidden">
      {/* Winner Overlay */}
      <AnimatePresence>
        {game.winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border-4 border-stone-900"
            >
              <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-stone-900 shadow-lg">
                <Trophy size={40} className="text-stone-900" />
              </div>
              <h2 className="text-3xl font-black mb-2">恭喜獲勝！</h2>
              <p className="text-stone-600 mb-8 font-bold">
                {game.winner === 'A' ? '玩家 A' : '電腦 B'} 成功將所有棋子送達終點！
              </p>
              <button
                onClick={resetGame}
                className="w-full py-4 bg-stone-900 text-white rounded-2xl font-black text-xl flex items-center justify-center gap-3 hover:bg-stone-800 transition-colors"
              >
                <RotateCcw size={24} />
                重新開始
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="w-full max-w-md flex justify-between items-center mb-4 bg-white p-3 rounded-2xl shadow-sm border border-stone-200">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full transition-colors ${game.currentPlayer === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-stone-100 text-stone-500'}`}>
          <User size={18} />
          <span className="font-bold">玩家 A</span>
          <span className="text-xs bg-white px-2 rounded-full border border-blue-200">{game.stepsCount.A} 步</span>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full transition-colors ${game.currentPlayer === 'B' ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-500'}`}>
          <Cpu size={18} />
          <span className="font-bold">電腦 B</span>
          <span className="text-xs bg-white px-2 rounded-full border border-red-200">{game.stepsCount.B} 步</span>
        </div>
      </div>

      {/* Board Container */}
      <div className="relative w-full max-w-[500px] aspect-square bg-white rounded-3xl shadow-xl border-4 border-stone-800 mt-12">
        {/* SVG Background for lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Outer Loop Lines */}
          {[...Array(20)].map((_, i) => {
            const start = BOARD_NODES[i];
            const end = BOARD_NODES[(i + 1) % 20];
            return (
              <line 
                key={`line-${i}`}
                x1={`${start.x}%`} y1={`${start.y}%`}
                x2={`${end.x}%`} y2={`${end.y}%`}
                stroke="#1c1917" strokeWidth="4"
              />
            );
          })}
          {/* Diagonal Lines */}
          {Object.entries(SHORTCUTS).map(([startIdx, path]) => {
            const start = BOARD_NODES[parseInt(startIdx)];
            const points = [start, ...path.map(idx => BOARD_NODES[idx])];
            return points.map((p, i) => {
              if (i === points.length - 1) return null;
              const next = points[i + 1];
              return (
                <line 
                  key={`diag-${startIdx}-${i}`}
                  x1={`${p.x}%`} y1={`${p.y}%`}
                  x2={`${next.x}%`} y2={`${next.y}%`}
                  stroke="#1c1917" strokeWidth="2" strokeDasharray="4 4"
                />
              );
            });
          })}
        </svg>

        {/* Nodes Layer */}
        {Object.entries(BOARD_NODES).map(([idx, node]) => (
          <div 
            key={`node-${idx}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 border-2 border-stone-800 flex items-center justify-center
              ${node.type === 'square' ? (idx === '23' ? 'w-14 h-14' : 'w-10 h-10') + ' rounded-md bg-stone-50' : 'w-7 h-7 rounded-full bg-white'}
              ${idx === '0' ? 'bg-blue-50 ring-2 ring-blue-200' : ''}
              ${idx === '23' ? 'z-10 shadow-inner' : ''}
            `}
          >
            {idx === '0' && <span className="text-[8px] font-bold text-blue-600">START</span>}
          </div>
        ))}
        
        {/* Pieces Layer */}
        <div className="absolute inset-0 pointer-events-none z-20">
          {renderPieces()}
        </div>

        {/* Battle Overlay */}
        <AnimatePresence>
          {showBattle && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer pointer-events-auto"
              onClick={() => setShowBattle(false)}
            >
              <motion.div
                initial={{ scale: 0.5, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 1.5, rotate: 10 }}
                className="relative"
              >
                <img 
                  src={KICK_IMAGES[battleImageIndex]} 
                  alt="Battle" 
                  className="w-[80vw] h-[80vw] max-w-[500px] max-h-[500px] rounded-3xl border-8 border-yellow-400 shadow-2xl object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute -top-6 -right-6 bg-red-600 text-white font-black text-4xl px-6 py-2 rounded-xl border-4 border-white shadow-lg rotate-12">
                  KICK!
                </div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-yellow-400 text-stone-900 font-black text-2xl px-8 py-2 rounded-full border-4 border-stone-900 shadow-lg flex items-center gap-3">
                  <span>{battleCountdown}s</span>
                  <span className="text-sm opacity-60 uppercase tracking-widest">Click to Skip</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Banked Spins Area - Right Side */}
        <div className="absolute -right-20 top-0 bottom-0 w-16 flex flex-col items-center py-4 gap-3">
          <div className="text-[10px] font-black text-stone-400 uppercase rotate-90 mb-4">BANK</div>
          <AnimatePresence>
            {game.bankedSpins.map((val, i) => (
              <motion.button
                key={`banked-${i}-${val}`}
                initial={{ scale: 0, x: 20 }}
                animate={{ scale: 1, x: 0 }}
                exit={{ scale: 0, x: 20 }}
                onClick={() => setGame(prev => ({ ...prev, selectedSpinIndex: i, status: 'moving' }))}
                className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center font-black shadow-sm transition-all
                  ${game.selectedSpinIndex === i 
                    ? 'bg-yellow-400 border-stone-900 text-stone-900 scale-110 z-10' 
                    : 'bg-white border-stone-200 text-stone-400 hover:border-stone-400'}
                `}
              >
                {val}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {/* Flash Overlay */}
        <AnimatePresence>
          {showFlash && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-yellow-400 pointer-events-none z-50 rounded-3xl"
            />
          )}
        </AnimatePresence>

        {/* Finish Zone - Left Vertical */}
        <div className="absolute -left-16 top-0 bottom-0 w-12 bg-stone-200 rounded-xl border-2 border-stone-800 flex flex-col items-center py-4 gap-2 overflow-hidden">
          <div className="text-[12px] font-black text-stone-400 uppercase mb-4 rotate-90 whitespace-nowrap tracking-widest">FINISH</div>
          <div className="flex flex-col gap-2">
            {game.finishedPieces.map((owner, i) => (
              <motion.div
                key={`finished-${i}`}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className={`w-7 h-7 rounded-full border-2 border-white shadow-sm flex-shrink-0 ${owner === 'A' ? 'bg-blue-500' : 'bg-red-500'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Empty space below board */}
      <div className="h-12" />

      {/* Spinner Area - Bottom Right Outside Board */}
      <div className="fixed bottom-8 right-[calc(50%-300px-64px-160px)] z-[150] w-40 h-40 flex items-center justify-center">
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Circular Text - Centered around the button */}
          <AnimatePresence>
            {(game.status === 'spinning' || game.isSpinning) && !game.winner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 pointer-events-none flex items-center justify-center"
              >
                <svg viewBox="0 0 100 100" className="w-full h-full animate-[spin_10s_linear_infinite]">
                  <path
                    id="circlePath"
                    d="M 50, 50 m -40, 0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0"
                    fill="transparent"
                  />
                  <text className="text-[5.5px] font-black fill-stone-400 uppercase tracking-[0.25em]">
                    <textPath href="#circlePath" startOffset="0%">
                      {game.currentPlayer === 'A' ? 'PLAYER A TURN • SPIN NOW • PLAYER A TURN • SPIN NOW • ' : 'COMPUTER B TURN • SPIN NOW • COMPUTER B TURN • SPIN NOW • '}
                    </textPath>
                  </text>
                </svg>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col items-center relative">
            {/* Bouncing Arrow & Extra Spin */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
              className={`absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center transition-colors ${game.currentPlayer === 'A' ? 'text-blue-500' : 'text-red-500'}`}
            >
              {game.remainingSpins > 0 && (
                <div className="text-[10px] font-black bg-yellow-400 text-stone-900 px-2 py-0.5 rounded-full border border-stone-900 mb-1 shadow-sm">
                  +{game.remainingSpins}
                </div>
              )}
              <div className="text-xl drop-shadow-sm scale-x-[0.5] scale-y-[0.35]">▼</div>
            </motion.div>

            {/* Spinner Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSpin}
              disabled={game.isSpinning || !!game.winner || game.remainingSpins === 0}
              className={`w-24 h-24 rounded-full border-[8px] flex items-center justify-center text-3xl font-black shadow-2xl transition-all relative z-10
                ${game.remainingSpins > 0 && !game.isSpinning 
                  ? (game.currentPlayer === 'A' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-red-500 bg-red-50 text-red-600') + ' cursor-pointer' 
                  : 'border-stone-300 bg-stone-100 text-stone-400 cursor-not-allowed'}
              `}
            >
              <span className="translate-y-1">
                {game.isSpinning ? displaySpinValue : (hasSpun || game.status === 'moving' ? (game.bankedSpins[game.selectedSpinIndex ?? -1] || displaySpinValue) : "SPIN")}
              </span>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PieceVisualProps {
  piece: Piece;
  coord: { x: number; y: number };
  stackSize?: number;
  onClick: () => void;
  isKicked?: boolean;
  isFinished?: boolean;
  canMove?: boolean;
  key?: React.Key;
}

function PieceVisual({ piece, coord, stackSize = 1, onClick, isKicked, isFinished, canMove }: PieceVisualProps) {
  return (
    <motion.div
      layout
      initial={false}
      animate={{ 
        left: `${coord.x}%`, 
        top: `${coord.y}%`,
        scale: isKicked ? [1, 1.5, 0] : isFinished ? [1, 1.5, 0] : 1,
        opacity: isKicked || isFinished ? 0 : 1,
        rotate: isKicked ? 360 : 0,
      }}
      transition={{ 
        type: 'spring', 
        stiffness: 400, 
        damping: 25,
        mass: 0.8,
        scale: (isKicked || isFinished) ? { type: 'tween', duration: 0.5, ease: "easeInOut" } : { type: 'spring' }
      }}
      className={`absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-2 border-white shadow-md flex items-center justify-center cursor-pointer pointer-events-auto z-10
        ${piece.owner === 'A' ? 'bg-blue-500' : 'bg-red-500'}
        ${canMove ? 'ring-4 ring-yellow-400 ring-offset-2 animate-pulse' : ''}
      `}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {stackSize > 1 && (
        <span className="text-[10px] font-black text-white">X{stackSize}</span>
      )}
      {isFinished && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-yellow-500">
          <Sparkles size={24} className="animate-bounce" />
        </div>
      )}
    </motion.div>
  );
}
