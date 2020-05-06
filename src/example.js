const { chromium } = require('playwright');
const { saveVideo } = require('playwright-video');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const capture = await saveVideo(page, '/tmp/video.mp4');
  await page.goto('http://example.org');
  await page.click('a');
  await capture.stop();

  await browser.close();
})();
