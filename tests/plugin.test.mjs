import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import * as plugin from '../lib/index.js'
import { resolveConfig } from '../lib/config.js'

const signal = new AbortController().signal
let callCounter = 0

async function setup(config = {}) {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(plugin, config)
  return ctx
}

function textOf(result) {
  return result.content.map(block => (block.type === 'text' ? block.text : '')).join('\n')
}

async function run(ctx, name, args = {}) {
  callCounter += 1
  return ctx.tools.execute({ callId: `call-${callCounter}`, name, arguments: args, signal })
}

test('registers nine tools and the prompt contract', async () => {
  const ctx = await setup()
  try {
    const names = ctx.tools.schemas().map(schema => schema.name).sort()
    assert.deepEqual(names, [
      'fullstack_compare',
      'fullstack_evaluate',
      'fullstack_gate',
      'fullstack_goal',
      'fullstack_plan',
      'fullstack_rag_blueprint',
      'fullstack_security_review',
      'fullstack_subagent_plan',
      'fullstack_ux_review',
    ])
    const assembly = await ctx.systemPrompt.assemble()
    const section = assembly.sections.find(entry => entry.name === 'fullstack-engineer:playbook')
    assert.ok(section)
    assert.match(section.text, /Frame before design/)
    assert.match(section.text, /Langkah/)
    assert.match(section.text, /subagents/i)
  } finally {
    await ctx.fiber.dispose()
  }
})

test('fullstack_plan returns a full playbook', async () => {
  const ctx = await setup()
  try {
    const result = await run(ctx, 'fullstack_plan', {
      brief: 'Build a multi-tenant RAG assistant for support engineers',
      has_ai: true,
      subagents: true,
      risk: 'high',
    })
    assert.equal(result.isError, false)
    const output = textOf(result)
    assert.match(output, /## Scope/)
    assert.match(output, /## UX/)
    assert.match(output, /## Security/)
    assert.match(output, /## AI assistant and RAG/)
    assert.match(output, /## Delivery gates/)
  } finally {
    await ctx.fiber.dispose()
  }
})

test('ux, rag and subagent tools produce their artifacts', async () => {
  const ctx = await setup()
  try {
    const ux = await run(ctx, 'fullstack_ux_review', { flow: 'login -> dashboard -> review' })
    assert.match(textOf(ux), /permission-denied/)

    const rag = await run(ctx, 'fullstack_rag_blueprint', { corpus: 'runbooks', multi_tenant: true })
    assert.match(textOf(rag), /RAG-08/)
    assert.match(textOf(rag), /recall@5/)

    const sub = await run(ctx, 'fullstack_subagent_plan', { objective: 'Ship a governed workflow' })
    assert.match(textOf(sub), /No-progress rule/)
    assert.match(textOf(sub), /G4 approve/)
  } finally {
    await ctx.fiber.dispose()
  }
})

test('gate holds until required artifacts are listed', async () => {
  const ctx = await setup()
  try {
    const held = await run(ctx, 'fullstack_gate', { stage: 'scope', artifacts: 'brief' })
    assert.match(textOf(held), /HOLD/)

    const passed = await run(ctx, 'fullstack_gate', {
      stage: 'scope',
      artifacts: 'brief,jobs,nonGoals,acceptance',
    })
    assert.match(textOf(passed), /PASS/)
  } finally {
    await ctx.fiber.dispose()
  }
})

test('goal, evaluation and comparison tools execute', async () => {
  const ctx = await setup()
  try {
    const goal = await run(ctx, 'fullstack_goal', {
      id: 'GOAL-TEST-001',
      outcome: 'Ship a tenant-isolated RAG assistant with approvals',
      has_ai: true,
      risk: 'high',
    })
    assert.match(textOf(goal), /GOAL-TEST-001/)
    assert.match(textOf(goal), /AC-01/)

    const checks = [
      { category: 'functional', name: 'acceptance', status: 'passed', score: 95, evidence: ['ac.log'] },
      { category: 'regression', name: 'regression', status: 'passed', score: 90, evidence: ['reg.log'] },
      { category: 'security', name: 'authz', status: 'passed', score: 95, evidence: ['sec.log'] },
      { category: 'performance', name: 'p95', status: 'passed', score: 90, evidence: ['perf.log'] },
      { category: 'maintainability', name: 'lint', status: 'passed', score: 85, evidence: ['lint.log'] },
      { category: 'architecture', name: 'adr', status: 'passed', score: 85, evidence: ['adr.md'] },
      { category: 'documentation', name: 'docs', status: 'passed', score: 80, evidence: ['docs.md'] },
    ]
    const evaluation = await run(ctx, 'fullstack_evaluate', { goal_id: 'GOAL-TEST-001', checks })
    assert.match(textOf(evaluation), /ACCEPT/)

    const comparison = await run(ctx, 'fullstack_compare', {
      goal_id: 'GOAL-TEST-001',
      candidate: { acceptance: { 'AC-01': true }, p95Ms: 90, apiCompatible: true },
      baseline: { acceptance: { 'AC-01': true }, p95Ms: 100, apiCompatible: true },
    })
    assert.match(textOf(comparison), /ACCEPT/)
  } finally {
    await ctx.fiber.dispose()
  }
})

test('config validates rigor and limits', () => {
  assert.equal(resolveConfig({}).rigor, 'standard')
  assert.throws(() => resolveConfig({ maxOpenQuestions: 100 }), /maxOpenQuestions/)
  assert.throws(() => resolveConfig({ rigor: 'extreme' }), /rigor/)
})

test('config can disable tools and the prompt', async () => {
  const ctx = await setup({ gate: false, prompt: false })
  try {
    const names = ctx.tools.schemas().map(schema => schema.name)
    assert.ok(!names.includes('fullstack_gate'))
    const assembly = await ctx.systemPrompt.assemble()
    assert.ok(!assembly.sections.some(entry => entry.name === 'fullstack-engineer:playbook'))
  } finally {
    await ctx.fiber.dispose()
  }
})