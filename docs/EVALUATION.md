# Goal, evaluation and comparison

## Goal artifact

`fullstack_goal` returns:

- `goalId` (`GOAL-YYYYMMDD-slug` or a supplied id)
- outcome, scope, non-goals, constraints, risks, baseline
- acceptance criteria `AC-01..` with a verification method and required evidence per criterion
- rollback steps (revert, feature flag, migration down/restore)
- required evidence records and a suggested path `.agent/goals/<goalId>.yaml`

The tool does not write the file. Persist it with a host write tool and approval; keep the goal file under version control so the acceptance criteria and baseline cannot move silently.

## Evaluation

Categories and weights are the five-subagent model's: functional 30, regression 15, security 15, performance 15, maintainability 10, architecture 10, documentation 5.

A check is `{category, name, status: passed|failed|not_run, score?: 0..100, evidence?: string[]}`.

Rules:

- A category with no measured check, or any `not_run` check, is missing and blocks acceptance.
- A failed check sets the category to `failed` (score capped at 60) and blocks.
- A passed check must have a score and at least one evidence name/record.
- Pass requires every category measured and ≥70, functional and security ≥90, overall ≥85, all checks passed and complete evidence.
- A failed security category recommends `reject`; other failures recommend `rework`.
- Missing measurements never become a pass.

Scores are self-reported. The tool is a rubric and consistency check, not an evidence verifier. The evaluator must be independent of the producer, and CI/evidence records must be verified separately.

## Comparison

`fullstack_compare` compares candidate and baseline metrics:

```json
{
  "acceptance": {"AC-01": true, "AC-02": true},
  "p95Ms": 120,
  "apiCompatible": true,
  "criticalFindings": 0,
  "highFindings": 1
}
```

It blocks on acceptance regressions, p95 regression above 20%, API incompatibility, or new critical/high findings. Missing p95/API/acceptance values are `not_run`, not pass.

## What this does not do

- It does not run the tests or verify a score.
- It does not change the baseline or merge/deploy.
- It does not replace the evidence gate in `ci/ci.yml` or the secure-mesh approval path.
