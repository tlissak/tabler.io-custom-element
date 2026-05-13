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
- [x] Search
- [x] Datepicker
- [x] Icon
- [ ] Alert
- [ ] Toast
- [ ] Spinner
- [ ] Pagination
- [ ] Tooltip
- [ ] Popover
- [ ] Accordion
- [ ] List Group
- [ ] Image
- [ ] Figure
- [ ] Table
- [ ] Tabs
- [ ] Carousel
- [ ] Collapse
- [ ] Breadcrumb
- [ ] Progress
- [ ] Modal
- [ ] Dropdown
- [ ] Nav
- [ ] Badge


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

## Form controls

Inputs, selects, search controls, and datepickers autoload with the rest of the components.

```html
<tblr-input label="Text" placeholder="Input placeholder"></tblr-input>
<tblr-input label="Required" placeholder="Required..." required></tblr-input>
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
  label="Select multiple"
  multiple
  size="3"
  value="one,two"
  options="one:One|two:Two|three:Three"
></tblr-select>

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
