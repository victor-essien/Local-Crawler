import { db } from "../db";
import { generateEmbedding } from "../embeddings/embedding";
import {sql} from "drizzle-orm";


export async function searchChunks(
  question: string,
  limit = 5
) {
  const queryEmbedding =
    await generateEmbedding(question);

  const vector = `[${queryEmbedding.join(",")}]`;

  const results = await db.execute(sql`
    SELECT
      id,
      content,
      metadata,
      1 - (embedding <=> ${vector}::vector)
        AS similarity
    FROM chunks
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${vector}::vector
    LIMIT ${limit}
  `);

  return results;
}