import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { chunks } from "../db/schema";
import { generateEmbedding } from "../embeddings/embedding";


interface Chunk {
  content: string;

  metadata: {
    section?: string;
    category?: string;
    subsection?: string;
    type?: string;
    project?: string;
    technologies?: string[];
    topics?: string[];
    url?: string;
    source?: string;
  };
}


export function generateContentHash(content: string): string {
  return createHash("sha256")
    .update(content, "utf8")
    .digest("hex");
}


async function main() {
  const file = await fs.readFile("../local-crawler/src/rag-module/content.json", "utf-8");

  const data: Chunk[] = JSON.parse(file);

  console.log(`Found ${data.length} chunks`);

  for (const [index, chunk] of data.entries()) {
    console.log(`Embedding chunk ${index + 1}/${data.length}`);

    const contentHash = generateContentHash(chunk.content);

    const existing = await db
  .select({ id: chunks.id })
  .from(chunks)
  .where(eq(chunks.contentHash, contentHash))
  .limit(1);

  if (existing.length > 0) {
    console.log(`Chunk with hash ${contentHash} already exists`);
    continue;
  }

    const embedding = await generateEmbedding(chunk.content);

    await db.insert(chunks).values({
      content: chunk.content,
      contentHash,
      metadata: chunk.metadata,
      embedding,
    });
  }

  console.log("Ingestion complete");

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
