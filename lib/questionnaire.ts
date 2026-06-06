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
  z.array(z.string().max(160)).max(8),
]);

export const questionSchema = z.object({
  id: z.string().min(1).max(100),
  eyebrow: z.string().min(1).max(80),
  title: z.string().min(1).max(180),
  description: z.string().min(1).max(320),
  type: z.enum(questionTypes),
  options: z.array(z.string().min(1).max(120)).max(6).optional(),
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
    title: "Which kinds of work give you the most energy?",
    description:
      "Choose every answer that feels natural. There are no right or wrong directions here.",
    type: "multi-select",
    topic: "broad sources of work energy and interest",
    options: [
      "Building and making things",
      "Understanding people and their needs",
      "Finding patterns in complex information",
      "Organizing people around a shared goal",
    ],
  },
  {
    id: "environment",
    eyebrow: "Your ideal environment",
    title: "What does a satisfying workday feel like to you?",
    description:
      "Describe the moments, pace, or kind of progress that would make you look forward to tomorrow.",
    type: "text",
    topic: "preferred workday, pace, and environment",
  },
  {
    id: "collaboration",
    eyebrow: "How you like to work",
    title: "Where do you sit between deep focus and constant collaboration?",
    description:
      "Use the scale to show your natural preference. Neither end is better than the other.",
    type: "slider",
    topic: "preferred level of collaboration and social interaction",
    minLabel: "Independent focus",
    maxLabel: "Highly collaborative",
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
