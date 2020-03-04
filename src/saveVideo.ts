import { Page } from 'playwright-core';
import { PageVideoCapture } from './PageVideoCapture';

interface SaveVideoArgs {
  page: Page;
  savePath: string;
}

export const saveVideo = ({
  page,
  savePath,
}: SaveVideoArgs): Promise<PageVideoCapture> => {
  return PageVideoCapture.start({ page, savePath });
};
