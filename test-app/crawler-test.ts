import { LocalCrawler } from "../src/crawler/LocalCrawler";

(async () => {
  const crawler = new LocalCrawler({
    baseUrl: "http://localhost:4173",
  });

  const result = await crawler.crawl([
    "/",
    "/pricing",
    "/about",
    "/dynamic",
    "/404",
  ]);

  console.log(
    result.successful,
    "of",
    result.total,
    "routes succeeded"
  );
  console.log("Crawl duration:", result.durationMs, "ms");
  console.log("Crawl results:", JSON.stringify(result, null, 2));

  const page = await crawler.crawlPage("/pricing");

  console.log(page.content);
})();