# tabler.io custom element
Tabler.io Custom Elements - Librery of custom elements style inspired by Tabler.io with  Autloader JS CSS - No dependencies 


# Elements :
- [x] Button
- [x] Card
- [x] Checkbox
- [x] Colorpicker
- [x] Radio
- [x] Switch
- [x] File Input
- [x] Input
- [x] Select
- [x] Autocomplete
- [x] Search
- [x] Datepicker
- [x] Icon
- [x] WYSIWYG Rich Text Editor
- [x] TinyMCE Rich Text Editor
- [x] Alert Toast and Notification
- [x] Spinner
- [x] Pagination
- [x] Tabs
- [x] Grid
- [x] Flexbox
- [x] Modal
- [x] Copy to clipboard
- [x] Badge
- [x] Nav
- [x] Code Preview
- [x] Format Number
- [x] QR Code
- [x] Dropdown
- [ ] Carousel
- [ ] Collapse - Accordion
- [ ] Breadcrumb
- [ ] Progress
- [ ] Tooltip
- [ ] Popover
- [ ] List Group
- [ ] Image
- [ ] Figure
- [ ] Table


## Global theme variables

Load the default theme once in your page to get Tabler-like base variables:

```html
<link rel="stylesheet" href="./src/styles/theme.css">
```

Override the variables globally from `:root`:

```css
:root {
  --tblr-primary: #206bc4;
  --tblr-radius: 4px;
  --tblr-font-sans: Inter, ui-sans-serif, system-ui, sans-serif;
}
```

Component-specific variables are also available when you need a narrower override:

```css
tblr-button {
  --tblr-button-border-radius: 6px;
  --tblr-button-primary-bg: #206bc4;
  --tblr-button-primary-hover-bg: #1c5aa6;
}
```

## Test server

Run the local static server:

```bash
npm run serve
```

Then open `http://localhost:8080/`.

Docker:

```bash
npm run docker:build
npm run docker:run
```

## Icons

Icons autoload with the rest of the components. The default source is the Tabler Icons package on jsDelivr.

```html
<tblr-icon name="home" label="Home"></tblr-icon>
<tblr-icon name="heart" filled label="Favorite"></tblr-icon>
<tblr-button><tblr-icon name="check"></tblr-icon>Save</tblr-button>
```

Global icon styling:

```css
:root {
  --tblr-icon-size: 1.25rem;
  --tblr-icon-color: currentColor;
  --tblr-icon-stroke-width: 2;
  --tblr-icon-base-url: https://cdn.jsdelivr.net/npm/@tabler/icons@3.44.0/icons;
}
```

## Buttons

Buttons support filled, outline, ghost, square, action, icon-only, and size variants.

```html
<tblr-button variant="primary">Primary</tblr-button>
<tblr-button variant="success">Success</tblr-button>
<tblr-button variant="warning">Warning</tblr-button>
<tblr-button variant="danger">Danger</tblr-button>
<tblr-button variant="info">Info</tblr-button>
<tblr-button variant="dark">Dark</tblr-button>
<tblr-button variant="light">Light</tblr-button>

<tblr-button variant="primary" appearance="outline">Primary</tblr-button>
<tblr-button variant="primary" appearance="ghost">Primary</tblr-button>
<tblr-button variant="primary" square>Primary</tblr-button>

<tblr-button action label="Edit"><tblr-icon name="edit"></tblr-icon></tblr-button>
<tblr-button action state="active" label="Clipboard"><tblr-icon name="clipboard"></tblr-icon></tblr-button>
<tblr-button variant="light"><tblr-icon name="plus"></tblr-icon>Add</tblr-button>
<tblr-button variant="light" icon-only label="Favorite"><tblr-icon name="star"></tblr-icon></tblr-button>
<tblr-button variant="light" size="xl">Button</tblr-button>
```

## Cards

Cards autoload with the rest of the components.

