import { Component } from '../../core/component.js';
import { UIElement, readArray, booleanProperty, appendText, appendTime } from '../../core/ui-element.js';
import '../badge/tblr-badge.js';
const stylesheetUrl = new URL('./tblr-audit-log.css', import.meta.url);
const colors = { confirmed: 'success', cancelled: 'secondary', refused: 'danger', error: 'danger', pending: 'warning', read: 'info' };
class TblrAuditLog extends UIElement {
  static observedAttributes = ['entries', 'title', 'filterable', 'exportable', 'empty-text'];
  get entries() { return this._entries ?? readArray(this, 'entries'); }
  set entries(value) { this._entries = Array.isArray(value) ? value : []; if (this.mounted) this.update(); }
  attributeChangedCallback(name) { if (name === 'entries') this._entries = undefined; super.attributeChangedCallback(); }
  mount() {
    this.template(stylesheetUrl, '<section part="log"><header><h2></h2><button part="export" class="button" type="button">Export</button></header><label part="filter" hidden>Filter <input type="search" aria-label="Filter audit entries"></label><ol part="list"></ol><p part="empty" class="muted"></p></section>');
    this.root.querySelector('input').addEventListener('input', event => { this.query = event.target.value; this.emit('filter-request', { query: this.query }); this.updateEntries(); });
    this.root.querySelector('button').addEventListener('click', () => this.emit('export-request', { entries: this.entries }));
  }
  update() {
    this.setText('h2', this.getAttribute('title') || 'Audit log');
    this.root.querySelector('label').hidden = !this.filterable;
    this.root.querySelector('button').hidden = !this.exportable;
    this.updateEntries();
  }
  updateEntries() {
    const list = this.root.querySelector('ol'); list.replaceChildren();
    const query = this.filterable ? (this.query || '').toLocaleLowerCase() : '';
    // Keep supplied chronological order; the component never creates audit facts.
    this.entries.filter(item => item && typeof item === 'object').filter(item => !query || [item.actor, item.action, item.outcome, item.reference].some(value => String(value ?? '').toLocaleLowerCase().includes(query))).forEach(item => {
      const li = document.createElement('li'); li.setAttribute('part', 'entry'); list.append(li);
      appendText(li, 'b', item.action || 'Action');
      const badge = document.createElement('tblr-badge'); badge.setAttribute('light', ''); badge.setAttribute('color', colors[item.outcome] || 'secondary'); badge.textContent = item.outcome || 'unknown'; li.append(badge);
      appendText(li, 'span', [item.actor, item.reference].filter(Boolean).join(' · '), 'muted');
      appendTime(li, item.timestamp);
    });
    this.root.querySelector('[part="empty"]').hidden = Boolean(list.children.length);
    this.setText('[part="empty"]', this.getAttribute('empty-text') || 'No audit entries match.');
  }
}
['filterable', 'exportable'].forEach(name => booleanProperty(TblrAuditLog, name));
Component({ tag: 'tblr-audit-log', styles: stylesheetUrl.href })(TblrAuditLog);
export { TblrAuditLog };
