import { Component } from '../../core/component.js';

const stylesheetUrl = new URL('./tblr-search.css', import.meta.url);

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

class TblrSearch extends HTMLElement {
  static observedAttributes = [
    'name',
    'value',
    'placeholder',
    'label',
    'help',
    'disabled',
    'readonly',
    'button',
    'icon-start',
    'rounded',
  ];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.reflectingValue = false;
    this.handleInput = this.handleInput.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;
    if (name === 'value' && this.reflectingValue) return;

    this.render();
  }

  get value() {
    return this.root.querySelector('input')?.value ?? this.getAttribute('value') ?? '';
  }

  set value(value) {
    this.setAttribute('value', value ?? '');
    const input = this.root.querySelector('input');
    if (input) input.value = value ?? '';
  }

  focus(options) {
    this.root.querySelector('input')?.focus(options);
  }

  render() {
    const label = this.getAttribute('label');
    const help = this.getAttribute('help');
    const disabled = this.hasAttribute('disabled');
    const readonly = this.hasAttribute('readonly');
    const button = this.hasAttribute('button');
    const iconStart = this.hasAttribute('icon-start');
    const iconMarkup = this.renderIcon();

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">

      <label part="field" class="field">
        ${label ? '<span part="label" class="label"></span>' : ''}
        <span part="search-wrap" class="search-wrap">
          ${iconStart ? `<span part="icon" class="icon">${iconMarkup}</span>` : ''}
          <input
            part="input"
            class="input"
            type="search"
            name="${escapeHtml(this.getAttribute('name') ?? '')}"
            value="${escapeHtml(this.getAttribute('value') ?? '')}"
            placeholder="${escapeHtml(this.getAttribute('placeholder') ?? 'Search...')}"
            ${disabled ? 'disabled' : ''}
            ${readonly ? 'readonly' : ''}
          >
          ${button ? `<button part="button" class="button" type="button" aria-label="Search">${iconMarkup}</button>` : `<span part="icon" class="icon">${iconMarkup}</span>`}
        </span>
        ${help ? '<span part="help" class="help"></span>' : ''}
      </label>
    `;

    const labelEl = this.root.querySelector('.label');
    const helpEl = this.root.querySelector('.help');
    const input = this.root.querySelector('input');
    const submitButton = this.root.querySelector('button');

    if (labelEl) labelEl.textContent = label;
    if (helpEl) helpEl.textContent = help;

    input.addEventListener('input', this.handleInput);
    input.addEventListener('change', this.handleChange);
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') this.handleSubmit();
    });
    submitButton?.addEventListener('click', this.handleSubmit);
  }

  renderIcon() {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m21 21-4.35-4.35"></path>
        <circle cx="11" cy="11" r="7"></circle>
      </svg>
    `;
  }

  handleInput(event) {
    this.reflectingValue = true;
    this.setAttribute('value', event.target.value);
    this.reflectingValue = false;
    this.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      composed: true,
      data: event.data,
      inputType: event.inputType,
    }));
  }

  handleChange() {
    this.dispatchEvent(new Event('change', {
      bubbles: true,
      composed: true,
    }));
  }

  handleSubmit() {
    this.dispatchEvent(new CustomEvent('search', {
      bubbles: true,
      composed: true,
      detail: { value: this.value },
    }));
  }
}

Component({
  tag: 'tblr-search',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrSearch);

export { TblrSearch };
