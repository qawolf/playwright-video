// import { join } from 'path';
import { BrowserContext, Page } from 'playwright-core';
import { forEachPage } from 'playwright-utils';
import { PageVideoCapture } from './PageVideoCapture';

interface CapturePageArgs {
  page: Page;
  savePath: string;
}

interface CaptureAllPagesArgs {
  context: BrowserContext;
  saveDir: string;
}

export const capturePage = ({
  page,
  savePath,
}: CapturePageArgs): Promise<PageVideoCapture> => {
  return PageVideoCapture.start({ page, savePath });
};

export const captureAllPages = ({ context }: CaptureAllPagesArgs): void => {
  let pageIndex = 0;

  console.log('SUP!');

  forEachPage(context, () => {
    console.log('PAGE', pageIndex);
    pageIndex++;
  });

  // forEachPage(context, async (page: Page) => {
  //   console.log('PAGE', pageIndex);
  //   const savePath = join(saveDir, `${pageIndex}.mp4`);
  //   await capturePage({ page, savePath });

  //   pageIndex++;
  // });
};
