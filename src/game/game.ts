import { Board, COLS, HIDDEN } from './board';
import { Bag, getShape, type PieceType } from './pieces';
import { getKicks } from './rotation';

export type GameStatus = 'idle' | 'playing' | 'paused' | 'over';
export type GameEvent =
  | 'move'
  | 'rotate'
  | 'hold'
  | 'harddrop'
  | 'lock'
  | 'clear'
  | 'tetris'
  | 'levelup'
  | 'gameover';

export interface ActivePiece {
  type: PieceType;
  rot: number;
  x: number;
  y: number;
}

export interface GameResult {
  score: number;
  level: number;
  lines: number;
}

const LOCK_DELAY = 500;
const MAX_LOCK_RESETS = 15;
const PREVIEW_COUNT = 3;
const LINE_SCORES = [0, 100, 300, 500, 800];

export class Game {
  readonly board = new Board();
  status: GameStatus = 'idle';
  current: ActivePiece | null = null;
  queue: PieceType[] = [];
  hold: PieceType | null = null;
  canHold = true;
  score = 0;
  level = 1;
  lines = 0;

  onEvent: (event: GameEvent, value?: number) => void = () => {};
  onGameOver: (result: GameResult) => void = () => {};

  private bag = new Bag();
  private gravityAcc = 0;
  private lockTimer = 0;
  private lockResets = 0;

  start(): void {
    this.board.reset();
    this.bag = new Bag();
    this.queue = [];
    this.fillQueue();
    this.hold = null;
    this.canHold = true;
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.status = 'playing';
    this.spawn();
  }

  quit(): void {
    this.status = 'idle';
    this.current = null;
  }

  pause(): void {
    if (this.status === 'playing') this.status = 'paused';
  }

  resume(): void {
    if (this.status === 'paused') this.status = 'playing';
  }

  /** 낙하 간격(ms): 레벨 1은 1000ms, 레벨마다 15% 빨라지고 최소 100ms */
  get gravityInterval(): number {
    return Math.max(100, 1000 * Math.pow(0.85, this.level - 1));
  }

  moveLeft(): void {
    this.shift(-1);
  }

  moveRight(): void {
    this.shift(1);
  }

  rotate(dir: 1 | -1): void {
    const cur = this.current;
    if (this.status !== 'playing' || !cur) return;
    const to = (cur.rot + dir + 4) % 4;
    for (const [kx, ky] of getKicks(cur.type, cur.rot, to)) {
      const candidate = { ...cur, rot: to, x: cur.x + kx, y: cur.y + ky };
      if (this.fits(candidate)) {
        this.current = candidate;
        this.onEvent('rotate');
        this.afterManipulation();
        return;
      }
    }
  }

  softDrop(): void {
    if (this.status !== 'playing') return;
    if (this.tryMove(0, 1)) {
      this.score += 1;
      this.gravityAcc = 0;
    }
  }

  hardDrop(): void {
    if (this.status !== 'playing' || !this.current) return;
    let distance = 0;
    while (this.tryMove(0, 1)) distance++;
    this.score += distance * 2;
    this.onEvent('harddrop');
    this.lock(true);
  }

  holdPiece(): void {
    const cur = this.current;
    if (this.status !== 'playing' || !cur || !this.canHold) return;
    const previous = this.hold;
    this.hold = cur.type;
    this.canHold = false;
    this.onEvent('hold');
    this.spawn(previous ?? undefined);
  }

  update(dt: number): void {
    if (this.status !== 'playing' || !this.current) return;

    if (this.isOnGround()) {
      this.gravityAcc = 0;
      this.lockTimer += dt;
      if (this.lockTimer >= LOCK_DELAY) this.lock();
      return;
    }

    this.lockTimer = 0;
    this.gravityAcc += dt;
    const interval = this.gravityInterval;
    while (this.gravityAcc >= interval) {
      this.gravityAcc -= interval;
      if (!this.tryMove(0, 1)) {
        this.gravityAcc = 0;
        break;
      }
    }
  }

  private shift(dx: number): void {
    if (this.status !== 'playing') return;
    if (this.tryMove(dx, 0)) {
      this.onEvent('move');
      this.afterManipulation();
    }
  }

  private fits(p: ActivePiece): boolean {
    return !this.board.collides(getShape(p.type, p.rot), p.x, p.y);
  }

  private tryMove(dx: number, dy: number): boolean {
    const cur = this.current;
    if (!cur) return false;
    const next = { ...cur, x: cur.x + dx, y: cur.y + dy };
    if (!this.fits(next)) return false;
    this.current = next;
    return true;
  }

  private isOnGround(): boolean {
    const cur = this.current;
    return !!cur && !this.fits({ ...cur, y: cur.y + 1 });
  }

  /** 바닥에 닿은 상태에서 움직이면 고정 대기 시간을 다시 준다 (최대 15회) */
  private afterManipulation(): void {
    if (this.isOnGround() && this.lockResets < MAX_LOCK_RESETS) {
      this.lockTimer = 0;
      this.lockResets++;
    }
  }

  private fillQueue(): void {
    while (this.queue.length < PREVIEW_COUNT) this.queue.push(this.bag.next());
  }

  private spawn(type?: PieceType): void {
    const t = type ?? this.queue.shift()!;
    this.fillQueue();
    const size = getShape(t, 0).length;
    const piece: ActivePiece = { type: t, rot: 0, x: Math.floor((COLS - size) / 2), y: HIDDEN - 1 };
    this.gravityAcc = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.current = piece;
    if (!this.fits(piece)) this.endGame();
  }

  private lock(hard = false): void {
    const cur = this.current;
    if (!cur) return;
    const visible = this.board.merge(getShape(cur.type, cur.rot), cur.x, cur.y, cur.type);
    this.current = null;
    if (!hard) this.onEvent('lock');
    if (!visible) {
      this.endGame();
      return;
    }

    const cleared = this.board.clearLines();
    if (cleared > 0) {
      this.score += LINE_SCORES[cleared] * this.level;
      this.lines += cleared;
      this.onEvent(cleared === 4 ? 'tetris' : 'clear', cleared);
      const newLevel = Math.floor(this.lines / 10) + 1;
      if (newLevel > this.level) {
        this.level = newLevel;
        this.onEvent('levelup', newLevel);
      }
    }

    this.canHold = true;
    this.spawn();
  }

  private endGame(): void {
    this.status = 'over';
    this.onEvent('gameover');
    this.onGameOver({ score: this.score, level: this.level, lines: this.lines });
  }
}
