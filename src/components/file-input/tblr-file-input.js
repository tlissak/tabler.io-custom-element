import { Component } from '../../core/component.js';
import { attachInternals, setFormValue, valuesToFormData } from '../../core/form-associated.js';

const stylesheetUrl = new URL('./tblr-file-input.css', import.meta.url);
const imageUrlCache = new WeakMap();

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

function dispatchInputEvent(host) {
  const event = typeof InputEvent === 'function'
    ? new InputEvent('input', { bubbles: true, composed: true })
    : new Event('input', { bubbles: true, composed: true });

  host.dispatchEvent(event);
}

function bytes(value) {
  if (!Number.isFinite(value) || value === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const size = value / (1024 ** index);

  return `${size >= 10 || index === 0 ? Math.round(size) : size.toFixed(1)} ${units[index]}`;
}

function icon() {
  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 16V4"></path>
      <path d="m7 9 5-5 5 5"></path>
      <path d="M20 16.5v1.75A1.75 1.75 0 0 1 18.25 20H5.75A1.75 1.75 0 0 1 4 18.25V16.5"></path>
    </svg>
  `;
}

function fileIcon() {
  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M14 3v4a2 2 0 0 0 2 2h4"></path>
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l6 6v10a2 2 0 0 1-2 2Z"></path>
    </svg>
  `;
}

function removeIcon() {
  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M18 6 6 18"></path>
      <path d="m6 6 12 12"></path>
    </svg>
  `;
}

function imageUrl(file) {
  if (!file.type.startsWith('image/')) return '';

  if (!imageUrlCache.has(file)) {
    imageUrlCache.set(file, URL.createObjectURL(file));
  }

  return imageUrlCache.get(file);
}

function acceptTokenMatches(file, token) {
  const value = token.trim().toLowerCase();
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  if (!value) return false;
  if (value.startsWith('.')) return name.endsWith(value);
  if (value.endsWith('/*')) return type.startsWith(value.slice(0, -1));
  if (value.includes('/')) return type === value;

  return name.endsWith(`.${value}`);
}

function accepted(file, accept) {
  if (!accept) return true;

  return accept.split(',').some(token => acceptTokenMatches(file, token));
}

async function filesFromEntry(entry) {
  if (!entry) return [];

  if (entry.isFile) {
    return new Promise(resolve => entry.file(file => resolve([file]), () => resolve([])));
  }

  if (!entry.isDirectory) return [];

  const reader = entry.createReader();
  const entries = [];

  await new Promise(resolve => {
    const read = () => {
      reader.readEntries(chunk => {
        if (!chunk.length) {
          resolve();
          return;
        }

        entries.push(...chunk);
        read();
      }, resolve);
    };

    read();
  });

  const nested = await Promise.all(entries.map(child => filesFromEntry(child)));

  return nested.flat();
}

async function filesFromDataTransfer(dataTransfer) {
  const items = [...(dataTransfer?.items ?? [])];

  if (!items.length) return [...(dataTransfer?.files ?? [])];

  const entryFiles = await Promise.all(
    items
      .filter(item => item.kind === 'file')
      .map(item => {
        const entry = item.webkitGetAsEntry?.();

        return entry ? filesFromEntry(entry) : [item.getAsFile()].filter(Boolean);
      })
  );

  return entryFiles.flat();
}

class TblrFileInput extends HTMLElement {
  static formAssociated = true;

  static observedAttributes = [
    'name',
    'label',
    'hint',
    'button',
    'placeholder',
    'accept',
    'multiple',
    'disabled',
    'required',
    'size',
    'with-label',
    'with-hint',
  ];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.internals = attachInternals(this);
    this.selectedFiles = [];
    this.customValidityMessage = '';
    this.dragDepth = 0;
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleDropzoneClick = this.handleDropzoneClick.bind(this);
    this.handleDropzoneKeydown = this.handleDropzoneKeydown.bind(this);
    this.handleDragEnter = this.handleDragEnter.bind(this);
    this.handleDragOver = this.handleDragOver.bind(this);
    this.handleDragLeave = this.handleDragLeave.bind(this);
    this.handleDrop = this.handleDrop.bind(this);
    this.handleRemoveClick = this.handleRemoveClick.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.revokeImageUrls();
  }

  formResetCallback() {
    this.setFiles([], { emit: false });
  }

  formDisabledCallback(disabled) {
    this.toggleAttribute('disabled', disabled);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;

    this.render();
  }

  get files() {
    return [...this.selectedFiles];
  }

  set files(value) {
    this.setFiles(Array.isArray(value) ? value : [...(value ?? [])], { emit: false });
  }

  get dragging() {
    return this.hasAttribute('dragging');
  }

  get fileCount() {
    return this.selectedFiles.length;
  }

  get value() {
    return this.selectedFiles.map(file => file.name).join(', ');
  }

  get input() {
    return this.root.querySelector('input');
  }

  focus(options) {
    this.root.querySelector('.dropzone')?.focus(options);
  }

  blur() {
    this.root.querySelector('.dropzone')?.blur();
  }

  setCustomValidity(message) {
    this.customValidityMessage = String(message ?? '');
    this.input?.setCustomValidity(this.validationMessage);
    this.syncValidity();
  }

  resetValidity() {
    this.setCustomValidity('');
  }

  clear() {
    this.setFiles([], { emit: true });
  }

  checkValidity() {
    this.syncValidity();

    return !this.validationMessage;
  }

  reportValidity() {
    this.syncValidity();

    if (this.validationMessage) {
      this.input?.reportValidity();
      this.dispatchEvent(new Event('invalid', { bubbles: false, cancelable: true }));
      return false;
    }

    return true;
  }

  get validationMessage() {
    if (booleanAttribute(this, 'disabled')) return '';
    if (this.customValidityMessage) return this.customValidityMessage;
    if (booleanAttribute(this, 'required') && this.selectedFiles.length === 0) return 'Please select a file.';

    return '';
  }

  render() {
    const label = this.getAttribute('label');
    const hint = this.getAttribute('hint');
    const hasLabel = label || booleanAttribute(this, 'with-label');
    const hasHint = hint || booleanAttribute(this, 'with-hint');
    const disabled = booleanAttribute(this, 'disabled');

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">

      <div part="base" class="base">
        ${hasLabel ? `
          <label part="label" class="label" id="label">
            ${label ? escapeHtml(label) : '<slot name="label"></slot>'}
            ${booleanAttribute(this, 'required') ? '<span class="required">*</span>' : ''}
          </label>
        ` : ''}

        <div
          part="dropzone"
          class="dropzone"
          role="button"
          tabindex="${disabled ? '-1' : '0'}"
          aria-disabled="${disabled ? 'true' : 'false'}"
          ${hasLabel ? 'aria-labelledby="label"' : ''}
          ${hasHint ? 'aria-describedby="hint"' : ''}
        >
          <input
            part="input"
            class="input"
            type="file"
            name="${escapeHtml(this.getAttribute('name') ?? '')}"
            ${this.hasAttribute('accept') ? `accept="${escapeHtml(this.getAttribute('accept'))}"` : ''}
            ${booleanAttribute(this, 'multiple') ? 'multiple' : ''}
            ${disabled ? 'disabled' : ''}
            ${booleanAttribute(this, 'required') ? 'required' : ''}
          >

          <slot name="dropzone">
            <span part="dropzone-icon" class="dropzone-icon">${icon()}</span>
            <span part="dropzone-text" class="dropzone-text">
              <strong>${escapeHtml(this.getAttribute('button') ?? 'Choose files')}</strong>
              <span>${escapeHtml(this.getAttribute('placeholder') ?? 'Drag and drop files here or click to browse')}</span>
            </span>
          </slot>
        </div>

        <div part="file-list" class="file-list" aria-live="polite">
          ${this.selectedFiles.map((file, index) => this.renderFile(file, index)).join('')}
        </div>

        ${hasHint ? `<div part="hint" class="hint" id="hint">${hint ? escapeHtml(hint) : '<slot name="hint"></slot>'}</div>` : ''}
      </div>
    `;

    const dropzone = this.root.querySelector('.dropzone');

    this.input.addEventListener('change', this.handleInputChange);
    dropzone.addEventListener('click', this.handleDropzoneClick);
    dropzone.addEventListener('keydown', this.handleDropzoneKeydown);
    dropzone.addEventListener('dragenter', this.handleDragEnter);
    dropzone.addEventListener('dragover', this.handleDragOver);
    dropzone.addEventListener('dragleave', this.handleDragLeave);
    dropzone.addEventListener('drop', this.handleDrop);
    this.root.querySelectorAll('.remove-button').forEach(button => {
      button.addEventListener('click', this.handleRemoveClick);
    });
    this.syncValidity();
  }

  renderFile(file, index) {
    const url = imageUrl(file);

    return `
      <div part="file" class="file">
        <span part="file-thumbnail" class="file-thumbnail">
          ${url
            ? `<img part="file-image" class="file-image" src="${url}" alt="">`
            : `<span part="file-icon" class="file-icon">${fileIcon()}</span>`
          }
        </span>
        <span part="file-details" class="file-details">
          <span part="file-name" class="file-name">${escapeHtml(file.name)}</span>
          <span part="file-size" class="file-size">${escapeHtml(bytes(file.size))}</span>
        </span>
        <button part="remove-button" class="remove-button" type="button" data-index="${index}" aria-label="Remove ${escapeHtml(file.name)}">
          ${removeIcon()}
        </button>
      </div>
    `;
  }

  handleDropzoneClick(event) {
    if (booleanAttribute(this, 'disabled') || event.target.closest?.('.remove-button')) return;

    this.input?.click();
  }

  handleDropzoneKeydown(event) {
    if (booleanAttribute(this, 'disabled')) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    this.input?.click();
  }

  handleInputChange() {
    this.setFiles([...this.input.files], { emit: true });
  }

  handleDragEnter(event) {
    if (!this.canDrop(event)) return;

    event.preventDefault();
    this.dragDepth += 1;
    this.toggleAttribute('dragging', true);
  }

  handleDragOver(event) {
    if (!this.canDrop(event)) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }

  handleDragLeave(event) {
    if (!this.canDrop(event)) return;

    event.preventDefault();
    this.dragDepth = Math.max(0, this.dragDepth - 1);

    if (this.dragDepth === 0) {
      this.toggleAttribute('dragging', false);
    }
  }

  async handleDrop(event) {
    if (!this.canDrop(event)) return;

    event.preventDefault();
    this.dragDepth = 0;
    this.toggleAttribute('dragging', false);

    const droppedFiles = await filesFromDataTransfer(event.dataTransfer);

    this.setFiles(droppedFiles, { emit: true });
  }

  handleRemoveClick(event) {
    event.stopPropagation();

    const index = Number(event.currentTarget.dataset.index);
    const files = this.selectedFiles.filter((_, fileIndex) => fileIndex !== index);

    this.setFiles(files, { emit: true });
  }

  canDrop(event) {
    return !booleanAttribute(this, 'disabled')
      && event.dataTransfer
      && Array.from(event.dataTransfer.types ?? []).includes('Files');
  }

  setFiles(files, { emit } = { emit: false }) {
    const accept = this.getAttribute('accept') ?? '';
    const nextFiles = files.filter(file => (
      typeof File !== 'undefined'
      && file instanceof File
      && accepted(file, accept)
    ));

    this.revokeImageUrls();
    this.selectedFiles = booleanAttribute(this, 'multiple') ? nextFiles : nextFiles.slice(0, 1);
    this.render();
    this.syncInputFiles();
    this.syncValidity();

    if (emit) {
      dispatchInputEvent(this);
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }
  }

  syncInputFiles() {
    const input = this.input;

    if (!input || typeof DataTransfer === 'undefined') return;

    let transfer;

    try {
      transfer = new DataTransfer();
    } catch {
      return;
    }

    this.selectedFiles.forEach(file => transfer.items.add(file));

    try {
      input.files = transfer.files;
    } catch {
      // Some browsers do not allow assigning FileList values.
    }
  }

  syncValidity() {
    const message = this.validationMessage;

    this.input?.setCustomValidity(message);
    if (this.internals?.setValidity) {
      this.internals.setValidity(
        message ? { customError: true } : {},
        message,
        this.input ?? undefined,
      );
    }
    this.updateFormValue();
    this.toggleAttribute('invalid', Boolean(message));
    this.toggleAttribute('blank', this.selectedFiles.length === 0);
  }

  updateFormValue() {
    setFormValue(
      this.internals,
      booleanAttribute(this, 'disabled')
        ? null
        : valuesToFormData(this.getAttribute('name') ?? '', this.selectedFiles),
    );
  }

  revokeImageUrls() {
    this.selectedFiles.forEach(file => {
      const url = imageUrlCache.get(file);

      if (url) {
        URL.revokeObjectURL(url);
        imageUrlCache.delete(file);
      }
    });
  }
}

Component({
  tag: 'tblr-file-input',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrFileInput);

export { TblrFileInput };
