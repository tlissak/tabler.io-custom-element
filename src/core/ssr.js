export function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function safeDefine(tag, klass) {
  if (!isBrowser()) return;

  if (!customElements.get(tag)) {
    customElements.define(tag, klass);
  }
}
