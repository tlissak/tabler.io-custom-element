import { Component } from '../../core/component.js';

const stylesheetUrl = new URL('./tblr-progress.css', import.meta.url);
const colors = new Set([
  'primary',
  'secondary',
  'blue',
  'azure',
  'indigo',
  'purple',
  'pink',
  'red',
  'orange',
  'yellow',
  'lime',
  'green',
  'teal',
  'cyan',
  'danger',
  'warning',
  'success',
  'info',
  'dark',
]);
const sizes = new Set(['xs', 'sm', 'md', 'lg']);

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function safeToken(value, fallback, allowedValues) {
  return allowedValues.has(value) ? value : fallback;
}

function booleanAttribute(host, name) {
  if (!host.hasAttribute(name)) return false;

  return host.getAttribute(name) !== 'false';
}

function numberAttribute(host, name, fallback) {
  const value = Number.parseFloat(host.getAttribute(name) ?? '');

  return Number.isFinite(value) ? value : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

class TblrProgress extends HTMLElement {
  static observedAttributes = [
    'value',
    'max',
    'label',
    'show-value',
    'indeterminate',
    'color',
    'size',
    'striped',
    'animated',
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

  get value() {
    return numberAttribute(this, 'value', 0);
  }

  set value(value) {
    this.setAttribute('value', value ?? '0');
  }

  get max() {
    return Math.max(numberAttribute(this, 'max', 100), 0.000001);
  }

  set max(value) {
    this.setAttribute('max', value ?? '100');
  }

  get percent() {
    return clamp((this.value / this.max) * 100, 0, 100);
  }

  render() {
    const indeterminate = booleanAttribute(this, 'indeterminate');
    const color = safeToken(this.getAttribute('color') ?? 'primary', 'primary', colors);
    const size = safeToken(this.getAttribute('size') ?? 'md', 'md', sizes);
    const label = this.getAttribute('label') ?? (indeterminate ? 'Loading' : `${Math.round(this.percent)}%`);
    const showValue = booleanAttribute(this, 'show-value') && !indeterminate;
    const striped = booleanAttribute(this, 'striped');
    const animated = booleanAttribute(this, 'animated');
    const classes = [
      'progress',
      `progress-${size}`,
      `progress-${color}`,
      indeterminate ? 'progress-indeterminate' : '',
      striped ? 'progress-striped' : '',
      animated ? 'progress-animated' : '',
    ].filter(Boolean).join(' ');

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">

      <div part="base" class="progress-field">
        ${this.hasAttribute('label') || showValue ? `
          <div part="header" class="progress-header">
            ${this.hasAttribute('label') ? `<span part="label" class="label">${escapeHtml(this.getAttribute('label'))}</span>` : '<span></span>'}
            ${showValue ? `<span part="value" class="value">${escapeHtml(`${Math.round(this.percent)}%`)}</span>` : ''}
          </div>
        ` : ''}
        <div
          part="track"
          class="${classes}"
          role="progressbar"
          aria-label="${escapeHtml(label)}"
          ${indeterminate ? '' : `aria-valuemin="0" aria-valuemax="${escapeHtml(this.max)}" aria-valuenow="${escapeHtml(clamp(this.value, 0, this.max))}"`}
        >
          <div
            part="indicator"
            class="progress-bar"
            style="${indeterminate ? '' : `width: ${this.percent}%`}"
          ></div>
        </div>
      </div>
    `;
  }
}

Component({
  tag: 'tblr-progress',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrProgress);

export { TblrProgress };
