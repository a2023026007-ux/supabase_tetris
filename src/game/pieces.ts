export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export const PIECE_TYPES: readonly PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export const COLORS: Record<PieceType, string> = {
  I: '#22d3ee',
  O: '#facc15',
  T: '#a855f7',
  S: '#22c55e',
  Z: '#ef4444',
  J: '#3b82f6',
  L: '#f97316',
};

type Matrix = number[][];

/** 회전 상태 0의 모양. I는 4x4, O는 2x2, 나머지는 3x3 (SRS 기준) */
const BASE_SHAPES: Record<PieceType, Matrix> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

function rotateCW(m: Matrix): Matrix {
  const n = m.length;
  return m.map((_, y) => m.map((__, x) => m[n - 1 - x][y]));
}

const ROTATIONS = {} as Record<PieceType, Matrix[]>;
for (const type of PIECE_TYPES) {
  const states: Matrix[] = [BASE_SHAPES[type]];
  for (let i = 1; i < 4; i++) states.push(rotateCW(states[i - 1]));
  ROTATIONS[type] = states;
}

export function getShape(type: PieceType, rotation: number): Matrix {
  return ROTATIONS[type][((rotation % 4) + 4) % 4];
}

/** 7-bag: 7종을 한 묶음으로 섞어 순서대로 내보낸다 */
export class Bag {
  private items: PieceType[] = [];

  next(): PieceType {
    if (this.items.length === 0) {
      this.items = [...PIECE_TYPES];
      for (let i = this.items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.items[i], this.items[j]] = [this.items[j], this.items[i]];
      }
    }
    return this.items.pop()!;
  }
}
