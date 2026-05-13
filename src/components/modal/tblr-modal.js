import { Component } from '../../core/component.js';

const stylesheetUrl = new URL('./tblr-modal.css', import.meta.url);
const sizes = new Set(['sm', 'md', 'lg', 'xl', 'full']);
const statuses = new Set(['default', 'success', 'danger', 'warning', 'info']);
const actionVariants = new Set(['primary', 'success', 'danger', 'warning', 'info', 'secondary']);

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

class TblrModal extends HTMLElement {
  static observedAttributes = [
    'open',
    'title',
    'subtitle',
    'size',
    'status',
    'centered',
    'scrollable',
    'static',
    'no-close',
    'header-bg',
    'cancel',
    'action',
    'action-variant',
    'close-label',
  ];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.handleBackdropClick = this.handleBackdropClick.bind(this);
    this.handleActionClick = this.handleActionClick.bind(this);
    this.handleCancelClick = this.handleCancelClick.bind(this);
    this.handleCloseClick = this.handleCloseClick.bind(this);
    this.handleDocumentKeydown = this.handleDocumentKeydown.bind(this);
  }

  connectedCallback() {
    this.render();
    this.updateDocumentListeners();
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this.handleDocumentKeydown);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;

    this.render();
    this.updateDocumentListeners();

    if (name === 'open' && newValue !== null) {
      queueMicrotask(() => this.focusInitialElement());
      this.dispatchEvent(new CustomEvent('open', {
        bubbles: true,
        composed: true,
      }));
    }
  }

  get open() {
    return this.hasAttribute('open');
  }

  set open(value) {
    if (value) {
      this.show();
    } else {
      this.hide();
    }
  }

  show() {
    if (this.open) return;

    this.setAttribute('open', '');
  }

  hide(reason = 'close') {
    if (!this.open) return;

    const beforeClose = new CustomEvent('beforeclose', {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: { reason },
    });

    if (!this.dispatchEvent(beforeClose)) return;

    this.removeAttribute('open');
    this.dispatchEvent(new CustomEvent('close', {
      bubbles: true,
      composed: true,
      detail: { reason },
    }));
  }

  render() {
    const title = this.getAttribute('title');
    const subtitle = this.getAttribute('subtitle');
    const size = safeToken(this.getAttribute('size') ?? 'md', 'md', sizes);
    const status = safeToken(this.getAttribute('status') ?? 'default', 'default', statuses);
    const cancel = this.getAttribute('cancel');
    const action = this.getAttribute('action');
    const actionVariant = safeToken(this.getAttribute('action-variant') ?? this.defaultActionVariant(status), 'primary', actionVariants);
    const closeLabel = this.getAttribute('close-label') ?? 'Close';
    const hasFooter = cancel || action || this.hasAttribute('footer');

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">

      <div part="backdrop" class="backdrop" ${this.open ? '' : 'hidden'}>
        <section
          part="modal"
          class="modal modal-${size} modal-${status}${this.hasAttribute('centered') ? ' modal-centered' : ''}${this.hasAttribute('scrollable') ? ' modal-scrollable' : ''}"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-body"
          tabindex="-1"
        >
          <header part="header" class="modal-header">
            <slot name="header">
              <span class="modal-heading">
                ${title ? `<h2 part="title" class="modal-title" id="modal-title">${escapeHtml(title)}</h2>` : ''}
                ${subtitle ? `<span part="subtitle" class="modal-subtitle">${escapeHtml(subtitle)}</span>` : ''}
              </span>
            </slot>
            ${this.hasAttribute('no-close') ? '' : `
              <button part="close" class="modal-close" type="button" aria-label="${escapeHtml(closeLabel)}">
                <span aria-hidden="true">&times;</span>
              </button>
            `}
          </header>

          <div part="body" class="modal-body" id="modal-body">
            ${status !== 'default' ? '<span part="status-icon" class="status-icon" aria-hidden="true"></span>' : ''}
            <div part="content" class="modal-content">
              <slot></slot>
            </div>
          </div>

          <footer part="footer" class="modal-footer" ${hasFooter ? '' : 'hidden'}>
            <slot name="footer">
              ${cancel ? `<button part="cancel" class="btn btn-secondary" type="button">${escapeHtml(cancel)}</button>` : ''}
              ${action ? `<button part="action" class="btn btn-${actionVariant}" type="button">${escapeHtml(action)}</button>` : ''}
            </slot>
          </footer>
        </section>
      </div>
    `;

    this.root.querySelector('.backdrop')?.addEventListener('click', this.handleBackdropClick);
    this.root.querySelector('.modal-close')?.addEventListener('click', this.handleCloseClick);
    this.root.querySelector('[part="cancel"]')?.addEventListener('click', this.handleCancelClick);
    this.root.querySelector('[part="action"]')?.addEventListener('click', this.handleActionClick);
  }

  defaultActionVariant(status) {
    if (status === 'danger') return 'danger';
    if (status === 'success') return 'success';
    if (status === 'warning') return 'warning';
    if (status === 'info') return 'info';

    return 'primary';
  }

  handleBackdropClick(event) {
    if (event.target !== event.currentTarget || this.hasAttribute('static')) return;

    this.hide('backdrop');
  }

  handleCloseClick() {
    this.hide('close');
  }

  handleCancelClick() {
    this.hide('cancel');
  }

  handleActionClick() {
    this.dispatchEvent(new CustomEvent('action', {
      bubbles: true,
      composed: true,
    }));
  }

  handleDocumentKeydown(event) {
    if (!this.open) return;

    if (event.key === 'Escape' && !this.hasAttribute('static')) {
      event.preventDefault();
      this.hide('escape');
      return;
    }

    if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  }

  trapFocus(event) {
    const focusable = this.focusableElements;

    if (!focusable.length) {
      event.preventDefault();
      this.root.querySelector('.modal')?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const activeElement = this.root.activeElement || document.activeElement;

    if (event.shiftKey && activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  focusInitialElement() {
    if (!this.open) return;

    const target = this.focusableElements[0];

    target?.focus();
    if (target && (this.root.activeElement === target || document.activeElement === target)) {
      return;
    }

    this.root.querySelector('.modal')?.focus();
  }

  updateDocumentListeners() {
    document.removeEventListener('keydown', this.handleDocumentKeydown);

    if (this.open) {
      document.addEventListener('keydown', this.handleDocumentKeydown);
    }
  }

  get focusableElements() {
    const shadowFocusable = [...this.root.querySelectorAll([
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(','))];
    const slottedFocusable = [...this.querySelectorAll([
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'tblr-input:not([disabled])',
      'tblr-select:not([disabled])',
      'tblr-search:not([disabled])',
      'tblr-datepicker:not([disabled])',
      'tblr-rich-editor:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(','))];

    return [
      ...shadowFocusable.filter(item => item.classList.contains('modal-close')),
      ...slottedFocusable,
      ...shadowFocusable.filter(item => !item.classList.contains('modal-close')),
    ];
  }
}

Component({
  tag: 'tblr-modal',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrModal);

export { TblrModal };
