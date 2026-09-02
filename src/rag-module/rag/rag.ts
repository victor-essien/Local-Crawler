import { searchChunks } from "../retrieval/search";
import { generateAnswer } from "../llm/generation";

export async function answerQuestion(
  question: string
): Promise<string> {
  // 1. Retrieve relevant chunks
  const results = await searchChunks(question, 5);

  // 2. Build context
  const context = results
    .map((result, index) => {
      return `
[Source ${index + 1}]

${result.content}
`;
    })
    .join("\n");

  // 3. Ask the LLM
  const answer = await generateAnswer(
    question,
    context
  );

  return answer;
}
