import { PageResult } from "./PageResult";

export interface CrawlResult {
  pages: PageResult[];
  total: number;
  successful: number;
  failed: number;
  durationMs: number;
}
