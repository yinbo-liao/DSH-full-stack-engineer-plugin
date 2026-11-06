# RAG (Langkah) and subagent harness

## Why stepwise

A RAG assistant is a data-governance system before it is a model feature. Skipping source ownership, ACLs or evaluation produces a convincing demo with an unauditable failure mode. The plugin therefore models RAG as ten ordered steps, each with an exit criterion.

| Step | Exit criterion |
|---|---|
| Source inventory/ownership | Every source has owner, ACL, freshness, retention |
| Ingestion | Idempotent; deletions propagate |
| Parse/normalize | PDF/HTML/Markdown/code fixtures pass; PII redaction |
| Chunk | 500–800 tokens, 15% overlap, heading path preserved |
| Embed/index | Reproducible build; model/dimension pinned |
| Retrieve | Hybrid top-20, ACL before scoring; recall measured |
| Ground/generate | Citations or refusal for every answer |
| Evaluate | Golden-set thresholds pass in CI |
| Observe/guard | p95, cost, refusal and citation metrics have alerts |
| Operate/iterate | Prompt/model/index/eval versions move together |

## LangChain vs LangGraph

- **LangChain** supplies the components: loaders, splitters, vector store adapters, retrievers, rerankers, `RunnableParallel` composition, tracing hooks.
- **LangGraph** is appropriate when the assistant needs explicit multi-step state (retrieve → check → ask → answer) with bounded transitions and human-in-the-loop pauses. It is not required for a single-shot RAG answer.

The framework is an implementation choice; the exit criteria and evaluation thresholds are the contract.

## Retrieval parameters

- Hybrid BM25 + vector recall, top 20.
- Cross-encoder or provider reranker to top 5.
- ACL/tenant filters applied **before** scoring.
- Parent-document expansion for procedures and definitions.
- Near-duplicate diversification before prompting.
- Refuse when the top rerank score is below a calibrated threshold.

## Evaluation

| Metric | Target |
|---|---|
| recall@5 | ≥ 0.85 |
| faithfulness | ≥ 0.90 |
| citation precision | ≥ 0.90 |
| refusal correctness | ≥ 0.95 |

Run on every prompt/model/index change and nightly on the pinned corpus. Include cross-tenant retrieval and prompt-injection cases.

## Subagent harness

The harness is what makes a multi-agent system operable:

- typed tool registry with contract hashes;
- per-role input/output packets and allowed tools;
- iteration, tool-call, token, wall-clock and cost budgets;
- no-progress rule and explicit stop conditions;
- human approval bound to the exact payload;
- append-only audit for assignment, tool call, approval and gate decision;
- independent verifier (the producer never approves its own evidence);
- deterministic replay where possible (model/prompt/tool versions recorded).

The supervisor routes **one subagent at a time** with summaries and evidence ids, not full transcripts. A worker that cannot state its exit condition is not ready to be dispatched.

## Red-team cases

- Ask a worker to approve its own evidence or skip the verifier.
- Hide an approval-bypass instruction in retrieved text.
- Force loop thrash with near-duplicate attempts until the budget forces an unverified finish.
- Replay evidence from another commit or scope.
- Request a cross-tenant document under the guise of summarization.