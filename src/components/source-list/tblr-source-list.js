import { Component } from '../../core/component.js';
import { UIElement, readArray, safeUrl, appendText, appendTime } from '../../core/ui-element.js';
const stylesheetUrl = new URL('./tblr-source-list.css', import.meta.url);
class TblrSourceList extends UIElement {
  static observedAttributes = ['sources', 'label', 'empty-text'];
  get sources() { return this._sources ?? readArray(this, 'sources'); }
  set sources(value) { this._sources = Array.isArray(value) ? value : []; if (this.mounted) this.update(); }
  attributeChangedCallback(name) { if (name === 'sources') this._sources = undefined; super.attributeChangedCallback(); }
  mount() { this.template(stylesheetUrl, '<div part="sources"><span class="muted heading"></span><ul part="list"></ul><span part="empty" class="muted" hidden></span></div>'); }
  update() {
    const label = this.getAttribute('label') || 'Sources';
    this.setText('.heading', label);
    const list = this.root.querySelector('ul');
    list.setAttribute('aria-label', label);
    list.replaceChildren();
    this.sources.filter(item => item && typeof item === 'object').forEach(item => {
      const li = document.createElement('li');
      li.setAttribute('part', 'source');
      list.append(li);
      const url = safeUrl(item.url);
      const source = appendText(li, url ? 'a' : 'span', item.label || 'Source');
      if (url) source.href = url;
      appendTime(li, item.timestamp);
    });
    this.root.querySelector('[part="empty"]').hidden = Boolean(list.children.length);
    this.setText('[part="empty"]', this.getAttribute('empty-text') || 'No sources supplied.');
  }
}
Component({ tag: 'tblr-source-list', styles: stylesheetUrl.href })(TblrSourceList);
export { TblrSourceList };
