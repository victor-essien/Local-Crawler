# local-crawler

Core local-website content extraction engine. Given a base URL for a
**running local dev server** and a list of routes, it renders each route
in a real browser, waits for it to become ready, strips non-content
noise, and returns structured content (title, description, headings,
paragraphs, links, normalized plain text) for every route.

This is the core engine only — no CLI, no npm publishing, no dashboard.
Those are meant to be thin wrappers built on top of this later.

## Install

```bash
npm install
npx playwright install chromium   # downloads a Chromium build for rendering
```

> The Chromium download requires network access to `cdn.playwright.dev`.
> If you're running this inside a sandboxed environment with an
> egress allowlist, add that host (or run `playwright install` on a
> machine with normal internet access, then reuse the browser cache).

## Usage

```ts
import { LocalCrawler } from "local-crawler";

const crawler = new LocalCrawler({
  baseUrl: "http://localhost:5173",
});

const result = await crawler.crawl(["/", "/pricing", "/talk"]);
console.log(result.successful, "of", result.total, "routes succeeded");

const page = await crawler.crawlPage("/pricing");
console.log(page.content);
```

### Giving the extractor deterministic control

```html
<main data-site-content>
  <h1>Pricing</h1>
  <p>Choose the plan that works for you.</p>
  <div data-site-content-ignore>
    Internal UI that should not be extracted.
  </div>
</main>
```

`data-site-content` marks the extraction root (highest priority, above
`<main>`/`<article>`). `data-site-content-ignore` marks a subtree to
strip before extraction, regardless of where the root ends up.

### Waiting for client-side rendering

```ts
new LocalCrawler({
  baseUrl: "http://localhost:5173",
  waitUntil: "domcontentloaded", // default; avoid "networkidle" for apps with polling/websockets
  extraction: {
    waitForSelector: "[data-app-ready]",
  },
});
```

### Progress events

```ts
crawler.on("page:start", ({ route }) => {});
crawler.on("page:complete", ({ route, result }) => {});
crawler.on("page:error", ({ route, error }) => {});
```

## Architecture

```
LocalCrawler
   └── RouteManager      resolves + validates route -> absolute local URL
   └── BrowserManager     owns the single reused Chromium process
   └── PageRenderer        navigation + readiness/timeout handling
   └── ContentExtractor
          ├── MainContentDetector   [data-site-content] > main > article > body
          ├── ContentCleaner        strips scripts/styles/nav/footer/hidden/ignored
          └── ContentNormalizer     whitespace normalization, dedup, block joining
```

Rendering and extraction are deliberately decoupled: `ContentExtractor`
takes a plain HTML string (`page.content()` after rendering) and never
touches Playwright directly, so it's fully unit-testable without a
browser, and a future non-Playwright renderer could be swapped in
without touching extraction.

One Chromium instance is launched per `crawl()`/`crawlPage()` call and
reused across all routes; each route gets its own `BrowserContext` so
cookies/localStorage don't leak between routes.



## Testing

```bash
npm run test-app      # Start the development server
npm run test-crawler  # Start the local crawler
```

```bash
npm run test:unit          # pure logic — no browser required, run this first
npm run test:integration   # requires `npx playwright install chromium` and network access
npm test                   # everything
```

Unit tests cover URL resolution, config validation/defaults, text
normalization, and — most importantly — `ContentExtractor` against
static HTML fixtures (main-content detection priority, ignore markers,
hidden-element removal, heading/paragraph/link extraction, content
normalization).

Integration tests boot the fixture app in `test-app/` (`/`, `/pricing`,
`/about`, `/dynamic`, `/404`, plain Node `http`, no framework) and drive
`LocalCrawler` against it with a real browser: static pages, a
client-rendered page (`/dynamic`, content injected after a `setTimeout`),
multi-route crawls, a 404, a connection-refused case, a timeout, and
event emission.

## What's intentionally not here yet

npm publishing, a CLI, a dashboard, auth, concurrency beyond 1 (the
loop is already structured so a concurrency limiter can be layered on
without touching per-route logic), file/DB output, and LLM-based
extraction. See the design doc this was built from for the full list —
the point of this engine is to be a solid foundation those can wrap.