```html
<tblr-card>Simple card content.</tblr-card>

<tblr-card title="Card with title">
  Card content.
</tblr-card>

<tblr-card title="Card with header background" header-bg>
  Card content.
</tblr-card>

<tblr-card title="Card without border" no-border>
  Card content.
</tblr-card>

<tblr-card title="Card with title" subtitle="Card subtitle">
  Card content.
</tblr-card>

<tblr-card title="Card title" header footer="Last updated 3 mins ago">
  Card content.
</tblr-card>

<tblr-card middle>
  <h2>No results found</h2>
  <p>Try adjusting your search or filter to find what you're looking for.</p>
  <tblr-button><tblr-icon name="search"></tblr-icon>Search again</tblr-button>
</tblr-card>

<tblr-card title="Custom footer">
  Card content.
  <span slot="footer">Footer content</span>
</tblr-card>
```

## Alerts and toast notifications

Alerts support inline messages, closable alerts, timed alerts, countdown bars, and toast notifications.

```html
<tblr-alert variant="primary" open closable>
  <strong>This is informative.</strong><br>
  You can tell by how useful the alert is.
</tblr-alert>

<tblr-alert variant="success" open closable duration="3000">
  Your changes have been saved.
</tblr-alert>

<tblr-alert variant="warning" open closable duration="10000" countdown="rtl">
  This alert will close automatically.
</tblr-alert>
```

Create toast notifications by calling `toast()`. Toasts move into a fixed toast stack and are removed from the DOM after they close.

```js
const toast = Object.assign(document.createElement('tblr-alert'), {
  innerHTML: '<strong>Saved</strong><br>Changes were stored successfully.',
});

toast.setAttribute('variant', 'success');
toast.setAttribute('closable', '');
toast.setAttribute('duration', '3000');
toast.setAttribute('countdown', 'rtl');
document.body.append(toast);
toast.toast();
```

## Copy button

Copy buttons copy text from a `value` attribute or another element referenced with `from`.

```html
<tblr-copy-button value="Tabler components"></tblr-copy-button>

<span id="phone">+1 (234) 456-7890</span>
<tblr-copy-button from="phone"></tblr-copy-button>

<tblr-input id="copy-input" value="User input"></tblr-input>
<tblr-copy-button from="copy-input.value"></tblr-copy-button>

<a id="copy-link" href="https://tabler.io">Tabler</a>
<tblr-copy-button from="copy-link[href]"></tblr-copy-button>
```

Customize feedback labels and duration:

```html
<tblr-copy-button
  value="Custom labels are easy"
  copy-label="Click to copy"
  success-label="Copied!"
  error-label="Could not copy"
  feedback-duration="1500"
></tblr-copy-button>
```

`tblr-copy-button` uses the modern async Clipboard API, `navigator.clipboard.writeText()`, when it is available. Browsers generally require a secure context such as HTTPS or localhost and a user interaction for clipboard writes. A legacy `document.execCommand('copy')` fallback is used when the Clipboard API is unavailable.

Use `no-fallback` when you want Clipboard API-only behavior:

```html
<tblr-copy-button
  value="Copied with navigator.clipboard.writeText()"
  no-fallback
></tblr-copy-button>
```

## Badges

Badges support the Tabler color set: `blue`, `azure`, `indigo`, `purple`, `pink`, `red`, `orange`, `yellow`, `lime`, `green`, `teal`, and `cyan`. Semantic aliases such as `primary`, `success`, `warning`, `danger`, `info`, `secondary`, `dark`, and `light` are also available.

```html
<tblr-badge color="blue">Blue</tblr-badge>
<tblr-badge color="green" light>Green</tblr-badge>
<tblr-badge color="red" pill>12</tblr-badge>
<tblr-badge color="purple" size="lg">New</tblr-badge>
```

Use `dot` for a leading inner dot. The dot can use its own color and can pulse independently with `animated`.

