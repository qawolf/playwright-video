import Debug from 'debug';
import { EventEmitter } from 'events';
import { ChromiumBrowserContext, Page } from 'playwright-core';
import { CRSession } from 'playwright-core/lib/chromium/crConnection';
import { ensurePageType } from './utils';

const debug = Debug('playwright-video:FrameCollector');

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
    this._client.on('Page.screencastFrame', payload => {
      debug(`received frame with timestamp ${payload.metadata.timestamp}`);

      this._client.send('Page.screencastFrameAck', {
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

    debug('stop');
    this._stopped = true;
    // Screencast API takes time to send frames
    // Wait 1s for frames to arrive
    // TODO figure out a better pattern for this
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (this._client._connection) {
      await this._client.detach();
    }
  }
}
