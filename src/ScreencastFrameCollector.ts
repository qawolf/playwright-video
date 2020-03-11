import Debug from 'debug';
import { EventEmitter } from 'events';
import { ChromiumBrowserContext, Page } from 'playwright-core';
import { CRSession } from 'playwright-core/lib/chromium/crConnection';
import { ensurePageType } from './utils';

const debug = Debug('playwright-video:ScreencastFrameCollector');

export class ScreencastFrameCollector extends EventEmitter {
  public static async create(page: Page): Promise<ScreencastFrameCollector> {
    ensurePageType(page);

    const collector = new ScreencastFrameCollector(page);

    await collector._buildClient();
    collector._listenForFrames();

    return collector;
  }

  // public for tests
  public _client: CRSession;
  private _page: Page;
  private _stopped = false;

  protected constructor(page: Page) {
    super();
    this._page = page;
  }

  private async _buildClient(): Promise<void> {
    const context = this._page.context() as ChromiumBrowserContext;
    this._client = await context.createSession(this._page);
  }

  private _listenForFrames(): void {
    this._client.on('Page.screencastFrame', async payload => {
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
        // capture error so it does not propagate to the use
        await ackPromise;
      } catch (e) {
        // nothing we can do
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

  public async stop(): Promise<void> {
    if (this._stopped) return;

    debug('stopping');

    this._stopped = true;

    if (this._client._connection) {
      debug('detaching client');
      await this._client.detach();
      debug('client detached');
    }

    debug('stopped');
  }
}
