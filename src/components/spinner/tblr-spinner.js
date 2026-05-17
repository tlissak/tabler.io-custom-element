import { Component } from '../../core/component.js';
import { badgeCssColor } from '../badge/badge-colors.js';

const stylesheetUrl = new URL('./tblr-spinner.css', import.meta.url);
const types = new Set(['border', 'grow', 'dots']);
const sizes = new Set(['sm', 'md', 'lg']);

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function safeToken(value, fallback, allowedValues) {
  return allowedValues.has(value) ? value : fallback;
}

function resolveSpinnerColor(value) {
  const color = String(value ?? 'current').trim().toLowerCase();

  if (color === 'current') return 'currentColor';
  if (color === 'muted') return 'var(--tblr-muted-color, #667382)';

  return badgeCssColor(color, 'currentColor');
}

class TblrSpinner extends HTMLElement {
  static observedAttributes = ['type', 'size', 'color', 'label'];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;

    this.render();
  }

  render() {
    const type = safeToken(this.getAttribute('type') ?? 'border', 'border', types);
    const size = safeToken(this.getAttribute('size') ?? 'md', 'md', sizes);
    const color = resolveSpinnerColor(this.getAttribute('color'));
    const label = this.getAttribute('label') ?? 'Loading';

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">

      <span
        part="spinner"
        class="spinner spinner-${type} spinner-${size}"
        style="--tblr-spinner-color: ${escapeHtml(color)}"
        role="status"
        aria-label="${escapeHtml(label)}"
      >
        ${type === 'dots' ? '<span></span><span></span><span></span>' : ''}
        <span class="visually-hidden">${escapeHtml(label)}</span>
      </span>
    `;
  }
}

Component({
  tag: 'tblr-spinner',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrSpinner);

export { TblrSpinner };
