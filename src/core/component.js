const hydratedElements = new WeakSet();
const styledElements = new WeakSet();
const styleObservers = new WeakMap();

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

export function hydratePreUpgradeProperties(element) {
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

function prepareStyles(element, stylesheet) {
  if (!stylesheet || styledElements.has(element) || element.hasAttribute('data-tblr-loading')) return;

  element.setAttribute('data-tblr-loading', '');
}

function revealWhenStyled(element, stylesheet) {
  if (!stylesheet || styledElements.has(element)) return;

  const reveal = () => {
    styledElements.add(element);
    styleObservers.get(element)?.disconnect();
    styleObservers.delete(element);
    element.removeAttribute('data-tblr-loading');
  };
  const watchLink = () => {
    if (styledElements.has(element)) return;

    const link = element.shadowRoot?.querySelector('link[rel="stylesheet"]');

    if (!link || link.sheet) {
      reveal();
      return;
    }

    const finish = () => {
      if (element.shadowRoot?.querySelector('link[rel="stylesheet"]') === link) {
        reveal();
      } else {
        watchLink();
      }
    };

    link.addEventListener('load', finish, { once: true });
    link.addEventListener('error', finish, { once: true });
  };

  if (element.shadowRoot && !styleObservers.has(element)) {
    const observer = new MutationObserver(watchLink);

    observer.observe(element.shadowRoot, { childList: true, subtree: true });
    styleObservers.set(element, observer);
  }

  watchLink();
}

export function Component(options) {
  return function (klass) {
    if (typeof window === 'undefined') {
      return klass;
    }

    class TblrComponent extends klass {
      connectedCallback() {
        hydratePreUpgradeProperties(this);
        prepareStyles(this, options.styles);
        super.connectedCallback?.();
        revealWhenStyled(this, options.styles);
      }
    }

    if (!customElements.get(options.tag)) {
      customElements.define(options.tag, TblrComponent);
    }

    return TblrComponent;
  };
}
