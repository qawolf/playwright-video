import { setFfmpegPath as setFluentFfmpegPath } from 'fluent-ffmpeg';
import { Page } from 'playwright-core';
import { CRBrowserContext } from 'playwright-core/lib/chromium/crBrowser';

export const getFfmpegFromModule = (): string | null => {
  try {
    const ffmpegPath = require('ffmpeg-static'); // eslint-disable-line @typescript-eslint/no-var-requires
    if (ffmpegPath) return ffmpegPath;
  } catch (e) {} // eslint-disable-line no-empty

  return null;
};

export const getFfmpegPath = (): string | null => {
  if (process.env.FFMPEG_PATH) {
    return process.env.FFMPEG_PATH;
  }

  return getFfmpegFromModule();
};

export const ensureFfmpegPath = (): void => {
  const ffmpegPath = getFfmpegPath();
  if (!ffmpegPath) {
    throw new Error(
      'playwright-video: FFmpeg path not set. Set the FFMPEG_PATH env variable or install ffmpeg-static as a dependency.',
    );
  }

  setFluentFfmpegPath(ffmpegPath);
};

export const ensurePageType = (page: Page): void => {
  const context = page.context();

  if (!(context as CRBrowserContext).newCDPSession) {
    throw new Error('playwright-video: page context must be chromium');
  }
};
