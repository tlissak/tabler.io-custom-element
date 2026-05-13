import { Component } from '../../core/component.js';

const stylesheetUrl = new URL('./tblr-icon.css', import.meta.url);
const DEFAULT_ICON_BASE_URL = 'https://cdn.jsdelivr.net/npm/@tabler/icons@3.44.0/icons';
const iconCache = new Map();
const validIconName = /^[a-z0-9][a-z0-9-]*$/;
const validIconVariant = /^(outline|filled)$/;

function formatCssLength(value) {
  if (!value) return '';
  return /^\d+(\.\d+)?$/.test(value) ? `${value}px` : value;
}

function stripCssString(value) {
  return value.trim().replace(/^['"]|['"]$/g, '');
}

function sanitizeSvg(svg) {
  svg.querySelectorAll('script, foreignObject').forEach(node => node.remove());

  svg.querySelectorAll('*').forEach(node => {
    for (const attribute of [...node.attributes]) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();

      if (name.startsWith('on') || value.startsWith('javascript:')) {
        node.removeAttribute(attribute.name);
      }
    }
  });

  svg.setAttribute('focusable', 'false');
  svg.setAttribute('aria-hidden', 'true');

  return svg;
}

async function fetchIcon(url) {
  if (!iconCache.has(url)) {
    const request = fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Icon request failed: ${response.status}`);
        }

        return response.text();
      })
      .catch(error => {
        iconCache.delete(url);
        throw error;
      });

    iconCache.set(url, request);
  }

  return iconCache.get(url);
}

class TblrIcon extends HTMLElement {
  static observedAttributes = ['name', 'variant', 'filled', 'size', 'stroke', 'label', 'base-url'];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.requestId = 0;
  }

  connectedCallback() {
    this.render();
    this.loadIcon();
  }

  attributeChangedCallback() {
    if (!this.isConnected) return;

    this.render();
    this.loadIcon();
  }

  get variant() {
    if (this.hasAttribute('filled')) return 'filled';

    const variant = this.getAttribute('variant') ?? 'outline';
    return validIconVariant.test(variant) ? variant : 'outline';
  }

  get baseUrl() {
    const attributeUrl = this.getAttribute('base-url');

    if (attributeUrl) {
      return attributeUrl;
    }

    const cssUrl = getComputedStyle(this).getPropertyValue('--tblr-icon-base-url');
    return stripCssString(cssUrl) || DEFAULT_ICON_BASE_URL;
  }

  get iconUrl() {
    const name = this.getAttribute('name') ?? '';
    const baseUrl = this.baseUrl.replace(/\/+$/, '');

    return `${baseUrl}/${this.variant}/${encodeURIComponent(name)}.svg`;
  }

  render() {
    const size = formatCssLength(this.getAttribute('size'));
    const stroke = this.getAttribute('stroke');
    const label = this.getAttribute('label');

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">
      <span part="icon" class="icon" data-state="loading"></span>
    `;

    if (size) {
      this.style.setProperty('--tblr-icon-size', size);
    } else {
      this.style.removeProperty('--tblr-icon-size');
    }

    if (stroke) {
      this.style.setProperty('--tblr-icon-stroke-width', stroke);
    } else {
      this.style.removeProperty('--tblr-icon-stroke-width');
    }

    const icon = this.root.querySelector('.icon');

    if (label) {
      icon.setAttribute('role', 'img');
      icon.setAttribute('aria-label', label);
    } else {
      icon.setAttribute('aria-hidden', 'true');
    }
  }

  async loadIcon() {
    const icon = this.root.querySelector('.icon');
    const name = this.getAttribute('name') ?? '';
    const requestId = ++this.requestId;

    if (!icon || !name) {
      icon?.setAttribute('data-state', 'empty');
      return;
    }

    if (!validIconName.test(name)) {
      icon.setAttribute('data-state', 'error');
      return;
    }

    try {
      const iconSvg = await fetchIcon(this.iconUrl);

      if (requestId !== this.requestId) return;

      const documentSvg = new DOMParser().parseFromString(iconSvg, 'image/svg+xml');
      const svg = documentSvg.documentElement;

      if (svg.nodeName.toLowerCase() !== 'svg') {
        throw new Error(`Invalid SVG icon: ${name}`);
      }

      icon.replaceChildren(sanitizeSvg(document.importNode(svg, true)));
      icon.setAttribute('data-state', 'ready');
    } catch (error) {
      if (requestId !== this.requestId) return;

      icon.replaceChildren();
      icon.setAttribute('data-state', 'error');
      console.warn(`[TBLR] Could not load icon "${name}".`, error);
    }
  }
}

Component({
  tag: 'tblr-icon',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrIcon);

export { TblrIcon };
