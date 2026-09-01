import { describe, it, expect } from "vitest";
import {
  normalizeWhitespace,
  normalizeText,
  dedupePreserveOrder,
  buildNormalizedContent,
} from "../../src/extraction-module/extractor/ContentNormalizer";

describe("normalizeWhitespace", () => {
  it("collapses newlines and repeated spaces", () => {
    expect(normalizeWhitespace("Build\n  better\n\tproducts.")).toBe(
      "Build better products.",
    );
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeWhitespace("   hello world   ")).toBe("hello world");
  });
});

describe("normalizeText", () => {
  it("returns null for whitespace-only input", () => {
    expect(normalizeText("   \n\t  ")).toBeNull();
  });

  it("returns normalized text for real content", () => {
    expect(normalizeText("  hi there  ")).toBe("hi there");
  });
});

describe("dedupePreserveOrder", () => {
  it("removes exact duplicates while preserving order", () => {
    expect(dedupePreserveOrder(["a", "b", "a", "c", "b"])).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("buildNormalizedContent", () => {
  it("joins blocks with blank lines and drops empty ones", () => {
    const result = buildNormalizedContent([
      "Simple pricing",
      "",
      "  Choose the plan  ",
      "\n",
    ]);
    expect(result).toBe("Simple pricing\n\nChoose the plan");
  });

  it("never collapses everything into one line", () => {
    const result = buildNormalizedContent([
      "Heading",
      "Paragraph one.",
      "Paragraph two.",
    ]);
    expect(result.split("\n\n")).toEqual([
      "Heading",
      "Paragraph one.",
      "Paragraph two.",
    ]);
  });
});
