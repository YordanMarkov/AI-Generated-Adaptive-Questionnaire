import OpenAI from "openai";

export const OPENAI_MODEL =
  process.env.OPENAI_MODEL?.trim() || "gpt-5.4-mini";

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({ apiKey });
}
