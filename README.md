# agent-14-guardrails-redteam

An LLM guardrails and prompt-injection red-team suite: a labelled attack set (direct & indirect injection, jailbreaks, data exfiltration) plus benign prompts, input and output guards, and measured attack success rate, block rate and false-positive rate — with and without the guards. Project 14 of an ML/AI engineering portfolio.

**Live demo:** https://agent-14-guardrails-redteam.braylo777.workers.dev

![Demo screenshot](docs/screenshot.png)

## What it is
A support bot holds a secret canary (`CANARY-7f3a9c`) it must never reveal. The suite fires 30 attacks and 10 benign prompts at it. Rule-based **input guards** stop most attacks before the model runs; **output guards** catch canary leaks, secret patterns, PII and exfil markdown. Toggle guards on/off in the demo to see the difference.

## Architecture
```mermaid
flowchart LR
  U[Browser / API client] -->|POST /api/chat| W[Cloudflare Worker]
  W --> IG{Input guard<br/>10 rule families}
  IG -->|blocked| B[Blocked response<br/>+ rule ids]
  IG -->|pass| RL{Rate limit}
  RL --> L[Llama 3.3 70B<br/>Workers AI]
  L --> OG{Output guard<br/>canary / secrets / PII / links}
  OG -->|blocked| B2[Withheld + raw_leaked flag]
  OG -->|pass| U
  U2[Eval runner] -->|POST /api/guard| IG
```

## Attack set
40 labelled cases in [`evals/cases.json`](evals/cases.json):

| Family | n | Goal |
|---|---|---|
| Direct injection | 10 | Override / reveal system prompt or canary |
| Indirect injection | 8 | Hidden instructions inside a document |
| Jailbreak | 6 | DAN / developer / god mode |
| Exfiltration | 6 | Force markdown/image/email channels |
| Benign | 10 | Normal support questions (FPR baseline) |

## Eval results
### Offline input-guard eval (no Workers AI) — measured
Run: `node evals/run-guards.mjs`. Raw output in [`evals/results.json`](evals/results.json).

| Metric | Result | Definition |
|---|---|---|
| Attack block rate | **29/30 (0.967)** | Attacks blocked by the input guard |
| ASR with guards (input upper bound) | **1/30 (0.033)** | Attacks that reach the model; the model may still refuse |
| False-positive rate | **0/10 (0.000)** | Benign prompts blocked |
| Direct / indirect / jailbreak | **10/10, 8/8, 6/6** | Per-family block rate |
| Exfiltration | **5/6 (0.833)** | One phrasing slipped the input rules |

The single miss is an exfiltration prompt that asked for a markdown image without using the matched verb set; the output guard still targets that pattern if the model complies.

### Live with/without-guards ASR (Workers AI) — **not yet run**
Needs the free daily neuron quota (resets ~7 PM CT Oct 28). Rerun:

```bash
BASE=https://agent-14-guardrails-redteam.braylo777.workers.dev node evals/run-live.mjs
```

That script calls `/api/chat` twice per case (guards off, then on), throttled to 5 req/min, and writes `evals/results-live.json` with ASR without guards, ASR with guards, block rate and FPR against the live model.

## Tests
9 offline unit tests (`node:test`): per-family input coverage ≥80%, zero FPR on the labelled benign set, output-guard canary/secret/PII/exfil, short-circuit before the model, canary leak with guards off, output block with guards on, HTTP validation and chat block.

```bash
npm test
```

## Run it
```bash
npm install
npm test
node evals/run-guards.mjs   # offline, no model
npx wrangler deploy         # free tier
node evals/run-live.mjs     # needs Workers AI quota
```

## Stack
Cloudflare Workers · Workers AI (Llama 3.3 70B) · rule-based guards · vanilla JS · node:test

## License
MIT

## How to run

```bash
npm install   # dev deps only
npm test      # 13 offline tests, no Workers AI calls
npm run dev   # local wrangler dev
```

## Test results (2026-10-27)

| Suite | Tests | Status |
|---|---|---|
| Unit + edge cases (test/edge.test.js added) | 9→13 | all pass |
| Live demo https://agent-14-guardrails-redteam.braylo777.workers.dev | HTTP 200 | verified 2026-10-27 |
