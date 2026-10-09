import { Component } from '../../core/component.js';
import { UIElement, stringProperty } from '../../core/ui-element.js';
const stylesheetUrl = new URL('./tblr-stat.css', import.meta.url);
class TblrStat extends UIElement {
  static observedAttributes = ['value', 'label', 'trend', 'description'];
  mount() {
    this.template(stylesheetUrl, '<section part="stat" class="surface"><div part="value" class="value"><slot name="value"><span></span></slot></div><div part="label" class="muted label"></div><div part="description" class="description"><slot name="description"><span></span></slot></div><div part="source" class="muted"><slot name="source"></slot></div></section>');
  }
  update() {
    this.setText('.value span', this.value);
    this.setText('.label', this.label);
    this.setText('.description span', this.description);
    this.root.querySelector('.description').dataset.trend = ['up', 'down'].includes(this.trend) ? this.trend : 'neutral';
  }
}
['value', 'label', 'trend', 'description'].forEach(name => stringProperty(TblrStat, name));
Component({ tag: 'tblr-stat', styles: stylesheetUrl.href })(TblrStat);
export { TblrStat };
