import Debug from 'debug';
import { Page } from 'playwright-core';
import { SortedFrameQueue } from './SortedFrameQueue';
import { ScreencastFrameCollector } from './ScreencastFrameCollector';
import { VideoFrameBuilder } from './VideoFrameBuilder';
import { VideoWriter } from './VideoWriter';

const debug = Debug('playwright-video:PageVideoCapture');

interface ConstructorArgs {
  collector: ScreencastFrameCollector;
  queue: SortedFrameQueue;
  page: Page;
  writer: VideoWriter;
}

interface CreateArgs {
  page: Page;
  savePath: string;
}

export class PageVideoCapture {
  public static async start({
    page,
    savePath,
  }: CreateArgs): Promise<PageVideoCapture> {
    debug('start');

    const collector = await ScreencastFrameCollector.create(page);
    const queue = new SortedFrameQueue();
    const writer = await VideoWriter.create(savePath);

    const capture = new PageVideoCapture({ collector, queue, page, writer });
    await collector.start();

    return capture;
  }

  private _collector: ScreencastFrameCollector;
  private _queue: SortedFrameQueue;
  private _frameBuilder: VideoFrameBuilder = new VideoFrameBuilder();
  // public for tests
  public _stopped = false;
  private _writer: VideoWriter;

  protected constructor({ collector, queue, page, writer }: ConstructorArgs) {
    this._collector = collector;
    this._queue = queue;
    this._writer = writer;

    this._writer.on('ffmpegerror', (error) => {
      debug(`stop due to ffmpeg error "${error.trim()}"`);
      this.stop();
    });

    page.on('close', () => this.stop());

    this._listenForFrames();
  }

  private _listenForFrames(): void {
    this._collector.on('screencastframe', (screencastFrame) => {
      debug(`collected frame from screencast: ${screencastFrame.timestamp}`);
      this._queue.insert(screencastFrame);
    });

    this._queue.on('sortedframes', (frames) => {
      debug(`received ${frames.length} frames from queue`);

      frames.forEach((frame) => {
        const videoFrames = this._frameBuilder.buildVideoFrames(frame);
        this._writer.write(videoFrames);
      });
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
    this._queue.drain();
    this._writeLastFrame();

    return this._writer.stop();
  }
}
