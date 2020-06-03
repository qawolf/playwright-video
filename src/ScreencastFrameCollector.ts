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
  private _stoppedTimestamp: number;
  private _endedPromise: Promise<void>;

  protected constructor(page: Page) {
    super();
    this._page = page;
  }

  private async _buildClient(): Promise<void> {
    const context = this._page.context() as ChromiumBrowserContext;
    this._client = await context.newCDPSession(this._page);
  }

  private _listenForFrames(): void {
    this._endedPromise = new Promise((resolve) => {
      this._client.on('Page.screencastFrame', async (payload) => {
        if (!payload.metadata.timestamp) {
          debug('skipping frame without timestamp');
          return;
        }

        if (this._stoppedTimestamp && payload.metadata.timestamp > this._stoppedTimestamp) {
          debug('all frames received');
          resolve();
          return;
        }

        debug(`received frame with timestamp ${payload.metadata.timestamp}`);

        const ackPromise = this._client.send('Page.screencastFrameAck', {
          sessionId: payload.sessionId,
        });

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

    // Make sure stopping takes no longer than 1s in cases when the screencast API
    // doesn't emit frames all the way up to the stopped timestamp.
    await Promise.race([
      this._endedPromise,
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ]);

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
