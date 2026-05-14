import { Component } from '../../core/component.js';

const stylesheetUrl = new URL('./tblr-relative-time.css', import.meta.url);
const formats = new Set(['long', 'short', 'narrow']);
const numerics = new Set(['always', 'auto']);
const units = [
  { unit: 'second', duration: 1000, limit: 60 * 1000 },
  { unit: 'minute', duration: 60 * 1000, limit: 60 * 60 * 1000 },
  { unit: 'hour', duration: 60 * 60 * 1000, limit: 24 * 60 * 60 * 1000 },
  { unit: 'day', duration: 24 * 60 * 60 * 1000, limit: 7 * 24 * 60 * 60 * 1000 },
  { unit: 'week', duration: 7 * 24 * 60 * 60 * 1000, limit: 30 * 24 * 60 * 60 * 1000 },
  { unit: 'month', duration: 30 * 24 * 60 * 60 * 1000, limit: 365 * 24 * 60 * 60 * 1000 },
  { unit: 'year', duration: 365 * 24 * 60 * 60 * 1000, limit: Infinity },
];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function safeChoice(value, options, fallback) {
  return options.has(value) ? value : fallback;
}

function effectiveLang(host) {
  return host.getAttribute('lang')
    || host.closest('[lang]')?.getAttribute('lang')
    || document.documentElement.lang
    || navigator.language
    || undefined;
}

function toDate(value) {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  return new Date(value);
}

function selectUnit(diff) {
  const absoluteDiff = Math.abs(diff);

  return units.find(unit => absoluteDiff < unit.limit) ?? units[units.length - 1];
}

function nextSyncDelay(diff, duration) {
  const absoluteDiff = Math.abs(diff);
  const remainder = absoluteDiff % duration;
  const delay = remainder === 0 ? duration : duration - remainder;

  return Math.max(1000, Math.min(delay + 50, 24 * 60 * 60 * 1000));
}

class TblrRelativeTime extends HTMLElement {
  static observedAttributes = ['date', 'format', 'numeric', 'sync', 'lang'];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.defaultDate = new Date();
    this.propertyDate = null;
    this.settingPropertyDate = false;
    this.syncTimer = null;
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.clearSyncTimer();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;

    if (name === 'date' && !this.settingPropertyDate) {
      this.propertyDate = null;
    }

    this.render();
  }

  get date() {
    return this.propertyDate ?? this.getAttribute('date') ?? this.defaultDate;
  }

  set date(value) {
    if (value instanceof Date) {
      this.propertyDate = value;
      this.settingPropertyDate = true;
      this.removeAttribute('date');
      this.settingPropertyDate = false;
      this.render();
      return;
    }

    this.propertyDate = null;

    if (value == null) {
      this.removeAttribute('date');
    } else {
      this.setAttribute('date', value);
    }
  }

  get format() {
    return safeChoice(this.getAttribute('format'), formats, 'long');
  }

  set format(value) {
    this.setAttribute('format', value ?? 'long');
  }

  get numeric() {
    return safeChoice(this.getAttribute('numeric'), numerics, 'auto');
  }

  set numeric(value) {
    this.setAttribute('numeric', value ?? 'auto');
  }

  get sync() {
    return this.hasAttribute('sync');
  }

  set sync(value) {
    if (value) {
      this.setAttribute('sync', '');
    } else {
      this.removeAttribute('sync');
    }
  }

  get relativeTime() {
    return this.formatRelativeTime().text;
  }

  clearSyncTimer() {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
  }

  scheduleSync(diff, duration) {
    this.clearSyncTimer();

    if (!this.sync) return;

    this.syncTimer = setTimeout(() => {
      this.render();
    }, nextSyncDelay(diff, duration));
  }

  formatRelativeTime() {
    const date = toDate(this.date);

    if (Number.isNaN(date.getTime())) {
      return {
        date,
        duration: 1000,
        diff: 0,
        isValid: false,
        text: '',
      };
    }

    const diff = date.getTime() - Date.now();
    const { unit, duration } = selectUnit(diff);
    const value = Math.round(diff / duration);
    const formatter = new Intl.RelativeTimeFormat(effectiveLang(this), {
      numeric: this.numeric,
      style: this.format,
    });

    return {
      date,
      duration,
      diff,
      isValid: true,
      text: formatter.format(value, unit),
    };
  }

  render() {
    const { date, duration, diff, isValid, text } = this.formatRelativeTime();
    const dateTime = Number.isNaN(date.getTime()) ? '' : date.toISOString();

    if (isValid) {
      this.scheduleSync(diff, duration);
    } else {
      this.clearSyncTimer();
    }

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">
      <time part="base" class="relative-time" datetime="${escapeHtml(dateTime)}">${escapeHtml(text)}</time>
    `;
  }
}

Component({
  tag: 'tblr-relative-time',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrRelativeTime);

export { TblrRelativeTime };
