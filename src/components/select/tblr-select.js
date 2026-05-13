import { Component } from '../../core/component.js';

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

class TblrSelect extends HTMLElement {
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
    'size',
  ];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.reflectingValue = false;
    this.handleChange = this.handleChange.bind(this);
  }

  connectedCallback() {
    this.render();
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
    this.root.querySelector('select')?.focus(options);
  }

  render() {
    const label = this.getAttribute('label');
    const help = this.getAttribute('help');
    const placeholder = this.getAttribute('placeholder');
    const disabled = this.hasAttribute('disabled');
    const required = this.hasAttribute('required');
    const multiple = this.hasAttribute('multiple');
    const size = this.getAttribute('size');
    const options = this.hasAttribute('options')
      ? parseOptions(this.getAttribute('options') ?? '')
      : readLightDomOptions(this);

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">

      <label part="field" class="field">
        ${label ? `<span part="label" class="label">${escapeHtml(label)}${required ? ' <span class="required">*</span>' : ''}</span>` : ''}
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
          <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6"></path>
          </svg>
        </span>
        ${help ? '<span part="help" class="help"></span>' : ''}
      </label>
    `;

    const helpEl = this.root.querySelector('.help');
    const select = this.root.querySelector('select');

    if (helpEl) helpEl.textContent = help;

    select.addEventListener('change', this.handleChange);
    this.syncValue();
  }

  handleChange() {
    const value = this.value;

    this.reflectingValue = true;
    this.setAttribute('value', Array.isArray(value) ? value.join(',') : value);
    this.reflectingValue = false;
    this.dispatchEvent(new Event('change', {
      bubbles: true,
      composed: true,
    }));
  }

  syncValue() {
    const select = this.root.querySelector('select');
    const value = this.getAttribute('value') ?? '';

    if (!select) return;

    if (select.multiple) {
      const values = new Set(value.split(',').map(item => item.trim()).filter(Boolean));
      [...select.options].forEach(option => {
        option.selected = values.has(option.value);
      });
      return;
    }

    select.value = value;
  }
}

Component({
  tag: 'tblr-select',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrSelect);

export { TblrSelect };
