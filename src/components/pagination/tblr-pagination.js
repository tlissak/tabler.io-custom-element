import { Component } from '../../core/component.js';

const stylesheetUrl = new URL('./tblr-pagination.css', import.meta.url);
const sizes = new Set(['sm', 'md', 'lg']);

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function integerAttribute(host, name, fallback) {
  const parsed = Number.parseInt(host.getAttribute(name), 10);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function safeToken(value, fallback, allowedValues) {
  return allowedValues.has(value) ? value : fallback;
}

function pageRange(page, pages, siblings, boundary) {
  if (pages <= 0) return [];

  const visible = new Set([1, pages]);

  for (let i = 1; i <= boundary; i += 1) {
    visible.add(i);
    visible.add(pages - i + 1);
  }

  for (let i = page - siblings; i <= page + siblings; i += 1) {
    if (i >= 1 && i <= pages) {
      visible.add(i);
    }
  }

  const sorted = [...visible]
    .filter(item => item >= 1 && item <= pages)
    .sort((a, b) => a - b);

  const items = [];

  sorted.forEach((item, index) => {
    const previous = sorted[index - 1];

    if (previous && item - previous > 1) {
      items.push('ellipsis');
    }

    items.push(item);
  });

  return items;
}

class TblrPagination extends HTMLElement {
  static observedAttributes = [
    'page',
    'pages',
    'siblings',
    'boundary',
    'previous',
    'next',
    'size',
    'disabled',
    'compact',
  ];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.reflectingPage = false;
    this.handleClick = this.handleClick.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;

    if (name === 'page' && this.reflectingPage) {
      return;
    }

    this.render();
  }

  get page() {
    return this.currentPage;
  }

  set page(value) {
    this.activatePage(value);
  }

  get currentPage() {
    return clamp(integerAttribute(this, 'page', 1), 1, this.totalPages);
  }

  get totalPages() {
    return Math.max(integerAttribute(this, 'pages', 1), 1);
  }

  render() {
    const page = this.currentPage;
    const pages = this.totalPages;
    const siblings = Math.max(integerAttribute(this, 'siblings', 1), 0);
    const boundary = Math.max(integerAttribute(this, 'boundary', 1), 0);
    const disabled = this.hasAttribute('disabled');
    const size = safeToken(this.getAttribute('size') ?? 'md', 'md', sizes);
    const previousLabel = this.getAttribute('previous') ?? 'Previous';
    const nextLabel = this.getAttribute('next') ?? 'Next';

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">

      <nav
        part="pagination"
        class="pagination pagination-${size}${this.hasAttribute('compact') ? ' pagination-compact' : ''}"
        aria-label="Pagination"
      >
        <button
          part="item previous"
          class="page-item page-previous"
          type="button"
          data-page="${page - 1}"
          aria-label="${escapeHtml(previousLabel)}"
          ${disabled || page <= 1 ? 'disabled' : ''}
        >
          <span class="page-icon" aria-hidden="true">&lsaquo;</span>
          <span class="page-label">${escapeHtml(previousLabel)}</span>
        </button>

        <span part="pages" class="page-list">
          ${pageRange(page, pages, siblings, boundary).map(item => this.renderPageItem(item, page, disabled)).join('')}
        </span>

        <button
          part="item next"
          class="page-item page-next"
          type="button"
          data-page="${page + 1}"
          aria-label="${escapeHtml(nextLabel)}"
          ${disabled || page >= pages ? 'disabled' : ''}
        >
          <span class="page-label">${escapeHtml(nextLabel)}</span>
          <span class="page-icon" aria-hidden="true">&rsaquo;</span>
        </button>
      </nav>
    `;

    this.root.querySelector('.pagination')?.addEventListener('click', this.handleClick);
    this.root.querySelector('.pagination')?.addEventListener('keydown', this.handleKeydown);
    this.reflectClampedPage(page);
  }

  renderPageItem(item, currentPage, disabled) {
    if (item === 'ellipsis') {
      return `
        <span part="ellipsis" class="page-ellipsis" aria-hidden="true">...</span>
      `;
    }

    const active = item === currentPage;

    return `
      <button
        part="item page"
        class="page-item${active ? ' active' : ''}"
        type="button"
        data-page="${item}"
        aria-label="Page ${item}"
        aria-current="${active ? 'page' : 'false'}"
        ${disabled ? 'disabled' : ''}
      >${item}</button>
    `;
  }

  handleClick(event) {
    const button = event.target.closest('.page-item');

    if (!button || button.disabled) return;

    this.activatePage(button.dataset.page);
  }

  handleKeydown(event) {
    if (!['Home', 'End', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;

    event.preventDefault();

    if (event.key === 'Home') {
      this.activatePage(1);
    } else if (event.key === 'End') {
      this.activatePage(this.totalPages);
    } else if (event.key === 'ArrowLeft') {
      this.activatePage(this.currentPage - 1);
    } else if (event.key === 'ArrowRight') {
      this.activatePage(this.currentPage + 1);
    }
  }

  activatePage(value) {
    const nextPage = clamp(Number.parseInt(value, 10), 1, this.totalPages);

    if (!Number.isFinite(nextPage) || nextPage === this.currentPage) return;

    this.reflectClampedPage(nextPage);
    this.render();
    this.dispatchEvent(new CustomEvent('change', {
      bubbles: true,
      composed: true,
      detail: { page: nextPage },
    }));
  }

  reflectClampedPage(page) {
    if (this.getAttribute('page') === String(page)) return;

    this.reflectingPage = true;
    this.setAttribute('page', String(page));
    this.reflectingPage = false;
  }
}

Component({
  tag: 'tblr-pagination',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrPagination);

export { TblrPagination };
