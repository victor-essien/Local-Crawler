import { describe, it, expect } from "vitest";
import {
  resolveCrawlerOptions,
  DEFAULT_TIMEOUT,
  DEFAULT_WAIT_UNTIL,
} from "../../src/extraction-module/config/types";

describe("resolveCrawlerOptions", () => {
  it("applies sensible defaults when only baseUrl is given", () => {
    const resolved = resolveCrawlerOptions({
      baseUrl: "http://localhost:5173",
    });
    expect(resolved.timeout).toBe(DEFAULT_TIMEOUT);
    expect(resolved.waitUntil).toBe(DEFAULT_WAIT_UNTIL);
    expect(resolved.extraction.includeLinks).toBe(true);
    expect(resolved.extraction.includeHeadings).toBe(true);
    expect(resolved.extraction.includeParagraphs).toBe(true);
    expect(resolved.extraction.ignoreSelectors).toEqual([]);
    expect(resolved.concurrency).toBe(1);
  });

  it("preserves explicitly provided values", () => {
    const resolved = resolveCrawlerOptions({
      baseUrl: "http://localhost:5173",
      timeout: 5000,
      waitUntil: "networkidle",
      extraction: { contentSelector: "#app", includeLinks: false },
    });
    expect(resolved.timeout).toBe(5000);
    expect(resolved.waitUntil).toBe("networkidle");
    expect(resolved.extraction.contentSelector).toBe("#app");
    expect(resolved.extraction.includeLinks).toBe(false);
  });

  it("rejects a missing baseUrl", () => {
    // @ts-expect-error intentionally omitting required field
    expect(() => resolveCrawlerOptions({})).toThrow();
  });

  it("rejects unknown top-level options", () => {
    expect(() =>
      // @ts-expect-error intentionally passing an unknown option
      resolveCrawlerOptions({ baseUrl: "http://localhost:5173", bogus: true }),
    ).toThrow();
  });

  it("rejects a negative timeout", () => {
    expect(() =>
      resolveCrawlerOptions({ baseUrl: "http://localhost:5173", timeout: -1 }),
    ).toThrow();
  });
});
