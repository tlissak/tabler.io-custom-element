import { Component } from '../../core/component.js';

const stylesheetUrl = new URL('./tblr-checkbox.css', import.meta.url);

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

class TblrCheckbox extends HTMLElement {
  static observedAttributes = ['name', 'value', 'label', 'description', 'checked', 'disabled', 'inline'];

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
    const description = this.getAttribute('description');
    const disabled = this.hasAttribute('disabled');

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">
      <label part="checkbox" class="checkbox">
        <input
          part="input"
          class="input"
          type="checkbox"
          name="${escapeHtml(this.getAttribute('name') ?? '')}"
          value="${escapeHtml(this.getAttribute('value') ?? label)}"
          ${this.hasAttribute('checked') ? 'checked' : ''}
          ${disabled ? 'disabled' : ''}
        >
        <span part="control" class="control">
          <svg class="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m5 12 5 5L20 7"></path>
          </svg>
        </span>
        <span part="content" class="content">
          <span part="label" class="label">${escapeHtml(label)}</span>
          ${description ? '<span part="description" class="description"></span>' : ''}
        </span>
      </label>
    `;

    const descriptionEl = this.root.querySelector('.description');
    if (descriptionEl) descriptionEl.textContent = description;

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
  tag: 'tblr-checkbox',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrCheckbox);

export { TblrCheckbox };
