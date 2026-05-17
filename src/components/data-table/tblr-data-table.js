import { Component } from '../../core/component.js';

const stylesheetUrl = new URL('./tblr-data-table.css', import.meta.url);
const directions = new Set(['asc', 'desc']);
const statusColors = {
  active: '#2fb344',
  inactive: '#667382',
  requested: '#f59f00',
  pending: '#f59f00',
  paid: '#2fb344',
  failed: '#d63939',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function readInteger(host, name, fallback) {
  const value = Number.parseInt(host.getAttribute(name), 10);

  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function safeDirection(value) {
  return directions.has(value) ? value : 'asc';
}

function parseJsonAttribute(host, name, fallback) {
  const value = host.getAttribute(name);

  if (!value) return fallback;

  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn(`[TBLR] Invalid ${name} JSON on tblr-data-table.`, error);
    return fallback;
  }
}

function getValue(row, key) {
  if (!key) return '';

  return String(key).split('.').reduce((value, part) => value?.[part], row) ?? '';
}

function normalizeRows(payload) {
  if (Array.isArray(payload)) {
    return {
      page: 1,
      perPage: payload.length,
      rows: payload,
      total: payload.length,
    };
  }

  const rows = payload?.data ?? payload?.rows ?? payload?.items ?? payload?.results ?? [];

  return {
    page: Number(payload?.page) || 1,
    perPage: Number(payload?.perPage ?? payload?.per_page ?? payload?.size ?? rows.length) || rows.length,
    rows: Array.isArray(rows) ? rows : [],
    total: Number(payload?.total ?? payload?.recordsTotal ?? payload?.recordsFiltered ?? payload?.count ?? rows.length) || 0,
  };
}

function columnLabel(key) {
  return String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function initials(value) {
  return String(value ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');
}

class TblrDataTable extends HTMLElement {
  static observedAttributes = [
    'src',
    'columns',
    'title',
    'description',
    'page',
    'per-page',
    'page-sizes',
    'sort',
    'direction',
    'search',
    'search-placeholder',
    'empty-text',
    'loading-text',
    'data',
    'hide-header',
    'hide-toolbar',
    'hide-footer',
  ];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.rows = [];
    this.total = 0;
    this.loading = false;
    this.error = '';
    this.manualData = false;
    this.requestId = 0;
    this.searchTimer = 0;
    this.handleClick = this.handleClick.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
  }

  connectedCallback() {
    if (this.hasAttribute('data')) {
      this.setData(parseJsonAttribute(this, 'data', []));
    } else {
      this.render();
      this.load();
    }
  }

  disconnectedCallback() {
    window.clearTimeout(this.searchTimer);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;

    if (name === 'data') {
      this.setData(parseJsonAttribute(this, 'data', []));
    } else if (['src', 'page', 'per-page', 'sort', 'direction', 'search'].includes(name)) {
      this.load();
    } else {
      this.render();
    }
  }

  get src() {
    return this.getAttribute('src') ?? '';
  }

  set src(value) {
    this.setAttribute('src', value ?? '');
  }

  get page() {
    return readInteger(this, 'page', 1);
  }

  set page(value) {
    this.setAttribute('page', String(Math.max(Number.parseInt(value, 10) || 1, 1)));
  }

  get perPage() {
    return readInteger(this, 'per-page', 10);
  }

  set perPage(value) {
    this.setAttribute('per-page', String(Math.max(Number.parseInt(value, 10) || 10, 1)));
  }

  get sort() {
    return this.getAttribute('sort') ?? '';
  }

  set sort(value) {
    if (value) {
      this.setAttribute('sort', value);
    } else {
      this.removeAttribute('sort');
    }
  }

  get direction() {
    return safeDirection(this.getAttribute('direction') ?? 'asc');
  }

  set direction(value) {
    this.setAttribute('direction', safeDirection(value));
  }

  get search() {
    return this.getAttribute('search') ?? '';
  }

  set search(value) {
    if (value) {
      this.setAttribute('search', value);
    } else {
      this.removeAttribute('search');
    }
  }

  get columns() {
    const configured = parseJsonAttribute(this, 'columns', null);

    if (Array.isArray(configured) && configured.length) {
      return configured.map(column => (
        typeof column === 'string'
          ? { key: column, label: columnLabel(column), sortable: true }
          : {
            ...column,
            key: column.key ?? column.field,
            label: column.label ?? columnLabel(column.key ?? column.field),
            type: column.type ?? 'text',
            sortable: column.sortable !== false,
            align: column.align ?? 'left',
            primary: column.primary,
            secondary: column.secondary,
          }
      )).filter(column => column.key || column.type === 'actions');
    }

    const sample = this.rows[0] ?? {};

    return Object.keys(sample).map(key => ({
      key,
      label: columnLabel(key),
      sortable: true,
      type: key === 'status' ? 'status' : Array.isArray(sample[key]) ? 'tags' : 'text',
    }));
  }

  get pageSizes() {
    return parseJsonAttribute(this, 'page-sizes', [5, 10, 25, 50])
      .map(value => Number.parseInt(value, 10))
      .filter(value => Number.isFinite(value) && value > 0);
  }

  get totalPages() {
    return Math.max(Math.ceil(this.total / this.perPage), 1);
  }

  get data() {
    return {
      page: this.page,
      perPage: this.perPage,
      rows: this.rows,
      total: this.total,
    };
  }

  set data(payload) {
    this.setData(payload);
  }

  async load() {
    const src = this.src;
    const requestId = ++this.requestId;

    if (!src) {
      if (!this.hasAttribute('data') && !this.manualData) {
        this.rows = [];
        this.total = 0;
      }
      this.render();
      return;
    }

    this.loading = true;
    this.error = '';
    this.render();

    try {
      const url = new URL(src, window.location.href);
      url.searchParams.set('page', String(this.page));
      url.searchParams.set('perPage', String(this.perPage));
      if (this.sort) url.searchParams.set('sort', this.sort);
      if (this.direction) url.searchParams.set('direction', this.direction);
      if (this.search) url.searchParams.set('search', this.search);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}.`);
      }

      const payload = normalizeRows(await response.json());

      if (requestId !== this.requestId || !this.isConnected) return;

      this.rows = payload.rows;
      this.total = payload.total;
      this.loading = false;
      this.render();
      this.dispatchEvent(new CustomEvent('load', {
        bubbles: true,
        composed: true,
        detail: payload,
      }));
    } catch (error) {
      if (requestId !== this.requestId || !this.isConnected) return;

      this.rows = [];
      this.total = 0;
      this.loading = false;
      this.error = error.message;
      this.render();
      this.dispatchEvent(new CustomEvent('error', {
        bubbles: true,
        composed: true,
        detail: { error },
      }));
    }
  }

  setData(payload) {
    const data = normalizeRows(payload);

    this.manualData = true;
    this.rows = data.rows;
    this.total = data.total;
    this.loading = false;
    this.error = '';

    if (!this.hasAttribute('src')) {
      this.render();
    }
  }

  render() {
    const title = this.getAttribute('title') ?? 'Table';
    const description = this.getAttribute('description') ?? '';
    const columns = this.columns;
    const rows = this.rows;
    const showHeader = !this.hasAttribute('hide-header');
    const showToolbar = !this.hasAttribute('hide-toolbar');
    const showFooter = !this.hasAttribute('hide-footer');

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">
      <section part="card" class="card">
        ${showHeader ? `<header part="header" class="header">
          <div class="title-group">
            <h2 class="title">${escapeHtml(title)}</h2>
            ${description ? `<p class="description">${escapeHtml(description)}</p>` : ''}
          </div>
          <div class="header-actions">
            <button class="button" type="button" data-action="refresh">Refresh</button>
            <button class="button" type="button" data-action="download">Download</button>
            <button class="button button-primary" type="button" data-action="primary">Button</button>
          </div>
        </header>` : ''}

        ${showToolbar ? `<div part="toolbar" class="toolbar">
          <label class="entries">
            <span>Show</span>
            <select data-control="per-page" aria-label="Rows per page">
              ${this.pageSizes.map(size => `
                <option value="${size}" ${size === this.perPage ? 'selected' : ''}>${size}</option>
              `).join('')}
            </select>
            <span>entries</span>
          </label>
          <label class="search">
            <span>Search:</span>
            <input
              data-control="search"
              type="search"
              value="${escapeHtml(this.search)}"
              placeholder="${escapeHtml(this.getAttribute('search-placeholder') ?? 'Search...')}"
            >
            <span class="shortcut" aria-hidden="true">ctrl + K</span>
          </label>
        </div>` : ''}

        <div part="table-wrap" class="table-wrap">
          ${this.renderTable(columns, rows)}
          ${this.loading ? `<div part="loading" class="loading">${escapeHtml(this.getAttribute('loading-text') ?? 'Loading...')}</div>` : ''}
        </div>

        ${showFooter ? `<footer part="footer" class="footer">
          <span class="summary">${escapeHtml(this.summaryText)}</span>
          ${this.renderPagination()}
        </footer>` : ''}
      </section>
    `;

    this.root.querySelector('.card')?.addEventListener('click', this.handleClick);
    this.root.querySelector('[data-control="search"]')?.addEventListener('input', this.handleInput);
    this.root.querySelector('[data-control="search"]')?.addEventListener('keydown', this.handleKeydown);
    this.root.querySelector('[data-control="per-page"]')?.addEventListener('change', this.handleChange);
  }

  renderTable(columns, rows) {
    if (this.error) {
      return `<div part="error" class="message">${escapeHtml(this.error)}</div>`;
    }

    if (!rows.length && !this.loading) {
      return `<div part="empty" class="message">${escapeHtml(this.getAttribute('empty-text') ?? 'No records found')}</div>`;
    }

    return `
      <table part="table">
        ${columns.some(column => column.width) ? `
          <colgroup>
            ${columns.map(column => `<col${column.width ? ` style="width: ${escapeHtml(column.width)}"` : ''}>`).join('')}
          </colgroup>
        ` : ''}
        <thead>
          <tr>
            ${columns.map(column => this.renderHeadCell(column)).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              ${columns.map(column => this.renderCell(row, column)).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  renderHeadCell(column) {
    const sortKey = column.sortKey ?? column.key;
    const active = sortKey && this.sort === sortKey;
    const icon = active ? (this.direction === 'asc' ? '↑' : '↓') : '↓';
    const label = escapeHtml(column.label);
    const align = column.align === 'right' ? 'right' : 'left';

    return `
      <th style="text-align: ${align}">
        ${column.sortable && sortKey ? `
          <button class="th-button" type="button" data-sort="${escapeHtml(sortKey)}">
            <span>${label}</span>
            <span class="sort-icon" aria-hidden="true">${icon}</span>
          </button>
        ` : label}
      </th>
    `;
  }

  renderCell(row, column) {
    const align = column.align === 'right' ? 'right' : 'left';

    return `<td style="text-align: ${align}">${this.renderCellContent(row, column)}</td>`;
  }

  renderCellContent(row, column) {
    if (column.type === 'person') {
      const primary = getValue(row, column.primary ?? column.key);
      const secondary = getValue(row, column.secondary ?? 'email');

      return `
        <span class="person">
          <span class="avatar">${escapeHtml(initials(primary))}</span>
          <span>
            <span class="primary-text">${escapeHtml(primary)}</span>
            ${secondary ? `<span class="secondary-text">${escapeHtml(secondary)}</span>` : ''}
          </span>
        </span>
      `;
    }

    if (column.type === 'status') {
      const value = getValue(row, column.key);
      const color = statusColors[String(value).toLowerCase()] ?? '#667382';

      return `
        <span class="status" style="--status-color: ${escapeHtml(color)}">
          <span class="status-dot" aria-hidden="true"></span>
          <span>${escapeHtml(value)}</span>
        </span>
      `;
    }

    if (column.type === 'tags') {
      const values = getValue(row, column.key);
      const tags = Array.isArray(values) ? values : String(values).split(',').filter(Boolean);

      return `<span class="tags">${tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</span>`;
    }

    if (column.type === 'badge') {
      const value = getValue(row, column.key);
      const color = getValue(row, column.colorKey) || column.color || '#667382';

      return `
        <span class="badge" style="--badge-color: ${escapeHtml(color)}">
          ${escapeHtml(value)}
        </span>
      `;
    }

    if (column.type === 'stacked') {
      const primary = getValue(row, column.primary ?? column.key);
      const secondary = getValue(row, column.secondary);

      return `
        <span class="stacked">
          <span class="primary-text">${escapeHtml(primary)}</span>
          ${secondary ? `<span class="secondary-text">${escapeHtml(secondary)}</span>` : ''}
        </span>
      `;
    }

    if (column.type === 'link') {
      const value = getValue(row, column.key);
      const href = getValue(row, column.hrefKey ?? 'href') || column.href || '#';
      const target = column.target ? ` target="${escapeHtml(column.target)}"` : '';
      const rel = column.target === '_blank' ? ' rel="noopener noreferrer"' : '';

      return `<a class="cell-link" href="${escapeHtml(href)}"${target}${rel}>${escapeHtml(value)}</a>`;
    }

    if (column.type === 'icon-link') {
      const href = getValue(row, column.hrefKey ?? column.key);
      const icon = column.icon ?? 'external-link';
      const title = column.title ?? column.label ?? 'Open';
      const target = column.target ? ` target="${escapeHtml(column.target)}"` : '';
      const rel = column.target === '_blank' ? ' rel="noopener noreferrer"' : '';

      return `
        <a class="icon-link" href="${escapeHtml(href)}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}"${target}${rel}>
          <tblr-icon name="${escapeHtml(icon)}"></tblr-icon>
        </a>
      `;
    }

    if (column.type === 'button-link') {
      const value = getValue(row, column.key);
      const href = getValue(row, column.hrefKey ?? 'href') || column.href || '#';
      const target = column.target ? ` target="${escapeHtml(column.target)}"` : '';
      const rel = column.target === '_blank' ? ' rel="noopener noreferrer"' : '';

      return `<a class="button button-link" href="${escapeHtml(href)}"${target}${rel}>${escapeHtml(value)}</a>`;
    }

    if (column.type === 'actions') {
      const id = getValue(row, column.key ?? 'id');

      return `
        <span class="actions">
          <button class="link-button" type="button" data-row-action="edit" data-row-id="${escapeHtml(id)}">Edit</button>
          <button class="button" type="button" data-row-action="actions" data-row-id="${escapeHtml(id)}">Actions</button>
        </span>
      `;
    }

    return escapeHtml(getValue(row, column.key));
  }

  renderPagination() {
    const pages = this.totalPages;
    const page = Math.min(this.page, pages);
    const items = this.paginationItems(page, pages);

    return `
      <nav class="pagination" aria-label="Table pagination">
        <button class="page" type="button" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>&lsaquo;</button>
        ${items.map(item => item === 'ellipsis'
          ? '<span class="page" aria-hidden="true">...</span>'
          : `<button class="page${item === page ? ' active' : ''}" type="button" data-page="${item}" aria-current="${item === page ? 'page' : 'false'}">${item}</button>`
        ).join('')}
        <button class="page" type="button" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''}>&rsaquo;</button>
      </nav>
    `;
  }

  paginationItems(page, pages) {
    const visible = new Set([1, pages]);

    for (let index = page - 1; index <= page + 1; index += 1) {
      if (index >= 1 && index <= pages) visible.add(index);
    }

    const sorted = [...visible].sort((a, b) => a - b);
    const items = [];

    sorted.forEach((item, index) => {
      if (index > 0 && item - sorted[index - 1] > 1) {
        items.push('ellipsis');
      }

      items.push(item);
    });

    return items;
  }

  get summaryText() {
    if (!this.total) return 'Showing 0 entries';

    const page = Math.min(this.page, this.totalPages);
    const from = (page - 1) * this.perPage + 1;
    const to = Math.min(page * this.perPage, this.total);

    return `Showing ${from} to ${to} of ${this.total} entries`;
  }

  handleClick(event) {
    const sortButton = event.target.closest('[data-sort]');
    const pageButton = event.target.closest('[data-page]');
    const actionButton = event.target.closest('[data-action], [data-row-action]');

    if (sortButton) {
      const sort = sortButton.dataset.sort;
      const direction = this.sort === sort && this.direction === 'asc' ? 'desc' : 'asc';

      this.sort = sort;
      this.direction = direction;
      this.page = 1;
      this.dispatchEvent(new CustomEvent('sort', {
        bubbles: true,
        composed: true,
        detail: { sort, direction },
      }));
      return;
    }

    if (pageButton && !pageButton.disabled) {
      this.page = Math.min(Math.max(Number.parseInt(pageButton.dataset.page, 10), 1), this.totalPages);
      return;
    }

    if (actionButton) {
      if (actionButton.dataset.action === 'refresh') {
        this.refresh();
        return;
      }

      if (actionButton.dataset.action === 'download') {
        this.downloadCsv();
        return;
      }

      this.dispatchEvent(new CustomEvent('action', {
        bubbles: true,
        composed: true,
        detail: {
          action: actionButton.dataset.action ?? actionButton.dataset.rowAction,
          id: actionButton.dataset.rowId,
        },
      }));
    }
  }

  handleInput(event) {
    window.clearTimeout(this.searchTimer);
    this.searchTimer = window.setTimeout(() => {
      this.search = event.target.value;
      this.page = 1;
    }, 250);
  }

  handleChange(event) {
    this.perPage = event.target.value;
    this.page = 1;
  }

  handleKeydown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.root.querySelector('[data-control="search"]')?.focus();
    }

    if (event.key === 'Escape') {
      event.target.value = '';
      this.search = '';
      this.page = 1;
    }
  }

  focusSearch() {
    this.root.querySelector('[data-control="search"]')?.focus();
  }

  refresh() {
    return this.load();
  }

  showLoading() {
    this.loading = true;
    this.error = '';
    this.render();
  }

  showError(message) {
    this.rows = [];
    this.total = 0;
    this.loading = false;
    this.error = message;
    this.render();
  }

  downloadCsv() {
    const columns = this.columns.filter(column => column.type !== 'actions');
    const header = columns.map(column => this.csvValue(column.label)).join(',');
    const body = this.rows.map(row => columns.map(column => {
      const value = getValue(row, column.key);

      return this.csvValue(Array.isArray(value) ? value.join(' ') : value);
    }).join(',')).join('\n');
    const blob = new Blob([[header, body].filter(Boolean).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `${(this.getAttribute('title') ?? 'table').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  csvValue(value) {
    return `"${String(value ?? '').replaceAll('"', '""')}"`;
  }

  getRow(id) {
    return this.rows.find(row => String(row.id) === String(id));
  }
}

Component({
  tag: 'tblr-data-table',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrDataTable);

export { TblrDataTable };
