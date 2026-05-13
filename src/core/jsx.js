export function h(tag, props, ...children) {
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
