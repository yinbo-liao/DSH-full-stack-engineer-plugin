/**
 * v0.2 delivery controls: goal artifact, evidence-backed evaluation and
 * baseline comparison.
 *
 * The point of this module is to make "done" falsifiable. A goal names its
 * acceptance criteria and the evidence each one needs; an evaluation refuses to
 * turn missing checks into passes; a comparison refuses to call a regression an
 * improvement.
 *
 * Scores are still self-reported inputs. The tool records the evidence names
 * alongside them, but it does not pretend to verify a test result. That is the
 * verifier/CI's job.
 *
 * @module fullstack-engineer/evaluation
 */

import type { PlaybookConfig, Risk } from './playbook.js'

export const EVAL_WEIGHTS = {
  functional: 30,
  regression: 15,
  security: 15,
  performance: 15,
  maintainability: 10,
  architecture: 10,
  documentation: 5,
} as const

export type EvalCategory = keyof typeof EVAL_WEIGHTS
export type EvalStatus = 'passed' | 'failed' | 'not_run'

const CATEGORIES = Object.keys(EVAL_WEIGHTS) as EvalCategory[]

export interface GoalInput {
  id?: string
  outcome: string
  scope?: string[]
  constraints?: string[]
  risks?: string[]
  baseline?: string
  hasAi?: boolean
  subagents?: boolean
  risk?: Risk
}

export interface AcceptanceCriterion {
  id: string
  criterion: string
  verification: string
  evidence: string[]
}

export interface GoalArtifact {
  goalId: string
  status: 'draft'
  outcome: string
  scope: string[]
  nonGoals: string[]
  constraints: string[]
  risks: string[]
  baseline: string
  acceptance: AcceptanceCriterion[]
  rollback: string[]
  requiredEvidence: string[]
  suggestedPath: string
  generatedAt: string
}

export interface EvaluationCheck {
  category: EvalCategory
  name: string
  status: EvalStatus
  score?: number
  evidence?: string[]
}

export interface EvaluationResult {
  goalId: string
  verification: 'self-reported'
  decision: 'accept' | 'rework' | 'reject' | 'not_run'
  overallScore: number | null
  categories: Array<{
    category: EvalCategory
    weight: number
    score: number | null
    status: EvalStatus
    checks: number
  }>
  gates: {
    allCategoriesMeasured: boolean
    allCategoriesAbove70: boolean
    functionalAtLeast90: boolean
    securityAtLeast90: boolean
    overallAtLeast85: boolean
    allChecksPassed: boolean
    evidenceComplete: boolean
  }
  blockers: string[]
  missing: string[]
  requiredEvidence: string[]
}

export interface ComparisonMetrics {
  acceptance: Record<string, boolean>
  p95Ms?: number
  apiCompatible?: boolean
  criticalFindings?: number
  highFindings?: number
}

export interface ComparisonResult {
  goalId: string
  verification: 'self-reported'
  decision: 'accept' | 'rework' | 'not_run'
  acceptanceRegressions: string[]
  performanceRegressionPct: number | null
  apiCompatible: boolean | null
  newCriticalFindings: number
  newHighFindings: number
  blockers: string[]
  missing: string[]
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'goal'
}

function validId(value: string): string {
  if (!/^[A-Za-z0-9._-]+$/.test(value)) {
    throw new Error('fullstack: goal id may contain only letters, digits, dot, underscore and hyphen')
  }
  return value
}

/**
 * Build a goal artifact. Persisting it is the host's job (with an approval or
 * write tool); this function only returns the validated document.
 */
