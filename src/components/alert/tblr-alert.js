import { Component } from '../../core/component.js';

const stylesheetUrl = new URL('./tblr-alert.css', import.meta.url);
const variants = new Set(['primary', 'success', 'neutral', 'warning', 'danger', 'info']);
const countdownDirections = new Set(['ltr', 'rtl']);
const defaultIcons = {
  primary: 'i',
  success: '✓',
  neutral: '•',
  warning: '!',
  danger: '!',
  info: 'i',
};

let toastStack;

function safeToken(value, fallback, allowedValues) {
  return allowedValues.has(value) ? value : fallback;
}

function durationValue(value) {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : Infinity;
}

function ensureToastStack() {
  if (toastStack?.isConnected) return toastStack;

  toastStack = document.createElement('div');
  toastStack.className = 'tblr-toast-stack';
  toastStack.setAttribute('role', 'region');
  toastStack.setAttribute('aria-label', 'Notifications');
  Object.assign(toastStack.style, {
    position: 'fixed',
    top: '1rem',
    right: '3rem',
    zIndex: '1080',
    display: 'grid',
    gap: '0.75rem',
    width: 'min(24rem, calc(100vw - 2rem))',
    pointerEvents: 'none',
  });
  document.body.append(toastStack);

  return toastStack;
}

