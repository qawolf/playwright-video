import { Page } from 'playwright-core';
import { PageVideoCapture } from './PageVideoCapture';

interface CapturePageArgs {
  page: Page;
  savePath: string;
}

export const capturePage = ({
  page,
  savePath,
}: CapturePageArgs): Promise<PageVideoCapture> => {
  return PageVideoCapture.start({ page, savePath });
};
