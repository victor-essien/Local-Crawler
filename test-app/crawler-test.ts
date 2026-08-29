import { LocalCrawler } from "../src/crawler/LocalCrawler";
  import fs from "fs";
import path from "path"

(async () => {
 const crawler = new LocalCrawler({
    baseUrl: "http://localhost:8080",
  });

  const result = await crawler.crawl([
    "/",
    "/shop",
    "/about",
    "/sustainability"
  ]);

  console.log(
    result.successful,
    "of",
    result.total,
    "routes succeeded"
  );
  // console.log("Crawl duration:", result.durationMs, "ms");
  // console.log("Crawl results:", JSON.stringify(result, null, 2));

  
const outputPath = path.join(process.cwd(), "resultcrawls.txt");

const output = {
  crawlDurationMs: result.durationMs,
  crawlResults: result,
};

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");

console.log(`Crawl results saved to: ${outputPath}`);

  const page = await crawler.crawlPage("/pricing");

  console.log(page.content);
})();