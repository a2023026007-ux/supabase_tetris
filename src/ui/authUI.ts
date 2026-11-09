import { $, el, openDialog, setBusy, setMsg } from './dom';
import {
  getAuth,
  onAuth,
  sendPasswordReset,
  signIn,
  signOut,
  signUp,
  updatePassword,
  type AuthState,
} from '../api/auth';
import { isUsernameTaken, USERNAME_RE } from '../api/profiles';
import { isConfigured } from '../api/supabase';
import { koError } from '../api/errors';
import { openMyStats } from './myStatsUI';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

const area = $('#auth-area');
const dlgLogin = $<HTMLDialogElement>('#dlg-login');
const dlgSignup = $<HTMLDialogElement>('#dlg-signup');
const dlgNewPw = $<HTMLDialogElement>('#dlg-newpw');
const formLogin = $<HTMLFormElement>('#form-login');
const formForgot = $<HTMLFormElement>('#form-forgot');
const formSignup = $<HTMLFormElement>('#form-signup');
const formNewPw = $<HTMLFormElement>('#form-newpw');
const signupDone = $('#signup-done');
const usernameStatus = $('#username-status');
const usernameInput = $<HTMLInputElement>('input[name="username"]', formSignup);

const field = (form: HTMLFormElement, name: string) => String(new FormData(form).get(name) ?? '').trim();
const submitButton = (form: HTMLFormElement) => $<HTMLButtonElement>('button[type="submit"]', form);

export function openLogin(): void {
  if (dlgSignup.open) dlgSignup.close();
  formLogin.reset();
  formForgot.reset();
  setMsg(formLogin, '');
  setMsg(formForgot, '');
  showLoginMode('login');
  openDialog(dlgLogin);
}

export function openSignup(): void {
  if (dlgLogin.open) dlgLogin.close();
  formSignup.reset();
  setMsg(formSignup, '');
  setUsernameStatus('3~12자, 영문·숫자·한글·밑줄(_)', '');
  formSignup.hidden = false;
  signupDone.hidden = true;
  openDialog(dlgSignup);
}

function showLoginMode(mode: 'login' | 'forgot'): void {
  formLogin.hidden = mode !== 'login';
  formForgot.hidden = mode !== 'forgot';
  $('#login-title').textContent = mode === 'login' ? '로그인' : '비밀번호 찾기';
}

function renderArea(s: AuthState): void {
  area.replaceChildren();
  if (!isConfigured) {
    area.append(el('span', { class: 'muted small', title: 'Supabase 환경변수가 설정되지 않았습니다', text: '오프라인 모드' }));
    return;
  }
  if (s.userId) {
    area.append(
      el(
        'span',
        { class: 'user-chip' },
        el('span', { class: 'avatar', 'aria-hidden': 'true', text: (s.username ?? '?').slice(0, 1).toUpperCase() }),
        el('strong', { text: s.username ?? '(아이디 없음)' }),
      ),
      el('button', { class: 'btn small', type: 'button', text: '내 기록', onclick: () => void openMyStats() }),
      el('button', {
        class: 'btn small ghost',
        type: 'button',
        text: '로그아웃',
        onclick: async () => {
          try {
            await signOut();
          } catch (err) {
            alert(koError(err));
          }
        },
      }),
    );
  } else {
    area.append(
      el('button', { class: 'btn small', type: 'button', text: '로그인', onclick: openLogin }),
      el('button', { class: 'btn small primary', type: 'button', text: '회원가입', onclick: openSignup }),
    );
  }
}

function setUsernameStatus(text: string, kind: 'ok' | 'error' | ''): void {
  usernameStatus.textContent = text;
  usernameStatus.className = `field-status ${kind}`.trim();
}

let checkSeq = 0;
let checkTimer: number | undefined;

