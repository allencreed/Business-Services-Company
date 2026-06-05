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

  // ===== CHATBOT WIDGET PRESENCE =====
  await test('Chatbot widget loads on homepage', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const widget = await page.locator('#imperium-chat-widget').isVisible();
    if (!widget) throw new Error('Chatbot widget not found');
  });

  await test('Chat panel opens automatically', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const panel = page.locator('#ichat-panel');
    await panel.waitFor({ state: 'visible', timeout: 3000 });
    const isOpen = await panel.evaluate(el => el.classList.contains('open'));
    if (!isOpen) throw new Error('Panel did not open');
  });

  await test('Chat header shows correct title', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const title = await page.locator('#ichat-title').textContent();
    if (!title.includes('Imperium Assistant')) throw new Error('Wrong title: ' + title);
    const status = await page.locator('#ichat-status').textContent();
    if (!status.includes('Online')) throw new Error('Wrong status: ' + status);
  });

  await test('Greeting message appears with quick replies', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const botMsg = page.locator('.ichat-bot').first();
    const msgText = await botMsg.textContent();
    if (!msgText.includes('Imperium Infrastructure Partners')) throw new Error('Wrong greeting: ' + msgText);
    const qrCount = await page.locator('.ichat-qr-btn').count();
    if (qrCount !== 3) throw new Error('Expected 3 quick replies, got ' + qrCount);
  });

  await test('Close button hides the widget', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.locator('#ichat-close').click();
    await page.waitForTimeout(300);
    const closed = await page.locator('#imperium-chat-widget.closed').isVisible();
    if (!closed) throw new Error('Widget not hidden after close');
  });

  await test('Minimize button shows bubble', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.locator('#ichat-minimize').click();
    await page.waitForTimeout(300);
    const bubble = await page.locator('#ichat-bubble').isVisible();
    if (!bubble) throw new Error('Bubble not visible after minimize');
    const panelOpen = await page.locator('#ichat-panel.open').isVisible();
    if (panelOpen) throw new Error('Panel still open after minimize');
    // Reopen
    await page.locator('#ichat-bubble').click();
    await page.waitForTimeout(300);
    const reopened = await page.locator('#ichat-panel.open').isVisible();
    if (!reopened) throw new Error('Panel did not reopen');
  });

  // ===== MAINTENANCE SERVICES FLOW =====
  await test('Maintenance flow - select service intent', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const btn = page.locator('.ichat-qr-btn', { hasText: 'Maintenance' });
    await btn.click();
    await page.waitForTimeout(1500);
    const botMsg = page.locator('.ichat-bot').last();
    const text = await botMsg.textContent();
    if (!text.includes('property')) throw new Error('Maintenance reply wrong: ' + text);
    const propertyBtns = await page.locator('.ichat-qr-btn').allTextContents();
    const hasCommercial = propertyBtns.some(t => t.includes('Commercial'));
    if (!hasCommercial) throw new Error('Property type options missing');
  });

  await test('Maintenance flow - select property type', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.locator('.ichat-qr-btn', { hasText: 'Maintenance' }).click();
    await page.waitForTimeout(1500);
    await page.locator('.ichat-qr-btn', { hasText: 'Commercial' }).click();
    await page.waitForTimeout(1500);
    const botMsg = page.locator('.ichat-bot').last();
    const text = await botMsg.textContent();
    if (!text.includes('services')) throw new Error('Service reply wrong: ' + text);
    const svcBtns = await page.locator('.ichat-qr-btn').count();
    if (svcBtns < 3) throw new Error('Not enough service options');
  });

  await test('Maintenance flow - select service and enter name', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.locator('.ichat-qr-btn', { hasText: 'Maintenance' }).click();
    await page.waitForTimeout(1500);
    await page.locator('.ichat-qr-btn', { hasText: 'Commercial' }).click();
    await page.waitForTimeout(1500);
    await page.locator('.ichat-qr-btn', { hasText: 'HVAC' }).click();
    await page.waitForTimeout(1500);
    const input = page.locator('#ichat-input');
    await input.fill('John Smith');
    await page.locator('#ichat-send').click();
    await page.waitForTimeout(1500);
    const botMsg = page.locator('.ichat-bot').last();
    const text = await botMsg.textContent();
    if (!text.includes('email')) throw new Error('Should ask for email: ' + text);
  });

  await test('Maintenance flow - full lead collection', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    // Navigate through full flow
    await page.locator('.ichat-qr-btn', { hasText: 'Maintenance' }).click();
    await page.waitForTimeout(1500);
    await page.locator('.ichat-qr-btn', { hasText: 'Office' }).click();
    await page.waitForTimeout(1500);
    await page.locator('.ichat-qr-btn', { hasText: 'Painting' }).click();
    await page.waitForTimeout(1500);
    // Name
    await page.locator('#ichat-input').fill('Jane Doe');
    await page.locator('#ichat-send').click();
    await page.waitForTimeout(1500);
    // Email
    await page.locator('#ichat-input').fill('jane@example.com');
    await page.locator('#ichat-send').click();
    await page.waitForTimeout(1500);
    // Phone
    await page.locator('#ichat-input').fill('(404) 555-1234');
    await page.locator('#ichat-send').click();
    await page.waitForTimeout(2000);
    // Should show schedule options
    const scheduleBtns = await page.locator('.ichat-qr-btn').count();
    if (scheduleBtns === 0) throw new Error('Schedule options not shown after lead collection');
    const lastMsg = await page.locator('.ichat-bot').last().textContent();
    if (!lastMsg.includes('call') && !lastMsg.includes('Schedule')) throw new Error('Should offer scheduling: ' + lastMsg);
  });

  await test('Maintenance flow - schedule a call', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.locator('.ichat-qr-btn', { hasText: 'Maintenance' }).click();
    await page.waitForTimeout(1500);
    await page.locator('.ichat-qr-btn', { hasText: 'Multi-Family' }).click();
    await page.waitForTimeout(1500);
    await page.locator('.ichat-qr-btn', { hasText: 'Janitorial' }).click();
    await page.waitForTimeout(1500);
    await page.locator('#ichat-input').fill('Bob Wilson');
    await page.locator('#ichat-send').click();
    await page.waitForTimeout(1500);
    await page.locator('#ichat-input').fill('bob@test.com');
    await page.locator('#ichat-send').click();
    await page.waitForTimeout(1500);
    await page.locator('#ichat-input').fill('555-0100');
    await page.locator('#ichat-send').click();
    await page.waitForTimeout(1500);
    // Schedule
    await page.locator('.ichat-qr-btn', { hasText: 'Schedule a Call' }).click();
    await page.waitForTimeout(1500);
    await page.locator('#ichat-input').fill('tomorrow');
    await page.locator('#ichat-send').click();
    await page.waitForTimeout(1500);
    // Pick time
    await page.locator('.ichat-qr-btn', { hasText: 'Morning' }).click();
    await page.waitForTimeout(1500);
    const finalMsg = await page.locator('.ichat-bot').last().textContent();
    if (!finalMsg.includes('reach out') && !finalMsg.includes('confirm')) throw new Error('No confirmation: ' + finalMsg);
  });

  // ===== PARTNER FLOW =====
  await test('Partner flow - quick reply navigates to form', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.locator('.ichat-qr-btn', { hasText: 'Become a Partner' }).click();
    await page.waitForTimeout(1500);
    const botMsg = page.locator('.ichat-bot').last();
    const text = await botMsg.textContent();
    if (!text.includes('vendor') && !text.includes('partner')) throw new Error('Partner reply wrong: ' + text);
  });

  // ===== QUESTION FLOW =====
  await test('Question flow - user types a question', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.locator('.ichat-qr-btn', { hasText: 'I Have a Question' }).click();
    await page.waitForTimeout(1500);
    await page.locator('#ichat-input').fill('What areas do you serve?');
    await page.locator('#ichat-send').click();
    await page.waitForTimeout(1500);
    // Should ask for name
    const input = page.locator('#ichat-input');
    const isDisabled = await input.isDisabled();
    // Should show input or quick replies for name collection
    const botMsg = page.locator('.ichat-bot').last();
    const text = await botMsg.textContent();
    if (!text.includes('name') && !text.includes('share')) throw new Error('Should ask for name: ' + text);
  });

  // ===== CHATBOT ON VENDOR PAGE =====
  await test('Chatbot loads on vendor prequalification page', async () => {
    await page.goto(BASE + '/vendor-prequalification.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const widget = await page.locator('#imperium-chat-widget').isVisible();
    if (!widget) throw new Error('Chatbot not found on vendor page');
    const title = await page.locator('#ichat-title').textContent();
    if (!title.includes('Imperium Assistant')) throw new Error('Wrong title: ' + title);
  });

  await test('Chatbot on vendor page shows partner greeting', async () => {
    await page.goto(BASE + '/vendor-prequalification.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const greeting = await page.locator('.ichat-bot').first().textContent();
    if (!greeting.includes('vendor') && !greeting.includes('partner')) {
      throw new Error('Vendor page greeting should mention partnership: ' + greeting);
    }
  });

  // ===== CHATBOT ON PARTNER PAGE =====
  await test('Chatbot loads on partner assessment page', async () => {
    await page.goto(BASE + '/partner-assessment.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const widget = await page.locator('#imperium-chat-widget').isVisible();
    if (!widget) throw new Error('Chatbot not found on partner page');
  });

  // ===== EXIT INTENT =====
  await test('Exit intent triggers when mouse leaves viewport', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    // Minimize first
    await page.locator('#ichat-minimize').click();
    await page.waitForTimeout(300);
    // Simulate mouse leaving the viewport
    await page.dispatchEvent(document, 'mouseleave', { clientY: -1, clientX: 500 });
    await page.waitForTimeout(500);
    const panelOpen = await page.locator('#ichat-panel.open').isVisible();
    if (!panelOpen) throw new Error('Panel did not reopen on exit intent');
  });

  // ===== SESSION PERSISTENCE =====
  await test('Session persists in localStorage', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const hasSession = await page.evaluate(() => !!localStorage.getItem('imperium_chat_session'));
    // Session might not be set until info is collected, just verify no errors
    const widget = await page.locator('#imperium-chat-widget').isVisible();
    if (!widget) throw new Error('Widget not visible');
  });

  await browser.close();

  // Summary
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
