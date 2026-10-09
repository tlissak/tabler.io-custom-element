import { defineTblr, autoload } from '../src/main.js';

// Both example pages use the same fixtures and event handlers. No network actions.
export async function mountWorkspaceDemo(host) {
  host.innerHTML = `
    <tblr-app-shell label="Preparation workspace">
      <div slot="header" class="demo-header">
        <div class="demo-brand"><tblr-avatar initials="G" variant="agent" label="Glasman"></tblr-avatar><b>Glasman F4</b></div>
        <tblr-command-bar data-demo="command" shortcut label="Ask Fil" placeholder="Ask Fil about your orders…"></tblr-command-bar>
        <tblr-avatar initials="CM" label="Camille Martin"></tblr-avatar>
      </div>
      <nav slot="navigation" class="demo-navigation" aria-label="Demo navigation">
        <button type="button" data-view="briefing" aria-label="Morning briefing">☀<span>Morning briefing</span></button>
        <button type="button" data-view="orders" aria-label="Preparation queue">▤<span>Preparation queue</span></button>
        <button type="button" data-view="gallery" aria-label="Component examples">▦<span>Component examples</span></button>
      </nav>
      <div class="demo-workspace">
        <div><h1>Good morning, Camille.</h1><p class="demo-muted">Direction · Paris · Fictional demonstration data</p></div>
        <div class="demo-stats">
          <tblr-stat value="124 580 €" label="Monthly revenue" trend="up" description="+8% this month"><span slot="source">Fixture · 09 Oct 2026</span></tblr-stat>
          <tblr-stat value="18" label="Pending quotes" description="Follow-up needed"></tblr-stat>
          <tblr-stat value="3" label="Ready orders" trend="up" description="Ready to prepare"></tblr-stat>
          <tblr-stat value="1" label="Stock risk" trend="down" description="One missing motor"></tblr-stat>
        </div>
        <tblr-message author="Fil" message-role="agent" timestamp="2026-10-09T07:58:00Z">
          <p>Three orders are ready. CMD-2048 is waiting for a motor; review the proposed assignment before continuing.</p>
          <tblr-source-list slot="sources" data-demo="sources" label="Fixture sources"></tblr-source-list>
          <div slot="actions" class="demo-suggestions"><tblr-suggestion text="Review CMD-2048" value="Review CMD-2048"><span slot="icon" aria-hidden="true">↗</span></tblr-suggestion><tblr-suggestion text="Show ready orders" value="Show ready orders"></tblr-suggestion></div>
        </tblr-message>
        <div data-demo="thread" class="demo-workspace" aria-label="Conversation"></div>
        <tblr-action-preview data-demo="preview" title="Assign CMD-2048 to Camille">
          <ul slot="changes"><li>Assign this demonstration order to Camille.</li><li>Show a simulated result in the audit log.</li></ul>
          <p slot="exclusions">No real orders, stock, or customer messages are changed.</p>
          <span slot="hint">Local simulation</span>
        </tblr-action-preview>
        <div class="demo-row"><tblr-button data-demo="reset" variant="secondary">Reset preview</tblr-button><tblr-switch data-demo="failure">Simulate a failed confirmation</tblr-switch></div>
        <h2>Preparation queue · Fictional orders</h2>
        <tblr-data-table data-demo="orders" title="Preparation queue" hide-header per-page="5"></tblr-data-table>
        <tblr-composer data-demo="composer" label="Your request" placeholder="Ask about the preparation queue…">
          <div slot="suggestions" class="demo-suggestions"><tblr-suggestion text="Review CMD-2048" value="Review CMD-2048"></tblr-suggestion><tblr-suggestion text="Summarize urgent orders" value="Summarize urgent orders"></tblr-suggestion><tblr-suggestion text="Unavailable suggestion" disabled></tblr-suggestion></div>
          <span slot="hint">Enter sends · Shift+Enter inserts a line · Fictional local responses</span>
          <details slot="attachments"><summary>Attachment example</summary><tblr-file-input label="Demo attachment"></tblr-file-input></details>
        </tblr-composer>
        <p class="demo-muted demo-status" data-demo="status" role="status"></p>
        <section class="demo-gallery" data-demo="gallery" aria-label="Additional component states">
          <h2>Additional component states</h2>
          <div class="demo-gallery-grid">
            <tblr-card title="Messages & identity" header>
              <tblr-message message-role="user" author="Camille"><p>Prepare the ready orders.</p><tblr-avatar slot="avatar" initials="CM" label="Camille" size="lg"></tblr-avatar></tblr-message>
              <tblr-message message-role="system" author="System"><p>Awaiting an explicit confirmation.</p></tblr-message>
              <div class="demo-row"><tblr-avatar initials="AB" label="Image fallback" src="./missing-avatar-demo.png"></tblr-avatar><tblr-avatar variant="agent" size="sm" label="Fil"></tblr-avatar><tblr-avatar initials="LG" size="lg" label="Large avatar"></tblr-avatar></div>
            </tblr-card>
            <tblr-card title="Preview outcomes" header>
              <tblr-action-preview state="confirmed" title="Completed simulation" result="The caller supplied this success result."><p>Read-only success state.</p></tblr-action-preview>
              <tblr-action-preview state="cancelled" title="Cancelled simulation"><p>No action was executed.</p></tblr-action-preview>
              <tblr-action-preview data-demo="error-preview" state="error" title="Retryable example"><p>Retry resets this local example to preview.</p></tblr-action-preview>
            </tblr-card>
            <tblr-card title="Empty data & formatting" header>
              <tblr-source-list label="Sources"></tblr-source-list>
              <tblr-notification-story title="Empty notification story"></tblr-notification-story>
              <tblr-audit-log title="Empty audit log"></tblr-audit-log>
              <tblr-stat label="Formatted value"><tblr-format-number slot="value" value="124580" currency-symbol="€" symbol-position="right" symbol-space thousand-separator="space"></tblr-format-number><span slot="description">Formatting is delegated to the existing element.</span></tblr-stat>
            </tblr-card>
            <tblr-card title="Disabled input states" header>
              <tblr-command-bar disabled label="Disabled command" placeholder="Unavailable"></tblr-command-bar>
              <tblr-composer pending value="Awaiting a response" label="Pending composer"></tblr-composer>
              <tblr-composer disabled label="Disabled composer"></tblr-composer>
            </tblr-card>
          </div>
          <details><summary>Markup and event example</summary><pre>&lt;tblr-app-shell aside-open&gt;
  &lt;tblr-command-bar slot="header" shortcut&gt;&lt;/tblr-command-bar&gt;
  &lt;nav slot="navigation"&gt;…&lt;/nav&gt;
  &lt;tblr-message message-role="agent" author="Fil"&gt;…&lt;/tblr-message&gt;
  &lt;tblr-composer&gt;&lt;/tblr-composer&gt;
  &lt;tblr-notification-story slot="aside"&gt;&lt;/tblr-notification-story&gt;
&lt;/tblr-app-shell&gt;

preview.addEventListener('confirm', async () =&gt; {
  preview.state = 'pending';
  // Execute an explicitly authorized application action here.
  preview.state = 'confirmed'; // or 'error'
});</pre></details>
        </section>
      </div>
      <div slot="aside" class="demo-aside">
        <tblr-notification-story data-demo="story" title="Since yesterday" quiet-summary="Without you: two demonstration orders were prepared."><tblr-button slot="actions-0" data-demo="notification-action" size="sm" variant="secondary">Review payment</tblr-button></tblr-notification-story>
        <tblr-audit-log data-demo="audit" title="Simulation audit" filterable exportable></tblr-audit-log>
      </div>
    </tblr-app-shell>`;

  await defineTblr();
  await autoload(host);
  const find = name => host.querySelector(`[data-demo="${name}"]`);
  const shell = host.querySelector('tblr-app-shell');
  const preview = find('preview');
  const composer = find('composer');
  const status = text => { find('status').textContent = text; };
  find('sources').sources = [{ label: 'Orders fixture', timestamp: '2026-10-09T07:58:00Z' }, { label: 'Component documentation', url: './index.html#workspace-elements' }];
  find('story').items = [
    { id: 'payment', title: 'Lenoir paid their order', detail: 'CMD-2048 payment received in the fixture.', severity: 'success', explanation: 'Why you: this client belongs to your portfolio.', timestamp: '2026-10-09T07:30:00Z' },
    { id: 'stock', title: 'One motor is missing', detail: 'Check stock before assigning the order.', severity: 'danger', explanation: 'Why you: an order at your agency is affected.' },
  ];
  const entries = [{ timestamp: '2026-10-09T07:58:00Z', actor: 'Fil', action: 'Read morning briefing fixture', outcome: 'read', reference: 'Demo only' }];
  find('audit').entries = entries;
  const table = find('orders');
  table.setAttribute('columns', JSON.stringify([{ key: 'reference', label: 'Order', sortable: true }, { key: 'client', label: 'Client', sortable: true }, { key: 'agency', label: 'Agency' }, { key: 'status', label: 'Status', sortable: true }, { key: 'amount', label: 'Amount' }]));
  table.data = [
    { reference: 'CMD-2048', client: 'Lenoir', agency: 'Paris', status: 'Stock risk', amount: '1 240 €' },
    { reference: 'CMD-2049', client: 'Martin', agency: 'Lyon', status: 'Ready', amount: '680 €' },
    { reference: 'CMD-2050', client: 'Durand', agency: 'Paris', status: 'Ready', amount: '2 150 €' },
    { reference: 'CMD-2051', client: 'Petit', agency: 'Paris', status: 'Ready', amount: '940 €' },
  ];
  const addEntry = outcome => {
    entries.unshift({ timestamp: new Date().toISOString(), actor: 'Camille', action: 'Assignment simulation', outcome, reference: 'CMD-2048' });
    find('audit').entries = [...entries];
  };
  preview.addEventListener('confirm', async () => {
    preview.state = 'pending';
    await new Promise(resolve => setTimeout(resolve, 450));
    const failed = find('failure').checked;
    preview.state = failed ? 'error' : 'confirmed';
    preview.setAttribute('result', failed ? 'Simulated failure. Retry or cancel.' : 'Simulation confirmed. No business data changed.');
    addEntry(failed ? 'error' : 'confirmed');
    status(failed ? 'Simulation failed.' : 'Simulation confirmed.');
  });
  preview.addEventListener('cancel', () => { preview.state = 'cancelled'; addEntry('cancelled'); status('Simulation cancelled.'); });
  find('reset').addEventListener('click', () => { preview.removeAttribute('result'); preview.state = 'preview'; status('Preview reset.'); });
  find('error-preview').addEventListener('confirm', event => { event.currentTarget.state = 'preview'; });
  find('error-preview').addEventListener('cancel', event => { event.currentTarget.state = 'cancelled'; });
  host.addEventListener('suggestion-select', event => { composer.value = event.detail.value; composer.focus(); });
  const submitMessage = async text => {
    if (composer.pending) return;
    composer.pending = true;
    const user = document.createElement('tblr-message'); user.setAttribute('message-role', 'user'); user.author = 'Camille'; user.textContent = text; find('thread').append(user);
    await new Promise(resolve => setTimeout(resolve, 250));
    const reply = document.createElement('tblr-message'); reply.author = 'Fil'; reply.textContent = 'This fixture response proposes reviewing CMD-2048. Use the action preview to confirm or cancel the simulation.'; find('thread').append(reply);
    composer.pending = false;
    composer.value = '';
    composer.focus();
    status('Fixture response added. No business action executed.');
  };
  composer.addEventListener('message-submit', event => submitMessage(event.detail.text));
  find('command').addEventListener('command-submit', event => { submitMessage(event.detail.text); find('command').value = ''; });
  find('story').addEventListener('notification-select', event => status(`Selected notification: ${event.detail.item.title}`));
  find('notification-action').addEventListener('click', () => status('Payment reviewed in the fixture.'));
  find('audit').addEventListener('export-request', event => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(event.detail.entries, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'simulation-audit.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status('Simulation audit exported.');
  });
  host.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
    const target = button.dataset.view === 'briefing' ? host.querySelector('.demo-workspace') : find(button.dataset.view);
    shell.navigationOpen = false;
    target.scrollIntoView({ block: 'start' });
  }));
  if (host.dataset.workspaceDemo === 'admin' && innerWidth > 1100) shell.asideOpen = true;
  host.dataset.demoReady = 'true';
}

await Promise.all([...document.querySelectorAll('[data-workspace-demo]')].map(mountWorkspaceDemo));
