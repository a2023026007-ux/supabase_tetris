import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// 새 Publishable key(sb_publishable_...)를 권장하고, 예전 anon key 이름도 받아 준다
const anonKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as
  | string
  | undefined;

/** 환경변수가 없으면 null: 게임은 그대로 플레이 가능하고 온라인 기능만 꺼진다 */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;
export const isConfigured = supabase !== null;

export function sb(): SupabaseClient {
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다.');
  return supabase;
}
