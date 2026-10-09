import { Component } from '../../core/component.js';
import { UIElement, readArray, appendText, appendTime } from '../../core/ui-element.js';
import '../badge/tblr-badge.js';
const stylesheetUrl = new URL('./tblr-notification-story.css', import.meta.url);
const severities = new Set(['success', 'warning', 'danger', 'info', 'secondary']);
class TblrNotificationStory extends UIElement {
  static observedAttributes = ['items', 'title', 'quiet-summary', 'empty-text'];
  get items() { return this._items ?? readArray(this, 'items'); }
  set items(value) { this._items = Array.isArray(value) ? value : []; if (this.mounted) this.update(); }
  attributeChangedCallback(name) { if (name === 'items') this._items = undefined; super.attributeChangedCallback(); }
  mount() { this.template(stylesheetUrl, '<section part="story"><h2></h2><ul part="list"></ul><p part="empty" class="muted"></p><p part="quiet" class="quiet muted" hidden></p><div part="actions"><slot name="actions"></slot></div></section>'); }
  update() {
    this.setText('h2', this.getAttribute('title') || 'Since yesterday');
    const list = this.root.querySelector('ul');
    list.replaceChildren();
    this.items.filter(item => item && typeof item === 'object').forEach((item, index) => {
      const li = document.createElement('li'); li.setAttribute('part', 'item'); list.append(li);
      const button = appendText(li, 'button', item.title || 'Notification', 'select'); button.type = 'button';
      button.addEventListener('click', () => this.emit('notification-select', { id: item.id ?? index, item }));
      const badge = document.createElement('tblr-badge'); badge.setAttribute('light', ''); badge.setAttribute('color', severities.has(item.severity) ? item.severity : 'secondary'); badge.textContent = item.severity || 'info'; li.append(badge);
      appendText(li, 'p', item.detail);
      if (item.explanation) appendText(li, 'p', item.explanation, 'muted');
      appendTime(li, item.timestamp);
      const slot = document.createElement('slot'); slot.name = `actions-${index}`; li.append(slot);
    });
    this.root.querySelector('[part="empty"]').hidden = Boolean(list.children.length);
    this.setText('[part="empty"]', this.getAttribute('empty-text') || 'No notifications supplied.');
    this.root.querySelector('[part="quiet"]').hidden = !this.getAttribute('quiet-summary');
    this.setText('[part="quiet"]', this.getAttribute('quiet-summary'));
  }
}
Component({ tag: 'tblr-notification-story', styles: stylesheetUrl.href })(TblrNotificationStory);
export { TblrNotificationStory };
