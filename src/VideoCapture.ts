import * as ffmpeg from 'fluent-ffmpeg';
import { ensureDir } from 'fs-extra';
import { dirname } from 'path';
import { Page } from 'playwright-core';
import { CRBrowser } from 'playwright-core/lib/chromium/crBrowser';
import { CRSession } from 'playwright-core/lib/chromium/crConnection';
import { PassThrough } from 'stream';
import { ensureBrowserType, ensureFfmpegPath } from './utils';

interface ConstructorArgs {
  browser: CRBrowser;
  page: Page;
  savePath: string;
}

export class VideoCapture {
  // public for tests
  public _client: CRSession;
  private _endedPromise: Promise<void>;
  private _frameCount = 0;
  private _lastFrame: Buffer;
  private _page: Page;
  // public for tests
  public _stopped = false;
  private _stream: PassThrough = new PassThrough();

  public static async start(args: ConstructorArgs): Promise<VideoCapture> {
    ensureBrowserType(args.browser);
    const videoCapture = new VideoCapture(args);
    await videoCapture._startScreencast(args.browser);
    return videoCapture;
  }

  protected constructor({ page, savePath }: ConstructorArgs) {
    ensureFfmpegPath();

    this._page = page;
    ensureDir(dirname(savePath));

    this._captureVideo(savePath);
    this._page.on('close', () => this.stop());
  }

  private _captureVideo(savePath: string): void {
    this._endedPromise = new Promise((resolve, reject) => {
      ffmpeg({ source: this._stream, priority: 20 })
        .videoCodec('libx264')
        .inputFormat('image2pipe')
        // TODO we should use the timestamp from the frame metadata
        .inputOptions('-use_wallclock_as_timestamps 1')
        .outputOptions('-preset ultrafast')
        .on('error', e => {
          this.stop();

          // do not reject as a result of not having frames
          if (!this._frameCount && e.message.includes('pipe:0: End of file')) {
            resolve();
            return;
          }

          reject(`playwright-video: error capturing video: ${e.message}`);
        })
        .on('end', () => {
          resolve();
        })
        .save(savePath);
    });
  }

  private async _startScreencast(browser: CRBrowser): Promise<void> {
    this._client = await browser.pageTarget(this._page).createCDPSession();

    this._client.on('Page.screencastFrame', payload => {
      this._client.send('Page.screencastFrameAck', {
        sessionId: payload.sessionId,
      });

      this._writeFrame(Buffer.from(payload.data, 'base64'));
    });

    await this._client.send('Page.startScreencast', {
      everyNthFrame: 1,
    });
  }

  private _writeFrame(frame: Buffer): void {
    this._stream.write(frame);
    this._lastFrame = frame;
    this._frameCount++;
  }

  public async stop(): Promise<void> {
    if (this._stopped) {
      return this._endedPromise;
    }

    this._stopped = true;

    // Screencast API takes time to send frames
    // Wait 1s for frames to arrive
    // TODO figure out a better pattern for this
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (this._lastFrame) {
      // TODO change to timestamps
      // rewrite the last frame so ffmpeg fills in the empty time
      this._writeFrame(this._lastFrame);
    }

    this._stream.end();

    if (this._client._connection) {
      await this._client.detach();
    }

    return this._endedPromise;
  }
}
