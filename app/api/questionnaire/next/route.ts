import { randomUUID } from "node:crypto";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { getOpenAIClient, OPENAI_MODEL } from "@/lib/openai";
import {
  CONFIDENCE_THRESHOLD,
  MAX_ANSWERS,
  MIN_ANSWERS,
  questionSchema,
  serializeHistory,
  sessionRequestSchema,
  type Question,
} from "@/lib/questionnaire";

export const runtime = "nodejs";

const generatedQuestionSchema = z.object({
  eyebrow: z.string().min(1).max(80),
  title: z.string().min(1).max(180),
  description: z.string().min(1).max(320),
  type: z.enum(["choice", "slider", "text", "ranking", "yes-no"]),
  options: z.array(z.string().min(1).max(120)).max(6),
  minLabel: z.string().min(1).max(80).nullable(),
  maxLabel: z.string().min(1).max(80).nullable(),
  reason: z.string().min(1).max(240),
});

const assessmentSchema = z.object({
  confidence: z.number().min(0).max(1),
  enoughInformation: z.boolean(),
  sessionSummary: z.string().min(1).max(500),
  exploredDimensions: z.array(
    z.enum([
      "interests",
      "skills",
      "values",
      "motives",
      "work_style",
      "work_environment",
    ]),
  ),
  leadingDirections: z.array(z.string().min(1).max(100)).min(1).max(4),
  questions: z.array(generatedQuestionSchema).length(2),
});

function normalizeQuestion(
  generated: z.infer<typeof generatedQuestionSchema>,
): Question {
  const optionTypes = new Set(["choice", "ranking", "yes-no"]);
  const options = optionTypes.has(generated.type)
    ? generated.options.slice(0, generated.type === "yes-no" ? 3 : 5)
    : undefined;

  if (optionTypes.has(generated.type) && (!options || options.length < 2)) {
    throw new Error(`Generated ${generated.type} question has too few options.`);
  }

  return questionSchema.parse({
    id: `adaptive-${randomUUID()}`,
    eyebrow: generated.eyebrow,
    title: generated.title,
    description: generated.description,
    type: generated.type,
    options,
    minLabel:
      generated.type === "slider"
        ? generated.minLabel || "Not at all"
        : undefined,
    maxLabel:
      generated.type === "slider"
        ? generated.maxLabel || "Very strongly"
        : undefined,
    personalized: true,
  });
}

export async function POST(request: Request) {
  try {
    const payload = sessionRequestSchema.parse(await request.json());
    const answeredCount = payload.history.length;

    if (answeredCount >= MAX_ANSWERS) {
      return Response.json({
        shouldStop: true,
        confidence: 1,
        summary: "The maximum questionnaire length has been reached.",
        leadingDirections: [],
        questions: [],
      });
    }

    const response = await getOpenAIClient().responses.parse({
      model: OPENAI_MODEL,
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 2200,
      instructions: `You design an adaptive career direction questionnaire.

The questionnaire is a reflective guidance tool, not a psychological test. Base every conclusion only on the supplied answers. Do not infer protected, medical, mental-health, or demographic traits.

Evaluate these career dimensions: interests, perceived skills, values, motives, preferred work style, and preferred work environment. Career directions may include software engineering specialties, UX/UI, data/AI, cybersecurity, product, management, entrepreneurship, service-oriented work, creative work, and other plausible domains supported by the answers.

Generate exactly two useful follow-up questions. They must:
- add information not already answered;
- become more specific than earlier questions;
- clarify uncertainty between the leading directions;
- use only choice, text, slider, ranking, or yes-no;
- use open text for nuance, slider for intensity, choice for distinctions, ranking for priorities, and yes-no only for a genuine binary distinction;
- have 2-5 concise options for choice/ranking/yes-no; otherwise options must be [];
- never ask for sensitive personal data;
- explain their relevance through the user-facing description without revealing hidden chain-of-thought.

The confidence score represents how consistently the answers support one or more useful directions. enoughInformation should be true only when another round is unlikely to materially improve the recommendation.`,
      input: `Questionnaire history (${answeredCount} answers):

${serializeHistory(payload.history)}

Assess the session and produce the next two questions.`,
      text: {
        format: zodTextFormat(assessmentSchema, "career_question_round"),
      },
    });

    const assessment = response.output_parsed;

    if (!assessment) {
      throw new Error("The model did not return a structured assessment.");
    }

    const enoughCoverage = new Set(assessment.exploredDimensions).size >= 4;
    const shouldStop =
      answeredCount >= MIN_ANSWERS &&
      assessment.enoughInformation &&
      assessment.confidence >= CONFIDENCE_THRESHOLD &&
      enoughCoverage;

    return Response.json({
      shouldStop,
      confidence: assessment.confidence,
      summary: assessment.sessionSummary,
      leadingDirections: assessment.leadingDirections,
      questions: shouldStop
        ? []
        : assessment.questions.map(normalizeQuestion),
    });
  } catch (error) {
    console.error("Adaptive question generation failed:", error);
    return Response.json(
      {
        error:
          "We couldn't shape the next questions right now. Please try again.",
      },
      { status: 500 },
    );
  }
}
