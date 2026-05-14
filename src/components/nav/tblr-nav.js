import { Component } from '../../core/component.js';

const navStylesheetUrl = new URL('./tblr-nav.css', import.meta.url);
const itemStylesheetUrl = new URL('./tblr-nav-item.css', import.meta.url);
const orientationValues = new Set(['horizontal', 'vertical']);

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

function itemLabel(item) {
  const label = item.getAttribute('label');

  if (label != null) return label;

  return Array.from(item.childNodes)
    .filter(node => node.nodeType === Node.TEXT_NODE)
    .map(node => node.textContent.trim())
    .filter(Boolean)
    .join(' ');
}

class TblrNav extends HTMLElement {
  static observedAttributes = ['orientation', 'vertical', 'label'];

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

  get orientation() {
    if (this.hasAttribute('vertical')) return 'vertical';

    return safeToken(
      this.getAttribute('orientation') ?? 'horizontal',
      'horizontal',
      orientationValues
    );
  }

  render() {
    const orientation = this.orientation;
    const label = this.getAttribute('label') ?? 'Navigation';

    this.root.innerHTML = `
      <link rel="stylesheet" href="${navStylesheetUrl}">

      <nav
        part="nav"
        class="nav nav-${orientation}"
        aria-label="${escapeHtml(label)}"
        aria-orientation="${orientation}"
      >
        <slot></slot>
      </nav>
    `;

    this.syncItems();
  }

  syncItems() {
    this.querySelectorAll(':scope > tblr-nav-item').forEach(item => {
      item.syncFromParent?.();
    });
  }
}

class TblrNavItem extends HTMLElement {
  static observedAttributes = [
    'label',
    'href',
    'target',
    'rel',
    'active',
    'disabled',
    'open',
    'align',
  ];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.handleClick = this.handleClick.bind(this);
    this.parentObserver = new MutationObserver(() => this.render());
    this.childObserver = new MutationObserver(() => this.render());
  }

  connectedCallback() {
    this.render();
    this.observeParentNav();
    this.childObserver.observe(this, {
      childList: true,
      subtree: false,
    });
  }

  disconnectedCallback() {
    this.parentObserver.disconnect();
    this.childObserver.disconnect();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;

    this.render();
  }

  syncFromParent() {
    if (!this.isConnected) return;

    this.render();
  }

  get parentNav() {
    return this.parentElement?.closest('tblr-nav');
  }

  get orientation() {
    return this.parentNav?.orientation ?? 'horizontal';
  }

  get childItems() {
    return Array.from(this.children).filter(child => child.localName === 'tblr-nav-item');
  }

  get hasChildren() {
    return this.childItems.length > 0;
  }

  render() {
    this.assignChildSlots();

    const label = itemLabel(this);
    const href = this.getAttribute('href');
    const target = this.getAttribute('target');
    const rel = this.getAttribute('rel') || (target === '_blank' ? 'noopener noreferrer' : '');
    const active = booleanAttribute(this, 'active');
    const disabled = booleanAttribute(this, 'disabled');
    const open = booleanAttribute(this, 'open');
    const collapsible = this.hasChildren && this.orientation === 'vertical';
    const tag = href && !collapsible ? 'a' : 'button';
    const linkAttrs = tag === 'a'
      ? this.renderLinkAttributes(href, target, rel, disabled)
      : `type="button"${disabled ? ' disabled' : ''}`;
    const expandedAttrs = collapsible ? ` aria-expanded="${open ? 'true' : 'false'}"` : '';
    const disabledClass = disabled ? ' disabled' : '';
    const activeClass = active ? ' active' : '';

    this.root.innerHTML = `
      <link rel="stylesheet" href="${itemStylesheetUrl}">

      <div part="item" class="item${open ? ' open' : ''}">
        <${tag}
          part="link"
          class="nav-link${activeClass}${disabledClass}"
          ${linkAttrs}
          ${expandedAttrs}
          ${active ? 'aria-current="page"' : ''}
        >
          <span part="icon" class="icon"><slot name="icon"></slot></span>
          <span part="label" class="label">${escapeHtml(label)}</span>
          <span part="suffix" class="suffix"><slot name="suffix"></slot></span>
          ${collapsible ? '<span part="chevron" class="chevron" aria-hidden="true"><svg style="height: 1.7em;width: 1.7em;" fill="currentColor"><path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"></path></svg></span>' : ''}
        </${tag}>

        ${collapsible ? '<div part="children" class="children"><slot name="children"></slot></div>' : ''}
      </div>
    `;

    this.root.querySelector('.nav-link')?.addEventListener('click', this.handleClick);
  }

  renderLinkAttributes(href, target, rel, disabled) {
    if (disabled) {
      return 'aria-disabled="true" tabindex="-1"';
    }

    return [
      `href="${escapeHtml(href)}"`,
      target ? `target="${escapeHtml(target)}"` : '',
      rel ? `rel="${escapeHtml(rel)}"` : '',
    ].filter(Boolean).join(' ');
  }

  handleClick(event) {
    if (booleanAttribute(this, 'disabled')) {
      event.preventDefault();
      return;
    }

    if (!this.hasChildren || this.orientation !== 'vertical') return;

    event.preventDefault();
    const open = !booleanAttribute(this, 'open');
    this.toggleAttribute('open', open);
    this.dispatchEvent(new CustomEvent('toggle', {
      bubbles: true,
      composed: true,
      detail: { open },
    }));
  }

  assignChildSlots() {
    this.childItems.forEach(child => {
      if (child.slot !== 'children') {
        child.slot = 'children';
      }
    });
  }

  observeParentNav() {
    const nav = this.parentNav;

    this.parentObserver.disconnect();

    if (!nav) return;

    this.parentObserver.observe(nav, {
      attributes: true,
      attributeFilter: ['orientation', 'vertical'],
    });
  }
}

Component({
  tag: 'tblr-nav',
  version: '1.0.0',
  styles: navStylesheetUrl.href,
})(TblrNav);

Component({
  tag: 'tblr-nav-item',
  version: '1.0.0',
  styles: itemStylesheetUrl.href,
})(TblrNavItem);

export { TblrNav, TblrNavItem };
