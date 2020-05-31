import { pathExists } from 'fs-extra';
import { tmpdir } from 'os';
import { join } from 'path';
import * as utils from '../src/utils';
import { VideoWriter } from '../src/VideoWriter';

describe('VideoWriter', () => {
  it('throws an error when ffmpeg path is not found', async () => {
    jest.spyOn(utils, 'getFfmpegFromModule').mockReturnValue(null);

    const testFn = (): Promise<VideoWriter> =>
      VideoWriter.create('/tmp/video.mp4');
    await expect(testFn()).rejects.toThrow('FFmpeg path not set');

    jest.restoreAllMocks();
  });

  it('stop resolves after the video is saved', async () => {
    const savePath = join(tmpdir(), `${Date.now()}.mp4`);

    const writer = await VideoWriter.create(savePath);
    writer.write([
      // White 1×1 PNG http://proger.i-forge.net/%D0%9A%D0%BE%D0%BC%D0%BF%D1%8C%D1%8E%D1%82%D0%B5%D1%80/[20121112]%20The%20smallest%20transparent%20pixel.html
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAYAAACiCAYAAABiQbywAAAAKklEQVRYhe3JMQEAAAjDMMC/52EAARzp2XSS1NFcEwAAAAAAAAAAAD9gARW/BUBIVRRtAAAAAElFTkSuQmCC',
        'base64',
      ),
    ]);

    await writer.stop();

    const videoPathExists = await pathExists(savePath);
    expect(videoPathExists).toBe(true);
  });
});
