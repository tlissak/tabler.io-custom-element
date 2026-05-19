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

const themeStylesheetUrl = new URL('../styles/theme.css', import.meta.url);

const hydratedElements = new WeakSet();

function findSetter(element, property) {
  let proto = Object.getPrototypeOf(element);

  while (proto && proto !== HTMLElement.prototype) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, property);

    if (descriptor) {
      return descriptor.set;
    }

    proto = Object.getPrototypeOf(proto);
  }

  return null;
}

function hydratePreUpgradeProperties(element) {
  if (hydratedElements.has(element)) return;

  hydratedElements.add(element);

  Reflect.ownKeys(element).forEach(property => {
    const setter = findSetter(element, property);

    if (!setter) return;

    const value = element[property];

    delete element[property];
    element[property] = value;
  });
}

function Component(options) {
  return function (klass) {
    if (typeof window === 'undefined') {
      return klass;
    }

    class TblrComponent extends klass {
      connectedCallback() {
        hydratePreUpgradeProperties(this);
        super.connectedCallback?.();
      }
    }

    if (!customElements.get(options.tag)) {
      customElements.define(options.tag, TblrComponent);
    }

    return TblrComponent;
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

  await Promise.all([...tags].map(tag => loadComponent(tag)));
}

/**
 * Middleware for Turbo's `turbo:before-render` event. It delays rendering the
 * next page until custom elements in the new body are loaded, reducing FOUCE.
 */
function preventTurboFouce(timeout = 2000) {
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

let defineTblrPromise;

function defineTblr() {
  if (!defineTblrPromise) {
    defineTblrPromise = (async () => {
      await autoload();
      watchAutoload();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tblr-ready'));
      }
    })();

    if (typeof window !== 'undefined') {
      window.tblrReady = defineTblrPromise;
    }
  }

  return defineTblrPromise;
}

function whenTblrReady() {
  return defineTblrPromise ?? Promise.resolve();
}

export {
  Component,
  autoload,
  defineTblr,
  h,
  hydratePreUpgradeProperties,
  isBrowser,
  preventTurboFouce,
  safeDefine,
  themeStylesheetUrl,
  whenTblrReady,
  watchAutoload,
};
