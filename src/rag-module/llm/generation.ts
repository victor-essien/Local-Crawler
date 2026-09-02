import OpenAI from "openai";

const openai = new OpenAI({
 baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export async function generateAnswer(
  question: string,
  context: string
): Promise<string> {
  const response = await openai.responses.create({
    model: "gpt-5-mini",

    instructions: `
You are an AI assistant for a personal portfolio website.

Answer the user's question using ONLY the information
provided in the context.

If the context does not contain enough information to
answer the question, say that you don't have enough
information.

Do not invent or assume facts about the person.

Keep answers concise and natural.
`,

    input: `
Context:

${context}

User question:

${question}
`,
  });

  return response.output_text;
}
