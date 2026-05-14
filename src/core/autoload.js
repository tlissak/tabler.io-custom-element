import { registry } from './registry.js';

const modules = {
  'tblr-alert': () => import('../components/alert/tblr-alert.js'),
  'tblr-autocomplete': () => import('../components/autocomplete/tblr-autocomplete.js'),
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

export async function autoload(root = document) {
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

export function watchAutoload(root = document.body) {
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
