export type Action =
  | 'left'
  | 'right'
  | 'softDrop'
  | 'hardDrop'
  | 'rotateCW'
  | 'rotateCCW'
  | 'hold'
  | 'pause'
  | 'mute';

const KEYMAP: Record<string, Action> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowDown: 'softDrop',
  Space: 'hardDrop',
  ArrowUp: 'rotateCW',
  KeyX: 'rotateCW',
  KeyZ: 'rotateCCW',
  KeyC: 'hold',
  KeyP: 'pause',
  Escape: 'pause',
  KeyM: 'mute',
};

/** 누르고 있으면 반복되는 동작: 첫 반복까지 지연(first), 이후 간격(every) */
const REPEAT: Partial<Record<Action, { first: number; every: number }>> = {
  left: { first: 170, every: 50 },
  right: { first: 170, every: 50 },
  softDrop: { first: 50, every: 50 },
};

export class Input {
  private timers = new Map<Action, number>();

  constructor(
    private readonly onAction: (action: Action) => void,
    private readonly enabled: () => boolean,
  ) {}

  attach(): void {
    window.addEventListener('keydown', (e) => {
      const action = KEYMAP[e.code];
      if (!action || !this.enabled()) return;
      e.preventDefault();
      if (e.repeat) return;
      this.press(action);
    });
    window.addEventListener('keyup', (e) => {
      const action = KEYMAP[e.code];
      if (action) this.release(action);
    });
    window.addEventListener('blur', () => this.clear());
  }

  press(action: Action): void {
    const repeat = REPEAT[action];
    if (repeat) {
      if (this.timers.has(action)) return;
      if (action === 'left') this.timers.delete('right');
      if (action === 'right') this.timers.delete('left');
      this.timers.set(action, repeat.first);
    }
    this.onAction(action);
  }

  release(action: Action): void {
    this.timers.delete(action);
  }

  clear(): void {
    this.timers.clear();
  }

  update(dt: number): void {
    for (const [action, remaining] of this.timers) {
      const repeat = REPEAT[action]!;
      let t = remaining - dt;
      while (t <= 0) {
        this.onAction(action);
        t += repeat.every;
      }
      if (this.timers.has(action)) this.timers.set(action, t);
    }
  }
}
