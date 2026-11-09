import { $, el, formatDate, openDialog, statBox } from './dom';
import { getAuth } from '../api/auth';
import { fetchMyStats } from '../api/scores';
import { koError } from '../api/errors';

const dlg = $<HTMLDialogElement>('#dlg-mystats');
const title = $('#ms-title');
const body = $('#ms-body');

export async function openMyStats(): Promise<void> {
  const me = getAuth();
  title.textContent = me.username ? `${me.username}님의 기록` : '내 기록';
  body.replaceChildren(el('p', { class: 'muted', text: '불러오는 중…' }));
  openDialog(dlg);
  if (!me.userId) {
    body.replaceChildren(el('p', { class: 'muted', text: '로그인이 필요합니다.' }));
    return;
  }

  try {
    const s = await fetchMyStats(me.userId);
    const recent = s.recent.length
      ? el(
          'div',
          { class: 'table-wrap' },
          el(
            'table',
            { class: 'lb' },
            el(
              'thead',
              {},
              el('tr', {}, el('th', { text: '날짜' }), el('th', { class: 'num', text: '점수' }), el('th', { class: 'num', text: '레벨' }), el('th', { class: 'num', text: '줄' })),
            ),
            el(
              'tbody',
              {},
              ...s.recent.map((r) =>
                el(
                  'tr',
                  {},
                  el('td', { text: formatDate(r.created_at) }),
                  el('td', { class: 'num', text: r.score.toLocaleString() }),
                  el('td', { class: 'num', text: r.level }),
                  el('td', { class: 'num', text: r.lines }),
                ),
              ),
            ),
          ),
        )
      : el('p', { class: 'muted', text: '아직 저장된 기록이 없습니다. 로그인한 상태로 게임을 끝내면 자동으로 저장됩니다.' });

    body.replaceChildren(
      el(
        'div',
        { class: 'result-grid' },
        statBox('최고 점수', s.best ? s.best.score.toLocaleString() : '-'),
        statBox('전체 순위', s.rank ? `${s.rank}위` : '-'),
        statBox('플레이', `${s.games}회`),
      ),
      el('h3', { class: 'section-title', text: '최근 기록 10개' }),
      recent,
    );
  } catch (err) {
    body.replaceChildren(el('p', { class: 'error', text: koError(err) }));
  }
}
