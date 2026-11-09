import { $, el, formatDate, openDialog } from './dom';
import { getAuth } from '../api/auth';
import { fetchLeaderboard, fetchMyStats } from '../api/scores';
import { isConfigured } from '../api/supabase';
import { koError } from '../api/errors';

const dlg = $<HTMLDialogElement>('#dlg-leaderboard');
const body = $('#lb-body');
const meLine = $('#lb-me');
const MEDALS = ['🥇', '🥈', '🥉'];

const messageRow = (text: string, cls = '') =>
  el('tr', {}, el('td', { class: `msg ${cls}`.trim(), colspan: 5, text }));

let loadSeq = 0;

export async function openLeaderboard(): Promise<void> {
  openDialog(dlg);
  meLine.textContent = '';
  if (!isConfigured) {
    body.replaceChildren(messageRow('온라인 기능이 설정되지 않아 리더보드를 볼 수 없습니다.'));
    return;
  }
  const seq = ++loadSeq;
  body.replaceChildren(messageRow('불러오는 중…'));

  try {
    const rows = await fetchLeaderboard(10);
    if (seq !== loadSeq) return;
    const myId = getAuth().userId;
    if (rows.length === 0) {
      body.replaceChildren(messageRow('아직 기록이 없습니다. 첫 기록의 주인공이 되어 보세요!'));
    } else {
      body.replaceChildren(
        ...rows.map((r, i) =>
          el(
            'tr',
            { class: r.user_id === myId ? 'me' : '' },
            el('td', { text: MEDALS[i] ?? String(i + 1) }),
            el('td', { text: r.username }),
            el('td', { class: 'num', text: r.score.toLocaleString() }),
            el('td', { class: 'num', text: r.level }),
            el('td', { text: formatDate(r.created_at) }),
          ),
        ),
      );
    }

    if (myId && !rows.some((r) => r.user_id === myId)) {
      const stats = await fetchMyStats(myId);
      if (seq !== loadSeq) return;
      meLine.textContent = stats.best
        ? `내 순위: ${stats.rank}위 · 최고 점수 ${stats.best.score.toLocaleString()}점`
        : '아직 저장된 내 기록이 없습니다.';
    } else if (!myId) {
      meLine.textContent = '로그인하면 내 점수가 리더보드에 올라갑니다.';
    }
  } catch (err) {
    if (seq === loadSeq) body.replaceChildren(messageRow(koError(err), 'error'));
  }
}
