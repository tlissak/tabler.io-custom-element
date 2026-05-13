import { Component } from '../../core/component.js';

const stylesheetUrl = new URL('./tblr-datepicker.css', import.meta.url);
const monthFormatter = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' });
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function parseDate(value) {
  const match = isoDatePattern.exec(value ?? '');

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }

  return date;
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function sameDate(date, otherDate) {
  return date && otherDate && formatDate(date) === formatDate(otherDate);
}

class TblrDatepicker extends HTMLElement {
  static observedAttributes = [
    'name',
    'value',
    'placeholder',
    'label',
    'help',
    'disabled',
    'readonly',
    'required',
    'min',
    'max',
    'icon',
    'open',
  ];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.reflectingValue = false;
    this.viewDate = startOfMonth(parseDate(this.getAttribute('value')) ?? new Date());
    this.handleDocumentPointerDown = this.handleDocumentPointerDown.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
  }

  connectedCallback() {
    this.render();
    document.addEventListener('pointerdown', this.handleDocumentPointerDown);
  }

  disconnectedCallback() {
    document.removeEventListener('pointerdown', this.handleDocumentPointerDown);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;

    if (name === 'open') {
      this.updateOpenState();
      return;
    }

    if (name === 'value' && this.reflectingValue) {
      this.updateCalendar();
      return;
    }

    if (name === 'value') {
      const date = parseDate(newValue);
      if (date) this.viewDate = startOfMonth(date);
    }

    this.render();
  }

  get value() {
    return this.root.querySelector('input')?.value ?? this.getAttribute('value') ?? '';
  }

  set value(value) {
    this.setAttribute('value', value ?? '');
    const input = this.root.querySelector('input');
    if (input) input.value = value ?? '';
  }

  focus(options) {
    this.root.querySelector('input')?.focus(options);
  }

  render() {
    const label = this.getAttribute('label');
    const help = this.getAttribute('help');
    const disabled = this.hasAttribute('disabled');
    const readonly = this.hasAttribute('readonly');
    const required = this.hasAttribute('required');
    const icon = this.getAttribute('icon') ?? 'none';
    const iconMarkup = this.renderIcon();

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">

      <div part="field" class="field">
        ${label ? `<span part="label" class="label">${escapeHtml(label)}${required ? ' <span class="required">*</span>' : ''}</span>` : ''}
        <span part="control-wrap" class="control-wrap${disabled ? ' disabled' : ''}${this.hasAttribute('open') ? ' open' : ''}">
          ${icon === 'start' ? `<button part="button" class="icon-button" type="button" aria-label="Open calendar" ${disabled ? 'disabled' : ''}>${iconMarkup}</button>` : ''}
          <input
            part="control"
            class="control"
            type="text"
            inputmode="numeric"
            autocomplete="off"
            name="${escapeHtml(this.getAttribute('name') ?? '')}"
            value="${escapeHtml(this.getAttribute('value') ?? '')}"
            placeholder="${escapeHtml(this.getAttribute('placeholder') ?? 'YYYY-MM-DD')}"
            ${disabled ? 'disabled' : ''}
            ${readonly ? 'readonly' : ''}
            ${required ? 'required' : ''}
          >
          ${icon === 'end' ? `<button part="button" class="icon-button" type="button" aria-label="Open calendar" ${disabled ? 'disabled' : ''}>${iconMarkup}</button>` : ''}
        </span>
        ${help ? '<span part="help" class="help"></span>' : ''}
        <div part="calendar" class="calendar${this.hasAttribute('open') ? ' open' : ''}" role="dialog" aria-label="Choose date"></div>
      </div>
    `;

    const helpEl = this.root.querySelector('.help');
    const input = this.root.querySelector('input');

    if (helpEl) helpEl.textContent = help;

    input.addEventListener('focus', () => this.open());
    input.addEventListener('click', () => this.open());
    input.addEventListener('input', this.handleInput);
    input.addEventListener('change', this.handleChange);
    input.addEventListener('keydown', this.handleKeydown);

    this.root.querySelectorAll('.icon-button').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        this.toggle();
        this.focus();
      });
    });

    this.updateCalendar();
  }

  renderIcon() {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M8 2v4"></path>
        <path d="M16 2v4"></path>
        <rect x="3" y="4" width="18" height="18" rx="2"></rect>
        <path d="M3 10h18"></path>
        <path d="M8 14h.01"></path>
        <path d="M12 14h.01"></path>
        <path d="M16 14h.01"></path>
      </svg>
    `;
  }

  updateCalendar() {
    const calendar = this.root.querySelector('.calendar');
    const selectedDate = parseDate(this.value);
    const today = new Date();

    if (!calendar) return;

    calendar.classList.toggle('open', this.hasAttribute('open'));

    const firstDay = startOfMonth(this.viewDate);
    const daysInMonth = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate();
    const leadingDays = (firstDay.getDay() + 6) % 7;

    calendar.innerHTML = `
      <div class="calendar-header">
        <button part="previous-button" class="nav-button previous" type="button" aria-label="Previous month">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6"></path>
          </svg>
        </button>
        <div part="calendar-title" class="calendar-title">${escapeHtml(monthFormatter.format(firstDay))}</div>
        <button part="next-button" class="nav-button next" type="button" aria-label="Next month">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6"></path>
          </svg>
        </button>
      </div>
      <div class="weekdays">
        ${weekdays.map(day => `<span class="weekday">${day}</span>`).join('')}
      </div>
      <div class="days">
        ${Array.from({ length: leadingDays }, () => '<span class="empty"></span>').join('')}
        ${Array.from({ length: daysInMonth }, (_, index) => this.renderDay(firstDay.getFullYear(), firstDay.getMonth(), index + 1, selectedDate, today)).join('')}
      </div>
    `;

    calendar.querySelector('.previous')?.addEventListener('click', () => {
      this.viewDate = addMonths(this.viewDate, -1);
      this.updateCalendar();
    });

    calendar.querySelector('.next')?.addEventListener('click', () => {
      this.viewDate = addMonths(this.viewDate, 1);
      this.updateCalendar();
    });

    calendar.querySelectorAll('.day').forEach(dayButton => {
      dayButton.addEventListener('click', () => this.selectDate(dayButton.dataset.value));
    });
  }

  updateOpenState() {
    const open = this.hasAttribute('open');

    this.root.querySelector('.control-wrap')?.classList.toggle('open', open);
    this.root.querySelector('.calendar')?.classList.toggle('open', open);
  }

  renderDay(year, month, day, selectedDate, today) {
    const date = new Date(year, month, day);
    const value = formatDate(date);
    const selected = sameDate(date, selectedDate);
    const isToday = sameDate(date, today);
    const disabled = this.dateDisabled(date);

    return `
      <button
        part="day"
        class="day${selected ? ' selected' : ''}${isToday ? ' today' : ''}"
        type="button"
        data-value="${value}"
        ${selected ? 'aria-pressed="true"' : ''}
        ${disabled ? 'disabled' : ''}
      >${day}</button>
    `;
  }

  dateDisabled(date) {
    const min = parseDate(this.getAttribute('min'));
    const max = parseDate(this.getAttribute('max'));

    if (min && date < min) return true;
    if (max && date > max) return true;

    return false;
  }

  open() {
    if (this.hasAttribute('disabled') || this.hasAttribute('readonly')) return;
    if (this.hasAttribute('open')) return;

    this.setAttribute('open', '');
  }

  close() {
    if (!this.hasAttribute('open')) return;

    this.removeAttribute('open');
  }

  toggle() {
    if (this.hasAttribute('open')) {
      this.close();
      return;
    }

    this.open();
  }

  selectDate(value) {
    if (!value) return;

    this.reflectingValue = true;
    this.setAttribute('value', value);
    this.reflectingValue = false;

    const input = this.root.querySelector('input');
    if (input) input.value = value;

    this.viewDate = startOfMonth(parseDate(value));
    this.updateCalendar();
    this.close();

    this.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      composed: true,
    }));
    this.dispatchEvent(new Event('change', {
      bubbles: true,
      composed: true,
    }));
  }

  handleInput(event) {
    this.reflectingValue = true;
    this.setAttribute('value', event.target.value);
    this.reflectingValue = false;

    const date = parseDate(event.target.value);
    if (date) this.viewDate = startOfMonth(date);

    this.updateCalendar();
    this.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      composed: true,
      data: event.data,
      inputType: event.inputType,
    }));
  }

  handleChange() {
    this.dispatchEvent(new Event('change', {
      bubbles: true,
      composed: true,
    }));
  }

  handleKeydown(event) {
    if (event.key === 'Escape') {
      this.close();
    }
  }

  handleDocumentPointerDown(event) {
    if (!event.composedPath().includes(this)) {
      this.close();
    }
  }
}

Component({
  tag: 'tblr-datepicker',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrDatepicker);

export { TblrDatepicker };
