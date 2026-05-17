import { Component } from '../../core/component.js';

const stylesheetUrl = new URL('./tblr-copy-button.css', import.meta.url);
const placements = new Set(['top', 'right', 'bottom', 'left']);

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

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

class TblrCopyButton extends HTMLElement {
  static observedAttributes = [
    'value',
    'from',
    'disabled',
    'copy-label',
    'success-label',
    'error-label',
    'feedback-duration',
    'tooltip-placement',
    'no-fallback',
  ];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.feedbackTimer = 0;
    this.state = 'copy';
    this.handleClick = this.handleClick.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    window.clearTimeout(this.feedbackTimer);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;

    this.render();
  }

  get value() {
    return this.getAttribute('value') ?? '';
  }

  set value(value) {
    this.setAttribute('value', value ?? '');
  }

  get disabled() {
    return this.hasAttribute('disabled');
  }

  set disabled(value) {
    if (value) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }

  async copy() {
    if (this.disabled) return;

    try {
      const value = this.getCopyValue();

      if (!value) {
        throw new Error('No value to copy.');
      }

      await this.writeText(value);
      this.showFeedback('success');
      this.dispatchEvent(new CustomEvent('copy', {
        bubbles: true,
        composed: true,
        detail: { value },
      }));
    } catch (error) {
      this.showFeedback('error');
      this.dispatchEvent(new CustomEvent('error', {
        bubbles: true,
        composed: true,
        detail: { error },
      }));
    }
  }

  render() {
    const placement = safeToken(this.getAttribute('tooltip-placement') ?? 'top', 'top', placements);

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">

      <span part="base" class="copy-button tooltip-${placement}" data-state="${this.state}">
        <button
          part="button"
          class="button"
          type="button"
          aria-label="${escapeHtml(this.currentLabel)}"
          ${this.disabled ? 'disabled' : ''}
        >
          <span part="copy-icon" class="icon icon-copy">
            <slot name="copy-icon">${this.copyIcon}</slot>
          </span>
          <span part="success-icon" class="icon icon-success">
            <slot name="success-icon">${this.successIcon}</slot>
          </span>
          <span part="error-icon" class="icon icon-error">
            <slot name="error-icon">${this.errorIcon}</slot>
          </span>
        </button>
        <span part="tooltip" class="tooltip" role="tooltip">${escapeHtml(this.currentLabel)}</span>
      </span>
    `;

    this.root.querySelector('.button')?.addEventListener('click', this.handleClick);
  }

  handleClick() {
    this.copy();
  }

  getCopyValue() {
    const from = this.getAttribute('from');

    if (!from) return this.value;

    const attributeMatch = from.match(/^(.+)\[([^\]]+)]$/);

    if (attributeMatch) {
      const [, id, attribute] = attributeMatch;
      const target = document.getElementById(id);

      return target?.getAttribute(attribute) ?? '';
    }

    const propertyMatch = from.match(/^(.+)\.([A-Za-z_$][\w$]*)$/);

    if (propertyMatch) {
      const [, id, property] = propertyMatch;
      const target = document.getElementById(id);

      return this.stringifyValue(target?.[property]);
    }

    return document.getElementById(from)?.textContent ?? '';
  }

  stringifyValue(value) {
    if (value == null) return '';

    return Array.isArray(value) ? value.join(',') : String(value);
  }

  async writeText(value) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    if (this.hasAttribute('no-fallback')) {
      throw new Error('Clipboard API is not available.');
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();

    const copied = document.execCommand('copy');
    textarea.remove();

    if (!copied) {
      throw new Error('Clipboard copy failed.');
    }
  }

  showFeedback(state) {
    window.clearTimeout(this.feedbackTimer);
    this.state = state;
    this.render();

    this.feedbackTimer = window.setTimeout(() => {
      this.state = 'copy';
      this.render();
    }, positiveInteger(this.getAttribute('feedback-duration'), 1000));
  }

  get currentLabel() {
    if (this.state === 'success') {
      return this.getAttribute('success-label') ?? 'Copied';
    }

    if (this.state === 'error') {
      return this.getAttribute('error-label') ?? 'Copy failed';
    }

    return this.getAttribute('copy-label') ?? 'Copy';
  }

  get copyIcon() {
    return `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="8" y="8" width="12" height="12" rx="2"></rect>
        <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path>
      </svg>
    `;
  }

  get successIcon() {
    return `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20 6 9 17l-5-5"></path>
      </svg>
    `;
  }

  get errorIcon() {
    return `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M18 6 6 18"></path>
        <path d="m6 6 12 12"></path>
      </svg>
    `;
  }
}

Component({
  tag: 'tblr-copy-button',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrCopyButton);

export { TblrCopyButton };
