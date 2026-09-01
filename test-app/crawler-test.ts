import { LocalCrawler } from "../src/extraction-module/crawler/LocalCrawler";
import fs from "fs";
import path from "path";

(async () => {
  const crawler = new LocalCrawler({
    baseUrl: "http://localhost:5173",
  });

  const result = await crawler.crawl(["/"]);

  console.log(result.successful, "of", result.total, "routes succeeded");
  console.log("Crawl duration:", result.durationMs, "ms");
  console.log("Crawl results:", JSON.stringify(result, null, 2));

  const outputPath = path.join(process.cwd(), "stresultcrawls.txt");

  const output = {
    crawlDurationMs: result.durationMs,
    crawlResults: result,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`Crawl results saved to: ${outputPath}`);

  const page = await crawler.crawlPage("/");
  const outputPathe = path.join(process.cwd(), "stk1resultcrawlson1e.txt");

  fs.writeFileSync(outputPathe, page.content, "utf-8");

  console.log(page.content);
})();
