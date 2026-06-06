import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import {
  getOpenAIClient,
  logOpenAIUsage,
  OPENAI_MODEL,
} from "@/lib/openai";
import {
  containsUnexpectedScript,
  MIN_ANSWERS,
  serializeHistory,
  sessionRequestSchema,
} from "@/lib/questionnaire";

export const runtime = "nodejs";

const reportSchema = z.object({
  primaryDirection: z.string().min(2).max(52),
  relatedCareers: z.array(z.string().min(2).max(100)).min(3).max(5),
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

    let validationFeedback = "";

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await getOpenAIClient().responses.parse({
        model: OPENAI_MODEL,
        store: false,
        reasoning: { effort: "none" },
        max_output_tokens: 1800,
        instructions: `Create an explainable career direction report from the questionnaire history.

This is reflective guidance, not a definitive assessment. Use only evidence in the answers. Do not invent traits, credentials, experience, or preferences. Do not diagnose personality, health, or mental state. Write only in clear English using the Latin alphabet. Never output Chinese, Japanese, Korean, Cyrillic, Arabic, emoji, or decorative symbols.

Consider the full labor market equally: retail, customer service, hospitality, food service, cleaning, facilities, logistics, transport, skilled trades, manufacturing, construction, agriculture, healthcare, care work, education, public service, administration, finance, sales, arts, media, law, science, entrepreneurship, management, technology, and other supported work. Cashier, shop assistant, server, receptionist, driver, warehouse worker, cleaner, caregiver, teacher, mechanic, electrician, and office administrator are all legitimate primary results. Never convert retail "front end" into frontend software development without explicit evidence of coding or digital interface work.

Interpret broad activities independently from work settings and career priorities. Problem-solving, making, organizing, helping, and creativity are cross-sector signals, not evidence of a technology career. Recommend technology only when the answers contain explicit technology-specific interest or experience.

The primaryDirection is a single recognizable occupation or concise career family:
- 2 to 5 words;
- no slash, ampersand, subtitle, explanation, or combined list;
- specific enough to search for as a job title;
- at most 52 characters.

Put 3 to 5 other relevant job titles in relatedCareers. These may be longer and should appear as quick possibilities near the primary title. Then provide exactly three more detailed alternatives with match values and explanations. Do not duplicate the primary title across those lists.

Explain the answer patterns supporting the result and acknowledge ambiguity. Confidence reflects evidence quality and consistency, not certainty about the person's future. Each signal must connect to an answer pattern. Each next step must be a small practical experiment, conversation, training topic, shadowing opportunity, or role comparison. The caveat must preserve user autonomy.
${validationFeedback}`,
        input: `Create the final report from these ${payload.history.length} answers:

${serializeHistory(payload.history)}`,
        text: {
          format: zodTextFormat(reportSchema, "career_direction_report"),
        },
      });

      const report = response.output_parsed;
      logOpenAIUsage("questionnaire.report", OPENAI_MODEL, response.usage);

      if (!report) {
        validationFeedback =
          "\nThe previous attempt returned no structured report. Return every required field.";
        continue;
      }

      const primaryWords = report.primaryDirection.trim().split(/\s+/).length;
      const allText = JSON.stringify(report);
      const normalizedPrimary = report.primaryDirection.trim().toLowerCase();
      const distinctRelatedCareers = new Set(
        report.relatedCareers.map((title) => title.trim().toLowerCase()),
      );

      if (containsUnexpectedScript(allText)) {
        validationFeedback =
          "\nThe previous report used a prohibited writing system. Regenerate entirely in English with Latin characters.";
        continue;
      }

      if (
        primaryWords > 5 ||
        /[/&:|]/.test(report.primaryDirection) ||
        report.relatedCareers.some(
          (title) => title.trim().toLowerCase() === normalizedPrimary,
        ) ||
        distinctRelatedCareers.size !== report.relatedCareers.length
      ) {
        validationFeedback =
          "\nThe previous primary title was too long, combined multiple roles, or duplicated another title. Use one distinct 2-to-5-word occupation.";
        continue;
      }

      return Response.json({ report });
    }

    throw new Error("The model could not produce a concise valid report.");
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
