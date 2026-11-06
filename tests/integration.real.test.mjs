/**
 * Integration test against the real DeepSeek Harness services.
 *
 * It boots the real Cordis Context, SystemPrompt and ToolRuntime, loads the
 * plugin, executes a tool through the real registry, and (when the local web
 * profile exists) asserts that the profile has the plugin in its bundle list.
 *
 * Run with:
 *   node --import ./tests/support/real-register.mjs \
 *     --test --test-isolation=none tests/integration.real.test.mjs
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import * as plugin from '../lib/index.js'

const profileDir = process.env.DSH_PROFILE_DIR ?? join(homedir(), '.dsh', 'profiles', 'web')
const signal = new AbortController().signal
let callCounter = 0

async function setup() {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(plugin, { rigor: 'standard' })
  return ctx
}

function textOf(result) {
  return result.content.map(block => (block.type === 'text' ? block.text : '')).join('\n')
}

async function run(ctx, name, args = {}) {
  callCounter += 1
  return ctx.tools.execute({ callId: `integration-${callCounter}`, name, arguments: args, signal })
}

test('web profile registers the local plugin bundle', { skip: !existsSync(join(profileDir, 'package.json')) }, () => {
  const profile = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'))
  assert.ok(profile.dependencies['dsh-fullstack-engineer'], 'plugin dependency is installed')
  assert.ok(
    profile.dsh.profile.bundles.includes('dsh-fullstack-engineer'),
    'plugin bundle is enabled in the profile',
  )
})

test('real harness loads six tools and the prompt section', async () => {
  const ctx = await setup()
  try {
    const names = ctx.tools.schemas().map(schema => schema.name).sort()
    assert.deepEqual(names, [
      'fullstack_gate',
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
  } finally {
    await ctx.fiber.dispose()
  }
})

test('real tool runtime executes the plan and gate tools', async () => {
  const ctx = await setup()
  try {
    const plan = await run(ctx, 'fullstack_plan', {
      brief: 'Build a tenant-isolated RAG assistant with human approvals',
      has_ai: true,
      subagents: true,
      risk: 'high',
    })
    assert.equal(plan.isError, false)
    const planText = textOf(plan)
    assert.match(planText, /## Scope/)
    assert.match(planText, /## AI assistant and RAG/)
    assert.match(planText, /## Delivery gates/)

    const gate = await run(ctx, 'fullstack_gate', {
      stage: 'scope',
      artifacts: 'brief',
    })
    assert.match(textOf(gate), /HOLD/)

    const passed = await run(ctx, 'fullstack_gate', {
      stage: 'scope',
      artifacts: 'brief,jobs,nonGoals,acceptance',
    })
    assert.match(textOf(passed), /PASS/)
  } finally {
    await ctx.fiber.dispose()
  }
})