# Admin theme: future custom elements

Reference: `../05-admin-theme/tokens.css`, `styles.css`, `README.md`, and the role and fallback-screen HTML files. The visual preset is implemented in `src/styles/admin-theme.css`; `examples/admin-theme.html` composes existing elements to demonstrate it. The reference remains unchanged.

## Existing coverage

Use `tblr-button`, `tblr-card`, `tblr-badge` (with `light`), `tblr-nav` / `tblr-nav-item`, the existing form controls, `tblr-data-table`, `tblr-pagination`, `tblr-tabs`, and `tblr-modal`. Grid/flex already cover ordinary layouts. A card with `data-risk="warning|danger|success"` gets a left accent through its public `card` part. Do not create duplicate buttons, tables, cards, or filters.

Implementation status: all eleven P1, P2, and P3 elements below are registered and available. The standard catalog and admin preview both include the shared, interactive fixture workflow in `examples/workspace-demo.js`. See README for the delivered API contracts; application integrations remain separate.

## Implemented additions

| Priority | Proposed element | Reference pattern and purpose | Initial contract | Reuse |
| --- | --- | --- | --- | --- |
| P1 | `tblr-app-shell` | `.top`, `.rail`, `.work`, `.story`: consistent responsive application frame | Slots `header`, `navigation`, default workspace, `aside`; `collapsed` and `aside-open` properties; composed `navigation-toggle` / `aside-toggle` events | `tblr-nav`, buttons, grid |
| P1 | `tblr-command-bar` | `.cmd`: universal command entry with Ctrl/Cmd K | Label, placeholder, value, disabled; composed `command-submit` with `{text}`; shortcut enabled only for one designated instance | Search/input and buttons |
| P1 | `tblr-composer` | `.composer-wrap`, `.composer`: text input, send, suggestions, pending state | Value, disabled, pending; slots `suggestions`, `hint`, `attachments`; composed `message-submit` with `{text}`; multiline Enter/Shift Enter behavior documented | Input, button, file input, spinner |
| P1 | `tblr-message` | `.msg`, `.msg-meta`, `.msg-body`, `.bubble`: agent/user/system messages | Role, author, timestamp; slots `avatar`, default content, `sources`, `actions`; escaped metadata; content remains authored DOM | Card, relative time |
| P1 | `tblr-action-preview` | `.confirm`, `.done`: preview and explicit confirmation inside an action card | States `preview`, `pending`, `confirmed`, `cancelled`, `error`; slots `changes`, `exclusions`, `hint`; composed `confirm` / `cancel`; pending prevents duplicate submission | Card, button, badge, spinner |
| P2 | `tblr-stat` | `.figure`: value, label, trend in briefings | Value, label, trend (`up`, `down`, `neutral`), optional description/source slot; formatting delegated | Card, format number |
| P2 | `tblr-suggestion` | `.chip`: keyboard-operable suggested command | Text/value, disabled; composed `suggestion-select` with `{value}`; optional icon slot | Button |
| P2 | `tblr-source-list` | `.sources`: provenance and freshness below a response | Source entries with label, optional safe URL, timestamp; compact list, accessible name; no claims of verified data without input | Relative time, badge |
| P2 | `tblr-notification-story` | `.story-item`, `.quiet`: events grouped into a narrative with “why you” | Items and quiet-summary input; slots for item actions; severity, timestamp, explanation; composed `notification-select` | Badge, button, relative time |
| P2 | `tblr-audit-log` | `.journal`: chronological action outcomes | Structured entries: timestamp, actor, action, outcome, reference; read-only presentation; optional filters/export requests as events | Data table or semantic list, badge |
| P3 | `tblr-avatar` | `.avatar`, `.agent-mark`: shared identity marker | Initials, image URL, accessible name, size; agent variant uses brand gradient; image failure falls back to initials | Icon |

## Original delivery sequence (implemented)

1. **Shell and command bar:** establish desktop 65px header, 240px rail / 56px collapsed rail, and 340px aside. On mobile, expose navigation and aside as dismissible panels; preserve the workspace and scroll position. Prototype with the preparation screen before migrating all roles.
2. **Conversation and preview:** implement message, composer, and action-preview; reproduce one complete briefing → suggestion → preview → confirmation → result journey using fixture data. Keep network and business logic in the consuming application.
3. **Briefing and provenance:** add stat, suggestion, and source-list. Replace the preview's handwritten markup and migrate Direction, Vente, Préparation, and Technicien compositions.
4. **Notifications and audit:** implement story and audit-log using actual application-supplied entries; then add the shared avatar. Reproduce `notifications.html` without hardcoding mockup business rules into UI components.

For every addition, register through `Component`, support the existing autoloader filename convention, add `web-types.json` metadata and README API documentation, publish useful `part` names and slots, and add an example. All theme variables must fall back to the existing standard style. Consumers opt in with `data-tblr-theme="admin"` and may override component variables locally.

## Acceptance criteria

- Desktop and mobile layouts reproduce the reference hierarchy, Inter/system typography, 13–14px controls, 15px/1.55 prose, blue primary, flat cards, soft badges, and amber/red risk accents.
- Theme switching and scoped theming work through shadow DOM, including dynamically inserted elements. Standard-theme consumers retain existing behavior and defaults.
- Keyboard support includes visible focus, panel dismissal with Escape, appropriate dialog focus management and return, Enter/Shift Enter composition, and a non-conflicting Ctrl/Cmd K shortcut. Respect reduced motion.
- Messages and source entries never render untrusted strings as HTML. All actions emit intent events; server authorization, validation, confirmation execution, and audit persistence stay in application modules.
- Confirming emits one intent; the caller explicitly sets pending/result/error. A visual confirmation is never treated as permission to perform unrelated actions. Cancelling performs no mutation.
- Cover upgrade/property hydration, events across shadow boundaries, pending/disabled states, theme inheritance, desktop/mobile overflow, and empty/error states with browser checks.

## Application dependencies (separate from component work)

The reference describes agent chat, business-action APIs, user/site authorization, notification storage, and durable audit records. They are not provided by this styling change. Dictation needs a separate supported-browser and permission design; the initial command bar/composer accepts text. Use fixture data until application APIs are connected. Never infer real notifications, sources, or completed business actions from the demonstration page.
