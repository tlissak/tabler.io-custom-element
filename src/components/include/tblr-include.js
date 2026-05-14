import { Component } from '../../core/component.js';

const stylesheetUrl = new URL('./tblr-include.css', import.meta.url);
const modes = new Set(['cors', 'no-cors', 'same-origin']);
const requestCache = new Map();

function safeMode(value) {
  return modes.has(value) ? value : 'cors';
}

function requestInclude(src, mode) {
  const key = `${mode}:${src}`;

  if (!requestCache.has(key)) {
    requestCache.set(key, fetch(src, { mode })
      .then(async response => {
        if (!response.ok) {
          const error = new Error(`Include request failed with status ${response.status}.`);
          error.status = response.status;
          throw error;
        }

        return response.text();
      })
      .catch(error => {
        requestCache.delete(key);
        throw error;
      }));
  }

  return requestCache.get(key);
}

function cloneScript(script) {
  const replacement = document.createElement('script');

  for (const attribute of script.attributes) {
    replacement.setAttribute(attribute.name, attribute.value);
  }

  replacement.textContent = script.textContent;

  return replacement;
}

class TblrInclude extends HTMLElement {
  static observedAttributes = ['src', 'mode', 'allow-scripts'];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.requestId = 0;
  }

  connectedCallback() {
    this.render();
    this.load();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;

    this.load();
  }

  get src() {
    return this.getAttribute('src') ?? '';
  }

  set src(value) {
    if (value == null) {
      this.removeAttribute('src');
    } else {
      this.setAttribute('src', value);
    }
  }

  get mode() {
    return safeMode(this.getAttribute('mode') ?? 'cors');
  }

  set mode(value) {
    this.setAttribute('mode', value ?? 'cors');
  }

  get allowScripts() {
    return this.hasAttribute('allow-scripts');
  }

  set allowScripts(value) {
    if (value) {
      this.setAttribute('allow-scripts', '');
    } else {
      this.removeAttribute('allow-scripts');
    }
  }

  render() {
    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">
      <slot></slot>
    `;
  }

  async load() {
    const src = this.src;
    const requestId = ++this.requestId;

    if (!src) return;

    try {
      const html = await requestInclude(src, this.mode);

      if (requestId !== this.requestId || !this.isConnected) return;

      this.includeHtml(html);
      this.dispatchEvent(new CustomEvent('sl-load', {
        bubbles: true,
        composed: true,
      }));
    } catch (error) {
      if (requestId !== this.requestId || !this.isConnected) return;

      this.dispatchEvent(new CustomEvent('sl-error', {
        bubbles: true,
        composed: true,
        detail: {
          status: Number.isFinite(error.status) ? error.status : 0,
        },
      }));
    }
  }

  includeHtml(html) {
    const template = document.createElement('template');
    template.innerHTML = html;

    if (!this.allowScripts) {
      template.content.querySelectorAll('script').forEach(script => script.remove());
    }

    this.replaceChildren(template.content.cloneNode(true));

    if (this.allowScripts) {
      this.querySelectorAll('script').forEach(script => {
        script.replaceWith(cloneScript(script));
      });
    }
  }
}

Component({
  tag: 'tblr-include',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrInclude);

export { TblrInclude };
