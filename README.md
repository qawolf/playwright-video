# playwright-video

[![npm version](https://badge.fury.io/js/playwright-video.svg)](https://badge.fury.io/js/playwright-video) ![Unit Tests](https://github.com/qawolf/playwright-video/workflows/Unit%20Tests/badge.svg)

🎬 Save a video recording of a [Playwright](https://github.com/microsoft/playwright) page (Chromium only for now)

When Playwright adds support for the Screencast API in Firefox and WebKit, this will be updated to support these browsers.

## Install

```sh
npm i playwright playwright-video @ffmpeg-installer/ffmpeg
```

If you already have [FFmpeg](https://www.ffmpeg.org) installed, you can skip the `@ffmpeg-installer/ffmpeg` installation by setting the `FFMPEG_PATH` environment variable.

```sh
npm i playwright playwright-video
```

## Use

```js
const { chromium } = require('playwright');
const { saveVideo } = require('playwright-video');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await saveVideo(page, '/tmp/video.mp4');
  await page.goto('http://example.org');
  await page.click('a');

  await browser.close();
})();
```

The video will be saved at the specified `savePath` (`/tmp/video.mp4` in the above example).

## API

#### playwright-video.saveVideo(page, savePath[, options])

- `page` <[Page]> Save a video of this page. Only supports Chromium for now.
- `savePath` <[string]> Where to save the video.
- `options` <[Object]>
  - `followPopups` <[boolean]> Whether or not to follow browser focus when popups are opened. Defaults to `false`. Note: this option will only work correctly if the popups opened are the same size as the original page. If a smaller or larger popup is open, frames will be scaled to fit the original size.
  - `fps` <[number]> The frames per second for the recording. Defaults to `25`. A higher number will improve the recording quality but also increase the file size.
- returns: <[Promise]<[PageVideoCapture](#class-pagevideocapture)>>

Records video of a page and saves it at the specified path.

```js
await saveVideo(page, '/tmp/video.mp4');
```

### class: PageVideoCapture

A `PageVideoCapture` is created when you call `saveVideo`. It manages capturing the video of your page and saving it.

### pageVideoCapture.stop()

- returns <[Promise]>

Stop the video capture if needed and save the video. The returned `Promise` resolves when the video is saved.

The video capture will be stopped automatically if you close the page, so you should not need to call this unless you want to explicitly wait until the video is saved.

```js
const capture = await saveVideo(page, '/tmp/video.mp4');
await capture.stop();
```

[object]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object 'Object'
[page]: https://github.com/microsoft/playwright/blob/master/docs/api.md#class-page 'Page'
[promise]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise 'Promise'
[string]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type 'string'
