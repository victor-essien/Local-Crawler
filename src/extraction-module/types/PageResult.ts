export interface Heading {
  level: number;
  text: string;
}

export interface Link {
  text: string;
  href: string;
}

export type ContentBlock =
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "link"; text: string; href: string };

export interface PageContent {
  title: string | null;
  description: string | null;
  blocks: ContentBlock[];
  /** @deprecated Use `blocks` instead. */
  headings: Heading[];
  /** @deprecated Use `blocks` instead. */
  paragraphs: string[];
  links: Link[];
  /** @deprecated Use `blocks` instead. */
  content: string;
  /** Sanitized HTML of the extraction root. Optional — not guaranteed in v1. */
  html?: string;
}

export type PageStatus = "success" | "error";

export interface PageError {
  message: string;
  code?: string;
}

export interface PageTiming {
  durationMs: number;
}

export interface PageResult {
  route: string;
  url: string;
  status: PageStatus;
  title: string | null;
  description: string | null;
  blocks: ContentBlock[];
  /** @deprecated Use `blocks` instead. */
  headings: Heading[];
  /** @deprecated Use `blocks` instead. */
  paragraphs: string[];
  links: Link[];
  /** @deprecated Use `blocks` instead. */
  content: string;
  html?: string;
  timing: PageTiming;
  error?: PageError;
}
