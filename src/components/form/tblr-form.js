import { Component } from '../../core/component.js';

const stylesheetUrl = new URL('./tblr-form.css', import.meta.url);
const submitInputTypes = new Set(['submit', 'image']);
const ignoredNativeTypes = new Set(['button', 'reset', 'submit', 'image']);

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function booleanAttribute(host, name) {
  return host.hasAttribute(name);
}

function cssString(value) {
  if (typeof CSS !== 'undefined' && CSS.escape) {
    return CSS.escape(value);
  }

  return String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function appendAjaxParam(url, name, value) {
  const nextUrl = new URL(url, window.location.href);

  if (!name) return nextUrl;

  nextUrl.searchParams.set(name, value ?? '1');

  return nextUrl;
}

function parseJsonAttribute(value, fallback = {}) {
  if (!value) return fallback;

  try {
    const parsed = JSON.parse(value);

    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function flattenObject(value, path = '', output = {}) {
  if (value === undefined || value === null) return output;

  if (Array.isArray(value)) {
    if (!value.some(item => isPlainObject(item) || Array.isArray(item))) {
      output[path] = value;
      return output;
    }

    value.forEach((item, index) => {
      flattenObject(item, `${path}[${index}]`, output);
    });

    return output;
  }

  if (isPlainObject(value)) {
    Object.entries(value).forEach(([key, childValue]) => {
      flattenObject(childValue, path ? `${path}[${key}]` : key, output);
    });

    return output;
  }

  output[path] = value;
  return output;
}

function normalizeValues(value) {
  return Array.isArray(value) ? value : [value];
}

function valueMatches(left, right) {
  return String(left ?? '') === String(right ?? '');
}

function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0;

  return value !== undefined && value !== null && String(value) !== '';
}

function getElementValue(element) {
  if ('value' in element) return element.value;

  return element.getAttribute('value') ?? '';
}

function setElementValue(element, value) {
  if ('value' in element) {
    element.value = value ?? '';
    return;
  }

  element.setAttribute('value', value ?? '');
}

function isNativeFormControl(element) {
  return element instanceof HTMLInputElement
    || element instanceof HTMLSelectElement
    || element instanceof HTMLTextAreaElement
    || element instanceof HTMLButtonElement;
}

function isSubmitControl(element) {
  if (element instanceof HTMLButtonElement) {
    return (element.getAttribute('type') ?? 'submit').toLowerCase() === 'submit';
  }

  if (element instanceof HTMLInputElement) {
    return submitInputTypes.has(element.type);
  }

  if (element instanceof HTMLElement && element.tagName.toLowerCase() === 'tblr-button') {
    return (element.getAttribute('type') ?? 'button').toLowerCase() === 'submit';
  }

  return false;
}

function isTextEntryControl(element) {
  if (element instanceof HTMLTextAreaElement) return false;
  if (element instanceof HTMLButtonElement) return false;

  if (element instanceof HTMLInputElement) {
    return !['button', 'checkbox', 'file', 'hidden', 'image', 'radio', 'reset', 'submit'].includes(element.type);
  }

  return element instanceof HTMLElement
    && element.tagName.toLowerCase().startsWith('tblr-')
    && !['tblr-button', 'tblr-checkbox', 'tblr-radio', 'tblr-switch', 'tblr-file-input'].includes(element.tagName.toLowerCase());
}

function readCustomControlValues(element) {
  const tag = element.tagName.toLowerCase();
  const attrValue = element.getAttribute('value');

  if (tag === 'tblr-checkbox' || tag === 'tblr-switch') {
    if (!element.checked) return [];

    return [attrValue ?? (tag === 'tblr-switch' ? 'on' : element.getAttribute('label') ?? element.textContent.trim() ?? 'on')];
  }

  if (tag === 'tblr-radio') {
    if (!element.checked) return [];

    return [attrValue ?? element.getAttribute('label') ?? element.textContent.trim() ?? 'on'];
  }

  if (tag === 'tblr-file-input') {
    return [...(element.files ?? [])];
  }

  const value = getElementValue(element);

  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];

  return [value];
}

function appendNativeControl(formData, control) {
  const name = control.name;

  if (!name || control.disabled) return;

  if (control instanceof HTMLInputElement) {
    if (ignoredNativeTypes.has(control.type)) return;
    if ((control.type === 'checkbox' || control.type === 'radio') && !control.checked) return;

    if (control.type === 'file') {
      [...control.files].forEach(file => formData.append(name, file));
      return;
    }

    formData.append(name, control.value);
    return;
  }

  if (control instanceof HTMLSelectElement && control.multiple) {
    [...control.selectedOptions].forEach(option => formData.append(name, option.value));
    return;
  }

  if (control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) {
    formData.append(name, control.value);
  }
}

function populateNativeControl(control, value) {
  const values = normalizeValues(value);

  if (control instanceof HTMLInputElement) {
    if (control.type === 'checkbox') {
      control.checked = values.includes(true) || values.some(item => valueMatches(item, control.value));
      return;
    }

    if (control.type === 'radio') {
      control.checked = values.some(item => valueMatches(item, control.value));
      return;
    }

    if (control.type === 'file') return;
  }

  if (control instanceof HTMLSelectElement && control.multiple) {
    [...control.options].forEach(option => {
      option.selected = values.some(item => valueMatches(item, option.value));
    });
    return;
  }

  control.value = value ?? '';
}

function populateCustomControl(control, value) {
  const tag = control.tagName.toLowerCase();
  const values = normalizeValues(value);

  if (tag === 'tblr-checkbox' || tag === 'tblr-switch') {
    const checkedValue = control.getAttribute('value') ?? (tag === 'tblr-switch' ? 'on' : control.getAttribute('label') ?? control.textContent.trim());
    control.checked = values.includes(true) || values.some(item => valueMatches(item, checkedValue));
    return;
  }

  if (tag === 'tblr-radio') {
    const radioValue = control.getAttribute('value') ?? control.getAttribute('label') ?? control.textContent.trim();
    control.checked = values.some(item => valueMatches(item, radioValue));
    return;
  }

  if (tag === 'tblr-file-input') return;

  if (tag === 'tblr-select' && booleanAttribute(control, 'multiple')) {
    setElementValue(control, values);
    return;
  }

  setElementValue(control, Array.isArray(value) ? values[0] ?? '' : value ?? '');
}

class TblrForm extends HTMLElement {
  static observedAttributes = [
    'action',
    'method',
    'enctype',
    'response-type',
    'ajax-param',
    'ajax-param-value',
    'headers',
    'data',
    'disabled',
    'loading',
  ];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.submitControlStates = new WeakMap();
    this.activeRequest = null;
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
  }

  connectedCallback() {
    this.render();
    this.addEventListener('submit', this.handleSubmit);
    this.addEventListener('click', this.handleClick);
    this.addEventListener('keydown', this.handleKeydown);

    if (this.hasAttribute('data')) {
      this.populate(parseJsonAttribute(this.getAttribute('data'), {}));
    }
  }

  disconnectedCallback() {
    this.removeEventListener('submit', this.handleSubmit);
    this.removeEventListener('click', this.handleClick);
    this.removeEventListener('keydown', this.handleKeydown);
    this.activeRequest?.abort();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;

    if (name === 'loading') {
      this.syncLoadingState();
      return;
    }

    if (name === 'data') {
      this.populate(parseJsonAttribute(newValue, {}));
      return;
    }

    this.render();
  }

  get form() {
    return this.root.querySelector('form');
  }

  get loading() {
    return booleanAttribute(this, 'loading');
  }

  set loading(value) {
    this.toggleAttribute('loading', Boolean(value));
  }

  get method() {
    return (this.getAttribute('method') || this.querySelector('form')?.getAttribute('method') || 'post').toLowerCase();
  }

  set method(value) {
    this.setAttribute('method', value ?? 'post');
  }

  get action() {
    return this.getAttribute('action') || this.querySelector('form')?.getAttribute('action') || window.location.href;
  }

  set action(value) {
    this.setAttribute('action', value ?? '');
  }

  render() {
    const method = this.method;
    const action = this.action;
    const enctype = this.getAttribute('enctype') || this.querySelector('form')?.getAttribute('enctype') || 'multipart/form-data';

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">
      <form part="form" class="form" method="${escapeHtml(method)}" action="${escapeHtml(action)}" enctype="${escapeHtml(enctype)}">
        <slot></slot>
      </form>
    `;

    this.form?.addEventListener('submit', this.handleSubmit);
    this.syncLoadingState();
  }

  formData(submitter) {
    const formData = new FormData();

    this.querySelectorAll('input, select, textarea, button').forEach(control => {
      appendNativeControl(formData, control);
    });

    this.querySelectorAll('[name]').forEach(control => {
      if (isNativeFormControl(control)) return;
      if (!(control instanceof HTMLElement) || !control.tagName.toLowerCase().startsWith('tblr-')) return;
      if (booleanAttribute(control, 'disabled')) return;

      const name = control.getAttribute('name');
      if (!name) return;

      readCustomControlValues(control).forEach(value => {
        formData.append(name, value);
      });
    });

    const submitterName = submitter?.name || submitter?.getAttribute?.('name');

    if (submitterName) {
      formData.append(submitterName, submitter.value ?? submitter.getAttribute?.('value') ?? '');
    }

    return formData;
  }

  populate(data) {
    const values = flattenObject(data);

    Object.entries(values).forEach(([name, value]) => {
      this.findControlsByName(name).forEach(control => {
        if (isNativeFormControl(control)) {
          populateNativeControl(control, value);
          return;
        }

        populateCustomControl(control, value);
      });
    });

    this.dispatchEvent(new CustomEvent('tblr-populate', {
      bubbles: true,
      composed: true,
      detail: {
        data,
        values,
      },
    }));
  }

  findControlsByName(name) {
    const selectors = [`[name="${cssString(name)}"]`];

    if (!name.endsWith('[]')) {
      selectors.push(`[name="${cssString(`${name}[]`)}"]`);
    }

    return [...this.querySelectorAll(selectors.join(','))];
  }

  checkValidity() {
    return this.getSubmittableControls().every(control => this.controlIsValid(control));
  }

  reportValidity() {
    const invalidControl = this.getSubmittableControls().find(control => !this.controlIsValid(control));

    if (!invalidControl) return true;

    if (typeof invalidControl.reportValidity === 'function') {
      return invalidControl.reportValidity();
    }

    invalidControl.focus?.();
    return false;
  }

  requestSubmit(submitter) {
    if (this.loading || booleanAttribute(this, 'disabled')) return Promise.resolve(null);

    if (!this.checkValidity()) {
      this.reportValidity();
      return Promise.resolve(null);
    }

    return this.submit(submitter);
  }

  submit(submitter) {
    if (this.loading || booleanAttribute(this, 'disabled')) return Promise.resolve(null);

    return this.send(submitter);
  }

  reset() {
    this.querySelectorAll('input, select, textarea').forEach(control => {
      if (control instanceof HTMLInputElement && (control.type === 'checkbox' || control.type === 'radio')) {
        control.checked = control.defaultChecked;
        return;
      }

      if (control instanceof HTMLInputElement) {
        control.value = control.type === 'file' ? '' : control.defaultValue ?? '';
        return;
      }

      if (control instanceof HTMLSelectElement) {
        [...control.options].forEach(option => {
          option.selected = option.defaultSelected;
        });
        return;
      }

      control.value = control.defaultValue ?? '';
    });

    this.querySelectorAll('[name]').forEach(control => {
      if (isNativeFormControl(control) || !(control instanceof HTMLElement) || !control.tagName.toLowerCase().startsWith('tblr-')) return;

      const tag = control.tagName.toLowerCase();

      if (tag === 'tblr-checkbox' || tag === 'tblr-radio' || tag === 'tblr-switch') {
        control.checked = booleanAttribute(control, 'checked');
        return;
      }

      if (tag === 'tblr-file-input') return;

      setElementValue(control, control.getAttribute('value') ?? '');
    });
  }

  async send(submitter) {
    const formData = this.formData(submitter);
    const request = this.createRequest(formData);
    const submitEvent = new CustomEvent('tblr-submit', {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: {
        formData,
        request,
        submitter,
      },
    });

    if (!this.dispatchEvent(submitEvent)) {
      return null;
    }

    this.activeRequest?.abort();
    this.activeRequest = new AbortController();
    this.loading = true;

    try {
      const response = await fetch(request.url, {
        body: request.body,
        credentials: request.credentials,
        headers: request.headers,
        method: request.method,
        signal: this.activeRequest.signal,
      });
      const data = await this.readResponse(response);

      if (!response.ok) {
        const error = new Error(`Request failed with ${response.status}`);
        error.response = response;
        error.data = data;
        throw error;
      }

      this.dispatchEvent(new CustomEvent('tblr-success', {
        bubbles: true,
        composed: true,
        detail: {
          data,
          formData,
          response,
          submitter,
        },
      }));

      return data;
    } catch (error) {
      if (error.name !== 'AbortError') {
        this.dispatchEvent(new CustomEvent('tblr-error', {
          bubbles: true,
          composed: true,
          detail: {
            error,
            formData,
            response: error.response,
            submitter,
          },
        }));
      }

      throw error;
    } finally {
      this.loading = false;
      this.activeRequest = null;
      this.dispatchEvent(new CustomEvent('tblr-complete', {
        bubbles: true,
        composed: true,
        detail: {
          formData,
          submitter,
        },
      }));
    }
  }

  createRequest(formData) {
    const method = this.method.toUpperCase();
    const headers = {
      Accept: this.getAcceptHeader(),
      ...parseJsonAttribute(this.getAttribute('headers'), {}),
    };
    const credentials = this.getAttribute('credentials') ?? 'same-origin';
    let url = this.action;
    let body = formData;

    if (!booleanAttribute(this, 'no-ajax-param')) {
      url = appendAjaxParam(url, this.getAttribute('ajax-param') ?? 'ajax', this.getAttribute('ajax-param-value') ?? '1').href;
    }

    if (method === 'GET') {
      const requestUrl = new URL(url, window.location.href);
      formData.forEach((value, key) => {
        requestUrl.searchParams.append(key, value);
      });
      url = requestUrl.href;
      body = undefined;
    }

    return {
      body,
      credentials,
      headers,
      method,
      url,
    };
  }

  async readResponse(response) {
    const responseType = this.getAttribute('response-type') ?? 'json';

    if (response.status === 204) return null;

    if (responseType === 'auto') {
      const contentType = response.headers.get('content-type') ?? '';

      if (contentType.includes('application/json')) return response.json();
      return response.text();
    }

    if (responseType === 'text') return response.text();
    if (responseType === 'blob') return response.blob();
    if (responseType === 'form-data') return response.formData();

    return response.json();
  }

  getAcceptHeader() {
    const responseType = this.getAttribute('response-type') ?? 'json';

    if (responseType === 'text') return 'text/plain, */*';
    if (responseType === 'blob') return '*/*';

    return 'application/json, text/plain;q=0.9, */*;q=0.8';
  }

  handleSubmit(event) {
    event.preventDefault();
    event.stopPropagation();

    this.requestSubmit(event.submitter).catch(error => {
      if (error.name !== 'AbortError') {
        console.error(error);
      }
    });
  }

  handleClick(event) {
    if (event.defaultPrevented || this.loading || booleanAttribute(this, 'disabled')) return;

    const submitter = event.composedPath().find(node => node instanceof Element && isSubmitControl(node));
    if (!submitter) return;

    event.preventDefault();
    this.requestSubmit(submitter).catch(error => {
      if (error.name !== 'AbortError') {
        console.error(error);
      }
    });
  }

  handleKeydown(event) {
    if (event.defaultPrevented || event.key !== 'Enter' || this.loading || booleanAttribute(this, 'disabled')) return;

    const target = event.composedPath().find(node => node instanceof Element && isTextEntryControl(node));
    if (!target) return;

    event.preventDefault();
    this.requestSubmit().catch(error => {
      if (error.name !== 'AbortError') {
        console.error(error);
      }
    });
  }

  getSubmittableControls() {
    return [...this.querySelectorAll('input, select, textarea, [name]')]
      .filter(control => control instanceof HTMLElement)
      .filter(control => !booleanAttribute(control, 'disabled'))
      .filter(control => Boolean(control.getAttribute('name') || control.name));
  }

  controlIsValid(control) {
    if (typeof control.checkValidity === 'function' && !control.checkValidity()) return false;

    if (!booleanAttribute(control, 'required')) return true;

    if (control instanceof HTMLInputElement && (control.type === 'checkbox' || control.type === 'radio')) {
      return control.checked;
    }

    if (control.tagName?.toLowerCase() === 'tblr-checkbox' || control.tagName?.toLowerCase() === 'tblr-switch') {
      return control.checked;
    }

    return hasValue(getElementValue(control));
  }

  getSubmitControls() {
    return [...this.querySelectorAll('button, input, tblr-button')].filter(isSubmitControl);
  }

  syncLoadingState() {
    const loading = this.loading || booleanAttribute(this, 'disabled');

    this.getSubmitControls().forEach(control => {
      if (!this.submitControlStates.has(control)) {
        this.submitControlStates.set(control, {
          disabled: booleanAttribute(control, 'disabled'),
        });
      }

      const originalState = this.submitControlStates.get(control);
      const shouldDisable = loading || originalState.disabled;

      control.toggleAttribute('disabled', shouldDisable);

      if ('disabled' in control) {
        control.disabled = shouldDisable;
      }

      control.classList.toggle('loading', loading);

      if (!loading && !originalState.disabled) {
        control.removeAttribute('disabled');
      }
    });
  }
}

Component({
  tag: 'tblr-form',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrForm);

export { TblrForm, flattenObject };
