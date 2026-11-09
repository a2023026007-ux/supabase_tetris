type Props = Record<string, unknown>;
type Child = Node | string | number | null | undefined | false;

/**
 * 작은 DOM 생성 도우미. 텍스트는 항상 textContent/텍스트 노드로 넣으므로
 * 사용자가 쓴 내용이 HTML로 해석되지 않는다 (XSS 방지).
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = String(value);
    else if (key === 'text') node.textContent = String(value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2), value as EventListener);
    } else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(typeof child === 'number' ? String(child) : child);
  }
  return node;
}

export function $<T extends HTMLElement = HTMLElement>(selector: string, root: ParentNode = document): T {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`요소를 찾을 수 없습니다: ${selector}`);
  return node;
}

let beforeOpen: () => void = () => {};

/** 대화상자를 열기 전에 실행할 동작(게임 일시정지)을 등록한다 */
export function setBeforeDialogOpen(fn: () => void): void {
  beforeOpen = fn;
}

export function openDialog(dialog: HTMLDialogElement): void {
  beforeOpen();
  if (!dialog.open) dialog.showModal();
}

export function anyDialogOpen(): boolean {
  return document.querySelector('dialog[open]') !== null;
}

export function setMsg(form: ParentNode, text: string, kind: 'ok' | 'error' | '' = ''): void {
  const msg = form.querySelector<HTMLElement>('.form-msg');
  if (!msg) return;
  msg.textContent = text;
  msg.className = `form-msg ${kind}`.trim();
}

export function setBusy(button: HTMLButtonElement, busy: boolean, busyText = '처리 중…'): void {
  if (busy) {
    button.dataset.label ??= button.textContent ?? '';
    button.textContent = busyText;
    button.disabled = true;
  } else {
    if (button.dataset.label !== undefined) button.textContent = button.dataset.label;
    button.disabled = false;
  }
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function statBox(label: string, value: string): HTMLDivElement {
  return el('div', {}, el('span', { text: label }), el('strong', { text: value }));
}
