import { Component } from '../../core/component.js';
import { badgeColorMap, badgeColorToken, badgeCssColor } from './badge-colors.js';

const stylesheetUrl = new URL('./tblr-badge.css', import.meta.url);
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
    const color = badgeColorToken(this.getAttribute('color') ?? 'secondary');
    const [solidBg, solidFg, lightBg, lightFg] = badgeColorMap.get(color);
    const useLight = this.hasAttribute('light') || this.getAttribute('variant') === 'light' || this.getAttribute('variant') === 'soft';
    const bg = useLight ? lightBg : solidBg;
    const fg = useLight ? lightFg : solidFg;
    const border = color === 'light' && !useLight ? 'var(--tblr-border-color, #dce1e7)' : 'transparent';
    const size = validSize.has(this.getAttribute('size')) ? this.getAttribute('size') : 'md';
    const tag = this.getAttribute('href') ? 'a' : 'span';
    const hrefAttrs = tag === 'a' ? this.renderLinkAttributes() : '';
    const dot = isTruthyAttribute(this, 'dot');
    const dotColor = badgeCssColor(this.getAttribute('dot-color'), useLight ? solidBg : 'currentColor');
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
