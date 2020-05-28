import Debug from 'debug';
import { EventEmitter } from 'events';
import * as ffmpeg from 'fluent-ffmpeg';
import { ensureDir } from 'fs-extra';
import { dirname } from 'path';
import { PassThrough } from 'stream';
import { ensureFfmpegPath } from './utils';

const debug = Debug('playwright-video:VideoWriter');

export class VideoWriter extends EventEmitter {
  public static async create(savePath: string): Promise<VideoWriter> {
    await ensureDir(dirname(savePath));

    return new VideoWriter(savePath);
  }

  private _endedPromise: Promise<void>;
  private _framesPerSecond = 25;
  private _receivedFrame = false;
  private _stopped = false;
  private _stream: PassThrough = new PassThrough();

  protected constructor(savePath: string) {
    super();

    ensureFfmpegPath();
    this._writeVideo(savePath);
  }

  private _writeVideo(savePath: string): void {
    debug(`write video to ${savePath}`);

    this._endedPromise = new Promise((resolve, reject) => {
      ffmpeg({ source: this._stream, priority: 20 })
        .videoCodec('libx264')
        .inputFormat('image2pipe')
        .inputFPS(this._framesPerSecond)
        .outputOptions(['-preset ultrafast', '-pix_fmt yuv420p', '-acodec libmp3lame'])
        .on('error', e => {
          this.emit('ffmpegerror', e.message);

          // do not reject as a result of not having frames
          if (
            !this._receivedFrame &&
            e.message.includes('pipe:0: End of file')
          ) {
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

  public stop(): Promise<void> {
    if (this._stopped) {
      return this._endedPromise;
    }

    this._stopped = true;
    this._stream.end();

    return this._endedPromise;
  }

  public write(frames: Buffer[]): void {
    debug(`write ${frames.length} frames`);

    if (frames.length && !this._receivedFrame) {
      this._receivedFrame = true;
    }

    frames.forEach(frame => {
      this._stream.write(frame);
    });
  }
}
