import { Component } from '../../core/component.js';
import { UIElement } from '../../core/ui-element.js';
import '../spinner/tblr-spinner.js';
const stylesheetUrl = new URL('./tblr-action-preview.css', import.meta.url);
const states = new Set(['preview', 'pending', 'confirmed', 'cancelled', 'error']);
class TblrActionPreview extends UIElement {
  static observedAttributes = ['state', 'title', 'confirm-label', 'cancel-label', 'result'];
  mount() {
    this.template(stylesheetUrl, `<section part="preview" class="surface"><header part="header"><slot name="header"><b></b></slot></header><div part="changes" class="changes"><slot name="changes"><slot></slot></slot></div><div part="exclusions" class="muted exclusions"><slot name="exclusions"></slot></div><footer part="actions"><button part="confirm" class="button primary" type="button"></button><button part="cancel" class="button" type="button"></button><tblr-spinner hidden aria-hidden="true"></tblr-spinner><span part="hint" class="muted"><slot name="hint"></slot></span></footer><p part="result" role="status" hidden></p></section>`);
    this.root.querySelector('[part="confirm"]').addEventListener('click', () => this.request('confirm'));
    this.root.querySelector('[part="cancel"]').addEventListener('click', () => this.request('cancel'));
  }
  get state() { return states.has(this.getAttribute('state')) ? this.getAttribute('state') : 'preview'; }
  set state(value) {
    this.locked = false;
    this.setAttribute('state', states.has(value) ? value : 'preview');
    if (this.mounted) this.update();
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'state' && oldValue !== newValue) this.locked = false;
    super.attributeChangedCallback();
  }
  request(action) {
    if (this.locked || !['preview', 'error'].includes(this.state)) return;
    this.locked = true;
    this.update();
    if (!this.emit(action, { state: this.state })) { this.locked = false; this.update(); }
  }
  update() {
    this.setText('b', this.getAttribute('title') || 'Action preview');
    this.setText('[part="confirm"]', this.getAttribute('confirm-label') || (this.state === 'error' ? 'Retry' : 'Confirm'));
    this.setText('[part="cancel"]', this.getAttribute('cancel-label') || 'Cancel');
    const disabled = this.locked || !['preview', 'error'].includes(this.state);
    this.root.querySelectorAll('button').forEach(button => { button.disabled = disabled; });
    this.root.querySelector('tblr-spinner').hidden = this.state !== 'pending';
    const result = this.root.querySelector('[part="result"]');
    result.hidden = this.state === 'preview';
    result.textContent = this.getAttribute('result') || ({ pending: 'Waiting for a result…', confirmed: 'Confirmed', cancelled: 'Cancelled', error: 'The action failed. Try again.' }[this.state] ?? '');
    this.root.querySelector('section').setAttribute('aria-busy', String(this.state === 'pending'));
    this.root.querySelector('section').dataset.state = this.state;
  }
}
Component({ tag: 'tblr-action-preview', styles: stylesheetUrl.href })(TblrActionPreview);
export { TblrActionPreview };
