import type { CheerioAPI, Cheerio } from "cheerio";
import type { AnyNode } from "domhandler";

/**
 * MainContentDetector
 *
 * Determines which part of the DOM represents the page's meaningful
 * content, per the priority order in spec section 11:
 *
 *   [data-site-content] > <main> > <article> > semantic sections > <body>
 *
 * A developer-provided `contentSelector` (config) or `[data-site-content]`
 * marker always wins — it gives developers deterministic control over
 * extraction quality (section 12).
 */

const SEMANTIC_FALLBACK_SELECTORS = ['[role="main"]', "#content", "#main", ".content", ".main"];

export function detectMainContent(
  $: CheerioAPI,
  contentSelector?: string
): Cheerio<AnyNode> {
  if (contentSelector) {
    const explicit = $(contentSelector).first();
    if (explicit.length > 0) return explicit;
  }

  const marked = $("[data-site-content]").first();
  if (marked.length > 0) return marked;

  const main = $("main").first();
  if (main.length > 0) return main;

  const article = $("article").first();
  if (article.length > 0) return article;

  for (const selector of SEMANTIC_FALLBACK_SELECTORS) {
    const candidate = $(selector).first();
    if (candidate.length > 0) return candidate;
  }

  return $("body").first();
}
