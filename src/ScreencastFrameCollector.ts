import Debug from 'debug';
import { EventEmitter } from 'events';
import { Page } from 'playwright-core';
import { CRBrowser } from 'playwright-core/lib/chromium/crBrowser';
import { CRSession } from 'playwright-core/lib/chromium/crConnection';
import { ensureBrowserType } from './utils';

const debug = Debug('playwright-video:FrameCollector');

interface ConstructorArgs {
  browser: CRBrowser;
  page: Page;
}

export class ScreencastFrameCollector extends EventEmitter {
  public static async create(
    args: ConstructorArgs,
  ): Promise<ScreencastFrameCollector> {
    ensureBrowserType(args.browser);

    const collector = new ScreencastFrameCollector(args);

    await collector._buildClient(args.browser);
    collector._listenForFrames();

    return collector;
  }

  private _client: CRSession;
  private _page: Page;
  private _stopped = false;

  protected constructor({ page }: ConstructorArgs) {
    super();
    this._page = page;
  }

  private async _buildClient(browser: CRBrowser): Promise<void> {
    this._client = await browser.pageTarget(this._page).createCDPSession();
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
