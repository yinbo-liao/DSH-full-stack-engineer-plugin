import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buildPlan,
  buildRagBlueprint,
  buildSecurityReview,
  buildSubagentPlan,
  buildUxReview,
  evaluateGate,
} from '../lib/playbook.js'

const config = { rigor: 'standard', defaultStack: 'FastAPI + PostgreSQL + React', maxOpenQuestions: 6 }

test('plan covers scope, UX, security, reliability and AI', () => {
  const plan = buildPlan({
    brief: 'Build a multi-tenant knowledge assistant with approvals',
    users: ['analyst', 'reviewer'],
    hasAi: true,
    subagents: true,
  }, config)

  assert.match(plan.title, /knowledge assistant/i)
  assert.ok(plan.scope.jobs.length >= 3)
  assert.ok(plan.scope.acceptance.some(item => item.includes('AC-03')))
  assert.ok(plan.ux.states.includes('offline'))
  assert.ok(plan.ux.states.includes('permission-denied'))
  assert.ok(plan.security.threats.some(threat => threat.id === 'SEC-01'))
  assert.ok(plan.security.threats.some(threat => threat.id === 'SEC-09'))
  assert.ok(plan.reliability.slos.length >= 4)
  assert.ok(plan.ai !== undefined)
  assert.match(plan.ai.rag[0], /Stepwise RAG/)
  assert.ok(plan.delivery.some(phase => phase.gate === 'G4 rag'))
  assert.ok(plan.delivery.some(phase => phase.gate === 'G5 harness'))
  assert.ok(plan.openQuestions.length <= 6)
  assert.ok(plan.definitionOfDone.length >= 7)
})

test('plan omits AI and harness when out of scope', () => {
  const plan = buildPlan({ brief: 'A billing dashboard for finance', hasAi: false, subagents: false }, config)
  assert.equal(plan.ai, undefined)
  assert.ok(!plan.delivery.some(phase => phase.gate === 'G4 rag'))
  assert.ok(plan.scope.nonGoals.some(item => item.includes('AI assistant')))
})

test('plan rejects an empty brief', () => {
  assert.throws(() => buildPlan({ brief: '  ' }, config), /brief is required/)
})

test('UX review always returns every state per screen', () => {
  const review = buildUxReview({ flow: 'login -> dashboard -> review', audience: 'operators' })
  assert.equal(review.screens.length, 3)
  for (const screen of review.screens) {
    for (const state of ['default', 'loading', 'empty', 'partial', 'error', 'offline', 'permission-denied', 'success']) {
      assert.ok(screen.states.includes(state), `${screen.name} missing ${state}`)
    }
  }
  assert.ok(review.accessibility.some(item => item.includes('screen-reader')))
  assert.ok(review.antiPatterns.some(item => item.includes('spinner')))
})

test('security review adds AI boundaries only for AI systems', () => {
  const base = buildSecurityReview({ features: ['billing', 'auth'] })
  assert.ok(!base.threats.some(threat => threat.id === 'SEC-09'))
  const ai = buildSecurityReview({ features: ['billing', 'assistant'], ai: true, tenancy: true })
  assert.ok(ai.threats.some(threat => threat.id === 'SEC-09'))
  assert.ok(ai.threats.some(threat => threat.id === 'SEC-10'))
  assert.ok(ai.threats.some(threat => threat.id === 'SEC-11'))
  assert.ok(ai.secureMesh.some(item => item.includes('secure_fetch')))
})

test('RAG blueprint is stepwise with evaluation thresholds', () => {
  const rag = buildRagBlueprint({ corpus: 'runbooks', multiTenant: true, latencyBudgetMs: 1800 })
  assert.equal(rag.stepwise, true)
  assert.equal(rag.steps.length, 10)
  assert.ok(rag.steps.every(step => step.exit.length > 0))
  assert.ok(rag.evaluation.thresholds.some(item => item.metric === 'recall@5'))
  assert.ok(rag.guardrails.some(item => item.includes('Fence')))
  assert.ok(rag.retrieval.some(item => item.includes('ACL')))
})

test('subagent plan has typed roles, budgets and stop rules', () => {
  const plan = buildSubagentPlan({ objective: 'Ship a governed billing workflow', maxIterations: 30 })
  assert.ok(plan.roles.length >= 7)
  assert.equal(plan.loop.maxIterations, 20)
  assert.ok(plan.loop.maxToolCalls >= 12)
  assert.ok(plan.loop.stopConditions.some(item => item.includes('No-progress') || item.includes('no new evidence')))
  assert.ok(plan.harness.some(item => item.includes('Approval')))
  assert.ok(plan.redTeam.some(item => /own evidence|verifier/i.test(item)))
})

test('gates hold on missing artifacts and pass when complete', () => {
  const held = evaluateGate({ stage: 'scope', artifacts: { brief: true } })
  assert.equal(held.status, 'hold')
  assert.ok(held.blockers.length >= 3)

  const passed = evaluateGate({
    stage: 'scope',
    artifacts: { brief: true, jobs: true, nonGoals: true, acceptance: true },
  })
  assert.equal(passed.status, 'pass')
  assert.match(passed.gateG, /expansion-only/)
})

test('release gate requires approval matrix for high risk', () => {
  const held = evaluateGate({
    stage: 'release',
    risk: 'high',
    artifacts: { ciEvidence: true, migrations: true, rollback: true, observability: true },
  })
  assert.equal(held.status, 'hold')
  assert.ok(held.blockers.some(item => item.includes('approvalMatrix')))
})