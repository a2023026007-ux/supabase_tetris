import { sb } from './supabase';

/** DB의 CHECK 제약과 같은 규칙: 3~12자, 영문/숫자/한글/밑줄 */
export const USERNAME_RE = /^[A-Za-z0-9_가-힣]{3,12}$/;

/** 대소문자를 구분하지 않고 아이디 중복 여부를 확인한다 */
export async function isUsernameTaken(username: string): Promise<boolean> {
  const pattern = username.replace(/[\\%_]/g, (m) => `\\${m}`);
  const { data, error } = await sb().from('profiles').select('id').ilike('username', pattern).limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
