
export type Player = 'A' | 'B';

export interface Piece {
  id: number;
  owner: Player;
  position: number; // -1 for home, 0-19 for outer loop, 20+ for diagonals
  distanceTraveled: number; // 0 to 20
  isFinished: boolean;
  pathStart?: number | null; // Track which shortcut the piece is on
}

export interface GameState {
  pieces: Piece[];
  currentPlayer: Player;
  remainingSpins: number;
  bankedSpins: number[];
  selectedSpinIndex: number | null;
  status: 'spinning' | 'moving' | 'finished';
  winner: Player | null;
  stepsCount: { A: number; B: number };
  isSpinning: boolean;
  message: string;
  selectedPieceId: number | null;
  finishedPieces: Player[]; // Global order of arrival
}

export interface NodeCoord {
  x: number;
  y: number;
  type: 'square' | 'circle';
}
