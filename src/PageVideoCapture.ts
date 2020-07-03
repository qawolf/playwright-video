import Debug from 'debug';
import { Page } from 'playwright-core';
import { SortedFrameQueue } from './SortedFrameQueue';
import {
  ScreencastFrame,
  ScreencastFrameCollector,
} from './ScreencastFrameCollector';
import { VideoWriter } from './VideoWriter';

const debug = Debug('pw-video:PageVideoCapture');

export interface CaptureOptions {
  followPopups: boolean;
  fps?: number;
}

interface ConstructorArgs {
  collector: ScreencastFrameCollector;
  queue: SortedFrameQueue;
  page: Page;
  writer: VideoWriter;
}

interface StartArgs {
  page: Page;
  savePath: string;
  options?: CaptureOptions;
}

export class PageVideoCapture {
  public static async start({
    page,
    savePath,
    options,
  }: StartArgs): Promise<PageVideoCapture> {
    debug('start');

    const collector = await ScreencastFrameCollector.create(page, options);
    const queue = new SortedFrameQueue();
    const writer = await VideoWriter.create(savePath, options);

    const capture = new PageVideoCapture({ collector, queue, page, writer });
    await collector.start();

    return capture;
  }

  // public for tests
  public _collector: ScreencastFrameCollector;
  private _previousFrame?: ScreencastFrame;
  private _queue: SortedFrameQueue;
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
      frames.forEach((frame) => this._writePreviousFrame(frame));
    });
  }

  private _writePreviousFrame(currentFrame: ScreencastFrame): void {
    // write the previous frame based on the duration between it and the current frame
    if (this._previousFrame) {
      const durationSeconds =
        currentFrame.timestamp - this._previousFrame.timestamp;
      this._writer.write(this._previousFrame.data, durationSeconds);
    }

    this._previousFrame = currentFrame;
  }

  private _writeFinalFrameUpToTimestamp(stoppedTimestamp: number): void {
    if (!this._previousFrame) return;

    // write the final frame based on the duration between it and when the screencast was stopped
    debug('write final frame');
    const durationSeconds = stoppedTimestamp - this._previousFrame.timestamp;
    this._writer.write(this._previousFrame.data, durationSeconds);
  }

  public async stop(): Promise<void> {
    if (this._stopped) return;

    debug('stop');
    this._stopped = true;

    const stoppedTimestamp = await this._collector.stop();
    this._queue.drain();
    this._writeFinalFrameUpToTimestamp(stoppedTimestamp);

    return this._writer.stop();
  }
}
