import { Component } from '../../core/component.js';

const stylesheetUrl = new URL('./tblr-rich-editor.css', import.meta.url);

const toolbarGroups = [
  [
    { command: 'undo', label: 'Undo', icon: '&#8634;' },
    { command: 'redo', label: 'Redo', icon: '&#8635;' },
  ],
  [
    { command: 'bold', label: 'Bold', icon: '<strong>B</strong>' },
    { command: 'italic', label: 'Italic', icon: '<em>I</em>' },
    { command: 'underline', label: 'Underline', icon: '<span class="underline">U</span>' },
    { command: 'strikeThrough', label: 'Strikethrough', icon: '<span class="strike">S</span>' },
  ],
  [
    { command: 'insertUnorderedList', label: 'Bullet list', icon: '&#8226;' },
    { command: 'insertOrderedList', label: 'Numbered list', icon: '1.' },
    { command: 'formatBlock', value: 'blockquote', label: 'Quote', icon: '&#8220;' },
    { command: 'outdent', label: 'Decrease indent', icon: '&#8676;' },
    { command: 'indent', label: 'Increase indent', icon: '&#8677;' },
  ],
  [
    { command: 'justifyLeft', label: 'Align left', icon: '&#8676;' },
    { command: 'justifyCenter', label: 'Align center', icon: '&#8596;' },
    { command: 'justifyRight', label: 'Align right', icon: '&#8677;' },
  ],
  [
    { command: 'createLink', label: 'Link', icon: '&#128279;' },
    { command: 'removeFormat', label: 'Clear formatting', icon: '&#8999;' },
    { command: 'foreColor', label: 'Text color', icon: 'A', type: 'color' },
    { command: 'source', label: 'View source', icon: '&lt;/&gt;' },
  ],
];

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

function normalizeHtml(value) {
  return String(value ?? '').trim();
}

