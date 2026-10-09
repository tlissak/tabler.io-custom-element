import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.TBLR_PLAYWRIGHT_PATH || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const port = 19000 + Math.floor(Math.random() * 1000);
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['server.js'], { cwd: root, env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', LIVE_RELOAD: '0' }, stdio: 'pipe', windowsHide: true });
let serverError;
server.on('error', error => { serverError = error; });
let browser;
const names = ['app-shell', 'command-bar', 'composer', 'message', 'action-preview', 'stat', 'suggestion', 'source-list', 'notification-story', 'audit-log', 'avatar'];
try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (serverError) throw serverError;
    try { ready = (await fetch(`${origin}/tests/ui-elements.fixture.html`)).ok; } catch {}
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'Local test server started');
  browser = await chromium.launch({ headless: true, ...(process.env.TBLR_CHROMIUM_PATH ? { executablePath: process.env.TBLR_CHROMIUM_PATH } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}/tests/ui-elements.fixture.html`);
  await page.waitForFunction(() => window.fixtureReady && !document.querySelector('[data-tblr-loading]'));
  assert.equal(await page.locator('#composer textarea').inputValue(), 'Before upgrade');
  assert.equal(await page.locator('#command input').inputValue(), 'Pre-upgrade command');
  assert.equal(await page.locator('#stat').evaluate(element => element.shadowRoot.querySelector('.value').textContent), '3');
  assert.equal(await page.locator('#sources').evaluate(element => element.sources.length), 2);
  assert.equal(await page.locator('#sources a').count(), 1);
  assert.equal(await page.locator('#sources img, #story script').count(), 0);
  assert.equal(await page.locator('#message').evaluate(element => element.shadowRoot.querySelector('header img')), null);
  assert.match(await page.locator('#message').evaluate(element => element.shadowRoot.querySelector('b').textContent), /<img/);
  await page.waitForFunction(() => document.querySelector('#avatar').shadowRoot.querySelector('img').hidden);
  assert.equal(await page.locator('#avatar').evaluate(element => element.shadowRoot.querySelector('.initials').textContent), 'CM');

  // Intent events cross the shadow boundary and guard duplicate confirmation.
  await page.evaluate(() => {
    window.events = { confirm: 0, cancel: 0, messages: [], suggestions: [], selected: [], exports: 0 };
    const fixture = document.querySelector('#fixture');
    fixture.addEventListener('confirm', () => window.events.confirm++);
    fixture.addEventListener('cancel', () => window.events.cancel++);
    fixture.addEventListener('message-submit', event => { window.events.messages.push(event.detail.text); document.querySelector('#composer').pending = true; });
    fixture.addEventListener('suggestion-select', event => window.events.suggestions.push(event.detail.value));
    fixture.addEventListener('notification-select', event => window.events.selected.push(event.detail.id));
    fixture.addEventListener('export-request', () => window.events.exports++);
  });
  await page.locator('#preview').getByRole('button', { name: 'Confirm', exact: true }).click();
  await page.locator('#preview').evaluate(element => element.shadowRoot.querySelector('[part="confirm"]').click());
  assert.equal(await page.evaluate(() => window.events.confirm), 1);
  await page.locator('#preview').evaluate(element => { element.state = 'error'; });
  await page.locator('#preview').getByRole('button', { name: 'Retry' }).click();
  assert.equal(await page.evaluate(() => window.events.confirm), 2);
  await page.locator('#preview').evaluate(element => { element.state = 'preview'; element.addEventListener('cancel', event => event.preventDefault(), { once: true }); });
  await page.locator('#preview').getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.equal(await page.locator('#preview').getByRole('button', { name: 'Confirm', exact: true }).isEnabled(), true);
  await page.locator('#preview').evaluate(element => { element.state = 'pending'; });
  assert.equal(await page.locator('#preview button').first().isDisabled(), true);
  await page.locator('#preview').evaluate(element => { element.state = 'preview'; });

  await page.locator('#suggestion').getByRole('button').focus();
  await page.keyboard.press('Enter');
  assert.deepEqual(await page.evaluate(() => window.events.suggestions), ['CMD-2048']);
  await page.locator('#suggestion').evaluate(element => { element.disabled = true; element.shadowRoot.querySelector('button').click(); });
  assert.equal(await page.evaluate(() => window.events.suggestions.length), 1);
  await page.locator('#story').getByRole('button').click();
  assert.deepEqual(await page.evaluate(() => window.events.selected), ['stock']);
  await page.locator('#audit input').fill('CMD-2049');
  assert.equal(await page.locator('#audit li').count(), 1);
  await page.locator('#audit').getByRole('button', { name: 'Export' }).click();
  assert.equal(await page.evaluate(() => window.events.exports), 1);

  const textarea = page.locator('#composer textarea');
  await textarea.fill('Hello');
  await textarea.press('Shift+Enter');
  assert.equal(await textarea.inputValue(), 'Hello\n');
  await textarea.press('Enter');
  assert.deepEqual(await page.evaluate(() => window.events.messages), ['Hello']);
  await page.locator('#composer').evaluate(element => element.submit());
  assert.equal(await page.evaluate(() => window.events.messages.length), 1);
  await page.locator('#composer').evaluate(element => { const input = element.input; element.pending = false; element.value = 'Still composing'; window.stableInput = input === element.input; element.input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true })); });
  assert.equal(await page.evaluate(() => window.stableInput), true);
  assert.equal(await page.evaluate(() => window.events.messages.length), 1);

  await page.keyboard.press('Control+k');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'command');
  await page.locator('#command').evaluate(element => { element.disabled = true; });
  await page.keyboard.press('Control+k');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'second-command');
  await page.locator('#command').evaluate(element => element.remove());
  await page.locator('#second-command').evaluate(element => element.remove());
  assert.equal(await page.evaluate(() => { const event = new KeyboardEvent('keydown', {key:'k',ctrlKey:true,cancelable:true}); document.dispatchEvent(event); return event.defaultPrevented; }), false);

  const shell = page.locator('#shell');
  await shell.evaluate(element => { element.shadowRoot.querySelector('main').scrollTop = 100; });
  await shell.getByRole('button', { name: 'Collapse navigation' }).click();
  assert.equal(await shell.evaluate(element => element.collapsed), true);
  assert.equal(await shell.evaluate(element => element.shadowRoot.querySelector('main').scrollTop), 100);
  await page.setViewportSize({ width: 390, height: 900 });
  await shell.getByRole('button', { name: 'Open navigation', exact: true }).click();
  assert.equal(await shell.evaluate(element => element.shadowRoot.querySelector('[part="navigation-dialog"]').matches(':modal')), true);
  await page.keyboard.press('Escape');
  assert.equal(await shell.evaluate(element => element.navigationOpen), false);
  assert.equal(await shell.evaluate(element => element.shadowRoot.activeElement?.getAttribute('part')), 'navigation-toggle');
  await shell.getByRole('button', { name: 'Open updates' }).click();
  await shell.getByRole('button', { name: 'Close updates', exact: true }).last().click();
  assert.equal(await shell.evaluate(element => element.asideOpen), false);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);

  // Dynamic autoload and live/scoped theme inheritance.
  await page.evaluate(() => { const container = document.createElement('div'); container.id = 'dynamic'; container.dataset.tblrTheme = 'admin'; container.innerHTML = '<tblr-stat label="Dynamic" value="42"></tblr-stat>'; document.body.append(container); delete document.documentElement.dataset.tblrTheme; });
  await page.waitForFunction(() => document.querySelector('#dynamic tblr-stat').shadowRoot?.querySelector('section'));
  assert.equal(await page.locator('#dynamic tblr-stat').evaluate(element => getComputedStyle(element.shadowRoot.querySelector('section')).boxShadow), 'none');
  assert.notEqual(await page.locator('#stat').evaluate(element => getComputedStyle(element.shadowRoot.querySelector('section')).boxShadow), 'none');
  await page.evaluate(() => { document.documentElement.dataset.tblrTheme = 'admin'; });
  assert.equal(await page.locator('#stat').evaluate(element => getComputedStyle(element.shadowRoot.querySelector('section')).boxShadow), 'none');

  // Both requested example pages contain all eleven new elements and a complete workflow.
  for (const file of ['admin-theme.html', 'index.html']) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${origin}/examples/${file}`);
    await page.waitForSelector('[data-demo-ready="true"]');
    if (file === 'index.html') {
      await page.waitForFunction(() => document.documentElement.dataset.catalogElementsReady === 'true');
      for (const name of names) {
        assert.ok(await page.locator(`#${name} tblr-${name}`).count(), `Individual ${name} example`);
        assert.ok(await page.locator(`.sidebar tblr-nav-item[href="#${name}"]`).count(), `Navigation to ${name}`);
      }
      await page.locator('#catalog-command input').fill('Show ready orders');
      await page.locator('#catalog-command input').press('Enter');
      assert.match(await page.locator('#catalog-command-result').textContent(), /Show ready orders/);
      await page.locator('#catalog-composer').getByRole('button', { name: 'Summarize orders' }).click();
      await page.locator('#catalog-composer').getByRole('button', { name: 'Send', exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('#catalog-composer').pending);
      assert.match(await page.locator('#catalog-composer-result').textContent(), /Message submitted: Summarize orders/);
      await page.locator('#catalog-preview').getByRole('button', { name: 'Confirm', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('#catalog-preview').state === 'confirmed');
      await page.locator('#catalog-preview-reset').click();
      await page.locator('#catalog-preview').getByRole('button', { name: 'Cancel', exact: true }).click();
      assert.equal(await page.locator('#catalog-preview').evaluate(element => element.state), 'cancelled');
      await page.locator('#catalog-suggestion').getByRole('button').click();
      assert.match(await page.locator('#catalog-suggestion-result').textContent(), /Review CMD-2048/);
      await page.locator('#catalog-story').getByRole('button', { name: 'Payment received', exact: true }).click();
      assert.match(await page.locator('#catalog-story-result').textContent(), /Payment received/);
      await page.locator('#catalog-audit input').fill('CMD-2049');
      assert.equal(await page.locator('#catalog-audit li').count(), 1);
      const download = page.waitForEvent('download');
      await page.locator('#catalog-audit').getByRole('button', { name: 'Export', exact: true }).click();
      assert.equal((await download).suggestedFilename(), 'catalog-audit-fixture.json');
    }
    const demo = page.locator('[data-workspace-demo]');
    for (const name of names) assert.ok(await demo.locator(`tblr-${name}`).count(), `${file}: ${name}`);
    const preview = demo.locator('[data-demo="preview"]');
    await preview.getByRole('button', {name:'Confirm',exact:true}).click();
    await page.waitForFunction(() => document.querySelector('[data-demo="preview"]').state === 'confirmed');
    assert.equal(await demo.locator('[data-demo="audit"]').evaluate(element => element.entries[0].outcome), 'confirmed');
    await demo.locator('[data-demo="reset"]').click();
    await demo.locator('[data-demo="failure"]').click();
    await preview.getByRole('button', {name:'Confirm',exact:true}).click();
    await page.waitForFunction(() => document.querySelector('[data-demo="preview"]').state === 'error');
    await preview.getByRole('button', {name:'Cancel',exact:true}).click();
    assert.equal(await preview.evaluate(element => element.state), 'cancelled');
    await demo.locator('tblr-suggestion').first().click();
    const composer = demo.locator('[data-demo="composer"]');
    assert.equal(await composer.evaluate(element => element.value), 'Review CMD-2048');
    await composer.getByRole('button', {name:'Send',exact:true}).click();
    await page.waitForFunction(() => !document.querySelector('[data-demo="composer"]').pending);
    assert.equal(await demo.locator('[data-demo="thread"] tblr-message').count(), 2);
    await page.setViewportSize({ width: 390, height: 900 });
    assert.equal(await demo.evaluate(element => element.getBoundingClientRect().width <= innerWidth), true, `${file}: mobile demo fits`);
    await demo.locator('tblr-app-shell').getByRole('button', {name:'Open navigation',exact:true}).click();
    await page.keyboard.press('Escape');
  }
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log('PASS: all 11 elements; hydration, escaping, events, duplicate guards, keyboard, dialogs, themes, mobile, and both example workflows.');
} finally {
  await browser?.close();
  server.kill();
}
