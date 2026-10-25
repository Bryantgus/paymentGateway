import { $ } from './dom.js';

export function showMessage(text: string, kind: '' | 'ok' | 'error' = ''): void {
  const el = $('mensaje');
  el.textContent = text;
  el.className = kind;
}
