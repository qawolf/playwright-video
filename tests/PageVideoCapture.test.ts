import { pathExists } from 'fs-extra';
import { tmpdir } from 'os';
import { join } from 'path';
import { chromium } from 'playwright';
import { CRBrowser } from 'playwright-core/lib/chromium/crBrowser';
import { PageVideoCapture } from '../src/PageVideoCapture';

const buildSavePath = (): string => join(tmpdir(), `${Date.now()}.mp4`);

describe('PageVideoCapture', () => {
  let browser: CRBrowser;

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(() => browser.close());

  it('captures a video of the page', async () => {
    const page = await browser.newPage();
    const savePath = buildSavePath();

    const capture = await PageVideoCapture.start({ page, savePath });

    await capture.stop();

    const videoPathExists = await pathExists(savePath);
    expect(videoPathExists).toBe(true);

    await page.close();
  });

  it('stops on page close', async () => {
    const page = await browser.newPage();

    const capture = await PageVideoCapture.start({
      page,
      savePath: buildSavePath(),
    });

    await page.close();
    expect(capture._stopped).toBe(true);
  });
});
