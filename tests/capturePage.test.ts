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

  it.only('captures a video of multiple pages', async () => {
    const context = await browser.newContext();
    // const saveDir = tmpdir();
    // console.log('SAVE DIR', saveDir);

    (context as any).on('page', () => {
      console.log('page!');
    });

    await browser.newPage();

    // await forEachPage(context, () => {
    //   console.log('PAGE');
    // });

    await browser.newPage();

    await new Promise(resolve => setTimeout(resolve, 3000));

    // await new Promise(async resolve => {
    //   let videoPathExists = await pathExists(join(saveDir, '0.mp4'));

    //   while (!videoPathExists) {
    //     await new Promise(resolve => setTimeout(resolve, 500));
    //     videoPathExists = await pathExists(join(saveDir, '0.mp4'));
    //   }

    //   resolve();
    // });

    // const videoPathExists = await pathExists(join(saveDir, '0.mp4'));
    // const videoPathExists2 = await pathExists(join(saveDir, '1.mp4'));

    // expect([videoPathExists, videoPathExists2]).toEqual([true, true]);

    // await Promise.all([page.close(), page2.close()]);
  });
});
