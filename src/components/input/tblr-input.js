import { Component } from '../../core/component.js';

const stylesheetUrl = new URL('./tblr-input.css', import.meta.url);
const textLikeTypes = new Set([
  'text',
  'email',
  'password',
  'search',
  'tel',
  'url',
  'number',
  'date',
  'datetime-local',
  'month',
  'time',
  'week',
]);

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function booleanAttribute(host, name) {
  return host.hasAttribute(name);
}

function attributeValue(host, name) {
  return host.getAttribute(name) ?? '';
}

function isMaskToken(char) {
  return char === '_' || char === '9' || char === '#' || char === 'A' || char === '*';
}

function matchesMaskToken(char, token) {
  if (token === '_' || token === '9' || token === '#') return /\d/.test(char);
  if (token === 'A') return /[a-z]/i.test(char);
  if (token === '*') return /[a-z0-9]/i.test(char);

  return false;
}

function stripMaskValue(value, mask) {
  const tokens = [...new Set([...mask].filter(isMaskToken))];

  return [...String(value ?? '')].filter(char => (
    tokens.some(token => matchesMaskToken(char, token))
  )).join('');
}

function applyMask(value, mask) {
  const rawValue = stripMaskValue(value, mask);
  let rawIndex = 0;
  let output = '';

  if (!rawValue) return '';

  for (const maskChar of mask) {
    if (!isMaskToken(maskChar)) {
      output += maskChar;
      continue;
    }

    let nextChar = '';

    while (rawIndex < rawValue.length) {
      const candidate = rawValue[rawIndex];
      rawIndex += 1;

      if (matchesMaskToken(candidate, maskChar)) {
        nextChar = candidate;
        break;
      }
    }

    if (!nextChar) break;

    output += nextChar;
  }

  return output;
}

