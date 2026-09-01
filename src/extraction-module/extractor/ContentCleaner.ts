import type { CheerioAPI, Cheerio } from "cheerio";
import type { AnyNode } from "domhandler";

/** Elements that never carry meaningful page content (spec section 13). */
const ALWAYS_REMOVE_SELECTORS = ["script", "style", "noscript", "template", "iframe"];

/**
 * Non-content chrome to strip when it appears inside the extraction root.
 * Intentionally excludes `header`, since some sites put the primary <h1>
 * inside a page header — blindly removing it would drop real content.
 */
const CHROME_SELECTORS = ["nav", "footer"];

const IGNORE_MARKER_SELECTOR = "[data-site-content-ignore]";

export interface CleanOptions {
  ignoreSelectors?: string[];
}

/**
 * Mutates and returns the given root, stripping scripts/styles/iframes,
 * nav/footer chrome, developer-marked ignore blocks, extra developer
 * selectors, and elements that are clearly hidden.
 */
export function cleanContent(
  $: CheerioAPI,
  root: Cheerio<AnyNode>,
  options: CleanOptions = {}
): Cheerio<AnyNode> {
  const selectorsToStrip = [
    ...ALWAYS_REMOVE_SELECTORS,
    ...CHROME_SELECTORS,
    IGNORE_MARKER_SELECTOR,
    ...(options.ignoreSelectors ?? []),
  ];

  for (const selector of selectorsToStrip) {
    root.find(selector).remove();
  }

  removeHiddenElements($, root);

  return root;
}

function removeHiddenElements($: CheerioAPI, root: Cheerio<AnyNode>): void {
  root.find("*").each((_, el) => {
    const node = $(el);
    if (isHidden(node)) {
      node.remove();
    }
  });

  // The root itself could theoretically be hidden (developer marked
  // data-site-content on a display:none debug node) — leave it be in that
  // case rather than removing the entire extraction target; that's a
  // developer authoring issue, not something we should silently mask.
}

function isHidden(node: Cheerio<AnyNode>): boolean {
  if (node.attr("hidden") !== undefined) return true;

  const style = (node.attr("style") ?? "").toLowerCase().replace(/\s+/g, "");
  if (style.includes("display:none")) return true;
  if (style.includes("visibility:hidden")) return true;

  const ariaHidden = node.attr("aria-hidden");
  if (ariaHidden === "true") return true;

  return false;
}
