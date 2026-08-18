/**
 * Integration tests: these boot the fixture HTTP server from test-app/
 * and drive a real Chromium instance via LocalCrawler.
 *
 * Requires Playwright's Chromium browser to be installed:
 *   npx playwright install chromium
 *
 * These are NOT run as part of `npm run test:unit` — see test:integration
 * in package.json.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { LocalCrawler } from "../../src/crawler/LocalCrawler";

const PORT = 4174;
const BASE_URL = `http://localhost:${PORT}`;

let server: Server;

beforeAll(async () => {
  process.env.PORT = String(PORT);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("../../test-app/server.js");
  server = mod.server;
  await new Promise<void>((resolve) => server.listen(PORT, resolve));
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("LocalCrawler — static pages", () => {
  it("crawls a single static route end to end", async () => {
    const crawler = new LocalCrawler({ baseUrl: BASE_URL });
    const result = await crawler.crawlPage("/pricing");

    expect(result.status).toBe("success");
    expect(result.title).toBe("Pricing");
    expect(result.description).toBe("Simple pricing for developers");
    expect(result.headings).toEqual([
      { level: 1, text: "Simple pricing" },
      { level: 2, text: "Choose your plan" },
    ]);
    expect(result.paragraphs).toEqual(["Start building for free."]);
    expect(result.links).toEqual([{ text: "Get started", href: `${BASE_URL}/signup` }]);
    expect(result.content).toContain("Simple pricing");
    expect(result.timing.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("respects data-site-content and data-site-content-ignore on the homepage", async () => {
    const crawler = new LocalCrawler({ baseUrl: BASE_URL });
    const result = await crawler.crawlPage("/");

    expect(result.status).toBe("success");
    expect(result.content).not.toContain("explicitly marked as ignored");
    expect(result.content).not.toContain("hidden and must be excluded");
    expect(result.content).not.toContain("Footer link");
    expect(result.paragraphs).toContain("Second visible paragraph on the homepage.");
  });

  it("falls back to <article> when there's no data-site-content marker", async () => {
    const crawler = new LocalCrawler({ baseUrl: BASE_URL });
    const result = await crawler.crawlPage("/about");

    expect(result.status).toBe("success");
    expect(result.headings[0]).toEqual({ level: 1, text: "About us" });
    // Duplicate paragraph text should be deduplicated.
    expect(result.paragraphs).toEqual(["We build tools for local developers."]);
  });
});

describe("LocalCrawler — client-rendered pages", () => {
  it("waits for a client-rendered selector before extracting", async () => {
    const crawler = new LocalCrawler({
      baseUrl: BASE_URL,
      extraction: { waitForSelector: '[data-ready="true"]' },
    });
    const result = await crawler.crawlPage("/dynamic");

    expect(result.status).toBe("success");
    expect(result.headings).toEqual([{ level: 1, text: "Dynamically rendered heading" }]);
    expect(result.content).toContain("injected client-side after a delay");
  });
});

describe("LocalCrawler — multi-route crawl", () => {
  it("crawls multiple routes sequentially and reuses one browser", async () => {
    const crawler = new LocalCrawler({ baseUrl: BASE_URL });
    const result = await crawler.crawl(["/", "/pricing", "/about"]);

    expect(result.total).toBe(3);
    expect(result.successful).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.pages.map((p) => p.route)).toEqual(["/", "/pricing", "/about"]);
  });

  it("does not let one failing route crash the whole crawl", async () => {
    const crawler = new LocalCrawler({ baseUrl: BASE_URL });
    const result = await crawler.crawl(["/pricing", "/404", "/about"]);

    expect(result.total).toBe(3);
    expect(result.successful).toBe(2);
    expect(result.failed).toBe(1);

    const failed = result.pages.find((p) => p.route === "/404");
    expect(failed?.status).toBe("error");
    expect(failed?.error?.message).toContain("404");
  });
});

describe("LocalCrawler — error handling", () => {
  it("reports a clean error when the dev server is unavailable", async () => {
    const crawler = new LocalCrawler({ baseUrl: "http://localhost:59999", timeout: 3000 });
    const result = await crawler.crawlPage("/");

    expect(result.status).toBe("error");
    expect(result.error?.message).toMatch(/Unable to connect|localhost:59999/);
  });

  it("reports a timeout without crashing", async () => {
    const crawler = new LocalCrawler({
      baseUrl: BASE_URL,
      timeout: 50, // unrealistically low on purpose
      extraction: { waitForSelector: "[data-never-appears]" },
    });
    const result = await crawler.crawlPage("/dynamic");

    expect(result.status).toBe("error");
    expect(result.error?.code).toBe("NAVIGATION_TIMEOUT");
  });

  it("emits page:start / page:complete / page:error events", async () => {
    const crawler = new LocalCrawler({ baseUrl: BASE_URL });
    const events: string[] = [];
    crawler.on("page:start", () => events.push("start"));
    crawler.on("page:complete", () => events.push("complete"));
    crawler.on("page:error", () => events.push("error"));

    await crawler.crawl(["/pricing", "/404"]);

    expect(events).toEqual(["start", "complete", "start", "error"]);
  });
});