```html
<tblr-badge color="green" light dot dot-color="green">Online</tblr-badge>
<tblr-badge color="blue" light dot dot-color="#206bc4" animated>Syncing</tblr-badge>
<tblr-badge dot color="red" animated label="Unread"></tblr-badge>
```

Badges can also render as links:

```html
<tblr-badge href="https://tabler.io" color="azure" light pill>Tabler</tblr-badge>
```

## Navigation

`tblr-nav` supports horizontal navigation by default. Use `align="right"` or `align="end"` on an item to push it to the right side.

```html
<tblr-nav label="Primary">
  <tblr-nav-item label="Home" href="/" active></tblr-nav-item>
  <tblr-nav-item label="Docs" href="/docs"></tblr-nav-item>
  <tblr-nav-item label="Pricing" href="/pricing"></tblr-nav-item>
  <tblr-nav-item label="Account" href="/account" align="right"></tblr-nav-item>
</tblr-nav>
```

Use `vertical` for stacked navigation. Nested `tblr-nav-item` children become collapsible groups.

```html
<tblr-nav vertical label="Sidebar">
  <tblr-nav-item label="Dashboard" href="#dashboard" active></tblr-nav-item>
  <tblr-nav-item label="Settings" open>
    <tblr-nav-item label="Profile" href="#profile"></tblr-nav-item>
    <tblr-nav-item label="Billing" href="#billing"></tblr-nav-item>
  </tblr-nav-item>
  <tblr-nav-item label="Disabled" disabled></tblr-nav-item>
</tblr-nav>
```

## Dropdown

`tblr-dropdown` is inspired by Shoelace’s dropdown pattern: use `slot="trigger"` for the control and place links, buttons, or menu content in the default slot.

```html
<tblr-dropdown placement="bottom-start" distance="6">
  <tblr-button slot="trigger" variant="light">
    Edit
    <tblr-icon name="chevron-down"></tblr-icon>
  </tblr-button>

  <button type="button">Cut</button>
  <button type="button">Copy</button>
  <button type="button">Paste</button>
  <hr>
  <a href="#find">Find</a>
</tblr-dropdown>
```

Use `placement`, `distance`, and `skidding` to position the panel. Add `stay-open-on-select` when menu item clicks should keep the panel open, `same-width` when the panel should match the trigger width, and `hoist` when the panel needs fixed positioning inside clipped containers.

```html
<tblr-dropdown placement="top-end" skidding="8" same-width hoist>
  <tblr-button slot="trigger" variant="light">Actions</tblr-button>
  <button type="button">Archive</button>
  <button type="button">Duplicate</button>
</tblr-dropdown>
```

## Code preview

`tblr-code-preview` renders a styled `<pre><code>` block. Provide code with the `value` attribute or as text content.

```html
<tblr-code-preview language="js" title="example.js" copy line-numbers>
const message = 'Hello Tabler';
console.log(message);
</tblr-code-preview>

<tblr-code-preview
  language="html"
  title="card.html"
  value="&lt;tblr-card title=&quot;Hello&quot;&gt;Content&lt;/tblr-card&gt;"
></tblr-code-preview>
```

Use `wrap` for long lines and `theme="plain"` for a light preview.

## Format number

`tblr-format-number` formats a numeric value with manual decimal and thousand separators, currency symbol placement, and decimal precision.

```html
<tblr-format-number
  value="1234567.8"
  thousand-separator=","
  decimal-separator="."
  precision="2"
  currency-symbol="$"
  symbol-position="left"
></tblr-format-number>

<tblr-format-number
  value="1234567.8"
  thousand-separator="."
  decimal-separator=","
  precision="2"
  currency-symbol="EUR"
  symbol-position="right"
  symbol-space
></tblr-format-number>
```

If `precision` is omitted, the component infers it from the provided value.

## QR Code

