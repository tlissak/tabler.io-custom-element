import { Component } from '../../core/component.js';

const stylesheetUrl = new URL('./tblr-card.css', import.meta.url);

class TblrCard extends HTMLElement {
  static observedAttributes = ['title', 'subtitle', 'header', 'header-bg', 'no-border', 'footer', 'middle'];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (!this.isConnected) return;

    this.render();
  }

  render() {
    const title = this.getAttribute('title');
    const subtitle = this.getAttribute('subtitle');
    const hasHeading = title || subtitle;
    const headingInHeader = this.hasAttribute('header') || this.hasAttribute('header-bg');
    const footer = this.getAttribute('footer');

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">

      <article part="card" class="card">
        <header part="header" class="card-header" hidden>
          <slot name="header">${this.renderHeading('header')}</slot>
        </header>

        <div part="body" class="card-body">
          ${this.renderHeading('body')}
          <div part="content" class="card-content">
            <slot></slot>
          </div>
        </div>

        <footer part="footer" class="card-footer" hidden>
          <slot name="footer">${footer ? '<span class="card-footer-text"></span>' : ''}</slot>
        </footer>
      </article>
    `;

    if (hasHeading) {
      this.root.querySelectorAll('.card-title').forEach(el => el.textContent = title ?? '');
      this.root.querySelectorAll('.card-subtitle').forEach(el => el.textContent = subtitle ?? '');
    }

    const footerTextEl = this.root.querySelector('.card-footer-text');
    if (footerTextEl) {
      footerTextEl.textContent = footer ?? '';
    }

    const headerSlot = this.root.querySelector('slot[name="header"]');
    const footerSlot = this.root.querySelector('slot[name="footer"]');

    headerSlot?.addEventListener('slotchange', () => this.updateHeaderVisibility());
    footerSlot?.addEventListener('slotchange', () => this.updateFooterVisibility());

    this.updateHeaderVisibility();
    this.updateFooterVisibility();

    // Re-check after a microtask to ensure distribution has happened
    Promise.resolve().then(() => {
      this.updateHeaderVisibility();
      this.updateFooterVisibility();
    });
  }

  renderHeading(location) {
    const title = this.getAttribute('title');
    const subtitle = this.getAttribute('subtitle');
    const headingInHeader = this.hasAttribute('header') || this.hasAttribute('header-bg');

    const shouldRenderInLocation = (location === 'header' && headingInHeader) || (location === 'body' && !headingInHeader);

    if (!shouldRenderInLocation || (!title && !subtitle)) {
      return '';
    }

    return `
      ${title ? '<h3 part="title" class="card-title"></h3>' : ''}
      ${subtitle ? '<p part="subtitle" class="card-subtitle"></p>' : ''}
    `;
  }

  updateHeaderVisibility() {
    const header = this.root.querySelector('.card-header');
    const headerSlot = this.root.querySelector('slot[name="header"]');

    if (!header || !headerSlot) return;

    const hasHeaderAttribute = this.hasAttribute('header') || this.hasAttribute('header-bg');
    const hasSlottedHeader = headerSlot
      .assignedNodes({ flatten: true })
      .some(node => node.nodeType === Node.ELEMENT_NODE || node.textContent.trim());

    const hasLightDomHeader = !!this.querySelector('[slot="header"]');

    header.hidden = !hasHeaderAttribute && !hasSlottedHeader && !hasLightDomHeader;
  }

  updateFooterVisibility() {
    const footer = this.root.querySelector('.card-footer');
    const footerSlot = this.root.querySelector('slot[name="footer"]');

    if (!footer || !footerSlot) return;

    const hasFooterAttribute = this.hasAttribute('footer');
    const hasSlottedFooter = footerSlot
      .assignedNodes({ flatten: true })
      .some(node => node.nodeType === Node.ELEMENT_NODE || node.textContent.trim());

    const hasLightDomFooter = !!this.querySelector('[slot="footer"]');

    footer.hidden = !hasFooterAttribute && !hasSlottedFooter && !hasLightDomFooter;
  }
}

Component({
  tag: 'tblr-card',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrCard);

export { TblrCard };
