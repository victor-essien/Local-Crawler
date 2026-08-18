export interface Heading {
  level: number;
  text: string;
}

export interface Link {
  text: string;
  href: string;
}

export interface PageContent {
  title: string | null;
  description: string | null;
  headings: Heading[];
  paragraphs: string[];
  links: Link[];
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
  headings: Heading[];
  paragraphs: string[];
  links: Link[];
  content: string;
  html?: string;
  timing: PageTiming;
  error?: PageError;
}