`tblr-qr-code` generates a QR code canvas from a string value. Its API follows the Shoelace/Web Awesome component shape with `value`, `label`, `size`, `fill`, `background`, `radius`, and `error-correction`.

```html
<tblr-qr-code
  value="https://tabler.io/"
  label="Scan this code to visit Tabler"
></tblr-qr-code>

<tblr-qr-code
  value="https://tabler.io/"
  size="192"
  fill="#206bc4"
  background="#ffffff"
  radius="0.35"
  error-correction="Q"
></tblr-qr-code>
```

Supported error correction levels are `L`, `M`, `Q`, and `H`. The default is `H`.

## Spinners

Spinners show loading state with Tabler-style border, grow, and animated dot variants.

```html
<tblr-spinner></tblr-spinner>
<tblr-spinner color="green"></tblr-spinner>
<tblr-spinner size="sm"></tblr-spinner>

<tblr-spinner type="grow" color="red"></tblr-spinner>
<tblr-spinner type="dots" color="primary" label="Loading content"></tblr-spinner>

<tblr-button disabled>
  <tblr-spinner size="sm" label="Saving"></tblr-spinner>
  Saving
</tblr-button>
```

## Form controls

Inputs, selects, search controls, and datepickers autoload with the rest of the components.

```html
<tblr-input label="Text" placeholder="Input placeholder"></tblr-input>
<tblr-input label="Required" placeholder="Required..." required></tblr-input>
<tblr-input label="Clearable" value="Clear me" clearable></tblr-input>
<tblr-input label="Password" type="password" value="secret-password" toggle-password></tblr-input>
<tblr-input label="Textarea" textarea rows="5" maxlength="100"></tblr-input>
<tblr-input label="Input group" placeholder="Search for..." action="Go!"></tblr-input>
<tblr-input label="Prepend text" prefix="https://" placeholder="subdomain"></tblr-input>
<tblr-input label="Append text" suffix=".tabler.io" placeholder="yourfancydomain"></tblr-input>

<tblr-select
  label="Select"
  value="one"
  options="one:One|two:Two|three:Three"
></tblr-select>

<tblr-select
  label="Advanced select"
  searchable
  value="california"
  placeholder="Search states..."
  options="alabama:Alabama|alaska:Alaska|arizona:Arizona|arkansas:Arkansas|california:California|colorado:Colorado|south-carolina:South Carolina|wyoming:Wyoming"
></tblr-select>

<tblr-select
  label="Select multiple"
  multiple
  size="3"
  value="one,two"
  options="one:One|two:Two|three:Three"
></tblr-select>

<tblr-select
  label="Select multiple states"
  multiple
  value="arizona,south-carolina,wyoming"
  options="alabama:Alabama|alaska:Alaska|arizona:Arizona|arkansas:Arkansas|california:California|colorado:Colorado|south-carolina:South Carolina|wyoming:Wyoming"
></tblr-select>

<tblr-autocomplete
  label="Autocomplete"
  name="state"
  src="/api/states"
  placeholder="Search states..."
></tblr-autocomplete>

<tblr-search label="Icon search" placeholder="Search..."></tblr-search>
<tblr-search label="Separated search" placeholder="Search for..." button></tblr-search>
<tblr-search label="Rounded search" placeholder="Search..." rounded></tblr-search>

<tblr-datepicker label="Datepicker" value="2020-06-20"></tblr-datepicker>
<tblr-datepicker label="Datepicker icon end" value="2020-06-20" icon="end"></tblr-datepicker>
<tblr-datepicker label="Datepicker icon start" value="2020-06-20" icon="start"></tblr-datepicker>

<tblr-radio name="options" label="Option 1" checked></tblr-radio>
<tblr-radio name="options" label="Option 2"></tblr-radio>

<tblr-checkbox label="Checkbox input"></tblr-checkbox>
<tblr-checkbox label="Checked checkbox input" checked></tblr-checkbox>
<tblr-checkbox
  label="Default checkbox"
  description="Lorem ipsum dolor sit amet, consectetur adipisicing elit."
></tblr-checkbox>

<tblr-switch label="Option 1" checked></tblr-switch>
<tblr-switch label="Push Notifications" checked align-end></tblr-switch>

<tblr-file-input
  label="Custom File Input"
  button="Parcourir..."
  placeholder="Aucun fichier sélectionné."
></tblr-file-input>

<tblr-input label="Autosize textarea" textarea autosize rows="2" placeholder="Type something..."></tblr-input>
```

