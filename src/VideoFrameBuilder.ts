import { ScreencastFrame } from './types';

export class VideoFrameBuilder {
  private _fps = 25;
  private _previousFrame?: ScreencastFrame;

  private _getFrameCount(screencastFrame?: ScreencastFrame): number {
    let durationSeconds: number;

    if (screencastFrame) {
      durationSeconds =
        screencastFrame.timestamp - this._previousFrame.timestamp;
    } else {
      durationSeconds = (Date.now() - this._previousFrame.received) / 1000;
    }

    return Math.round(durationSeconds * this._fps);
  }

  public buildVideoFrames(screencastFrame?: ScreencastFrame): Buffer[] {
    if (!this._previousFrame) {
      this._previousFrame = screencastFrame;
      return [];
    }

    const frameCount = this._getFrameCount(screencastFrame);
    const frames = Array(frameCount).fill(this._previousFrame.data);

    this._previousFrame = screencastFrame;

    return frames;
  }
}
