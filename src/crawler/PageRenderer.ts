import { Page } from "playwright";
import { WaitUntil } from "../config/types";

export interface RenderResult {
  page: Page;
  url: string;
  /** HTTP status of the main navigation response, if available. */
  httpStatus: number | null;
  duration: number;
}

export class NavigationError extends Error {
  code = "NAVIGATION_ERROR";
}

export class NavigationTimeoutError extends Error {
  code = "NAVIGATION_TIMEOUT";
}

export interface RenderOptions {
  timeout: number;
  waitUntil: WaitUntil;
  waitForSelector?: string;
}

/**
 * PageRenderer
 *
 * Navigates a Playwright page to a URL, waits for it to become
 * "sufficiently ready" per the configured strategy, and hands back the
 * rendered page. This is deliberately separate from ContentExtractor
 * (see spec section 35) so extraction never has to know how the page
 * came to be rendered — today that's Playwright/Chromium, but the seam
 * would allow an alternate renderer later without touching extraction.
 */
export class PageRenderer {
  async render(page: Page, url: string, options: RenderOptions): Promise<RenderResult> {
    const start = Date.now();

    let httpStatus: number | null = null;
    try {
      const response = await page.goto(url, {
        waitUntil: options.waitUntil,
        timeout: options.timeout,
      });
      httpStatus = response?.status() ?? null;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/timeout/i.test(message)) {
        throw new NavigationTimeoutError(
          `Navigation to "${url}" exceeded the configured timeout of ${options.timeout}ms.`
        );
      }
      throw new NavigationError(`Unable to navigate to "${url}": ${message}`);
    }

    // Navigation completing doesn't mean the app has finished rendering —
    // client-side apps often paint well after `load`/`domcontentloaded`.
    // If the developer told us what to wait for, honor that explicitly.
    if (options.waitForSelector) {
      try {
        await page.waitForSelector(options.waitForSelector, {
          timeout: options.timeout,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new NavigationTimeoutError(
          `Waited for selector "${options.waitForSelector}" on "${url}" but it never appeared ` +
            `within ${options.timeout}ms: ${message}`
        );
      }
    }

    return {
      page,
      url,
      httpStatus,
      duration: Date.now() - start,
    };
  }
}
