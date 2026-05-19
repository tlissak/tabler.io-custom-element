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

export function Component(options) {
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
