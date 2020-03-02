import { Page } from 'playwright-core';
import { CRBrowser } from 'playwright-core/lib/chromium/crBrowser';
import { ScreencastFrameCollector } from './ScreencastFrameCollector';
import { VideoFrameBuilder } from './VideoFrameBuilder';
import { VideoWriter } from './VideoWriter';

interface ConstructorArgs {
  collector: ScreencastFrameCollector;
  writer: VideoWriter;
}

interface CreateArgs {
  browser: CRBrowser;
  page: Page;
  savePath: string;
}

export class VideoCapture {
  public static async start({
    browser,
    page,
    savePath,
  }: CreateArgs): Promise<VideoCapture> {
    const collector = await ScreencastFrameCollector.create({ browser, page });
    const writer = await VideoWriter.create(savePath);

    return new VideoCapture({ collector, writer });
  }

  private _collector: ScreencastFrameCollector;
  private _frameBuilder: VideoFrameBuilder = new VideoFrameBuilder();
  private _writer: VideoWriter;

  protected constructor({ collector, writer }: ConstructorArgs) {
    this._collector = collector;
    this._writer = writer;

    this._listenForFrames();
  }

  private _listenForFrames(): void {
    this._collector.on('screencastframe', screencastFrame => {
      const videoFrames = this._frameBuilder.buildVideoFrames(screencastFrame);

      this._writer.write(videoFrames);
    });
  }

  public async stop(): Promise<void> {
    await this._collector.stop();

    return this._writer.stop();
  }
}
