import { Component } from '../../core/component.js';

const stylesheetUrl = new URL('./tblr-switch.css', import.meta.url);

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

class TblrSwitch extends HTMLElement {
  static observedAttributes = ['name', 'value', 'label', 'checked', 'disabled', 'inline', 'align-end'];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.reflectingChecked = false;
    this.handleChange = this.handleChange.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;
    if (name === 'checked' && this.reflectingChecked) return;

    this.render();
  }

  get checked() {
    return this.root.querySelector('input')?.checked ?? this.hasAttribute('checked');
  }

  set checked(value) {
    this.toggleAttribute('checked', Boolean(value));
    const input = this.root.querySelector('input');
    if (input) input.checked = Boolean(value);
  }

  focus(options) {
    this.root.querySelector('input')?.focus(options);
  }

  render() {
    const label = this.getAttribute('label') ?? this.textContent.trim();
    const disabled = this.hasAttribute('disabled');

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">
      <label part="switch" class="switch">
        <input
          part="input"
          class="input"
          type="checkbox"
          role="switch"
          name="${escapeHtml(this.getAttribute('name') ?? '')}"
          value="${escapeHtml(this.getAttribute('value') ?? 'on')}"
          ${this.hasAttribute('checked') ? 'checked' : ''}
          ${disabled ? 'disabled' : ''}
        >
        <span part="track" class="track"><span part="thumb" class="thumb"></span></span>
        ${label ? `<span part="label" class="label">${escapeHtml(label)}</span>` : ''}
      </label>
    `;

    this.root.querySelector('input').addEventListener('change', this.handleChange);
  }

  handleChange(event) {
    this.reflectingChecked = true;
    this.toggleAttribute('checked', event.target.checked);
    this.reflectingChecked = false;

    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }
}

Component({
  tag: 'tblr-switch',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrSwitch);

export { TblrSwitch };
