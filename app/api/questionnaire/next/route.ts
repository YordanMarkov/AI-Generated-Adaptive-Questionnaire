import { randomUUID } from "node:crypto";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import {
  getOpenAIClient,
  logOpenAIUsage,
  OPENAI_MODEL,
} from "@/lib/openai";
import {
  containsUnexpectedScript,
  MAX_ANSWERS,
  MIN_ANSWERS,
  questionHasUnexpectedScript,
  questionSchema,
  questionSimilarity,
  serializeHistory,
  sessionRequestSchema,
  type Question,
} from "@/lib/questionnaire";

export const runtime = "nodejs";

const generatedQuestionSchema = z.object({
  eyebrow: z.string().min(1).max(80),
  title: z.string().min(1).max(180),
  description: z.string().min(1).max(320),
  type: z.enum([
    "choice",
    "multi-select",
    "slider",
    "text",
    "ranking",
    "yes-no",
  ]),
  options: z.array(z.string().min(1).max(120)).max(7),
  minLabel: z.string().min(1).max(80).nullable(),
  maxLabel: z.string().min(1).max(80).nullable(),
  evidenceGap: z.string().min(1).max(160),
});

const assessmentSchema = z.object({
  confidence: z.number().min(0).max(1),
  exploredDimensions: z.array(
    z.enum([
      "interests",
      "skills",
      "values",
      "motives",
      "work_style",
      "work_environment",
      "customer_contact",
      "physical_activity",
      "education_and_training",
      "responsibility",
    ]),
  ),
  questions: z.array(generatedQuestionSchema).min(1).max(2),
});

function normalizeQuestion(
  generated: z.infer<typeof generatedQuestionSchema>,
): Question {
  const optionTypes = new Set([
    "choice",
    "multi-select",
    "ranking",
    "yes-no",
  ]);
  const options = optionTypes.has(generated.type)
    ? generated.options.slice(0, generated.type === "yes-no" ? 3 : 7)
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
    topic: generated.evidenceGap,
    personalized: true,
  });
}

function validateUniqueQuestions(
  generated: z.infer<typeof generatedQuestionSchema>[],
  historyQuestions: Question[],
  requestedCount: number,
): Question[] {
  if (generated.length !== requestedCount) {
    throw new Error(
      `Expected ${requestedCount} questions, received ${generated.length}.`,
    );
  }

  const normalized = generated.map(normalizeQuestion);

  for (let index = 0; index < normalized.length; index += 1) {
    const question = normalized[index];

    if (
      questionHasUnexpectedScript(question) ||
      containsUnexpectedScript(generated[index].evidenceGap)
    ) {
      throw new Error("A generated question used an unexpected writing system.");
    }

    const comparisonSet = [...historyQuestions, ...normalized.slice(0, index)];
    const highestSimilarity = Math.max(
      0,
      ...comparisonSet.map((previous) =>
        questionSimilarity(question, previous),
      ),
    );

    if (highestSimilarity >= 0.34) {
      throw new Error(
        `Generated question repeated an earlier topic (${highestSimilarity.toFixed(2)} similarity).`,
      );
    }
  }

  return normalized;
}

function confidenceNeeded(answeredCount: number): number {
  if (answeredCount >= 13) return 0.74;
  if (answeredCount >= 9) return 0.79;
  if (answeredCount >= 7) return 0.84;
  return 0.9;
}

