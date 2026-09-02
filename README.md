# local-crawler

A local-first content extraction and retrieval project built around a real-browser crawler and a PostgreSQL pgvector RAG flow. The repo combines a content extractor for local dev sites with a small vector search + answer generation pipeline that can index structured portfolio content and answer questions from it.

## What is in this repo?

This project currently includes two connected parts:

1. Local content extraction engine
   - crawls a local dev server by route
   - renders pages in a real browser
   - waits for DOM readiness or custom selectors
   - strips noise like scripts, nav, footer, hidden elements, and ignore markers
   - returns structured content such as headings, paragraphs, links, metadata, and normalized plain text

2. RAG module for local knowledge search
   - stores text chunks in PostgreSQL with pgvector
   - generates embeddings with a Hugging Face model
   - retrieves semantically similar chunks
   - uses an LLM response API to answer questions based on retrieved context

## Features

- Browser-based crawling with Playwright
- Local URL validation and route resolution
- Deterministic extraction markers using `data-site-content` and `data-site-content-ignore`
- Event-driven progress reporting for each page
- Unit and integration test coverage for crawler behavior
- PostgreSQL + pgvector for vector storage
- Embedding generation and semantic retrieval
- LLM-based response generation over retrieved context

## Install

```bash
npm install
npx playwright install chromium
```

For the database-backed RAG flow, start PostgreSQL with pgvector:

```bash
docker compose up -d postgres
```

> The Chromium download requires network access to the Playwright CDN. If you are in a restricted environment, install Chromium on a machine with outbound access and reuse the browser cache.

## Environment variables

Create a `.env` file if you want to use the RAG answer-generation flow:

```bash
DATABASE_URL=postgresql://raguser:ragpassword@localhost:5432/ragdb
DEEPSEEK_API_KEY=your_key_here
```

The database connection is used by the vector store in [src/rag-module/db/index.ts](src/rag-module/db/index.ts), and the LLM generation flow reads `DEEPSEEK_API_KEY` in [src/rag-module/llm/generation.ts](src/rag-module/llm/generation.ts).

## Quickstart: crawler

```ts
import { LocalCrawler } from "local-crawler";

const crawler = new LocalCrawler({
  baseUrl: "http://localhost:5173",
});

const result = await crawler.crawl(["/", "/pricing", "/talk"]);
console.log(result.successful, "of", result.total, "routes succeeded");

const page = await crawler.crawlPage("/pricing");
console.log(page.content);
```

### Custom extraction control

```html
<main data-site-content>
  <h1>Pricing</h1>
  <p>Choose the plan that works for you.</p>
  <div data-site-content-ignore>Internal UI that should not be extracted.</div>
</main>
```

- `data-site-content` marks the extraction root and overrides generic tag-based detection.
- `data-site-content-ignore` removes a subtree before extraction begins.

### Waiting for client-rendered content

```ts
new LocalCrawler({
  baseUrl: "http://localhost:5173",
  waitUntil: "domcontentloaded",
  extraction: {
    waitForSelector: "[data-app-ready]",
  },
});
```

### Progress events

```ts
crawler.on("page:start", ({ route }) => {});
crawler.on("page:complete", ({ route, result }) => {});
crawler.on("page:error", ({ route, error }) => {});
```

## Quickstart: RAG

The RAG pipeline is stored under [src/rag-module](src/rag-module) and is designed to answer questions using stored content chunks.

### 1) Ingest content

```bash
npx tsx src/rag-module/ingestion/ingest.ts
```

This reads [src/rag-module/content.json](src/rag-module/content.json), hashes each chunk, skips duplicates, generates embeddings, and inserts rows into the `chunks` table.

### 2) Search for relevant chunks

```ts
import { searchChunks } from "./src/rag-module/retrieval/search";

const results = await searchChunks("What are this person's backend skills?", 5);
console.log(results);
```

### 3) Ask a question using retrieved context

```ts
import { answerQuestion } from "./src/rag-module/rag/rag";

const answer = await answerQuestion("Who is this guy?");
console.log(answer);
```

The demo entry point for this flow is [test-app/test-rag.ts](test-app/test-rag.ts).

## Project structure

```text
src/
  extraction-module/
    config/
    crawler/
    extractor/
    types/
  rag-module/
    content.json
    db/
    embeddings/
    ingestion/
    llm/
    rag/
    retrieval/

test-app/
  crawler-test.ts
  pages.ts
  server.ts
  test-embedding.ts
  test-rag.ts
  test-search.ts

tests/
  integration/
  unit/
```

## Architecture

```text
LocalCrawler
  ├── RouteManager         resolves and validates local routes
  ├── BrowserManager      manages the single reused Chromium process
  ├── PageRenderer        navigates pages and handles readiness/timeout
  └── ContentExtractor
        ├── MainContentDetector
        ├── ContentCleaner
        └── ContentNormalizer

RAG flow
  ├── content.json         source content chunks
  ├── embedding.ts        Hugging Face BGE embeddings
  ├── ingest.ts           hash + insert + dedupe into Postgres
  ├── search.ts           similarity search against pgvector
  ├── rag.ts              retrieves context and asks the LLM
  └── generation.ts       DeepSeek/OpenAI-compatible answer generation
```

## Testing

```bash
npm run test-app
npm run test-crawler
```

```bash
npm run test:unit
npm run test:integration
npm test
```

### What the tests cover

- URL resolution and config validation
- text normalization and extraction heuristics
- static HTML fixture extraction
- browser-driven crawl behavior against the local test app
- content detection with ignore markers and hidden-node cleanup

## Notes

This repo is intentionally local-first and framework-agnostic. The crawler is designed to work against a running local dev server without depending on a specific app framework. The RAG portion is an example of how to turn extracted or curated content into a searchable memory layer. It is not a production-ready SaaS app, but it is a solid foundation for additional wrappers or tooling.

## Scripts

```bash
npm run build
npm run test
npm run test:unit
npm run test:integration
npm run test:watch
npm run db:generate
npm run db:migrate
npm run db:studio
npm run test-app
npm run test-crawler
```
