import { Component } from '../../core/component.js';

const stylesheetUrl = new URL('./tblr-file-preview.css', import.meta.url);
const fileTypes = new Set(['image', 'pdf', 'video', 'audio']);

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function booleanAttribute(host, name, fallback = false) {
  if (!host.hasAttribute(name)) return fallback;

  return host.getAttribute(name) !== 'false';
}

function normalizeFileType(value) {
  const type = String(value ?? '').trim().toLowerCase();

  return fileTypes.has(type) ? type : '';
}

function safeCssValue(value) {
  const text = String(value ?? '').trim();

  return text && !/[;"'<>]/.test(text) ? text : '';
}

function fileTypeFromMime(mime) {
  const type = String(mime ?? '').trim().toLowerCase();

  if (type.startsWith('image/')) return 'image';
  if (type === 'application/pdf' || type === 'application/x-pdf') return 'pdf';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';

  return '';
}

function fileTypeFromUrl(url) {
  const cleanUrl = String(url ?? '').split(/[?#]/)[0].toLowerCase();

  if (/\.(apng|avif|bmp|gif|jpe?g|png|svg|webp)$/.test(cleanUrl)) return 'image';
  if (/\.pdf$/.test(cleanUrl)) return 'pdf';
  if (/\.(mp4|m4v|mov|ogv|webm)$/.test(cleanUrl)) return 'video';
  if (/\.(aac|flac|m4a|mp3|oga|ogg|opus|wav|weba)$/.test(cleanUrl)) return 'audio';

  return '';
}

function icon(type) {
  const icons = {
    image: '<path d="M15 8h.01"></path><path d="M4 16l4-4a3 3 0 0 1 4 0l4 4"></path><path d="M14 14l1-1a3 3 0 0 1 4 0l1 1"></path><path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"></path>',
    pdf: '<path d="M14 3v4a2 2 0 0 0 2 2h4"></path><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l6 6v10a2 2 0 0 1-2 2Z"></path><path d="M9 17v-4h1.5a1.5 1.5 0 0 1 0 3H9"></path><path d="M14 17v-4h1a2 2 0 0 1 0 4h-1Z"></path>',
    video: '<path d="m15 10 4.55-2.27A1 1 0 0 1 21 8.62v6.76a1 1 0 0 1-1.45.89L15 14"></path><path d="M4 6h9a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"></path>',
    audio: '<path d="M9 18V5l12-2v13"></path><path d="M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"></path><path d="M18 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"></path>',
    file: '<path d="M14 3v4a2 2 0 0 0 2 2h4"></path><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l6 6v10a2 2 0 0 1-2 2Z"></path>',
  };

  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      ${icons[type] ?? icons.file}
    </svg>
  `;
}

class TblrFilePreview extends HTMLElement {
  static observedAttributes = [
    'src',
    'type',
    'mime',
    'title',
    'filename',
    'alt',
    'poster',
    'height',
    'aspect',
    'controls',
    'autoplay',
    'muted',
    'loop',
    'open-label',
    'download-label',
    'empty-label',
    'unsupported-label',
  ];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.previewFile = null;
    this.objectUrl = '';
    this.handleLoad = this.handleLoad.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.revokeObjectUrl();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;

    this.render();
  }

  get src() {
    return this.getAttribute('src') ?? '';
  }

  set src(value) {
    this.previewFile = null;
    this.revokeObjectUrl();

    if (value == null || value === '') {
      this.removeAttribute('src');
      return;
    }

    this.setAttribute('src', value);
  }

  get type() {
    return this.resolveType();
  }

  set type(value) {
    if (value == null || value === '') {
      this.removeAttribute('type');
      return;
    }

    this.setAttribute('type', value);
  }

  get file() {
    return this.previewFile;
  }

  set file(value) {
    this.setFile(value);
  }

  clear() {
    this.previewFile = null;
    this.revokeObjectUrl();
    this.removeAttribute('src');
    this.render();
  }

  setFile(file) {
    this.previewFile = typeof Blob !== 'undefined' && file instanceof Blob ? file : null;
    this.revokeObjectUrl();

    if (this.previewFile) {
      this.objectUrl = URL.createObjectURL(this.previewFile);
      this.removeAttribute('src');
    }

    this.render();
  }

  render() {
    const src = this.resolveSrc();
    const type = this.resolveType();
    const title = this.resolveTitle();
    const hasHeader = title || src;

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">

      <figure part="preview" class="preview ${type || 'unknown'}">
        ${hasHeader ? this.renderHeader(title, src) : ''}
        <div part="body" class="body" style="${this.renderBodyStyle()}">
          ${src ? this.renderMedia(src, type) : this.renderEmpty()}
        </div>
      </figure>
    `;

    this.root.querySelector('.media')?.addEventListener('load', this.handleLoad);
    this.root.querySelector('.media')?.addEventListener('loadeddata', this.handleLoad);
    this.root.querySelector('.media')?.addEventListener('error', this.handleError);
  }

  renderHeader(title, src) {
    return `
      <figcaption part="header" class="header">
        <span part="icon" class="icon">${icon(this.resolveType())}</span>
        <span part="title" class="title">${escapeHtml(title || this.getAttribute('title') || 'File preview')}</span>
        ${src ? `
          <span part="actions" class="actions">
            <a part="open-link" class="action" href="${escapeHtml(src)}" target="_blank" rel="noopener">${escapeHtml(this.getAttribute('open-label') ?? 'Open')}</a>
            <a part="download-link" class="action" href="${escapeHtml(src)}" download="${escapeHtml(this.resolveFilename())}">${escapeHtml(this.getAttribute('download-label') ?? 'Download')}</a>
          </span>
        ` : ''}
      </figcaption>
    `;
  }

  renderBodyStyle() {
    const height = safeCssValue(this.getAttribute('height'));
    const aspect = safeCssValue(this.getAttribute('aspect'));
    const styles = [];

    if (height) {
      styles.push(`--tblr-file-preview-height: ${height}`);
    }

    if (aspect) {
      styles.push(`--tblr-file-preview-aspect: ${aspect}`);
    }

    return styles.join('; ');
  }

  renderMedia(src, type) {
    if (type === 'image') {
      return `<img part="image" class="media image-media" src="${escapeHtml(src)}" alt="${escapeHtml(this.getAttribute('alt') ?? this.resolveTitle())}">`;
    }

    if (type === 'pdf') {
      return `<iframe part="pdf" class="media pdf-media" src="${escapeHtml(src)}" title="${escapeHtml(this.resolveTitle() || 'PDF preview')}"></iframe>`;
    }

    if (type === 'video') {
      return `
        <video part="video" class="media video-media" src="${escapeHtml(src)}" ${this.mediaAttributes()} ${this.posterAttribute()}>
          ${this.unsupportedText()}
        </video>
      `;
    }

    if (type === 'audio') {
      return `
        <div part="audio-panel" class="audio-panel">
          <span part="audio-icon" class="audio-icon">${icon('audio')}</span>
          <audio part="audio" class="media audio-media" src="${escapeHtml(src)}" ${this.mediaAttributes()}>
            ${this.unsupportedText()}
          </audio>
        </div>
      `;
    }

    return this.renderUnsupported(type);
  }

  renderEmpty() {
    return `
      <div part="empty" class="state">
        <span class="state-icon">${icon('file')}</span>
        <span>${escapeHtml(this.getAttribute('empty-label') ?? 'No file selected')}</span>
        <slot name="empty"></slot>
      </div>
    `;
  }

  renderUnsupported(type) {
    return `
      <div part="unsupported" class="state">
        <span class="state-icon">${icon(type || 'file')}</span>
        <span>${escapeHtml(this.unsupportedText())}</span>
        <slot name="unsupported"></slot>
      </div>
    `;
  }

  mediaAttributes() {
    return [
      booleanAttribute(this, 'controls', true) ? 'controls' : '',
      booleanAttribute(this, 'autoplay') ? 'autoplay' : '',
      booleanAttribute(this, 'muted') ? 'muted' : '',
      booleanAttribute(this, 'loop') ? 'loop' : '',
    ].filter(Boolean).join(' ');
  }

  posterAttribute() {
    const poster = this.getAttribute('poster');

    return poster ? `poster="${escapeHtml(poster)}"` : '';
  }

  unsupportedText() {
    return this.getAttribute('unsupported-label') ?? 'Preview is not available for this file type.';
  }

  resolveSrc() {
    return this.getAttribute('src') || this.objectUrl || '';
  }

  resolveType() {
    return normalizeFileType(this.getAttribute('type'))
      || fileTypeFromMime(this.getAttribute('type'))
      || fileTypeFromMime(this.getAttribute('mime'))
      || fileTypeFromMime(this.previewFile?.type)
      || fileTypeFromUrl(this.resolveFilename())
      || fileTypeFromUrl(this.resolveSrc());
  }

  resolveFilename() {
    return this.getAttribute('filename')
      || this.previewFile?.name
      || this.getAttribute('src')?.split('/').pop()?.split(/[?#]/)[0]
      || '';
  }

  resolveTitle() {
    return this.getAttribute('title') || this.resolveFilename();
  }

  handleLoad(event) {
    this.dispatchEvent(new CustomEvent('preview-load', {
      bubbles: true,
      composed: true,
      detail: { type: this.resolveType(), src: this.resolveSrc(), originalEvent: event },
    }));
  }

  handleError(event) {
    this.dispatchEvent(new CustomEvent('preview-error', {
      bubbles: true,
      composed: true,
      detail: { type: this.resolveType(), src: this.resolveSrc(), originalEvent: event },
    }));
  }

  revokeObjectUrl() {
    if (!this.objectUrl) return;

    URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = '';
  }
}

Component({
  tag: 'tblr-file-preview',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrFilePreview);

export { TblrFilePreview };
