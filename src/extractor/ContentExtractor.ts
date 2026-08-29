import * as cheerio from "cheerio";
import { detectMainContent } from "./MainContentDetector";
import { cleanContent } from "./ContentCleaner";
import {
  buildNormalizedContent,
  dedupePreserveOrder,
  normalizeText,
} from "./ContentNormalizer";
import { ContentBlock, Heading, Link, PageContent } from "../types/PageResult";
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
      $('head meta[name="description"]').first().attr("content")?.trim() ||
      null;

    const root = detectMainContent($, options.contentSelector);
    cleanContent($, root, { ignoreSelectors: options.ignoreSelectors });

    const blocks = this.extractBlocks($, root, pageUrl, options);
    const headings = this.extractLegacyHeadings(blocks);
    const paragraphs = this.extractLegacyParagraphs(blocks);
    const links = this.extractLegacyLinks(blocks, options);
    const content = this.buildLegacyContent(blocks);

    return {
      title,
      description,
      blocks,
      headings,
      paragraphs,
      links,
      content,
    };
  }

  private extractBlocks(
    $: cheerio.CheerioAPI,
    root: cheerio.Cheerio<any>,
    pageUrl: string,
    options: ExtractionOptions,
  ): ContentBlock[] {
    const blocks: ContentBlock[] = [];
    const seenLinks = new Set<string>();

    const elements = root
      .find("h1, h2, h3, h4, h5, h6, p, li, a")
      .toArray()
      .filter((el) => {
        const tag = (el as any).tagName?.toLowerCase?.() ?? "";
        if (tag === "a") {
          const rawHref = $(el).attr("href");
          return (
            !!rawHref &&
            !rawHref.startsWith("#") &&
            !rawHref.startsWith("javascript:")
          );
        }
        return true;
      });

    const sorted = elements.sort((a, b) => {
      const aIndex = root.get().indexOf ? root.get().indexOf(a) : -1;
      const bIndex = root.get().indexOf ? root.get().indexOf(b) : -1;
      return aIndex - bIndex;
    });

    for (const el of sorted) {
      const tag = (el as any).tagName?.toLowerCase?.() ?? "";
      const text = normalizeText($(el).text());
      if (!text) continue;

      if (
        tag === "h1" ||
        tag === "h2" ||
        tag === "h3" ||
        tag === "h4" ||
        tag === "h5" ||
        tag === "h6"
      ) {
        if (options.includeHeadings === false) continue;
        const level = Number(tag.replace("h", "")) as 1 | 2 | 3 | 4 | 5 | 6;
        blocks.push({ type: "heading", level, text });
        continue;
      }

      if (tag === "p") {
        if (options.includeParagraphs === false) continue;
        blocks.push({ type: "paragraph", text });
        continue;
      }

      if (tag === "li") {
        const listItems = $(el)
          .parent()
          .children("li")
          .toArray()
          .map((item) => normalizeText($(item).text()))
          .filter((item): item is string => item !== null);

        if (listItems.length === 0) continue;

        const ordered = $(el).parent().is("ol");
        const existing = blocks[blocks.length - 1];
        if (
          existing &&
          existing.type === "list" &&
          existing.ordered === ordered
        ) {
          if (listItems.every((item) => !existing.items.includes(item))) {
            existing.items.push(...listItems);
          }
        } else {
          blocks.push({ type: "list", ordered, items: listItems });
        }
        continue;
      }

      if (tag === "a") {
        if (options.includeLinks === false) continue;
        const rawHref = $(el).attr("href");
        if (
          !rawHref ||
          rawHref.startsWith("#") ||
          rawHref.startsWith("javascript:")
        )
          continue;

        let href: string;
        try {
          href = new URL(rawHref, pageUrl).toString();
        } catch {
          continue;
        }

        const key = `${text}|${href}`;
        if (seenLinks.has(key)) continue;
        seenLinks.add(key);

        blocks.push({ type: "link", text, href });
      }
    }

    return blocks;
  }

  private extractLegacyHeadings(blocks: ContentBlock[]): Heading[] {
    return blocks
      .filter(
        (block): block is Extract<ContentBlock, { type: "heading" }> =>
          block.type === "heading",
      )
      .map(({ level, text }) => ({ level, text }));
  }

  private extractLegacyParagraphs(blocks: ContentBlock[]): string[] {
    return dedupePreserveOrder(
      blocks
        .filter(
          (block): block is Extract<ContentBlock, { type: "paragraph" }> =>
            block.type === "paragraph",
        )
        .map((block) => block.text),
    );
  }

  private extractLegacyLinks(
    blocks: ContentBlock[],
    options: ExtractionOptions,
  ): Link[] {
    if (options.includeLinks === false) return [];
    return blocks
      .filter(
        (block): block is Extract<ContentBlock, { type: "link" }> =>
          block.type === "link",
      )
      .map(({ text, href }) => ({ text, href }));
  }

  private buildLegacyContent(blocks: ContentBlock[]): string {
    const plain: string[] = [];
    for (const block of blocks) {
      if (block.type === "heading") plain.push(block.text);
      else if (block.type === "paragraph") plain.push(block.text);
      else if (block.type === "list") plain.push(block.items.join("\n"));
      else if (block.type === "link") plain.push(`${block.text} ${block.href}`);
    }
    return buildNormalizedContent(plain);
  }
}
