import { chromium, firefox } from 'playwright';
import { CRBrowser } from 'playwright-core/lib/chromium/crBrowser';
import { ScreencastFrameCollector } from '../src/ScreencastFrameCollector';

describe('ScreencastFrameCollector', () => {
  let browser: CRBrowser;

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(() => browser.close());

  it('emits screencast frames of a page', async () => {
    const page = await browser.newPage();

    const collector = await ScreencastFrameCollector.create(page);
    await collector.start();

    await new Promise(resolve => {
      collector.on('screencastframe', payload => {
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
      'playwright-video: page context must be chromium',
    );

    await firefoxBrowser.close();
  }, 10000); // increase timeout since Firefox slow to launch

  it('disposes the CDP session when stopped', async () => {
    const page = await browser.newPage();

    const collector = await ScreencastFrameCollector.create(page);
    expect(collector._client._connection).toBeTruthy();

    await collector.stop();
    expect(collector._client._connection).toBeNull();

    await page.close();
  });
});
