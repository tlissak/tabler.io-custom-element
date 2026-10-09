import { Component } from '../../core/component.js';
import { UIElement, booleanProperty, stringProperty } from '../../core/ui-element.js';
import '../spinner/tblr-spinner.js';
const stylesheetUrl = new URL('./tblr-composer.css', import.meta.url);
class TblrComposer extends UIElement {
  static observedAttributes = ['value', 'label', 'placeholder', 'disabled', 'pending', 'send-label', 'rows'];
  mount() {
    this.template(stylesheetUrl, `<div part="composer" class="composer surface"><div part="suggestions"><slot name="suggestions"></slot></div><form part="form"><slot name="mark"></slot><textarea part="input" rows="2"></textarea><slot name="controls"></slot><button part="submit" class="button primary" type="submit"><tblr-spinner hidden aria-hidden="true"></tblr-spinner><slot name="submit-icon"><span></span></slot></button></form><div part="attachments"><slot name="attachments"></slot></div><div part="hint" class="muted"><slot name="hint"></slot></div></div>`);
    this.input = this.root.querySelector('textarea');
    this.input.addEventListener('input', () => { this.value = this.input.value; });
    this.input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        this.submit();
      }
    });
    this.root.querySelector('form').addEventListener('submit', event => { event.preventDefault(); this.submit(); });
  }
  update() {
    if (this.input.value !== this.value) this.input.value = this.value;
    this.input.placeholder = this.placeholder || 'Write a message…';
    this.input.rows = Math.max(1, Math.min(20, Number.parseInt(this.getAttribute('rows'), 10) || 2));
    this.input.setAttribute('aria-label', this.label || 'Message');
    this.input.disabled = this.disabled || this.pending;
    this.root.querySelector('button').disabled = this.disabled || this.pending || !this.value.trim();
    this.setText('button span', this.getAttribute('send-label') || 'Send');
    this.root.querySelector('button').setAttribute('aria-label', this.getAttribute('send-label') || 'Send');
    this.root.querySelector('tblr-spinner').hidden = !this.pending;
    this.root.querySelector('.composer').setAttribute('aria-busy', String(this.pending));
  }
  submit() {
    const text = this.value.trim();
    if (!text || this.disabled || this.pending) return;
    this.emit('message-submit', { text });
  }
  focus(options) { this.input?.focus(options); }
}
['value', 'label', 'placeholder'].forEach(name => stringProperty(TblrComposer, name));
['disabled', 'pending'].forEach(name => booleanProperty(TblrComposer, name));
Component({ tag: 'tblr-composer', styles: stylesheetUrl.href })(TblrComposer);
export { TblrComposer };
