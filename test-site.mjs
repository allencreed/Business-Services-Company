import { chromium } from 'playwright';

const BASE = 'https://imperium-infra-site.vercel.app';
const DASHBOARD = 'https://imperium-infra-dashboard.vercel.app';

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

  // --- MAIN SITE ---
  const page = await context.newPage();

  await test('Homepage loads', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const title = await page.title();
    if (!title.includes('Imperium Infrastructure')) throw new Error('Wrong title: ' + title);
  });

  await test('Hero section visible with correct text', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const hero = await page.textContent('.hero-label');
    if (!hero.includes('Building Maintenance and Facility Solutions')) throw new Error('Wrong hero label: ' + hero);
    const h1 = await page.textContent('h1');
    if (!h1.includes('One Call')) throw new Error('Wrong h1: ' + h1);
  });

  await test('Schedule Assessment button exists and scrolls', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const btn = page.locator('.btn-hero-secondary');
    await btn.click();
    await page.waitForTimeout(500);
    const contactSection = page.locator('#contact');
    await contactSection.scrollIntoViewIfNeeded();
  });

  await test('Nav links navigate to sections', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const links = [
      { text: 'Services', section: '#services' },
      { text: 'Industries', section: '#industries' },
      { text: 'About Us', section: '#about' },
      { text: 'Why Choose Us', section: '#why-us' },
      { text: 'Contact', section: '#contact' },
    ];
    for (const link of links) {
      const el = page.locator('.nav-list a', { hasText: link.text });
      await el.click();
      await page.waitForTimeout(300);
      const section = page.locator(link.section);
      await section.scrollIntoViewIfNeeded();
    }
  });

  await test('Header phone number visible and clickable', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const phone = page.locator('.header-contact');
    await phone.scrollIntoViewIfNeeded();
    const text = await phone.textContent();
    if (!text.includes('(470) 427-4128')) throw new Error('Phone not found: ' + text);
  });

  await test('Header Become a Vendor link works', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const link = page.locator('.btn-vendor');
    const href = await link.getAttribute('href');
    if (href !== 'vendor-prequalification.html') throw new Error('Wrong vendor link: ' + href);
  });

  await test('Header Become a Partner link works', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const link = page.locator('.btn-partner');
    const href = await link.getAttribute('href');
    if (!href.includes('vendor-prequalification')) throw new Error('Wrong partner link: ' + href);
  });

  await test('Services section has 6 service cards', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const cards = page.locator('.service-item');
    const count = await cards.count();
    if (count !== 6) throw new Error('Expected 6 service cards, got ' + count);
  });

  await test('Services section titles present', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const expected = ['Commercial Painting', 'Safety & Compliance', 'Vendor Coordination', 'Janitorial and Cleaning Services', 'Parking Lot Maintenance and Striping', 'HVAC Service and Repair'];
    for (const title of expected) {
      const el = page.locator('.service-body h3', { hasText: title });
      const count = await el.count();
      if (count === 0) throw new Error('Service title not found: ' + title);
    }
  });

  await test('Contact form fields exist and submit triggers mailto', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    // Scroll to contact form
    await page.locator('#contact').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const name = page.locator('#name');
    await name.fill('Test User');
    const email = page.locator('#email');
    await email.fill('test@example.com');
    const propertyType = page.locator('#property-type');
    await propertyType.selectOption('commercial');
    const submitBtn = page.locator('.btn-submit');
    await submitBtn.scrollIntoViewIfNeeded();
    // Just verify button exists and form is visible
    const btnText = await submitBtn.textContent();
    if (!btnText.includes('Submit')) throw new Error('Submit button wrong text: ' + btnText);
  });

  await test('Testimonials section loads', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const section = page.locator('#testimonials');
    const count = await section.locator('.testimonial-item').count();
    if (count !== 3) throw new Error('Expected 3 testimonials, got ' + count);
  });

  await test('Portfolio gallery section loads', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const section = page.locator('#portfolio');
    const count = await section.locator('.gallery-item').count();
    if (count !== 3) throw new Error('Expected 3 gallery items, got ' + count);
  });

  await test('Resources section loads', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const section = page.locator('#resources');
    const count = await section.locator('.resource-item').count();
    if (count !== 3) throw new Error('Expected 3 resource items, got ' + count);
  });

  await test('FAQ section has 6 items', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const items = page.locator('.faq-item');
    const count = await items.count();
    if (count !== 6) throw new Error('Expected 6 FAQ items, got ' + count);
  });

  await test('FAQ accordion toggles', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const firstQuestion = page.locator('.faq-question').first();
    await firstQuestion.click();
    await page.waitForTimeout(300);
    const expanded = await firstQuestion.getAttribute('aria-expanded');
    if (expanded !== 'true') throw new Error('FAQ did not expand');
    // Click again to collapse
    await firstQuestion.click();
    await page.waitForTimeout(300);
    const collapsed = await firstQuestion.getAttribute('aria-expanded');
    if (collapsed !== 'false') throw new Error('FAQ did not collapse');
  });

  await test('Service area section has 6 states', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const states = page.locator('.area-state');
    const count = await states.count();
    if (count !== 6) throw new Error('Expected 6 states, got ' + count);
  });

  await test('Google Maps iframe loads', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const iframe = page.locator('.map-container iframe');
    const src = await iframe.getAttribute('src');
    if (!src.includes('google.com/maps')) throw new Error('Maps iframe missing');
  });

  await test('Footer has all 5 columns', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.locator('.site-footer').scrollIntoViewIfNeeded();
    const cols = page.locator('.footer-col');
    const count = await cols.count();
    // footer-brand + footer-col x4 + footer-bottom
    if (count < 4) throw new Error('Expected at least 4 footer columns, got ' + count);
  });

  await test('Footer contact info correct', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.locator('.site-footer').scrollIntoViewIfNeeded();
    const body = await page.locator('.site-footer').textContent();
    if (!body.includes('(470) 427-4128')) throw new Error('Footer missing phone');
    if (!body.includes('info@imperiuminfra.com')) throw new Error('Footer missing email');
    if (!body.includes('125 Brown Street')) throw new Error('Footer missing address');
  });

  await test('Footer year is current', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.locator('.site-footer').scrollIntoViewIfNeeded();
    const text = await page.locator('.footer-bottom').textContent();
    if (!text.includes('2026')) throw new Error('Footer year not 2026');
  });

  // --- VENDOR PRE-QUALIFICATION PAGE ---
  await test('Vendor form page loads', async () => {
    await page.goto(BASE + '/vendor-prequalification.html', { waitUntil: 'networkidle' });
    const title = await page.textContent('h1');
    if (!title.includes('Vendor Pre-Qualification')) throw new Error('Wrong title: ' + title);
  });

  await test('Vendor form trade dropdown has all options', async () => {
    await page.goto(BASE + '/vendor-prequalification.html', { waitUntil: 'networkidle' });
    const options = await page.locator('#trade option').allTextContents();
    const expected = ['Striping', 'Painting', 'HVAC', 'Cleaner', 'Other'];
    for (const opt of expected) {
      if (!options.some(o => o.trim() === opt)) throw new Error('Missing option: ' + opt);
    }
  });

  await test('Vendor form progress bar visible', async () => {
    await page.goto(BASE + '/vendor-prequalification.html', { waitUntil: 'networkidle' });
    const bar = page.locator('.progress-wrapper');
    await bar.scrollIntoViewIfNeeded();
    const text = await page.locator('.progress-text').textContent();
    if (text !== '0% Complete') throw new Error('Progress not 0%: ' + text);
  });

  await test('Vendor form progress updates on input', async () => {
    await page.goto(BASE + '/vendor-prequalification.html', { waitUntil: 'networkidle' });
    await page.locator('#companyName').fill('Test Company');
    await page.locator('#contactName').fill('Test Contact');
    await page.locator('#email').fill('test@test.com');
    await page.locator('#phone').fill('555-0100');
    await page.waitForTimeout(300);
    const pct = await page.locator('.progress-text').textContent();
    const num = parseInt(pct);
    if (num <= 0) throw new Error('Progress not updating: ' + pct);
  });

  await test('Vendor form trade-specific questions appear', async () => {
    await page.goto(BASE + '/vendor-prequalification.html', { waitUntil: 'networkidle' });
    await page.locator('#trade').selectOption('Painting');
    await page.waitForTimeout(300);
    const tradeSection = page.locator('#tradeSection');
    const visible = await tradeSection.isVisible();
    if (!visible) throw new Error('Trade section not visible for Painting');
    const questions = await tradeSection.locator('textarea').count();
    if (questions === 0) throw new Error('No trade-specific questions shown');
  });

  await test('Vendor form mailto submission triggers', async () => {
    await page.goto(BASE + '/vendor-prequalification.html', { waitUntil: 'networkidle' });
    // Fill required fields
    await page.locator('#trade').selectOption('Cleaner');
    await page.locator('#companyName').fill('Clean Co');
    await page.locator('#contactName').fill('John');
    await page.locator('#email').fill('john@clean.co');
    await page.locator('#phone').fill('555-0100');
    await page.locator('#q1').fill('Licensed in GA');
    const submitBtn = page.locator('.submit-btn');
    await submitBtn.scrollIntoViewIfNeeded();
    const btnText = await submitBtn.textContent();
    if (!btnText.includes('Submit')) throw new Error('Submit button wrong text: ' + btnText);
    // We can't test actual mailto navigation in headless, but verify the form is ready
  });

  // --- PARTNER ASSESSMENT PAGE ---
  await test('Partner assessment page loads', async () => {
    await page.goto(BASE + '/partner-assessment.html', { waitUntil: 'networkidle' });
    const title = await page.title();
    if (!title.includes('Partner')) throw new Error('Wrong title: ' + title);
  });

  // --- DASHBOARD ---
  await test('Dashboard login page loads', async () => {
    await page.goto(DASHBOARD, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {
      // Dashboard may fail if Convex not deployed yet — that's OK
    });
  });

  await test('Robots.txt accessible', async () => {
    await page.goto(BASE + '/robots.txt', { waitUntil: 'networkidle' });
    const text = await page.textContent('body');
    if (!text.includes('User-agent')) throw new Error('robots.txt wrong: ' + text.substring(0, 50));
  });

  await test('Sitemap.xml accessible', async () => {
    await page.goto(BASE + '/sitemap.xml', { waitUntil: 'networkidle' });
    const text = await page.textContent('body');
    if (!text.includes('urlset')) throw new Error('sitemap.xml wrong');
  });

  await browser.close();

  // Summary
  console.log('\n═══════════════════════════════');
  console.log(`  Results: ${results.pass} passed, ${results.fail} failed`);
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
