/** localStorage는 사생활 보호 모드 등에서 예외가 날 수 있어 항상 감싸서 쓴다 */
export function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function storageSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* 저장 실패는 무시 */
  }
}
