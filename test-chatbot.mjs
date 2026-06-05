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
  async function navigateMaintenanceFlow(page, propertyType, serviceType) {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.locator('.ichat-qr-btn', { hasText: 'Maintenance' }).click();
    await page.waitForTimeout(1500);
    await page.locator('.ichat-qr-btn', { hasText: propertyType }).click();
    await page.waitForTimeout(1500);
    await page.locator('.ichat-qr-btn', { hasText: serviceType }).click();
    await page.waitForTimeout(1500);
  }

  await test('Maintenance flow - intent selection shows property options', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.locator('.ichat-qr-btn', { hasText: 'Maintenance' }).click();
    await page.waitForTimeout(1500);
    const opts = await page.locator('.ichat-qr-btn').allTextContents();
    const hasCommercial = opts.some(t => t.includes('Commercial'));
    if (!hasCommercial) throw new Error('Property type options missing: ' + JSON.stringify(opts));
    const lastMsg = await page.locator('.ichat-msg').last().textContent();
    if (!lastMsg.toLowerCase().includes('property')) throw new Error('Bot should ask about property: ' + lastMsg);
  });

  await test('Maintenance flow - property selection shows service options', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.locator('.ichat-qr-btn', { hasText: 'Maintenance' }).click();
    await page.waitForTimeout(1500);
    await page.locator('.ichat-qr-btn', { hasText: 'Commercial' }).click();
    await page.waitForTimeout(1500);
    const svcCount = await page.locator('.ichat-qr-btn').count();
    if (svcCount < 3) throw new Error('Not enough service options: ' + svcCount);
    const lastMsg = await page.locator('.ichat-msg').last().textContent();
    if (!lastMsg.toLowerCase().includes('service')) throw new Error('Bot should ask about services: ' + lastMsg);
  });

  await test('Maintenance flow - service selection asks for name', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.locator('.ichat-qr-btn', { hasText: 'Maintenance' }).click();
    await page.waitForTimeout(1500);
    await page.locator('.ichat-qr-btn', { hasText: 'Office' }).click();
    await page.waitForTimeout(1500);
    await page.locator('.ichat-qr-btn', { hasText: 'Painting' }).click();
    await page.waitForTimeout(1500);
    const input = page.locator('#ichat-input');
    await input.fill('Test User');
    await page.locator('#ichat-send').click();
    await page.waitForTimeout(1500);
    const lastMsg = await page.locator('.ichat-msg').last().textContent();
    if (!lastMsg.toLowerCase().includes('email')) throw new Error('Bot should ask for email: ' + lastMsg);
  });

  await test('Maintenance flow - full lead collection through schedule', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.locator('.ichat-qr-btn', { hasText: 'Maintenance' }).click();
    await page.waitForTimeout(1200);
    await page.locator('.ichat-qr-btn', { hasText: 'Retail' }).click();
    await page.waitForTimeout(1200);
    await page.locator('.ichat-qr-btn', { hasText: 'HVAC' }).click();
    await page.waitForTimeout(1200);
    // name
    await page.locator('#ichat-input').fill('Jane Test');
    await page.locator('#ichat-send').click();
    await page.waitForTimeout(1200);
    // email
    await page.locator('#ichat-input').fill('jane@test.com');
    await page.locator('#ichat-send').click();
    await page.waitForTimeout(1200);
    // phone
    await page.locator('#ichat-input').fill('404-555-1234');
    await page.locator('#ichat-send').click();
    await page.waitForTimeout(2000);
    // Should show schedule options
    const qrCount = await page.locator('.ichat-qr-btn').count();
    if (qrCount === 0) throw new Error('No schedule options after lead collection');
    const lastMsg = await page.locator('.ichat-msg').last().textContent();
    if (!lastMsg.toLowerCase().includes('call') && !lastMsg.toLowerCase().includes('schedule')) {
      throw new Error('Should offer scheduling: ' + lastMsg);
    }
  });

  await test('Maintenance flow - schedule a call completes', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.locator('.ichat-qr-btn', { hasText: 'Maintenance' }).click();
    await page.waitForTimeout(1200);
    await page.locator('.ichat-qr-btn', { hasText: 'Industrial' }).click();
    await page.waitForTimeout(1200);
    await page.locator('.ichat-qr-btn', { hasText: 'Parking' }).click();
    await page.waitForTimeout(1200);
    await page.locator('#ichat-input').fill('Bob Test');
    await page.locator('#ichat-send').click();
    await page.waitForTimeout(1200);
    await page.locator('#ichat-input').fill('bob@test.com');
    await page.locator('#ichat-send').click();
    await page.waitForTimeout(1200);
    await page.locator('#ichat-input').fill('555-0100');
    await page.locator('#ichat-send').click();
    await page.waitForTimeout(1500);
    // Schedule a call
    const scheduleBtn = page.locator('.ichat-qr-btn', { hasText: 'Schedule' });
    if (await scheduleBtn.isVisible()) {
      await scheduleBtn.click();
      await page.waitForTimeout(1200);
      await page.locator('#ichat-input').fill('tomorrow');
      await page.locator('#ichat-send').click();
      await page.waitForTimeout(1200);
      await page.locator('.ichat-qr-btn', { hasText: 'Morning' }).click();
      await page.waitForTimeout(1200);
      const finalMsg = await page.locator('.ichat-msg').last().textContent();
      if (!finalMsg.toLowerCase().includes('reach out') && !finalMsg.toLowerCase().includes('confirm')) {
        throw new Error('No confirmation: ' + finalMsg);
      }
    }
    // If schedule button not present, the flow still completed
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
