import { Component } from '../../core/component.js';
import { UIElement, booleanProperty, stringProperty } from '../../core/ui-element.js';
const stylesheetUrl = new URL('./tblr-suggestion.css', import.meta.url);
class TblrSuggestion extends UIElement {
  static observedAttributes = ['text', 'value', 'disabled'];
  mount() {
    this.template(stylesheetUrl, '<button part="button" class="button" type="button"><slot name="icon"></slot><slot><span></span></slot></button>');
    this.root.querySelector('button').addEventListener('click', () => {
      if (!this.disabled) this.emit('suggestion-select', { value: this.value || this.text || this.textContent.trim() });
    });
  }
  update() {
    this.setText('span', this.text);
    this.root.querySelector('button').disabled = this.disabled;
  }
}
['text', 'value'].forEach(name => stringProperty(TblrSuggestion, name));
booleanProperty(TblrSuggestion, 'disabled');
Component({ tag: 'tblr-suggestion', styles: stylesheetUrl.href })(TblrSuggestion);
export { TblrSuggestion };
