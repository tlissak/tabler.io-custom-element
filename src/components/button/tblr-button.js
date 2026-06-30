import { Component } from '../../core/component.js';
import { badgeColorMap, badgeColorToken } from '../badge/badge-colors.js';

const stylesheetUrl = new URL('./tblr-button.css', import.meta.url);
const variants = new Set(['primary', 'secondary', 'success', 'warning', 'danger', 'info', 'dark', 'light']);
const appearances = new Set(['filled', 'outline', 'ghost']);
const sizes = new Set(['xs', 'sm', 'md', 'lg', 'xl']);
const states = new Set(['default', 'hover', 'focus', 'active']);
const legacyVariants = new Map([
  ['default', 'light'],
  ['neutral', 'light'],
  ['text', 'light'],
]);
const legacySizes = new Map([
  ['small', 'sm'],
  ['medium', 'md'],
  ['large', 'lg'],
]);

function safeToken(value, fallback, allowedValues) {
  return allowedValues.has(value) ? value : fallback;
}

function normalizedToken(value, aliases) {
  return aliases.get(value) ?? value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

class TblrButton extends HTMLElement {
  static observedAttributes = [
    'variant',
    'color',
    'appearance',
    'outline',
    'size',
    'type',
    'disabled',
    'loading',
    'href',
    'target',
    'rel',
    'circle',
    'caret',
    'square',
    'icon-only',
    'action',
    'label',
    'state',
  ];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.handleClick = this.handleClick.bind(this);
    this.updateSlotVisibility = this.updateSlotVisibility.bind(this);
  }

  connectedCallback() {
    this.render();
    this.root.addEventListener('click', this.handleClick);
  }

  disconnectedCallback() {
    this.root.removeEventListener('click', this.handleClick);
  }

  attributeChangedCallback() {
    this.render();
  }

  get variant() {
    return this.getAttribute('variant') ?? 'primary';
  }

  set variant(value) {
    this.setAttribute('variant', value ?? 'primary');
  }

  get color() {
    return this.getAttribute('color') ?? null;
  }

  set color(value) {
    if (value == null) {
      this.removeAttribute('color');
    } else {
      this.setAttribute('color', value);
    }
  }

  get size() {
    return this.getAttribute('size') ?? 'md';
  }

  set size(value) {
    this.setAttribute('size', value ?? 'md');
  }

  get disabled() {
    return this.hasAttribute('disabled');
  }

  set disabled(value) {
    this.toggleAttribute('disabled', Boolean(value));
  }

  get loading() {
    return this.hasAttribute('loading');
  }

  set loading(value) {
    this.toggleAttribute('loading', Boolean(value));
  }

  render() {
    const requestedVariant = this.getAttribute('variant') ?? 'primary';
    const normalizedVariant = normalizedToken(requestedVariant, legacyVariants);
    const variant = safeToken(normalizedVariant, 'primary', variants);
    const colorSource = this.getAttribute('color') ?? (badgeColorMap.has(normalizedVariant) ? normalizedVariant : null);
    const color = colorSource ? badgeColorToken(colorSource, variant) : null;
    const colorStyles = color ? this.renderColorStyles(color) : '';
    const appearance = this.hasAttribute('outline')
      ? 'outline'
      : safeToken(this.getAttribute('appearance') ?? (requestedVariant === 'text' ? 'ghost' : 'filled'), 'filled', appearances);
    const size = safeToken(normalizedToken(this.getAttribute('size') ?? 'md', legacySizes), 'md', sizes);
    const type = this.getAttribute('type') ?? 'button';
    const loading = this.loading;
    const disabled = this.disabled || loading;
    const label = this.getAttribute('label');
    const iconOnly = this.hasAttribute('icon-only') || this.hasAttribute('circle') || this.hasAttribute('action');
    const action = this.hasAttribute('action');
    const state = safeToken(this.getAttribute('state') ?? 'default', 'default', states);
    const href = this.getAttribute('href');
    const target = this.getAttribute('target');
    const rel = this.getAttribute('rel');
    const tag = href ? 'a' : 'button';
    const buttonAttributes = href
      ? `href="${escapeHtml(href)}"${target ? ` target="${escapeHtml(target)}"` : ''}${rel ? ` rel="${escapeHtml(rel)}"` : ''}`
      : `type="${escapeHtml(type)}"${disabled ? ' disabled' : ''}`;

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">

      <${tag}
        part="button"
        class="btn btn-${variant} btn-${appearance} btn-${size}${iconOnly ? ' btn-icon-only' : ''}${action ? ' btn-action' : ''}${action && state !== 'default' ? ` is-${state}` : ''}"
        ${colorStyles ? `style="${escapeHtml(colorStyles)}"` : ''}
        ${buttonAttributes}
        ${label ? `aria-label="${escapeHtml(label)}"` : ''}
        ${disabled && href ? 'aria-disabled="true" tabindex="-1"' : ''}
      >
        ${loading ? '<tblr-spinner aria-hidden="true"></tblr-spinner>' : ''}
        <span part="prefix" class="prefix" hidden><slot name="prefix"></slot></span>
        <slot></slot>
        <span part="suffix" class="suffix" hidden><slot name="suffix"></slot></span>
        ${this.hasAttribute('caret') ? '<tblr-icon name="chevron-down" aria-hidden="true"></tblr-icon>' : ''}
      </${tag}>
    `;

    this.root.querySelectorAll('slot[name="prefix"], slot[name="suffix"]').forEach(slot => {
      slot.addEventListener('slotchange', this.updateSlotVisibility);
    });
    this.updateSlotVisibility();
  }

  renderColorStyles(color) {
    const [background, foreground, , strong] = badgeColorMap.get(color);
    const border = color === 'light' ? 'var(--tblr-border-color, #dce1e7)' : background;

    return [
      `--tblr-button-variant-bg: ${background}`,
      `--tblr-button-variant-hover-bg: ${strong}`,
      `--tblr-button-variant-active-bg: ${strong}`,
      `--tblr-button-variant-color: ${foreground}`,
      `--tblr-button-variant-border-color: ${border}`,
      `--tblr-button-variant-outline-color: ${color === 'light' ? border : background}`,
    ].join('; ');
  }

  updateSlotVisibility() {
    this.root.querySelectorAll('slot[name="prefix"], slot[name="suffix"]').forEach(slot => {
      const wrapper = slot.parentElement;
      const hasContent = slot.assignedNodes({ flatten: true }).some(node => (
        node.nodeType !== Node.TEXT_NODE || node.textContent.trim() !== ''
      ));

      wrapper.hidden = !hasContent;
    });
  }

  handleClick(event) {
    if (this.disabled || this.loading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (this.hasAttribute('href')) return;

    const type = (this.getAttribute('type') ?? 'button').toLowerCase();
    const form = this.closest('form');

    if (!form || this.closest('tblr-form')) return;

    if (type === 'submit') {
      event.preventDefault();
      form.requestSubmit();
    } else if (type === 'reset') {
      event.preventDefault();
      form.reset();
    }
  }
}

Component({
  tag: 'tblr-button',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrButton);

export { TblrButton };
