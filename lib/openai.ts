import OpenAI from "openai";

export const OPENAI_MODEL =
  process.env.OPENAI_MODEL?.trim() || "gpt-5.4-mini";

type ResponseUsage = {
  input_tokens: number;
  output_tokens: number;
  input_tokens_details?: { cached_tokens?: number } | null;
  output_tokens_details?: { reasoning_tokens?: number } | null;
};

const modelPrices: Record<
  string,
  { input: number; cachedInput: number; output: number }
> = {
  "gpt-5.4-mini": { input: 0.75, cachedInput: 0.075, output: 4.5 },
  "gpt-5.4-nano": { input: 0.2, cachedInput: 0.02, output: 1.25 },
  "gpt-5-nano": { input: 0.05, cachedInput: 0.005, output: 0.4 },
};

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({ apiKey });
}

export function logOpenAIUsage(
  operation: string,
  model: string,
  usage: ResponseUsage | null | undefined,
) {
  if (!usage) return;

  const cachedTokens = usage.input_tokens_details?.cached_tokens ?? 0;
  const uncachedTokens = Math.max(0, usage.input_tokens - cachedTokens);
  const prices = modelPrices[model];
  const estimatedCost = prices
    ? (uncachedTokens * prices.input +
        cachedTokens * prices.cachedInput +
        usage.output_tokens * prices.output) /
      1_000_000
    : null;

  console.info(
    JSON.stringify({
      event: "openai_usage",
      operation,
      model,
      inputTokens: usage.input_tokens,
      cachedInputTokens: cachedTokens,
      outputTokens: usage.output_tokens,
      reasoningTokens:
        usage.output_tokens_details?.reasoning_tokens ?? 0,
      estimatedCostUsd:
        estimatedCost === null
          ? null
          : Number(estimatedCost.toFixed(6)),
    }),
  );
}
