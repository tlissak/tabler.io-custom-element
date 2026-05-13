import { Component } from '../../core/component.js';

const stylesheetUrl = new URL('./tblr-flex.css', import.meta.url);
const gapTokens = new Map([
  ['none', '0'],
  ['xs', '0.25rem'],
  ['sm', '0.5rem'],
  ['md', '1rem'],
  ['lg', '1.5rem'],
  ['xl', '2rem'],
]);
const directionValues = new Set(['row', 'row-reverse', 'column', 'column-reverse']);
const alignValues = new Map([
  ['start', 'flex-start'],
  ['center', 'center'],
  ['end', 'flex-end'],
  ['stretch', 'stretch'],
  ['baseline', 'baseline'],
]);
const justifyValues = new Map([
  ['start', 'flex-start'],
  ['center', 'center'],
  ['end', 'flex-end'],
  ['between', 'space-between'],
  ['around', 'space-around'],
  ['evenly', 'space-evenly'],
]);

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function cssLength(value, fallback) {
  if (!value) return fallback;

  if (gapTokens.has(value)) {
    return gapTokens.get(value);
  }

  if (/^\d+(\.\d+)?(px|rem|em|%|vw|vh|ch)$/.test(value)) {
    return value;
  }

  return fallback;
}

function cssBasis(value, fallback) {
  if (!value) return fallback;

  if (value === 'auto' || value === 'content' || value === '0') {
    return value;
  }

  return cssLength(value, fallback);
}

function numberValue(value, fallback) {
  const parsed = Number.parseFloat(value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function integerValue(value, fallback) {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function mappedToken(value, fallback, values) {
  return values.get(value) ?? fallback;
}

function safeDirection(value) {
  return directionValues.has(value) ? value : 'row';
}

function wrapValue(host) {
  if (!host.hasAttribute('wrap')) return 'nowrap';

  const value = host.getAttribute('wrap');

  if (value === '' || value === 'wrap') return 'wrap';
  if (value === 'nowrap') return 'nowrap';
  if (value === 'reverse' || value === 'wrap-reverse') return 'wrap-reverse';

  return 'wrap';
}

class TblrFlex extends HTMLElement {
  static observedAttributes = [
    'direction',
    'wrap',
    'gap',
    'row-gap',
    'column-gap',
    'align',
    'justify',
    'inline',
  ];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;

    this.render();
  }

  render() {
    const direction = safeDirection(this.getAttribute('direction') ?? 'row');
    const gap = cssLength(this.getAttribute('gap'), '1rem');
    const rowGap = cssLength(this.getAttribute('row-gap'), gap);
    const columnGap = cssLength(this.getAttribute('column-gap'), gap);
    const align = mappedToken(this.getAttribute('align') ?? 'stretch', 'stretch', alignValues);
    const justify = mappedToken(this.getAttribute('justify') ?? 'start', 'flex-start', justifyValues);
    const display = this.hasAttribute('inline') ? 'inline-flex' : 'flex';

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">

      <div
        part="flex"
        class="flex"
        style="${escapeHtml([
          `--tblr-flex-display: ${display}`,
          `--tblr-flex-direction: ${direction}`,
          `--tblr-flex-wrap: ${wrapValue(this)}`,
          `--tblr-flex-row-gap: ${rowGap}`,
          `--tblr-flex-column-gap: ${columnGap}`,
          `--tblr-flex-align-items: ${align}`,
          `--tblr-flex-justify-content: ${justify}`,
        ].join('; '))}"
      >
        <slot></slot>
      </div>
    `;
  }
}

class TblrFlexItem extends HTMLElement {
  static observedAttributes = ['grow', 'shrink', 'basis', 'align', 'order'];

  connectedCallback() {
    this.updateStyles();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    this.updateStyles();
  }

  updateStyles() {
    const grow = numberValue(this.getAttribute('grow'), 0);
    const shrink = numberValue(this.getAttribute('shrink'), 1);
    const basis = cssBasis(this.getAttribute('basis'), 'auto');
    const align = mappedToken(this.getAttribute('align') ?? '', '', alignValues);
    const order = integerValue(this.getAttribute('order'), 0);

    this.style.setProperty('--tblr-flex-item-grow', String(grow));
    this.style.setProperty('--tblr-flex-item-shrink', String(shrink));
    this.style.setProperty('--tblr-flex-item-basis', basis);
    this.style.setProperty('--tblr-flex-item-order', String(order));

    if (align) {
      this.style.setProperty('--tblr-flex-item-align-self', align);
    } else {
      this.style.removeProperty('--tblr-flex-item-align-self');
    }
  }
}

Component({
  tag: 'tblr-flex',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrFlex);

Component({
  tag: 'tblr-flex-item',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrFlexItem);

export { TblrFlex, TblrFlexItem };