class TblrInput extends HTMLElement {
  static observedAttributes = [
    'name',
    'type',
    'value',
    'placeholder',
    'label',
    'help',
    'disabled',
    'readonly',
    'required',
    'textarea',
    'autosize',
    'rows',
    'maxlength',
    'mask',
    'prefix',
    'suffix',
    'action',
    'toggle-password',
    'clearable',
    'rounded',
    'flush',
  ];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.reflectingValue = false;
    this.passwordVisible = false;
    this.handleInput = this.handleInput.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleAction = this.handleAction.bind(this);
    this.handlePasswordToggle = this.handlePasswordToggle.bind(this);
    this.handleClear = this.handleClear.bind(this);
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
    return this.control?.value ?? attributeValue(this, 'value');
  }

  set value(value) {
    const mask = this.getAttribute('mask');
    const nextValue = mask ? applyMask(value ?? '', mask) : value ?? '';

    this.setAttribute('value', nextValue);
    if (this.control) this.control.value = nextValue;
  }

  get control() {
    return this.root.querySelector('.control');
  }

  focus(options) {
    this.control?.focus(options);
  }

  render() {
    const label = this.getAttribute('label');
    const help = this.getAttribute('help');
    const type = this.getAttribute('type') ?? 'text';
    const isTextarea = booleanAttribute(this, 'textarea') || type === 'textarea';
    const disabled = booleanAttribute(this, 'disabled');
    const readonly = booleanAttribute(this, 'readonly');
    const required = booleanAttribute(this, 'required');
    const maxlength = this.getAttribute('maxlength');
    const prefix = this.getAttribute('prefix');
    const suffix = this.getAttribute('suffix');
    const action = this.getAttribute('action');
    const hasPasswordToggle = type === 'password' && booleanAttribute(this, 'toggle-password') && !isTextarea;
    const hasClearButton = !isTextarea
      && booleanAttribute(this, 'clearable')
      && !disabled
      && !readonly;
    const controlMarkup = isTextarea ? this.renderTextarea() : this.renderInput(type);

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">

      <label part="field" class="field">
        ${label || maxlength ? `
          <span class="field-header">
            ${label ? `<span part="label" class="label">${escapeHtml(label)}${required ? ' <span class="required">*</span>' : ''}</span>` : '<span></span>'}
            ${maxlength ? '<span part="counter" class="counter"></span>' : ''}
          </span>
        ` : ''}

        <span part="control-wrap" class="control-wrap${disabled ? ' disabled' : ''}">
          ${prefix ? '<span part="prefix" class="addon prefix"></span>' : '<slot name="prefix"></slot>'}
          ${controlMarkup}
          ${suffix ? '<span part="suffix" class="addon suffix"></span>' : '<slot name="suffix"></slot>'}
          ${hasClearButton ? this.renderClearButton() : ''}
          ${hasPasswordToggle ? this.renderPasswordToggle() : ''}
          ${action ? '<button part="action" class="action suffix" type="button"></button>' : '<slot name="action"></slot>'}
        </span>

        ${help ? '<span part="help" class="help"></span>' : ''}
      </label>
    `;

    const control = this.control;
    const prefixEl = this.root.querySelector('.prefix.addon');
    const suffixEl = this.root.querySelector('.suffix.addon');
    const actionEl = this.root.querySelector('.action');
    const clearEl = this.root.querySelector('.clear-button');
    const passwordToggleEl = this.root.querySelector('.password-toggle');
    const helpEl = this.root.querySelector('.help');

    if (prefixEl) prefixEl.textContent = prefix;
    if (suffixEl) suffixEl.textContent = suffix;
    if (actionEl) actionEl.textContent = action;
    if (helpEl) helpEl.textContent = help;

    if (isTextarea) {
      control.value = this.getAttribute('value') ?? '';
    } else if (this.getAttribute('mask')) {
      control.value = applyMask(control.value, this.getAttribute('mask'));
    }

    control.addEventListener('input', this.handleInput);
    control.addEventListener('change', this.handleChange);
    actionEl?.addEventListener('click', this.handleAction);
    clearEl?.addEventListener('click', this.handleClear);
    passwordToggleEl?.addEventListener('click', this.handlePasswordToggle);

    if (isTextarea && booleanAttribute(this, 'autosize')) {
      this.resizeTextarea();
    }

    this.updateCounter();
  }

  renderInput(type) {
    const safeType = textLikeTypes.has(type) ? type : 'text';
    const renderedType = safeType === 'password' && this.passwordVisible ? 'text' : safeType;
    const maxlength = this.getAttribute('mask')?.length ?? this.getAttribute('maxlength');

    return `
      <input
        part="control"
        class="control"
        type="${renderedType}"
        name="${escapeHtml(attributeValue(this, 'name'))}"
        value="${escapeHtml(attributeValue(this, 'value'))}"
        placeholder="${escapeHtml(attributeValue(this, 'placeholder'))}"
        ${booleanAttribute(this, 'disabled') ? 'disabled' : ''}
        ${booleanAttribute(this, 'readonly') ? 'readonly' : ''}
        ${booleanAttribute(this, 'required') ? 'required' : ''}
        ${maxlength ? `maxlength="${escapeHtml(maxlength)}"` : ''}
      >
    `;
  }

  renderPasswordToggle() {
    const label = this.passwordVisible ? 'Hide password' : 'Show password';
    const disabled = booleanAttribute(this, 'disabled');

    return `
      <button
        part="password-toggle"
        class="password-toggle suffix"
        type="button"
        aria-label="${label}"
        aria-pressed="${this.passwordVisible ? 'true' : 'false'}"
        ${disabled ? 'disabled' : ''}
      >
        ${this.passwordVisible ? this.renderEyeOffIcon() : this.renderEyeIcon()}
      </button>
    `;
  }

  renderClearButton() {
    return `
      <button
        part="clear-button"
        class="clear-button suffix"
        type="button"
        aria-label="Clear input"
        ${attributeValue(this, 'value') === '' ? 'hidden' : ''}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M18 6 6 18"></path>
          <path d="m6 6 12 12"></path>
        </svg>
      </button>
    `;
  }

  renderEyeIcon() {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    `;
  }

  renderEyeOffIcon() {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m3 3 18 18"></path>
        <path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58"></path>
        <path d="M9.88 4.24A9.4 9.4 0 0 1 12 4c6.5 0 10 8 10 8a17.6 17.6 0 0 1-3.17 4.49"></path>
        <path d="M6.61 6.61C3.78 8.51 2 12 2 12s3.5 8 10 8a9.7 9.7 0 0 0 5.39-1.61"></path>
      </svg>
    `;
  }

  renderTextarea() {
    return `
      <textarea
        part="control"
        class="control"
        name="${escapeHtml(attributeValue(this, 'name'))}"
        placeholder="${escapeHtml(attributeValue(this, 'placeholder'))}"
        rows="${escapeHtml(this.getAttribute('rows') ?? '5')}"
        ${booleanAttribute(this, 'disabled') ? 'disabled' : ''}
        ${booleanAttribute(this, 'readonly') ? 'readonly' : ''}
        ${booleanAttribute(this, 'required') ? 'required' : ''}
        ${this.getAttribute('maxlength') ? `maxlength="${escapeHtml(this.getAttribute('maxlength'))}"` : ''}
      ></textarea>
    `;
  }

  handleInput(event) {
    const mask = this.getAttribute('mask');

    if (mask && event.target.tagName.toLowerCase() !== 'textarea') {
      const selectionStart = event.target.selectionStart ?? event.target.value.length;
      const rawBeforeCaret = stripMaskValue(event.target.value.slice(0, selectionStart), mask);
      const maskedValue = applyMask(event.target.value, mask);
      const nextCaret = applyMask(rawBeforeCaret, mask).length;

      event.target.value = maskedValue;
      event.target.setSelectionRange?.(nextCaret, nextCaret);
    }

    this.reflectingValue = true;
    this.setAttribute('value', event.target.value);
    this.reflectingValue = false;
    this.resizeTextarea();
    this.updateCounter();
    this.updateClearButton();
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

  handleAction() {
    this.dispatchEvent(new Event('action', {
      bubbles: true,
      composed: true,
    }));
  }

  handleClear() {
    const control = this.control;

    if (!control || booleanAttribute(this, 'disabled') || booleanAttribute(this, 'readonly')) return;

    this.reflectingValue = true;
    this.setAttribute('value', '');
    this.reflectingValue = false;
    control.value = '';
    this.resizeTextarea();
    this.updateCounter();
    this.render();
    this.focus();
    this.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      composed: true,
      data: null,
      inputType: 'deleteContentBackward',
    }));
    this.dispatchEvent(new Event('change', {
      bubbles: true,
      composed: true,
    }));
    this.dispatchEvent(new Event('clear', {
      bubbles: true,
      composed: true,
    }));
  }

  handlePasswordToggle() {
    const control = this.control;

    this.passwordVisible = !this.passwordVisible;

    if (control) {
      control.type = this.passwordVisible ? 'text' : 'password';
    }

    const toggle = this.root.querySelector('.password-toggle');
    if (!toggle) return;

    toggle.setAttribute('aria-label', this.passwordVisible ? 'Hide password' : 'Show password');
    toggle.setAttribute('aria-pressed', this.passwordVisible ? 'true' : 'false');
    toggle.innerHTML = this.passwordVisible ? this.renderEyeOffIcon() : this.renderEyeIcon();
  }

  updateCounter() {
    const counter = this.root.querySelector('.counter');
    const maxlength = this.getAttribute('maxlength');

    if (!counter || !maxlength) return;

    counter.textContent = `${this.value.length}/${maxlength}`;
  }

  updateClearButton() {
    const clearButton = this.root.querySelector('.clear-button');

    if (!clearButton) return;

    clearButton.hidden = this.value === '';
  }

  resizeTextarea() {
    const control = this.control;

    if (!control || control.tagName.toLowerCase() !== 'textarea' || !booleanAttribute(this, 'autosize')) {
      return;
    }

    control.style.height = 'auto';
    control.style.height = `${control.scrollHeight}px`;
  }
}

Component({
  tag: 'tblr-input',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrInput);

export { TblrInput };
