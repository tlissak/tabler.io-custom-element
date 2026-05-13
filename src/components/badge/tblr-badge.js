import { Component } from '../../core/component.js';

const stylesheetUrl = new URL('./tblr-badge.css', import.meta.url);
const colorMap = new Map([
  ['blue', ['#206bc4', '#ffffff', '#e7f1ff', '#1c5aa6']],
  ['azure', ['#4299e1', '#ffffff', '#eaf5ff', '#2f80c8']],
  ['indigo', ['#4263eb', '#ffffff', '#edf0ff', '#364fc7']],
  ['purple', ['#ae3ec9', '#ffffff', '#f8ecfb', '#9c36b5']],
  ['pink', ['#d6336c', '#ffffff', '#fdebf2', '#c2255c']],
  ['red', ['#d63939', '#ffffff', '#fdecec', '#b92f2f']],
  ['orange', ['#f76707', '#ffffff', '#fff0e6', '#d9480f']],
  ['yellow', ['#f59f00', '#182433', '#fff6d6', '#c47f00']],
  ['lime', ['#74b816', '#ffffff', '#eff8de', '#5c940d']],
  ['green', ['#2fb344', '#ffffff', '#eaf7ec', '#2b963b']],
  ['teal', ['#0ca678', '#ffffff', '#e6f7f2', '#087f5b']],
  ['cyan', ['#17a2b8', '#ffffff', '#e8f7fa', '#0c8599']],
  ['primary', ['#206bc4', '#ffffff', '#e7f1ff', '#1c5aa6']],
  ['secondary', ['#667382', '#ffffff', '#eef1f5', '#4d5968']],
  ['success', ['#2fb344', '#ffffff', '#eaf7ec', '#2b963b']],
  ['warning', ['#f59f00', '#182433', '#fff6d6', '#c47f00']],
  ['danger', ['#d63939', '#ffffff', '#fdecec', '#b92f2f']],
  ['info', ['#4299e1', '#ffffff', '#eaf5ff', '#2f80c8']],
  ['dark', ['#182433', '#ffffff', '#e9edf2', '#182433']],
  ['light', ['#ffffff', '#182433', '#ffffff', '#dce1e7']],
]);
const validSize = new Set(['sm', 'md', 'lg']);

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function isTruthyAttribute(host, name) {
  if (!host.hasAttribute(name)) return false;

  const value = host.getAttribute(name);

  return value !== 'false';
}

function colorToken(value, fallback = 'secondary') {
  return colorMap.has(value) ? value : fallback;
}

function cssColor(value, fallback) {
  if (!value) return fallback;

  if (colorMap.has(value)) {
    return colorMap.get(value)[0];
  }

  if (/^(#[0-9a-f]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|var\()/i.test(value)) {
    return value;
  }

  return fallback;
}

class TblrBadge extends HTMLElement {
  static observedAttributes = [
    'color',
    'variant',
    'light',
    'pill',
    'size',
    'dot',
    'dot-color',
    'animated',
    'blink',
    'href',
    'target',
    'rel',
    'label',
  ];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.handleSlotChange = this.handleSlotChange.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;

    this.render();
  }

  render() {
    const color = colorToken(this.getAttribute('color') ?? 'secondary');
    const [solidBg, solidFg, lightBg, lightFg] = colorMap.get(color);
    const useLight = this.hasAttribute('light') || this.getAttribute('variant') === 'light' || this.getAttribute('variant') === 'soft';
    const bg = useLight ? lightBg : solidBg;
    const fg = useLight ? lightFg : solidFg;
    const border = color === 'light' && !useLight ? 'var(--tblr-border-color, #dce1e7)' : 'transparent';
    const size = validSize.has(this.getAttribute('size')) ? this.getAttribute('size') : 'md';
    const tag = this.getAttribute('href') ? 'a' : 'span';
    const hrefAttrs = tag === 'a' ? this.renderLinkAttributes() : '';
    const dot = isTruthyAttribute(this, 'dot');
    const dotColor = cssColor(this.getAttribute('dot-color'), useLight ? solidBg : 'currentColor');
    const classes = [
      'badge',
      this.hasAttribute('pill') ? 'badge-pill' : '',
      size !== 'md' ? `badge-${size}` : '',
      dot ? 'badge-dot' : '',
      dot && isTruthyAttribute(this, 'animated') ? 'badge-dot-animated' : '',
      isTruthyAttribute(this, 'blink') ? 'badge-blink' : '',
      tag === 'a' ? 'badge-link' : '',
    ].filter(Boolean).join(' ');

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">
      <${tag}
        part="badge"
        class="${classes}"
        style="${escapeHtml([
          `--tblr-badge-bg: ${bg}`,
          `--tblr-badge-color: ${fg}`,
          `--tblr-badge-border-color: ${border}`,
          `--tblr-badge-dot-color: ${dotColor}`,
        ].join('; '))}"
        ${hrefAttrs}
        ${this.getAttribute('label') ? `aria-label="${escapeHtml(this.getAttribute('label'))}"` : ''}
      >
        ${dot ? '<span part="dot" class="dot" aria-hidden="true"></span>' : ''}
        <span part="content" class="content"><slot></slot></span>
      </${tag}>
    `;

    this.root.querySelector('slot')?.addEventListener('slotchange', this.handleSlotChange);
    this.updateEmptyState();
  }

  renderLinkAttributes() {
    const href = this.getAttribute('href') ?? '';
    const target = this.getAttribute('target');
    const rel = this.getAttribute('rel') || (target === '_blank' ? 'noopener noreferrer' : '');

    return [
      `href="${escapeHtml(href)}"`,
      target ? `target="${escapeHtml(target)}"` : '',
      rel ? `rel="${escapeHtml(rel)}"` : '',
    ].filter(Boolean).join(' ');
  }

  handleSlotChange() {
    this.updateEmptyState();
  }

  updateEmptyState() {
    const badge = this.root.querySelector('.badge');
    const slot = this.root.querySelector('slot');
    const hasContent = slot?.assignedNodes({ flatten: true }).some(node => (
      node.nodeType === Node.ELEMENT_NODE || (node.textContent ?? '').trim()
    ));

    badge?.classList.toggle('badge-dot-only', this.hasAttribute('dot') && !hasContent);
  }
}

Component({
  tag: 'tblr-badge',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrBadge);

export { TblrBadge };
