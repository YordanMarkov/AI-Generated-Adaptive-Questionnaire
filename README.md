# AI-Generated Adaptive Questionnaire

Experiment #6: a Next.js frontend prototype for adaptive career direction
discovery.

## Development

Requires Node.js 22.13 or newer.

Create `.env.local` or `.env` in the repository root:

```text
OPENAI_API_KEY=your_openai_api_key_here
```

The server defaults to `gpt-5.4-mini`. Override it with `OPENAI_MODEL` if
needed. Never prefix the API key with `NEXT_PUBLIC_`.

```bash
npm ci
npm run dev
```

Quality checks:

```bash
npm run lint
npm run build
```

## CI/CD

The GitHub Actions workflow in `.github/workflows/ci-cd.yml`:

1. Runs `npm ci`, linting, and a production build for pull requests and pushes
   targeting `main`.
2. Triggers the Vercel production deploy hook after checks pass on `main`.

The deploy job requires this GitHub repository secret:

```text
VERCEL_DEPLOY_HOOK_URL
```

## Vercel

The Next.js application lives at the repository root. In the Vercel project:

- Set **Root Directory** to the repository root (`.`), not
  `ai-generated-adaptive-questionnaire`.
- Use the **Next.js** Framework Preset.
- Leave Build Command and Output Directory at their framework defaults.
- Ensure the deploy hook targets the `main` branch.

After changing an existing project’s Root Directory, trigger a fresh deployment.
The previous `404: NOT_FOUND` deployment was built from the old repository root,
which did not contain the Next.js application.