class TblrRichEditor extends HTMLElement {
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
  ];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.reflectingValue = false;
    this.sourceMode = false;
    this.handleToolbarPointerDown = this.handleToolbarPointerDown.bind(this);
    this.handleToolbarClick = this.handleToolbarClick.bind(this);
    this.handleColorInput = this.handleColorInput.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.handleSourceInput = this.handleSourceInput.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.handlePaste = this.handlePaste.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;

    if (name === 'value' && this.reflectingValue) return;

    if (name === 'value') {
      this.syncEditorValue();
      return;
    }

    this.render();
  }

  get value() {
    if (this.sourceMode) {
      return this.sourceEditor?.value ?? this.getAttribute('value') ?? '';
    }

    return this.editor?.innerHTML ?? this.getAttribute('value') ?? '';
  }

  set value(value) {
    this.setAttribute('value', value ?? '');
    this.syncEditorValue();
  }

  get editor() {
    return this.root.querySelector('.editor');
  }

  get sourceEditor() {
    return this.root.querySelector('.source-editor');
  }

  focus(options) {
    (this.sourceMode ? this.sourceEditor : this.editor)?.focus(options);
  }

  render() {
    const label = this.getAttribute('label');
    const help = this.getAttribute('help');
    const placeholder = this.getAttribute('placeholder') ?? '';
    const disabled = booleanAttribute(this, 'disabled');
    const readonly = booleanAttribute(this, 'readonly');
    const required = booleanAttribute(this, 'required');
    const rows = Number.parseInt(this.getAttribute('rows') ?? '8', 10);
    const minRows = Number.isFinite(rows) && rows > 0 ? rows : 8;

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">

      <label part="field" class="field">
        ${label ? `<span part="label" class="label">${escapeHtml(label)}${required ? ' <span class="required">*</span>' : ''}</span>` : ''}

        <span part="editor-wrap" class="editor-wrap${disabled ? ' disabled' : ''}${readonly ? ' readonly' : ''}">
          <span part="toolbar" class="toolbar" role="toolbar" aria-disabled="${disabled || readonly ? 'true' : 'false'}">
            ${this.renderToolbar(disabled || readonly)}
          </span>

          <span
            part="editor"
            class="editor"
            role="textbox"
            aria-multiline="true"
            aria-label="${escapeHtml(label ?? 'Rich text editor')}"
            data-placeholder="${escapeHtml(placeholder)}"
            style="--tblr-rich-editor-min-rows: ${minRows};"
            ${disabled || readonly ? 'contenteditable="false"' : 'contenteditable="true"'}
            ${required ? 'aria-required="true"' : ''}
            ${this.sourceMode ? 'hidden' : ''}
          ></span>

          <textarea
            part="source"
            class="source-editor"
            aria-label="${escapeHtml(label ? `${label} HTML source` : 'Rich text editor HTML source')}"
            rows="${minRows}"
            spellcheck="false"
            ${disabled || readonly ? 'readonly' : ''}
            ${this.sourceMode ? '' : 'hidden'}
          ></textarea>

          <input class="value-control" type="hidden" name="${escapeHtml(this.getAttribute('name') ?? '')}">
        </span>

        ${help ? '<span part="help" class="help"></span>' : ''}
      </label>
    `;

    const toolbar = this.root.querySelector('.toolbar');
    const editor = this.editor;
    const sourceEditor = this.sourceEditor;
    const helpEl = this.root.querySelector('.help');

    if (helpEl) helpEl.textContent = help;

    toolbar?.addEventListener('pointerdown', this.handleToolbarPointerDown);
    toolbar?.addEventListener('click', this.handleToolbarClick);
    toolbar?.addEventListener('input', this.handleColorInput);
    editor?.addEventListener('input', this.handleInput);
    editor?.addEventListener('blur', this.handleBlur);
    editor?.addEventListener('paste', this.handlePaste);
    sourceEditor?.addEventListener('input', this.handleSourceInput);
    sourceEditor?.addEventListener('blur', this.handleBlur);

    this.syncEditorValue();
  }

  renderToolbar(disabled) {
    return toolbarGroups.map(group => `
      <span class="toolbar-group">
        ${group.map(item => item.type === 'color' ? `
          <label
            part="tool"
            class="tool color-tool"
            title="${escapeHtml(item.label)}"
            aria-label="${escapeHtml(item.label)}"
          >
            <span class="color-letter">${item.icon}</span>
            <input
              class="color-input"
              type="color"
              data-command="${escapeHtml(item.command)}"
              value="#206bc4"
              ${disabled || this.sourceMode ? 'disabled' : ''}
            >
          </label>
        ` : `
          <button
            part="tool"
            class="tool${item.command === 'source' && this.sourceMode ? ' is-active' : ''}"
            type="button"
            title="${escapeHtml(item.label)}"
            aria-label="${escapeHtml(item.label)}"
            data-command="${escapeHtml(item.command)}"
            ${item.value ? `data-value="${escapeHtml(item.value)}"` : ''}
            ${disabled ? 'disabled' : ''}
            ${this.sourceMode && item.command !== 'source' ? 'disabled' : ''}
          >${item.icon}</button>
        `).join('')}
      </span>
    `).join('');
  }

  handleToolbarPointerDown(event) {
    if (event.target.closest('.tool') && !event.target.closest('.color-tool')) {
      event.preventDefault();
    }
  }

  handleToolbarClick(event) {
    const button = event.target.closest('.tool');

    if (!button || button.disabled) return;
    if (button.classList.contains('color-tool')) return;

    const command = button.dataset.command;
    if (command === 'source') {
      this.toggleSourceMode();
      return;
    }

    const value = command === 'createLink'
      ? this.readLinkValue()
      : button.dataset.value ?? null;

    if (command === 'createLink' && !value) return;

    this.editor?.focus();
    document.execCommand(command, false, value);
    this.reflectValueFromEditor();
    this.dispatchInput();
  }

  handleColorInput(event) {
    const input = event.target.closest('.color-input');

    if (!input || input.disabled) return;

    this.editor?.focus();
    document.execCommand('foreColor', false, input.value);
    this.reflectValueFromEditor();
    this.dispatchInput();
  }

  handleInput(event) {
    this.reflectValueFromEditor();
    this.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      composed: true,
      data: event.data,
      inputType: event.inputType,
    }));
  }

  handleSourceInput(event) {
    this.reflectValueFromSource();
    this.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      composed: true,
      data: event.data,
      inputType: event.inputType,
    }));
  }

  handleBlur() {
    this.dispatchEvent(new Event('change', {
      bubbles: true,
      composed: true,
    }));
  }

  handlePaste(event) {
    const types = Array.from(event.clipboardData?.types ?? []);

    if (types.includes('text/html')) return;

    const text = event.clipboardData?.getData('text/plain');

    if (!text) return;

    event.preventDefault();
    document.execCommand('insertText', false, text);
  }

  readLinkValue() {
    const selectedText = document.getSelection()?.toString();
    const url = window.prompt('Enter URL', selectedText?.startsWith('http') ? selectedText : 'https://');

    if (!url) return '';

    return url;
  }

  syncEditorValue() {
    const editor = this.editor;
    const sourceEditor = this.sourceEditor;
    const hiddenInput = this.root.querySelector('.value-control');
    const value = this.getAttribute('value') ?? '';

    if (editor && normalizeHtml(editor.innerHTML) !== normalizeHtml(value)) {
      editor.innerHTML = value;
    }

    if (sourceEditor && sourceEditor.value !== value) {
      sourceEditor.value = value;
    }

    if (hiddenInput) {
      hiddenInput.value = value;
    }
  }

  reflectValueFromEditor() {
    this.clearEmptyEditor();

    const value = this.value;
    const hiddenInput = this.root.querySelector('.value-control');

    this.reflectingValue = true;
    this.setAttribute('value', value);
    this.reflectingValue = false;

    if (hiddenInput) {
      hiddenInput.value = value;
    }
  }

  reflectValueFromSource() {
    const value = this.sourceEditor?.value ?? '';
    const hiddenInput = this.root.querySelector('.value-control');

    this.reflectingValue = true;
    this.setAttribute('value', value);
    this.reflectingValue = false;

    if (hiddenInput) {
      hiddenInput.value = value;
    }
  }

  toggleSourceMode() {
    if (this.sourceMode) {
      this.sourceMode = false;
      this.syncHtmlFromSource();
    } else {
      this.reflectValueFromEditor();
      this.sourceMode = true;
    }

    this.render();
    this.focus();
  }

  syncHtmlFromSource() {
    const value = this.sourceEditor?.value ?? this.getAttribute('value') ?? '';

    this.reflectingValue = true;
    this.setAttribute('value', value);
    this.reflectingValue = false;
  }

  clearEmptyEditor() {
    const editor = this.editor;

    if (!editor || editor.textContent.trim() || editor.querySelector('img, video, table, hr')) {
      return;
    }

    editor.innerHTML = '';
  }

  dispatchInput() {
    this.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      composed: true,
      inputType: 'format',
    }));
  }
}

Component({
  tag: 'tblr-rich-editor',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrRichEditor);

export { TblrRichEditor };
