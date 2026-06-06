"use client";

import { useEffect, useMemo, useState } from "react";

import {
  initialQuestions,
  MAX_ANSWERS,
  type Answer,
  type CareerReport,
  type HistoryEntry,
  type Question,
} from "@/lib/questionnaire";

type Stage = "welcome" | "questionnaire" | "loading" | "result";

const icons = {
  compass: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  sparkle: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3c.5 4.6 2.4 6.5 7 7-4.6.5-6.5 2.4-7 7-.5-4.6-2.4-6.5-7-7 4.6-.5 6.5-2.4 7-7Z" />
      <path d="M19 16c.2 1.9 1.1 2.8 3 3-1.9.2-2.8 1.1-3 3-.2-1.9-1.1-2.8-3-3 1.9-.2 2.8-1.1 3-3Z" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  back: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
  ),
  brain: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.5 4.5A3 3 0 0 0 5 7.1a3.5 3.5 0 0 0-1 6.7A3.5 3.5 0 0 0 8 19.5h1.5v-15ZM14.5 4.5A3 3 0 0 1 19 7.1a3.5 3.5 0 0 1 1 6.7 3.5 3.5 0 0 1-4 5.7h-1.5v-15ZM9.5 9H7.8M14.5 9h1.7M9.5 15H7.8M14.5 15h1.7" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  ),
  download: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12m-5-5 5 5 5-5M5 21h14" />
    </svg>
  ),
  print: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z" />
    </svg>
  ),
};

function HomeMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      {icons.compass}
    </span>
  );
}

function Header({
  compact = false,
  onHome,
}: {
  compact?: boolean;
  onHome: () => void;
}) {
  return (
    <header className={`site-header ${compact ? "compact" : ""}`}>
      <button className="brand-button" onClick={onHome} aria-label="Return home">
        <HomeMark />
      </button>
    </header>
  );
}

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <main className="welcome">
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />
      <section className="hero">
        <div className="eyebrow-pill">
          {icons.sparkle}
          <span>AI-guided career discovery</span>
        </div>
        <h1>
          Find the work that feels
          <span> like you.</span>
        </h1>
        <p className="hero-copy">
          A thoughtful, adaptive conversation that listens to your answers and
          helps reveal career directions worth exploring.
        </p>
        <button className="primary-button hero-button" onClick={onStart}>
          Begin your discovery
          <span className="button-icon">{icons.arrow}</span>
        </button>
        <div className="hero-meta">
          <span>{icons.clock} About 5 minutes</span>
          <span className="meta-divider" />
          <span>No sign-up needed</span>
        </div>
      </section>

      <section className="promise-grid" aria-label="How the questionnaire works">
        <article className="promise-card">
          <span className="promise-number">01</span>
          <div className="promise-icon">{icons.brain}</div>
          <h2>It listens</h2>
          <p>Each question responds to what you shared before.</p>
        </article>
        <article className="promise-card featured">
          <span className="promise-number">02</span>
          <div className="promise-icon">{icons.sparkle}</div>
          <h2>It goes deeper</h2>
          <p>The conversation narrows gently toward your strongest signals.</p>
        </article>
        <article className="promise-card">
          <span className="promise-number">03</span>
          <div className="promise-icon">{icons.compass}</div>
          <h2>It explains</h2>
          <p>You get directions to explore, with clear reasoning behind them.</p>
        </article>
      </section>

      <p className="disclaimer">
        This is a reflection tool, not a psychological assessment or a
        definitive career decision.
      </p>
    </main>
  );
}

