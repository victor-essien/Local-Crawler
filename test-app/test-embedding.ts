import { generateEmbedding } from "../src/rag-module/embeddings/embedding"

async function main() {
  const text =
    "He enjoys building reliable backend systems.";

  const embedding = await generateEmbedding(text);

  console.log("Dimensions:", embedding.length);

  console.log(
    "First 10 values:",
    embedding.slice(0, 10)
  );
}

main();
