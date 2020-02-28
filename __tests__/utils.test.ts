import * as utils from '../src/utils';

const { getFfmpegPath } = utils;

afterAll(() => jest.restoreAllMocks());

describe('getFfmpegPath', () => {
  it('returns FFMPEG_PATH environment variable if set', () => {
    process.env.FFMPEG_PATH = 'ffmpeg/path';

    const path = getFfmpegPath();
    expect(path).toBe('ffmpeg/path');

    process.env.FFMPEG_PATH = '';
  });

  it('returns ffmpeg-static path if installed', () => {
    jest
      .spyOn(utils, 'getFfmpegFromModule')
      .mockReturnValue('ffmpeg-static/path');

    const path = getFfmpegPath();
    expect(path).toBe('ffmpeg-static/path');
  });

  it('returns null when no path is found', () => {
    jest.spyOn(utils, 'getFfmpegFromModule').mockReturnValue(null);

    const path = getFfmpegPath();
    expect(path).toBeNull();
  });
});