function onUsernameInput(): void {
  const value = usernameInput.value.trim();
  const seq = ++checkSeq;
  window.clearTimeout(checkTimer);
  if (!value) return setUsernameStatus('3~12자, 영문·숫자·한글·밑줄(_)', '');
  if (!USERNAME_RE.test(value)) return setUsernameStatus('3~12자의 영문, 숫자, 한글, 밑줄(_)만 쓸 수 있습니다.', 'error');
  setUsernameStatus('중복 확인 중…', '');
  checkTimer = window.setTimeout(async () => {
    try {
      const taken = await isUsernameTaken(value);
      if (seq !== checkSeq) return;
      setUsernameStatus(taken ? '이미 사용 중인 아이디입니다.' : '사용할 수 있는 아이디입니다.', taken ? 'error' : 'ok');
    } catch {
      if (seq === checkSeq) setUsernameStatus('중복 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    }
  }, 400);
}

async function onLoginSubmit(e: SubmitEvent): Promise<void> {
  e.preventDefault();
  const email = field(formLogin, 'email');
  const password = String(new FormData(formLogin).get('password') ?? '');
  if (!EMAIL_RE.test(email)) return setMsg(formLogin, '이메일을 올바르게 입력해 주세요.', 'error');
  if (!password) return setMsg(formLogin, '비밀번호를 입력해 주세요.', 'error');

  const btn = submitButton(formLogin);
  setBusy(btn, true, '로그인 중…');
  setMsg(formLogin, '');
  try {
    await signIn(email, password);
    dlgLogin.close();
  } catch (err) {
    setMsg(formLogin, koError(err), 'error');
  } finally {
    setBusy(btn, false);
  }
}

async function onForgotSubmit(e: SubmitEvent): Promise<void> {
  e.preventDefault();
  const email = field(formForgot, 'email');
  if (!EMAIL_RE.test(email)) return setMsg(formForgot, '이메일을 올바르게 입력해 주세요.', 'error');
  const btn = submitButton(formForgot);
  setBusy(btn, true, '보내는 중…');
  try {
    await sendPasswordReset(email);
    setMsg(formForgot, '재설정 메일을 보냈습니다. 메일함을 확인해 주세요.', 'ok');
  } catch (err) {
    setMsg(formForgot, koError(err), 'error');
  } finally {
    setBusy(btn, false);
  }
}

async function onSignupSubmit(e: SubmitEvent): Promise<void> {
  e.preventDefault();
  const username = field(formSignup, 'username');
  const email = field(formSignup, 'email');
  const fd = new FormData(formSignup);
  const password = String(fd.get('password') ?? '');
  const password2 = String(fd.get('password2') ?? '');

  if (!USERNAME_RE.test(username)) return setMsg(formSignup, '아이디는 3~12자의 영문, 숫자, 한글, 밑줄(_)만 쓸 수 있습니다.', 'error');
  if (!EMAIL_RE.test(email)) return setMsg(formSignup, '이메일을 올바르게 입력해 주세요.', 'error');
  if (password.length < MIN_PASSWORD) return setMsg(formSignup, `비밀번호는 ${MIN_PASSWORD}자 이상이어야 합니다.`, 'error');
  if (password !== password2) return setMsg(formSignup, '비밀번호 확인이 일치하지 않습니다.', 'error');

  const btn = submitButton(formSignup);
  setBusy(btn, true, '가입 중…');
  setMsg(formSignup, '');
  try {
    if (await isUsernameTaken(username)) {
      setMsg(formSignup, '이미 사용 중인 아이디입니다.', 'error');
      return;
    }
    const { needsConfirm } = await signUp(username, email, password);
    if (needsConfirm) {
      $('#signup-done-email').textContent = email;
      formSignup.hidden = true;
      signupDone.hidden = false;
    } else {
      dlgSignup.close();
    }
  } catch (err) {
    setMsg(formSignup, koError(err), 'error');
  } finally {
    setBusy(btn, false);
  }
}

async function onNewPwSubmit(e: SubmitEvent): Promise<void> {
  e.preventDefault();
  const fd = new FormData(formNewPw);
  const password = String(fd.get('password') ?? '');
  const password2 = String(fd.get('password2') ?? '');
  if (password.length < MIN_PASSWORD) return setMsg(formNewPw, `비밀번호는 ${MIN_PASSWORD}자 이상이어야 합니다.`, 'error');
  if (password !== password2) return setMsg(formNewPw, '비밀번호 확인이 일치하지 않습니다.', 'error');

  const btn = submitButton(formNewPw);
  setBusy(btn, true, '변경 중…');
  try {
    await updatePassword(password);
    setMsg(formNewPw, '비밀번호를 변경했습니다.', 'ok');
    window.setTimeout(() => dlgNewPw.close(), 1200);
  } catch (err) {
    setMsg(formNewPw, koError(err), 'error');
  } finally {
    setBusy(btn, false);
  }
}

export function initAuthUI(): void {
  renderArea(getAuth());
  onAuth((s, event) => {
    renderArea(s);
    if (event === 'PASSWORD_RECOVERY') {
      formNewPw.reset();
      setMsg(formNewPw, '');
      openDialog(dlgNewPw);
    }
  });

  formLogin.addEventListener('submit', (e) => void onLoginSubmit(e));
  formForgot.addEventListener('submit', (e) => void onForgotSubmit(e));
  formSignup.addEventListener('submit', (e) => void onSignupSubmit(e));
  formNewPw.addEventListener('submit', (e) => void onNewPwSubmit(e));
  usernameInput.addEventListener('input', onUsernameInput);

  $('#link-forgot').addEventListener('click', () => {
    setMsg(formForgot, '');
    showLoginMode('forgot');
  });
  $('#link-back-login').addEventListener('click', () => showLoginMode('login'));
  $('#link-to-signup').addEventListener('click', openSignup);
  $('#link-to-login').addEventListener('click', openLogin);
}
