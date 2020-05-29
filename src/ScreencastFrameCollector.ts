import Debug from 'debug';
import { EventEmitter } from 'events';
import { CDPSession, ChromiumBrowserContext, Page } from 'playwright-core';
import { ensurePageType } from './utils';

const debug = Debug('pw-video:ScreencastFrameCollector');

export interface ScreencastFrame {
  data: Buffer;
  received: number;
  timestamp: number;
}

export class ScreencastFrameCollector extends EventEmitter {
  public static async create(page: Page): Promise<ScreencastFrameCollector> {
    ensurePageType(page);

    const collector = new ScreencastFrameCollector(page);

    await collector._buildClient();
    collector._listenForFrames();

    return collector;
  }

  // public for tests
  public _client: CDPSession;
  private _page: Page;
  private _stoppedTimestamp;

  protected constructor(page: Page) {
    super();
    this._page = page;
  }

  private async _buildClient(): Promise<void> {
    const context = this._page.context() as ChromiumBrowserContext;
    this._client = await context.newCDPSession(this._page);
  }

  private _listenForFrames(): void {
    this._client.on('Page.screencastFrame', async (payload) => {
      debug(`received frame with timestamp ${payload.metadata.timestamp}`);

      const ackPromise = this._client.send('Page.screencastFrameAck', {
        sessionId: payload.sessionId,
      });

      if (!payload.metadata.timestamp) {
        debug('skip frame without timestamp');
        return;
      }

      this.emit('screencastframe', {
        data: Buffer.from(payload.data, 'base64'),
        received: Date.now(),
        timestamp: payload.metadata.timestamp,
      });

      try {
        // capture error so it does not propagate to the user
        // most likely it is due to the page closing
        await ackPromise;
      } catch (e) {
        debug('error sending screencastFrameAck %j', e.message);
      }
    });
  }

  public async start(): Promise<void> {
    debug('start');

    await this._client.send('Page.startScreencast', {
      everyNthFrame: 1,
    });
  }

  public async stop(): Promise<number> {
    if (this._stoppedTimestamp) {
      throw new Error(
        'pw-video: Cannot call stop twice on the same capture.',
      );
    }

    this._stoppedTimestamp = Date.now() / 1000;
    debug(`stopping screencast at ${this._stoppedTimestamp}`);

    // Screencast API takes time to send frames
    // Wait 1s for frames to arrive
    // TODO figure out a better pattern for this
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      debug('detaching client');
      await this._client.detach();
    } catch (e) {
      debug('error detaching client', e.message);
    }

    debug('stopped');

    return this._stoppedTimestamp;
  }
}
