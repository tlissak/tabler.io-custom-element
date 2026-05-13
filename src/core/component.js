export function Component(options) {
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
