import type { Page } from 'playwright';
import { CaptureOptions, PageVideoCapture } from './PageVideoCapture';

export const saveVideo = (
  page: Page,
  savePath: string,
  options?: CaptureOptions,
): Promise<PageVideoCapture> => {
  return PageVideoCapture.start({ page, savePath, options });
};
