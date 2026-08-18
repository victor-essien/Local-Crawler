import * as cheerio from "cheerio";
import { detectMainContent } from "./MainContentDetector";
import { cleanContent } from "./ContentCleaner";
import { buildNormalizedContent, dedupePreserveOrder, normalizeText } from "./ContentNormalizer";
import { Heading, Link, PageContent } from "../types/PageResult";
import { ExtractionOptions } from "../config/types";

export interface ExtractInput {
  /** Full rendered HTML, e.g. from Playwright's page.content(). */
  html: string;
  /** URL the page was rendered at — used to resolve relative links. */
  pageUrl: string;
  options: ExtractionOptions;
}

const HEADING_SELECTOR = "h1, h2, h3, h4, h5, h6";
const BLOCK_SELECTOR = `${HEADING_SELECTOR}, p`;

/**
 * ContentExtractor
 *
 * Takes the final rendered HTML (already produced by the PageRenderer —
 * this class knows nothing about Playwright) and returns structured
 * PageContent. This is the deterministic, non-LLM extraction engine
 * described in spec section 30.
 */
export class ContentExtractor {
  extract(input: ExtractInput): PageContent {
    const { html, pageUrl, options } = input;
    const $ = cheerio.load(html);

    const title = normalizeText($("head > title").first().text() ?? "");
    const description =
      $('head meta[name="description"]').first().attr("content")?.trim() || null;

    const root = detectMainContent($, options.contentSelector);
    cleanContent($, root, { ignoreSelectors: options.ignoreSelectors });

    const headings = options.includeHeadings !== false ? this.extractHeadings($, root) : [];
    const paragraphs =
      options.includeParagraphs !== false ? this.extractParagraphs($, root) : [];
    const links = options.includeLinks !== false ? this.extractLinks($, root, pageUrl) : [];
    const content = this.buildContent($, root);

    return {
      title,
      description,
      headings,
      paragraphs,
      links,
      content,
    };
  }

  private extractHeadings($: cheerio.CheerioAPI, root: cheerio.Cheerio<any>): Heading[] {
    const headings: Heading[] = [];
    root.find(HEADING_SELECTOR).each((_, el) => {
      const tag = (el as any).tagName?.toLowerCase() ?? "";
      const level = Number(tag.replace("h", "")) || 0;
      const text = normalizeText($(el).text());
      if (text) headings.push({ level, text });
    });
    return headings;
  }

  private extractParagraphs($: cheerio.CheerioAPI, root: cheerio.Cheerio<any>): string[] {
    const texts: string[] = [];
    root.find("p").each((_, el) => {
      const text = normalizeText($(el).text());
      if (text) texts.push(text);
    });
    return dedupePreserveOrder(texts);
  }

  private extractLinks(
    $: cheerio.CheerioAPI,
    root: cheerio.Cheerio<any>,
    pageUrl: string
  ): Link[] {
    const links: Link[] = [];
    const seen = new Set<string>();

    root.find("a[href]").each((_, el) => {
      const rawHref = $(el).attr("href");
      const text = normalizeText($(el).text()) ?? "";
      if (!rawHref) return;
      if (rawHref.startsWith("#")) return; // in-page anchors carry no crawlable content
      if (rawHref.startsWith("javascript:")) return;
      if (!text) return; // avoid empty-text links (icon-only nav) unless there's a strong reason to keep them

      let href: string;
      try {
        href = new URL(rawHref, pageUrl).toString();
      } catch {
        return;
      }

      const key = `${text}|${href}`;
      if (seen.has(key)) return;
      seen.add(key);

      links.push({ text, href });
    });

    return links;
  }

  /**
   * Builds the normalized plain-text `content` field by walking headings
   * and paragraphs in document order, so structure is preserved rather
   * than headings-then-paragraphs being concatenated out of order.
   */
  private buildContent($: cheerio.CheerioAPI, root: cheerio.Cheerio<any>): string {
    const blocks: string[] = [];
    root.find(BLOCK_SELECTOR).each((_, el) => {
      const text = $(el).text();
      if (text && text.trim().length > 0) blocks.push(text);
    });
    return buildNormalizedContent(blocks);
  }
}
