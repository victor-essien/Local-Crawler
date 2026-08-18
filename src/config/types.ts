import { z } from "zod";

/**
 * Playwright navigation readiness conditions we support.
 * "networkidle" is intentionally not the default — long-running requests,
 * websockets, and analytics beacons can keep a page from ever going idle.
 */
export type WaitUntil = "domcontentloaded" | "load" | "networkidle";

export interface ExtractionOptions {
  /** CSS selector to use as the extraction root, overriding auto-detection. */
  contentSelector?: string;
  /** Additional selectors to strip from the DOM before extraction, beyond the built-in defaults. */
  ignoreSelectors?: string[];
  /** If set, the renderer waits for this selector to appear before extraction runs. */
  waitForSelector?: string;
  includeLinks?: boolean;
  includeHeadings?: boolean;
  includeParagraphs?: boolean;
}

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export interface CrawlerOptions {
  baseUrl: string;
  timeout?: number;
  waitUntil?: WaitUntil;
  extraction?: ExtractionOptions;
  /** Reserved for future use — sequential (1) is the only supported value today. */
  concurrency?: number;
  logger?: Logger;
}

/** Fully-resolved options after defaults have been applied. */
export interface ResolvedCrawlerOptions {
  baseUrl: string;
  timeout: number;
  waitUntil: WaitUntil;
  extraction: Required<Omit<ExtractionOptions, "contentSelector" | "waitForSelector">> &
    Pick<ExtractionOptions, "contentSelector" | "waitForSelector">;
  concurrency: number;
  logger: Logger;
}

export const DEFAULT_TIMEOUT = 30000;
export const DEFAULT_WAIT_UNTIL: WaitUntil = "domcontentloaded";
export const DEFAULT_CONCURRENCY = 1;

export const noopLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

const extractionOptionsSchema = z
  .object({
    contentSelector: z.string().min(1).optional(),
    ignoreSelectors: z.array(z.string().min(1)).optional(),
    waitForSelector: z.string().min(1).optional(),
    includeLinks: z.boolean().optional(),
    includeHeadings: z.boolean().optional(),
    includeParagraphs: z.boolean().optional(),
  })
  .strict();

export const crawlerOptionsSchema = z
  .object({
    baseUrl: z.string().min(1, "baseUrl is required"),
    timeout: z.number().int().positive().optional(),
    waitUntil: z.enum(["domcontentloaded", "load", "networkidle"]).optional(),
    extraction: extractionOptionsSchema.optional(),
    concurrency: z.number().int().min(1).max(1).optional(), // sequential-only for now, see section 24
    logger: z
      .object({
        info: z.function(),
        warn: z.function(),
        error: z.function(),
      })
      .optional(),
  })
  .strict();

export function resolveCrawlerOptions(options: CrawlerOptions): ResolvedCrawlerOptions {
  const parsed = crawlerOptionsSchema.parse(options);

  return {
    baseUrl: parsed.baseUrl,
    timeout: parsed.timeout ?? DEFAULT_TIMEOUT,
    waitUntil: parsed.waitUntil ?? DEFAULT_WAIT_UNTIL,
    extraction: {
      contentSelector: parsed.extraction?.contentSelector,
      ignoreSelectors: parsed.extraction?.ignoreSelectors ?? [],
      waitForSelector: parsed.extraction?.waitForSelector,
      includeLinks: parsed.extraction?.includeLinks ?? true,
      includeHeadings: parsed.extraction?.includeHeadings ?? true,
      includeParagraphs: parsed.extraction?.includeParagraphs ?? true,
    },
    concurrency: parsed.concurrency ?? DEFAULT_CONCURRENCY,
    logger: (parsed.logger as Logger | undefined) ?? noopLogger,
  };
}
