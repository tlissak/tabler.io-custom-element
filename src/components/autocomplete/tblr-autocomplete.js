import { Component } from '../../core/component.js';
import { attachInternals, setFormValue, syncValidity } from '../../core/form-associated.js';

const stylesheetUrl = new URL('./tblr-autocomplete.css', import.meta.url);

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

function readPath(source, path) {
  return String(path)
    .split('.')
    .reduce((value, key) => value?.[key], source);
}

function normalizeResults(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;

  return [];
}

function normalizeOption(item, labelField, valueField) {
  if (typeof item === 'string' || typeof item === 'number') {
    return {
      label: String(item),
      value: String(item),
      raw: item,
    };
  }

  const value = readPath(item, valueField);
  const label = readPath(item, labelField);

  return {
    label: String(label ?? value ?? ''),
    value: String(value ?? label ?? ''),
    raw: item,
  };
}

function normalizeOptions(data, labelField, valueField) {
  return normalizeResults(data)
    .map(item => normalizeOption(item, labelField, valueField))
    .filter(option => option.label || option.value);
}

class TblrAutocomplete extends HTMLElement {
  static formAssociated = true;

  static observedAttributes = [
    'name',
    'value',
    'label-value',
    'src',
    'query-param',
    'label-field',
    'value-field',
    'label',
    'help',
    'placeholder',
    'disabled',
    'readonly',
    'required',
    'min-length',
    'debounce',
    'empty-text',
    'loading-text',
    'error-text',
    'free-text',
  ];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.internals = attachInternals(this);
    this.defaultFormValue = null;
    this.defaultLabelValue = null;
    this.reflectingValue = false;
    this.open = false;
    this.loading = false;
    this.error = '';
    this.query = '';
    this.displayValue = '';
    this.options = [];
    this.activeIndex = 0;
    this.requestId = 0;
    this.debounceTimer = 0;
    this.abortController = null;
    this.handleInput = this.handleInput.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleDocumentClick = this.handleDocumentClick.bind(this);
  }

  connectedCallback() {
    if (this.defaultFormValue === null) {
      this.defaultFormValue = this.getAttribute('value') ?? '';
      this.defaultLabelValue = this.getAttribute('label-value') ?? this.defaultFormValue;
    }

    this.displayValue = this.getAttribute('label-value') ?? this.getAttribute('value') ?? '';
    this.query = this.displayValue;
    this.updateFormValue();
    this.render();
    document.addEventListener('click', this.handleDocumentClick);
  }

  formResetCallback() {
    this.setValue(this.defaultFormValue ?? '', this.defaultLabelValue ?? this.defaultFormValue ?? '', null, { emit: false });
  }

  formDisabledCallback(disabled) {
    this.toggleAttribute('disabled', disabled);
  }

  disconnectedCallback() {
    document.removeEventListener('click', this.handleDocumentClick);
    window.clearTimeout(this.debounceTimer);
    this.abortController?.abort();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;

    if (name === 'value') {
      this.updateFormValue();
      if (!this.reflectingValue && !this.open) {
        this.displayValue = newValue ?? '';
      }
    }

    if (name === 'src') {
      this.options = [];
      this.error = '';
    }

    if (name === 'label-value' && !this.open) {
      this.displayValue = newValue ?? '';
      this.query = this.displayValue;
    }

    this.render();
  }

  get value() {
    return this.getAttribute('value') ?? '';
  }

  set value(value) {
    this.setValue(value ?? '', value ?? '', null, { emit: false });
  }

  get input() {
    return this.root.querySelector('.input');
  }

  focus(options) {
    this.input?.focus(options);
  }

  focusInput(selectionStart, selectionEnd) {
    const input = this.input;

    input?.focus();

    if (!input || typeof selectionStart !== 'number') return;

    const start = Math.min(selectionStart, input.value.length);
    const end = Math.min(typeof selectionEnd === 'number' ? selectionEnd : start, input.value.length);

    input.setSelectionRange(start, end);
  }

  render() {
    const label = this.getAttribute('label');
    const help = this.getAttribute('help');
    const placeholder = this.getAttribute('placeholder') ?? '';
    const disabled = booleanAttribute(this, 'disabled');
    const readonly = booleanAttribute(this, 'readonly');
    const required = booleanAttribute(this, 'required');
    const activeId = this.open && this.options[this.activeIndex] ? `${this.id || 'tblr-autocomplete'}-option-${this.activeIndex}` : '';

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">

      <label part="field" class="field">
        ${label ? `<span part="label" class="label">${escapeHtml(label)}${required ? ' <span class="required">*</span>' : ''}</span>` : ''}
        <span part="control-wrap" class="control-wrap${disabled ? ' disabled' : ''}${this.open ? ' open' : ''}">
          <input
            part="input"
            class="input"
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="${this.open ? 'true' : 'false'}"
            aria-haspopup="listbox"
            ${activeId ? `aria-activedescendant="${escapeHtml(activeId)}"` : ''}
            name="${escapeHtml(this.getAttribute('name') ?? '')}"
            value="${escapeHtml(this.displayValue)}"
            placeholder="${escapeHtml(placeholder)}"
            autocomplete="off"
            ${disabled ? 'disabled' : ''}
            ${readonly ? 'readonly' : ''}
            ${required ? 'required' : ''}
          >
          <span class="status" aria-hidden="true">
            ${this.loading ? this.renderSpinner() : this.renderSearchIcon()}
          </span>
          ${this.open ? this.renderMenu(activeId) : ''}
        </span>
        ${help ? '<span part="help" class="help"></span>' : ''}
      </label>
    `;

    const helpEl = this.root.querySelector('.help');
    if (helpEl) helpEl.textContent = help;

    const input = this.input;
    input?.addEventListener('input', this.handleInput);
    input?.addEventListener('change', this.handleChange);
    input?.addEventListener('focus', () => this.openMenu());
    input?.addEventListener('keydown', this.handleKeydown);

    this.root.querySelectorAll('.option').forEach(option => {
      option.addEventListener('mousedown', event => event.preventDefault());
      option.addEventListener('click', () => {
        const index = Number.parseInt(option.getAttribute('data-index') ?? '0', 10);
        this.selectOption(index);
      });
    });
    this.updateFormValue();
  }

  renderMenu(activeId) {
    return `
      <span part="menu" class="menu" role="listbox">
        ${this.renderMenuContent(activeId)}
      </span>
    `;
  }

  renderMenuContent(activeId) {
    if (this.loading) {
      return `<span class="message">${escapeHtml(this.getAttribute('loading-text') ?? 'Loading...')}</span>`;
    }

    if (this.error) {
      return `<span class="message error">${escapeHtml(this.getAttribute('error-text') ?? this.error)}</span>`;
    }

    if (!this.options.length) {
      return `<span class="message">${escapeHtml(this.getAttribute('empty-text') ?? 'No results found')}</span>`;
    }

    return this.options.map((option, index) => `
      <button
        id="${escapeHtml(activeId && index === this.activeIndex ? activeId : `${this.id || 'tblr-autocomplete'}-option-${index}`)}"
        type="button"
        class="option${index === this.activeIndex ? ' active' : ''}"
        role="option"
        aria-selected="${index === this.activeIndex ? 'true' : 'false'}"
        data-index="${index}"
      >
        ${escapeHtml(option.label)}
      </button>
    `).join('');
  }

  renderSearchIcon() {
    return `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m21 21-4.35-4.35"></path>
        <circle cx="11" cy="11" r="7"></circle>
      </svg>
    `;
  }

  renderSpinner() {
    return '<span class="spinner"></span>';
  }

  handleInput(event) {
    const { selectionStart, selectionEnd } = event.target;

    this.displayValue = event.target.value;
    this.query = event.target.value;
    this.activeIndex = 0;

    if (booleanAttribute(this, 'free-text')) {
      this.setValue(event.target.value, event.target.value, null, { emit: false, render: false });
    } else if (this.value) {
      this.setValue('', event.target.value, null, { emit: true, render: false });
    }

    this.open = true;
    this.render();
    this.focusInput(selectionStart, selectionEnd);
    this.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      composed: true,
      data: event.data,
      inputType: event.inputType,
    }));
    this.scheduleFetch();
  }

  handleChange() {
    this.dispatchEvent(new Event('change', {
      bubbles: true,
      composed: true,
    }));
  }

  handleKeydown(event) {
    if (booleanAttribute(this, 'disabled') || booleanAttribute(this, 'readonly')) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.open = true;
      this.activeIndex = this.options.length ? Math.min(this.activeIndex + 1, this.options.length - 1) : 0;
      this.render();
      this.focusInput();
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.open = true;
      this.activeIndex = Math.max(this.activeIndex - 1, 0);
      this.render();
      this.focusInput();
    }

    if (event.key === 'Enter' && this.open) {
      event.preventDefault();
      this.selectOption(this.activeIndex);
    }

    if (event.key === 'Escape') {
      this.open = false;
      this.render();
      this.focusInput();
    }
  }

  handleDocumentClick(event) {
    if (!this.open || event.composedPath().includes(this)) return;

    this.open = false;
    this.render();
  }

  openMenu() {
    if (booleanAttribute(this, 'disabled') || booleanAttribute(this, 'readonly')) return;
    if (this.open) return;

    this.open = true;
    this.render();
    this.focusInput();
    this.scheduleFetch();
  }

  scheduleFetch() {
    window.clearTimeout(this.debounceTimer);

    const minLength = Number.parseInt(this.getAttribute('min-length') ?? '1', 10);
    if (this.query.length < minLength) {
      const { selectionStart, selectionEnd } = this.input ?? {};

      this.loading = false;
      this.error = '';
      this.options = [];
      this.render();
      this.focusInput(selectionStart, selectionEnd);
      return;
    }

    const delay = Number.parseInt(this.getAttribute('debounce') ?? '250', 10);
    this.debounceTimer = window.setTimeout(() => this.fetchOptions(), delay);
  }

  async fetchOptions() {
    const src = this.getAttribute('src');

    if (!src) return;

    const requestId = ++this.requestId;
    const labelField = this.getAttribute('label-field') ?? 'label';
    const valueField = this.getAttribute('value-field') ?? 'value';
    const url = new URL(src, window.location.href);

    url.searchParams.set(this.getAttribute('query-param') ?? 'q', this.query);

    this.abortController?.abort();
    this.abortController = new AbortController();
    this.loading = true;
    this.error = '';
    const loadingSelection = {
      start: this.input?.selectionStart,
      end: this.input?.selectionEnd,
    };

    this.render();
    this.focusInput(loadingSelection.start, loadingSelection.end);

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }

      const data = await response.json();
      if (requestId !== this.requestId) return;

      this.options = normalizeOptions(data, labelField, valueField);
      this.loading = false;
      this.activeIndex = 0;
      const resultsSelection = {
        start: this.input?.selectionStart,
        end: this.input?.selectionEnd,
      };

      this.render();
      this.focusInput(resultsSelection.start, resultsSelection.end);
    } catch (error) {
      if (error.name === 'AbortError') return;
      if (requestId !== this.requestId) return;

      this.options = [];
      this.loading = false;
      this.error = 'Unable to load results';
      const errorSelection = {
        start: this.input?.selectionStart,
        end: this.input?.selectionEnd,
      };

      this.render();
      this.focusInput(errorSelection.start, errorSelection.end);
    }
  }

  selectOption(index) {
    const option = this.options[index];

    if (!option) return;

    this.setValue(option.value, option.label, option.raw, { emit: true });
  }

  setValue(value, label, raw, options = {}) {
    const { emit = true, render = true } = options;

    this.reflectingValue = true;
    this.setAttribute('value', value ?? '');
    this.reflectingValue = false;
    this.displayValue = label ?? value ?? '';
    this.query = this.displayValue;
    this.open = false;
    this.updateFormValue();

    if (render) this.render();

    if (emit) {
      this.dispatchEvent(new CustomEvent('change', {
        bubbles: true,
        composed: true,
        detail: {
          value: this.value,
          label: this.displayValue,
          option: raw,
        },
      }));
    }
  }

  updateFormValue() {
    setFormValue(this.internals, booleanAttribute(this, 'disabled') ? null : this.value);
    syncValidity(this.internals, this.input);
  }
}

Component({
  tag: 'tblr-autocomplete',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrAutocomplete);

export { TblrAutocomplete };
