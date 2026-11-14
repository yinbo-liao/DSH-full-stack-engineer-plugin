import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildGoal, compareCandidate, evaluateSubmission } from '../lib/evaluation.js'

const config = { rigor: 'standard', defaultStack: 'FastAPI + PostgreSQL + React', maxOpenQuestions: 8 }

function check(category, score = 90) {
  return {
    category,
    name: `${category} check`,
    status: 'passed',
    score,
    evidence: [`${category}.evidence.json`],
  }
}

test('goal artifact has AC ids, evidence and a suggested path', () => {
  const goal = buildGoal({
    id: 'GOAL-TEST-001',
    outcome: 'Ship a tenant-isolated RAG assistant with approvals',
    hasAi: true,
    subagents: true,
    risk: 'high',
  }, config)
  assert.equal(goal.goalId, 'GOAL-TEST-001')
  assert.equal(goal.status, 'draft')
  assert.equal(goal.suggestedPath, '.agent/goals/GOAL-TEST-001.yaml')
  assert.ok(goal.acceptance.some(item => item.id === 'AC-01'))
  assert.ok(goal.acceptance.some(item => item.id === 'AC-06'))
  assert.ok(goal.acceptance.some(item => item.id === 'AC-09'))
  assert.ok(goal.acceptance.every(item => item.evidence.length > 0))
  assert.ok(goal.requiredEvidence.some(item => item.includes('producer')))
})

test('evaluation accepts only complete, evidenced categories', () => {
  const checks = [
    check('functional', 95),
    check('regression', 90),
    check('security', 95),
    check('performance', 90),
    check('maintainability', 85),
    check('architecture', 85),
    check('documentation', 80),
  ]
  const result = evaluateSubmission('GOAL-TEST-001', checks)
  assert.equal(result.decision, 'accept')
  assert.ok(result.overallScore >= 85)
  assert.equal(result.gates.allCategoriesMeasured, true)
  assert.equal(result.gates.evidenceComplete, true)
})

test('missing categories are not_run and block acceptance', () => {
  const result = evaluateSubmission('GOAL-TEST-001', [check('functional', 95), check('security', 95)])
  assert.equal(result.decision, 'rework')
  assert.equal(result.overallScore, null)
  assert.ok(result.missing.includes('performance'))
  assert.equal(result.gates.allCategoriesMeasured, false)
})

test('failed security rejects', () => {
  const checks = [
    check('functional', 95),
    check('regression', 90),
    { category: 'security', name: 'authz', status: 'failed', score: 10, evidence: ['authz.log'] },
    check('performance', 90),
    check('maintainability', 85),
    check('architecture', 85),
    check('documentation', 80),
  ]
  const result = evaluateSubmission('GOAL-TEST-001', checks)
  assert.equal(result.decision, 'reject')
  assert.equal(result.gates.securityAtLeast90, false)
})

test('passed checks without evidence block acceptance', () => {
  const checks = [
    check('functional', 95),
    check('regression', 90),
    check('security', 95),
    check('performance', 90),
    check('maintainability', 85),
    check('architecture', 85),
    { category: 'documentation', name: 'docs', status: 'passed', score: 80, evidence: [] },
  ]
  const result = evaluateSubmission('GOAL-TEST-001', checks)
  assert.equal(result.decision, 'rework')
  assert.equal(result.gates.evidenceComplete, false)
})

test('a not_run check blocks even when its category has a pass', () => {
  const checks = [
    check('functional', 95),
    { category: 'functional', name: 'edge case', status: 'not_run' },
    check('regression', 90),
    check('security', 95),
    check('performance', 90),
    check('maintainability', 85),
    check('architecture', 85),
    check('documentation', 80),
  ]
  const result = evaluateSubmission('GOAL-TEST-001', checks)
  assert.equal(result.decision, 'rework')
  assert.equal(result.gates.allCategoriesMeasured, false)
  assert.ok(result.missing.some(item => item.includes('functional')))
})

test('comparison blocks p95 regression, API break and new findings', () => {
  const result = compareCandidate(
    'GOAL-TEST-001',
    {
      acceptance: { 'AC-01': false, 'AC-02': true },
      p95Ms: 130,
      apiCompatible: false,
      criticalFindings: 1,
      highFindings: 2,
    },
    {
      acceptance: { 'AC-01': true, 'AC-02': true },
      p95Ms: 100,
      apiCompatible: true,
      criticalFindings: 0,
      highFindings: 0,
    },
  )
  assert.equal(result.decision, 'rework')
  assert.deepEqual(result.acceptanceRegressions, ['AC-01'])
  assert.equal(result.performanceRegressionPct, 30)
  assert.match(result.blockers.join(' '), /p95 regression/)
  assert.match(result.blockers.join(' '), /API compatibility/)
  assert.match(result.blockers.join(' '), /critical security/)
})

test('comparison is not_run when measurements are missing', () => {
  const result = compareCandidate(
    'GOAL-TEST-001',
    { acceptance: { 'AC-01': true } },
    { acceptance: { 'AC-01': true }, p95Ms: 100, apiCompatible: true },
  )
  assert.equal(result.decision, 'not_run')
  assert.ok(result.missing.includes('candidate p95Ms'))
})