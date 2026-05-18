const aliases = {
  'tblr-flex-item': 'tblr-flex',
  'tblr-grid-item': 'tblr-grid',
  'tblr-nav-item': 'tblr-nav',
  'tblr-tab': 'tblr-tabs',
};

const loading = new Map();

function getComponentName(tag) {
  return (aliases[tag] ?? tag).replace(/^tblr-/, '');
}

async function loadComponent(tag) {
  if (customElements.get(tag)) return;

  const componentName = getComponentName(tag);

  if (!loading.has(componentName)) {
    loading.set(
      componentName,
      import(`../components/${componentName}/tblr-${componentName}.js`)
        .catch(error => {
          loading.delete(componentName);
          console.warn(`[TBLR] Could not load component: ${tag}`, error);
        })
    );
  }

  await loading.get(componentName);
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

  await Promise.all([...tags].map(tag => loadComponent(tag)));
}

/**
 * Middleware for Turbo's `turbo:before-render` event. It delays rendering the
 * next page until custom elements in the new body are loaded, reducing FOUCE.
 */
export function preventTurboFouce(timeout = 2000) {
  if (typeof document === 'undefined') return;

  const listener = async event => {
    const newBody = event.detail?.newBody;
    const resume = event.detail?.resume;

    if (!(newBody instanceof HTMLElement) || typeof resume !== 'function') {
      return;
    }

    event.preventDefault();

    try {
      await Promise.race([
        autoload(newBody),
        new Promise(resolve => setTimeout(resolve, timeout)),
      ]);
    } finally {
      resume();
    }
  };

  document.addEventListener('turbo:before-render', listener);

  return () => document.removeEventListener('turbo:before-render', listener);
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
