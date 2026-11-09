/** Supabase 오류를 사용자에게 보여줄 한국어 문장으로 바꾼다 */
export function koError(err: unknown): string {
  const e = err as { message?: string; code?: string } | null;
  const msg = e?.message ?? String(err);
  const code = e?.code;

  if (/Invalid login credentials/i.test(msg)) return '이메일 또는 비밀번호가 올바르지 않습니다.';
  if (/Email not confirmed/i.test(msg)) return '이메일 인증이 아직 끝나지 않았습니다. 메일함의 인증 링크를 눌러 주세요.';
  if (/User already registered/i.test(msg)) return '이미 가입된 이메일입니다.';
  if (/Database error saving new user/i.test(msg)) return '이미 사용 중인 아이디이거나 아이디 형식이 올바르지 않습니다.';
  if (/Password should be at least/i.test(msg)) return '비밀번호는 8자 이상이어야 합니다.';
  if (/should be different from the old password/i.test(msg)) return '이전과 다른 비밀번호를 입력해 주세요.';
  if (/rate limit|too many requests/i.test(msg)) return '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.';
  if (/Unable to validate email address|invalid format/i.test(msg)) return '이메일 형식이 올바르지 않습니다.';
  if (code === '42501' || /row-level security/i.test(msg)) return '권한이 없거나 너무 자주 요청했습니다. 잠시 후 다시 시도해 주세요.';
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해 주세요.';
  if (/JWT expired|session/i.test(msg)) return '로그인이 만료되었습니다. 다시 로그인해 주세요.';
  return `오류가 발생했습니다: ${msg}`;
}

export function isRlsError(err: unknown): boolean {
  const e = err as { message?: string; code?: string } | null;
  return e?.code === '42501' || /row-level security/i.test(e?.message ?? '');
}
