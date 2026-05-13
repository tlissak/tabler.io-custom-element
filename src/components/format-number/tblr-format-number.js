import { Component } from '../../core/component.js';

const stylesheetUrl = new URL('./tblr-format-number.css', import.meta.url);
const positions = new Set(['left', 'right']);

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function safePosition(value) {
  return positions.has(value) ? value : 'left';
}

function clampPrecision(value) {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed >= 0 ? Math.min(parsed, 20) : null;
}

function inferPrecision(value) {
  const match = String(value ?? '').trim().match(/[.,](\d+)(?:[^\d]*)$/);

  return match ? Math.min(match[1].length, 20) : 0;
}

function readSeparator(value, fallback) {
  if (value == null) return fallback;
  if (value === 'none') return '';
  if (value === 'space') return ' ';

  return value;
}

function parseNumericValue(value, decimalSeparator) {
  const raw = String(value ?? '').trim();

  if (!raw) return NaN;

  const direct = Number(raw);

  if (Number.isFinite(direct)) return direct;

  const decimal = decimalSeparator || '.';
  const decimalIndex = raw.lastIndexOf(decimal);
  const normalized = raw
    .replace(/[^\d+\-.,]/g, '')
    .split('')
    .filter((char, index) => {
      if (/\d/.test(char)) return true;
      if ((char === '+' || char === '-') && index === 0) return true;
      return index === decimalIndex;
    })
    .join('')
    .replace(decimal, '.');

  return Number(normalized);
}

function groupInteger(value, separator) {
  if (!separator) return value;

  return value.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

class TblrFormatNumber extends HTMLElement {
  static observedAttributes = [
    'value',
    'decimal-separator',
    'thousand-separator',
    'currency-symbol',
    'symbol-position',
    'symbol-space',
    'precision',
    'fallback',
  ];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.observer = new MutationObserver(() => {
      if (!this.hasAttribute('value')) {
        this.render();
      }
    });
  }

  connectedCallback() {
    this.render();
    this.observer.observe(this, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  disconnectedCallback() {
    this.observer.disconnect();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;

    this.render();
  }

  get value() {
    return this.getAttribute('value') ?? this.textContent.trim();
  }

  set value(value) {
    this.setAttribute('value', value ?? '');
  }

  get formattedValue() {
    return this.format();
  }

  render() {
    const formatted = this.format();
    const symbol = this.getAttribute('currency-symbol') ?? '';
    const position = safePosition(this.getAttribute('symbol-position') ?? 'left');
    const spaceValue = this.getAttribute('symbol-space');
    const space = spaceValue !== null ? (spaceValue || ' ') : '';
    const symbolMarkup = symbol ? `<span part="symbol" class="symbol">${escapeHtml(symbol)}</span>` : '';
    const valueMarkup = `<span part="value" class="value">${escapeHtml(formatted)}</span>`;
    const content = position === 'right'
      ? `${valueMarkup}${space}${symbolMarkup}`
      : `${symbolMarkup}${space}${valueMarkup}`;
    const labelSpace = space ? ' ' : '';
    const label = symbol ? `${position === 'right' ? `${formatted}${labelSpace}${symbol}` : `${symbol}${labelSpace}${formatted}`}` : formatted;

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">
      <span part="number" class="number" aria-label="${escapeHtml(label)}">${content}</span>
    `;
  }

  format() {
    const rawValue = this.value;
    const decimalSeparator = readSeparator(this.getAttribute('decimal-separator'), '.');
    const thousandSeparator = readSeparator(this.getAttribute('thousand-separator'), ',');
    const precision = clampPrecision(this.getAttribute('precision')) ?? inferPrecision(rawValue);
    const number = parseNumericValue(rawValue, decimalSeparator);

    if (!Number.isFinite(number)) {
      return this.getAttribute('fallback') ?? '';
    }

    const negative = number < 0;
    const fixed = Math.abs(number).toFixed(precision);
    const [integer, decimal = ''] = fixed.split('.');
    const groupedInteger = groupInteger(integer, thousandSeparator);
    const formatted = precision > 0
      ? `${groupedInteger}${decimalSeparator}${decimal}`
      : groupedInteger;

    return negative ? `-${formatted}` : formatted;
  }
}

Component({
  tag: 'tblr-format-number',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrFormatNumber);

export { TblrFormatNumber };
