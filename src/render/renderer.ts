import { COLS, HIDDEN, ROWS, VISIBLE_ROWS } from '../game/board';
import { COLORS, getShape, type PieceType } from '../game/pieces';
import type { Game } from '../game/game';

const CELL = 30;
const BOARD_W = COLS * CELL;
const BOARD_H = VISIBLE_ROWS * CELL;
const NEXT_W = 120;
const NEXT_H = 250;
const HOLD_W = 120;
const HOLD_H = 96;

function setupCanvas(canvas: HTMLCanvasElement, w: number, h: number): CanvasRenderingContext2D {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D를 사용할 수 없습니다.');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

/** 블록 한 칸: 밝은 위/왼쪽 테두리와 어두운 아래/오른쪽 테두리로 입체감을 준다 */
function drawCell(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
  const p = 1;
  const inner = s - p * 2;
  const b = Math.max(2, Math.round(s * 0.12));
  ctx.fillStyle = color;
  ctx.fillRect(x + p, y + p, inner, inner);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x + p, y + p, inner, b);
  ctx.fillRect(x + p, y + p, b, inner);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x + p, y + s - p - b, inner, b);
  ctx.fillRect(x + s - p - b, y + p, b, inner);
}

function drawMini(ctx: CanvasRenderingContext2D, type: PieceType, cx: number, cy: number, cell: number): void {
  const shape = getShape(type, 0);
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  shape.forEach((row, r) =>
    row.forEach((v, c) => {
      if (!v) return;
      minR = Math.min(minR, r);
      maxR = Math.max(maxR, r);
      minC = Math.min(minC, c);
      maxC = Math.max(maxC, c);
    }),
  );
  const ox = cx - ((maxC - minC + 1) * cell) / 2;
  const oy = cy - ((maxR - minR + 1) * cell) / 2;
  shape.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v) drawCell(ctx, ox + (c - minC) * cell, oy + (r - minR) * cell, cell, COLORS[type]);
    }),
  );
}

export class Renderer {
  private readonly board: CanvasRenderingContext2D;
  private readonly next: CanvasRenderingContext2D;
  private readonly hold: CanvasRenderingContext2D;

  constructor(board: HTMLCanvasElement, next: HTMLCanvasElement, hold: HTMLCanvasElement) {
    this.board = setupCanvas(board, BOARD_W, BOARD_H);
    this.next = setupCanvas(next, NEXT_W, NEXT_H);
    this.hold = setupCanvas(hold, HOLD_W, HOLD_H);
  }

  draw(game: Game): void {
    this.drawBoard(game);
    this.drawNext(game);
    this.drawHold(game);
  }

  private drawBoard(game: Game): void {
    const ctx = this.board;
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, BOARD_W, BOARD_H);

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 1; c < COLS; c++) {
      ctx.moveTo(c * CELL + 0.5, 0);
      ctx.lineTo(c * CELL + 0.5, BOARD_H);
    }
    for (let r = 1; r < VISIBLE_ROWS; r++) {
      ctx.moveTo(0, r * CELL + 0.5);
      ctx.lineTo(BOARD_W, r * CELL + 0.5);
    }
    ctx.stroke();

    const over = game.status === 'over';
    const grid = game.board.grid;
    for (let r = HIDDEN; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = grid[r][c];
        if (cell) drawCell(ctx, c * CELL, (r - HIDDEN) * CELL, CELL, over ? '#4b5563' : COLORS[cell]);
      }
    }

    // 현재 블록 (고스트 피스는 그리지 않는다)
    const cur = game.current;
    if (cur && game.status !== 'idle') {
      const shape = getShape(cur.type, cur.rot);
      shape.forEach((row, r) =>
        row.forEach((v, c) => {
          const gy = cur.y + r;
          if (v && gy >= HIDDEN) {
            drawCell(ctx, (cur.x + c) * CELL, (gy - HIDDEN) * CELL, CELL, over ? '#6b7280' : COLORS[cur.type]);
          }
        }),
      );
    }
  }

  private drawNext(game: Game): void {
    const ctx = this.next;
    ctx.clearRect(0, 0, NEXT_W, NEXT_H);
    if (game.status === 'idle') return;
    game.queue.slice(0, 3).forEach((type, i) => {
      drawMini(ctx, type, NEXT_W / 2, 42 + i * 82, i === 0 ? 22 : 18);
    });
  }

  private drawHold(game: Game): void {
    const ctx = this.hold;
    ctx.clearRect(0, 0, HOLD_W, HOLD_H);
    if (!game.hold || game.status === 'idle') return;
    ctx.globalAlpha = game.canHold ? 1 : 0.35;
    drawMini(ctx, game.hold, HOLD_W / 2, HOLD_H / 2, 22);
    ctx.globalAlpha = 1;
  }
}
