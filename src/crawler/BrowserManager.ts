import { chromium, Browser, BrowserContext, Page } from "playwright";
import { Logger } from "../config/types";

/**
 * BrowserManager
 *
 * Owns the Playwright browser lifecycle. A single Chromium process is
 * launched once and reused across all routes in a crawl (see design
 * principle in section 25 of the spec) — the crawler never launches a
 * fresh browser per route.
 *
 * Each page gets its own BrowserContext so cookies/localStorage from one
 * route don't leak into another (section 26), without paying the cost of
 * a full browser relaunch.
 */
export class BrowserManager {
  private browser: Browser | null = null;
  private launching: Promise<Browser> | null = null;
  private readonly contexts = new Set<BrowserContext>();

  constructor(private readonly logger: Logger) {}

  async launch(): Promise<void> {
    await this.ensureBrowser();
  }

  private async ensureBrowser(): Promise<Browser> {
    if (this.browser) return this.browser;
    if (this.launching) return this.launching;

    this.launching = chromium
      .launch({ headless: true })
      .then((browser) => {
        this.browser = browser;
        this.logger.info("Chromium launched");
        return browser;
      })
      .finally(() => {
        this.launching = null;
      });

    return this.launching;
  }

  /** Creates an isolated page (its own context) for a single route. */
  async createPage(): Promise<Page> {
    const browser = await this.ensureBrowser();
    const context = await browser.newContext();
    this.contexts.add(context);
    const page = await context.newPage();
    return page;
  }

  /** Closes the context that owns this page, releasing its resources. */
  async releasePage(page: Page): Promise<void> {
    const context = page.context();
    this.contexts.delete(context);
    await context.close().catch(() => {
      // Context may already be closed (e.g. after a crash) — safe to ignore.
    });
  }

  async close(): Promise<void> {
    for (const context of this.contexts) {
      await context.close().catch(() => {});
    }
    this.contexts.clear();

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.logger.info("Chromium closed");
    }
  }
}
