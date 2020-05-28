import { VideoFrameBuilder } from '../src/VideoFrameBuilder';

const buffer = Buffer.from('abc');
const buffer2 = Buffer.from('def');

const screencastFrame = {
  data: buffer,
  received: 1583187587800,
  timestamp: 1583187587,
};

const screencastFrame2 = {
  data: buffer2,
  received: 1583187587900,
  timestamp: 1583187588,
};

describe('VideoFrameBuilder', () => {
  it('returns empty array if no previous frame', () => {
    const frameBuilder = new VideoFrameBuilder();

    expect(frameBuilder.buildVideoFrames(screencastFrame)).toEqual([]);
  });

  it('returns array of previous frame with correct length', () => {
    const frameBuilder = new VideoFrameBuilder();
    frameBuilder.buildVideoFrames(screencastFrame);

    expect(frameBuilder.buildVideoFrames(screencastFrame2)).toEqual(
      Array(25).fill(buffer),
    );
  });
});