export function buildGoal(input: GoalInput, config: PlaybookConfig): GoalArtifact {
  const outcome = input.outcome.trim()
  if (outcome === '') throw new Error('fullstack: outcome is required')
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '')
  const goalId = validId(input.id ?? `GOAL-${date}-${slug(outcome)}`)
  const hasAi = input.hasAi ?? /\b(ai|assistant|rag|chat)\b/i.test(outcome)
  const subagents = input.subagents ?? /\b(subagent|multi-agent|supervisor)\b/i.test(outcome)

  const acceptance: AcceptanceCriterion[] = [
    {
      id: 'AC-01',
      criterion: `${outcome} works end to end for the primary actor.`,
      verification: 'Integration or acceptance test on the release commit.',
      evidence: ['test transcript', 'commit sha', 'exit code'],
    },
    {
      id: 'AC-02',
      criterion: 'Invalid input is rejected with a field-level error and no partial write.',
      verification: 'Negative API/UI test.',
      evidence: ['test transcript', 'commit sha'],
    },
    {
      id: 'AC-03',
      criterion: 'A second user/tenant cannot read or mutate the object.',
      verification: 'Object-authorization and tenant-isolation tests.',
      evidence: ['negative test transcript', 'commit sha'],
    },
    {
      id: 'AC-04',
      criterion: 'A dependency failure is retryable or recoverable without duplicate effects.',
      verification: 'Fault-injection/idempotency test.',
      evidence: ['fault-injection result', 'idempotency-key trace'],
    },
    {
      id: 'AC-05',
      criterion: 'Consequential actions are attributable in the audit trail.',
      verification: 'Audit assertion for approval, export, role change or delete.',
      evidence: ['audit record sample', 'commit sha'],
    },
  ]
  if (hasAi) {
    acceptance.push(
      {
        id: 'AC-06',
        criterion: 'Assistant answers cite retrieved sources or refuse unsupported questions.',
        verification: 'Golden-set evaluation with citation and refusal cases.',
        evidence: ['eval report', 'corpus/index version'],
      },
      {
        id: 'AC-07',
        criterion: 'Prompt injection and cross-tenant retrieval are blocked.',
        verification: 'Adversarial retrieval/tool tests.',
        evidence: ['red-team report', 'commit sha'],
      },
    )
  }
  if (subagents) {
    acceptance.push({
      id: 'AC-08',
      criterion: 'Every subagent handoff validates against a typed contract and respects its budget.',
      verification: 'Harness contract/budget tests.',
      evidence: ['contract test transcript', 'budget ledger sample'],
    })
  }
  if (input.risk === 'high' || input.risk === 'critical' || config.rigor === 'regulated') {
    acceptance.push({
      id: 'AC-09',
      criterion: 'Irreversible/high-impact actions are bound to a human approval of the exact payload.',
      verification: 'Approval-negative test: tool denied without approval.',
      evidence: ['approval decision record', 'payload hash', 'denial transcript'],
    })
  }

  const nonGoals = [
    'Native mobile clients unless explicitly requested.',
    'Autonomous high-impact writes without a human approval gate.',
    'Weakening gates or changing the baseline to make a result pass.',
  ]

  return {
    goalId,
    status: 'draft',
    outcome,
    scope: input.scope !== undefined && input.scope.length > 0
      ? input.scope
      : ['Primary flow end to end', 'Failure and recovery states', 'Authorization and audit'],
    nonGoals,
    constraints: input.constraints ?? ['No production access by default', 'No secrets in the repository'],
    risks: input.risks ?? [
      'Scope drift after the plan is approved.',
      'Unverified evidence or stale baseline.',
      'Missing authorization/tenant boundary.',
    ],
    baseline: input.baseline ?? 'protected main branch',
    acceptance,
    rollback: [
      'Revert the candidate commit set.',
      'Disable the feature flag or restore the previous image.',
      'Run the migration down path or restore the pre-migration backup.',
    ],
    requiredEvidence: [
      'Evidence records with producer, commit, scope and freshness.',
      'Acceptance-criteria transcript for every AC.',
      'Security/authorization negatives and secret scan.',
      'Baseline comparison for functional, performance and API compatibility.',
      ...(hasAi ? ['RAG golden-set and prompt-injection results.'] : []),
      ...(subagents ? ['Subagent contract and budget tests.'] : []),
    ],
    suggestedPath: `.agent/goals/${goalId}.yaml`,
    generatedAt: new Date().toISOString(),
  }
}

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`fullstack: ${field} must be an object`)
  }
  return value as Record<string, unknown>
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
}

