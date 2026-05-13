import { Component } from '../../core/component.js';

const stylesheetUrl = new URL('./tblr-file-input.css', import.meta.url);

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

class TblrFileInput extends HTMLElement {
  static observedAttributes = ['name', 'label', 'button', 'placeholder', 'accept', 'multiple', 'disabled'];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.handleChange = this.handleChange.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;

    this.render();
  }

  get files() {
    return this.root.querySelector('input')?.files ?? null;
  }

  focus(options) {
    this.root.querySelector('input')?.focus(options);
  }

  render() {
    const label = this.getAttribute('label');
    const disabled = this.hasAttribute('disabled');

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">
      <label part="field" class="field">
        ${label ? `<span part="label" class="label">${escapeHtml(label)}</span>` : ''}
        <span part="control" class="control">
          <button part="button" class="button" type="button" ${disabled ? 'disabled' : ''}></button>
          <span part="name" class="name placeholder"></span>
          <input
            part="input"
            class="input"
            type="file"
            name="${escapeHtml(this.getAttribute('name') ?? '')}"
            ${this.hasAttribute('accept') ? `accept="${escapeHtml(this.getAttribute('accept'))}"` : ''}
            ${this.hasAttribute('multiple') ? 'multiple' : ''}
            ${disabled ? 'disabled' : ''}
          >
        </span>
      </label>
    `;

    const input = this.root.querySelector('input');
    const button = this.root.querySelector('button');

    button.textContent = this.getAttribute('button') ?? 'Browse...';
    button.addEventListener('click', () => input.click());
    input.addEventListener('change', this.handleChange);
    this.updateName();
  }

  handleChange() {
    this.updateName();
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  updateName() {
    const nameEl = this.root.querySelector('.name');
    const files = [...(this.files ?? [])];
    const placeholder = this.getAttribute('placeholder') ?? 'No file selected.';

    if (!nameEl) return;

    if (!files.length) {
      nameEl.textContent = placeholder;
      nameEl.classList.add('placeholder');
      return;
    }

    nameEl.textContent = files.map(file => file.name).join(', ');
    nameEl.classList.remove('placeholder');
  }
}

Component({
  tag: 'tblr-file-input',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrFileInput);

export { TblrFileInput };
