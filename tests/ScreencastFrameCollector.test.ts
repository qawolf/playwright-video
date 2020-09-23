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

  it('creates a new CDP connection when a popup is opened if followPopups is set', async () => {
    const page = await browser.newPage();
    await page.setContent('<html><body><a target="_blank" href="https://www.google.com">Google</a></body></html>');

    const collector = await ScreencastFrameCollector.create(page, { followPopups: true });
    await collector.start();

    expect(collector._clients.length).toBe(1);

    const popupPromise = new Promise((resolve) => {
      collector.once('popupFollowed', () => {
        resolve();
      });
    });

    await page.click('a');

    await popupPromise;

    expect(collector._clients.length).toBe(2);

    await page.close();
  });

  it('does not create a new CDP connection when a popup is opened if followPopups is unset', async () => {
    const page = await browser.newPage();
    await page.setContent('<html><body><a target="_blank" href="https://www.google.com">Google</a></body></html>');

    const collector = await ScreencastFrameCollector.create(page);
    await collector.start();

    expect(collector._clients.length).toBe(1);

    const framePromise = Promise.race([
      new Promise((resolve) => {
        collector.once('screencastframe', () => {
          resolve();
        });
      }),
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ]);

    await page.click('a');

    await framePromise;

    expect(collector._clients.length).toBe(1);

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
    await collector.start();

    const client = collector._clients[0];

    const detachSpy = jest.spyOn(client, "detach");
    expect(detachSpy).not.toHaveBeenCalled();

    await collector.stop();
    
    expect(detachSpy).toHaveBeenCalledTimes(1);

    await page.close();
  });
});
