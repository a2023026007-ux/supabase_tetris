import './styles.css';
import { Game } from './game/game';
import { Input, type Action } from './game/input';
import { Renderer } from './render/renderer';
import { sound } from './audio/sound';
import { getAuth, initAuth, onAuth } from './api/auth';
import { isConfigured } from './api/supabase';
import { $, anyDialogOpen, setBeforeDialogOpen } from './ui/dom';
import { initAuthUI } from './ui/authUI';
import { openLeaderboard } from './ui/leaderboardUI';
import { initFeedbackUI, openFeedback } from './ui/feedbackUI';
import { initSettingsUI, openSettings, refreshMuteButton } from './ui/settingsUI';
import { initGameOverUI, showGameOver } from './ui/gameOverUI';

const game = new Game();
const renderer = new Renderer($('#board'), $('#next'), $('#hold'));

const overlay = $('#overlay');
const screenStart = $('#screen-start');
const screenPause = $('#screen-pause');
const startBtn = $<HTMLButtonElement>('#btn-start');
const startHint = $('#start-hint');
const statScore = $('#stat-score');
const statLevel = $('#stat-level');
const statLines = $('#stat-lines');

// ---------- 화면 전환 ----------
function showScreen(name: 'start' | 'pause' | null): void {
  overlay.hidden = name === null;
  screenStart.hidden = name !== 'start';
  screenPause.hidden = name !== 'pause';
}

function blurActive(): void {
  (document.activeElement as HTMLElement | null)?.blur?.();
}

function startGame(): void {
  sound.unlock();
  input.clear();
  game.start();
  sound.setLevel(1);
  sound.play('start');
  sound.startBgm();
  showScreen(null);
  blurActive();
}

function pauseGame(): void {
  if (game.status !== 'playing') return;
  game.pause();
  input.clear();
  sound.pauseBgm();
  showScreen('pause');
}

function resumeGame(): void {
  if (game.status !== 'paused' || anyDialogOpen()) return;
  sound.unlock();
  game.resume();
  sound.resumeBgm();
  showScreen(null);
  blurActive();
}

function quitGame(): void {
  game.quit();
  sound.stopBgm();
  startBtn.textContent = '게임 시작';
  showScreen('start');
}

// ---------- 게임 이벤트 → 효과음 ----------
game.onEvent = (event, value = 0) => {
  switch (event) {
    case 'move':
      sound.play('move');
      break;
    case 'rotate':
      sound.play('rotate');
      break;
    case 'hold':
      sound.play('hold');
      break;
    case 'harddrop':
      sound.play('harddrop');
      break;
    case 'lock':
      sound.play('lock');
      break;
    case 'clear':
      sound.play('clear', value);
      break;
    case 'tetris':
      sound.play('tetris');
      break;
    case 'levelup':
      sound.play('levelup');
      sound.setLevel(value);
      break;
    case 'gameover':
      break;
  }
};

game.onGameOver = (result) => {
  input.clear();
  sound.stopBgm();
  sound.play('gameover');
  startBtn.textContent = '다시 하기';
  showScreen('start');
  // 마지막 장면을 잠깐 보여준 뒤 결과 창을 띄운다
  window.setTimeout(() => showGameOver(result), 600);
};

// ---------- 입력 ----------
function handleAction(action: Action): void {
  if (action === 'mute') {
    sound.unlock();
    sound.toggleMute();
    refreshMuteButton();
    return;
  }
  if (action === 'pause') {
    if (game.status === 'playing') pauseGame();
    else if (game.status === 'paused') resumeGame();
    return;
  }
  if (game.status !== 'playing') return;
  switch (action) {
    case 'left':
      game.moveLeft();
      break;
    case 'right':
      game.moveRight();
      break;
    case 'softDrop':
      game.softDrop();
      break;
    case 'hardDrop':
      game.hardDrop();
      break;
    case 'rotateCW':
      game.rotate(1);
      break;
    case 'rotateCCW':
      game.rotate(-1);
      break;
    case 'hold':
      game.holdPiece();
      break;
  }
}

function isTyping(): boolean {
  const a = document.activeElement;
  return a instanceof HTMLInputElement || a instanceof HTMLTextAreaElement || a instanceof HTMLSelectElement;
}

const input = new Input(handleAction, () => !anyDialogOpen() && !isTyping());
input.attach();

// 터치 버튼: 누르는 동안 이동/소프트 드롭 반복
document.querySelectorAll<HTMLButtonElement>('#touch-controls [data-action]').forEach((btn) => {
  const action = btn.dataset.action as Action;
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    btn.setPointerCapture(e.pointerId);
    sound.unlock();
    input.press(action);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    btn.addEventListener(type, () => input.release(action));
  }
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
});

// ---------- 버튼 ----------
startBtn.addEventListener('click', startGame);
$('#btn-resume').addEventListener('click', resumeGame);
$('#btn-quit').addEventListener('click', quitGame);
$('#btn-leaderboard').addEventListener('click', () => void openLeaderboard());
$('#btn-feedback').addEventListener('click', () => void openFeedback());
$('#btn-settings').addEventListener('click', openSettings);

// 대화상자를 열면 게임을 일시정지한다
setBeforeDialogOpen(pauseGame);
// 다른 탭으로 가거나 창이 포커스를 잃으면 일시정지
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseGame();
});
window.addEventListener('blur', pauseGame);

// ---------- 시작 화면 안내 ----------
function updateStartHint(): void {
  const { userId, username } = getAuth();
  if (!isConfigured) startHint.textContent = '온라인 기능(점수 저장, 피드백)이 꺼져 있습니다.';
  else if (userId) startHint.textContent = `${username ?? ''}님, 환영합니다! 게임이 끝나면 점수가 자동 저장됩니다.`;
  else startHint.textContent = '로그인하면 점수가 리더보드에 저장됩니다.';
}

// ---------- 초기화 ----------
initSettingsUI();
initAuthUI();
initFeedbackUI();
initGameOverUI(startGame);
onAuth(updateStartHint);
updateStartHint();
initAuth();
showScreen('start');

// ---------- 게임 루프 ----------
let last = performance.now();
let shown = { score: -1, level: -1, lines: -1 };

function frame(now: number): void {
  const dt = Math.min(100, now - last);
  last = now;
  input.update(dt);
  game.update(dt);
  renderer.draw(game);

  if (game.score !== shown.score || game.level !== shown.level || game.lines !== shown.lines) {
    shown = { score: game.score, level: game.level, lines: game.lines };
    statScore.textContent = game.score.toLocaleString();
    statLevel.textContent = String(game.level);
    statLines.textContent = String(game.lines);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
