# PRD Reviewer

An AI tool that reviews a product requirements document (PRD) the way a skeptical engineer would, before it reaches engineering.

Paste or upload a draft PRD (.txt, .md, .docx) and get:

- A readiness score (0-100) and a short verdict
- An 11-point scorecard (problem, target user, metrics, scope, testable requirements, edge cases, error states, risks, privacy/security, timeline/ownership, rollout/analytics)
- Vague phrases quoted from your PRD, with measurable rewrites
- Missing pieces and weak requirements, with acceptance criteria
- The questions engineering is likely to ask
- A "Copy as checklist" button

## Why I built it

Specs that engineering can execute with zero clarification cycles save the most time. This tool checks for the gaps that cause those cycles.

## How it works

- `index.html`: the whole front end (no build step).
- `api/review.js`: a small serverless function. It holds the review prompt and the API key, caps input length, and rate-limits each IP. The page never sees the key.

## Run it yourself

1. Push this folder to a GitHub repo.
2. Go to vercel.com, choose **Add New > Project**, and import the repo. No build settings are needed.
3. In **Settings > Environment Variables**, add `ANTHROPIC_API_KEY` with your key from console.anthropic.com. Optionally add `MODEL` (default is a small, low-cost model; a larger model gives deeper reviews).
4. Redeploy. Open your Vercel URL and click "Try a sample".

Set a monthly spend limit in the Anthropic console before sharing the link publicly.

## Known limits

- PDFs aren't supported yet (paste the text instead).
- The score is the model's judgment, not a formula, so it can vary a few points between runs.
- The per-IP rate limit is in memory, so it resets when the function restarts. Use a store like Upstash Redis for a strict limit.

## Ideas for next versions

- Fixed rubric scoring computed from the scorecard
- PDF support
- Save and compare reviews over time
