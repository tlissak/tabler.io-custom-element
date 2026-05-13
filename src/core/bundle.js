class ComponentRegistry {
  constructor() {
    this.loaders = new Map();
    this.loading = new Map();
  }

  register(tag, loader) {
    this.loaders.set(tag, loader);
  }

  has(tag) {
    return this.loaders.has(tag);
  }

  async load(tag) {
    if (customElements.get(tag)) return;

    const loader = this.loaders.get(tag);

    if (!loader) {
      console.warn(`[TBLR] Unknown component: ${tag}`);
      return;
    }

    if (!this.loading.has(tag)) {
      this.loading.set(tag, loader());
    }

    await this.loading.get(tag);
  }

  async loadAll(tags) {
    await Promise.all(tags.map(tag => this.load(tag)));
  }
}

const registry = new ComponentRegistry();

const modules = {
  'tblr-alert': () => import('../components/alert/tblr-alert.js'),
  'tblr-badge': () => import('../components/badge/tblr-badge.js'),
  'tblr-button': () => import('../components/button/tblr-button.js'),
  'tblr-card': () => import('../components/card/tblr-card.js'),
  'tblr-checkbox': () => import('../components/checkbox/tblr-checkbox.js'),
  'tblr-code-preview': () => import('../components/code-preview/tblr-code-preview.js'),
  'tblr-colorpicker': () => import('../components/colorpicker/tblr-colorpicker.js'),
  'tblr-copy-button': () => import('../components/copy-button/tblr-copy-button.js'),
  'tblr-datepicker': () => import('../components/datepicker/tblr-datepicker.js'),
  'tblr-file-input': () => import('../components/file-input/tblr-file-input.js'),
  'tblr-flex': () => import('../components/flex/tblr-flex.js'),
  'tblr-flex-item': () => import('../components/flex/tblr-flex.js'),
  'tblr-format-number': () => import('../components/format-number/tblr-format-number.js'),
  'tblr-grid': () => import('../components/grid/tblr-grid.js'),
  'tblr-grid-item': () => import('../components/grid/tblr-grid.js'),
  'tblr-icon': () => import('../components/icon/tblr-icon.js'),
  'tblr-input': () => import('../components/input/tblr-input.js'),
  'tblr-modal': () => import('../components/modal/tblr-modal.js'),
  'tblr-nav': () => import('../components/nav/tblr-nav.js'),
  'tblr-nav-item': () => import('../components/nav/tblr-nav.js'),
  'tblr-pagination': () => import('../components/pagination/tblr-pagination.js'),
  'tblr-radio': () => import('../components/radio/tblr-radio.js'),
  'tblr-rich-editor': () => import('../components/rich-editor/tblr-rich-editor.js'),
  'tblr-select': () => import('../components/select/tblr-select.js'),
  'tblr-search': () => import('../components/search/tblr-search.js'),
  'tblr-spinner': () => import('../components/spinner/tblr-spinner.js'),
  'tblr-switch': () => import('../components/switch/tblr-switch.js'),
  'tblr-tab': () => import('../components/tabs/tblr-tabs.js'),
  'tblr-tabs': () => import('../components/tabs/tblr-tabs.js'),
  'tblr-tinymce-editor': () => import('../components/tinymce-editor/tblr-tinymce-editor.js'),
};

for (const [tag, loader] of Object.entries(modules)) {
  registry.register(tag, loader);
}

const themeStylesheetUrl = new URL('../styles/theme.css', import.meta.url);

function Component(options) {
  return function (klass) {
    if (typeof window === 'undefined') {
      return klass;
    }

    if (!customElements.get(options.tag)) {
      customElements.define(options.tag, klass);
    }

    return klass;
  };
}

function h(tag, props, ...children) {
  if (typeof tag === 'function') {
    return tag({ ...props, children });
  }

  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(props ?? {})) {
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) {
      el.setAttribute(key, '');
    } else if (value !== false && value != null) {
      el.setAttribute(key, String(value));
    }
  }

  for (const child of children.flat()) {
    el.append(
      child instanceof Node
        ? child
        : document.createTextNode(String(child))
    );
  }

  return el;
}

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function safeDefine(tag, klass) {
  if (!isBrowser()) return;

  if (!customElements.get(tag)) {
    customElements.define(tag, klass);
  }
}

async function autoload(root = document) {
  if (typeof window === 'undefined') return;

  const tags = new Set();

  if (root instanceof HTMLElement && root.tagName.toLowerCase().startsWith('tblr-')) {
    tags.add(root.tagName.toLowerCase());
  }

  root.querySelectorAll?.('*').forEach(el => {
    const tag = el.tagName.toLowerCase();

    if (tag.startsWith('tblr-')) {
      tags.add(tag);
    }
  });

  await registry.loadAll([...tags]);
}

function watchAutoload(root = document.body) {
  if (typeof window === 'undefined') return;

  autoload(root);

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(node => {
        if (node instanceof HTMLElement) {
          autoload(node);
        }
      });
    }
  });

  observer.observe(root, {
    childList: true,
    subtree: true,
  });

  return observer;
}

async function defineTblr() {
  await autoload();
  watchAutoload();
}

export {
  Component,
  autoload,
  defineTblr,
  h,
  isBrowser,
  registry,
  safeDefine,
  themeStylesheetUrl,
  watchAutoload,
};
