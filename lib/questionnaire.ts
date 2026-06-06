import { z } from "zod";

export const questionTypes = [
  "choice",
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
  personalized: z.boolean().optional(),
});

export const historyEntrySchema = z.object({
  question: questionSchema,
  answer: answerSchema,
});

export const sessionRequestSchema = z.object({
  history: z.array(historyEntrySchema).min(3).max(9),
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
export const MAX_ANSWERS = 9;
export const CONFIDENCE_THRESHOLD = 0.78;

export const initialQuestions: Question[] = [
  {
    id: "energy",
    eyebrow: "Let's begin broadly",
    title: "Which kind of work gives you the most energy?",
    description:
      "Choose the answer that feels most natural. There are no right or wrong directions here.",
    type: "choice",
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
  },
  {
    id: "collaboration",
    eyebrow: "How you like to work",
    title: "Where do you sit between deep focus and constant collaboration?",
    description:
      "Use the scale to show your natural preference. Neither end is better than the other.",
    type: "slider",
    minLabel: "Independent focus",
    maxLabel: "Highly collaborative",
  },
];

export function formatAnswer(answer: Answer): string {
  if (Array.isArray(answer)) {
    return answer.map((item, index) => `${index + 1}. ${item}`).join("; ");
  }

  if (typeof answer === "number") {
    return `${answer} out of 100`;
  }

  return answer;
}

export function serializeHistory(history: HistoryEntry[]): string {
  return history
    .map(
      ({ question, answer }, index) =>
        `${index + 1}. [${question.type}] ${question.title}\nAnswer: ${formatAnswer(answer)}`,
    )
    .join("\n\n");
}
