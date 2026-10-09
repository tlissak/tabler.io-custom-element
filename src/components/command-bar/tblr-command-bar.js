import { Component } from '../../core/component.js';
import { UIElement, booleanProperty, stringProperty } from '../../core/ui-element.js';
import '../avatar/tblr-avatar.js';
const stylesheetUrl = new URL('./tblr-command-bar.css', import.meta.url);
const instances = new Set();
function handleShortcut(event) {
  if (event.defaultPrevented || event.altKey || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return;
  const target = [...instances].find(element => element.shortcut && !element.disabled && element.getClientRects().length && !element.closest('[hidden], [inert]'));
  if (!target) return;
  event.preventDefault();
  target.focus();
}
class TblrCommandBar extends UIElement {
  static observedAttributes = ['label', 'placeholder', 'value', 'disabled', 'shortcut'];
  connectedCallback() {
    super.connectedCallback();
    if (!instances.size) document.addEventListener('keydown', handleShortcut);
    instances.add(this);
  }
  disconnectedCallback() {
    instances.delete(this);
    if (!instances.size) document.removeEventListener('keydown', handleShortcut);
  }
  mount() {
    this.template(stylesheetUrl, `<form part="bar" class="bar surface"><tblr-avatar variant="agent" size="sm" label="Assistant"></tblr-avatar><input part="input" type="text"><kbd aria-hidden="true">Ctrl / ⌘ K</kbd><button part="submit" class="button" type="submit">↵</button></form>`);
    this.input = this.root.querySelector('input');
    this.input.addEventListener('input', () => { this.value = this.input.value; });
    this.root.querySelector('form').addEventListener('submit', event => {
      event.preventDefault();
      const text = this.value.trim();
      if (!this.disabled && text) this.emit('command-submit', { text });
    });
  }
  update() {
    if (this.input.value !== this.value) this.input.value = this.value;
    this.input.placeholder = this.placeholder || 'Ask the assistant…';
    this.input.setAttribute('aria-label', this.label || 'Command');
    this.input.disabled = this.disabled;
    this.root.querySelector('button').disabled = this.disabled;
    this.root.querySelector('button').setAttribute('aria-label', this.label || 'Submit command');
    this.root.querySelector('kbd').hidden = !this.shortcut;
  }
  focus(options) { this.input?.focus(options); }
}
['label', 'placeholder', 'value'].forEach(name => stringProperty(TblrCommandBar, name));
['disabled', 'shortcut'].forEach(name => booleanProperty(TblrCommandBar, name));
Component({ tag: 'tblr-command-bar', styles: stylesheetUrl.href })(TblrCommandBar);
export { TblrCommandBar };
