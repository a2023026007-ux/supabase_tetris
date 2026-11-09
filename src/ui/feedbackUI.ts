import { $, el, formatDateTime, openDialog, setBusy, setMsg } from './dom';
import { getAuth, onAuth } from '../api/auth';
import { createFeedback, deleteFeedback, fetchFeedback, type FeedbackRow } from '../api/feedback';
import { isConfigured } from '../api/supabase';
import { isRlsError, koError } from '../api/errors';
import { openLogin, openSignup } from './authUI';
import { storageGet, storageSet } from '../util/storage';

const MAX_LEN = 500;
const COOLDOWN_MS = 30_000;

const dlg = $<HTMLDialogElement>('#dlg-feedback');
const formArea = $('#fb-form-area');
const list = $('#fb-list');

let rows: FeedbackRow[] = [];

const cooldownKey = (userId: string) => `blockdrop.feedback.last.${userId}`;

function remainingCooldown(userId: string): number {
  const last = Number(storageGet(cooldownKey(userId)) ?? 0);
  return Math.max(0, COOLDOWN_MS - (Date.now() - last));
}

function buildForm(): HTMLFormElement {
  const stars = [5, 4, 3, 2, 1].flatMap((n) => [
    el('input', { type: 'radio', name: 'rating', id: `fb-r${n}`, value: n }),
    el('label', { for: `fb-r${n}`, title: `${n}점`, text: '★' }),
  ]);
  const textarea = el('textarea', { name: 'content', maxlength: MAX_LEN, rows: 4, placeholder: '게임에 대한 의견을 자유롭게 남겨 주세요.', 'aria-label': '피드백 내용' });
  const counter = el('span', { class: 'counter', text: `0 / ${MAX_LEN}` });
  textarea.addEventListener('input', () => {
    counter.textContent = `${textarea.value.length} / ${MAX_LEN}`;
  });

  const form = el(
    'form',
    { class: 'form', novalidate: true },
    el('fieldset', { class: 'rating' }, el('legend', { text: '별점' }), ...stars),
    textarea,
    counter,
    el('p', { class: 'form-msg', role: 'alert' }),
    el('button', { class: 'btn primary', type: 'submit', text: '피드백 남기기' }),
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = getAuth().userId;
    if (!userId) return setMsg(form, '로그인이 필요합니다.', 'error');
    const fd = new FormData(form);
    const rating = Number(fd.get('rating') ?? 0);
    const content = String(fd.get('content') ?? '').trim();
    if (rating < 1 || rating > 5) return setMsg(form, '별점을 선택해 주세요.', 'error');
    if (!content) return setMsg(form, '내용을 입력해 주세요.', 'error');
    if (content.length > MAX_LEN) return setMsg(form, `내용은 ${MAX_LEN}자 이하로 입력해 주세요.`, 'error');
    const wait = remainingCooldown(userId);
    if (wait > 0) return setMsg(form, `${Math.ceil(wait / 1000)}초 후에 다시 작성할 수 있습니다.`, 'error');

    const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    setBusy(btn, true, '등록 중…');
    try {
      const row = await createFeedback(rating, content);
      storageSet(cooldownKey(userId), String(Date.now()));
      rows = [row, ...rows.filter((r) => r.id !== row.id)];
      renderList();
      form.reset();
      counter.textContent = `0 / ${MAX_LEN}`;
      setMsg(form, '피드백을 등록했습니다. 감사합니다!', 'ok');
    } catch (err) {
      setMsg(form, isRlsError(err) ? '피드백은 30초에 한 번만 작성할 수 있습니다.' : koError(err), 'error');
    } finally {
      setBusy(btn, false);
    }
  });
  return form;
}

function renderForm(): void {
  if (!isConfigured) {
    formArea.replaceChildren(el('p', { class: 'muted', text: '온라인 기능이 설정되지 않아 피드백을 쓸 수 없습니다.' }));
    return;
  }
  if (!getAuth().userId) {
    formArea.replaceChildren(
      el(
        'div',
        { class: 'login-prompt' },
        el('p', { text: '피드백을 남기려면 로그인해 주세요.' }),
        el(
          'div',
          { class: 'row' },
          el('button', { class: 'btn primary', type: 'button', text: '로그인', onclick: openLogin }),
          el('button', { class: 'btn', type: 'button', text: '회원가입', onclick: openSignup }),
        ),
      ),
    );
    return;
  }
  formArea.replaceChildren(buildForm());
}

function renderList(): void {
  if (rows.length === 0) {
    list.replaceChildren(el('li', { class: 'fb-empty', text: '아직 피드백이 없습니다. 첫 피드백을 남겨 주세요!' }));
    return;
  }
  const myId = getAuth().userId;
  list.replaceChildren(
    ...rows.map((r) =>
      el(
        'li',
        { class: 'fb-item' },
        el(
          'div',
          { class: 'fb-meta' },
          el('strong', { text: r.username }),
          el('span', { class: 'fb-stars', 'aria-label': `${r.rating}점`, text: '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating) }),
          el('span', { text: formatDateTime(r.created_at) }),
          el('span', { class: 'spacer' }),
          r.user_id === myId
            ? el('button', { class: 'btn small ghost danger-text', type: 'button', text: '삭제', onclick: () => void remove(r.id) })
            : null,
        ),
        el('p', { class: 'fb-content', text: r.content }),
      ),
    ),
  );
}

async function remove(id: number): Promise<void> {
  if (!confirm('이 피드백을 삭제할까요?')) return;
  try {
    await deleteFeedback(id);
    rows = rows.filter((r) => r.id !== id);
    renderList();
  } catch (err) {
    alert(koError(err));
  }
}

export async function openFeedback(): Promise<void> {
  openDialog(dlg);
  renderForm();
  if (!isConfigured) {
    list.replaceChildren();
    return;
  }
  list.replaceChildren(el('li', { class: 'fb-empty', text: '불러오는 중…' }));
  try {
    rows = await fetchFeedback(20);
    renderList();
  } catch (err) {
    list.replaceChildren(el('li', { class: 'fb-empty error', text: koError(err) }));
  }
}

export function initFeedbackUI(): void {
  onAuth(() => {
    if (!dlg.open) return;
    renderForm();
    renderList();
  });
}
