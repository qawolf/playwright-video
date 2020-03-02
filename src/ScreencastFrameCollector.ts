import Debug from 'debug';
import { EventEmitter } from 'events';

const debug = Debug('playwright-video:FrameCollector');

// basically emits frames
// test that it emits frames given a page
export class FrameCollector extends EventEmitter {
  public static async create(): Promise<FrameCollector> {
    // this._client = await browser.pageTarget(this._page).createCDPSession();
  }

  // private _client: xxx

  protected constructor() {
    super();

    // this._client.on('Page.screencastFrame', payload => {
    //     this._client.send('Page.screencastFrameAck', {
    //       sessionId: payload.sessionId,
    //     });

    //     if (!payload.metadata.timestamp) {
    //       debug('skip frame without timestamp');
    //       return;
    //     }

    //     this.emit('frame', {
    //       data: Buffer.from(payload.data, 'base64'),
    //       timestamp: payload.metadata.timestamp,
    //       received: Date.now(),
    //     });
    //   });
  }

  public async start(): Promise<void> {
    // await this._client.send('Page.startScreencast', {
    //     everyNthFrame: 1,
    //   });
  }
}
