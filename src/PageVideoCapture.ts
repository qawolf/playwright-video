import Debug from 'debug';
import { Page } from 'playwright-core';
import { CRBrowser } from 'playwright-core/lib/chromium/crBrowser';
import { ScreencastFrameCollector } from './ScreencastFrameCollector';
import { VideoFrameBuilder } from './VideoFrameBuilder';
import { VideoWriter } from './VideoWriter';

const debug = Debug('playwright-video:PageVideoCapture');

interface ConstructorArgs {
  collector: ScreencastFrameCollector;
  page: Page;
  writer: VideoWriter;
}

interface CreateArgs {
  browser: CRBrowser;
  page: Page;
  savePath: string;
}

export class PageVideoCapture {
  public static async start({
    browser,
    page,
    savePath,
  }: CreateArgs): Promise<PageVideoCapture> {
    debug('start');

    const collector = await ScreencastFrameCollector.create({ browser, page });
    const writer = await VideoWriter.create(savePath);

    const capture = new PageVideoCapture({ collector, page, writer });
    await collector.start();

    return capture;
  }

  private _collector: ScreencastFrameCollector;
  private _frameBuilder: VideoFrameBuilder = new VideoFrameBuilder();
  // public for tests
  public _stopped = false;
  private _writer: VideoWriter;

  protected constructor({ collector, page, writer }: ConstructorArgs) {
    this._collector = collector;
    this._writer = writer;

    this._writer.on('ffmpegerror', () => {
      debug('stop due to ffmpeg error');
      this.stop();
    });
    page.on('close', () => this.stop());

    this._listenForFrames();
  }

  private _listenForFrames(): void {
    this._collector.on('screencastframe', screencastFrame => {
      debug(`received frame: ${screencastFrame.timestamp}`);
      const videoFrames = this._frameBuilder.buildVideoFrames(screencastFrame);

      this._writer.write(videoFrames);
    });
  }

  private _writeLastFrame(): void {
    debug('write last frame');

    const videoFrames = this._frameBuilder.buildVideoFrames();
    this._writer.write(videoFrames);
  }

  public async stop(): Promise<void> {
    if (this._stopped) return;

    debug('stop');
    this._stopped = true;

    await this._collector.stop();
    this._writeLastFrame();

    return this._writer.stop();
  }
}
