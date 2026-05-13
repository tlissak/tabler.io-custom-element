import { Component } from '../../core/component.js';

const stylesheetUrl = new URL('./tblr-colorpicker.css', import.meta.url);
const defaultColors = [
  '#182433',
  '#ffffff',
  '#066fd1',
  '#4299e1',
  '#4263eb',
  '#ae3ec9',
  '#d6336c',
  '#d63939',
  '#f76707',
  '#f59f00',
  '#74b816',
  '#2fb344',
];
const hexPattern = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function normalizeColor(value) {
  const color = String(value ?? '').trim();

  if (!hexPattern.test(color)) return '';

  if (color.length === 4) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`.toLowerCase();
  }

  return color.toLowerCase();
}

function parseColors(value) {
  if (!value) return defaultColors;

  return value
    .split(/[|,]/)
    .map(color => normalizeColor(color))
    .filter(Boolean);
}

function isLightColor(color) {
  const normalized = normalizeColor(color);

  if (!normalized) return false;

  const red = parseInt(normalized.slice(1, 3), 16);
  const green = parseInt(normalized.slice(3, 5), 16);
  const blue = parseInt(normalized.slice(5, 7), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;

  return luminance > 170;
}

class TblrColorpicker extends HTMLElement {
  static observedAttributes = ['name', 'label', 'value', 'colors', 'type', 'disabled'];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.reflectingValue = false;
    this.handleNativeInput = this.handleNativeInput.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;

    if (name === 'value' && this.reflectingValue) {
      this.syncSelection();
      return;
    }

    this.render();
  }

  get value() {
    const type = this.type;

    if (type === 'check') {
      return [...this.selectedValues];
    }

    return this.getAttribute('value') ?? '';
  }

  set value(value) {
    const normalized = Array.isArray(value) ? value.join(',') : value ?? '';
    this.setAttribute('value', normalized);
  }

  get type() {
    const type = this.getAttribute('type') ?? 'picker';
    return ['check', 'radio', 'picker'].includes(type) ? type : 'picker';
  }

  get selectedValues() {
    return new Set(
      (this.getAttribute('value') ?? '')
        .split(',')
        .map(color => normalizeColor(color))
        .filter(Boolean),
    );
  }

  focus(options) {
    this.root.querySelector('button, input')?.focus(options);
  }

  render() {
    const label = this.getAttribute('label');
    const type = this.type;

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">
      <div part="field" class="field">
        ${label ? `<span part="label" class="label">${escapeHtml(label)}</span>` : ''}
        ${type === 'picker' ? this.renderPicker() : this.renderPalette(type)}
      </div>
    `;

    if (type === 'picker') {
      this.root.querySelector('.native-input')?.addEventListener('input', this.handleNativeInput);
      this.root.querySelector('.native-input')?.addEventListener('change', this.handleNativeInput);
      return;
    }

    this.root.querySelectorAll('.option').forEach(option => {
      option.addEventListener('click', () => this.selectColor(option.dataset.color));
      option.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this.selectColor(option.dataset.color);
        }
      });
    });
  }

  renderPalette(type) {
    const colors = parseColors(this.getAttribute('colors'));
    const disabled = this.hasAttribute('disabled');
    const selectedValues = this.selectedValues;
    const singleValue = normalizeColor(this.getAttribute('value')) || colors[0];

    return `
      <div part="palette" class="palette" role="${type === 'radio' ? 'radiogroup' : 'group'}">
        ${colors.map(color => {
          const selected = type === 'check'
            ? selectedValues.has(color)
            : color === singleValue;

          return `
            <button
              part="option"
              class="option${selected ? ' selected' : ''}${disabled ? ' disabled' : ''}${isLightColor(color) ? ' light' : ''}"
              type="button"
              role="${type === 'radio' ? 'radio' : 'checkbox'}"
              aria-checked="${selected ? 'true' : 'false'}"
              aria-label="${escapeHtml(color)}"
              data-color="${color}"
              style="--swatch-color: ${color}"
              ${disabled ? 'disabled' : ''}
            >
              <svg class="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="m5 12 5 5L20 7"></path>
              </svg>
            </button>
          `;
        }).join('')}
      </div>
    `;
  }

  renderPicker() {
    const disabled = this.hasAttribute('disabled');
    const value = normalizeColor(this.getAttribute('value')) || '#066fd1';

    return `
      <label part="picker" class="picker" style="--swatch-color: ${value}">
        <span part="swatch" class="picker-swatch"></span>
        <input
          part="input"
          class="native-input"
          type="color"
          name="${escapeHtml(this.getAttribute('name') ?? '')}"
          value="${value}"
          ${disabled ? 'disabled' : ''}
        >
      </label>
    `;
  }

  selectColor(color) {
    if (this.hasAttribute('disabled')) return;

    const normalizedColor = normalizeColor(color);
    if (!normalizedColor) return;

    let nextValue = normalizedColor;

    if (this.type === 'check') {
      const selectedValues = this.selectedValues;

      if (selectedValues.has(normalizedColor)) {
        selectedValues.delete(normalizedColor);
      } else {
        selectedValues.add(normalizedColor);
      }

      nextValue = [...selectedValues].join(',');
    }

    this.setValue(nextValue);
  }

  handleNativeInput(event) {
    this.setValue(event.target.value, event.type);
  }

  setValue(value, sourceEventType = 'change') {
    this.reflectingValue = true;
    this.setAttribute('value', value);
    this.reflectingValue = false;

    this.syncSelection();

    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

    if (sourceEventType === 'change') {
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }
  }

  syncSelection() {
    if (this.type === 'picker') {
      const value = normalizeColor(this.getAttribute('value')) || '#066fd1';
      const picker = this.root.querySelector('.picker');
      const input = this.root.querySelector('.native-input');

      picker?.style.setProperty('--swatch-color', value);
      if (input) input.value = value;
      return;
    }

    const selectedValues = this.selectedValues;
    const singleValue = normalizeColor(this.getAttribute('value'));

    this.root.querySelectorAll('.option').forEach(option => {
      const color = option.dataset.color;
      const selected = this.type === 'check'
        ? selectedValues.has(color)
        : color === singleValue;

      option.classList.toggle('selected', selected);
      option.setAttribute('aria-checked', selected ? 'true' : 'false');
    });
  }
}

Component({
  tag: 'tblr-colorpicker',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrColorpicker);

export { TblrColorpicker };
