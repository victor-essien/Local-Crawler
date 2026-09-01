export { LocalCrawler } from "./extraction-module/crawler/LocalCrawler";
export type {
  PageStartEvent,
  PageCompleteEvent,
  PageErrorEvent,
} from "./extraction-module/crawler/LocalCrawler";

export type {
  CrawlerOptions,
  ExtractionOptions,
  Logger,
  WaitUntil,
} from "./extraction-module/config/types";

export type {
  PageResult,
  PageContent,
  Heading,
  Link,
  ContentBlock,
  PageError,
  PageTiming,
} from "./extraction-module/types/PageResult";
export type { CrawlResult } from "./extraction-module/types/CrawlResult";

// Exposed for advanced consumers / the future CLI package, but the
// LocalCrawler class above is the only thing most users should need.
export {
  RouteManager,
  InvalidBaseUrlError,
  NonLocalUrlError,
} from "./extraction-module/crawler/RouteManager";
export { BrowserManager } from "./extraction-module/crawler/BrowserManager";
export {
  PageRenderer,
  NavigationError,
  NavigationTimeoutError,
} from "./extraction-module/crawler/PageRenderer";
export { ContentExtractor } from "./extraction-module/extractor/ContentExtractor";
