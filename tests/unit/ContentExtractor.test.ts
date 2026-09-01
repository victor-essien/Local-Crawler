import { describe, it, expect } from "vitest";
import { ContentExtractor } from "../../src/extraction-module/extractor/ContentExtractor";
import { resolveCrawlerOptions } from "../../src/extraction-module/config/types";

const extractor = new ContentExtractor();
const defaultExtractionOptions = resolveCrawlerOptions({
  baseUrl: "http://localhost:5173",
}).extraction;

function extract(
  html: string,
  pageUrl = "http://localhost:5173/pricing",
  options = defaultExtractionOptions,
) {
  return extractor.extract({ html, pageUrl, options });
}

describe("ContentExtractor — metadata", () => {
  it("extracts title and description", () => {
    const html = `<!DOCTYPE html><html><head>
      <title>Pricing</title>
      <meta name="description" content="Simple pricing for developers" />
    </head><body><main><h1>Pricing</h1></main></body></html>`;

    const result = extract(html);
    expect(result.title).toBe("Pricing");
    expect(result.description).toBe("Simple pricing for developers");
  });

  it("returns null (not an error) when metadata is missing", () => {
    const html = `<html><head></head><body><main><h1>Hi</h1></main></body></html>`;
    const result = extract(html);
    expect(result.title).toBeNull();
    expect(result.description).toBeNull();
  });
});

describe("ContentExtractor — main content detection", () => {
  it("prefers [data-site-content] over <main>", () => {
    const html = `<html><body>
      <main><h1>Wrong content</h1></main>
      <div data-site-content><h1>Right content</h1><p>Correct paragraph.</p></div>
    </body></html>`;
    const result = extract(html);
    expect(result.headings[0].text).toBe("Right content");
    expect(result.paragraphs).toEqual(["Correct paragraph."]);
  });

  it("falls back to <main> when no marker is present", () => {
    const html = `<html><body>
      <nav><a href="/">nav link</a></nav>
      <main><h1>Main heading</h1><p>Main paragraph.</p></main>
    </body></html>`;
    const result = extract(html);
    expect(result.headings[0].text).toBe("Main heading");
  });

  it("falls back to <article> when there is no <main>", () => {
    const html = `<html><body><article><h1>Article heading</h1></article></body></html>`;
    const result = extract(html);
    expect(result.headings[0].text).toBe("Article heading");
  });

  it("falls back to <body> when nothing else matches", () => {
    const html = `<html><body><h1>Body heading</h1><p>Body paragraph.</p></body></html>`;
    const result = extract(html);
    expect(result.headings[0].text).toBe("Body heading");
    expect(result.paragraphs).toEqual(["Body paragraph."]);
  });

  it("honors an explicit contentSelector override", () => {
    const html = `<html><body>
      <main><h1>Not this</h1></main>
      <section id="app"><h1>This one</h1></section>
    </body></html>`;
    const result = extract(html, "http://localhost:5173/pricing", {
      ...defaultExtractionOptions,
      contentSelector: "#app",
    });
    expect(result.headings[0].text).toBe("This one");
  });
});

describe("ContentExtractor — cleaning", () => {
  it("removes data-site-content-ignore blocks", () => {
    const html = `<html><body><main data-site-content>
      <h1>Keep me</h1>
      <div data-site-content-ignore><p>Should be removed.</p></div>
      <p>Should stay.</p>
    </main></body></html>`;
    const result = extract(html);
    expect(result.paragraphs).toEqual(["Should stay."]);
    expect(result.content).not.toContain("Should be removed");
  });

  it("removes script, style, noscript, template, and iframe tags", () => {
    const html = `<html><body><main data-site-content>
      <h1>Title</h1>
      <script>window.evil = true;</script>
      <style>.x{color:red}</style>
      <noscript>fallback</noscript>
      <template><p>template content</p></template>
      <iframe src="https://ads.example.com"></iframe>
      <p>Real paragraph.</p>
    </main></body></html>`;
    const result = extract(html);
    expect(result.paragraphs).toEqual(["Real paragraph."]);
    expect(result.content).not.toMatch(/evil|fallback|template content/);
  });

  it("removes nav and footer chrome inside the extraction root", () => {
    const html = `<html><body><main data-site-content>
      <nav><a href="/">Home nav link</a></nav>
      <h1>Real heading</h1>
      <p>Real paragraph.</p>
      <footer><p>Footer noise.</p></footer>
    </main></body></html>`;
    const result = extract(html);
    expect(result.content).not.toContain("Footer noise");
    expect(result.paragraphs).toEqual(["Real paragraph."]);
  });

  it("does not remove <header>, since it may hold the real page heading", () => {
    const html = `<html><body><main data-site-content>
      <header><h1>Heading inside header</h1></header>
      <p>Body paragraph.</p>
    </main></body></html>`;
    const result = extract(html);
    expect(result.headings[0].text).toBe("Heading inside header");
  });

  it("removes elements hidden via display:none, visibility:hidden, or [hidden]", () => {
    const html = `<html><body><main data-site-content>
      <p style="display:none">Hidden via display none.</p>
      <p style="visibility: hidden;">Hidden via visibility.</p>
      <p hidden>Hidden via attribute.</p>
      <p>Visible paragraph.</p>
    </main></body></html>`;
    const result = extract(html);
    expect(result.paragraphs).toEqual(["Visible paragraph."]);
  });

  it("respects additional developer-provided ignoreSelectors", () => {
    const html = `<html><body><main data-site-content>
      <p class="cookie-banner">Accept cookies</p>
      <p>Real content.</p>
    </main></body></html>`;
    const result = extract(html, "http://localhost:5173/pricing", {
      ...defaultExtractionOptions,
      ignoreSelectors: [".cookie-banner"],
    });
    expect(result.paragraphs).toEqual(["Real content."]);
  });
});

