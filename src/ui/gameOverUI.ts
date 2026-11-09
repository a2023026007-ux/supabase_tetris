import { $, el, openDialog } from './dom';
import { getAuth, onAuth } from '../api/auth';
import { saveScore } from '../api/scores';
import { isConfigured } from '../api/supabase';
import { koError } from '../api/errors';
import type { GameResult } from '../game/game';
import { openLogin, openSignup } from './authUI';
import { openLeaderboard } from './leaderboardUI';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface Pending extends GameResult {
  state: SaveState;
  error?: string;
}

const dlg = $<HTMLDialogElement>('#dlg-gameover');
const saveBox = $('#go-save');

/** 결과 창이 열려 있는 동안의 게임 결과. 창을 닫으면 버린다. */
let pending: Pending | null = null;

function render(): void {
  const p = pending;
  if (!p) return;
  const auth = getAuth();

  if (!isConfigured) {
    saveBox.replaceChildren(el('p', { class: 'muted', text: '온라인 기능이 설정되지 않아 점수를 저장할 수 없습니다.' }));
    return;
  }
  if (p.state === 'saving') {
    saveBox.replaceChildren(el('p', { class: 'muted', text: '점수를 저장하는 중…' }));
    return;
  }
  if (p.state === 'saved') {
    saveBox.replaceChildren(el('p', { class: 'ok', text: `✅ ${auth.username ?? '내'} 계정으로 점수를 저장했습니다.` }));
    return;
  }
  if (p.state === 'error') {
    saveBox.replaceChildren(
      el('p', { class: 'error', text: p.error ?? '점수 저장에 실패했습니다.' }),
      el('button', { class: 'btn primary', type: 'button', text: '다시 시도', onclick: () => void save() }),
    );
    return;
  }
  // idle: 로그인하지 않은 상태
  saveBox.replaceChildren(
    el('p', { text: '로그인하면 이 점수를 저장할 수 있습니다.' }),
    el(
      'div',
      { class: 'row' },
      el('button', { class: 'btn primary', type: 'button', text: '로그인', onclick: openLogin }),
      el('button', { class: 'btn', type: 'button', text: '회원가입', onclick: openSignup }),
    ),
    el('p', { class: 'muted small', text: '결과 창을 닫으면 이 점수는 저장되지 않습니다.' }),
  );
}

async function save(): Promise<void> {
  const p = pending;
  if (!p || p.state === 'saving' || p.state === 'saved' || !getAuth().userId) return;
  p.state = 'saving';
  render();
  try {
    await saveScore({ score: p.score, level: p.level, lines: p.lines });
    p.state = 'saved';
  } catch (err) {
    p.state = 'error';
    p.error = koError(err);
  }
  if (pending === p) render();
}

export function showGameOver(result: GameResult): void {
  pending = { ...result, state: 'idle' };
  $('#go-score').textContent = result.score.toLocaleString();
  $('#go-level').textContent = String(result.level);
  $('#go-lines').textContent = String(result.lines);
  render();
  openDialog(dlg);
  if (isConfigured && getAuth().userId) void save();
}

export function initGameOverUI(onRetry: () => void): void {
  dlg.addEventListener('close', () => {
    pending = null;
  });
  $('#go-close').addEventListener('click', () => dlg.close());
  $('#go-retry').addEventListener('click', () => {
    dlg.close();
    onRetry();
  });
  $('#go-leaderboard').addEventListener('click', () => void openLeaderboard());

  // 결과 창이 열린 상태에서 로그인하면 방금 끝난 게임의 점수를 저장한다
  onAuth((s) => {
    if (!pending || !dlg.open) return;
    if (s.userId && pending.state === 'idle') void save();
    else render();
  });
}
