import { NodeCoord } from './types';

// Coordinates are in percentages (0-100) relative to the board container
// 6x6 Grid, Step = 20% (from 0 to 5)
const P = 12; // Padding
const S = 76; // Scale
const step = S / 5;

const getCoord = (gridX: number, gridY: number) => ({
  x: P + gridX * step,
  y: P + gridY * step,
});

export const BOARD_NODES: Record<number, NodeCoord> = {
  // Outer Loop (20 nodes) - Counter-Clockwise from Bottom-Right
  0: { ...getCoord(5, 5), type: 'square' }, // START (BR)
  1: { ...getCoord(5, 4), type: 'circle' },
  2: { ...getCoord(5, 3), type: 'circle' },
  3: { ...getCoord(5, 2), type: 'circle' },
  4: { ...getCoord(5, 1), type: 'circle' },
  5: { ...getCoord(5, 0), type: 'square' }, // Corner (TR)
  6: { ...getCoord(4, 0), type: 'circle' },
  7: { ...getCoord(3, 0), type: 'circle' },
  8: { ...getCoord(2, 0), type: 'circle' },
  9: { ...getCoord(1, 0), type: 'circle' },
  10: { ...getCoord(0, 0), type: 'square' }, // Corner (TL)
  11: { ...getCoord(0, 1), type: 'circle' },
  12: { ...getCoord(0, 2), type: 'circle' },
  13: { ...getCoord(0, 3), type: 'circle' },
  14: { ...getCoord(0, 4), type: 'circle' },
  15: { ...getCoord(0, 5), type: 'square' }, // Corner (BL)
  16: { ...getCoord(1, 5), type: 'circle' },
  17: { ...getCoord(2, 5), type: 'circle' },
  18: { ...getCoord(3, 5), type: 'circle' },
  19: { ...getCoord(4, 5), type: 'circle' },

  // Diagonals (7 nodes total including corners and center)
  // TR (5) to BL (15)
  21: { ...getCoord(4.16, 0.83), type: 'circle' },
  22: { ...getCoord(3.33, 1.66), type: 'circle' },
  23: { ...getCoord(2.5, 2.5), type: 'square' }, // CENTER - Larger
  24: { ...getCoord(1.66, 3.33), type: 'circle' },
  25: { ...getCoord(0.83, 4.16), type: 'circle' },
  
  // TL (10) to BR (0)
  26: { ...getCoord(0.83, 0.83), type: 'circle' },
  27: { ...getCoord(1.66, 1.66), type: 'circle' },
  // 23 is center
  28: { ...getCoord(3.33, 3.33), type: 'circle' },
  29: { ...getCoord(4.16, 4.16), type: 'circle' },
};

// Diagonal paths (shortcuts)
export const SHORTCUTS: Record<number, number[]> = {
  5: [21, 22, 23, 24, 25, 15], // TR to BL
  10: [26, 27, 23, 28, 29, 0], // TL to BR
  15: [25, 24, 23, 22, 21, 5], // BL to TR
  0: [29, 28, 23, 27, 26, 10], // BR to TL
};

export const HOME_POSITIONS = {
  A: [
    { x: 65, y: -35 },
    { x: 73, y: -35 },
    { x: 81, y: -35 },
    { x: 89, y: -35 },
  ],
  B: [
    { x: 11, y: -35 },
    { x: 19, y: -35 },
    { x: 27, y: -35 },
    { x: 35, y: -35 },
  ],
};
