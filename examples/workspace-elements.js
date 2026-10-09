import { defineTblr } from '../src/main.js';

await defineTblr();
const find = name => document.getElementById(`catalog-${name}`);
const report = (name, text) => { find(`${name}-result`).textContent = text; };

find('command').addEventListener('command-submit', event => report('command', `Command submitted: ${event.detail.text}`));
const composer = find('composer');
composer.addEventListener('message-submit', async event => {
  composer.pending = true;
  report('composer', 'Handling the local demonstration…');
  await new Promise(resolve => setTimeout(resolve, 250));
  report('composer', `Message submitted: ${event.detail.text}`);
  composer.pending = false;
  composer.value = '';
  composer.focus();
});
composer.addEventListener('suggestion-select', event => { composer.value = event.detail.value; composer.focus(); });

const preview = find('preview');
preview.addEventListener('confirm', async () => {
  preview.state = 'pending';
  await new Promise(resolve => setTimeout(resolve, 250));
  preview.setAttribute('result', 'Simulation confirmed. No business data changed.');
  preview.state = 'confirmed';
});
preview.addEventListener('cancel', () => { preview.state = 'cancelled'; });
find('preview-reset').addEventListener('click', () => { preview.removeAttribute('result'); preview.state = 'preview'; });
find('preview-error').addEventListener('confirm', event => { event.currentTarget.state = 'preview'; event.currentTarget.removeAttribute('result'); });
find('preview-error').addEventListener('cancel', event => { event.currentTarget.state = 'cancelled'; });

document.querySelectorAll('#suggestion tblr-suggestion').forEach(element => {
  element.addEventListener('suggestion-select', event => report('suggestion', `Suggestion selected: ${event.detail.value}`));
});
find('sources').sources = [
  { label: 'Orders fixture', timestamp: '2026-10-09T07:58:00Z' },
  { label: 'Admin theme demonstration', url: './admin-theme.html' },
];
find('story').items = [
  { id: 'payment', title: 'Payment received', detail: 'Lenoir paid fictional order CMD-2048.', severity: 'success', explanation: 'Why you: this client belongs to your portfolio.', timestamp: '2026-10-09T07:30:00Z' },
  { id: 'stock', title: 'Stock risk', detail: 'One motor is missing in the fixture.', severity: 'danger', explanation: 'Why you: an order at your agency is affected.' },
];
find('story').addEventListener('notification-select', event => report('story', `Notification selected: ${event.detail.item.title}`));
find('story-action').addEventListener('click', () => report('story', 'Payment reviewed in the fixture.'));
const audit = find('audit');
audit.entries = [
  { timestamp: '2026-10-09T07:58:00Z', actor: 'Fil', action: 'Read briefing fixture', outcome: 'read', reference: 'CMD-2048' },
  { timestamp: '2026-10-09T08:00:00Z', actor: 'Camille', action: 'Assignment simulation', outcome: 'confirmed', reference: 'CMD-2049' },
  { timestamp: '2026-10-09T08:02:00Z', actor: 'Camille', action: 'Cancelled simulation', outcome: 'cancelled', reference: 'CMD-2050' },
];
audit.addEventListener('filter-request', event => report('audit', `Filter: ${event.detail.query || '(all entries)'}`));
audit.addEventListener('export-request', event => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(event.detail.entries, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'catalog-audit-fixture.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  report('audit', 'Fixture audit exported.');
});
document.documentElement.dataset.catalogElementsReady = 'true';
