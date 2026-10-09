import { Component } from '../../core/component.js';
import { UIElement, readArray, appendText, appendTime } from '../../core/ui-element.js';
import '../badge/tblr-badge.js';
const stylesheetUrl = new URL('./tblr-notification-story.css', import.meta.url);
const severities = new Set(['success', 'warning', 'danger', 'info', 'secondary']);
class TblrNotificationStory extends UIElement {
  static observedAttributes = ['items', 'title', 'quiet-summary', 'empty-text', 'appearance'];
  get items() { return this._items ?? readArray(this, 'items'); }
  set items(value) { this._items = Array.isArray(value) ? value : []; if (this.mounted) this.update(); }
  attributeChangedCallback(name) { if (name === 'items') this._items = undefined; super.attributeChangedCallback(); }
  mount() { this.template(stylesheetUrl, '<section part="story"><slot name="header"><h2></h2></slot><slot name="lead"></slot><ul part="list"></ul><p part="empty" class="muted"></p><p part="quiet" class="quiet muted" hidden></p><div part="actions"><slot name="actions"></slot></div></section>'); }
  update() {
    this.setText('h2', this.getAttribute('title') || 'Since yesterday');
    const list = this.root.querySelector('ul');
    list.replaceChildren();
    this.items.filter(item => item && typeof item === 'object').forEach((item, index) => {
      const li = document.createElement('li'); li.setAttribute('part', 'item'); list.append(li);
      const narrative = this.getAttribute('appearance') === 'narrative';
      let content = li;
      if (narrative) {
        const dot = appendText(li, 'span', '', `dot ${severities.has(item.severity) ? item.severity : 'secondary'}`);
        dot.setAttribute('aria-hidden', 'true');
        content = appendText(li, 'div', '', 'content');
      }
      const button = appendText(content, 'button', item.title || 'Notification', 'select'); button.type = 'button';
      button.addEventListener('click', () => this.emit('notification-select', { id: item.id ?? index, item }));
      if (!narrative) {
        const badge = document.createElement('tblr-badge'); badge.setAttribute('light', ''); badge.setAttribute('color', severities.has(item.severity) ? item.severity : 'secondary'); badge.textContent = item.severity || 'info'; content.append(badge);
      }
      appendText(content, narrative ? 'span' : 'p', narrative && item.detail ? ` ${item.detail}` : item.detail);
      if (!narrative && item.explanation) appendText(content, 'p', item.explanation, 'muted');
      appendTime(content, item.timestamp);
      if (!item.timestamp && item.timeLabel) appendText(content, 'span', ` ${item.timeLabel}`, 'time-label muted');
      if (narrative && item.explanation) appendText(content, 'p', item.explanation, 'muted');
      const slot = document.createElement('slot'); slot.name = `actions-${index}`; content.append(slot);
    });
    this.root.querySelector('[part="empty"]').hidden = Boolean(list.children.length);
    this.setText('[part="empty"]', this.getAttribute('empty-text') || 'No notifications supplied.');
    this.root.querySelector('[part="quiet"]').hidden = !this.getAttribute('quiet-summary');
    this.setText('[part="quiet"]', this.getAttribute('quiet-summary'));
  }
}
Component({ tag: 'tblr-notification-story', styles: stylesheetUrl.href })(TblrNotificationStory);
export { TblrNotificationStory };
