
import { searchChunks } from "../src/rag-module/retrieval/search";
async function main() {
  const question =
"Tell me about Victor's biography and professional background."    //

  const results = await searchChunks(question, 5);

  console.log("\nQUESTION:");
  console.log(question);

  console.log("\nRESULTS:");

  for (const [index, result] of results.entries()) {
    console.log(`\n--- Result ${index + 1} ---`);

    console.log("ID:", result.id);
    console.log("Similarity:", result.similarity);
    console.log("Content:", result.content);
    console.log("Metadata:", result.metadata);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
