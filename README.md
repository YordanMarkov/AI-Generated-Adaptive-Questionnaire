# Experiment #6: AI-Generated Adaptive Questionnaire

An adaptive career-direction discovery experience built with Next.js and the
OpenAI API.

Instead of giving every participant the same fixed questionnaire, the
application listens to each answer, identifies what is still unclear, and
generates the next most useful questions. Once enough evidence has been
collected, it stops early and creates an explainable career-direction report.

> This is a reflective exploration tool, not a psychological assessment,
> recruitment test, or definitive career decision.

## Experiment Goal

This experiment explores whether generative AI can make career discovery feel
more relevant and efficient than a traditional static questionnaire.

The prototype tests three main ideas:

1. **Adaptive questioning** - later questions respond to the participant's
   previous answers.
2. **Dynamic completion** - the questionnaire may finish early when confidence
   and evidence coverage are sufficient.
3. **Explainable recommendations** - the result includes supporting signals,
   related careers, alternatives, and practical next steps.

The questionnaire starts broadly and can explore interests, skills, values,
motives, work style, environment, customer contact, physical activity,
education, training, and responsibility.

## What It Does

- Begins with three balanced foundation questions, including multi-select and
  open-text input.
- Generates two adaptive questions at a time.
- Supports choice, multi-select, slider, ranking, text, and yes/no questions.
- Stops between 5 and 20 answered questions when the evidence is strong enough.
- Considers the full labor market instead of defaulting to technology careers.
- Detects and rejects repetitive or malformed generated questions.
- Produces one concise primary direction with related careers.
- Explains the recommendation using patterns from the participant's answers.
- Suggests alternative directions and three small next-step experiments.
- Allows the final report to be printed or exported as Markdown.

## Adaptive Flow

```text
Welcome
   |
   v
3 foundation questions
   |
   v
Assess confidence and evidence coverage
   |
   +-- Enough evidence? --> Generate career report
   |
   +-- Not yet ----------> Generate 2 new questions
                               |
                               v
                         Validate and deduplicate
                               |
                               +----> Continue the loop
```

The stopping decision combines:

- the number of answered questions;
- model-reported confidence;
- coverage across multiple career-relevant dimensions;
- a hard maximum of 20 answers.

Confidence requirements gradually relax as more evidence is collected. This
keeps short sessions possible without forcing an early conclusion from weak
signals.

## Recommendation Safeguards

The model is instructed to consider roles across:

- retail, hospitality, customer service, and food service;
- care work, healthcare, education, and public service;
- administration, finance, sales, and management;
- logistics, transport, manufacturing, and warehousing;
- skilled trades, construction, agriculture, and facilities;
- arts, media, law, science, entrepreneurship, and technology.

Generic interests such as helping people, solving problems, organizing, or
making things are treated as cross-sector signals. Technology is recommended
only when the answers provide technology-specific evidence.

Additional deterministic checks:

- Zod schemas validate every API request and model response.
- Generated questions are compared with earlier questions for similarity.
- Invalid option counts and incomplete response rounds are rejected.
- Unexpected writing systems are rejected to prevent random symbol output.
- Primary result titles are constrained to one concise, searchable direction.
- Related careers must be distinct from the primary result and each other.

## Technology

- [Next.js 16](https://nextjs.org/) with the App Router
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses)
- [Zod](https://zod.dev/) structured validation
- Custom responsive glassmorphism interface
- GitHub Actions and Vercel

## Project Structure

```text
app/
  api/questionnaire/
    next/route.ts       Generates and validates adaptive questions
    report/route.ts     Generates and validates the final report
  globals.css           Complete responsive visual system
  layout.tsx            Fonts and application metadata
  page.tsx              Questionnaire and report interface
lib/
  openai.ts             OpenAI client, model selection, and cost telemetry
  questionnaire.ts      Shared schemas, starter questions, and validation
.github/workflows/
  ci-cd.yml             Lint, build, and Vercel deployment workflow
```

## Local Development

### Requirements

- Node.js 22.13 or newer
- npm
- An OpenAI API key

### Installation

```bash
npm ci
```

Create `.env.local` or `.env` in the project root:

```env
OPENAI_API_KEY=your_openai_api_key_here

# Optional; defaults to gpt-5.4-mini
OPENAI_MODEL=gpt-5.4-mini
```

Never expose the key with a `NEXT_PUBLIC_` prefix. OpenAI requests are made
only from server-side route handlers.

Start the development server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Available Scripts

```bash
npm run dev      # Start the local development server
npm run lint     # Run ESLint
npm run build    # Create and validate a production build
npm run start    # Run the production build
```

## API Cost Strategy

The default model is `gpt-5.4-mini`. The implementation reduces cost without
switching to a lower-quality default model by using:

- `reasoning.effort: none`;
- compact questionnaire-history serialization;
- strict structured-output schemas;
- small output-token limits;
- only the fields required by the interface;
- early questionnaire completion when confidence is sufficient.

Development measurements placed typical calls around:

- **$0.0014-$0.0031** for an adaptive question round;
- approximately **$0.0029** for a final report.

Actual prices and token usage can change. Every OpenAI response writes an
`openai_usage` JSON event to the server logs with input, cached input, output,
reasoning tokens, and an estimated cost.

For additional savings, `OPENAI_MODEL=gpt-5.4-nano` can be configured, although
the default mini model is preferred when recommendation quality matters most.

## Privacy and Data Handling

- No account, database, or persistent questionnaire storage is implemented.
- Questionnaire state is held in browser memory for the active session.
- Answers are sent to the application's server routes and then to OpenAI to
  generate questions and the report.
- OpenAI requests use `store: false`.
- Returning home or refreshing the page clears the in-browser session.

Do not use this prototype for sensitive personal, medical, psychological, or
employment-selection data.

## CI/CD

The workflow at `.github/workflows/ci-cd.yml` runs for pull requests and pushes
to `main`.

1. Install dependencies with `npm ci`.
2. Run ESLint.
3. Build the production application.
4. After a successful push to `main`, trigger a Vercel production deployment.

The deploy job requires this GitHub Actions secret:

```text
VERCEL_DEPLOY_HOOK_URL
```

## Vercel Deployment

Configure the Vercel project with:

- **Framework Preset:** Next.js
- **Root Directory:** repository root (`.`)
- **Build Command:** framework default
- **Output Directory:** framework default
- **Environment Variable:** `OPENAI_API_KEY`
- **Optional Environment Variable:** `OPENAI_MODEL`

The repository root setting is important because the Next.js application is
not inside a nested package directory.

## Known Limitations

- Recommendations depend on self-reported answers and model interpretation.
- Confidence is an evidence-quality indicator, not a probability of success.
- The prototype does not verify qualifications, local vacancies, salaries, or
  education requirements.
- Similarity detection is lexical and may miss conceptually repeated questions.
- The application currently supports English only.
- There are no user accounts, saved sessions, analytics, or database records.
- AI output can still be imperfect despite schema and validation safeguards.

## Experiment Status

This repository represents the working prototype for **Experiment #6**. It is
intended for feedback, usability testing, and evaluation of adaptive
questionnaire behavior rather than production career counselling.
