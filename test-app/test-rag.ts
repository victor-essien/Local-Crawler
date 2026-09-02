import { answerQuestion } from "../src/rag-module/rag/rag";

async function main() {
  const question = "Who is this guy?";

  const answer = await answerQuestion(question);

  console.log("\nQUESTION:");
  console.log(question);

  console.log("\nANSWER:");
  console.log(answer);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
