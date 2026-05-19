import { Component } from '../../core/component.js';
import { attachInternals, setFormValue, syncValidity } from '../../core/form-associated.js';

const stylesheetUrl = new URL('./tblr-datepicker.css', import.meta.url);
const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const yearsPerPage = 12;
const weekdayDates = [
  new Date(2024, 0, 1),
  new Date(2024, 0, 2),
  new Date(2024, 0, 3),
  new Date(2024, 0, 4),
  new Date(2024, 0, 5),
  new Date(2024, 0, 6),
  new Date(2024, 0, 7),
];

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

function addYears(date, amount) {
  return new Date(date.getFullYear() + amount, date.getMonth(), 1);
}

function startOfYearPage(year) {
  return Math.floor(year / yearsPerPage) * yearsPerPage;
}

function effectiveLang(host) {
  return host.getAttribute('lang')
    || host.closest('[lang]')?.getAttribute('lang')
    || document.documentElement.lang
    || navigator.language
    || undefined;
}

function sameDate(date, otherDate) {
  return date && otherDate && formatDate(date) === formatDate(otherDate);
}

class TblrDatepicker extends HTMLElement {
  static formAssociated = true;

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
    'lang',
  ];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.internals = attachInternals(this);
    this.defaultFormValue = null;
    this.reflectingValue = false;
    this.calendarView = 'days';
    this.returnViewAfterYearSelection = 'days';
    this.viewDate = startOfMonth(parseDate(this.getAttribute('value')) ?? new Date());
    this.handleDocumentPointerDown = this.handleDocumentPointerDown.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
  }

  connectedCallback() {
    if (this.defaultFormValue === null) {
      this.defaultFormValue = this.getAttribute('value') ?? '';
    }

    this.render();
    document.addEventListener('pointerdown', this.handleDocumentPointerDown);
  }

  disconnectedCallback() {
    document.removeEventListener('pointerdown', this.handleDocumentPointerDown);
  }

  formResetCallback() {
    this.value = this.defaultFormValue ?? '';
  }

  formDisabledCallback(disabled) {
    this.toggleAttribute('disabled', disabled);
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
    this.updateFormState();
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
    this.updateFormState();
  }

  renderIcon() {
    return `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
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

    if (this.calendarView === 'years') {
      calendar.innerHTML = this.renderYearPicker(selectedDate, today);
    } else if (this.calendarView === 'months') {
      calendar.innerHTML = this.renderMonthPicker(selectedDate, today);
    } else {
      calendar.innerHTML = this.renderDaysPicker(selectedDate, today);
    }

    calendar.querySelector('.previous')?.addEventListener('click', () => {
      if (this.calendarView === 'years') {
        this.viewDate = addYears(this.viewDate, -yearsPerPage);
      } else if (this.calendarView === 'months') {
        this.viewDate = addYears(this.viewDate, -1);
      } else {
        this.viewDate = addMonths(this.viewDate, -1);
      }

      this.updateCalendar();
    });

    calendar.querySelector('.next')?.addEventListener('click', () => {
      if (this.calendarView === 'years') {
        this.viewDate = addYears(this.viewDate, yearsPerPage);
      } else if (this.calendarView === 'months') {
        this.viewDate = addYears(this.viewDate, 1);
      } else {
        this.viewDate = addMonths(this.viewDate, 1);
      }

      this.updateCalendar();
    });

    calendar.querySelector('.month-toggle')?.addEventListener('click', () => {
      this.calendarView = 'months';
      this.updateCalendar();
    });

    calendar.querySelector('.year-toggle')?.addEventListener('click', () => {
      this.returnViewAfterYearSelection = this.calendarView === 'months' ? 'months' : 'days';
      this.calendarView = 'years';
      this.updateCalendar();
    });

    calendar.querySelectorAll('.month').forEach(monthButton => {
      monthButton.addEventListener('click', () => this.selectMonth(Number(monthButton.dataset.month)));
    });

    calendar.querySelectorAll('.year').forEach(yearButton => {
      yearButton.addEventListener('click', () => this.selectYear(Number(yearButton.dataset.year)));
    });

    calendar.querySelectorAll('.day').forEach(dayButton => {
      dayButton.addEventListener('click', () => this.selectDate(dayButton.dataset.value));
    });
  }

  renderDaysPicker(selectedDate, today) {
    const firstDay = startOfMonth(this.viewDate);
    const daysInMonth = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate();
    const leadingDays = (firstDay.getDay() + 6) % 7;
    const lang = effectiveLang(this);
    const monthFormatter = new Intl.DateTimeFormat(lang, { month: 'long' });
    const weekdayFormatter = new Intl.DateTimeFormat(lang, { weekday: 'short' });

    return `
      <div class="calendar-header">
        <button part="previous-button" class="nav-button previous" type="button" aria-label="Previous month">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6"></path>
          </svg>
        </button>
        <div part="calendar-title" class="calendar-title">
          <button part="month-button" class="month-toggle" type="button" aria-label="Change month">${escapeHtml(monthFormatter.format(firstDay))}</button>
          <button part="year-button" class="year-toggle" type="button" aria-label="Change year">${firstDay.getFullYear()}</button>
        </div>
        <button part="next-button" class="nav-button next" type="button" aria-label="Next month">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6"></path>
          </svg>
        </button>
      </div>
      <div class="weekdays">
        ${weekdayDates.map(day => `<span class="weekday">${escapeHtml(weekdayFormatter.format(day))}</span>`).join('')}
      </div>
      <div class="days">
        ${Array.from({ length: leadingDays }, () => '<span class="empty"></span>').join('')}
        ${Array.from({ length: daysInMonth }, (_, index) => this.renderDay(firstDay.getFullYear(), firstDay.getMonth(), index + 1, selectedDate, today)).join('')}
      </div>
    `;
  }

  renderMonthPicker(selectedDate, today) {
    const year = this.viewDate.getFullYear();
    const monthFormatter = new Intl.DateTimeFormat(effectiveLang(this), { month: 'short' });

    return `
      <div class="calendar-header">
        <button part="previous-button" class="nav-button previous" type="button" aria-label="Previous year">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6"></path>
          </svg>
        </button>
        <div part="calendar-title" class="calendar-title">
          <button part="year-button" class="year-toggle" type="button" aria-label="Change year">${year}</button>
        </div>
        <button part="next-button" class="nav-button next" type="button" aria-label="Next year">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6"></path>
          </svg>
        </button>
      </div>
      <div class="months">
        ${Array.from({ length: 12 }, (_, month) => this.renderMonth(year, month, selectedDate, today, monthFormatter)).join('')}
      </div>
    `;
  }

  renderYearPicker(selectedDate, today) {
    const year = this.viewDate.getFullYear();
    const startYear = startOfYearPage(year);
    const selectedYear = selectedDate?.getFullYear();
    const currentYear = today.getFullYear();

    return `
      <div class="calendar-header">
        <button part="previous-button" class="nav-button previous" type="button" aria-label="Previous years">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6"></path>
          </svg>
        </button>
        <div part="calendar-title" class="calendar-title">${startYear} - ${startYear + yearsPerPage - 1}</div>
        <button part="next-button" class="nav-button next" type="button" aria-label="Next years">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6"></path>
          </svg>
        </button>
      </div>
      <div class="years">
        ${Array.from({ length: yearsPerPage }, (_, index) => this.renderYear(startYear + index, selectedYear, currentYear)).join('')}
      </div>
    `;
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

  renderMonth(year, month, selectedDate, today, monthFormatter) {
    const monthDate = new Date(year, month, 1);
    const selected = selectedDate?.getFullYear() === year && selectedDate?.getMonth() === month;
    const isCurrent = today.getFullYear() === year && today.getMonth() === month;
    const disabled = this.monthDisabled(year, month);

    return `
      <button
        part="month"
        class="month${selected ? ' selected' : ''}${isCurrent ? ' current' : ''}"
        type="button"
        data-month="${month}"
        ${selected ? 'aria-pressed="true"' : ''}
        ${disabled ? 'disabled' : ''}
      >${escapeHtml(monthFormatter.format(monthDate))}</button>
    `;
  }

  renderYear(year, selectedYear, currentYear) {
    const selected = year === selectedYear;
    const isCurrent = year === currentYear;
    const disabled = this.yearDisabled(year);

    return `
      <button
        part="year"
        class="year${selected ? ' selected' : ''}${isCurrent ? ' current' : ''}"
        type="button"
        data-year="${year}"
        ${selected ? 'aria-pressed="true"' : ''}
        ${disabled ? 'disabled' : ''}
      >${year}</button>
    `;
  }

  dateDisabled(date) {
    const min = parseDate(this.getAttribute('min'));
    const max = parseDate(this.getAttribute('max'));

    if (min && date < min) return true;
    if (max && date > max) return true;

    return false;
  }

  monthDisabled(year, month) {
    const min = parseDate(this.getAttribute('min'));
    const max = parseDate(this.getAttribute('max'));
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    if (min && lastDay < min) return true;
    if (max && firstDay > max) return true;

    return false;
  }

  yearDisabled(year) {
    const min = parseDate(this.getAttribute('min'));
    const max = parseDate(this.getAttribute('max'));
    const firstDay = new Date(year, 0, 1);
    const lastDay = new Date(year, 11, 31);

    if (min && lastDay < min) return true;
    if (max && firstDay > max) return true;

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

    this.calendarView = 'days';
    this.viewDate = startOfMonth(parseDate(value));
    this.updateCalendar();
    this.close();
    this.updateFormState();

    this.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      composed: true,
    }));
    this.dispatchEvent(new Event('change', {
      bubbles: true,
      composed: true,
    }));
  }

  selectYear(year) {
    if (!Number.isInteger(year) || this.yearDisabled(year)) return;

    this.calendarView = this.returnViewAfterYearSelection;
    this.returnViewAfterYearSelection = 'days';
    this.viewDate = new Date(year, this.viewDate.getMonth(), 1);
    this.updateCalendar();
  }

  selectMonth(month) {
    if (!Number.isInteger(month) || this.monthDisabled(this.viewDate.getFullYear(), month)) return;

    this.calendarView = 'days';
    this.viewDate = new Date(this.viewDate.getFullYear(), month, 1);
    this.updateCalendar();
  }

  handleInput(event) {
    this.reflectingValue = true;
    this.setAttribute('value', event.target.value);
    this.reflectingValue = false;

    const date = parseDate(event.target.value);
    if (date) this.viewDate = startOfMonth(date);

    this.updateCalendar();
    this.updateFormState();
    this.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      composed: true,
      data: event.data,
      inputType: event.inputType,
    }));
  }

  handleChange() {
    this.updateFormState();
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

  updateFormState() {
    setFormValue(this.internals, this.hasAttribute('disabled') ? null : this.value);
    syncValidity(this.internals, this.root.querySelector('input'));
  }
}

Component({
  tag: 'tblr-datepicker',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrDatepicker);

export { TblrDatepicker };