function ProgressRing({
  current,
  confidence,
}: {
  current: number;
  confidence: number | null;
}) {
  const progress = Math.round(
    (confidence ?? Math.min(0.35, (current + 1) * 0.1)) * 100,
  );
  return (
    <div
      className="progress-ring"
      style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}
      aria-label={`${progress} percent career-direction clarity`}
    >
      <div>
        <strong>{progress}</strong>
        <span>% clarity</span>
      </div>
    </div>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: Answer | undefined;
  onChange: (value: Answer) => void;
}) {
  if (question.type === "text") {
    return (
      <div className="text-answer">
        <textarea
          value={(value as string) ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder="For example: I lose track of time when I’m..."
          maxLength={400}
          autoFocus
        />
        <span>{((value as string) ?? "").length} / 400</span>
      </div>
    );
  }

  if (question.type === "slider") {
    const sliderValue = typeof value === "number" ? value : 50;
    return (
      <div className="slider-answer">
        <div className="slider-value">
          <span>{sliderValue}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="10"
          value={sliderValue}
          onChange={(event) => onChange(Number(event.target.value))}
          style={{ "--value": `${sliderValue}%` } as React.CSSProperties}
          aria-label={question.title}
        />
        <div className="slider-labels">
          <span>{question.minLabel}</span>
          <span>{question.maxLabel}</span>
        </div>
      </div>
    );
  }

  if (question.type === "ranking") {
    const selected = (value as string[]) ?? [];
    const remaining = question.options?.filter((option) => !selected.includes(option)) ?? [];
    return (
      <div className="ranking-answer">
        {[...selected, ...remaining].map((option) => {
          const rank = selected.indexOf(option);
          return (
            <button
              key={option}
              className={rank >= 0 ? "rank-item selected" : "rank-item"}
              onClick={() => {
                if (rank >= 0) {
                  onChange(selected.filter((item) => item !== option));
                } else {
                  onChange([...selected, option]);
                }
              }}
            >
              <span className="rank-number">{rank >= 0 ? rank + 1 : "–"}</span>
              <span>{option}</span>
              <span className="rank-action">{rank >= 0 ? "Remove" : "Add"}</span>
            </button>
          );
        })}
      </div>
    );
  }

  const options = question.options ?? [];
  const isMultiSelect = question.type === "multi-select";
  const selectedValues = Array.isArray(value) ? value : [];

  return (
    <div
      className={
        question.type === "yes-no"
          ? "choice-grid compact-choices"
          : "choice-grid"
      }
    >
      {isMultiSelect && (
        <p className="selection-hint">Select all that apply</p>
      )}
      {options.map((option, index) => {
        const selected = isMultiSelect
          ? selectedValues.includes(option)
          : value === option;
        return (
          <button
            key={option}
            className={selected ? "choice-option selected" : "choice-option"}
            onClick={() => {
              if (!isMultiSelect) {
                onChange(option);
                return;
              }

              onChange(
                selected
                  ? selectedValues.filter((item) => item !== option)
                  : [...selectedValues, option],
              );
            }}
            aria-pressed={selected}
          >
            <span className="choice-key">{String.fromCharCode(65 + index)}</span>
            <span>{option}</span>
            <span className="choice-check">{icons.check}</span>
          </button>
        );
      })}
    </div>
  );
}

function Questionnaire({
  question,
  index,
  confidence,
  answers,
  onAnswer,
  onBack,
  onContinue,
  onHome,
}: {
  question: Question;
  index: number;
  confidence: number | null;
  answers: Record<string, Answer>;
  onAnswer: (answer: Answer) => void;
  onBack: () => void;
  onContinue: () => void;
  onHome: () => void;
}) {
  const value = answers[question.id];
  const isValid =
    question.type === "slider" ||
    typeof value === "number" ||
    (typeof value === "string" && value.trim().length > 1) ||
    (question.type === "multi-select" &&
      Array.isArray(value) &&
      value.length > 0) ||
    (question.type === "ranking" &&
      Array.isArray(value) &&
      value.length === question.options?.length);

  return (
    <main className="questionnaire-page">
      <div className="aurora aurora-three" />
      <Header compact onHome={onHome} />
      <section className="questionnaire-shell">
        <aside className="journey-panel">
          <div>
            <p className="section-label">Your discovery</p>
            <ProgressRing current={index} confidence={confidence} />
            <div className="journey-status complete">
              <span>{icons.check}</span>
              <div>
                <strong>Foundations</strong>
                <small>Interests and work style</small>
              </div>
            </div>
            <div className={`journey-line ${index >= 3 ? "active" : ""}`} />
            <div className={`journey-status ${index >= 3 ? "complete" : ""}`}>
              <span>{index >= 3 ? icons.check : "2"}</span>
              <div>
                <strong>Deep dive</strong>
                <small>Values and preferences</small>
              </div>
            </div>
            <div className={`journey-line ${index >= 7 ? "active" : ""}`} />
            <div className={`journey-status ${index >= 7 ? "complete" : ""}`}>
              <span>{index >= 7 ? icons.check : "3"}</span>
              <div>
                <strong>Direction</strong>
                <small>Your personal report</small>
              </div>
            </div>
          </div>
          <div className="journey-tip">
            {icons.sparkle}
            <p>
              <strong>Take your time.</strong>
              Thoughtful answers create a more useful direction.
            </p>
          </div>
        </aside>

        <section className="question-card">
          <div className="question-topline">
            <button className="back-button" onClick={onBack}>
              {icons.back} Back
            </button>
            {question.personalized && (
              <span className="adaptive-badge">{icons.sparkle} Adapted to you</span>
            )}
          </div>
          <div className="question-content">
            <p className="question-eyebrow">{question.eyebrow}</p>
            <h1>{question.title}</h1>
            <p className="question-description">{question.description}</p>
            <QuestionInput question={question} value={value} onChange={onAnswer} />
          </div>
          <div className="question-footer">
            <span className="keyboard-hint">
              Your answer stays on this device
            </span>
            <button
              className="primary-button continue-button"
              onClick={onContinue}
              disabled={!isValid}
            >
              Continue
              <span className="button-icon">{icons.arrow}</span>
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

function LoadingScreen({
  error,
  onRetry,
  creatingReport,
}: {
  error: string | null;
  onRetry: () => void;
  creatingReport: boolean;
}) {
  const [message, setMessage] = useState(0);
  const messages = [
    "Finding the strongest signals in your answers",
    "Comparing a few promising directions",
    creatingReport
      ? "Turning your answer patterns into a clear report"
      : "Choosing the most useful follow-up questions",
  ];

  useEffect(() => {
    const interval = window.setInterval(
      () => setMessage((current) => (current + 1) % messages.length),
      900,
    );
    return () => window.clearInterval(interval);
  }, [messages.length]);

  return (
    <main className="loading-page">
      <div className="aurora aurora-one" />
      <div className="thinking-orbit" aria-hidden="true">
        <span className="orbit orbit-one" />
        <span className="orbit orbit-two" />
        <span className="thinking-core">{icons.sparkle}</span>
      </div>
      <p className="question-eyebrow">
        {creatingReport
          ? "Creating your direction report"
          : "Shaping your next questions"}
      </p>
      <h1>
        {error ? "Something interrupted the flow." : "Thinking with your answers..."}
      </h1>
      {error ? (
        <div className="loading-error">
          <p>{error}</p>
          <button className="primary-button" onClick={onRetry}>
            Try again <span className="button-icon">{icons.arrow}</span>
          </button>
        </div>
      ) : (
        <>
          <p className="loading-message">{messages[message]}</p>
          <div className="loading-dots">
            <span />
            <span />
            <span />
          </div>
        </>
      )}
    </main>
  );
}

function Result({
  report,
  answerCount,
  onRestart,
}: {
  report: CareerReport;
  answerCount: number;
  onRestart: () => void;
}) {
  const downloadReport = () => {
    const markdown = `# Career Direction Report

## Primary direction
${report.primaryDirection} (${report.confidence}% match)

${report.summary}

## Related careers
${report.relatedCareers.map((career) => `- ${career}`).join("\n")}

## Why this direction fits
${report.reasoning}

${report.signals.map((signal) => `- ${signal}`).join("\n")}

## Alternative directions
${report.alternatives
  .map(
    (alternative) =>
      `- **${alternative.title} (${alternative.match}%)**: ${alternative.explanation}`,
  )
  .join("\n")}

## Next steps
${report.nextSteps.map((step, index) => `${index + 1}. ${step}`).join("\n")}

> ${report.caveat}
`;
    const url = URL.createObjectURL(
      new Blob([markdown], { type: "text/markdown" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "career-direction-report.md";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="result-page">
      <div className="aurora aurora-one" />
      <Header compact onHome={onRestart} />
      <section className="result-hero">
        <div className="result-kicker">{icons.sparkle} Your direction</div>
        <p className="section-label">Primary direction</p>
        <h1>{report.primaryDirection}</h1>
        <ul className="related-careers" aria-label="Related careers">
          {report.relatedCareers.map((career, index) => (
            <li key={career}>
              {career}
              <span className="career-separator" aria-hidden="true">
                {index < report.relatedCareers.length - 1 ? " · " : ""}
              </span>
            </li>
          ))}
        </ul>
        <p>{report.summary}</p>
        <div className="confidence-row">
          <div className="confidence-score">
            <span>{report.confidence}</span>
            <small>% match</small>
          </div>
          <div className="confidence-copy">
            <strong>{report.confidenceLabel}</strong>
            <span>Based on {answerCount} adaptive answers</span>
          </div>
        </div>
      </section>

      <section className="report-layout">
        <div className="report-main">
          <article className="report-card why-card">
            <div className="report-heading">
              <span className="report-icon">{icons.brain}</span>
              <div>
                <p className="section-label">The reasoning</p>
                <h2>Why this direction fits</h2>
              </div>
            </div>
            <p>{report.reasoning}</p>
            <div className="signal-list">
              {report.signals.map((signal) => (
                <div key={signal}>
                  <span>{icons.check}</span>
                  <p>{signal}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="report-card">
            <div className="report-heading">
              <span className="report-icon">{icons.compass}</span>
              <div>
                <p className="section-label">Keep exploring</p>
                <h2>Your next three steps</h2>
              </div>
            </div>
            <div className="next-steps">
              {report.nextSteps.map((step, index) => (
                <div key={step}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          </article>
        </div>

        <aside className="report-sidebar">
          <article className="report-card alternatives-card">
            <p className="section-label">Also worth exploring</p>
            <h2>Nearby directions</h2>
            {report.alternatives.map((alternative) => (
              <div className="alternative" key={alternative.title}>
                <div>
                  <strong>{alternative.title}</strong>
                  <span>{alternative.match}%</span>
                </div>
                <div className="match-bar">
                  <span style={{ width: `${alternative.match}%` }} />
                </div>
                <p>{alternative.explanation}</p>
              </div>
            ))}
          </article>

          <article className="reflection-card">
            <span>{icons.sparkle}</span>
            <p>
              <strong>This is a direction, not a verdict.</strong>
              {report.caveat}
            </p>
          </article>
        </aside>
      </section>

      <div className="result-actions">
        <button className="secondary-button" onClick={downloadReport}>
          {icons.download} Export report
        </button>
        <button className="secondary-button" onClick={() => window.print()}>
          {icons.print} Print
        </button>
        <button className="text-button" onClick={onRestart}>Start a new discovery</button>
      </div>
    </main>
  );
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("welcome");
  const [index, setIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [report, setReport] = useState<CareerReport | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creatingReport, setCreatingReport] = useState(false);

  const currentAnswer = useMemo(
    () => answers[questions[index]?.id],
    [answers, index, questions],
  );

  const goHome = () => {
    setStage("welcome");
    setIndex(0);
    setQuestions(initialQuestions);
    setAnswers({});
    setReport(null);
    setConfidence(null);
    setError(null);
    setCreatingReport(false);
  };

  const buildHistory = (
    answerState: Record<string, Answer>,
    throughIndex: number,
  ): HistoryEntry[] =>
    questions.slice(0, throughIndex + 1).flatMap((question) => {
      const answer = answerState[question.id];
      return answer === undefined ? [] : [{ question, answer }];
    });

  const createReport = async (history: HistoryEntry[]) => {
    setCreatingReport(true);
    setError(null);
    setStage("loading");

    try {
      const response = await fetch("/api/questionnaire/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history }),
      });
      const data = await response.json();

      if (!response.ok || !data.report) {
        throw new Error(data.error || "The report could not be created.");
      }

      setReport(data.report);
      setStage("result");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The report could not be created.",
      );
    }
  };

  const generateNextRound = async (history: HistoryEntry[]) => {
    if (history.length >= MAX_ANSWERS) {
      await createReport(history);
      return;
    }

    setCreatingReport(false);
    setError(null);
    setStage("loading");

    try {
      const response = await fetch("/api/questionnaire/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "The next questions could not be generated.",
        );
      }

      if (typeof data.confidence === "number") {
        setConfidence(data.confidence);
      }

      if (data.shouldStop) {
        await createReport(history);
        return;
      }

      const expectedQuestionCount = Math.min(
        2,
        MAX_ANSWERS - history.length,
      );

      if (
        !Array.isArray(data.questions) ||
        data.questions.length !== expectedQuestionCount
      ) {
        throw new Error("The generated question round was incomplete.");
      }

      setQuestions((current) => [...current, ...data.questions]);
      setIndex(index + 1);
      setStage("questionnaire");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The next questions could not be generated.",
      );
    }
  };

  const continueQuestionnaire = async () => {
    const question = questions[index];
    const answer =
      currentAnswer ?? (question.type === "slider" ? 50 : undefined);

    if (answer === undefined) return;

    const nextAnswers = { ...answers, [question.id]: answer };
    setAnswers(nextAnswers);

    if (index < questions.length - 1) {
      setIndex((current) => current + 1);
      return;
    }

    await generateNextRound(buildHistory(nextAnswers, index));
  };

  return (
    <div className="app">
      {stage === "welcome" && (
        <>
          <Header onHome={goHome} />
          <Welcome onStart={() => setStage("questionnaire")} />
        </>
      )}
      {stage === "questionnaire" && (
        <Questionnaire
          question={questions[index]}
          index={index}
          confidence={confidence}
          answers={answers}
          onAnswer={(answer) =>
            setAnswers((current) => ({ ...current, [questions[index].id]: answer }))
          }
          onBack={() => {
            if (index === 0) goHome();
            else setIndex((current) => current - 1);
          }}
          onContinue={() => void continueQuestionnaire()}
          onHome={goHome}
        />
      )}
      {stage === "loading" && (
        <LoadingScreen
          error={error}
          creatingReport={creatingReport}
          onRetry={() => {
            const history = buildHistory(answers, index);
            if (creatingReport) void createReport(history);
            else void generateNextRound(history);
          }}
        />
      )}
      {stage === "result" && report && (
        <Result
          report={report}
          answerCount={Object.keys(answers).length}
          onRestart={goHome}
        />
      )}
    </div>
  );
}
