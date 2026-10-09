import { Component } from '../../core/component.js';
import { UIElement, stringProperty } from '../../core/ui-element.js';
import '../avatar/tblr-avatar.js';
const stylesheetUrl = new URL('./tblr-message.css', import.meta.url);
class TblrMessage extends UIElement {
  static observedAttributes = ['role', 'message-role', 'author', 'timestamp'];
  mount() {
    this.template(stylesheetUrl, `<article part="message" class="message"><div part="avatar" class="avatar"><slot name="avatar"><tblr-avatar variant="agent" label="Assistant"></tblr-avatar></slot></div><div class="inner"><header part="metadata"><b></b><time class="muted"></time></header><div part="body" class="body"><slot></slot></div><div part="sources"><slot name="sources"></slot></div><div part="actions"><slot name="actions"></slot></div></div></article>`);
  }
  update() {
    // Accept the plan's role shorthand without leaving invalid ARIA roles on the host.
    const shorthand = this.getAttribute('role');
    if (['agent', 'user', 'system'].includes(shorthand)) {
      this.removeAttribute('role');
      this.setAttribute('message-role', shorthand);
      return;
    }
    const role = ['agent', 'user', 'system'].includes(this.messageRole) ? this.messageRole : 'agent';
    this.root.querySelector('article').className = `message ${role}`;
    this.setText('b', this.author || (role === 'agent' ? 'Assistant' : role === 'user' ? 'You' : 'System'));
    const time = this.root.querySelector('time');
    const date = new Date(this.timestamp);
    time.hidden = !this.timestamp || Number.isNaN(date.getTime());
    if (!time.hidden) { time.dateTime = date.toISOString(); time.textContent = date.toLocaleString(); }
    const avatar = this.root.querySelector('tblr-avatar');
    avatar.variant = role === 'agent' ? 'agent' : '';
    avatar.label = this.author || role;
    avatar.initials = role === 'agent' ? 'F' : (this.author || role).slice(0, 2).toUpperCase();
  }
}
['author', 'timestamp'].forEach(name => stringProperty(TblrMessage, name));
stringProperty(TblrMessage, 'messageRole', 'message-role', 'agent');
Component({ tag: 'tblr-message', styles: stylesheetUrl.href })(TblrMessage);
export { TblrMessage };
