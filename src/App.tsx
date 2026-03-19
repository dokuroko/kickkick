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

// Dinosaur Icon Component - Improved more detailed version
const DinoIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Body */}
    <path 
      d="M19 6C19 4.34315 17.6569 3 16 3H12C10.3431 3 9 4.34315 9 6V8H7C5.34315 8 4 9.34315 4 11V13C4 14.6569 5.34315 16 7 16H8V19C8 20.1046 8.89543 21 10 21H12C13.1046 21 14 20.1046 14 19V16H16C17.6569 16 19 14.6569 19 13V11H21C22.1046 11 23 10.1046 23 9V7C23 5.89543 22.1046 5 21 5H19V6Z" 
      fill={color} 
    />
    {/* Eye */}
    <circle cx="16" cy="7.5" r="1.2" fill="white" />
    {/* Spikes */}
    <path d="M9 4L7 6V8H9V4Z" fill={color} filter="brightness(0.8)" />
    <path d="M12 2L10 4V6H12V2Z" fill={color} filter="brightness(0.8)" />
    <path d="M15 2L13 4V6H15V2Z" fill={color} filter="brightness(0.8)" />
    {/* Belly/Detail */}
    <path d="M7 11H9V13H7V11Z" fill="white" fillOpacity="0.2" />
    <path d="M10 13H12V15H10V13Z" fill="white" fillOpacity="0.2" />
    {/* Tail */}
    <path d="M4 11L2 13V15L4 13V11Z" fill={color} />
  </svg>
);

