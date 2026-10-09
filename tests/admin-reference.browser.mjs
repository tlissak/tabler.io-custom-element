import assert from 'node:assert/strict';

export async function testAdminReference(page, origin) {
  const screens = { index: 0, direction: 1, vente: 1, preparation: 0, technicien: 0, 'file-preparation': 5, 'parc-machines': 1, paiements: 2, notifications: 3 };
  const failures = [];
  const onResponse = response => { if (response.status() >= 400 && response.url().includes('/examples/admin-theme/')) failures.push(response.url()); };
  page.on('response', onResponse);
  const visit = async name => {
    await page.goto(`${origin}/examples/admin-theme/${name}.html`);
    await page.waitForFunction(() => document.documentElement.dataset.adminReady === 'true');
  };
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${origin}/examples/admin-theme.html`);
  await page.waitForURL('**/admin-theme/index.html');
  for (const [name, tableCount] of Object.entries(screens)) {
    await visit(name);
    assert.equal(await page.locator('tblr-app-shell').count(), 1, `${name}: shared shell`);
    assert.equal(await page.locator('tblr-data-table[authored] table').count(), tableCount, `${name}: reference tables`);
    assert.equal(await page.evaluate(() => document.querySelectorAll('button, select, textarea, input').length), 0, `${name}: controls use custom elements`);
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('tblr-checkbox')].every(item => !item.children.length)), true, `${name}: valid authored checkbox markup`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${name}: desktop fits`);
    assert.ok(await page.locator('.rail tblr-nav-item').count() >= 10);
    if (name !== 'index') {
      const geometry = await page.locator('tblr-app-shell').evaluate(shell => {
        const size = part => Math.round(shell.shadowRoot.querySelector(`[part="${part}"]`).getBoundingClientRect().width);
        return [size('navigation'), size('aside')];
      });
      assert.deepEqual(geometry, [240, 340], `${name}: reference columns`);
    }
    await page.setViewportSize({ width: 390, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${name}: mobile fits`);
    await page.locator('tblr-app-shell').getByRole('button', { name: 'Open navigation', exact: true }).click();
    assert.equal(await page.locator('tblr-app-shell').evaluate(shell => shell.shadowRoot.querySelector('[part="navigation-dialog"]').matches(':modal')), true);
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  await visit('direction');
  assert.ok(await page.locator('svg rect').count() >= 12, 'Revenue chart preserves twelve months');
  assert.match(await page.locator('tblr-stat').first().getAttribute('value'), /452 500/);
  await page.keyboard.press('Control+k');
  assert.equal(await page.evaluate(() => document.activeElement.tagName), 'TBLR-COMMAND-BAR');

  await visit('vente');
  const opener = page.locator('[data-confirm="c-lenoir-relance"]');
  const preview = page.locator('#c-lenoir-relance');
  await opener.click();
  assert.equal(await preview.evaluate(item => item.hidden), false);
  await preview.locator('[part="cancel"]').click();
  assert.equal(await preview.evaluate(item => item.state), 'cancelled');
  assert.equal(await opener.evaluate(item => item.disabled), false);
  await opener.click();
  await preview.locator('[part="confirm"]').click();
  await page.waitForFunction(() => document.querySelector('#c-lenoir-relance').state === 'confirmed');
  assert.equal(await opener.evaluate(item => item.disabled), true);
  assert.equal(await page.locator('tblr-audit-log').evaluate(item => item.entries[0].outcome), 'confirmed');
  const composer = page.locator('tblr-composer');
  await composer.locator('textarea').fill('<img src=x onerror=alert(1)>');
  await composer.getByRole('button', { name: 'Envoyer', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('tblr-composer').pending);
  assert.match(await page.locator('tblr-message[message-role="user"]').last().textContent(), /<img/);
  assert.equal(await page.evaluate(() => document.querySelectorAll('tblr-message img').length), 0, 'Free requests remain text');

  await visit('notifications');
  assert.equal(await page.locator('#journal-table [data-simulated]').count(), 3, 'Journal persists across routes');
  await page.locator('[data-filter="no"]').click();
  assert.equal(await page.locator('#journal-table tr[data-simulated]:not([hidden])').count(), 1);
  await page.locator('[data-filter="all"]').click();
  const markRead = page.locator('tblr-button[title="Marquer lu"]').first();
  if (await markRead.count()) {
    await markRead.evaluate(item => { item.id = 'read-test'; });
    await markRead.click();
    assert.equal(await page.locator('#read-test').evaluate(item => item.disabled), true);
  }
  await visit('paiements');
  const draftBoxes = page.locator('.pick-draft');
  assert.equal(await draftBoxes.count(), 3);
  for (let index = 0; index < 3; index++) await draftBoxes.nth(index).locator('label').click();
  assert.equal(await page.locator('#n-drafts').textContent(), '0');
  assert.equal(await page.locator('[data-confirm="c-batch"]').evaluate(item => item.disabled), true);
  await draftBoxes.first().locator('label').click();
  assert.equal(await page.locator('#n-drafts').textContent(), '1');
  assert.equal(await page.locator('[data-confirm="c-batch"]').evaluate(item => item.disabled), false);
  const selectAll = page.locator('#all label');
  await selectAll.click();
  assert.equal(await page.locator('.pick-fac').evaluateAll(items => items.every(item => item.checked)), true);
  await selectAll.click();
  assert.equal(await page.locator('.pick-fac').evaluateAll(items => items.every(item => !item.checked)), true);
  page.off('response', onResponse);
  assert.deepEqual(failures, [], 'All local theme assets load');
}