/** Validate the JSON argument accepted by `fullstack_evaluate`. */
export function normalizeChecks(value: unknown): EvaluationCheck[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('fullstack: checks must be a non-empty array')
  }
  return value.map((raw, index) => {
    const item = asRecord(raw, `checks[${index}]`)
    const category = item.category
    if (typeof category !== 'string' || !CATEGORIES.includes(category as EvalCategory)) {
      throw new Error(`fullstack: checks[${index}].category must be one of ${CATEGORIES.join(', ')}`)
    }
    const name = item.name
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error(`fullstack: checks[${index}].name is required`)
    }
    const status = item.status
    if (status !== 'passed' && status !== 'failed' && status !== 'not_run') {
      throw new Error(`fullstack: checks[${index}].status must be passed|failed|not_run`)
    }
    if (item.score !== undefined && (typeof item.score !== 'number' || item.score < 0 || item.score > 100)) {
      throw new Error(`fullstack: checks[${index}].score must be 0..100`)
    }
    return {
      category: category as EvalCategory,
      name,
      status,
      ...(item.score === undefined ? {} : { score: item.score }),
      evidence: asStringArray(item.evidence),
    }
  })
}

/**
 * Evaluate a goal against checks. Missing checks remain `not_run`; they can
 * never become a pass. A passed check without evidence blocks the result.
 */
export function evaluateSubmission(goalId: string, checks: EvaluationCheck[]): EvaluationResult {
  if (goalId.trim() === '') throw new Error('fullstack: goalId is required')
  const blockers: string[] = []
  const missing: string[] = []
  const categories = CATEGORIES.map((category) => {
    const categoryChecks = checks.filter(check => check.category === category)
    const measured = categoryChecks.filter(check => check.status !== 'not_run')
    let score: number | null = null
    let status: EvalStatus = 'not_run'

    if (measured.length === 0) {
      missing.push(category)
      blockers.push(`${category}: no measured check`)
    } else {
      const notRun = categoryChecks.filter(check => check.status === 'not_run')
      if (notRun.length > 0) {
        missing.push(`${category} (${notRun.length} not_run)`)
        blockers.push(`${category}: ${notRun.length} check(s) not_run`)
      }
      const failed = measured.filter(check => check.status === 'failed')
      const passed = measured.filter(check => check.status === 'passed')
      if (failed.length > 0) {
        status = 'failed'
        score = Math.min(60, ...failed.map(check => check.score ?? 0))
        blockers.push(`${category}: ${failed.length} failed check(s)`)
      } else {
        status = 'passed'
        const scored = passed.filter(check => check.score !== undefined)
        if (scored.length !== passed.length) {
          blockers.push(`${category}: every passed check needs a 0..100 score`)
        }
        score = scored.length === 0
          ? 0
          : Math.round(scored.reduce((sum, check) => sum + (check.score ?? 0), 0) / scored.length)
        const noEvidence = passed.filter(check => (check.evidence ?? []).length === 0)
        if (noEvidence.length > 0) {
          blockers.push(`${category}: ${noEvidence.length} passed check(s) have no evidence`)
        }
      }
    }

    return { category, weight: EVAL_WEIGHTS[category], score, status, checks: categoryChecks.length }
  })

  const allMeasured = missing.length === 0
  const allPassed = checks.every(check => check.status === 'passed')
  const evidenceComplete = checks
    .filter(check => check.status === 'passed')
    .every(check => (check.evidence ?? []).length > 0)
  const allAbove70 = allMeasured && categories.every(category => (category.score ?? 0) >= 70)
  const functional = categories.find(category => category.category === 'functional')?.score ?? null
  const security = categories.find(category => category.category === 'security')?.score ?? null
  const functionalAtLeast90 = functional !== null && functional >= 90
  const securityAtLeast90 = security !== null && security >= 90
  const overallScore = allMeasured
    ? Math.round(categories.reduce((sum, category) => sum + (category.score ?? 0) * category.weight, 0) / 100)
    : null
  const overallAtLeast85 = overallScore !== null && overallScore >= 85

  const gates = {
    allCategoriesMeasured: allMeasured,
    allCategoriesAbove70: allAbove70,
    functionalAtLeast90,
    securityAtLeast90,
    overallAtLeast85,
    allChecksPassed: allPassed,
    evidenceComplete,
  }

  const failedSecurity = categories.some(
    category => category.category === 'security' && category.status === 'failed',
  )
  const decision = !allMeasured || !allPassed || !evidenceComplete
    ? (failedSecurity ? 'reject' : 'rework')
    : Object.values(gates).every(Boolean)
      ? 'accept'
      : (failedSecurity ? 'reject' : 'rework')

  return {
    goalId,
    verification: 'self-reported',
    decision,
    overallScore,
    categories,
    gates,
    blockers: [...new Set(blockers)],
    missing,
    requiredEvidence: [
      'Every passed check carries a verifiable evidence record (producer, commit, scope, freshness).',
      'Security and functional categories are independently reviewed.',
      'The evaluator did not author the candidate.',
    ],
  }
}

