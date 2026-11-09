import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { sb, supabase } from './supabase';

export interface AuthState {
  userId: string | null;
  email: string | null;
  username: string | null;
}

type Listener = (state: AuthState, event: AuthChangeEvent) => void;

let state: AuthState = { userId: null, email: null, username: null };
const listeners = new Set<Listener>();

export const getAuth = (): AuthState => state;

export function onAuth(fn: Listener): void {
  listeners.add(fn);
}

export function initAuth(): void {
  if (!supabase) return;
  supabase.auth.onAuthStateChange((event, session) => {
    // 콜백 안에서 Supabase 호출을 기다리면 교착될 수 있어 다음 틱으로 미룬다
    setTimeout(() => void handleChange(event, session), 0);
  });
}

async function handleChange(event: AuthChangeEvent, session: Session | null): Promise<void> {
  const user = session?.user ?? null;
  if (!user) {
    state = { userId: null, email: null, username: null };
  } else if (user.id !== state.userId || !state.username) {
    let username: string | null = null;
    try {
      username = await fetchUsername(user.id);
    } catch {
      /* 프로필 조회 실패 시 메타데이터 사용 */
    }
    username ??= (user.user_metadata?.username as string | undefined) ?? null;
    state = { userId: user.id, email: user.email ?? null, username };
  }
  listeners.forEach((fn) => fn(state, event));
}

async function fetchUsername(id: string): Promise<string | null> {
  const { data, error } = await sb().from('profiles').select('username').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data?.username as string | undefined) ?? null;
}

export async function signUp(username: string, email: string, password: string): Promise<{ needsConfirm: boolean }> {
  const { data, error } = await sb().auth.signUp({
    email,
    password,
    options: { data: { username }, emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
  // 이미 가입된 이메일이면 Supabase는 오류 대신 identities가 빈 사용자를 돌려준다
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    throw new Error('User already registered');
  }
  return { needsConfirm: !data.session };
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await sb().auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await sb().auth.signOut();
  if (error) throw error;
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await sb().auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  if (error) throw error;
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await sb().auth.updateUser({ password });
  if (error) throw error;
}
