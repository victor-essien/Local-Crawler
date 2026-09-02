import {pipeline} from "@huggingface/transformers";


const MODEL =
  "onnx-community/bge-small-en-v1.5-ONNX";

let extractor: any;

async function getExtractor() {
  if (!extractor) {
    extractor = await pipeline(
      "feature-extraction",
      MODEL
    );
  }

  return extractor;
}

export async function generateEmbedding(
  text: string
): Promise<number[]> {
  const model = await getExtractor();

  const output = await model(text, {
    pooling: "cls",
    normalize: true,
  });

  return Array.from(output.data);
}