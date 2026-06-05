import { chromium } from 'playwright';

const BASE = 'https://imperium-infra-site.vercel.app';

let results = { pass: 0, fail: 0, errors: [] };

async function test(name, fn) {
  try {
    await fn();
    results.pass++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    results.fail++;
    results.errors.push({ name, message: e.message });
    console.log(`  ✗ ${name}: ${e.message}`);
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('pageerror', err => console.log('  [PAGE ERROR]', err.message));

  // ===== CHATBOT WIDGET PRESENCE =====
  await test('Chat panel opens automatically on homepage', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.locator('#ichat-panel.open').waitFor({ state: 'visible', timeout: 3000 });
    const open = await page.locator('#ichat-panel').evaluate(el => el.classList.contains('open'));
    if (!open) throw new Error('Panel did not open');
  });

  await test('Chat header shows correct branding', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const title = await page.locator('#ichat-title').textContent();
    if (!title.includes('Imperium Assistant')) throw new Error('Wrong title: ' + title);
    const status = await page.locator('#ichat-status').textContent();
    if (!status.includes('Online')) throw new Error('Wrong status: ' + status);
  });

  await test('Greeting message and 3 quick replies appear', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const msgCount = await page.locator('.ichat-msg').count();
    if (msgCount === 0) throw new Error('No bot messages rendered');
    const firstMsg = await page.locator('.ichat-msg').first().textContent();
    if (!firstMsg.includes('Imperium Infrastructure Partners')) throw new Error('Wrong greeting: ' + firstMsg);
    const qrCount = await page.locator('.ichat-qr-btn').count();
    if (qrCount !== 3) throw new Error('Expected 3 quick replies, got ' + qrCount);
  });

  await test('Close button hides widget', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.locator('#ichat-close').click();
    await page.waitForTimeout(300);
    const hasClosed = await page.locator('#imperium-chat-widget').evaluate(el => el.classList.contains('closed'));
    if (!hasClosed) throw new Error('Widget not marked as closed');
  });

  await test('Minimize/reopen cycle works', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    // Minimize
    await page.locator('#ichat-minimize').click();
    await page.waitForTimeout(300);
    const bubble = await page.locator('#ichat-bubble').isVisible();
    if (!bubble) throw new Error('Bubble not visible after minimize');
    const panelHidden = await page.locator('#ichat-panel.open').isVisible();
    if (panelHidden) throw new Error('Panel still open after minimize');
    // Reopen
    await page.locator('#ichat-bubble').click();
    await page.waitForTimeout(500);
    const reopened = await page.locator('#ichat-panel.open').isVisible();
    if (!reopened) throw new Error('Panel did not reopen');
  });

  // ===== MAINTENANCE SERVICES FLOW =====
  async function clickQR(page, text) {
    const btn = page.locator('.ichat-qr-btn', { hasText: text });
    await btn.waitFor({ state: 'visible', timeout: 5000 });
    await btn.click();
  }

  async function typeAndSend(page, text) {
    await page.locator('#ichat-input').waitFor({ state: 'visible', timeout: 3000 });
    await page.locator('#ichat-input').fill(text);
    await page.locator('#ichat-send').click();
  }

  async function waitForBotReply(page) {
    // Wait for typing indicator to appear and then disappear
    for (let i = 0; i < 20; i++) {
      const display = await page.locator('#ichat-typing').evaluate(el => el.style.display).catch(() => 'none');
      if (display === 'flex') break;
      await page.waitForTimeout(100);
    }
    for (let i = 0; i < 30; i++) {
      const display = await page.locator('#ichat-typing').evaluate(el => el.style.display).catch(() => 'none');
      if (display === 'none' || display === '') {
        await page.waitForTimeout(200);
        return;
      }
      await page.waitForTimeout(150);
    }
  }

  async function waitForNewQR(page, minCount) {
    await page.waitForTimeout(500);
    for (let i = 0; i < 20; i++) {
      const count = await page.locator('.ichat-qr-btn').count();
      if (count >= minCount) return count;
      await page.waitForTimeout(250);
    }
    return await page.locator('.ichat-qr-btn').count();
  }

  await test('Maintenance flow - intent selection shows property options', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await clickQR(page, 'Maintenance');
    await waitForBotReply(page);
    const count = await waitForNewQR(page, 4);
    if (count < 4) throw new Error('Expected property options, got ' + count);
    const lastMsg = await page.locator('.ichat-msg').last().textContent();
    if (!lastMsg.toLowerCase().includes('property')) throw new Error('Bot should ask about property: ' + lastMsg);
  });

  await test('Maintenance flow - property selection shows service options', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await clickQR(page, 'Maintenance');
    await waitForBotReply(page);
    await waitForNewQR(page, 4);
    await clickQR(page, 'Commercial');
    await waitForBotReply(page);
    const count = await waitForNewQR(page, 4);
    if (count < 4) throw new Error('Expected service options, got ' + count);
    const lastMsg = await page.locator('.ichat-msg').last().textContent();
    if (!lastMsg.toLowerCase().includes('service')) throw new Error('Bot should ask about services: ' + lastMsg);
  });

  await test('Maintenance flow - service selection asks for name', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await clickQR(page, 'Maintenance');
    await waitForBotReply(page);
    await waitForNewQR(page, 4);
    await clickQR(page, 'Office');
    await waitForBotReply(page);
    await waitForNewQR(page, 4);
    await clickQR(page, 'Painting');
    await waitForBotReply(page);
    await typeAndSend(page, 'Test User');
    await waitForBotReply(page);
    const lastMsg = await page.locator('.ichat-msg').last().textContent();
    if (!lastMsg.toLowerCase().includes('email')) throw new Error('Bot should ask for email: ' + lastMsg);
  });

  await test('Maintenance flow - full lead collection through schedule', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await clickQR(page, 'Maintenance');
    await waitForBotReply(page);
    await waitForNewQR(page, 4);
    await clickQR(page, 'Retail');
    await waitForBotReply(page);
    await waitForNewQR(page, 4);
    await clickQR(page, 'HVAC');
    await waitForBotReply(page);
    await typeAndSend(page, 'Jane Test');
    await waitForBotReply(page);
    await typeAndSend(page, 'jane@test.com');
    await waitForBotReply(page);
    await typeAndSend(page, '404-555-1234');
    await waitForBotReply(page);
    const qrCount = await waitForNewQR(page, 1);
    if (qrCount === 0) throw new Error('No schedule options after lead collection');
    const lastMsg = await page.locator('.ichat-msg').last().textContent();
    if (!lastMsg.toLowerCase().includes('call') && !lastMsg.toLowerCase().includes('schedule')) {
      throw new Error('Should offer scheduling: ' + lastMsg);
    }
  });

  await test('Maintenance flow - schedule a call completes', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await clickQR(page, 'Maintenance');
    await waitForBotReply(page);
    await waitForNewQR(page, 4);
    await clickQR(page, 'Industrial');
    await waitForBotReply(page);
    await waitForNewQR(page, 4);
    await clickQR(page, 'Parking');
    await waitForBotReply(page);
    await typeAndSend(page, 'Bob Test');
    await waitForBotReply(page);
    await typeAndSend(page, 'bob@test.com');
    await waitForBotReply(page);
    await typeAndSend(page, '555-0100');
    await waitForBotReply(page);
    const scheduleBtn = page.locator('.ichat-qr-btn', { hasText: 'Schedule' });
    if (await scheduleBtn.isVisible().catch(() => false)) {
      await scheduleBtn.click();
      await waitForBotReply(page);
      await typeAndSend(page, 'tomorrow');
      await waitForBotReply(page);
      await clickQR(page, 'Morning');
      await waitForBotReply(page);
      const finalMsg = await page.locator('.ichat-msg').last().textContent();
      if (!finalMsg.toLowerCase().includes('reach out') && !finalMsg.toLowerCase().includes('confirm')) {
        throw new Error('No confirmation: ' + finalMsg);
      }
    }
  });

  // ===== PARTNER FLOW =====
  await test('Partner intent shows relevant response', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.locator('.ichat-qr-btn', { hasText: 'Become a Partner' }).click();
    await page.waitForTimeout(1500);
    const lastMsg = await page.locator('.ichat-msg').last().textContent();
    if (!lastMsg.toLowerCase().includes('vendor') && !lastMsg.toLowerCase().includes('partner')) {
      throw new Error('Partner reply wrong: ' + lastMsg);
    }
    const qrOpts = await page.locator('.ichat-qr-btn').allTextContents();
    const hasForm = qrOpts.some(t => t.includes('Form'));
    if (!hasForm) throw new Error('Partner flow missing form option: ' + JSON.stringify(qrOpts));
  });

  // ===== QUESTION FLOW =====
  await test('Question flow asks for contact info', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.locator('.ichat-qr-btn', { hasText: 'I Have a Question' }).click();
    await page.waitForTimeout(1500);
    const input = page.locator('#ichat-input');
    await input.fill('What areas do you serve?');
    await page.locator('#ichat-send').click();
    await page.waitForTimeout(1500);
    const lastMsg = await page.locator('.ichat-msg').last().textContent();
    if (!lastMsg.toLowerCase().includes('name') && !lastMsg.toLowerCase().includes('share')) {
      throw new Error('Should ask for name: ' + lastMsg);
    }
  });

  // ===== CHATBOT ON VENDOR PAGE =====
  await test('Chatbot loads on vendor prequalification page', async () => {
    await page.goto(BASE + '/vendor-prequalification.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.locator('#ichat-panel.open').waitFor({ state: 'visible', timeout: 4000 });
    const title = await page.locator('#ichat-title').textContent();
    if (!title.includes('Imperium Assistant')) throw new Error('Wrong title: ' + title);
  });

  await test('Chatbot greeting on vendor page mentions partnership', async () => {
    await page.goto(BASE + '/vendor-prequalification.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const firstMsg = await page.locator('.ichat-msg').first().textContent();
    if (!firstMsg.toLowerCase().includes('vendor') && !firstMsg.toLowerCase().includes('partner')) {
      throw new Error('Vendor page should mention partnership: ' + firstMsg);
    }
  });

  // ===== CHATBOT ON PARTNER PAGE =====
  await test('Chatbot loads on partner assessment page', async () => {
    await page.goto(BASE + '/partner-assessment.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.locator('#ichat-panel.open').waitFor({ state: 'visible', timeout: 4000 });
    const ok = await page.locator('#ichat-panel.open').isVisible();
    if (!ok) throw new Error('Chat panel not open on partner page');
  });

  // ===== EXIT INTENT =====
  await test('Exit intent reopens minimized chat', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.locator('#ichat-minimize').click();
    await page.waitForTimeout(300);
    // Simulate mouse leaving viewport
    await page.evaluate(() => {
      document.dispatchEvent(new MouseEvent('mouseleave', { clientY: -1, clientX: 500 }));
    });
    await page.waitForTimeout(500);
    const reopened = await page.locator('#ichat-panel.open').isVisible();
    if (!reopened) throw new Error('Panel did not reopen on exit intent');
  });

  await browser.close();

  console.log('\n═══════════════════════════════');
  console.log(`  Chatbot Tests: ${results.pass} passed, ${results.fail} failed`);
  if (results.errors.length > 0) {
    console.log('  Failures:');
    for (const err of results.errors) {
      console.log(`    - ${err.name}: ${err.message}`);
    }
  }
  console.log('═══════════════════════════════\n');
  process.exit(results.fail > 0 ? 1 : 0);
}

run();
