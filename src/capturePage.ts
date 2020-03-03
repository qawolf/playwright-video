import { Page } from 'playwright-core';
import { PageVideoCapture } from './PageVideoCapture';

interface CapturePageArgs {
  page: Page;
  savePath: string;
}

export const capturePage = async ({
  page,
  savePath,
}: CapturePageArgs): Promise<PageVideoCapture> => {
  return PageVideoCapture.start({ page, savePath });
};
