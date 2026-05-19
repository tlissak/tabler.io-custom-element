import { Component } from '../../core/component.js';

const stylesheetUrl = new URL('./tblr-tinymce-editor.css', import.meta.url);
const defaultPlugins = 'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table wordcount';
const defaultToolbar = 'undo redo | blocks | bold italic underline forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image table | code fullscreen';
const scriptLoads = new Map();

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

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function cloudScriptUrl(host) {
  const src = host.getAttribute('src');

  if (src) return src;

  const channel = encodeURIComponent(host.getAttribute('cloud-channel') || '6.8.3');

  return `https://cdnjs.cloudflare.com/ajax/libs/tinymce/${channel}/tinymce.min.js` ;
}

function loadScript(src) {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.tinymce) return Promise.resolve(window.tinymce);
  if (scriptLoads.has(src)) return scriptLoads.get(src);

  const promise = new Promise((resolve, reject) => {
    const existing = Array.from(document.scripts).find(script => (
      script.dataset.tblrTinymce === 'true'
      && (script.getAttribute('src') === src || script.src === new URL(src, document.baseURI).href)
    ));

    if (existing) {
      existing.addEventListener('load', () => resolve(window.tinymce), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Unable to load TinyMCE from ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.tblrTinymce = 'true';
    script.referrerPolicy = 'origin';
    script.crossOrigin = 'anonymous';
    script.addEventListener('load', () => resolve(window.tinymce), { once: true });
    script.addEventListener('error', () => reject(new Error(`Unable to load TinyMCE from ${src}`)), { once: true });
    document.head.append(script);
  });

  scriptLoads.set(src, promise);

  return promise;
}

function readJsonConfig(value) {
  if (!value) return {};

  try {
    const config = JSON.parse(value);

    return config && typeof config === 'object' && !Array.isArray(config) ? config : {};
  } catch {
    return {};
  }
}

class TblrTinyMceEditor extends HTMLElement {
  static formAssociated = true;

  static observedAttributes = [
    'name',
    'value',
    'label',
    'help',
    'placeholder',
    'disabled',
    'readonly',
    'required',
    'rows',
    'height',
    'plugins',
    'toolbar',
    'menubar',
    'src',
    'api-key',
    'cloud-channel',
    'license-key',
    'config',
    'lazy',
  ];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.internals = this.attachInternals?.();
    this.editor = null;
    this.reflectingValue = false;
    this.initToken = 0;
    this.observer = null;
    this.handleTextareaInput = this.handleTextareaInput.bind(this);
    this.handleTextareaChange = this.handleTextareaChange.bind(this);
  }

  connectedCallback() {
    this.upgradeProperty('value');
    this.render();
    if (booleanAttribute(this, 'lazy')) {
      this.initLazyEditor();
    } else {
      this.initEditor();
    }
  }

  disconnectedCallback() {
    this.initToken += 1;
    this.destroyObserver();
    this.destroyEditor();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;
    if (name === 'value' && this.reflectingValue) return;

    if (name === 'value') {
      this.syncEditorValue();
      return;
    }

    if (['disabled', 'readonly'].includes(name)) {
      this.syncEditorMode();
    }

    this.render();

    if (booleanAttribute(this, 'lazy') && !this.editor) {
      this.initLazyEditor();
    } else {
      this.destroyObserver();
      this.initEditor();
    }
  }

  get value() {
    if (this.editor) {
      return this.editor.getContent();
    }

    return this.textarea?.value ?? this.getAttribute('value') ?? '';
  }

  set value(value) {
    const nextValue = value == null ? '' : value.toString();

    if (this.getAttribute('value') !== nextValue) {
      this.setAttribute('value', nextValue);
    }

    this.syncEditorValue();
  }

  get textarea() {
    return this.root.querySelector('.textarea');
  }

  focus(options) {
    if (this.editor) {
      this.editor.focus();
      return;
    }

    this.textarea?.focus(options);
  }

  formResetCallback() {
    this.value = this.getAttribute('value') ?? '';
  }

  formDisabledCallback(disabled) {
    this.toggleAttribute('disabled', disabled);
  }

  render() {
    const label = this.getAttribute('label');
    const help = this.getAttribute('help');
    const placeholder = this.getAttribute('placeholder') ?? '';
    const disabled = booleanAttribute(this, 'disabled');
    const readonly = booleanAttribute(this, 'readonly');
    const required = booleanAttribute(this, 'required');
    const rows = positiveInteger(this.getAttribute('rows'), 8);
    const name = this.getAttribute('name') ?? '';

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">

      <label part="field" class="field">
        ${label ? `<span part="label" class="label">${escapeHtml(label)}${required ? ' <span class="required">*</span>' : ''}</span>` : ''}

        <span part="editor-wrap" class="editor-wrap">
          <textarea
            part="textarea"
            class="textarea"
            name="${escapeHtml(name)}"
            rows="${rows}"
            placeholder="${escapeHtml(placeholder)}"
            style="--tblr-tinymce-editor-min-rows: ${rows};"
            ${disabled ? 'disabled' : ''}
            ${readonly ? 'readonly' : ''}
            ${required ? 'required aria-required="true"' : ''}
          ></textarea>
          <span part="status" class="status" aria-live="polite">${booleanAttribute(this, 'lazy') && !this.editor ? '' : 'Loading TinyMCE...'}</span>
        </span>

        ${help ? `<span part="help" class="help">${escapeHtml(help)}</span>` : ''}
      </label>
    `;

    this.textarea.value = this.getAttribute('value') ?? '';
    this.textarea.addEventListener('input', this.handleTextareaInput);
    this.textarea.addEventListener('change', this.handleTextareaChange);
    this.setFormValue(this.textarea.value);
  }

  async initEditor() {
    const textarea = this.textarea;

    this.destroyEditor();
    this.destroyObserver();
    const token = ++this.initToken;

    this.setStatus('Loading TinyMCE...');

    if (!textarea || booleanAttribute(this, 'disabled')) {
      this.setStatus('');
      return;
    }

    try {
      const tinymce = await loadScript(cloudScriptUrl(this));

      if (token !== this.initToken || !this.isConnected || !textarea.isConnected) return;
      if (!tinymce?.init) throw new Error('TinyMCE did not expose tinymce.init().');

      const editors = await tinymce.init(this.createTinyMceConfig(textarea));

      if (token !== this.initToken || !this.isConnected) {
        editors?.forEach(editor => editor.remove());
        return;
      }

      this.editor = editors?.[0] ?? null;
      this.setStatus(this.editor ? '' : 'TinyMCE did not create an editor instance.', !this.editor);
      this.syncEditorValue();
      this.syncEditorMode();
    } catch (error) {
      this.setStatus(error.message || 'Unable to load TinyMCE.', true);
    }
  }

  createTinyMceConfig(textarea) {
    const userConfig = readJsonConfig(this.getAttribute('config'));
    const height = positiveInteger(this.getAttribute('height'), 320);
    const host = this;

    return {
      height,
      branding: false,
      promotion: false,
      menubar: this.readMenubar(),
      plugins: this.getAttribute('plugins') ?? defaultPlugins,
      toolbar: this.getAttribute('toolbar') ?? defaultToolbar,
      placeholder: this.getAttribute('placeholder') ?? undefined,
      license_key: this.getAttribute('license-key') ?? undefined,
      readonly: booleanAttribute(this, 'readonly'),
      disabled: booleanAttribute(this, 'disabled'),
      ...userConfig,
      selector: undefined,
      target: textarea,
      setup(editor) {
        editor.on('input change undo redo setcontent', () => host.reflectValueFromEditor('input'));
        editor.on('blur', () => host.dispatchChange());
      },
    };
  }

  destroyEditor() {
    if (this.editor) {
      this.editor.remove();
      this.editor = null;
    }
  }

  initLazyEditor() {
    this.initToken += 1;
    this.destroyObserver();
    this.setStatus('');

    if (this.editor) return;

    this.observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) {
        this.initEditor();
      }
    }, { rootMargin: '50px' });
    this.observer.observe(this);
  }

  destroyObserver() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  readMenubar() {
    if (!this.hasAttribute('menubar')) {
      return 'file edit view insert format tools table';
    }

    const value = this.getAttribute('menubar');

    if (value === '' || value === 'true') return true;
    if (value === 'false' || value === 'none') return false;

    return value;
  }

  syncEditorValue() {
    const value = this.getAttribute('value') ?? '';

    if (this.textarea && this.textarea.value !== value) {
      this.textarea.value = value;
    }

    if (this.editor && this.editor.getContent() !== value) {
      this.editor.setContent(value);
    }

    this.setFormValue(value);
  }

  syncEditorMode() {
    if (!this.editor) return;

    const disabled = booleanAttribute(this, 'disabled');
    const readonly = booleanAttribute(this, 'readonly');

    this.editor.options?.set?.('disabled', disabled);
    this.editor.mode?.set?.(readonly ? 'readonly' : 'design');
  }

  reflectValueFromEditor(eventType) {
    if (!this.editor) return;

    const value = this.editor.getContent();

    this.reflectingValue = true;
    this.setAttribute('value', value);
    this.reflectingValue = false;

    if (this.textarea) {
      this.textarea.value = value;
    }

    this.setFormValue(value);

    if (eventType === 'input') {
      this.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        composed: true,
        inputType: 'insertText',
      }));
    }
  }

  reflectValueFromTextarea() {
    const value = this.textarea?.value ?? '';

    this.reflectingValue = true;
    this.setAttribute('value', value);
    this.reflectingValue = false;
    this.setFormValue(value);
  }

  handleTextareaInput(event) {
    this.reflectValueFromTextarea();
    this.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      composed: true,
      data: event.data,
      inputType: event.inputType,
    }));
  }

  handleTextareaChange() {
    this.dispatchChange();
  }

  dispatchChange() {
    this.dispatchEvent(new Event('change', {
      bubbles: true,
      composed: true,
    }));
  }

  setFormValue(value) {
    this.internals?.setFormValue?.(value);
  }

  setStatus(message, error = false) {
    const status = this.root.querySelector('.status');

    if (!status) return;

    status.textContent = message;
    status.classList.toggle('error', error);
  }

  upgradeProperty(property) {
    if (!Object.prototype.hasOwnProperty.call(this, property)) return;

    const value = this[property];
    delete this[property];
    this[property] = value;
  }
}

Component({
  tag: 'tblr-tinymce-editor',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrTinyMceEditor);

export { TblrTinyMceEditor };
