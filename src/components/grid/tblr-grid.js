import { Component } from '../../core/component.js';

const stylesheetUrl = new URL('./tblr-grid.css', import.meta.url);
const gapTokens = new Map([
  ['none', '0'],
  ['xs', '0.25rem'],
  ['sm', '0.5rem'],
  ['md', '1rem'],
  ['lg', '1.5rem'],
  ['xl', '2rem'],
]);
const alignValues = new Set(['start', 'center', 'end', 'stretch']);
const justifyValues = new Set(['start', 'center', 'end', 'stretch']);
const responsiveBreakpoints = ['sm', 'md', 'lg', 'xl', 'xxl'];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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

function safeToken(value, fallback, allowedValues) {
  return allowedValues.has(value) ? value : fallback;
}

class TblrGrid extends HTMLElement {
  static observedAttributes = [
    'columns',
    ...responsiveBreakpoints.map(breakpoint => `columns-${breakpoint}`),
    'min',
    'gap',
    'row-gap',
    'column-gap',
    'align',
    'justify',
    'dense',
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
    const columns = positiveInteger(this.getAttribute('columns'), 0);
    const min = cssLength(this.getAttribute('min'), '14rem');
    const gap = cssLength(this.getAttribute('gap'), '1rem');
    const rowGap = cssLength(this.getAttribute('row-gap'), gap);
    const columnGap = cssLength(this.getAttribute('column-gap'), gap);
    const align = safeToken(this.getAttribute('align') ?? 'stretch', 'stretch', alignValues);
    const justify = safeToken(this.getAttribute('justify') ?? 'stretch', 'stretch', justifyValues);
    const template = columns > 0
      ? `repeat(${columns}, minmax(0, 1fr))`
      : `repeat(auto-fit, minmax(min(${min}, 100%), 1fr))`;
    let responsiveTemplate = template;
    const responsiveStyles = responsiveBreakpoints.map(breakpoint => {
      const breakpointColumns = positiveInteger(this.getAttribute(`columns-${breakpoint}`), 0);

      if (breakpointColumns > 0) {
        responsiveTemplate = `repeat(${breakpointColumns}, minmax(0, 1fr))`;
      }

      return `--tblr-grid-template-columns-${breakpoint}: ${responsiveTemplate}`;
    });

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">

      <div
        part="grid"
        class="grid${this.hasAttribute('dense') ? ' grid-dense' : ''}"
        style="${escapeHtml([
          `--tblr-grid-template-columns: ${template}`,
          `--tblr-grid-row-gap: ${rowGap}`,
          `--tblr-grid-column-gap: ${columnGap}`,
          `--tblr-grid-align-items: ${align}`,
          `--tblr-grid-justify-items: ${justify}`,
          ...responsiveStyles,
        ].join('; '))}"
      >
        <slot></slot>
      </div>
    `;
  }
}

class TblrGridItem extends HTMLElement {
  static observedAttributes = [
    'span',
    ...responsiveBreakpoints.map(breakpoint => `span-${breakpoint}`),
    'row-span',
    'align',
    'justify',
  ];

  connectedCallback() {
    this.updateStyles();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    this.updateStyles();
  }

  updateStyles() {
    const span = positiveInteger(this.getAttribute('span'), 1);
    const rowSpan = positiveInteger(this.getAttribute('row-span'), 1);
    const align = safeToken(this.getAttribute('align') ?? '', '', alignValues);
    const justify = safeToken(this.getAttribute('justify') ?? '', '', justifyValues);

    this.style.setProperty('--tblr-grid-item-column-span', String(span));
    this.style.setProperty('--tblr-grid-item-row-span', String(rowSpan));

    let responsiveSpan = span;
    responsiveBreakpoints.forEach(breakpoint => {
      responsiveSpan = positiveInteger(this.getAttribute(`span-${breakpoint}`), responsiveSpan);
      this.style.setProperty(`--tblr-grid-item-column-span-${breakpoint}`, String(responsiveSpan));
    });

    if (align) {
      this.style.setProperty('--tblr-grid-item-align-self', align);
    } else {
      this.style.removeProperty('--tblr-grid-item-align-self');
    }

    if (justify) {
      this.style.setProperty('--tblr-grid-item-justify-self', justify);
    } else {
      this.style.removeProperty('--tblr-grid-item-justify-self');
    }
  }
}

Component({
  tag: 'tblr-grid',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrGrid);

Component({
  tag: 'tblr-grid-item',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrGridItem);

export { TblrGrid, TblrGridItem };