function normalizeMetrics(value: unknown, field: string): ComparisonMetrics {
  const item = asRecord(value, field)
  const acceptanceRaw = item.acceptance
  if (acceptanceRaw === null || typeof acceptanceRaw !== 'object' || Array.isArray(acceptanceRaw)) {
    throw new Error(`fullstack: ${field}.acceptance must be an object of booleans`)
  }
  const acceptance: Record<string, boolean> = {}
  for (const [key, entry] of Object.entries(acceptanceRaw)) {
    if (typeof entry !== 'boolean') throw new Error(`fullstack: ${field}.acceptance.${key} must be boolean`)
    acceptance[key] = entry
  }
  const result: ComparisonMetrics = { acceptance }
  if (typeof item.p95Ms === 'number') result.p95Ms = item.p95Ms
  if (typeof item.apiCompatible === 'boolean') result.apiCompatible = item.apiCompatible
  if (typeof item.criticalFindings === 'number') result.criticalFindings = item.criticalFindings
  if (typeof item.highFindings === 'number') result.highFindings = item.highFindings
  return result
}

/** Compare candidate metrics against a baseline. A >20% p95 regression blocks. */
export function compareCandidate(
  goalId: string,
  candidateValue: unknown,
  baselineValue: unknown,
): ComparisonResult {
  if (goalId.trim() === '') throw new Error('fullstack: goalId is required')
  const candidate = normalizeMetrics(candidateValue, 'candidate')
  const baseline = normalizeMetrics(baselineValue, 'baseline')
  const blockers: string[] = []
  const missing: string[] = []

  const acceptanceRegressions = Object.keys(baseline.acceptance).filter(
    key => baseline.acceptance[key] === true && candidate.acceptance[key] === false,
  )
  if (acceptanceRegressions.length > 0) {
    blockers.push(`acceptance regressions: ${acceptanceRegressions.join(', ')}`)
  }
  const missingCandidate = Object.keys(baseline.acceptance).filter(
    key => candidate.acceptance[key] === undefined,
  )
  if (missingCandidate.length > 0) {
    missing.push(...missingCandidate.map(key => `candidate acceptance ${key}`))
  }

  let performanceRegressionPct: number | null = null
  if (candidate.p95Ms === undefined) missing.push('candidate p95Ms')
  if (baseline.p95Ms === undefined) missing.push('baseline p95Ms')
  if (candidate.p95Ms !== undefined && baseline.p95Ms !== undefined && baseline.p95Ms > 0) {
    performanceRegressionPct = Math.round(((candidate.p95Ms - baseline.p95Ms) / baseline.p95Ms) * 1000) / 10
    if (performanceRegressionPct > 20) {
      blockers.push(`p95 regression ${performanceRegressionPct}% exceeds 20%`)
    }
  }

  const apiCompatible = candidate.apiCompatible ?? null
  if (apiCompatible === null) missing.push('candidate apiCompatible')
  else if (!apiCompatible) blockers.push('API compatibility is broken')

  const candidateCritical = candidate.criticalFindings ?? 0
  const candidateHigh = candidate.highFindings ?? 0
  const baselineCritical = baseline.criticalFindings ?? 0
  const baselineHigh = baseline.highFindings ?? 0
  const newCriticalFindings = Math.max(0, candidateCritical - baselineCritical)
  const newHighFindings = Math.max(0, candidateHigh - baselineHigh)
  if (newCriticalFindings > 0) blockers.push(`${newCriticalFindings} new critical security finding(s)`)
  if (newHighFindings > 0) blockers.push(`${newHighFindings} new high security finding(s)`)

  return {
    goalId,
    verification: 'self-reported',
    decision: blockers.length > 0 ? 'rework' : missing.length > 0 ? 'not_run' : 'accept',
    acceptanceRegressions,
    performanceRegressionPct,
    apiCompatible,
    newCriticalFindings,
    newHighFindings,
    blockers,
    missing,
  }
}