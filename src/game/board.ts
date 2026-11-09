import type { PieceType } from './pieces';

export const COLS = 10;
export const VISIBLE_ROWS = 20;
/** 화면 위에 숨겨진 생성 공간 */
export const HIDDEN = 2;
export const ROWS = VISIBLE_ROWS + HIDDEN;

export type Cell = PieceType | null;

const emptyRow = (): Cell[] => Array<Cell>(COLS).fill(null);

export class Board {
  grid: Cell[][] = [];

  constructor() {
    this.reset();
  }

  reset(): void {
    this.grid = Array.from({ length: ROWS }, emptyRow);
  }

  collides(shape: number[][], x: number, y: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const gx = x + c;
        const gy = y + r;
        if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
        if (gy >= 0 && this.grid[gy][gx]) return true;
      }
    }
    return false;
  }

  /** 블록을 보드에 고정한다. 보이는 영역에 한 칸이라도 걸치면 true */
  merge(shape: number[][], x: number, y: number, type: PieceType): boolean {
    let visible = false;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const gy = y + r;
        if (gy >= 0) this.grid[gy][x + c] = type;
        if (gy >= HIDDEN) visible = true;
      }
    }
    return visible;
  }

  /** 꽉 찬 줄을 지우고 지운 줄 수를 돌려준다 */
  clearLines(): number {
    const kept = this.grid.filter((row) => row.some((cell) => cell === null));
    const cleared = ROWS - kept.length;
    while (kept.length < ROWS) kept.unshift(emptyRow());
    this.grid = kept;
    return cleared;
  }
}
