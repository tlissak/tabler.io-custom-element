import { Component } from '../../core/component.js';

const stylesheetUrl = new URL('./tblr-code-preview.css', import.meta.url);
const themes = new Set(['dark', 'plain']);

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function booleanAttribute(host, name) {
  if (!host.hasAttribute(name)) return false;

  return host.getAttribute(name) !== 'false';
}

function normalizeCode(value) {
  const trimmed = String(value ?? '').replace(/^\n/, '').replace(/\s+$/, '');
  const lines = trimmed.split('\n');
  const indents = lines
    .filter(line => line.trim())
    .map(line => line.match(/^\s*/)[0].length);
  const indent = indents.length ? Math.min(...indents) : 0;

  return indent > 0
    ? lines.map(line => line.slice(indent)).join('\n')
    : trimmed;
}

function safeTheme(value) {
  return themes.has(value) ? value : 'dark';
}

function languageClass(value) {
  const token = String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');

  return token ? `language-${token}` : '';
}

class TblrCodePreview extends HTMLElement {
  static observedAttributes = [
    'value',
    'language',
    'title',
    'copy',
    'copy-label',
    'copied-label',
    'wrap',
    'line-numbers',
    'theme',
  ];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.feedbackTimer = 0;
    this.copied = false;
    this.handleCopy = this.handleCopy.bind(this);
    this.observer = new MutationObserver(() => {
      if (!this.hasAttribute('value')) {
        this.render();
      }
    });
  }

  connectedCallback() {
    this.render();
    this.observer.observe(this, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  disconnectedCallback() {
    this.observer.disconnect();
    window.clearTimeout(this.feedbackTimer);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;

    this.render();
  }

  get value() {
    return this.getCode();
  }

  set value(value) {
    this.setAttribute('value', value ?? '');
  }

  render() {
    const code = this.getCode();
    const language = this.getAttribute('language') ?? '';
    const title = this.getAttribute('title') ?? '';
    const copy = booleanAttribute(this, 'copy');
    const wrap = booleanAttribute(this, 'wrap');
    const lineNumbers = booleanAttribute(this, 'line-numbers');
    const theme = safeTheme(this.getAttribute('theme') ?? 'dark');
    const hasHeader = title || language || copy;

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">

      <figure part="preview" class="preview ${theme}${wrap ? ' wrap' : ''}">
        ${hasHeader ? `
          <figcaption part="header" class="header">
            ${title ? `<span part="title" class="title">${escapeHtml(title)}</span>` : ''}
            ${language ? `<span part="language" class="language">${escapeHtml(language)}</span>` : ''}
            ${copy ? `<button part="copy" class="copy" type="button">${escapeHtml(this.copyLabel)}</button>` : ''}
          </figcaption>
        ` : ''}

        <div part="body" class="body">
          <pre part="pre"><code part="code" class="${languageClass(language)}">${lineNumbers ? this.renderLines(code) : escapeHtml(code)}</code></pre>
        </div>
      </figure>
    `;

    this.root.querySelector('.copy')?.addEventListener('click', this.handleCopy);
  }

  renderLines(code) {
    const lines = code.split('\n');

    return lines.map((line, index) => `<span class="line"><span class="line-number">${index + 1}</span><span class="line-code">${escapeHtml(line) || ' '}</span></span>`).join('');
  }

  getCode() {
    if (this.hasAttribute('value')) {
      return normalizeCode(this.getAttribute('value'));
    }

    return normalizeCode(this.textContent);
  }

  async handleCopy() {
    const value = this.getCode();

    try {
      await this.writeText(value);
      this.copied = true;
      this.render();
      this.dispatchEvent(new CustomEvent('copy', {
        bubbles: true,
        composed: true,
        detail: { value },
      }));

      window.clearTimeout(this.feedbackTimer);
      this.feedbackTimer = window.setTimeout(() => {
        this.copied = false;
        this.render();
      }, 1000);
    } catch (error) {
      this.dispatchEvent(new CustomEvent('error', {
        bubbles: true,
        composed: true,
        detail: { error },
      }));
    }
  }

  async writeText(value) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();

    const copied = document.execCommand('copy');
    textarea.remove();

    if (!copied) {
      throw new Error('Clipboard copy failed.');
    }
  }

  get copyLabel() {
    if (this.copied) {
      return this.getAttribute('copied-label') ?? 'Copied';
    }

    return this.getAttribute('copy-label') ?? 'Copy';
  }
}

Component({
  tag: 'tblr-code-preview',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrCodePreview);

export { TblrCodePreview };
