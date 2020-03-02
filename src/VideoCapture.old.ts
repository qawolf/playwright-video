import * as Debug from 'debug';
import * as ffmpeg from 'fluent-ffmpeg';
import { ensureDir } from 'fs-extra';
import { dirname } from 'path';
import { Page } from 'playwright-core';
import { CRBrowser } from 'playwright-core/lib/chromium/crBrowser';
import { CRSession } from 'playwright-core/lib/chromium/crConnection';
import { PassThrough } from 'stream';
import { ensureBrowserType, ensureFfmpegPath } from './utils';

const debug = Debug('playwright-video');

interface ConstructorArgs {
  browser: CRBrowser;
  page: Page;
  savePath: string;
}

interface Frame {
  data: Buffer;
  timestamp: number;
  time: number;
}

export class VideoCapture {
  // public for tests
  public _client: CRSession;
  private _endedPromise: Promise<void>;
  private _inputFps = 25;
  private _lastFrame: Frame;
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
    debug(`write video to ${savePath} at ${this._inputFps}fps`);

    this._endedPromise = new Promise((resolve, reject) => {
      ffmpeg({ source: this._stream, priority: 20 })
        .videoCodec('libx264')
        .inputFormat('image2pipe')
        .inputFPS(this._inputFps)
        .outputOptions('-preset ultrafast')
        .on('error', e => {
          this.stop();

          // do not reject as a result of not having frames
          if (!this._lastFrame && e.message.includes('pipe:0: End of file')) {
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

      if (!payload.metadata.timestamp) {
        debug('skip frame without timestamp');
        return;
      }

      this._writeFrame({
        data: Buffer.from(payload.data, 'base64'),
        timestamp: payload.metadata.timestamp,
        time: Date.now(),
      });
    });

    await this._client.send('Page.startScreencast', {
      everyNthFrame: 1,
    });
  }

  private _writeFrame(frame: Frame): void {
    if (!this._lastFrame) {
      this._stream.write(frame.data);
      this._lastFrame = frame;
      return;
    }

    // UTC time in seconds
    // https://chromedevtools.github.io/devtools-protocol/tot/Network#type-TimeSinceEpoch
    const secondSinceLastFrame = frame.timestamp - this._lastFrame.timestamp;
    if (secondSinceLastFrame < 0) {
      debug(
        `last frame arrived out of order ${frame.timestamp} - ${this._lastFrame.timestamp} = ${secondSinceLastFrame}`,
      );
      return;
    }

    const numFrames = Math.round(secondSinceLastFrame * this._inputFps);
    debug(`write frame ${frame.timestamp} ${numFrames} times`);

    for (let i = 0; i < numFrames; i++) {
      this._stream.write(frame.data);
    }

    this._lastFrame = frame;
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

    if (this._client._connection) {
      await this._client.detach();
    }

    // rewrite the last frame so ffmpeg fills in the empty time
    if (this._lastFrame) {
      const secondsLater = (Date.now() - this._lastFrame.time) / 1000;
      debug(`write last frame ${secondsLater} seconds later`);
      this._writeFrame({
        data: this._lastFrame.data,
        timestamp: this._lastFrame.timestamp + secondsLater,
        time: Date.now(),
      });
    }

    this._stream.end();

    return this._endedPromise;
  }
}