describe("ContentExtractor — headings", () => {
  it("extracts headings with correct levels, in document order", () => {
    const html = `<html><body><main data-site-content>
      <h1>Simple pricing</h1>
      <h2>Choose your plan</h2>
      <h3>FAQ</h3>
    </main></body></html>`;
    const result = extract(html);
    expect(result.headings).toEqual([
      { level: 1, text: "Simple pricing" },
      { level: 2, text: "Choose your plan" },
      { level: 3, text: "FAQ" },
    ]);
  });

  it("can be disabled via includeHeadings: false", () => {
    const html = `<html><body><main data-site-content><h1>Title</h1></main></body></html>`;
    const result = extract(html, "http://localhost:5173/pricing", {
      ...defaultExtractionOptions,
      includeHeadings: false,
    });
    expect(result.headings).toEqual([]);
  });
});

describe("ContentExtractor — paragraphs", () => {
  it("normalizes internal whitespace", () => {
    const html = `<html><body><main data-site-content>
      <p>
        Build
        better
        products.
      </p>
    </main></body></html>`;
    const result = extract(html);
    expect(result.paragraphs).toEqual(["Build better products."]);
  });

  it("deduplicates identical paragraph text", () => {
    const html = `<html><body><main data-site-content>
      <p>We build tools for local developers.</p>
      <p>We build tools for local developers.</p>
    </main></body></html>`;
    const result = extract(html);
    expect(result.paragraphs).toEqual(["We build tools for local developers."]);
  });

  it("excludes empty paragraphs", () => {
    const html = `<html><body><main data-site-content>
      <p></p>
      <p>   </p>
      <p>Real paragraph.</p>
    </main></body></html>`;
    const result = extract(html);
    expect(result.paragraphs).toEqual(["Real paragraph."]);
  });
});

describe("ContentExtractor — links", () => {
  it("resolves relative hrefs to absolute URLs", () => {
    const html = `<html><body><main data-site-content>
      <a href="/pricing">View pricing</a>
    </main></body></html>`;
    const result = extract(html, "http://localhost:5173/");
    expect(result.links).toEqual([
      { text: "View pricing", href: "http://localhost:5173/pricing" },
    ]);
  });

  it("excludes links with empty text and in-page anchors", () => {
    const html = `<html><body><main data-site-content>
      <a href="#section"></a>
      <a href="/pricing"></a>
      <a href="/about">About</a>
    </main></body></html>`;
    const result = extract(html);
    expect(result.links).toEqual([
      { text: "About", href: "http://localhost:5173/about" },
    ]);
  });

  it("can be disabled via includeLinks: false", () => {
    const html = `<html><body><main data-site-content><a href="/x">X</a></main></body></html>`;
    const result = extract(html, "http://localhost:5173/pricing", {
      ...defaultExtractionOptions,
      includeLinks: false,
    });
    expect(result.links).toEqual([]);
  });
});

describe("ContentExtractor — content field", () => {
  it("preserves heading/paragraph structure with blank-line separation", () => {
    const html = `<html><body><main data-site-content>
      <h1>Simple pricing</h1>
      <h2>Choose your plan</h2>
      <p>Start building for free.</p>
    </main></body></html>`;
    const result = extract(html);
    expect(result.content).toBe(
      "Simple pricing\n\nChoose your plan\n\nStart building for free.",
    );
  });

  it("never collapses the page into a single unreadable line", () => {
    const html = `<html><body><main data-site-content>
      <h1>A</h1><p>B</p><h2>C</h2><p>D</p>
    </main></body></html>`;
    const result = extract(html);
    expect(result.content.split("\n\n").length).toBeGreaterThan(1);
  });
});
