import { pathExists } from 'fs-extra';
import { tmpdir } from 'os';
import { join } from 'path';
import { chromium } from 'playwright';
import { CRBrowser } from 'playwright-core/lib/chromium/crBrowser';
import { capturePage } from '../src/capturePage';

describe('capturePage', () => {
  let browser: CRBrowser;

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(() => browser.close());

  it('captures a video of the page', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const savePath = join(tmpdir(), `${Date.now()}.mp4`);

    const capture = await capturePage({ page, savePath });

    await capture.stop();

    const videoPathExists = await pathExists(savePath);
    expect(videoPathExists).toBe(true);

    await page.close();
  });
});
