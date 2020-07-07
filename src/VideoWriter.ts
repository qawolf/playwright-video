import Debug from 'debug';
import { EventEmitter } from 'events';
import ffmpeg from 'fluent-ffmpeg';
import { ensureDir } from 'fs-extra';
import { dirname } from 'path';
import { PassThrough } from 'stream';
import { ensureFfmpegPath } from './utils';
import { CaptureOptions } from './PageVideoCapture';

const debug = Debug('pw-video:VideoWriter');

export class VideoWriter extends EventEmitter {
  public static async create(
    savePath: string,
    options?: CaptureOptions,
  ): Promise<VideoWriter> {
    await ensureDir(dirname(savePath));

    return new VideoWriter(savePath, options);
  }

  private _endedPromise: Promise<void>;
  private _framesPerSecond = 25;
  private _receivedFrame = false;
  private _stopped = false;
  private _stream: PassThrough = new PassThrough();

  protected constructor(savePath: string, options?: CaptureOptions) {
    super();

    ensureFfmpegPath();
    if (options && options.fps) {
      this._framesPerSecond = options.fps;
    }
    this._writeVideo(savePath);
  }

  private _writeVideo(savePath: string): void {
    debug(`write video to ${savePath}`);

    this._endedPromise = new Promise((resolve, reject) => {
      ffmpeg({ source: this._stream, priority: 20 })
        .videoCodec('libx264')
        .inputFormat('image2pipe')
        .inputFPS(this._framesPerSecond)
        .outputOptions('-preset ultrafast')
        .outputOptions('-pix_fmt yuv420p')
        .on('error', (e) => {
          this.emit('ffmpegerror', e.message);

          // do not reject as a result of not having frames
          if (
            !this._receivedFrame &&
            e.message.includes('pipe:0: End of file')
          ) {
            resolve();
            return;
          }

          reject(`pw-video: error capturing video: ${e.message}`);
        })
        .on('end', () => {
          resolve();
        })
        .save(savePath);
    });
  }

  public stop(): Promise<void> {
    if (this._stopped) {
      return this._endedPromise;
    }

    this._stopped = true;
    this._stream.end();

    return this._endedPromise;
  }

  public write(data: Buffer, durationSeconds = 1): void {
    this._receivedFrame = true;

    const numFrames = Math.max(
      Math.round(durationSeconds * this._framesPerSecond),
      1,
    );
    debug(`write ${numFrames} frames for duration ${durationSeconds}s`);

    for (let i = 0; i < numFrames; i++) {
      this._stream.write(data);
    }
  }
}
