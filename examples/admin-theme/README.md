# Glasman admin theme with custom elements

This reproduces the nine screens in `../../../05-admin-theme`, using the library's
custom elements and the optional admin token preset. The original mockups remain
unchanged. Open `../admin-theme.html` after running `npm run serve` from the
package root.

Screens: overview, Direction, Vente / ADV, Préparation, Technicien SAV, preparation
queue, customer machines, payments, and notifications / audit journal. Navigation
connects all nine screens. The French reference copy, populated fixture tables,
revenue chart, and initial selections are preserved.

Confirmations, cancellation, composer requests, checkbox selection, journal
filters, and notification dismissal run locally. Simulated journal entries and
navigation preferences persist in session storage across pages. Free requests
receive a static response; no backend or AI service is connected. Actions never
write business data.

`reference-layout.css` and `tokens.css` preserve the reference geometry.
`custom-elements.css` adapts public shadow parts to that layout; `app.js` handles
application interactions. Rich authored cells live inside
`<tblr-data-table authored><table>…</table></tblr-data-table>`. In this mode the
component provides the table container, while the application owns filtering,
selection, and row updates. The regular JSON / remote-data mode is unchanged.

Local SVG icons come from `@tabler/icons` 3.44.0, under the MIT license included
in `icons/LICENSE`. The reference's Google Inter font request is retained, with
system fonts as fallback. `REFERENCE.md` is the original mockup documentation.

The checked-in HTML is usable directly; Python is not needed at runtime. For
maintenance, `../../scripts/convert-admin-theme.py` converts rendered original
HTML snapshots after their fixture scripts have populated the content. It needs
Beautiful Soup (`pip install beautifulsoup4`):

```sh
python scripts/convert-admin-theme.py --snapshots /path/to/rendered/reference
```

Run `npm run test:ui` for the component regressions and all nine reference screens,
including desktop/mobile navigation, local assets, confirmation/cancellation,
session journal persistence, safe composer text, and payment selections.
