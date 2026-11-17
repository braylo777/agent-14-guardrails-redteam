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
Run: `python3 evals/run_guards.py`. Raw output in [`evals/results.json`](evals/results.json).

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
BASE=https://agent-14-guardrails-redteam.braylo777.workers.dev python3 evals/run_live.py
```

That script calls `/api/chat` twice per case (guards off, then on), throttled to 5 req/min, and writes `evals/results-live.json` with ASR without guards, ASR with guards, block rate and FPR against the live model.

## Tests
Python: 6 test functions; Rust: 2 test functions (model mocked): per-family input coverage >= 80%, zero false positives on the labelled benign set, output-guard signals, input-block short-circuit before the model, canary detection with guards off, HTTP validation and the rate-limit order. The old JavaScript, the Python and the Rust code give identical verdicts and rule ids on 113 input strings (cases, Unicode tricks, fullwidth letters, zero-width characters) and 15 output strings.

```bash
python3 -m pytest
cd worker && cargo test
```

## Run it
```bash
python3 -m pytest                       # Python tests
cd worker && cargo test                 # Rust tests
cd worker && worker-build --release     # build the Worker (wasm)
python3 evals/run_guards.py             # offline, no model
wrangler deploy                         # free tier
python3 evals/run_live.py               # needs Workers AI quota
```

The previous JavaScript version is on the `legacy-js` branch and the `pre-pycrust` tag.

## Stack
Cloudflare Workers (Rust, workers-rs) · Workers AI (Llama 3.3 70B) · rule-based guards · Python (pytest)

## License
MIT
