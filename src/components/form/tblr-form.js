import { Component } from '../../core/component.js';

const submitInputTypes = new Set(['submit', 'image']);
const richTextEditorSelector = 'tinymce-editor,it-rte,tblr-tinymce-editor';

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function flattenObject(value, path = '', result = {}) {
  if (value === undefined || value === null) return result;

  if (Array.isArray(value)) {
    if (value.some(item => isPlainObject(item) || Array.isArray(item))) {
      value.forEach((item, index) => flattenObject(item, `${path}[${index}]`, result));
    } else {
      result[path] = value;
    }

    return result;
  }

  if (isPlainObject(value)) {
    Object.entries(value).forEach(([key, childValue]) => {
      flattenObject(childValue, path ? `${path}[${key}]` : key, result);
    });

    return result;
  }

  result[path] = value;
  return result;
}

function parseJson(value, fallback = {}) {
  if (!value) return fallback;

  try {
    const parsed = JSON.parse(value);

    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function nameSelector(name) {
  const escaped = typeof CSS !== 'undefined' && CSS.escape
    ? CSS.escape(name)
    : String(name).replaceAll('\\', '\\\\').replaceAll('"', '\\"');

  return `[name="${escaped}"]`;
}

function valuesOf(value) {
  return Array.isArray(value) ? value : [value];
}

function sameValue(left, right) {
  return String(left ?? '') === String(right ?? '');
}

function readValue(element) {
  if ('value' in element) return element.value;

  return element.getAttribute('value') ?? '';
}

function writeValue(element, value) {
  if ('value' in element) {
    element.value = value ?? '';
    return;
  }

  element.setAttribute('value', value ?? '');
}

function dispatchControlEvents(element) {
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function isNativeControl(element) {
  return element instanceof HTMLInputElement
    || element instanceof HTMLSelectElement
    || element instanceof HTMLTextAreaElement
    || element instanceof HTMLButtonElement;
}

function isSubmitter(element) {
  if (element instanceof HTMLButtonElement) {
    return (element.type || 'submit') === 'submit';
  }

  if (element instanceof HTMLInputElement) {
    return submitInputTypes.has(element.type);
  }

  return element instanceof HTMLElement
    && element.tagName.toLowerCase() === 'tblr-button'
    && (element.getAttribute('type') ?? 'button').toLowerCase() === 'submit';
}

function populateNative(control, value) {
  const values = valuesOf(value);

  if (control instanceof HTMLInputElement) {
    if (control.type === 'checkbox') {
      control.checked = values.includes(true) || values.some(item => sameValue(item, control.value));
      return;
    }

    if (control.type === 'radio') {
      control.checked = values.some(item => sameValue(item, control.value));
      return;
    }

    if (control.type === 'file') return;
  }

  if (control instanceof HTMLSelectElement && control.multiple) {
    [...control.options].forEach(option => {
      option.selected = values.some(item => sameValue(item, option.value));
    });
    return;
  }

  control.value = value ?? '';
}

function populateTabler(control, value) {
  const tag = control.tagName.toLowerCase();
  const values = valuesOf(value);

  if (tag === 'tblr-checkbox' || tag === 'tblr-switch' || tag === 'tblr-radio') {
    const controlValue = control.getAttribute('value')
      ?? (tag === 'tblr-switch' ? 'on' : control.getAttribute('label') ?? control.textContent.trim());

    control.checked = values.includes(true) || values.some(item => sameValue(item, controlValue));
    return;
  }

  if (tag === 'tblr-file-input') return;

  writeValue(control, Array.isArray(value) && tag !== 'tblr-select' ? value[0] ?? '' : value ?? '');
}

function findRichTextEditors(root, name) {
  const selector = nameSelector(name);

  return [...root.querySelectorAll(richTextEditorSelector)].filter(editor => (
    editor.getAttribute('name') === name
    || editor.querySelector(selector)
    || editor.shadowRoot?.querySelector(selector)
  ));
}

function populateRichTextEditor(editor, name, value) {
  const stringValue = String(value ?? '');
  const selector = nameSelector(name);

  writeValue(editor, stringValue);
  editor.querySelectorAll(selector).forEach(control => {
    writeValue(control, stringValue);
  });
  editor.shadowRoot?.querySelectorAll(selector).forEach(control => {
    writeValue(control, stringValue);
  });
  dispatchControlEvents(editor);
}

class TblrForm extends HTMLElement {
  static observedAttributes = ['action', 'method', 'data', 'loading'];

  constructor() {
    super();
    this._form = null;
    this.loadingButtons = new Map();
    this.onSubmit = this.onSubmit.bind(this);
    this.onClick = this.onClick.bind(this);
  }

  connectedCallback() {
    this.render();
    this.addEventListener('click', this.onClick);

    if (this.hasAttribute('data')) {
      this.populate(parseJson(this.getAttribute('data')));
    }
  }

  disconnectedCallback() {
    this.form?.removeEventListener('submit', this.onSubmit);
    this.removeEventListener('click', this.onClick);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;

    if (name === 'data') {
      this.populate(parseJson(newValue));
      return;
    }

    if (name === 'loading') {
      this.syncLoading();
      return;
    }

    this.render();
  }

  get action() {
    return this.getAttribute('action') || this.querySelector('form')?.getAttribute('action') || window.location.href;
  }

  set action(value) {
    this.setAttribute('action', value ?? '');
  }

  get method() {
    return (this.getAttribute('method') || this.querySelector('form')?.getAttribute('method') || 'post').toUpperCase();
  }

  set method(value) {
    this.setAttribute('method', value ?? 'post');
  }

  get loading() {
    return this.hasAttribute('loading');
  }

  set loading(value) {
    this.toggleAttribute('loading', Boolean(value));
  }

  get submitAsJson() {
    return this.hasAttribute('submit-as-json');
  }

  set submitAsJson(value) {
    this.toggleAttribute('submit-as-json', Boolean(value));
  }

  get form() {
    return this._form ?? this.querySelector(':scope > form[data-tblr-form]');
  }

  render() {
    let form = this.form;

    if (!form) {
      form = document.createElement('form');
      form.setAttribute('part', 'form');
      form.setAttribute('data-tblr-form', '');

      while (this.firstChild) {
        form.appendChild(this.firstChild);
      }

      this.appendChild(form);
      this._form = form;
    }

    form.setAttribute('action', this.action);
    form.setAttribute('method', this.method.toLowerCase());
    form.addEventListener('submit', this.onSubmit);
    this.syncLoading();
  }

  formData(submitter) {
    if (!this.form) return new FormData();
    return new FormData(this.form);
  }

  populate(data) {
    const values = flattenObject(data);

    Object.entries(values).forEach(([name, value]) => {
      findRichTextEditors(this, name).forEach(editor => {
        populateRichTextEditor(editor, name, value);
      });

      this.querySelectorAll(`${nameSelector(name)}, ${nameSelector(`${name}[]`)}`).forEach(control => {
        if (isNativeControl(control)) {
          populateNative(control, value);
        } else {
          populateTabler(control, value);
        }
      });
    });

    this.dispatchEvent(new CustomEvent('tblr-populate', {
      bubbles: true,
      composed: true,
      detail: { data, values },
    }));
  }

  requestSubmit(submitter) {
    return this.submit(submitter);
  }

  async submit(submitter) {
    if (this.loading || this.hasAttribute('disabled')) return null;

    const formData = this.formData(submitter);
    const request = this.createRequest(formData);
    const submitEvent = new CustomEvent('tblr-submit', {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: { formData, request, submitter },
    });

    if (!this.dispatchEvent(submitEvent)) return null;

    this.loading = true;

    try {
      const response = await fetch(request.url, {
        body: request.body,
        headers: request.headers,
        method: request.method,
      });
      const data = await this.readResponse(response);

      if (!response.ok) {
        throw Object.assign(new Error(`Request failed with ${response.status}`), { response, data });
      }

      this.dispatchEvent(new CustomEvent('tblr-success', {
        bubbles: true,
        composed: true,
        detail: { data, formData, response, submitter },
      }));

      return data;
    } catch (error) {
      this.dispatchEvent(new CustomEvent('tblr-error', {
        bubbles: true,
        composed: true,
        detail: { error, formData, response: error.response, submitter },
      }));

      throw error;
    } finally {
      this.loading = false;
      this.dispatchEvent(new CustomEvent('tblr-complete', {
        bubbles: true,
        composed: true,
        detail: { formData, submitter },
      }));
    }
  }

  createRequest(formData) {
    const method = this.method;
    const url = new URL(this.action, window.location.href);
    let body = formData;
    const headers = {};
    const enctype = (this.getAttribute('enctype') ?? '').toLowerCase();
    const submitAsJson = this.submitAsJson || enctype === 'application/json';

    if (!this.hasAttribute('no-ajax-param')) {
      url.searchParams.set(this.getAttribute('ajax-param') ?? 'ajax', this.getAttribute('ajax-param-value') ?? '1');
    }

    if (method === 'GET') {
      formData.forEach((value, key) => url.searchParams.append(key, value));
      body = undefined;
    } else if (submitAsJson) {
      body = JSON.stringify(Object.fromEntries(formData));
      headers['Content-Type'] = 'application/json';
      headers.Accept = 'application/json';
    }

    return {
      body,
      headers,
      method,
      url: url.href,
    };
  }

  async readResponse(response) {
    const responseType = this.getAttribute('response-type') ?? 'json';

    if (response.status === 204) return null;
    if (responseType === 'text') return response.text();
    if (responseType === 'blob') return response.blob();
    if (responseType === 'form-data') return response.formData();
    if (responseType === 'auto') {
      return (response.headers.get('content-type') ?? '').includes('application/json')
        ? response.json()
        : response.text();
    }

    return response.json();
  }

  onSubmit(event) {
    event.preventDefault();
    event.stopPropagation();
    this.submit(event.submitter).catch(error => console.error(error));
  }

  onClick(event) {
    const path = event.composedPath();
    const submitter = path.find(node => (
      node instanceof HTMLElement
      && node.tagName.toLowerCase() === 'tblr-button'
      && isSubmitter(node)
    )) ?? path.find(node => node instanceof Element && isSubmitter(node));

    if (!submitter) return;

    event.preventDefault();
    this.submit(submitter).catch(error => console.error(error));
  }

  syncLoading() {
    const loading = this.loading || this.hasAttribute('disabled');

    this.submitButtons.forEach(control => {
      if (loading) {
        if (!this.loadingButtons.has(control)) {
          this.loadingButtons.set(control, {
            disabled: control.hasAttribute('disabled'),
            loading: control.hasAttribute('loading'),
          });
        }

        control.setAttribute('disabled', '');
        control.setAttribute('loading', '');
        if ('disabled' in control) control.disabled = true;

        return;
      }

      const state = this.loadingButtons.get(control);
      if (!state) return;

      control.toggleAttribute('disabled', state.disabled);
      control.toggleAttribute('loading', state.loading);
      if ('disabled' in control) control.disabled = state.disabled;
    });

    if (!loading) {
      this.loadingButtons.clear();
    }
  }

  get submitButtons() {
    return [
      ...new Set(this.querySelectorAll('button[type="submit"], input[type="submit"], input[type="image"], tblr-button[type="submit"]')),
    ];
  }
}

Component({
  tag: 'tblr-form',
  version: '1.0.0',
})(TblrForm);

export { TblrForm, flattenObject };
