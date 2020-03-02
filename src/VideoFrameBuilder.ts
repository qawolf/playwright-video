import Debug from 'debug';

const debug = Debug('playwright-video:VideoFrameBuilder');

interface ScreencastFrame {
  data: Buffer;
  received: number;
  timestamp: number;
}

export class VideoFrameBuilder {
  private _framesPerSecond = 25;
  private _previousFrame?: ScreencastFrame;

  private _getFrameCount(screencastFrame?: ScreencastFrame): number {
    let durationSeconds: number;

    if (screencastFrame) {
      durationSeconds =
        screencastFrame.timestamp - this._previousFrame.timestamp;
    } else {
      durationSeconds = (Date.now() - this._previousFrame.received) / 1000;
    }

    const frameCount = Math.round(durationSeconds * this._framesPerSecond);
    if (frameCount < 0) {
      debug(`frames out of order: frameCount ${frameCount}`);
      return 0;
    }

    return frameCount;
  }

  public buildVideoFrames(screencastFrame?: ScreencastFrame): Buffer[] {
    if (!this._previousFrame) {
      debug('first frame received: waiting for more');
      this._previousFrame = screencastFrame;
      return [];
    }

    const frameCount = this._getFrameCount(screencastFrame);
    const frames = Array(frameCount).fill(this._previousFrame.data);
    debug(`returning ${frames.length} frames`);

    this._previousFrame = screencastFrame;

    return frames;
  }
}
