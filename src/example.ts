import { chromium, devices } from 'playwright-core';
import { VideoCapture } from './VideoCapture';

(async (): Promise<void> => {
  const iPhone = devices['iPhone 6'];

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: iPhone.viewport,
    userAgent: iPhone.userAgent,
  });

  const page = await context.newPage();

  await VideoCapture.start({
    browser,
    page,
    savePath: '/tmp/video.mp4',
  });

  await page.goto('http://example.org');

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load' }),
    page.click('a'),
  ]);

  await browser.close();
})();
