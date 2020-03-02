import { FrameCollector } from './FrameCollector';
import { FrameSequencer } from './FrameSequencer';
import { VideoWriter } from './VideoWriter';

export class VideoCapture {
  public static async create(): Promise<void> {
    // do await
    const collector = new FrameCollector();
    const sequencer = new FrameSequencer();

    collector.on('screencastframe', screencastFrame => {
      // repeat based on frame time
      const videoFrames = sequencer.buildVideoFrames(screencastFrame);
      // writer.write(videoFrames);
    });

    // TODO if no argument is passed, return Date.now() - lastFrame.received * fps
    // const videoFrames = sequencer.buildVideoFrames();
    // writer.write(videoFrames);
  }

  constructor() {}
}
