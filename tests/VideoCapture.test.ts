import { pathExists } from 'fs-extra';
import { tmpdir } from 'os';
import { join } from 'path';
import { chromium, firefox } from 'playwright-core';
import { CRBrowser } from 'playwright-core/lib/chromium/crBrowser';
import * as utils from '../src/utils';
import { VideoCapture } from '../src/VideoCapture';

const buildSavePath = (): string => join(tmpdir(), `${Date.now()}.mp4`);

describe('VideoCapture', () => {
  let browser: CRBrowser;

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(() => browser.close());

  describe('start', () => {
    it('throws an error when ffmpeg path is not found', async () => {
      const page = await browser.newPage();

      jest.spyOn(utils, 'getFfmpegFromModule').mockReturnValue(null);

      const testFn = (): Promise<VideoCapture> =>
        VideoCapture.start({ browser, page, savePath: buildSavePath() });

      await expect(testFn()).rejects.toThrow('FFmpeg path not set');

      await page.close();
      jest.restoreAllMocks();
    });

    it('throws an error if browser not a ChromiumBrowser instance', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const firefoxBrowser = (await firefox.launch()) as any;
      const page = await firefoxBrowser.newPage();

      const testFn = (): Promise<VideoCapture> =>
        VideoCapture.start({
          browser: firefoxBrowser,
          page,
          savePath: buildSavePath(),
        });

      await expect(testFn()).rejects.toThrow(
        'browser must be a ChromiumBrowser instance',
      );

      await firefoxBrowser.close();
    }, 10000); // increase timeout since Firefox slow to launch

    it('stops on page close', async () => {
      const savePath = buildSavePath();
      const page = await browser.newPage();

      const capture = await VideoCapture.start({
        browser,
        page,
        savePath,
      });

      await page.close();
      expect(capture._stopped).toBe(true);
      await capture.stop();
    });

    describe('stop', () => {
      it('disposes the CDP session', async () => {
        const page = await browser.newPage();

        const capture = await VideoCapture.start({
          browser,
          page,
          savePath: buildSavePath(),
        });
        expect(capture._client._connection).toBeTruthy();

        await capture.stop();
        expect(capture._client._connection).toBeNull();

        await page.close();
      });

      it('saves the video capture', async () => {
        const savePath = buildSavePath();
        const page = await browser.newPage();

        const capture = await VideoCapture.start({
          browser,
          page,
          savePath,
        });

        await capture.stop();
        const videoPathExists = await pathExists(savePath);
        expect(videoPathExists).toBe(true);

        await page.close();
      });
    });
  });
});
