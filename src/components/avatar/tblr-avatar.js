import { Component } from '../../core/component.js';
import { UIElement, stringProperty, safeUrl } from '../../core/ui-element.js';
const stylesheetUrl = new URL('./tblr-avatar.css', import.meta.url);

class TblrAvatar extends UIElement {
  static observedAttributes = ['initials', 'src', 'label', 'size', 'variant'];
  mount() {
    this.template(stylesheetUrl, '<span part="avatar" class="avatar" role="img"><span part="initials" class="initials"></span><img part="image" hidden alt=""></span>');
    this.root.querySelector('img').addEventListener('error', () => {
      this.root.querySelector('img').hidden = true;
      this.root.querySelector('.initials').hidden = false;
    });
  }
  update() {
    this.setText('.initials', this.initials || (this.variant === 'agent' ? 'F' : '?'));
    this.root.querySelector('.avatar').setAttribute('aria-label', this.label || this.initials || 'Avatar');
    const image = this.root.querySelector('img');
    const src = safeUrl(this.src, ['http:', 'https:', 'blob:']);
    if (this.imageSource !== src) {
      this.imageSource = src;
      image.hidden = !src;
      this.root.querySelector('.initials').hidden = Boolean(src);
      if (src) image.src = src;
      else image.removeAttribute('src');
    }
  }
}
['initials', 'src', 'label', 'size', 'variant'].forEach(name => stringProperty(TblrAvatar, name));
Component({ tag: 'tblr-avatar', styles: stylesheetUrl.href })(TblrAvatar);
export { TblrAvatar };
