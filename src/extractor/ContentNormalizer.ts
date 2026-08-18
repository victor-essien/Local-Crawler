/**
 * ContentNormalizer
 *
 * Pure text-normalization helpers. Kept separate from extraction/cleaning
 * so the rules for "what counts as clean text" live in one place and are
 * trivially unit-testable without a DOM.
 */

/** Collapses internal whitespace/newlines into single spaces and trims. */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Normalizes a single paragraph/heading/link-text value; returns null if empty after normalizing. */
export function normalizeText(text: string): string | null {
  const normalized = normalizeWhitespace(text);
  return normalized.length > 0 ? normalized : null;
}

/** Removes exact duplicate strings while preserving first-seen order. */
export function dedupePreserveOrder(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

/**
 * Builds the normalized plain-text `content` field from an ordered list of
 * text blocks (e.g. headings and paragraphs in document order), separating
 * them with blank lines so structure remains readable without collapsing
 * the page into a single run-on sentence (spec section 19).
 */
export function buildNormalizedContent(blocks: string[]): string {
  return blocks
    .map((block) => normalizeText(block))
    .filter((block): block is string => block !== null)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