`tblr-autocomplete` appends the typed query to `src` with the `q` parameter by default. JSON responses can be an array, or an object with `results`, `items`, or `data`. Each item can be a string or an object with `label` and `value`.

```html
<tblr-autocomplete
  label="Customer"
  name="customer_id"
  src="/api/customers/search"
  query-param="term"
  label-field="name"
  value-field="id"
  min-length="2"
  debounce="300"
  empty-text="No customers found"
></tblr-autocomplete>
```

## WYSIWYG rich text editor

The rich text editor stores HTML in its `value` property and attribute. Toolbar actions include text formatting, lists, alignment, indent/outdent, text color, undo/redo, links, clear formatting, and source editing.

```html
<tblr-rich-editor
  name="body"
  label="Message"
  placeholder="Write something..."
  value="<p>Hello <strong>world</strong>.</p>"
></tblr-rich-editor>
```

Editor events bubble and cross the shadow boundary:

```js
document.querySelector('tblr-rich-editor').addEventListener('input', event => {
  console.log(event.target.value);
});
```

## TinyMCE rich text editor

`tblr-tinymce-editor` loads TinyMCE behind the component and initializes it on the internal textarea. By default it loads TinyMCE 8 from Tiny Cloud with `no-api-key`; set `api-key` for production Tiny Cloud usage or `src` for a self-hosted TinyMCE build.

```html
<tblr-tinymce-editor
  name="body"
  label="TinyMCE message"
  api-key="your-tiny-cloud-api-key"
  height="360"
  value="<p>Hello from <strong>TinyMCE</strong>.</p>"
></tblr-tinymce-editor>

<tblr-tinymce-editor
  name="self_hosted_body"
  label="Self-hosted TinyMCE"
  src="/vendor/tinymce/tinymce.min.js"
  license-key="gpl"
  plugins="lists link table code wordcount"
  toolbar="undo redo | bold italic | bullist numlist | link table | code"
></tblr-tinymce-editor>

Use `lazy` to defer TinyMCE initialization until the editor becomes visible on the page (uses `IntersectionObserver`).

```html
<tblr-tinymce-editor
  lazy
  name="lazy_body"
  label="Lazy loaded TinyMCE"
></tblr-tinymce-editor>
```

Pass TinyMCE init options with JSON in `config` when the option is not exposed as an attribute:

```html
<tblr-tinymce-editor
  config='{"content_style":"body { font-family: Inter, sans-serif; }"}'
></tblr-tinymce-editor>
```

## Tabs

Tabs support horizontal navigation by default and vertical navigation with the `vertical` attribute.

```html
<tblr-tabs value="profile">
  <tblr-tab label="Profile" value="profile">
    Profile content.
  </tblr-tab>
  <tblr-tab label="Activity" value="activity">
    Activity content.
  </tblr-tab>
  <tblr-tab label="Disabled" value="disabled" disabled>
    Disabled content.
  </tblr-tab>
</tblr-tabs>

<tblr-tabs vertical value="settings">
  <tblr-tab label="Settings" value="settings">
    Settings content.
  </tblr-tab>
  <tblr-tab label="Billing" value="billing">
    Billing content.
  </tblr-tab>
