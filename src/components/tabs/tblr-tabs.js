import { Component } from '../../core/component.js';
import '../icon/tblr-icon.js';

const stylesheetUrl = new URL('./tblr-tabs.css', import.meta.url);
const orientationValues = new Set(['horizontal', 'vertical']);
const selectedTabStorageKey = 'tab-selected';

function safeToken(value, fallback, allowedValues) {
  return allowedValues.has(value) ? value : fallback;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function getTabValue(tab, index) {
  return tab.getAttribute('value') || `tab-${index + 1}`;
}

function getTabSort(tab) {
  const sort = Number.parseFloat(tab.dataset.sort);

  return Number.isFinite(sort) ? sort : null;
}

function idToken(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || 'tab';
}

class TblrTab extends HTMLElement {
  connectedCallback() {
    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'tabpanel');
    }
  }
}

class TblrTabs extends HTMLElement {
  static observedAttributes = ['value', 'orientation', 'vertical'];
  static nextId = 1;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.uid = `tblr-tabs-${TblrTabs.nextId++}`;
    this.reflectingValue = false;
    this.handleClick = this.handleClick.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.observer = new MutationObserver(mutations => {
      if (mutations.some(mutation => this.isTabDefinitionMutation(mutation))) {
        this.render();
      }
    });
  }

  connectedCallback() {
    this.restoreSelection();
    this.render();
    this.observer.observe(this, {
      attributeFilter: ['label', 'icon', 'value', 'disabled', 'data-sort'],
      attributes: true,
      childList: true,
      subtree: true,
    });
  }

  disconnectedCallback() {
    this.observer.disconnect();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;

    if (name === 'value' && this.reflectingValue) {
      this.syncTabs();
      return;
    }

    this.render();
  }

  get value() {
    return this.getAttribute('value') ?? this.getDefaultValue();
  }

  set value(value) {
    this.setAttribute('value', value ?? '');
  }

  get tabs() {
    // Forms may wrap tab panels so their controls share one native form owner.
    const tabs = [...this.querySelectorAll('tblr-tab')]
      .filter(tab => tab.closest('tblr-tabs') === this);

    if (!tabs.some(tab => getTabSort(tab) !== null)) {
      return tabs;
    }

    return tabs
      .map((tab, index) => ({ tab, index, sort: getTabSort(tab) }))
      .sort((left, right) => {
        if (left.sort === null && right.sort === null) return left.index - right.index;
        if (left.sort === null) return 1;
        if (right.sort === null) return -1;

        return left.sort - right.sort || left.index - right.index;
      })
      .map(item => item.tab);
  }

  get orientation() {
    if (this.hasAttribute('vertical')) return 'vertical';

    return safeToken(
      this.getAttribute('orientation') ?? 'horizontal',
      'horizontal',
      orientationValues
    );
  }

  isTabDefinitionMutation(mutation) {
    if (mutation.type === 'attributes') {
      return mutation.target.tagName.toLowerCase() === 'tblr-tab'
        && mutation.target.closest('tblr-tabs') === this;
    }

    if (mutation.type !== 'childList'
      || (mutation.target !== this && mutation.target.closest('tblr-tabs') !== this)) {
      return false;
    }

    return [...mutation.addedNodes, ...mutation.removedNodes].some(node => (
      node instanceof HTMLElement
      && (node.tagName.toLowerCase() === 'tblr-tab' || node.querySelector('tblr-tab'))
    ));
  }

  render() {
    const tabs = this.tabs;
    const orientation = this.orientation;

    this.root.innerHTML = `
      <link rel="stylesheet" href="${stylesheetUrl}">

      <div part="tabs" class="tabs tabs-${orientation}">
        <div
          part="tablist"
          class="tab-list"
          role="tablist"
          aria-orientation="${orientation}"
        >
          ${tabs.map((tab, index) => this.renderTabButton(tab, index)).join('')}
        </div>

        <div part="panels" class="tab-panels">
          <slot></slot>
        </div>
      </div>
    `;

    this.root.querySelector('.tab-list')?.addEventListener('click', this.handleClick);
    this.root.querySelector('.tab-list')?.addEventListener('keydown', this.handleKeydown);
    this.syncTabs();
  }

  renderTabButton(tab, index) {
    const value = getTabValue(tab, index);
    const label = tab.getAttribute('label') || tab.textContent.trim() || value;
    const icon = tab.getAttribute('icon');
    const disabled = tab.hasAttribute('disabled');

    return `
      <button
        part="tab"
        class="tab"
        id="${this.buttonId(value)}"
        type="button"
        role="tab"
        data-value="${escapeHtml(value)}"
        aria-controls="${this.panelId(value)}"
        aria-selected="false"
        tabindex="-1"
        ${disabled ? 'disabled aria-disabled="true"' : ''}
      >
        ${icon ? `<tblr-icon class="tab-icon" name="${escapeHtml(icon)}" aria-hidden="true"></tblr-icon>` : ''}
        <span class="tab-label">${escapeHtml(label)}</span>
      </button>
    `;
  }

  handleClick(event) {
    const button = event.target.closest('.tab');

    if (!button || button.disabled) return;

    this.activate(button.dataset.value);
  }

  handleKeydown(event) {
    const handledKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']);

    if (!handledKeys.has(event.key)) return;

    const buttons = this.enabledButtons;
    const currentIndex = buttons.indexOf(event.target);

    if (currentIndex === -1) return;

    event.preventDefault();

    let nextIndex = currentIndex;
    const forwardKey = this.orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
    const backwardKey = this.orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';

    if (event.key === forwardKey) {
      nextIndex = (currentIndex + 1) % buttons.length;
    } else if (event.key === backwardKey) {
      nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = buttons.length - 1;
    }

    buttons[nextIndex]?.focus();
    this.activate(buttons[nextIndex]?.dataset.value);
  }

  activate(value) {
    if (!value) return;

    sessionStorage.setItem(selectedTabStorageKey, value);

    if (this.value === value) return;

    this.reflectingValue = true;
    this.setAttribute('value', value);
    this.reflectingValue = false;
    this.syncTabs();
    this.dispatchEvent(new CustomEvent('change', {
      bubbles: true,
      composed: true,
      detail: { value },
    }));
  }

  restoreSelection() {
    const value = sessionStorage.getItem(selectedTabStorageKey);

    if (!value) return;

    this.reflectingValue = true;
    this.setAttribute('value', value);
    this.reflectingValue = false;
  }

  syncTabs() {
    const tabs = this.tabs;
    const activeValue = this.getActiveValue(tabs);
    const buttons = this.buttons;

    tabs.forEach((tab, index) => {
      const value = getTabValue(tab, index);
      const active = value === activeValue;

      tab.id = tab.id || this.panelId(value);
      tab.hidden = !active;
      tab.setAttribute('role', 'tabpanel');
      tab.setAttribute('aria-labelledby', this.buttonId(value));
    });

    buttons.forEach(button => {
      const active = button.dataset.value === activeValue;

      button.setAttribute('part', active ? 'tab tab-active' : 'tab');
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
  }

  getActiveValue(tabs = this.tabs) {
    const currentValue = this.getAttribute('value');
    const currentTab = tabs.find((tab, index) => getTabValue(tab, index) === currentValue && !tab.hasAttribute('disabled'));

    if (currentTab) return currentValue;

    const defaultValue = this.getDefaultValue(tabs);

    if (defaultValue && currentValue !== defaultValue) {
      this.reflectingValue = true;
      this.setAttribute('value', defaultValue);
      this.reflectingValue = false;
    }

    return defaultValue;
  }

  getDefaultValue(tabs = this.tabs) {
    const tab = tabs.find(item => !item.hasAttribute('disabled'));

    return tab ? getTabValue(tab, tabs.indexOf(tab)) : '';
  }

  get buttons() {
    return [...this.root.querySelectorAll('.tab')];
  }

  get enabledButtons() {
    return this.buttons.filter(button => !button.disabled);
  }

  buttonId(value) {
    return `${this.id || this.uid}-${idToken(value)}-tab`;
  }

  panelId(value) {
    return `${this.id || this.uid}-${idToken(value)}-panel`;
  }
}

Component({
  tag: 'tblr-tab',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrTab);

Component({
  tag: 'tblr-tabs',
  version: '1.0.0',
  styles: stylesheetUrl.href,
})(TblrTabs);

export { TblrTab, TblrTabs };
