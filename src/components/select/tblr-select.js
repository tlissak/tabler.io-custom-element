import { Component } from '../../core/component.js';
import { attachInternals, setFormValue, syncValidity, valuesToFormData } from '../../core/form-associated.js';

const stylesheetUrl = new URL('./tblr-select.css', import.meta.url);

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function parseOptions(options) {
  return options
    .split('|')
    .map(option => option.trim())
    .filter(Boolean)
    .map(option => {
      const separatorIndex = option.indexOf(':');

      if (separatorIndex === -1) {
        return { label: option, value: option };
      }

      return {
        value: option.slice(0, separatorIndex).trim(),
        label: option.slice(separatorIndex + 1).trim(),
      };
    });
}

function readLightDomOptions(host) {
  return [...host.querySelectorAll('option')].map(option => ({
    value: option.value || option.textContent.trim(),
    label: option.textContent.trim(),
  }));
}

function splitValue(value) {
  return String(value ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

class TblrSelect extends HTMLElement {
  static formAssociated = true;

  static observedAttributes = [
    'name',
    'value',
    'options',
    'label',
    'help',
    'placeholder',
    'disabled',
    'required',
    'multiple',
    'clearable',
    'size',
    'search',
    'searchable',
    'advanced',
    'empty-text',
    'max-options-visible',
  ];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.internals = attachInternals(this);
    this.defaultFormValue = null;
    this.reflectingValue = false;
    this.handleChange = this.handleChange.bind(this);
    this.handleDocumentClick = this.handleDocumentClick.bind(this);
    this.open = false;
    this.searchQuery = '';
    this.searchMode = false;
    this.activeIndex = 0;
    this.options = [];
  }

  connectedCallback() {
    if (this.defaultFormValue === null) {
      this.defaultFormValue = this.getAttribute('value') ?? '';
    }

    this.render();
    document.addEventListener('click', this.handleDocumentClick);
  }

  disconnectedCallback() {
    document.removeEventListener('click', this.handleDocumentClick);
  }

  formResetCallback() {
    this.value = this.defaultFormValue ?? '';
  }

  formDisabledCallback(disabled) {
    this.toggleAttribute('disabled', disabled);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;
    if (name === 'value' && this.reflectingValue) {
      this.syncValue();
      return;
    }

    this.render();
  }

  get value() {
    const select = this.root.querySelector('select');

    if (!select) return this.getAttribute('value') ?? '';

    return select.multiple
      ? [...select.selectedOptions].map(option => option.value)
      : select.value;
  }

  set value(value) {
    const normalizedValue = Array.isArray(value) ? value.join(',') : value ?? '';
    this.setAttribute('value', normalizedValue);
    this.syncValue();
  }

  focus(options) {
    const focusTarget = this.root.querySelector('.single-search') ?? this.root.querySelector('.multi-search') ?? this.root.querySelector('select');
    focusTarget?.focus(options);
  }

  render() {
    const label = this.getAttribute('label');
    const help = this.getAttribute('help');
    const placeholder = this.getAttribute('placeholder');
    const disabled = this.hasAttribute('disabled');
    const required = this.hasAttribute('required');
    const multiple = this.hasAttribute('multiple');
    const size = this.getAttribute('size');
    const searchable = !multiple && !size && (
      this.hasAttribute('searchable')
      || this.hasAttribute('search')
      || this.hasAttribute('advanced')
    );
    const options = this.hasAttribute('options')
      ? parseOptions(this.getAttribute('options') ?? '')
      : readLightDomOptions(this);
    const enhancedMultiple = multiple && !size;

    this.options = options;

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">

      <label part="field" class="field">
        ${label ? `<span part="label" class="label">${escapeHtml(label)}${required ? ' <span class="required">*</span>' : ''}</span>` : ''}
        ${enhancedMultiple ? this.renderEnhancedMultiple({ disabled, required, options, placeholder }) : searchable ? this.renderSearchableSingle({ disabled, required, options, placeholder }) : `
        <span part="select-wrap" class="select-wrap${disabled ? ' disabled' : ''}">
          <select
            part="select"
            class="select"
            name="${escapeHtml(this.getAttribute('name') ?? '')}"
            ${disabled ? 'disabled' : ''}
            ${required ? 'required' : ''}
            ${multiple ? 'multiple' : ''}
            ${size ? `size="${escapeHtml(size)}"` : ''}
          >
            ${placeholder && !multiple ? `<option value="">${escapeHtml(placeholder)}</option>` : ''}
            ${options.map(option => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join('')}
          </select>
          <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6"></path>
          </svg>
        </span>
        `}
        ${help ? '<span part="help" class="help"></span>' : ''}
      </label>
    `;

    const helpEl = this.root.querySelector('.help');
    const select = this.root.querySelector('select');

    if (helpEl) helpEl.textContent = help;

    select?.addEventListener('change', this.handleChange);
    this.bindSearchableSingle();
    this.bindEnhancedMultiple();
    this.syncValue();
    this.updateFormState();
  }

  getFilteredOptions(options, selectedValues = new Set()) {
    const normalizedSearch = this.searchQuery.trim().toLowerCase();

    return options.filter(option => {
      if (selectedValues.has(option.value)) return false;
      if (!normalizedSearch) return true;

      return option.label.toLowerCase().includes(normalizedSearch) || option.value.toLowerCase().includes(normalizedSearch);
    });
  }

  setActiveIndexToValue(value = this.getAttribute('value') ?? '') {
    const selectedIndex = this.options.findIndex(option => option.value === value);
    this.activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
  }

  focusSearchInput(selector, selectionStart, selectionEnd) {
    const input = this.root.querySelector(selector);

    input?.focus();

    if (!input || typeof selectionStart !== 'number') return;

    const start = Math.min(selectionStart, input.value.length);
    const end = Math.min(typeof selectionEnd === 'number' ? selectionEnd : start, input.value.length);

    input.setSelectionRange(start, end);
  }

  renderSearchableSingle({ disabled, required, options, placeholder }) {
    const name = this.getAttribute('name') ?? '';
    const value = this.getAttribute('value') ?? '';
    const selectedOption = options.find(option => option.value === value);
    const filteredOptions = this.getFilteredOptions(options);
    const boundedActiveIndex = filteredOptions.length ? Math.min(this.activeIndex, filteredOptions.length - 1) : -1;
    const inputValue = this.open
      ? this.searchMode ? this.searchQuery : selectedOption?.label || ''
      : selectedOption?.label || '';
    const emptyText = this.getAttribute('empty-text') ?? 'No results found';

    if (boundedActiveIndex !== this.activeIndex) {
      this.activeIndex = Math.max(boundedActiveIndex, 0);
    }

    return `
      <span part="select-wrap" class="select-wrap searchable-wrap${disabled ? ' disabled' : ''}${this.open ? ' open' : ''}">
        <select
          part="select"
          class="select native-single"
          name="${escapeHtml(name)}"
          tabindex="-1"
          aria-hidden="true"
          ${disabled ? 'disabled' : ''}
          ${required ? 'required' : ''}
        >
          ${placeholder ? `<option value="">${escapeHtml(placeholder)}</option>` : '<option value=""></option>'}
          ${options.map(option => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join('')}
        </select>
        <input
          class="single-search"
          type="text"
          role="combobox"
          aria-expanded="${this.open ? 'true' : 'false'}"
          aria-haspopup="listbox"
          value="${escapeHtml(inputValue)}"
          placeholder="${escapeHtml(placeholder ?? '')}"
          ${disabled ? 'disabled' : ''}
          autocomplete="off"
        >
        <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6"></path>
        </svg>
        ${this.open ? `
          <span class="single-menu" role="listbox">
            ${filteredOptions.length
              ? filteredOptions.map((option, index) => `
                <button
                  type="button"
                  class="single-option${option.value === value ? ' selected' : ''}${index === this.activeIndex ? ' active' : ''}"
                  role="option"
                  aria-selected="${option.value === value ? 'true' : 'false'}"
                  data-value="${escapeHtml(option.value)}"
                >
                  ${escapeHtml(option.label)}
                </button>
              `).join('')
              : `<span class="single-empty">${escapeHtml(emptyText)}</span>`
            }
          </span>
        ` : ''}
      </span>
    `;
  }

  renderEnhancedMultiple({ disabled, required, options, placeholder }) {
    const name = this.getAttribute('name') ?? '';
    const selectedValues = new Set(splitValue(this.getAttribute('value')));
    const selectedOptions = options.filter(option => selectedValues.has(option.value));
    const availableOptions = this.getFilteredOptions(options, selectedValues);
    const parsedMaxVisible = Number.parseInt(this.getAttribute('max-options-visible') ?? '3', 10);
    const maxVisible = Number.isNaN(parsedMaxVisible) ? 3 : Math.max(parsedMaxVisible, 0);
    const visibleOptions = maxVisible === 0 ? [] : selectedOptions.slice(0, maxVisible);
    const hiddenCount = Math.max(selectedOptions.length - visibleOptions.length, 0);
    const hasClearButton = this.hasAttribute('clearable') && selectedOptions.length > 0 && !disabled;

    return `
      <span part="select-wrap" class="select-wrap multi-wrap${disabled ? ' disabled' : ''}${this.open ? ' open' : ''}${hasClearButton ? ' clearable' : ''}">
        <select
          part="select"
          class="select native-multi"
          name="${escapeHtml(name)}"
          multiple
          tabindex="-1"
          aria-hidden="true"
          ${disabled ? 'disabled' : ''}
          ${required ? 'required' : ''}
        >
          ${options.map(option => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join('')}
        </select>
        <span class="multi-control" role="combobox" aria-expanded="${this.open ? 'true' : 'false'}" aria-haspopup="listbox">
          ${visibleOptions.map(option => `
            <button
              type="button"
              class="multi-tag"
              data-remove-value="${escapeHtml(option.value)}"
              aria-label="Remove ${escapeHtml(option.label)}"
              ${disabled ? 'disabled' : ''}
            >
              <span class="multi-tag-label">${escapeHtml(option.label)}</span>
              <svg class="multi-tag-remove" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M18 6 6 18"></path>
                <path d="m6 6 12 12"></path>
              </svg>
            </button>
          `).join('')}
          ${hiddenCount ? `<span class="multi-tag multi-tag-overflow" aria-label="${hiddenCount} more selected">+${hiddenCount}</span>` : ''}
          <input
            class="multi-search"
            type="text"
            value="${escapeHtml(this.searchQuery)}"
            placeholder="${selectedOptions.length ? '' : escapeHtml(placeholder ?? '')}"
            ${disabled ? 'disabled' : ''}
            autocomplete="off"
          >
        </span>
        ${hasClearButton ? `
          <button type="button" class="multi-clear-button" aria-label="Clear selected values">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 6 6 18"></path>
              <path d="m6 6 12 12"></path>
            </svg>
          </button>
        ` : ''}
        <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6"></path>
        </svg>
        ${this.open ? `
          <span class="multi-menu" role="listbox" aria-multiselectable="true">
            ${availableOptions.length
              ? availableOptions.map(option => `
                <button type="button" class="multi-option" role="option" data-value="${escapeHtml(option.value)}">
                  ${escapeHtml(option.label)}
                </button>
              `).join('')
              : '<span class="multi-empty">No results found</span>'
            }
          </span>
        ` : ''}
      </span>
    `;
  }

  bindEnhancedMultiple() {
    const wrap = this.root.querySelector('.multi-wrap');
    const input = this.root.querySelector('.multi-search');
    const clearButton = this.root.querySelector('.multi-clear-button');

    if (!wrap || !input) return;

    wrap.addEventListener('mousedown', event => {
      if (this.hasAttribute('disabled')) return;
      if (event.target.closest('.multi-menu')) return;
      if (event.target.closest('.multi-tag')) return;
      if (event.target.closest('.multi-clear-button')) return;
      event.preventDefault();
      this.open = true;
      this.render();
      this.root.querySelector('.multi-search')?.focus();
    });

    input.addEventListener('input', event => {
      if (this.hasAttribute('disabled')) return;
      const { selectionStart, selectionEnd } = event.target;

      this.searchQuery = event.target.value;
      this.open = true;
      this.render();
      this.focusSearchInput('.multi-search', selectionStart, selectionEnd);
    });

    input.addEventListener('focus', () => {
      if (this.hasAttribute('disabled')) return;
      if (!this.open) {
        this.open = true;
        this.render();
        this.root.querySelector('.multi-search')?.focus();
      }
    });

    input.addEventListener('keydown', event => {
      if (this.hasAttribute('disabled')) return;
      if (event.key === 'Escape') {
        this.open = false;
        this.render();
      }

      if (event.key === 'Backspace' && !input.value) {
        const values = splitValue(this.getAttribute('value'));
        const nextValues = values.slice(0, -1);
        this.setMultipleValue(nextValues);
      }
    });

    this.root.querySelectorAll('.multi-option').forEach(option => {
      option.addEventListener('click', () => {
        const value = option.getAttribute('data-value');
        this.setMultipleValue([...splitValue(this.getAttribute('value')), value]);
      });
    });

    this.root.querySelectorAll('.multi-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        const value = tag.getAttribute('data-remove-value');
        if (!value) return;
        this.setMultipleValue(splitValue(this.getAttribute('value')).filter(item => item !== value));
      });
    });

    clearButton?.addEventListener('click', () => {
      this.clearValue();
    });
  }

  bindSearchableSingle() {
    const wrap = this.root.querySelector('.searchable-wrap');
    const input = this.root.querySelector('.single-search');

    if (!wrap || !input) return;

    wrap.addEventListener('mousedown', event => {
      if (this.hasAttribute('disabled')) return;
      if (event.target.closest('.single-menu')) return;
      event.preventDefault();
      this.searchMode = false;
      this.searchQuery = '';
      this.setActiveIndexToValue();
      this.open = true;
      this.render();
      const nextInput = this.root.querySelector('.single-search');
      nextInput?.focus();
      nextInput?.select();
    });

    input.addEventListener('focus', () => {
      if (this.hasAttribute('disabled')) return;
      if (this.open) return;

      this.searchMode = false;
      this.searchQuery = '';
      this.setActiveIndexToValue();
      this.open = true;
      this.render();
      const nextInput = this.root.querySelector('.single-search');
      nextInput?.focus();
      nextInput?.select();
    });

    input.addEventListener('input', event => {
      if (this.hasAttribute('disabled')) return;
      const { selectionStart, selectionEnd } = event.target;

      this.searchMode = true;
      this.searchQuery = event.target.value;
      this.activeIndex = 0;
      this.open = true;
      this.render();
      this.focusSearchInput('.single-search', selectionStart, selectionEnd);
    });

    input.addEventListener('keydown', event => {
      if (this.hasAttribute('disabled')) return;

      const filteredOptions = this.getFilteredOptions(this.options);
      const { selectionStart, selectionEnd } = input;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.open = true;
        this.activeIndex = filteredOptions.length ? Math.min(this.activeIndex + 1, filteredOptions.length - 1) : 0;
        this.render();
        this.focusSearchInput('.single-search', selectionStart, selectionEnd);
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.open = true;
        this.activeIndex = Math.max(this.activeIndex - 1, 0);
        this.render();
        this.focusSearchInput('.single-search', selectionStart, selectionEnd);
      }

      if (event.key === 'Enter' && this.open) {
        event.preventDefault();
        const option = filteredOptions[this.activeIndex];
        if (option) this.setSingleValue(option.value);
      }

      if (event.key === 'Escape') {
        this.open = false;
        this.searchQuery = '';
        this.searchMode = false;
        this.render();
      }
    });

    this.root.querySelectorAll('.single-option').forEach(option => {
      option.addEventListener('click', () => {
        this.setSingleValue(option.getAttribute('data-value'));
      });
    });
  }

  handleChange() {
    const value = this.value;

    this.reflectingValue = true;
    this.setAttribute('value', Array.isArray(value) ? value.join(',') : value);
    this.reflectingValue = false;
    this.updateFormState();
    this.dispatchEvent(new Event('change', {
      bubbles: true,
      composed: true,
    }));
  }

  handleDocumentClick(event) {
    if (!this.open || event.composedPath().includes(this)) return;

    this.open = false;
    this.searchQuery = '';
    this.searchMode = false;
    this.activeIndex = 0;
    this.render();
  }

  setSingleValue(value) {
    if (this.hasAttribute('disabled')) return;

    this.searchQuery = '';
    this.searchMode = false;
    this.activeIndex = 0;
    this.reflectingValue = true;
    this.setAttribute('value', value ?? '');
    this.reflectingValue = false;
    this.open = false;
    this.render();
    this.updateFormState();
    this.dispatchEvent(new Event('change', {
      bubbles: true,
      composed: true,
    }));
  }

  setMultipleValue(values, options = {}) {
    if (this.hasAttribute('disabled')) return;

    const { open = true } = options;
    const uniqueValues = [...new Set(values.filter(Boolean))];

    this.searchQuery = '';
    this.searchMode = false;
    this.activeIndex = 0;
    this.reflectingValue = true;
    this.setAttribute('value', uniqueValues.join(','));
    this.reflectingValue = false;
    this.open = open;
    this.render();
    this.updateFormState();
    this.dispatchEvent(new Event('change', {
      bubbles: true,
      composed: true,
    }));
  }

  clearValue() {
    if (this.hasAttribute('disabled')) return;

    if (this.hasAttribute('multiple')) {
      this.setMultipleValue([], { open: false });
    } else {
      this.setSingleValue('');
    }

    this.dispatchEvent(new Event('clear', {
      bubbles: true,
      composed: true,
    }));
  }

  syncValue() {
    const select = this.root.querySelector('select');
    const value = this.getAttribute('value') ?? '';

    if (!select) return;

    if (select.multiple) {
      const values = new Set(splitValue(value));
      [...select.options].forEach(option => {
        option.selected = values.has(option.value);
      });
      this.updateFormState();
      return;
    }

    select.value = value;
    this.updateFormState();
  }

  formValue() {
    if (this.hasAttribute('disabled')) return null;
    if (this.hasAttribute('multiple')) {
      return valuesToFormData(this.getAttribute('name') ?? '', splitValue(this.getAttribute('value')));
    }

    return this.getAttribute('value') ?? '';
  }

  updateFormState() {
    setFormValue(this.internals, this.formValue());
    syncValidity(this.internals, this.root.querySelector('select'));
  }
}

Component({
  tag: 'tblr-select',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrSelect);

export { TblrSelect };
