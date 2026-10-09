import { Component } from '../../core/component.js';
import { UIElement, booleanProperty } from '../../core/ui-element.js';
const stylesheetUrl = new URL('./tblr-app-shell.css', import.meta.url);
class TblrAppShell extends UIElement {
  static observedAttributes = ['collapsed', 'aside-open', 'navigation-open', 'label'];
  constructor() {
    super();
    this.media = window.matchMedia('(max-width: 720px)');
    this.onMediaChange = () => {
      if (this.media.matches) {
        this.navigationOpen = false;
        this.asideOpen = false;
      }
      this.update();
    };
  }
  connectedCallback() { super.connectedCallback(); this.media.addEventListener('change', this.onMediaChange); }
  disconnectedCallback() {
    this.media.removeEventListener('change', this.onMediaChange);
    this.root.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
  }
  mount() {
    this.template(stylesheetUrl, `<div part="shell" class="shell"><header part="header"><button class="button" part="navigation-toggle" aria-controls="navigation" type="button">☰</button><div class="header-content"><slot name="header"></slot></div><button class="button" part="aside-toggle" aria-controls="aside" type="button">◫</button></header><nav part="navigation" id="navigation" class="navigation"><slot name="navigation"></slot></nav><main part="workspace"><slot></slot></main><aside part="aside" id="aside"><slot name="aside"></slot></aside></div><dialog part="navigation-dialog" aria-label="Navigation"><button class="button close" type="button">Close navigation</button><div class="drawer-content"></div></dialog><dialog part="aside-dialog" aria-label="Updates"><button class="button close" type="button">Close updates</button><div class="drawer-content"></div></dialog>`);
    this.root.querySelector('[part="navigation-toggle"]').addEventListener('click', () => {
      if (this.media.matches) {
        const open = !this.navigationOpen;
        if (open) this.asideOpen = false;
        this.navigationOpen = open;
      }
      else this.collapsed = !this.collapsed;
      this.emit('navigation-toggle', { collapsed: this.collapsed, open: this.navigationOpen });
    });
    this.root.querySelector('[part="aside-toggle"]').addEventListener('click', () => {
      if (this.media.matches && !this.asideOpen) this.navigationOpen = false;
      this.asideOpen = !this.asideOpen;
      this.emit('aside-toggle', { open: this.asideOpen });
    });
    ['navigation', 'aside'].forEach(name => {
      const dialog = this.root.querySelector(`[part="${name}-dialog"]`);
      const dismiss = () => {
        if (name === 'navigation') this.navigationOpen = false;
        else this.asideOpen = false;
        this.emit(`${name}-toggle`, name === 'navigation' ? { collapsed: this.collapsed, open: false } : { open: false });
      };
      dialog.querySelector('button').addEventListener('click', dismiss);
      dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
      dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dismiss(); } });
    });
  }
  update() {
    const mobile = this.media.matches;
    if (mobile && this.navigationOpen && this.asideOpen) {
      this.navigationOpen = false;
      return;
    }
    this.root.querySelector('.shell').classList.toggle('mobile', mobile);
    const navigationToggle = this.root.querySelector('[part="navigation-toggle"]');
    navigationToggle.setAttribute('aria-label', mobile ? this.navigationOpen ? 'Close navigation' : 'Open navigation' : this.collapsed ? 'Expand navigation' : 'Collapse navigation');
    navigationToggle.setAttribute('aria-expanded', String(mobile ? this.navigationOpen : !this.collapsed));
    this.root.querySelector('[part="aside-toggle"]').setAttribute('aria-label', this.asideOpen ? 'Close updates' : 'Open updates');
    this.root.querySelector('[part="aside-toggle"]').setAttribute('aria-expanded', String(this.asideOpen));
    this.root.querySelector('main').setAttribute('aria-label', this.getAttribute('label') || 'Workspace');
    ['navigation', 'aside'].forEach(name => {
      const dialog = this.root.querySelector(`[part="${name}-dialog"]`);
      const slot = this.root.querySelector(`slot[name="${name}"]`);
      const target = mobile ? dialog.querySelector('.drawer-content') : this.root.querySelector(`[part="${name}"]`);
      if (slot.parentElement !== target) target.append(slot);
      const open = name === 'navigation' ? this.navigationOpen : this.asideOpen;
      if (mobile && open && !dialog.open && this.isConnected) {
        this.root.querySelectorAll('dialog[open]').forEach(other => { if (other !== dialog) other.close(); });
        dialog.showModal();
      } else if ((!mobile || !open) && dialog.open) dialog.close();
    });
  }
}
booleanProperty(TblrAppShell, 'collapsed');
booleanProperty(TblrAppShell, 'asideOpen', 'aside-open');
booleanProperty(TblrAppShell, 'navigationOpen', 'navigation-open');
Component({ tag: 'tblr-app-shell', styles: stylesheetUrl.href })(TblrAppShell);
export { TblrAppShell };
