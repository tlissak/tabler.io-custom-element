import { Component } from '../../core/component.js';
import { attachInternals, setFormValue, syncValidity } from '../../core/form-associated.js';

const stylesheetUrl = new URL('./tblr-radio.css', import.meta.url);

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

class TblrRadio extends HTMLElement {
  static formAssociated = true;

  static observedAttributes = ['name', 'value', 'label', 'description', 'checked', 'disabled', 'required', 'inline'];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.internals = attachInternals(this);
    this.defaultChecked = null;
    this.reflectingChecked = false;
    this.handleChange = this.handleChange.bind(this);
  }

  connectedCallback() {
    if (this.defaultChecked === null) {
      this.defaultChecked = this.hasAttribute('checked');
    }

    this.render();
  }

  formResetCallback() {
    this.checked = this.defaultChecked;
  }

  formDisabledCallback(disabled) {
    this.toggleAttribute('disabled', disabled);
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
    this.updateFormState();
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
      <label part="radio" class="radio">
        <input
          part="input"
          class="input"
          type="radio"
          name="${escapeHtml(this.getAttribute('name') ?? '')}"
          value="${escapeHtml(this.getAttribute('value') ?? label)}"
          ${this.hasAttribute('checked') ? 'checked' : ''}
          ${disabled ? 'disabled' : ''}
          ${this.hasAttribute('required') ? 'required' : ''}
        >
        <span part="control" class="control"></span>
        <span part="content" class="content">
          <span part="label" class="label">${escapeHtml(label)}</span>
          ${description ? '<span part="description" class="description"></span>' : ''}
        </span>
      </label>
    `;

    const descriptionEl = this.root.querySelector('.description');
    if (descriptionEl) descriptionEl.textContent = description;

    this.root.querySelector('input').addEventListener('change', this.handleChange);
    this.updateFormState();
  }

  handleChange(event) {
    this.reflectingChecked = true;
    this.toggleAttribute('checked', event.target.checked);
    this.reflectingChecked = false;

    if (event.target.checked) {
      this.uncheckRadioGroup();
    }

    this.updateFormState();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  uncheckRadioGroup() {
    const name = this.getAttribute('name');
    if (!name) return;

    document.querySelectorAll(`tblr-radio[name="${CSS.escape(name)}"]`).forEach(radio => {
      if (radio !== this) radio.checked = false;
    });
  }

  formValue() {
    if (!this.checked || this.hasAttribute('disabled')) return null;

    return this.getAttribute('value') ?? this.getAttribute('label') ?? this.textContent.trim();
  }

  updateFormState() {
    setFormValue(this.internals, this.formValue());
    syncValidity(this.internals, this.root.querySelector('input'));
  }
}

Component({
  tag: 'tblr-radio',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrRadio);

export { TblrRadio };
