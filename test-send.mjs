import { chromium } from 'playwright';

const BASE = 'https://imperium-infra-site.vercel.app';

async function run() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  console.log('Opening contact form...');
  await page.goto(BASE, { waitUntil: 'networkidle' });

  // Scroll to contact
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  // Fill contact form
  await page.locator('#name').fill('Test Submission');
  await page.locator('#email').fill('test@example.com');
  await page.locator('#phone').fill('(404) 555-1234');
  await page.locator('#property-type').selectOption('commercial');
  await page.locator('#property-services').selectOption('striping');
  await page.locator('#message').fill('This is a test message to verify the contact form sends to sheldon.rollins@icloud.com. Please confirm receipt. Thank you!');

  console.log('Form filled. Clicking submit...');

  // Intercept navigation to capture mailto URL
  page.on('framenavigated', async (frame) => {
    if (frame.url().startsWith('mailto:')) {
      console.log('\n✓ Mailto triggered successfully!');
      console.log('  To: sheldon.rollins@icloud.com');
      console.log('  Subject: Property Maintenance Request');
      console.log('\nYour default email client should open now.');
      console.log('Press enter in the terminal after you\'ve closed your email client to exit.');
    }
  });

  await page.locator('.btn-submit').click();

  // Wait for mailto to trigger
  await new Promise(resolve => setTimeout(resolve, 3000));
  await browser.close();
  process.exit(0);
}

run().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
