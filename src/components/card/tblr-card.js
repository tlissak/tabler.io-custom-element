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
        ${headingInHeader ? this.renderHeading('header') : ''}

        <div part="body" class="card-body">
          ${!headingInHeader ? this.renderHeading('body') : ''}
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
      const titleEl = this.root.querySelector('.card-title');
      const subtitleEl = this.root.querySelector('.card-subtitle');

      if (titleEl) titleEl.textContent = title ?? '';
      if (subtitleEl) subtitleEl.textContent = subtitle ?? '';
    }

    const footerTextEl = this.root.querySelector('.card-footer-text');
    const footerSlot = this.root.querySelector('slot[name="footer"]');

    if (footerTextEl) {
      footerTextEl.textContent = footer ?? '';
    }

    footerSlot?.addEventListener('slotchange', () => this.updateFooterVisibility());
    this.updateFooterVisibility();
  }

  renderHeading(location) {
    const title = this.getAttribute('title');
    const subtitle = this.getAttribute('subtitle');
    const hasHeading = title || subtitle;

    if (!hasHeading) {
      return location === 'header'
        ? '<header part="header" class="card-header"><slot name="header"></slot></header>'
        : '';
    }

    const heading = `
      ${title ? '<h3 part="title" class="card-title"></h3>' : ''}
      ${subtitle ? '<p part="subtitle" class="card-subtitle"></p>' : ''}
    `;

    if (location === 'header') {
      return `
        <header part="header" class="card-header">
          <slot name="header">${heading}</slot>
        </header>
      `;
    }

    return heading;
  }

  updateFooterVisibility() {
    const footer = this.root.querySelector('.card-footer');
    const footerSlot = this.root.querySelector('slot[name="footer"]');

    if (!footer || !footerSlot) return;

    const hasFooterAttribute = Boolean(this.getAttribute('footer'));
    const hasSlottedFooter = footerSlot
      .assignedNodes({ flatten: true })
      .some(node => node.nodeType === Node.ELEMENT_NODE || node.textContent.trim());

    footer.hidden = !hasFooterAttribute && !hasSlottedFooter;
  }
}

Component({
  tag: 'tblr-card',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrCard);

export { TblrCard };
