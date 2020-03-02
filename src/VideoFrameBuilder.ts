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
      // measure duration between frames
      durationSeconds =
        screencastFrame.timestamp - this._previousFrame.timestamp;
    } else {
      // measure duration since the last frame was received
      durationSeconds = (Date.now() - this._previousFrame.received) / 1000;
    }

    return Math.round(durationSeconds * this._framesPerSecond);
  }

  public buildVideoFrames(screencastFrame?: ScreencastFrame): Buffer[] {
    if (!this._previousFrame) {
      debug('first frame received: waiting for more');
      this._previousFrame = screencastFrame;
      return [];
    }

    const frameCount = this._getFrameCount(screencastFrame);

    if (frameCount < 0) {
      debug('frames out of order: skipping frame');
      return [];
    }

    const frames = Array(frameCount).fill(this._previousFrame.data);
    debug(`returning ${frames.length} frames`);

    this._previousFrame = screencastFrame;

    return frames;
  }
}
