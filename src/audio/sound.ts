import { storageGet, storageSet } from '../util/storage';

export type SfxName =
  | 'move'
  | 'rotate'
  | 'hold'
  | 'harddrop'
  | 'lock'
  | 'clear'
  | 'tetris'
  | 'levelup'
  | 'gameover'
  | 'start';

export interface SoundSettings {
  bgmOn: boolean;
  bgmVolume: number; // 0~1
  sfxOn: boolean;
  sfxVolume: number; // 0~1
  muted: boolean;
}

const STORAGE_KEY = 'blockdrop.sound';
const DEFAULTS: SoundSettings = { bgmOn: true, bgmVolume: 0.5, sfxOn: true, sfxVolume: 0.7, muted: false };

function loadSettings(): SoundSettings {
  try {
    const raw = storageGet(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<SoundSettings>) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

// ---- 배경음악: 직접 작곡한 8마디 루프 (A단조, 8분음표 64개, 0 = 쉼표) ----
// prettier-ignore
const MELODY = [
  69, 0, 72, 74, 76, 0, 74, 72,
  74, 0, 76, 79, 76, 74, 72, 0,
  72, 0, 74, 76, 77, 76, 74, 72,
  71, 0, 67, 71, 74, 0, 0, 0,
  76, 0, 79, 81, 79, 76, 74, 0,
  77, 0, 76, 74, 72, 74, 76, 0,
  74, 72, 71, 72, 74, 76, 72, 71,
  69, 0, 0, 0, 69, 0, 0, 0,
];
// 마디별 베이스 근음: Am - C - F - G - Am - F - E - Am
const BASS = [45, 48, 41, 43, 45, 41, 40, 45];

interface ToneOptions {
  type?: OscillatorType;
  vol?: number;
  slideTo?: number;
  dest?: AudioNode;
}

class SoundManager {
  settings: SoundSettings = loadSettings();

  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private bgmTimer: number | null = null;
  private step = 0;
  private nextTime = 0;
  private bpm = 132;

  /** 사용자 동작(클릭/키 입력) 안에서 호출해야 소리가 난다 (자동재생 정책) */
  unlock(): void {
    if (!this.ctx) {
      const AC: typeof AudioContext | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.bgmGain = ctx.createGain();
      this.sfxGain = ctx.createGain();
      this.bgmGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.master.connect(ctx.destination);

      const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buffer;
      this.applySettings();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  update(partial: Partial<SoundSettings>): void {
    this.settings = { ...this.settings, ...partial };
    storageSet(STORAGE_KEY, JSON.stringify(this.settings));
    this.applySettings();
  }

  toggleMute(): boolean {
    this.update({ muted: !this.settings.muted });
    return this.settings.muted;
  }

  private applySettings(): void {
    if (!this.master || !this.bgmGain || !this.sfxGain) return;
    const s = this.settings;
    this.master.gain.value = s.muted ? 0 : 1;
    this.bgmGain.gain.value = s.bgmOn ? s.bgmVolume * 0.6 : 0;
    this.sfxGain.gain.value = s.sfxOn ? s.sfxVolume : 0;
  }

  private tone(freq: number, start: number, dur: number, opts: ToneOptions = {}): void {
    const ctx = this.ctx;
    const dest = opts.dest ?? this.sfxGain;
    if (!ctx || !dest) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type ?? 'square';
    osc.frequency.setValueAtTime(freq, start);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, start + dur);
    const vol = opts.vol ?? 0.2;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain).connect(dest);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  private noise(start: number, dur: number, vol: number, freq: number, dest: AudioNode | null): void {
    const ctx = this.ctx;
    if (!ctx || !dest || !this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(filter).connect(gain).connect(dest);
    src.start(start);
    src.stop(start + dur + 0.02);
  }

  play(name: SfxName, value = 0): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    switch (name) {
      case 'move':
        this.tone(300, t, 0.04, { vol: 0.06 });
        break;
      case 'rotate':
        this.tone(480, t, 0.06, { vol: 0.07, slideTo: 720 });
        break;
      case 'hold':
        this.tone(660, t, 0.07, { type: 'triangle', vol: 0.18 });
        this.tone(880, t + 0.05, 0.08, { type: 'triangle', vol: 0.18 });
        break;
      case 'harddrop':
        this.tone(180, t, 0.16, { type: 'triangle', vol: 0.4, slideTo: 50 });
        this.noise(t, 0.09, 0.25, 900, this.sfxGain);
        break;
      case 'lock':
        this.tone(140, t, 0.07, { type: 'triangle', vol: 0.28, slideTo: 90 });
        break;
      case 'clear': {
        const notes = [523, 659, 784, 988];
        for (let i = 0; i <= Math.min(value, 3); i++) this.tone(notes[i], t + i * 0.06, 0.14, { vol: 0.1 });
        break;
      }
      case 'tetris': {
        const notes = [523, 659, 784, 1047, 1319];
        notes.forEach((f, i) => this.tone(f, t + i * 0.06, 0.16, { vol: 0.11 }));
        this.tone(1047, t + 0.32, 0.4, { type: 'triangle', vol: 0.2 });
        break;
      }
      case 'levelup':
        [440, 554, 659, 880].forEach((f, i) => this.tone(f, t + i * 0.08, 0.14, { type: 'triangle', vol: 0.22 }));
        break;
      case 'gameover':
        [392, 330, 262, 196].forEach((f, i) =>
          this.tone(f, t + i * 0.2, 0.3, { vol: 0.12, slideTo: f * 0.94 }),
        );
        break;
      case 'start':
        this.tone(523, t, 0.08, { vol: 0.1 });
        this.tone(784, t + 0.08, 0.12, { vol: 0.1 });
        break;
    }
  }

  // ---- BGM 스케줄러 (조금 앞서 예약해 끊김 없이 재생) ----
  setLevel(level: number): void {
    this.bpm = Math.min(180, 132 + (level - 1) * 4);
  }

  startBgm(): void {
    this.stopBgm();
    this.resumeBgm();
  }

  resumeBgm(): void {
    if (!this.ctx || this.bgmTimer !== null) return;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.bgmTimer = window.setInterval(() => this.schedule(), 25);
  }

  pauseBgm(): void {
    if (this.bgmTimer !== null) window.clearInterval(this.bgmTimer);
    this.bgmTimer = null;
  }

  stopBgm(): void {
    this.pauseBgm();
    this.step = 0;
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const stepDur = 60 / this.bpm / 2;
    while (this.nextTime < ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextTime, stepDur);
      this.step = (this.step + 1) % MELODY.length;
      this.nextTime += stepDur;
    }
  }

  private playStep(i: number, t: number, d: number): void {
    const dest = this.bgmGain;
    if (!dest) return;
    const note = MELODY[i];
    if (note) this.tone(midi(note), t, d * 0.9, { vol: 0.12, dest });
    const root = BASS[Math.floor(i / 8)];
    this.tone(midi(i % 2 === 0 ? root : root + 12), t, d * 0.8, { type: 'triangle', vol: 0.22, dest });
    if (i % 2 === 1) this.noise(t, 0.03, 0.05, 8000, dest);
  }
}

export const sound = new SoundManager();
