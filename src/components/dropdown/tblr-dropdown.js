import { Component } from '../../core/component.js';

const stylesheetUrl = new URL('./tblr-dropdown.css', import.meta.url);
const placements = new Set([
  'top',
  'top-start',
  'top-end',
  'bottom',
  'bottom-start',
  'bottom-end',
  'right',
  'right-start',
  'right-end',
  'left',
  'left-start',
  'left-end',
]);

function booleanAttribute(host, name) {
  if (!host.hasAttribute(name)) return false;

  return host.getAttribute(name) !== 'false';
}

function numberAttribute(host, name, fallback = 0) {
  const value = Number.parseFloat(host.getAttribute(name) ?? '');

  return Number.isFinite(value) ? value : fallback;
}

function safePlacement(value) {
  return placements.has(value) ? value : 'bottom-start';
}

class TblrDropdown extends HTMLElement {
  static observedAttributes = [
    'open',
    'disabled',
    'placement',
    'distance',
    'skidding',
    'stay-open-on-select',
    'same-width',
    'hoist',
  ];

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.handleTriggerClick = this.handleTriggerClick.bind(this);
    this.handlePanelClick = this.handlePanelClick.bind(this);
    this.handleDocumentClick = this.handleDocumentClick.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.updatePosition = this.updatePosition.bind(this);
  }

  connectedCallback() {
    this.render();
    this.syncListeners();
  }

  disconnectedCallback() {
    this.removeGlobalListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;

    if (name === 'open') {
      this.syncListeners();
    }

    this.render();
  }

  get open() {
    return booleanAttribute(this, 'open');
  }

  set open(value) {
    this.toggleAttribute('open', Boolean(value));
  }

  get panel() {
    return this.root.querySelector('.panel');
  }

  get baseElement() {
    return this.root.querySelector('.dropdown');
  }

  get triggerSlot() {
    return this.root.querySelector('slot[name="trigger"]');
  }

  get triggerElement() {
    return this.triggerSlot?.assignedElements({ flatten: true })[0] ?? null;
  }

  get triggerAnchorElement() {
    const trigger = this.triggerElement;

    if (!trigger) return null;

    return trigger.shadowRoot?.querySelector('[part="button"], button, [role="button"]') ?? trigger;
  }

  show() {
    if (booleanAttribute(this, 'disabled') || this.open) return;

    this.dispatchEvent(new CustomEvent('show', {
      bubbles: true,
      composed: true,
    }));
    this.open = true;
    this.dispatchEvent(new CustomEvent('after-show', {
      bubbles: true,
      composed: true,
    }));
  }

  hide() {
    if (!this.open) return;

    this.dispatchEvent(new CustomEvent('hide', {
      bubbles: true,
      composed: true,
    }));
    this.open = false;
    this.dispatchEvent(new CustomEvent('after-hide', {
      bubbles: true,
      composed: true,
    }));
  }

  toggle() {
    if (this.open) {
      this.hide();
      return;
    }

    this.show();
  }

  render() {
    const open = this.open;
    const disabled = booleanAttribute(this, 'disabled');
    const placement = safePlacement(this.getAttribute('placement') ?? 'bottom-start');

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">

      <span part="base" class="dropdown${open ? ' open' : ''}${disabled ? ' disabled' : ''}">
        <span part="trigger" class="trigger" aria-expanded="${open ? 'true' : 'false'}">
          <slot name="trigger"></slot>
        </span>
        <span part="panel" class="panel" data-placement="${placement}" role="menu" ${open ? '' : 'hidden'}>
          <slot></slot>
        </span>
      </span>
    `;

    this.root.querySelector('.trigger')?.addEventListener('click', this.handleTriggerClick);
    this.panel?.addEventListener('click', this.handlePanelClick);
    this.triggerSlot?.addEventListener('slotchange', () => this.syncTriggerAttributes());
    this.syncTriggerAttributes();

    if (open) {
      requestAnimationFrame(this.updatePosition);
    }
  }

  syncTriggerAttributes() {
    const trigger = this.triggerElement;

    if (!trigger) return;

    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', this.open ? 'true' : 'false');

    if (booleanAttribute(this, 'disabled')) {
      trigger.setAttribute('aria-disabled', 'true');
      return;
    }

    trigger.removeAttribute('aria-disabled');
  }

  syncListeners() {
    this.removeGlobalListeners();

    if (!this.open) return;

    document.addEventListener('click', this.handleDocumentClick);
    document.addEventListener('keydown', this.handleKeydown);
    window.addEventListener('resize', this.updatePosition);
    window.addEventListener('scroll', this.updatePosition, true);
  }

  removeGlobalListeners() {
    document.removeEventListener('click', this.handleDocumentClick);
    document.removeEventListener('keydown', this.handleKeydown);
    window.removeEventListener('resize', this.updatePosition);
    window.removeEventListener('scroll', this.updatePosition, true);
  }

  handleTriggerClick(event) {
    if (booleanAttribute(this, 'disabled')) {
      event.preventDefault();
      return;
    }

    this.toggle();
  }

  handlePanelClick(event) {
    if (booleanAttribute(this, 'stay-open-on-select')) return;
    if (!event.target.closest('a, button, [role="menuitem"], [data-dropdown-close]')) return;

    this.hide();
  }

  handleDocumentClick(event) {
    if (event.composedPath().includes(this)) return;

    this.hide();
  }

  handleKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.hide();
      this.triggerElement?.focus?.();
    }
  }

  updatePosition() {
    const panel = this.panel;
    const trigger = this.triggerElement;
    const triggerAnchor = this.triggerAnchorElement;

    if (!panel || !trigger || !triggerAnchor || !this.open) return;

    const placement = safePlacement(this.getAttribute('placement') ?? 'bottom-start');
    const [side, align = 'center'] = placement.split('-');
    const distance = numberAttribute(this, 'distance', 4);
    const skidding = numberAttribute(this, 'skidding', 0);
    const hoist = booleanAttribute(this, 'hoist');

    panel.style.position = hoist ? 'fixed' : 'absolute';
    panel.style.inset = 'auto';
    panel.style.transform = '';

    const triggerRect = triggerAnchor.getBoundingClientRect();

    panel.style.minWidth = booleanAttribute(this, 'same-width') ? `${triggerRect.width}px` : '';

    if (hoist) {
      this.positionFixedPanel(panel, triggerRect, side, align, distance, skidding);
      return;
    }

    this.positionAbsolutePanel(panel, triggerRect, side, align, distance, skidding);
  }

  positionAbsolutePanel(panel, triggerRect, side, align, distance, skidding) {
    const baseRect = this.baseElement?.getBoundingClientRect() ?? this.getBoundingClientRect();
    const top = triggerRect.top - baseRect.top;
    const left = triggerRect.left - baseRect.left;
    const triggerWidth = triggerRect.width;
    const triggerHeight = triggerRect.height;

    if (side === 'top') {
      panel.style.bottom = `${baseRect.height - top + distance}px`;
      this.setInlinePosition(panel, left, triggerWidth, align, skidding);
      return;
    }

    if (side === 'left') {
      panel.style.right = `${baseRect.width - left + distance}px`;
      this.setBlockPosition(panel, top, triggerHeight, align, skidding);
      return;
    }

    if (side === 'right') {
      panel.style.left = `${left + triggerWidth + distance}px`;
      this.setBlockPosition(panel, top, triggerHeight, align, skidding);
      return;
    }

    panel.style.top = `${top + triggerHeight + distance}px`;
    this.setInlinePosition(panel, left, triggerWidth, align, skidding);
  }

  positionFixedPanel(panel, triggerRect, side, align, distance, skidding) {
    if (side === 'top') {
      panel.style.bottom = `${window.innerHeight - triggerRect.top + distance}px`;
      this.setInlinePosition(panel, triggerRect.left, triggerRect.width, align, skidding);
      return;
    }

    if (side === 'left') {
      panel.style.right = `${window.innerWidth - triggerRect.left + distance}px`;
      this.setBlockPosition(panel, triggerRect.top, triggerRect.height, align, skidding);
      return;
    }

    if (side === 'right') {
      panel.style.left = `${triggerRect.right + distance}px`;
      this.setBlockPosition(panel, triggerRect.top, triggerRect.height, align, skidding);
      return;
    }

    panel.style.top = `${triggerRect.bottom + distance}px`;
    this.setInlinePosition(panel, triggerRect.left, triggerRect.width, align, skidding);
  }

  setInlinePosition(panel, left, width, align, skidding) {
    if (align === 'end') {
      panel.style.right = `calc(100% - ${left + width + skidding}px)`;
      return;
    }

    if (align === 'center') {
      panel.style.left = `${left + (width / 2) + skidding}px`;
      panel.style.transform = 'translateX(-50%)';
      return;
    }

    panel.style.left = `${left + skidding}px`;
  }

  setBlockPosition(panel, top, height, align, skidding) {
    if (align === 'end') {
      panel.style.bottom = `calc(100% - ${top + height + skidding}px)`;
      return;
    }

    if (align === 'center') {
      panel.style.top = `${top + (height / 2) + skidding}px`;
      panel.style.transform = 'translateY(-50%)';
      return;
    }

    panel.style.top = `${top + skidding}px`;
  }
}

Component({
  tag: 'tblr-dropdown',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrDropdown);

export { TblrDropdown };
