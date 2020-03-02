import Debug from 'debug';
import { EventEmitter } from 'events';
import { Page } from 'playwright-core';
import { CRBrowser } from 'playwright-core/lib/chromium/crBrowser';
import { ScreencastFrameCollector } from './ScreencastFrameCollector';
import { VideoFrameBuilder } from './VideoFrameBuilder';
import { VideoWriter } from './VideoWriter';

const debug = Debug('playwright-video:PageVideoCapture');

interface ConstructorArgs {
  collector: ScreencastFrameCollector;
  writer: VideoWriter;
}

interface CreateArgs {
  browser: CRBrowser;
  page: Page;
  savePath: string;
}

export class PageVideoCapture extends EventEmitter {
  public static async start({
    browser,
    page,
    savePath,
  }: CreateArgs): Promise<PageVideoCapture> {
    debug('start video capture');

    const collector = await ScreencastFrameCollector.create({ browser, page });
    const writer = await VideoWriter.create(savePath);

    const capture = new PageVideoCapture({ collector, writer });
    page.on('close', () => capture.stop());

    await collector.start();

    return capture;
  }

  private _collector: ScreencastFrameCollector;
  private _frameBuilder: VideoFrameBuilder = new VideoFrameBuilder();
  private _writer: VideoWriter;

  protected constructor({ collector, writer }: ConstructorArgs) {
    super();

    this._collector = collector;
    this._writer = writer;

    this.on('ffmpegerror', () => this.stop());
    this._listenForFrames();
  }

  private _listenForFrames(): void {
    this._collector.on('screencastframe', screencastFrame => {
      debug(`received frame: ${screencastFrame.timestamp}`);
      const videoFrames = this._frameBuilder.buildVideoFrames(screencastFrame);

      this._writer.write(videoFrames);
    });
  }

  public async stop(): Promise<void> {
    debug('stop video capture');
    await this._collector.stop();

    return this._writer.stop();
  }
}
