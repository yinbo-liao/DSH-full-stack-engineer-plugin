# dsh-fullstack-engineer

A DeepSeek Harness plugin that gives an agent a **full-stack engineering operating contract**: scoped requirements, UX patterns, security and reliability, stepwise RAG with LangChain/LangGraph, and harness/loop engineering for subagent applications.

It is a planning and review instrument. It does not generate an application for you; it forces the order and evidence that make an application shippable.

## What it contributes

| Tool | Output |
|---|---|
| `fullstack_plan` | Jobs, non-goals, acceptance criteria, UX flows/states, architecture, threat model, SLOs, delivery gates, definition of done |
| `fullstack_ux_review` | Per-screen state matrix, pattern fit, accessibility, copy rules, anti-patterns |
| `fullstack_security_review` | Design-level threat model (object authz, tenant isolation, injection, SSRF, secrets, CSRF, audit, AI boundaries), controls and tests |
| `fullstack_rag_blueprint` | Ten-step RAG: source/ACL inventory → ingestion → parse → chunk → embed/index → hybrid retrieve/rerank → grounded generation → eval → observe → operate |
| `fullstack_subagent_plan` | Supervisor and worker contracts, allowed tools, loop budgets, no-progress/stop rules, harness requirements, gates, red-team cases |
| `fullstack_gate` | Pass/hold from named artifacts, with the evidence records required to close the gate |

Plus a system-prompt section (`fullstack-engineer:playbook`) stating the non-negotiable engineering order.

## The order the plugin enforces

1. **Frame** — users, jobs, non-goals, constraints, acceptance, one success KPI.
2. **UX** — flows and every state (`default`, `loading`, `empty`, `partial`, `error`, `offline`, `permission-denied`, `success`), accessibility and copy.
3. **Contract** — API, data model, authorization, migration, rollback.
4. **Threat model** — object authz, tenancy, injection, SSRF, secrets, CSRF/session, audit; for AI: prompt injection, RAG ACL leakage, tool abuse.
5. **Evaluate** — corpus owners/ACLs, golden set, thresholds, rollback before RAG or subagents.
6. **Release evidence** — records with producer, commit, scope and freshness; never a URI alone.

## RAG with LangChain/LangGraph

The blueprint is explicitly **stepwise (Langkah)**: every stage has an exit criterion. LangChain is the component toolkit (`DocumentLoader`, `TextSplitter`, `VectorStore`, `Retriever`, `RunnableParallel`, reranker); LangGraph is the orchestration option when the assistant needs bounded multi-step state. The design includes:

- hybrid retrieval (BM25 + vector), ACL filtering before scoring, top-20 recall → 5 reranked;
- 500–800 token chunks, 15% overlap, parent-document expansion;
- citations or refusal, no unsupported answers;
- golden set of 50+ questions with refusal and injection cases;
- thresholds: recall@5 ≥ 0.85, faithfulness ≥ 0.90, citation precision ≥ 0.90, refusal correctness ≥ 0.95;
- token/cost/latency budgets and a weekly feedback loop.

## Harness and subagent loops

`fullstack_subagent_plan` produces a supervisor + typed workers (product, UX, backend, frontend, security, verifier), one-at-a-time routing, context-budget discipline, iteration/tool-call limits, no-progress rule, stop conditions, approval gates, an append-only audit expectation, and red-team cases such as "approve your own evidence" or "skip the verifier".

Gates: `scope → ux → build → reliability → rag → harness → release → outcome`. GATE_G is expansion-only; a KPI/guardrail failure never blocks a release or rollback.

## Security integration

When `dsh-secure-mesh` is installed, the prompt tells the agent to use:

- `secure_fetch` for external HTTP (no raw egress),
- `request_human_approval` before irreversible/high-impact actions (only `approved: true` authorizes),
- `validate_claim` before SQL/Python/financial claims,
- the untrusted-data fencing rules for retrieved and external text.

This plugin itself has no network, filesystem or process access.

## Install

The package declares a `dsh.bundle.patch`, so it can be installed like any DSH bundle:

1. Publish/install the package (`dsh-fullstack-engineer@0.1.0`) or a Git checkout.
2. Add the bundle in the Plugins page, or add the `fullstack-engineer` entry from `cordis.patch.yml` to the profile.
3. Restart/reload the profile.

For local development:

```bash
npm install
npm run build
npm run test:stub
```

In a sandbox that blocks the Node test runner's child processes, run tests in-process:

```bash
node --test --test-isolation=none tests/playbook.test.mjs
node --import ./tests/support/stub-register.mjs --test --test-isolation=none tests/plugin.test.mjs
```

### Real-profile integration test

The plugin is installed in the local `web` profile and the integration test boots the **real** Cordis `Context`, `SystemPrompt` and `ToolRuntime` (not the stubs):

```bash
dsh plugin --profile web add file:D:/path/to/dsh-fullstack-engineer
node --import ./tests/support/real-register.mjs \
  --test --test-isolation=none tests/integration.real.test.mjs
```

It asserts that the profile lists the bundle, that all six tools and the prompt section register, and that `fullstack_plan` / `fullstack_gate` execute through the real tool runtime. `DSH_HARNESS` defaults to `Y:/DSH/deepseek-harness` when resolving the real packages.

## Configuration

| Key | Default | Purpose |
|---|---|---|
| `rigor` | `standard` | `lean`, `standard` or `regulated`; regulated adds approval/audit expectations |
| `defaultStack` | `FastAPI + PostgreSQL + React` | Stack used when the brief does not choose one |
| `prompt` | `true` | Contribute the playbook section to the system prompt |
| `plan`, `uxReview`, `securityReview`, `ragBlueprint`, `subagentPlan`, `gate` | `true` | Register individual tools |
| `maxOpenQuestions` | `8` | Cap on open questions (3–20) |

## Limits

- Planning is deterministic and opinionated; it is not a substitute for product discovery.
- The threat model is design-level. It names required tests; it does not claim they ran.
- It does not deploy, migrate, call providers or write code.
- Evidence verification is the host/CI's responsibility; the gate tells you what must exist.

## License

MIT.