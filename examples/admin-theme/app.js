import { defineTblr, autoload } from '../../src/main.js';

await defineTblr();
const shell = document.querySelector('tblr-app-shell');
const user = document.body.dataset.user || 'utilisateur';
const clock = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const status = message => {
  const target = document.querySelector('#demo-status');
  target.textContent = message;
  target.hidden = false;
  clearTimeout(status.timer);
  status.timer = setTimeout(() => { target.hidden = true; }, 4500);
};
const store = {
  get(key) { try { return sessionStorage.getItem(`f4.custom-elements.${key}`); } catch { return null; } },
  set(key, value) { try { sessionStorage.setItem(`f4.custom-elements.${key}`, value); } catch {} },
};
let journal = [];
try { journal = JSON.parse(store.get('journal') || '[]'); } catch {}
if (!Array.isArray(journal)) journal = [];
document.querySelectorAll('tblr-audit-log').forEach(log => { log.referenceEntries = [...log.entries]; });
function refreshJournal() {
  document.querySelectorAll('tblr-audit-log').forEach(log => { log.entries = [...journal, ...log.referenceEntries]; });
  document.querySelectorAll('.journal-count').forEach(counter => {
    if (!counter.dataset.initialCount) counter.dataset.initialCount = counter.textContent;
    counter.textContent = String(Number(counter.dataset.initialCount) + journal.length);
  });
  const table = document.querySelector('#journal-table tbody');
  if (table) {
    table.querySelectorAll('[data-simulated]').forEach(row => row.remove());
    for (const entry of [...journal].reverse()) {
      const row = document.createElement('tr');
      row.dataset.simulated = 'true';
      row.dataset.k = entry.outcome === 'read' ? 'ro' : entry.outcome === 'confirmed' ? 'ok' : 'no';
      const cell = document.createElement('td');
      cell.colSpan = table.closest('table').querySelectorAll('thead th').length || 5;
      cell.textContent = `${entry.timeLabel} · ${entry.action}`;
      row.append(cell);
      table.prepend(row);
    }
    const filter = document.querySelector('.admin-filter.on')?.dataset.filter || 'all';
    table.querySelectorAll('tr').forEach(row => { row.hidden = filter !== 'all' && row.dataset.k !== filter; });
  }
}
function addJournal(action, outcome = 'confirmed') {
  journal.unshift({ action, outcome, timeLabel: `${clock()} · simulation · ${user}` });
  store.set('journal', JSON.stringify(journal));
  refreshJournal();
}
refreshJournal();
shell.collapsed = store.get('rail') === 'collapsed' || innerWidth <= 1024 && innerWidth > 720;
if (innerWidth <= 1280) shell.asideOpen = false;
const syncRail = () => shell.classList.toggle('rail-collapsed', shell.collapsed && innerWidth > 720);
syncRail();
shell.addEventListener('navigation-toggle', () => { syncRail(); store.set('rail', shell.collapsed ? 'collapsed' : 'open'); });
window.addEventListener('resize', syncRail);
// Localize the shell's internal close controls for this French application.
shell.shadowRoot.querySelector('[part="navigation-dialog"] button').textContent = 'Fermer la navigation';
shell.shadowRoot.querySelector('[part="aside-dialog"] button').textContent = 'Fermer les notifications';

