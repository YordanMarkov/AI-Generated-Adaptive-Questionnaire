"use client";

import { useEffect, useMemo, useState } from "react";

type Stage = "welcome" | "questionnaire" | "loading" | "result";
type Answer = string | number | string[];

type Question = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  type: "choice" | "slider" | "text" | "ranking" | "yes-no";
  options?: string[];
  minLabel?: string;
  maxLabel?: string;
  personalized?: boolean;
};

const questions: Question[] = [
  {
    id: "energy",
    eyebrow: "Let’s begin broadly",
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
  {
    id: "craft",
    eyebrow: "A pattern is emerging",
    title: "When you build something, which part pulls you in first?",
    description:
      "Your earlier answers suggest you value making ideas tangible. Let’s find out where that instinct leads.",
    type: "choice",
    personalized: true,
    options: [
      "How it looks and feels to use",
      "How the underlying system works",
      "Whether it solves the right problem",
      "How the team can deliver it well",
    ],
  },
  {
    id: "priorities",
    eyebrow: "Let’s sharpen the picture",
    title: "Rank what matters most in your future career.",
    description:
      "Tap items in priority order, from most important to least important.",
    type: "ranking",
    personalized: true,
    options: [
      "Creative expression",
      "Technical mastery",
      "Positive impact",
      "Stability and balance",
    ],
  },
  {
    id: "ambiguity",
    eyebrow: "One final distinction",
    title: "Do you enjoy turning an unclear idea into a clear, usable experience?",
    description:
      "This helps distinguish between a few closely matched directions in your profile.",
    type: "yes-no",
    personalized: true,
    options: ["Yes, that excites me", "Sometimes, with the right context", "No, I prefer defined problems"],
  },
];

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
  shield: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.5 2.7 8.1 7 10 4.3-1.9 7-5.5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
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
      {!compact && (
        <span className="privacy-note">{icons.shield} Private by design</span>
      )}
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

function ProgressRing({ current }: { current: number }) {
  const progress = ((current + 1) / questions.length) * 100;
  return (
    <div
      className="progress-ring"
      style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}
      aria-label={`${Math.round(progress)} percent complete`}
    >
      <div>
        <strong>{current + 1}</strong>
        <span>of {questions.length}</span>
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
  return (
    <div className={question.type === "yes-no" ? "choice-grid compact-choices" : "choice-grid"}>
      {options.map((option, index) => {
        const selected = value === option;
        return (
          <button
            key={option}
            className={selected ? "choice-option selected" : "choice-option"}
            onClick={() => onChange(option)}
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
  index,
  answers,
  onAnswer,
  onBack,
  onContinue,
  onHome,
}: {
  index: number;
  answers: Record<string, Answer>;
  onAnswer: (answer: Answer) => void;
  onBack: () => void;
  onContinue: () => void;
  onHome: () => void;
}) {
  const question = questions[index];
  const value = answers[question.id];
  const isValid =
    typeof value === "number" ||
    (typeof value === "string" && value.trim().length > 1) ||
    (Array.isArray(value) && value.length === question.options?.length);

  return (
    <main className="questionnaire-page">
      <div className="aurora aurora-three" />
      <Header compact onHome={onHome} />
      <section className="questionnaire-shell">
        <aside className="journey-panel">
          <div>
            <p className="section-label">Your discovery</p>
            <ProgressRing current={index} />
            <div className="journey-status complete">
              <span>{icons.check}</span>
              <div>
                <strong>Foundations</strong>
                <small>Interests and work style</small>
              </div>
            </div>
            <div className={`journey-line ${index >= 2 ? "active" : ""}`} />
            <div className={`journey-status ${index >= 2 ? "complete" : ""}`}>
              <span>{index >= 2 ? icons.check : "2"}</span>
              <div>
                <strong>Deep dive</strong>
                <small>Values and preferences</small>
              </div>
            </div>
            <div className={`journey-line ${index >= 5 ? "active" : ""}`} />
            <div className={`journey-status ${index >= 5 ? "complete" : ""}`}>
              <span>{index >= 5 ? icons.check : "3"}</span>
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

function LoadingScreen() {
  const [message, setMessage] = useState(0);
  const messages = [
    "Finding the strongest signals in your answers",
    "Comparing a few promising directions",
    "Choosing the most useful follow-up question",
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
      <p className="question-eyebrow">Shaping your next question</p>
      <h1>Thinking with your answers...</h1>
      <p className="loading-message">{messages[message]}</p>
      <div className="loading-dots">
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}

function Result({ onRestart }: { onRestart: () => void }) {
  const downloadReport = () => {
    const report = `# Career Direction Report\n\n## Primary direction\nProduct-minded Frontend Developer (86% match)\n\nYou are energized by making ideas tangible, combining visual care with technical problem-solving, and turning ambiguity into experiences people can use.\n\n## Alternative directions\n- UX Engineer\n- Product Designer\n- Creative Technologist\n\n## Next steps\n1. Build a small interactive product from research to polished interface.\n2. Explore design systems and accessibility.\n3. Talk with a frontend developer and a product designer about their day-to-day work.\n`;
    const url = URL.createObjectURL(new Blob([report], { type: "text/markdown" }));
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
        <h1>Product-minded<br />Frontend Developer</h1>
        <p>
          You seem most energized where <strong>creative craft</strong>,{" "}
          <strong>technical problem-solving</strong>, and{" "}
          <strong>human needs</strong> meet.
        </p>
        <div className="confidence-row">
          <div className="confidence-score">
            <span>86</span>
            <small>% match</small>
          </div>
          <div className="confidence-copy">
            <strong>Strong signal</strong>
            <span>Based on 6 answers across 4 career dimensions</span>
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
            <p>
              Your answers consistently point toward work where you can make
              abstract ideas visible and useful. You enjoy the craft of an
              interface, but you also care about the system beneath it and the
              problem it solves.
            </p>
            <div className="signal-list">
              <div>
                <span>{icons.check}</span>
                <p><strong>You want to build tangible things</strong> and see the result of your work.</p>
              </div>
              <div>
                <span>{icons.check}</span>
                <p><strong>You balance focus with collaboration,</strong> a strong fit for cross-functional product teams.</p>
              </div>
              <div>
                <span>{icons.check}</span>
                <p><strong>You are comfortable with ambiguity</strong> when it leads to a clearer experience.</p>
              </div>
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
              <div><span>01</span><p>Build a small product from rough idea to polished, accessible interface.</p></div>
              <div><span>02</span><p>Explore design systems, interaction design, and modern frontend architecture.</p></div>
              <div><span>03</span><p>Compare a frontend developer’s day with a product designer’s day.</p></div>
            </div>
          </article>
        </div>

        <aside className="report-sidebar">
          <article className="report-card alternatives-card">
            <p className="section-label">Also worth exploring</p>
            <h2>Nearby directions</h2>
            <div className="alternative">
              <div><strong>UX Engineer</strong><span>78%</span></div>
              <div className="match-bar"><span style={{ width: "78%" }} /></div>
              <p>More emphasis on prototyping and the bridge between design and code.</p>
            </div>
            <div className="alternative">
              <div><strong>Product Designer</strong><span>71%</span></div>
              <div className="match-bar"><span style={{ width: "71%" }} /></div>
              <p>More focus on research, flows, and visual communication.</p>
            </div>
            <div className="alternative">
              <div><strong>Creative Technologist</strong><span>65%</span></div>
              <div className="match-bar"><span style={{ width: "65%" }} /></div>
              <p>More experimentation with emerging interfaces and technology.</p>
            </div>
          </article>

          <article className="reflection-card">
            <span>{icons.sparkle}</span>
            <p>
              <strong>This is a direction, not a verdict.</strong>
              Use it as a lens for experiments, conversations, and reflection.
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
  const [answers, setAnswers] = useState<Record<string, Answer>>({});

  const currentAnswer = useMemo(() => answers[questions[index]?.id], [answers, index]);

  const goHome = () => {
    setStage("welcome");
    setIndex(0);
    setAnswers({});
  };

  const continueQuestionnaire = () => {
    if (currentAnswer === undefined) return;

    if (index === questions.length - 1) {
      setStage("loading");
      window.setTimeout(() => setStage("result"), 2300);
      return;
    }

    if (index === 2) {
      setStage("loading");
      window.setTimeout(() => {
        setIndex((current) => current + 1);
        setStage("questionnaire");
      }, 2300);
      return;
    }

    setIndex((current) => current + 1);
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
          index={index}
          answers={answers}
          onAnswer={(answer) =>
            setAnswers((current) => ({ ...current, [questions[index].id]: answer }))
          }
          onBack={() => {
            if (index === 0) goHome();
            else setIndex((current) => current - 1);
          }}
          onContinue={continueQuestionnaire}
          onHome={goHome}
        />
      )}
      {stage === "loading" && <LoadingScreen />}
      {stage === "result" && <Result onRestart={goHome} />}
    </div>
  );
}
