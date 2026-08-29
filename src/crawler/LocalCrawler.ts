import { EventEmitter } from "node:events";
import { BrowserManager } from "./BrowserManager";
import {
  PageRenderer,
  NavigationError,
  NavigationTimeoutError,
} from "./PageRenderer";
import { RouteManager } from "./RouteManager";
import { ContentExtractor } from "../extractor/ContentExtractor";
import {
  CrawlerOptions,
  ResolvedCrawlerOptions,
  resolveCrawlerOptions,
} from "../config/types";
import { PageResult } from "../types/PageResult";
import { CrawlResult } from "../types/CrawlResult";

export interface PageStartEvent {
  route: string;
}
export interface PageCompleteEvent {
  route: string;
  result: PageResult;
}
export interface PageErrorEvent {
  route: string;
  error: PageResult["error"];
}

/**
 * LocalCrawler
 *
 * The single public entry point for this package. Internally it wires
 * together RouteManager -> BrowserManager -> PageRenderer ->
 * ContentExtractor, but consumers only ever need this class.
 *
 * Emits "page:start" | "page:complete" | "page:error" so a future
 * CLI/dashboard can show progress without this class knowing about them.
 */
export class LocalCrawler extends EventEmitter {
  private readonly options: ResolvedCrawlerOptions;
  private readonly routeManager: RouteManager;
  private readonly browserManager: BrowserManager;
  private readonly renderer = new PageRenderer();
  private readonly extractor = new ContentExtractor();

  constructor(options: CrawlerOptions) {
    super();
    this.options = resolveCrawlerOptions(options);
    this.routeManager = new RouteManager(this.options.baseUrl);
    this.browserManager = new BrowserManager(this.options.logger);
  }

  /** Crawls a single route and returns its PageResult. Manages its own browser lifecycle. */
  async crawlPage(route: string): Promise<PageResult> {
    console.log(`Starting crawl of single route: ${route}`);
    await this.browserManager.launch();
    try {
      return await this.crawlOne(route);
    } finally {
      await this.browserManager.close();
    }
  }

  /** Crawls multiple routes sequentially, reusing a single browser instance. */
  async crawl(routes: string[]): Promise<CrawlResult> {
    const start = Date.now();
    const pages: PageResult[] = [];
    console.log(`Starting crawl of ${routes.length},  routes...`);
    console.log(routes);

    await this.browserManager.launch();
    try {
      // Sequential today by design (spec section 24) — a controlled
      // concurrency limiter can be layered on top of this loop later
      // without changing the per-route logic below.
      for (const route of routes) {
        const result = await this.crawlOne(route);
        pages.push(result);
      }
    } finally {
      await this.browserManager.close();
    }

    const successful = pages.filter((p) => p.status === "success").length;

    return {
      pages,
      total: pages.length,
      successful,
      failed: pages.length - successful,
      durationMs: Date.now() - start,
    };
  }

  async close(): Promise<void> {
    await this.browserManager.close();
  }

  private async crawlOne(route: string): Promise<PageResult> {
    this.emit("page:start", { route } satisfies PageStartEvent);
    const start = Date.now();
    const { url } = this.routeManager.resolve(route);

    let page;
    try {
      page = await this.browserManager.createPage();
    } catch (err) {
      const result = this.buildErrorResult(
        route,
        url,
        start,
        this.describeConnectionError(err),
      );
      this.emit("page:error", {
        route,
        error: result.error,
      } satisfies PageErrorEvent);
      return result;
    }

    try {
      const rendered = await this.renderer.render(page, url, {
        timeout: this.options.timeout,
        waitUntil: this.options.waitUntil,
        waitForSelector: this.options.extraction.waitForSelector,
      });

      if (rendered.httpStatus !== null && rendered.httpStatus >= 400) {
        const result = this.buildErrorResult(route, url, start, {
          message: `Route "${route}" returned HTTP ${rendered.httpStatus}.`,
          code: "HTTP_ERROR",
        });
        this.emit("page:error", {
          route,
          error: result.error,
        } satisfies PageErrorEvent);
        return result;
      }

      let html: string;
      try {
        html = await page.content();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const result = this.buildErrorResult(route, url, start, {
          message: `The page loaded successfully but content extraction failed: ${message}`,
          code: "EXTRACTION_FAILED",
        });
        this.emit("page:error", {
          route,
          error: result.error,
        } satisfies PageErrorEvent);
        return result;
      }

      let content;
      try {
        content = this.extractor.extract({
          html,
          pageUrl: rendered.url,
          options: this.options.extraction,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const result = this.buildErrorResult(route, url, start, {
          message: `The page loaded successfully but content extraction failed: ${message}`,
          code: "EXTRACTION_FAILED",
        });
        this.emit("page:error", {
          route,
          error: result.error,
        } satisfies PageErrorEvent);
        return result;
      }

      const result: PageResult = {
        route,
        url: rendered.url,
        status: "success",
        title: content.title,
        description: content.description,
        blocks: content.blocks,
        headings: content.headings,
        paragraphs: content.paragraphs,
        links: content.links,
        content: content.content,
        timing: { durationMs: Date.now() - start },
      };

      this.emit("page:complete", { route, result } satisfies PageCompleteEvent);
      return result;
    } catch (err) {
      const errorInfo = this.describeRenderError(err, route);
      const result = this.buildErrorResult(route, url, start, errorInfo);
      this.emit("page:error", {
        route,
        error: result.error,
      } satisfies PageErrorEvent);
      return result;
    } finally {
      await this.browserManager.releasePage(page);
    }
  }

  private describeRenderError(
    err: unknown,
    route: string,
  ): { message: string; code?: string } {
    if (err instanceof NavigationTimeoutError) {
      return { message: err.message, code: err.code };
    }
    if (err instanceof NavigationError) {
      return {
        message: this.describeConnectionError(err).message,
        code: err.code,
      };
    }
    const message = err instanceof Error ? err.message : String(err);
    return { message: `Failed to crawl route "${route}": ${message}` };
  }

  private describeConnectionError(err: unknown): {
    message: string;
    code?: string;
  } {
    const message = err instanceof Error ? err.message : String(err);
    if (/ECONNREFUSED|net::ERR_CONNECTION_REFUSED/i.test(message)) {
      return {
        message: `Unable to connect to ${this.options.baseUrl}. Make sure the local development server is running.`,
        code: "SERVER_UNAVAILABLE",
      };
    }
    return { message, code: "NAVIGATION_ERROR" };
  }

  private buildErrorResult(
    route: string,
    url: string,
    start: number,
    error: { message: string; code?: string },
  ): PageResult {
    return {
      route,
      url,
      status: "error",
      title: null,
      description: null,
      blocks: [],
      headings: [],
      paragraphs: [],
      links: [],
      content: "",
      timing: { durationMs: Date.now() - start },
      error,
    };
  }
}
