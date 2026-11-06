# Playbook: gates, artifacts and evidence

The plugin's gate tool is deliberately simple: it checks **named artifacts**, not prose. A claim that a control exists is not an artifact; the artifact is the reviewed threat model, the passing negative test or the fresh evidence record.

## Gate map

| Gate | Required artifacts | Required evidence |
|---|---|---|
| Scope | `brief`, `jobs`, `nonGoals`, `acceptance` | Scope packet, one KPI, guardrails |
| UX | `flows`, `stateMatrix`, `accessibility` | Every state per screen; accessibility review |
| Architecture | `apiContract`, `dataModel`, `adr` | Contract, migrations, rollback path |
| Security | `threatModel`, `authzTests`, `secretsScan` | Object-authz negatives, secret and dependency scans |
| Reliability | `slos`, `failureTests`, `rollback` | SLOs, retry/failure tests, rollback rehearsal |
| RAG | `corpusInventory`, `acl`, `evalSet`, `evalResults` | Golden set, injection probes, ACL tests |
| Harness | `subagentContracts`, `budgets`, `approvals`, `audit` | Typed contracts, budget enforcement, approval/audit tests |
| Release | `ciEvidence`, `migrations`, `rollback`, `observability` | Fresh records for the release commit; dashboards |

A high/critical-risk release additionally requires `approvalMatrix`.

## Evidence record

An evidence record is not a URL. It must let a verifier answer:

- **Who** produced it (producer identity/integrity)?
- **Over what** (commit, image digest, dataset/index version)?
- **Which scope** (which checks, which acceptance criteria)?
- **When** (freshness relative to the release)?
- **Result** (command, exit code, artifact hash)?

A URL may locate the artifact, but it cannot substitute for these fields.

## GATE_G

`fullstack_gate` always states the GATE_G rule: it is **expansion-only**. KPI or guardrail failures hold autonomy expansion; they never block a release or a rollback. The KPI contract itself belongs to the product/ops owner, not to this planner.

## Definition of done (baseline)

- Acceptance criteria have executable tests, including negative and authorization cases.
- Every screen has default/loading/empty/partial/error/permission-denied states.
- Threat controls are implemented and tested, not merely listed.
- SLOs, dashboards and alerts have an owner and a runbook.
- Migrations and rollback/restore have been rehearsed.
- No secret is present in the repository or image.
- Evidence records are fresh and scoped to the release commit.
- RAG has a golden set and injection tests when applicable.
- Subagent handoffs validate against typed contracts and respect budgets.