function coverageNeeded(answeredCount: number): number {
  if (answeredCount >= 9) return 5;
  return 6;
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
        questions: [],
      });
    }

    const requestedCount = Math.min(2, MAX_ANSWERS - answeredCount);
    const historyQuestions = payload.history.map(({ question }) => question);
    let lastAssessment: z.infer<typeof assessmentSchema> | null = null;
    let rejectionNote = "";

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await getOpenAIClient().responses.parse({
          model: OPENAI_MODEL,
          store: false,
          reasoning: { effort: "none" },
          max_output_tokens: 1200,
          instructions: `You design an adaptive career direction questionnaire for the full world of work.

The questionnaire is a reflective guidance tool, not a psychological test. Base every conclusion only on supplied answers. Do not infer protected, medical, mental-health, or demographic traits. Write only in clear English using the Latin alphabet. Never output Chinese, Japanese, Korean, Cyrillic, Arabic, emoji, or decorative symbols.

CAREER COVERAGE IS UNIVERSAL. Consider roles across retail and customer service, hospitality, food service, cleaning and facilities, logistics and warehousing, transport, skilled trades, manufacturing, construction, agriculture, healthcare, care work, education, public service, administration, finance, sales, arts, media, law, science, entrepreneurship, management, and technology. Ordinary roles such as cashier, shop assistant, server, receptionist, driver, warehouse worker, cleaner, caregiver, teacher, mechanic, electrician, and office administrator are valid outcomes. Never reinterpret "front end" as software unless the answers explicitly describe programming or digital interfaces. Do not privilege prestigious, degree-based, creative, or technology careers.

Maintain an information ledger before generating questions:
1. Mark topics already resolved by prior answers.
2. Identify concrete information gaps that would change the career ranking.
3. Ask only about unresolved gaps.

Generate exactly ${requestedCount} follow-up question${requestedCount === 1 ? "" : "s"}. Each must:
- collect substantively new information, not rephrase or rescale an earlier question;
- have a different evidenceGap from every previous question and from the other new question;
- become specific only when the answers support that narrowing;
- clarify uncertainty between genuinely different occupations or work settings;
- use choice for one mutually exclusive answer;
- use multi-select whenever several options may truthfully apply;
- use ranking only when order matters, slider only for intensity, text for nuance, and yes-no only for a real binary distinction;
- have 2-7 concise options for choice, multi-select, ranking, or yes-no; otherwise options must be [];
- never ask for sensitive personal data;
- keep descriptions user-facing and concise without revealing hidden reasoning.

Confidence measures whether the current evidence supports a useful, specific direction across the whole labor market. Use the explored dimensions to show evidence coverage.
${rejectionNote}`,
          input: `Questionnaire history (${answeredCount} answers):

${serializeHistory(payload.history)}

Assess coverage and generate ${requestedCount} non-repetitive question${requestedCount === 1 ? "" : "s"}.`,
          text: {
            format: zodTextFormat(assessmentSchema, "career_question_round"),
          },
        });

        const assessment = response.output_parsed;
        logOpenAIUsage(
          "questionnaire.next",
          OPENAI_MODEL,
          response.usage,
        );
        if (!assessment) {
          rejectionNote =
            "\nThe previous attempt returned no structured assessment. Produce a complete valid response.";
          continue;
        }

        lastAssessment = assessment;

        const enoughCoverage =
          new Set(assessment.exploredDimensions).size >=
          coverageNeeded(answeredCount);
        const shouldStop =
          answeredCount >= MIN_ANSWERS &&
          assessment.confidence >= confidenceNeeded(answeredCount) &&
          enoughCoverage;

        if (shouldStop) {
          return Response.json({
            shouldStop: true,
            confidence: assessment.confidence,
            questions: [],
          });
        }

        try {
          const questions = validateUniqueQuestions(
            assessment.questions,
            historyQuestions,
            requestedCount,
          );

          return Response.json({
            shouldStop: false,
            confidence: assessment.confidence,
            questions,
          });
        } catch (validationError) {
          rejectionNote = `\nThe previous question set was rejected by deterministic validation: ${
            validationError instanceof Error
              ? validationError.message
              : "it was repetitive or malformed"
          }. Choose entirely different unresolved evidence gaps.`;
        }
      } catch (generationError) {
        rejectionNote = `\nThe previous attempt failed to produce valid structured output: ${
          generationError instanceof Error
            ? generationError.message
            : "unknown generation error"
        }. Return a complete response with entirely new evidence gaps.`;
      }
    }

    if (answeredCount >= MIN_ANSWERS) {
      return Response.json({
        shouldStop: true,
        confidence: lastAssessment?.confidence ?? 0.7,
        questions: [],
      });
    }

    throw new Error("Could not generate a distinct follow-up question set.");
  } catch (error) {
    console.error("Adaptive question generation failed:", error);
    return Response.json(
      {
        error:
          "We couldn't shape distinct next questions right now. Please try again.",
      },
      { status: 500 },
    );
  }
}
