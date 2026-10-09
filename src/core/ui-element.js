// Shared lifecycle for UI elements: keep the shadow tree and focused controls stable.
export class UIElement extends HTMLElement {
  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    if (!this.mounted) {
      this.mount();
      this.mounted = true;
    }
    this.update();
  }

  attributeChangedCallback() {
    if (this.mounted) this.update();
  }

  template(url, html) {
    this.root.innerHTML = `<link rel="stylesheet" href="${url}">${html}`;
  }

  setText(selector, value) {
    this.root.querySelector(selector).textContent = value ?? '';
  }

  emit(name, detail = {}) {
    return this.dispatchEvent(new CustomEvent(name, {
      detail, bubbles: true, composed: true, cancelable: true,
    }));
  }
}

export function booleanProperty(klass, property, attribute = property) {
  Object.defineProperty(klass.prototype, property, {
    get() { return this.hasAttribute(attribute) && this.getAttribute(attribute) !== 'false'; },
    set(value) { this.toggleAttribute(attribute, Boolean(value)); },
  });
}

export function stringProperty(klass, property, attribute = property, fallback = '') {
  Object.defineProperty(klass.prototype, property, {
    get() { return this.getAttribute(attribute) ?? fallback; },
    set(value) { this.setAttribute(attribute, String(value ?? '')); },
  });
}

export function safeUrl(value, protocols = ['http:', 'https:']) {
  if (!value) return '';
  try {
    const url = new URL(String(value), document.baseURI);
    return protocols.includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

export function readArray(element, attribute) {
  try {
    const value = JSON.parse(element.getAttribute(attribute) ?? '[]');
    return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : [];
  } catch { return []; }
}

export function appendText(parent, tag, text, className = '') {
  const element = document.createElement(tag);
  element.textContent = text ?? '';
  if (className) element.className = className;
  parent.append(element);
  return element;
}

export function appendTime(parent, timestamp) {
  if (!timestamp) return;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return;
  const time = appendText(parent, 'time', date.toLocaleString());
  time.dateTime = date.toISOString();
}
