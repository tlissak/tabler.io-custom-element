import { Component } from '../../core/component.js';

const stylesheetUrl = new URL('./tblr-button.css', import.meta.url);
const variants = new Set(['primary', 'secondary', 'success', 'warning', 'danger', 'info', 'dark', 'light']);
const appearances = new Set(['filled', 'outline', 'ghost']);
const sizes = new Set(['xs', 'sm', 'md', 'lg', 'xl']);
const states = new Set(['default', 'hover', 'focus', 'active']);

function safeToken(value, fallback, allowedValues) {
  return allowedValues.has(value) ? value : fallback;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

class TblrButton extends HTMLElement {
  static observedAttributes = ['variant', 'appearance', 'outline', 'size', 'type', 'disabled', 'square', 'icon-only', 'action', 'label', 'state'];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const variant = safeToken(this.getAttribute('variant') ?? 'primary', 'primary', variants);
    const appearance = this.hasAttribute('outline')
      ? 'outline'
      : safeToken(this.getAttribute('appearance') ?? 'filled', 'filled', appearances);
    const size = safeToken(this.getAttribute('size') ?? 'md', 'md', sizes);
    const type = this.getAttribute('type') ?? 'button';
    const disabled = this.hasAttribute('disabled');
    const label = this.getAttribute('label');
    const iconOnly = this.hasAttribute('icon-only') || this.hasAttribute('action');
    const action = this.hasAttribute('action');
    const state = safeToken(this.getAttribute('state') ?? 'default', 'default', states);

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">

      <button
        part="button"
        class="btn btn-${variant} btn-${appearance} btn-${size}${iconOnly ? ' btn-icon-only' : ''}${action ? ' btn-action' : ''}${action && state !== 'default' ? ` is-${state}` : ''}"
        type="${escapeHtml(type)}"
        ${label ? `aria-label="${escapeHtml(label)}"` : ''}
        ${disabled ? 'disabled' : ''}
      >
        <slot></slot>
      </button>
    `;
  }
}

Component({
  tag: 'tblr-button',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrButton);

export { TblrButton };
