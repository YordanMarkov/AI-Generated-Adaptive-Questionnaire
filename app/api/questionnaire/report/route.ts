import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { getOpenAIClient, OPENAI_MODEL } from "@/lib/openai";
import {
  MIN_ANSWERS,
  serializeHistory,
  sessionRequestSchema,
} from "@/lib/questionnaire";

export const runtime = "nodejs";

const reportSchema = z.object({
  primaryDirection: z.string().min(1).max(120),
  confidence: z.number().int().min(1).max(100),
  confidenceLabel: z.string().min(1).max(40),
  summary: z.string().min(1).max(420),
  reasoning: z.string().min(1).max(900),
  signals: z.array(z.string().min(1).max(240)).length(3),
  alternatives: z
    .array(
      z.object({
        title: z.string().min(1).max(100),
        match: z.number().int().min(1).max(99),
        explanation: z.string().min(1).max(260),
      }),
    )
    .length(3),
  nextSteps: z.array(z.string().min(1).max(260)).length(3),
  caveat: z.string().min(1).max(280),
});

export async function POST(request: Request) {
  try {
    const payload = sessionRequestSchema.parse(await request.json());

    if (payload.history.length < MIN_ANSWERS) {
      return Response.json(
        { error: "More answers are needed before creating a report." },
        { status: 400 },
      );
    }

    const response = await getOpenAIClient().responses.parse({
      model: OPENAI_MODEL,
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 3000,
      instructions: `Create an explainable career direction report from the questionnaire history.

This is reflective guidance, not a definitive assessment. Use only evidence in the answers. Do not invent traits, credentials, experience, or preferences. Do not diagnose personality, health, or mental state.

Choose one useful primary direction, plus exactly three meaningfully distinct alternatives. Explain the answer patterns that support the primary direction and acknowledge ambiguity. Confidence should reflect evidence quality and consistency, not certainty about the person's future.

Each signal must be a concise, user-friendly statement linked to an answer pattern. Each next step must be a small, practical experiment such as a project, conversation, course topic, or role comparison. The caveat must explicitly preserve user autonomy.`,
      input: `Create the final report from these ${payload.history.length} answers:

${serializeHistory(payload.history)}`,
      text: {
        format: zodTextFormat(reportSchema, "career_direction_report"),
      },
    });

    if (!response.output_parsed) {
      throw new Error("The model did not return a structured report.");
    }

    return Response.json({ report: response.output_parsed });
  } catch (error) {
    console.error("Career report generation failed:", error);
    return Response.json(
      {
        error: "We couldn't create your report right now. Please try again.",
      },
      { status: 500 },
    );
  }
}
