import type { Ai } from "@cloudflare/workers-types";

// bge-m3 dense embedding dimension; must match versions.embedding vector(1024).
export const EMBEDDING_DIMENSIONS = 1024;

const EMBEDDING_MODEL = "@cf/baai/bge-m3";

// bge-m3 handles ~8192 tokens; cap the input by characters (roughly four chars
// per token, kept conservative) so a long body can't exceed the model context.
const MAX_EMBED_CHARS = 16_000;

// The text embedded for a guide version: title, then description, then body.
// Title and description carry the most signal so they lead; the body fills out
// the rest of the budget and is truncated to fit the model's context.
export function buildEmbedText(input: {
  title: string;
  description: string | null;
  bodyText: string;
}): string {
  const parts = [input.title, input.description ?? "", input.bodyText].filter(
    (part) => part.length > 0,
  );
  return parts.join("\n\n").slice(0, MAX_EMBED_CHARS);
}

// Minimal view of the Workers AI binding for the one model we call. We cast
// through this rather than rely on @cloudflare/workers-types' per-model run
// overloads, which vary by version and would make the call fragile across type
// upgrades; the runtime contract (text in, dense vectors in `data`) is stable.
interface EmbeddingRunner {
  run(
    model: typeof EMBEDDING_MODEL,
    input: { text: string[]; pooling?: "cls" | "mean" },
  ): Promise<{ data: number[][] }>;
}

// Embeds one text into a 1024-dim vector via Workers AI bge-m3. Runs inside our
// own infra, so the text (including a reader's raw query on the search path)
// never leaves the boundary. cls pooling must match on the document and query
// sides or the cosine distances are meaningless.
export async function embedText(ai: Ai, text: string): Promise<number[]> {
  const runner = ai as unknown as EmbeddingRunner;
  const result = await runner.run(EMBEDDING_MODEL, { text: [text], pooling: "cls" });
  const vector = result.data.at(0);
  if (vector?.length !== EMBEDDING_DIMENSIONS) {
    throw new Error("bge-m3 returned an unexpected embedding shape");
  }
  return vector;
}