class TblrAlert extends HTMLElement {
  static observedAttributes = ['open', 'variant', 'closable', 'duration', 'countdown', 'toast'];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.timer = 0;
    this.raf = 0;
    this.startedAt = 0;
    this.remaining = Infinity;
    this.toastResolver = null;
    this.handleClose = this.handleClose.bind(this);
    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.handleFocusIn = this.handleFocusIn.bind(this);
    this.handleFocusOut = this.handleFocusOut.bind(this);
  }

  connectedCallback() {
    this.render();
    if (this.open) this.startAutoHide();
  }

  disconnectedCallback() {
    this.stopAutoHide();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;

    this.render();

    if (name === 'open') {
      if (newValue === null) {
        this.stopAutoHide();
        this.dispatchEvent(new CustomEvent('hide', { bubbles: true, composed: true }));
        queueMicrotask(() => this.afterHide());
      } else {
        this.dispatchEvent(new CustomEvent('show', { bubbles: true, composed: true }));
        queueMicrotask(() => {
          this.dispatchEvent(new CustomEvent('after-show', { bubbles: true, composed: true }));
          this.startAutoHide();
        });
      }
      return;
    }

    if (this.open && (name === 'duration' || name === 'countdown')) {
      this.startAutoHide();
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

  get variant() {
    return safeToken(this.getAttribute('variant') ?? 'primary', 'primary', variants);
  }

  set variant(value) {
    this.setAttribute('variant', safeToken(value, 'primary', variants));
  }

  get duration() {
    return durationValue(this.getAttribute('duration'));
  }

  set duration(value) {
    if (Number.isFinite(Number(value))) {
      this.setAttribute('duration', String(value));
    } else {
      this.removeAttribute('duration');
    }
  }

  show() {
    if (this.open) {
      this.startAutoHide();
      return Promise.resolve();
    }

    this.setAttribute('open', '');

    return Promise.resolve();
  }

  hide() {
    if (!this.open) return Promise.resolve();

    this.removeAttribute('open');

    return new Promise(resolve => {
      this.addEventListener('after-hide', () => resolve(), { once: true });
    });
  }

  toast() {
    if (typeof document === 'undefined') return Promise.resolve();

    ensureToastStack().append(this);
    this.setAttribute('toast', '');
    this.setAttribute('open', '');

    return new Promise(resolve => {
      this.toastResolver = resolve;
    });
  }

  render() {
    const variant = this.variant;
    const countdown = safeToken(this.getAttribute('countdown') ?? '', '', countdownDirections);
    const hasCountdown = Boolean(countdown) && Number.isFinite(this.duration);

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">

      <div
        part="base"
        class="alert alert-${variant}${this.hasAttribute('toast') ? ' alert-toast' : ''}"
        role="alert"
        ${this.open ? '' : 'hidden'}
      >
        <span part="icon" class="icon">
          <slot name="icon">${defaultIcons[variant]}</slot>
        </span>

        <div part="message" class="message">
          <slot></slot>
        </div>

        ${this.hasAttribute('closable') ? `
          <button part="close-button" class="close-button" type="button" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        ` : ''}

        ${hasCountdown ? `
          <span part="countdown" class="countdown countdown-${countdown}" aria-hidden="true">
            <span class="countdown-bar"></span>
          </span>
          <span part="counter" class="counter" aria-live="polite"></span>
        ` : ''}
      </div>
    `;

    this.root.querySelector('.close-button')?.addEventListener('click', this.handleClose);
    this.root.querySelector('.alert')?.addEventListener('mouseenter', this.handleMouseEnter);
    this.root.querySelector('.alert')?.addEventListener('mouseleave', this.handleMouseLeave);
    this.root.querySelector('.alert')?.addEventListener('focusin', this.handleFocusIn);
    this.root.querySelector('.alert')?.addEventListener('focusout', this.handleFocusOut);
    this.updateCountdown();
  }

  handleClose() {
    this.hide();
  }

  handleMouseEnter() {
    this.resetAutoHide();
  }

  handleMouseLeave() {
    this.resumeAutoHide();
  }

  handleFocusIn() {
    this.resetAutoHide();
  }

  handleFocusOut() {
    this.resumeAutoHide();
  }

  startAutoHide() {
    this.stopAutoHide();

    if (!this.open || !Number.isFinite(this.duration)) {
      this.remaining = Infinity;
      this.updateCountdown();
      return;
    }

    this.remaining = this.duration;
    this.resumeAutoHide();
  }

  pauseAutoHide() {
    if (!Number.isFinite(this.remaining)) return;

    window.clearTimeout(this.timer);
    window.cancelAnimationFrame(this.raf);
    this.remaining = Math.max(0, this.remaining - (performance.now() - this.startedAt));
    this.updateCountdown();
  }

  resetAutoHide() {
    if (!this.open || !Number.isFinite(this.duration)) return;

    window.clearTimeout(this.timer);
    window.cancelAnimationFrame(this.raf);
    this.remaining = this.duration;
    this.updateCountdown();
  }

  resumeAutoHide() {
    if (!this.open || !Number.isFinite(this.remaining)) return;

    window.clearTimeout(this.timer);
    window.cancelAnimationFrame(this.raf);
    this.startedAt = performance.now();
    this.timer = window.setTimeout(() => this.hide(), this.remaining);
    this.tickCountdown();
  }

  stopAutoHide() {
    window.clearTimeout(this.timer);
    window.cancelAnimationFrame(this.raf);
  }

  tickCountdown() {
    this.updateCountdown();
    this.raf = window.requestAnimationFrame(() => this.tickCountdown());
  }

  updateCountdown() {
    const bar = this.root.querySelector('.countdown-bar');
    const counter = this.root.querySelector('.counter');

    if (!bar || !counter || !Number.isFinite(this.duration)) return;

    const elapsed = this.open && this.startedAt ? performance.now() - this.startedAt : 0;
    const current = Math.max(0, this.remaining - elapsed);
    const ratio = this.duration > 0 ? current / this.duration : 0;

    bar.style.transform = `scaleX(${ratio})`;
    counter.textContent = `${Math.ceil(current / 1000)}s`;
  }

  afterHide() {
    this.dispatchEvent(new CustomEvent('after-hide', { bubbles: true, composed: true }));

    if (this.hasAttribute('toast')) {
      this.remove();

      if (toastStack && toastStack.children.length === 0) {
        toastStack.remove();
        toastStack = null;
      }

      this.toastResolver?.();
      this.toastResolver = null;
    }
  }
}

Component({
  tag: 'tblr-alert',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrAlert);

export { TblrAlert };
