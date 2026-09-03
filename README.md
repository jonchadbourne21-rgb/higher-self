# Higher Self — Applied AI Memory & Evaluation

Public TypeScript/React AI application repository showing hands-on work across longitudinal memory, retrieval-augmented generation (RAG), LLM evaluation, APIs, persistent state, and product delivery.

## Recruiting quick path

If you are reviewing this repository for applied-AI or AI-evaluation engineering work, start here:

- [`server/rag/evals/README.md`](server/rag/evals/README.md) — evaluation design, metrics, dataset construction, privacy/cost controls, known limitations, and the explicit Foundry integration boundary.
- [`server/rag/evals/foundry_evals.ts`](server/rag/evals/foundry_evals.ts) — TypeScript RAG evaluation runner covering precision@K, recall@K, MRR, LLM-judged relevance, groundedness, and latency.
- [`server/rag/evals/metrics.ts`](server/rag/evals/metrics.ts) — deterministic retrieval metrics isolated from database, network, and LLM behavior.
- [`server/rag/evals/judge.ts`](server/rag/evals/judge.ts) — bounded LLM-as-judge relevance and groundedness evaluation with structured outputs, content-addressed caching, and privacy truncation.
- [`server/rag/evals/foundry_evals.test.ts`](server/rag/evals/foundry_evals.test.ts) — automated coverage for the evaluation surface.
- [`package.json`](package.json) — TypeScript/React application stack plus `eval:rag` and `eval:rag:dataset` commands.

## Evaluation approach visible in the code

- **Deterministic where possible.** Retrieval metrics are pure functions and unit-testable without model or network calls.
- **Model judgment is bounded.** LLM judges are used for relevance and groundedness where deterministic checks are insufficient, with per-run query limits and caching.
- **Claims stay scoped to evidence.** The evaluation documentation records missing capabilities and known dataset bias rather than presenting unverified integrations or metrics as finished.
- **Privacy and cost are explicit constraints.** Evaluation payloads truncate content, avoid sending user identifiers to model judges, and bound judged queries.
- **Failure is recorded rather than hidden.** Individual retrieval/judge failures remain visible in evaluation results instead of fabricating scores or losing the entire run.

## Application stack

TypeScript · React · tRPC · Express · Drizzle ORM · MySQL · Vitest · LLM APIs · embedding-based semantic retrieval · persistent user context · web/mobile product surfaces.

## Scope and disclosure boundary

This repository is a public product-and-evaluation engineering surface. It does **not** contain private JCEE Labs execution-assurance source, proprietary attack corpora, private schemas, unpublished recovery algorithms, partner material, or counsel material.

For a separate recruiting-only consequence-flow demonstrator, see:

https://github.com/jonchadbourne21-rgb/jcee-labs-website/tree/main/career-portfolio

---

**Jonathan Chadbourne**  
Dallas, TX · jonchadbourne21@gmail.com · https://jceelabs.com