</tblr-tabs>
```

Listen for tab changes with the bubbling `change` event:

```js
document.querySelector('tblr-tabs').addEventListener('change', event => {
  console.log(event.detail.value);
});
```

## Grid

Grids support fixed columns or responsive auto-fit columns. Use `tblr-grid-item` when an item needs to span columns.

```html
<tblr-grid columns="3" gap="md">
  <tblr-card title="One">First card.</tblr-card>
  <tblr-card title="Two">Second card.</tblr-card>
  <tblr-card title="Three">Third card.</tblr-card>
</tblr-grid>

<tblr-grid min="16rem" gap="lg" dense>
  <tblr-grid-item span="2">
    <tblr-card title="Wide">This item spans two columns on wider screens.</tblr-card>
  </tblr-grid-item>
  <tblr-card title="Standard">Standard item.</tblr-card>
  <tblr-card title="Standard">Standard item.</tblr-card>
</tblr-grid>
```

## Flexbox

Flexbox layouts support direction, wrapping, gaps, alignment, justification, and optional item sizing.

```html
<tblr-flex align="center" justify="between" gap="md">
  <tblr-button variant="primary">Save changes</tblr-button>
  <tblr-button variant="light">Cancel</tblr-button>
</tblr-flex>

<tblr-flex wrap gap="md">
  <tblr-flex-item grow="1" basis="16rem">
    <tblr-card title="Flexible item">This item can grow from a fixed basis.</tblr-card>
  </tblr-flex-item>
  <tblr-flex-item grow="1" basis="16rem">
    <tblr-card title="Flexible item">Items wrap when space is limited.</tblr-card>
  </tblr-flex-item>
</tblr-flex>
```

## Pagination

Pagination renders page buttons, previous and next controls, and ellipses for larger page sets.

```html
<tblr-pagination page="4" pages="12"></tblr-pagination>

<tblr-pagination
  page="8"
  pages="24"
  siblings="2"
  boundary="1"
  previous="Prev"
  next="Next"
></tblr-pagination>
```

Listen for page changes with the bubbling `change` event:

```js
document.querySelector('tblr-pagination').addEventListener('change', event => {
  console.log(event.detail.page);
});
```

## Modals

Modals support Tabler-style sizes, scrollable bodies, full-width layouts, status states, and footer actions.

```html
<tblr-button id="open-modal">Open modal</tblr-button>

<tblr-modal
  id="example-modal"
  title="Modal title"
  cancel="Close"
  action="Save changes"
>
  <p>Modal content.</p>
</tblr-modal>

<tblr-modal size="lg" title="Large modal" cancel="Close" action="Save changes">
  <p>Large modal content.</p>
</tblr-modal>

<tblr-modal status="danger" title="Are you sure?" cancel="Cancel" action="Delete 84 items">
  <p>Do you really want to remove these files? This cannot be undone.</p>
</tblr-modal>
```

Open and close modals from JavaScript:

```js
const modal = document.querySelector('#example-modal');

document.querySelector('#open-modal').addEventListener('click', () => modal.show());
modal.addEventListener('action', () => modal.hide('action'));
```

Form control events bubble and cross the shadow boundary:

```js
document.querySelector('tblr-search').addEventListener('search', event => {
  console.log(event.detail.value);
});

document.querySelector('tblr-datepicker').addEventListener('change', event => {
  console.log(event.target.value);
});
```

Global card styling:

```css
:root {
  --tblr-card-bg: #ffffff;
  --tblr-card-color: var(--tblr-body-color);
  --tblr-card-header-bg: #f6f8fb;
  --tblr-card-footer-bg: #f6f8fb;
  --tblr-card-footer-color: var(--tblr-muted-color);
  --tblr-card-padding-x: 1rem;
  --tblr-card-padding-y: 1rem;
  --tblr-card-footer-padding-y: 0.75rem;
  --tblr-card-middle-min-height: 13.5rem;
  --tblr-card-shadow: 0 1px 2px rgb(24 36 51 / 4%);
}
```
