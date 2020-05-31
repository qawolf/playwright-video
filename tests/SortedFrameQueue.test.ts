import { SortedFrameQueue } from '../src/SortedFrameQueue';

const buffer1 = Buffer.from('abc');
const buffer2 = Buffer.from('def');
const buffer3 = Buffer.from('ghi');
const buffer4 = Buffer.from('jkl');
const buffer5 = Buffer.from('mno');

const screencastFrame1 = {
  data: buffer1,
  received: 1583187587500,
  timestamp: 1583187587,
};

const screencastFrame2 = {
  data: buffer2,
  received: 1583187587600,
  timestamp: 1583187588,
};

const screencastFrame3 = {
  data: buffer3,
  received: 1583187587700,
  timestamp: 1583187589,
};

const screencastFrame4 = {
  data: buffer4,
  received: 1583187587800,
  timestamp: 1583187590,
};

const screencastFrame5 = {
  data: buffer5,
  received: 1583187587900,
  timestamp: 1583187591,
};

describe('SortedFrameQueue', () => {
  it('inserts the first frame correctly', () => {
    const frameQueue = new SortedFrameQueue();
    frameQueue.insert(screencastFrame1);

    expect(frameQueue._frames).toEqual([screencastFrame1]);
  });

  it('inserts correctly if frames are sent in order', () => {
    const frameQueue = new SortedFrameQueue();
    frameQueue.insert(screencastFrame1);
    frameQueue.insert(screencastFrame2);
    frameQueue.insert(screencastFrame3);

    expect(frameQueue._frames).toEqual([
      screencastFrame1,
      screencastFrame2,
      screencastFrame3,
    ]);
  });

  it('inserts correctly if frames are sent out of order', () => {
    const frameQueue = new SortedFrameQueue();
    frameQueue.insert(screencastFrame1);
    frameQueue.insert(screencastFrame3);
    frameQueue.insert(screencastFrame2);

    expect(frameQueue._frames).toEqual([
      screencastFrame1,
      screencastFrame2,
      screencastFrame3,
    ]);
  });

  it('emits half of the frames when the maximum size is reached', async () => {
    const frameQueue = new SortedFrameQueue(4);
    frameQueue.insert(screencastFrame1);
    frameQueue.insert(screencastFrame2);
    frameQueue.insert(screencastFrame4);
    frameQueue.insert(screencastFrame3);

    expect(frameQueue._frames).toEqual([
      screencastFrame1,
      screencastFrame2,
      screencastFrame3,
      screencastFrame4,
    ]);

    const framesPromise = new Promise((resolve) => {
      frameQueue.once('sortedframes', (payload) => {
        expect(payload).toEqual([screencastFrame1, screencastFrame2]);
        resolve();
      });
    });

    frameQueue.insert(screencastFrame5);

    await framesPromise;

    expect(frameQueue._frames).toEqual([
      screencastFrame3,
      screencastFrame4,
      screencastFrame5,
    ]);
  });

  it('emits all remaining frames when drained', async () => {
    const frameQueue = new SortedFrameQueue(4);
    frameQueue.insert(screencastFrame1);
    frameQueue.insert(screencastFrame2);
    frameQueue.insert(screencastFrame3);

    const framesPromise = new Promise((resolve) => {
      frameQueue.once('sortedframes', (payload) => {
        expect(payload).toEqual([
          screencastFrame1,
          screencastFrame2,
          screencastFrame3,
          screencastFrame4,
        ]);
        resolve();
      });
    });

    frameQueue.insert(screencastFrame4);
    frameQueue.drain();

    await framesPromise;

    expect(frameQueue._frames).toEqual([]);
  });
});
