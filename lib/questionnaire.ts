import { z } from "zod";

export const questionTypes = [
  "choice",
  "multi-select",
  "slider",
  "text",
  "ranking",
  "yes-no",
] as const;

export const answerSchema = z.union([
  z.string().max(600),
  z.number().min(0).max(100),
  // Accept answers from questionnaire versions that offered up to ten choices.
  z.array(z.string().max(160)).max(10),
]);

export const questionSchema = z.object({
  id: z.string().min(1).max(100),
  eyebrow: z.string().min(1).max(80),
  title: z.string().min(1).max(180),
  description: z.string().min(1).max(320),
  type: z.enum(questionTypes),
  // History may contain older questions; generation is capped separately.
  options: z.array(z.string().min(1).max(120)).max(10).optional(),
  minLabel: z.string().min(1).max(80).optional(),
  maxLabel: z.string().min(1).max(80).optional(),
  topic: z.string().min(1).max(160).optional(),
  personalized: z.boolean().optional(),
});

export const historyEntrySchema = z.object({
  question: questionSchema,
  answer: answerSchema,
});

export const sessionRequestSchema = z.object({
  history: z.array(historyEntrySchema).min(3).max(20),
});

export type Answer = z.infer<typeof answerSchema>;
export type Question = z.infer<typeof questionSchema>;
export type HistoryEntry = z.infer<typeof historyEntrySchema>;

export type AlternativeDirection = {
  title: string;
  match: number;
  explanation: string;
};

export type CareerReport = {
  primaryDirection: string;
  relatedCareers: string[];
  confidence: number;
  confidenceLabel: string;
  summary: string;
  reasoning: string;
  signals: string[];
  alternatives: AlternativeDirection[];
  nextSteps: string[];
  caveat: string;
};

export const MIN_ANSWERS = 5;
export const MAX_ANSWERS = 20;

export const initialQuestions: Question[] = [
  {
    id: "energy",
    eyebrow: "Let's begin broadly",
    title: "What kinds of activities give you energy?",
    description:
      "Think about the activity itself, not a job title. Choose every answer that feels natural.",
    type: "multi-select",
    topic:
      "energizing work activities across practical, social, creative, analytical, commercial, operational, and outdoor work",
    options: [
      "Making, repairing, cooking, or working outdoors",
      "Caring for, teaching, serving, or supporting people",
      "Organizing records, schedules, stock, or processes",
      "Investigating, analyzing, or solving difficult problems",
      "Designing, writing, performing, or creating",
      "Selling, persuading, leading, or coordinating people",
    ],
  },
  {
    id: "environment",
    eyebrow: "Picture a good day",
    title: "What would make a workday feel satisfying to you?",
    description:
      "Describe the people, setting, pace, or kind of progress that would make you want to return tomorrow.",
    type: "text",
    topic:
      "preferred workday including people, setting, pace, activities, and visible progress",
  },
  {
    id: "priorities",
    eyebrow: "What work should give you",
    title: "What matters most in your next career direction?",
    description:
      "Select the things you would genuinely use to compare one job with another.",
    type: "multi-select",
    topic:
      "career priorities including accessibility, security, balance, service, mastery, autonomy, variety, advancement, and earnings",
    options: [
      "A role I can enter quickly and learn while working",
      "Reliable income, security, and predictable hours",
      "Helping people or contributing to my community",
      "Becoming highly skilled at practical or specialist work",
      "Freedom, variety, movement, or creativity",
      "Opportunities to advance, lead, or earn more",
    ],
  },
];

export function formatAnswer(
  answer: Answer,
  questionType?: Question["type"],
): string {
  if (Array.isArray(answer)) {
    if (questionType === "multi-select") {
      return `Selected: ${answer.join(", ")}`;
    }

    return answer.map((item, index) => `${index + 1}. ${item}`).join("; ");
  }

  if (typeof answer === "number") {
    return `${answer} out of 100`;
  }

  return answer;
}

const ignoredSimilarityWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "do",
  "does",
  "for",
  "how",
  "in",
  "is",
  "most",
  "of",
  "or",
  "the",
  "to",
  "what",
  "when",
  "which",
  "with",
  "work",
  "would",
  "you",
  "your",
]);

function meaningfulWords(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !ignoredSimilarityWords.has(word)),
  );
}

function wordSetSimilarity(leftWords: Set<string>, rightWords: Set<string>) {
  if (leftWords.size === 0 || rightWords.size === 0) return 0;

  const intersection = [...leftWords].filter((word) =>
    rightWords.has(word),
  ).length;
  const union = new Set([...leftWords, ...rightWords]).size;

  return intersection / union;
}

export function questionSimilarity(left: Question, right: Question): number {
  const combinedSimilarity = wordSetSimilarity(
    meaningfulWords(
    `${left.title} ${left.description} ${left.topic ?? ""}`,
    ),
    meaningfulWords(
      `${right.title} ${right.description} ${right.topic ?? ""}`,
    ),
  );
  const titleSimilarity = wordSetSimilarity(
    meaningfulWords(left.title),
    meaningfulWords(right.title),
  );
  const topicSimilarity = wordSetSimilarity(
    meaningfulWords(left.topic ?? ""),
    meaningfulWords(right.topic ?? ""),
  );

  return Math.max(combinedSimilarity, titleSimilarity, topicSimilarity);
}

export function containsUnexpectedScript(value: string): boolean {
  return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Cyrillic}\p{Script=Arabic}]/u.test(
    value,
  );
}

export function questionHasUnexpectedScript(question: Question): boolean {
  return [
    question.eyebrow,
    question.title,
    question.description,
    ...(question.options ?? []),
    question.minLabel ?? "",
    question.maxLabel ?? "",
  ].some(containsUnexpectedScript);
}

export function serializeHistory(history: HistoryEntry[]): string {
  return history
    .map(
      ({ question, answer }, index) =>
        `${index + 1}|${question.type}|${question.topic ?? question.title}|${formatAnswer(answer, question.type)}`,
    )
    .join("\n");
}
