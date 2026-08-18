export { LocalCrawler } from "./crawler/LocalCrawler";
export type { PageStartEvent, PageCompleteEvent, PageErrorEvent } from "./crawler/LocalCrawler";

export type {
  CrawlerOptions,
  ExtractionOptions,
  Logger,
  WaitUntil,
} from "./config/types";

export type { PageResult, PageContent, Heading, Link, PageError, PageTiming } from "./types/PageResult";
export type { CrawlResult } from "./types/CrawlResult";

// Exposed for advanced consumers / the future CLI package, but the
// LocalCrawler class above is the only thing most users should need.
export { RouteManager, InvalidBaseUrlError, NonLocalUrlError } from "./crawler/RouteManager";
export { BrowserManager } from "./crawler/BrowserManager";
export { PageRenderer, NavigationError, NavigationTimeoutError } from "./crawler/PageRenderer";
export { ContentExtractor } from "./extractor/ContentExtractor";