// Meat Icon Component
const MeatIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 5C15.5 5 14.5 6 14 7.5C13.5 9 13.5 11 14.5 12.5C15.5 14 17.5 14.5 19 14C20.5 13.5 21.5 12 21.5 10C21.5 7.5 19.5 5 17 5Z" fill="#F87171" stroke="#1C1917" strokeWidth="1.5"/>
    <path d="M17 8C17.5 8 18 8.5 18 9C18 9.5 17.5 10 17 10C16.5 10 16 9.5 16 9C16 8.5 16.5 8 17 8Z" fill="white"/>
    <path d="M14 10L4 20" stroke="#1C1917" strokeWidth="2" strokeLinecap="round"/>
    <path d="M7 14L5 16" stroke="#1C1917" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

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
    kickedCount: { A: 0, B: 0 },
    isSpinning: false,
    message: "玩家 A 的回合，請轉動轉盤",
    selectedPieceId: null,
    finishedPieces: [],
  });

  const [showFlash, setShowFlash] = useState(false);
  const [showRainbow, setShowRainbow] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [kickedPieceId, setKickedPieceId] = useState<number | null>(null);
  const [showKickEffect, setShowKickEffect] = useState<number | null>(null);
  const [finishedPieceId, setFinishedPieceId] = useState<number | null>(null);
  const [displaySpinValue, setDisplaySpinValue] = useState<number>(1);
  const [hasSpun, setHasSpun] = useState(false);
  const [possibleMoves, setPossibleMoves] = useState<{ pos: number; dist: number; pathStart: number | null }[]>([]);
  const [angryPieceIds, setAngryPieceIds] = useState<number[]>([]);

  // Sound Effects
  const playSound = useCallback((type: 'turn' | 'spin' | 'move' | 'kick' | 'win' | 'sparkle' | 'celebration' | 'taunt') => {
    if (type === 'win') return; // YES音效取消
    const sounds = {
      turn: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
      spin: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Button click sound
      move: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3', // Heavy footstep
      kick: 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3',
      win: 'https://assets.mixkit.co/active_storage/sfx/2014/2014-preview.mp3',
      sparkle: 'https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3', // Sparkle/Magic sound
      celebration: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', // Crowd cheering
      taunt: 'https://assets.mixkit.co/active_storage/sfx/2015/2015-preview.mp3', // Laugh/Mocking sound
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
      const rand = Math.random();
      let value;
      if (rand < 0.65) {
        value = Math.floor(Math.random() * 3) + 1; // 1, 2, 3
      } else if (rand < 0.85) {
        value = 4;
      } else {
        value = 5;
      }
      setDisplaySpinValue(value);
      setHasSpun(true);
      
      setTimeout(() => {
        let extraSpins = 0;
        if (value === 4 || value === 5) {
          extraSpins = 1;
          setShowFlash(true);
          setShowRainbow(true);
          playSound('sparkle');
          setTimeout(() => {
            setShowFlash(false);
            setShowRainbow(false);
          }, 2000);
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

    if (finalPos === -2) {
      isFinished = true;
      setFinishedPieceId(pieceId);
      playSound('celebration');
      setTimeout(() => setFinishedPieceId(null), 2000);
    }

    // Calculate path for animation
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

    const findPath = (startPos: number, targetPos: number, targetDist: number, pStart: number | null): number[] | null => {
      let queue: { pos: number; dist: number; pathStart: number | null; path: number[] }[] = [
        { pos: startPos, dist: piece.distanceTraveled, pathStart: pStart, path: [] }
      ];

      for (let i = 0; i < spinValue; i++) {
        let nextQueue: typeof queue = [];
        queue.forEach(state => {
          const nexts = findNext(state.pos, state.dist, state.pathStart);
          nexts.forEach(n => {
            nextQueue.push({ ...n, path: [...state.path, n.pos] });
          });
        });
        queue = nextQueue;
      }

      const found = queue.find(q => q.pos === targetPos && q.dist === targetDist);
      return found ? found.path : null;
    };

    const moveInfo = possibleMoves.find(m => m.pos === finalPos && m.dist === finalDistance);
    const pathNodes = findPath(piece.position, finalPos, finalDistance, moveInfo?.pathStart ?? initialPathStart) || [finalPos];
    const animationPath = pathNodes.map(nodeId => {
      if (nodeId === -2) return { x: -8, y: 10 };
      return BOARD_NODES[nodeId] || { x: 50, y: 50 };
    });

    // Update moving pieces
    movingPieces.forEach(p => {
      const idx = newPieces.findIndex(np => np.id === p.id);
      if (isFinished) {
        newPieces[idx] = { ...newPieces[idx], position: -2, distanceTraveled: finalDistance, isFinished: true, pathStart: null, animationPath };
        newFinishedPieces.push(p.owner);
      } else {
        newPieces[idx] = { ...newPieces[idx], position: finalPos, distanceTraveled: finalDistance, pathStart: moveInfo?.pathStart ?? null, animationPath };
      }
    });

    playSound('move');
    setPossibleMoves([]);

    // Check for kicking
    let extraSpinFromKick = 0;
    let kickedIds: number[] = [];
    if (!isFinished) {
      const opponentsAtTarget = newPieces.filter(p => p.position === finalPos && p.owner !== game.currentPlayer && !p.isFinished);
      if (opponentsAtTarget.length > 0) {
        extraSpinFromKick = 1;
        playSound('kick');
        
        // Kick Animation first, then show image
        opponentsAtTarget.forEach(p => {
          const idx = newPieces.findIndex(np => np.id === p.id);
          const currentCoord = BOARD_NODES[p.position] || { x: 50, y: 50 };
          const homeCoord = HOME_POSITIONS[p.owner][p.id % 4];
          
          // Arched path back to home
          const kickPath = [
            currentCoord,
            { x: (currentCoord.x + homeCoord.x) / 2, y: Math.min(currentCoord.y, homeCoord.y) - 20 },
            homeCoord
          ];

          newPieces[idx] = { ...newPieces[idx], position: -1, distanceTraveled: 0, pathStart: null, animationPath: kickPath };
          kickedIds.push(p.id);
          setKickedPieceId(p.id);
          
          // Add to angry pieces for 5 seconds
          setAngryPieceIds(prev => [...prev, p.id]);
          setTimeout(() => {
            setAngryPieceIds(prev => prev.filter(id => id !== p.id));
          }, 5000);
        });

        // Update kickedCount for the player who got kicked
        const kickedOwner = opponentsAtTarget[0].owner;
        setGame(prev => ({
          ...prev,
          kickedCount: {
            ...prev.kickedCount,
            [kickedOwner]: prev.kickedCount[kickedOwner] + opponentsAtTarget.length
          }
        }));

        // Show local KICK effect
        setShowKickEffect(opponentsAtTarget[0].id);
        playSound('kick');
        playSound('taunt');
        setTimeout(() => setShowKickEffect(null), 1200);

        setTimeout(() => setKickedPieceId(null), 1000);
      }
    }

    // Clear animation paths after they complete
    const animDuration = kickedIds.length > 0 ? 1000 : animationPath.length * 200;
    setTimeout(() => {
      setGame(prev => ({
        ...prev,
        pieces: prev.pieces.map(p => {
          if (movingPieces.some(mp => mp.id === p.id) || kickedIds.includes(p.id)) {
            return { ...p, animationPath: null };
          }
          return p;
        })
      }));
    }, animDuration + 100);

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

  const findNext = (pos: number, dist: number, pathStart: number | null): { pos: number; dist: number; pathStart: number | null }[] => {
    // If already finished
    if (pos === -2) return [{ pos: -2, dist: dist + 1, pathStart: null }];
    
    // Starting from home
    if (pos === -1) return [{ pos: 1, dist: 1, pathStart: null }];

    // Node 0 is the finish entry - once reached, piece is finished
    if (pos === 0 && dist >= 10) {
      return [{ pos: -2, dist: dist + 1, pathStart: null }];
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

  const getPossibleFinalPositions = (piece: Piece, spinValue: number) => {
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
      // Center: choose towards Bottom-Left (5) or Bottom-Right (10) as requested
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
      kickedCount: { A: 0, B: 0 },
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
      if (p.isFinished && !p.animationPath && finishedPieceId !== p.id) return;
      if (!posGroups[p.position]) posGroups[p.position] = [];
      posGroups[p.position].push(p);
    });

    const elements: React.ReactNode[] = [];

    Object.entries(posGroups).forEach(([posStr, pieces]) => {
      const pos = parseInt(posStr);
      const isHome = pos === -1;
      
      if (isHome) {
        pieces.forEach(p => {
          if (p.animationPath) {
            const homeCoord = HOME_POSITIONS[p.owner][p.id % 4];
            elements.push(
              <PieceVisual 
                key={p.id} 
                piece={p} 
                coord={{ x: homeCoord.x, y: homeCoord.y }} 
                onClick={() => {}}
                isKicked={kickedPieceId === p.id}
                isAngry={angryPieceIds.includes(p.id)}
              />
            );
          }
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
          isFinished={pieces[0].isFinished || finishedPieceId === pieces[0].id}
          isKicking={pieces.some(p => showKickEffect === p.id)}
          isAngry={pieces.some(p => angryPieceIds.includes(p.id))}
          canMove={game.bankedSpins.length > 0 && game.currentPlayer === owner && !game.selectedPieceId && !game.isSpinning}
        />
      );
    });

    // Render possible moves
    possibleMoves.forEach((move, i) => {
      const isFinish = move.pos === -2;
      const coord = isFinish 
        ? { x: BOARD_NODES[0].x - 10, y: BOARD_NODES[0].y } // Position left of START node
        : (BOARD_NODES[move.pos] || { x: 50, y: 50 });
      
      elements.push(
        <motion.div
          key={`move-target-${i}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.8 }}
          whileHover={{ scale: 1.1, opacity: 1 }}
          style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
          className={`absolute w-10 h-10 -ml-5 -mt-5 rounded-full border-2 border-white shadow-lg cursor-pointer z-50 flex items-center justify-center pointer-events-auto
            ${isFinish ? 'bg-gradient-to-br from-yellow-300 to-orange-400 animate-pulse' : 'bg-yellow-400'}
          `}
          onClick={(e) => {
            e.stopPropagation();
            if (game.selectedPieceId !== null) {
              executeMove(game.selectedPieceId, move.pos, move.dist);
            }
          }}
        >
          <div className="flex flex-col items-center">
            {isFinish && <Sparkles size={12} className="text-stone-900 mb-0.5" />}
            <span className="text-[10px] font-bold text-stone-900 leading-none">{isFinish ? 'FINISH' : 'GO'}</span>
          </div>
        </motion.div>
      );
    });

    return elements;
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-4 font-sans text-stone-800 overflow-y-auto overflow-x-hidden">
      {/* Instructions Modal */}
      <AnimatePresence>
        {showInstructions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setShowInstructions(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-xs w-full text-center shadow-2xl border-4 border-stone-800 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowInstructions(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-stone-100 rounded-full text-stone-500 hover:bg-stone-200 transition-colors"
              >
                ✕
              </button>
              
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <DinoIcon color="#3b82f6" size={32} />
              </div>
              
              <h3 className="text-xl font-black text-stone-800 mb-4">遊戲玩法</h3>
              
              <div className="space-y-4 text-left">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-stone-800 text-white flex items-center justify-center text-xs font-bold shrink-0">1</div>
                  <p className="text-sm font-bold text-stone-600">點擊轉盤決定步數 (1-5 步)。</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-stone-800 text-white flex items-center justify-center text-xs font-bold shrink-0">2</div>
                  <p className="text-sm font-bold text-stone-600">轉到 <span className="text-blue-500 font-black">4</span> 或 <span className="text-blue-500 font-black">5</span> 可以獲得額外一次轉盤機會！</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-stone-800 text-white flex items-center justify-center text-xs font-bold shrink-0">3</div>
                  <p className="text-sm font-bold text-stone-600">踩到對手的棋子會將其踢回起點。</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-stone-800 text-white flex items-center justify-center text-xs font-bold shrink-0">4</div>
                  <p className="text-sm font-bold text-stone-600">最先讓 4 隻恐龍抵達終點的玩家獲勝。</p>
                </div>
              </div>
              
              <button
                onClick={() => setShowInstructions(false)}
                className="mt-8 w-full py-3 bg-stone-800 text-white font-black rounded-xl hover:bg-stone-700 transition-colors shadow-lg"
              >
                知道了！
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border-4 border-stone-900 relative overflow-hidden"
            >
              {/* Confetti-like particles */}
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: 100, x: 0, opacity: 1 }}
                  animate={{ 
                    y: -200, 
                    x: (i - 6) * 40, 
                    opacity: 0,
                    rotate: 360
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    delay: i * 0.1,
                    ease: "easeOut"
                  }}
                  className="absolute bottom-0 left-1/2 w-3 h-3 rounded-full"
                  style={{ 
                    backgroundColor: ['#3b82f6', '#ef4444', '#fbbf24', '#10b981'][i % 4] 
                  }}
                />
              ))}

              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 bg-yellow-400 rounded-full flex items-center justify-center border-4 border-stone-900 shadow-lg">
                  <Trophy size={40} className="text-stone-900" />
                </div>
                <motion.div 
                  animate={{ y: [0, -10, 0], rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute -bottom-2 -right-2 w-12 h-12 bg-white rounded-xl border-2 border-stone-900 shadow-md flex items-center justify-center"
                >
                  <DinoIcon color={game.winner === 'A' ? '#3b82f6' : '#ef4444'} size={32} />
                </motion.div>
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
      <div className="w-full max-w-md flex justify-between items-stretch mb-4 gap-4">
        {/* Player B Info */}
        <div className={`flex-1 flex flex-col items-center p-3 rounded-2xl shadow-sm border transition-all ${game.currentPlayer === 'B' ? 'bg-red-50 border-red-300 ring-2 ring-red-200' : 'bg-white border-stone-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <DinoIcon color="#ef4444" size={20} />
            <span className="font-black text-red-700">玩家 B</span>
          </div>
          <div className="text-[11px] font-bold text-red-600 bg-red-100/50 px-2 py-1 rounded-lg w-full text-center mb-3">
            被踢 {game.kickedCount.B} 次 | {game.stepsCount.B} 步
          </div>
          <div className="flex flex-wrap justify-center gap-2 min-h-[36px]">
            {game.pieces.filter(p => p.owner === 'B' && p.position === -1).map(p => (
              <motion.div 
                key={p.id} 
                layoutId={`piece-${p.id}`}
                className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center border-2 border-red-200 cursor-pointer relative"
                onClick={() => handlePieceClick(p.id)}
                whileHover={{ scale: 1.1 }}
              >
                <DinoIcon color="#ef4444" size={20} />
                {angryPieceIds.includes(p.id) && (
                  <motion.span 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    className="absolute -top-2 -right-2 text-lg"
                  >
                    😡
                  </motion.span>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Player A Info */}
        <div className={`flex-1 flex flex-col items-center p-3 rounded-2xl shadow-sm border transition-all ${game.currentPlayer === 'A' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' : 'bg-white border-stone-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <DinoIcon color="#3b82f6" size={20} />
            <span className="font-black text-blue-700">玩家 A</span>
          </div>
          <div className="text-[11px] font-bold text-blue-600 bg-blue-100/50 px-2 py-1 rounded-lg w-full text-center mb-3">
            被踢 {game.kickedCount.A} 次 | {game.stepsCount.A} 步
          </div>
          <div className="flex flex-wrap justify-center gap-2 min-h-[36px]">
            {game.pieces.filter(p => p.owner === 'A' && p.position === -1).map(p => (
              <motion.div 
                key={p.id} 
                layoutId={`piece-${p.id}`}
                className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center border-2 border-blue-200 cursor-pointer relative"
                onClick={() => handlePieceClick(p.id)}
                whileHover={{ scale: 1.1 }}
              >
                <DinoIcon color="#3b82f6" size={20} />
                {angryPieceIds.includes(p.id) && (
                  <motion.span 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    className="absolute -top-2 -right-2 text-lg"
                  >
                    😡
                  </motion.span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Finish Zone - Horizontal Middle */}
      <div className="w-full max-w-[500px] mb-4 bg-stone-100/50 rounded-2xl border-2 border-stone-800 p-3 flex items-center gap-4 shadow-sm relative overflow-hidden">
        <div className="flex flex-col border-r-2 border-stone-200 pr-4">
          <div className="text-xl font-black text-stone-800 uppercase tracking-[0.1em] mb-1">FINISH</div>
          <div className="flex items-center gap-2">
            <Trophy size={14} className="text-yellow-600" />
            <span className="text-[10px] font-bold text-stone-400 italic">抵達終點</span>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <AnimatePresence>
            {game.finishedPieces.map((owner, i) => (
              <motion.div
                key={`finished-${i}`}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="w-10 h-10 rounded-xl border-2 border-white shadow-sm flex-shrink-0 bg-white flex items-center justify-center"
              >
                <DinoIcon color={owner === 'A' ? '#3b82f6' : '#ef4444'} size={24} />
              </motion.div>
            ))}
          </AnimatePresence>
          {game.finishedPieces.length === 0 && (
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest opacity-30">等待抵達...</div>
          )}
        </div>
      </div>

      {/* Board Container */}
      <div className="relative w-full max-w-[500px] aspect-square bg-white rounded-3xl shadow-xl border-4 border-stone-800 mt-4">
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
      </div>

      {/* Spinner & Instructions Wrapper */}
      <div className="relative z-[150] flex flex-row items-end justify-center gap-8 md:gap-16 mt-8">
        {/* Left Column: BANK + Instructions */}
        <div className="flex flex-col items-center gap-4 w-[250px]">
          {/* Banked Spins Area - Half Board Width */}
          <div className="w-full bg-stone-100/80 backdrop-blur-sm rounded-2xl border-2 border-dashed border-stone-300 p-3 flex flex-col items-center gap-2">
            <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest">BANKED SPINS</div>
            <div className="flex flex-wrap justify-center gap-2 min-h-[40px] items-center">
              <AnimatePresence>
                {game.bankedSpins.map((val, i) => (
                  <motion.button
                    key={`banked-${i}-${val}`}
                    initial={{ scale: 0, y: 10 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0, y: 10 }}
                    onClick={() => setGame(prev => ({ ...prev, selectedSpinIndex: i, status: 'moving' }))}
                    className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center font-black shadow-sm transition-all
                      ${game.selectedSpinIndex === i 
                        ? 'bg-yellow-400 border-stone-900 text-stone-900 scale-110 z-10' 
                        : 'bg-white border-stone-200 text-stone-400 hover:border-stone-400'}
                    `}
                  >
                    {val}
                  </motion.button>
                ))}
              </AnimatePresence>
              {game.bankedSpins.length === 0 && (
                <div className="text-[9px] font-bold text-stone-300 italic">SPIN TO BANK MOVES</div>
              )}
            </div>
          </div>

          {/* Instructions Button */}
          <div className="flex flex-col items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowInstructions(true)}
              className="bg-white/90 backdrop-blur-md px-6 py-2 rounded-full border-2 border-stone-800 shadow-md text-stone-800 font-black text-sm flex items-center gap-2 hover:bg-white transition-colors w-full justify-center"
            >
              <span className="text-lg">💡</span> 遊戲玩法
            </motion.button>
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">HOW TO PLAY</div>
          </div>
        </div>

        {/* Right Column: Spinner Area */}
        <div className="w-40 h-40 flex items-center justify-center">
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
                <div className="text-3xl drop-shadow-sm scale-x-[0.8] scale-y-[0.6]">▼</div>
              </motion.div>

              {/* Spinner Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSpin}
                disabled={game.isSpinning || !!game.winner || game.remainingSpins === 0}
                className={`w-24 h-24 rounded-full border-[8px] flex items-center justify-center text-3xl font-black shadow-2xl transition-all relative z-10
                  ${showRainbow ? 'animate-[rainbow_2s_linear_infinite] border-white text-white' : ''}
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
    </div>
  );
}

interface PieceVisualProps {
  piece: Piece;
  coord: { x: number; y: number };
  stackSize?: number;
  onClick: () => void;
  isKicked?: boolean;
  isKicking?: boolean;
  isFinished?: boolean;
  isAngry?: boolean;
  canMove?: boolean;
  key?: React.Key;
}

function PieceVisual({ piece, coord, stackSize = 1, onClick, isKicked, isKicking, isFinished, isAngry, canMove }: PieceVisualProps) {
  const left = piece.animationPath ? piece.animationPath.map(p => `${p.x}%`) : `${coord.x}%`;
  const top = piece.animationPath ? piece.animationPath.map(p => `${p.y}%`) : `${coord.y}%`;

  return (
    <motion.div
      layout
      initial={false}
      animate={{ 
        left, 
        top,
        scale: isKicked ? [1, 2.5, 1] : isFinished ? [1, 1.5, 0] : 1,
        opacity: isFinished ? 0 : 1,
        rotate: isKicked ? [0, 720, 1440] : 0,
      }}
      transition={{ 
        type: piece.animationPath ? 'tween' : 'spring',
        duration: piece.animationPath ? (isKicked ? 0.8 : piece.animationPath.length * 0.2) : 0.5,
        ease: "easeInOut",
        stiffness: 400, 
        damping: 25,
        mass: 0.8,
      }}
      style={{ zIndex: piece.animationPath ? 100 : 10 }}
      className={`absolute w-[54px] h-[54px] -ml-[27px] -mt-[27px] rounded-2xl border-2 border-white shadow-lg flex items-center justify-center cursor-pointer pointer-events-auto bg-white
        ${canMove ? 'ring-4 ring-yellow-400 ring-offset-2 animate-pulse' : ''}
      `}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <AnimatePresence>
        {isKicking && (
          <motion.div
            initial={{ y: 0, opacity: 0, scale: 0 }}
            animate={{ y: -50, opacity: 1, scale: 1.5 }}
            exit={{ opacity: 0 }}
            className="absolute z-50 pointer-events-none whitespace-nowrap"
          >
            <div className="bg-red-600 text-white font-black text-sm px-3 py-1 rounded border-2 border-white shadow-lg rotate-12 flex items-center gap-1">
              <span>KICK</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DinoIcon color={piece.owner === 'A' ? '#3b82f6' : '#ef4444'} size={36} />

      {isAngry && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-4 -right-4 text-2xl"
        >
          😡
        </motion.div>
      )}

      {stackSize > 1 && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center text-xs font-black text-stone-900 border-2 border-stone-200">
          {stackSize}
        </div>
      )}
      {isFinished && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-yellow-500">
          <Sparkles size={24} className="animate-bounce" />
        </div>
      )}
    </motion.div>
  );
}
