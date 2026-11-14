# dsh-fullstack-engineer

A DeepSeek Harness plugin that gives an agent a **full-stack engineering operating contract**: scoped requirements, UX patterns, security and reliability, stepwise RAG with LangChain/LangGraph, and harness/loop engineering for subagent applications.

It is a planning and review instrument. It does not generate an application for you; it forces the order and evidence that make an application shippable.

## What it contributes

| Tool | Output |
|---|---|
| `fullstack_plan` | Jobs, non-goals, acceptance criteria, UX flows/states, architecture, threat model, SLOs, delivery gates, definition of done |
| `fullstack_goal` | GOAL-* artifact with AC IDs, evidence requirements, risks, rollback and suggested `.agent/goals/*.yaml` path |
| `fullstack_evaluate` | Evidence-gated weighted scoring (**records** evidence, does not verify it); missing checks stay `not_run`; 85/90/70 thresholds |
| `fullstack_compare` | Baseline comparison: acceptance regressions, >20% p95 regression, API break, new critical/high findings |
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

## Goal, evaluation and comparison (v0.2)

The v0.2 tools close the loop between a plan and an acceptance decision:

- `fullstack_goal` emits a validated goal document with `GOAL-*`, `AC-01..`, verification method, required evidence, risks, rollback and the exact path to persist it. It does not write the file; use a host write tool with approval.
- `fullstack_evaluate` takes measured checks (`category`, `name`, `status`, `score`, `evidence`) and applies the five-subagent weights: functional 30, regression 15, security 15, performance 15, maintainability 10, architecture 10, documentation 5. Missing checks are `not_run`; a passed check without evidence blocks; pass requires every category measured and ≥70, functional and security ≥90, overall ≥85, all checks passed and complete evidence.
- `fullstack_compare` blocks acceptance on an acceptance regression, a p95 regression above 20%, an API compatibility break, or a new critical/high security finding. Missing measurements are `not_run`.

Scores are self-reported inputs. The tool records evidence names and refuses missing evidence, but **it does not verify the evidence** — use the CI evidence gate / an independent verifier for that. See `docs/EVALUATION.md`.

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

1. Install the current source. The repository is **v0.2.1**; no npm release is published yet, so use Git or a local checkout:

   ```bash
   dsh plugin --profile web add git+https://github.com/yinbo-liao/DSH-full-stack-engineer-plugin.git
   # or from a local checkout:
   dsh plugin --profile web add file:D:/path/to/dsh-fullstack-engineer
   ```

2. Add the bundle in the Plugins page, or add the `fullstack-engineer` entry from `cordis.patch.yml` to the profile.
3. Restart/reload the profile. The repository includes the built `lib/`, so the Git install needs no separate build step.

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

It asserts that the profile lists the bundle, that all nine tools and the prompt section register, and that the plan, goal, evaluation, comparison and gate tools execute through the real tool runtime. `DSH_HARNESS` defaults to `Y:/DSH/deepseek-harness` when resolving the real packages.

## Configuration

| Key | Default | Purpose |
|---|---|---|
| `rigor` | `standard` | `lean`, `standard` or `regulated`; regulated adds approval/audit expectations |
| `defaultStack` | `FastAPI + PostgreSQL + React` | Stack used when the brief does not choose one |
| `prompt` | `true` | Contribute the playbook section to the system prompt |
| `plan`, `goal`, `evaluate`, `compare`, `uxReview`, `securityReview`, `ragBlueprint`, `subagentPlan`, `gate` | `true` | Register individual tools |
| `maxOpenQuestions` | `8` | Cap on open questions (3–20) |

## Caveats and limitations

- **Evidence is not verified.** `fullstack_evaluate` checks that evidence names exist for passed checks and refuses missing evidence, but it cannot confirm that a test ran or that a record is genuine. Scores and evidence are self-reported; CI records or an independent verifier must validate them. The tool output says this explicitly.
- **Versioning.** The repository and the installed `web` profile are **0.2.1**. There is no published npm package yet; install from Git or a local checkout. The built `lib/` is committed so Git installs do not need a build step.
- **Opinionated by design.** The order (frame → UX → contract → threat model → evaluate → release evidence) is the value proposition. It is not a lightweight form builder. Teams can use individual tools, disable the prompt, and choose `lean` for less ceremony — but scope, object authorization and evidence remain required.
- **No network, filesystem or process access.** The tools analyze the information the agent supplies and return structured artifacts. They cannot inspect the repo, run tests, write the goal file, call providers or deploy. Those actions belong to host tools, CI and `dsh-secure-mesh` approvals.
- The threat model is design-level and names required tests; it does not claim they ran.
- Planning is deterministic and is not a substitute for product discovery.

## License

MIT.