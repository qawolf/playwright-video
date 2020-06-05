import { chromium, ChromiumBrowser, firefox } from 'playwright';
import { ScreencastFrameCollector } from '../src/ScreencastFrameCollector';

describe('ScreencastFrameCollector', () => {
  let browser: ChromiumBrowser;

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  it('emits screencast frames of a page', async () => {
    const page = await browser.newPage();

    const collector = await ScreencastFrameCollector.create(page);
    await collector.start();

    await new Promise((resolve) => {
      collector.on('screencastframe', (payload) => {
        expect(payload.received).toBeTruthy();
        resolve();
      });
    });

    await page.close();
  });

  it('throws an error if page context not chromium', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firefoxBrowser = (await firefox.launch()) as any;
    const page = await firefoxBrowser.newPage();

    const testFn = (): Promise<ScreencastFrameCollector> =>
      ScreencastFrameCollector.create(page);

    await expect(testFn()).rejects.toThrow(
      'pw-video: page context must be chromium',
    );

    await firefoxBrowser.close();
  }, 10000); // increase timeout since Firefox slow to launch

  it('disposes the CDP session when stopped', async () => {
    const page = await browser.newPage();

    const collector = await ScreencastFrameCollector.create(page);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = collector._client as any;

    expect(client._connection).toBeTruthy();
    await collector.stop();
    expect(client._connection).toBeNull();

    await page.close();
  });
});