document.addEventListener('click', event => {
  const target = event.target.closest('tblr-button, tblr-nav-item, a');
  if (!target || target.disabled) return;
  if (target.hasAttribute('data-confirm')) {
    const preview = document.getElementById(target.dataset.confirm);
    if (!preview) return;
    preview.state = 'preview';
    preview.hidden = false;
    target.setAttribute('aria-expanded', 'true');
    preview.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  } else if (target.hasAttribute('data-fill')) {
    if (target.dataset.go) { location.href = target.dataset.go; return; }
    const composer = document.querySelector('tblr-composer');
    if (composer) { composer.value = target.dataset.fill; composer.focus(); }
  } else if (target.hasAttribute('data-filter')) {
    document.querySelectorAll('.filters .admin-filter').forEach(filter => filter.classList.toggle('on', filter === target));
    document.querySelectorAll('#journal-table tbody tr').forEach(row => { row.hidden = target.dataset.filter !== 'all' && row.dataset.k !== target.dataset.filter; });
  } else if (target.getAttribute('title') === 'Marquer lu') {
    target.disabled = true;
    target.setAttribute('title', 'Lu');
    const icon = target.querySelector('tblr-icon');
    if (icon) icon.setAttribute('name', 'check');
    target.closest('tr')?.querySelectorAll('b').forEach(label => { label.style.fontWeight = '400'; });
    status('Notification marquée comme lue dans la maquette.');
  } else if (target.getAttribute('href') === '#') {
    event.preventDefault();
    status('Écran classique non scénarisé dans cette maquette.');
  } else if (target.tagName === 'TBLR-BUTTON' && !target.getAttribute('href') && !target.closest('.filters')) {
    status('Action de démonstration : utilisez les cartes avec aperçu pour simuler une confirmation.');
  }
});
document.addEventListener('suggestion-select', event => {
  const target = event.target;
  if (target.dataset.go) { location.href = target.dataset.go; return; }
  const composer = document.querySelector('tblr-composer');
  if (composer) { composer.value = event.detail.value; composer.focus(); }
});
document.querySelectorAll('tblr-action-preview').forEach(preview => {
  const openers = () => [...document.querySelectorAll('[data-confirm]')].filter(button => button.dataset.confirm === preview.id);
  preview.addEventListener('cancel', () => {
    preview.state = 'cancelled';
    preview.hidden = true;
    openers().forEach(button => button.setAttribute('aria-expanded', 'false'));
    openers()[0]?.shadowRoot.querySelector('button, a')?.focus();
    addJournal(`Aperçu annulé : ${preview.getAttribute('title')}`, 'cancelled');
  });
  preview.addEventListener('confirm', async () => {
    preview.setAttribute('result', 'Simulation en cours…');
    preview.state = 'pending';
    await new Promise(resolve => setTimeout(resolve, 180));
    preview.state = 'confirmed';
    preview.hidden = true;
    const card = preview.closest('tblr-card, .agent-layer, .chat-result');
    const done = card?.querySelector('.done');
    if (done) {
      done.hidden = false;
      const time = done.querySelector('time');
      if (time) time.textContent = clock();
    }
    openers().forEach(button => {
      button.dataset.completed = 'true';
      button.disabled = true;
      button.setAttribute('aria-expanded', 'false');
      button.textContent = button.dataset.doneLabel || 'Fait';
    });
    addJournal(preview.dataset.journal || preview.getAttribute('title'));
    status('Simulation confirmée et ajoutée au journal. Aucune donnée métier modifiée.');
  });
});

async function ask(text) {
  const composer = document.querySelector('tblr-composer');
  if (composer?.pending) return;
  const thread = document.querySelector('.thread') || document.querySelector('.page') || document.querySelector('.work-content');
  if (!thread || !text.trim()) return;
  if (composer) composer.pending = true;
  const userMessage = document.createElement('tblr-message');
  userMessage.className = 'admin-message';
  userMessage.messageRole = 'user';
  userMessage.author = user;
  const paragraph = document.createElement('p'); paragraph.textContent = text; userMessage.append(paragraph);
  const agentMessage = document.createElement('tblr-message');
  agentMessage.className = 'admin-message'; agentMessage.author = 'Fil';
  const reply = document.createElement('p');
  reply.textContent = 'Cette demande n’est pas scénarisée dans la maquette. En production, je l’analyserais, j’interrogerais les données (search_orders, get_contact, search_products…) et je répondrais ici par des cartes. Rien ne serait modifié sans votre confirmation.';
  agentMessage.append(reply);
  const mark = document.createElement('tblr-avatar'); mark.variant = 'agent'; mark.label = 'Fil'; mark.slot = 'avatar';
  const icon = document.createElement('tblr-icon'); icon.setAttribute('name', 'needle-thread'); icon.setAttribute('base-url', './icons'); icon.slot = 'icon'; mark.append(icon); agentMessage.append(mark);
  const sources = document.createElement('tblr-source-list'); sources.slot = 'sources'; sources.sources = [{ label: 'Lecture seule · aucune action proposée' }]; agentMessage.append(sources);
  const anchor = thread.querySelector('.thread-end');
  thread.insertBefore(userMessage, anchor || null);
  thread.insertBefore(agentMessage, anchor || null);
  await autoload(thread);
  if (composer) { composer.pending = false; composer.value = ''; }
  addJournal(`Question libre : « ${text} » — réponse en lecture seule`, 'read');
  agentMessage.scrollIntoView({ block: 'nearest' });
}
document.addEventListener('message-submit', event => ask(event.detail.text));
document.addEventListener('command-submit', event => { ask(event.detail.text); event.target.value = ''; });
document.addEventListener('notification-select', event => status(event.detail.item.title));
document.querySelector('#all')?.addEventListener('change', event => {
  document.querySelectorAll('.pick-fac').forEach(checkbox => { checkbox.checked = event.target.checked; });
});
document.querySelectorAll('.pick-draft').forEach(checkbox => checkbox.addEventListener('change', () => {
  const count = [...document.querySelectorAll('.pick-draft')].filter(item => item.checked).length;
  const label = document.querySelector('#n-drafts'); if (label) label.textContent = count;
  const button = document.querySelector('[data-confirm="c-batch"]');
  if (button && !button.dataset.completed) button.disabled = count === 0;
}));
document.querySelectorAll('tblr-select').forEach(select => select.addEventListener('change', () => status('Réglage mis à jour dans la maquette.')));
document.documentElement.dataset.adminReady = 'true';
