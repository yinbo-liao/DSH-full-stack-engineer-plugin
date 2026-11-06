/** Model-facing Markdown projections of the structured playbook values. */

import type {
  FullstackPlan,
  GateDecision,
  RagBlueprint,
  SecurityReview,
  SubagentPlan,
  UxReview,
} from './playbook.js'

function bullets(values: readonly string[]): string {
  return values.map(value => `- ${value}`).join('\n')
}

export function renderPlan(plan: FullstackPlan): string {
  const lines: string[] = [
    `# ${plan.title}`,
    '',
    plan.summary,
    '',
    '## Scope',
    '### Jobs',
    bullets(plan.scope.jobs),
    '',
    '### Non-goals',
    bullets(plan.scope.nonGoals),
    '',
    '### Acceptance',
    bullets(plan.scope.acceptance),
    '',
    '## UX',
    '### Flows',
    bullets(plan.ux.flows),
    '',
    '### Patterns',
    bullets(plan.ux.patterns),
    '',
    `### Required states\n${plan.ux.states.join(', ')}`,
    '',
    '### Accessibility',
    bullets(plan.ux.accessibility),
    '',
    '## Architecture',
    `Stack: ${plan.architecture.stack}`,
    '',
    ...plan.architecture.layers.map(layer => `- **${layer.layer}:** ${layer.decision}`),
    '',
    '### API',
    bullets(plan.architecture.api),
    '',
    '### Data',
    bullets(plan.architecture.data),
    '',
    '### Observability',
    bullets(plan.architecture.observability),
    '',
    '## Security (design-level)',
    '| ID | Threat | Severity | Control | Test |',
    '|---|---|---|---|---|',
    ...plan.security.threats.map(threat =>
      `| ${threat.id} | ${threat.threat} | ${threat.severity} | ${threat.control} | ${threat.test} |`),
    '',
    '### Controls',
    bullets(plan.security.controls),
    '',
    '## Reliability',
    '### SLOs',
    ...plan.reliability.slos.map(slo => `- **${slo.name}:** ${slo.target} (${slo.measure})`),
    '',
    '### Failure modes',
    ...plan.reliability.failureModes.map(item => `- **${item.mode}:** ${item.response}`),
    '',
    '### Budgets',
    bullets(plan.reliability.budgets),
  ]

  if (plan.ai !== undefined) {
    lines.push(
      '',
      '## AI assistant and RAG',
      '### Assistant',
      bullets(plan.ai.assistant),
      '',
      '### RAG',
      bullets(plan.ai.rag),
      '',
      '### Evaluation',
      bullets(plan.ai.evaluation),
    )
  }

  lines.push(
    '',
    '## Delivery gates',
    ...plan.delivery.map(item => `- **${item.phase}** (${item.gate}): ${item.exit}`),
    '',
    '## Open questions',
    bullets(plan.openQuestions),
    '',
    '## Definition of done',
    bullets(plan.definitionOfDone),
  )
  return lines.join('\n')
}

export function renderUx(review: UxReview): string {
  const lines: string[] = ['# UX review', '']
  for (const screen of review.screens) {
    lines.push(
      `## ${screen.name}`,
      screen.purpose,
      '',
      `**Patterns:** ${screen.patterns.join('; ')}`,
      `**States:** ${screen.states.join(', ')}`,
      '',
      '**Copy rules:**',
      bullets(screen.copy),
      '',
    )
  }
  lines.push(
    '## Global patterns',
    bullets(review.globalPatterns),
    '',
    '## Accessibility',
    bullets(review.accessibility),
    '',
    '## Copy rules',
    bullets(review.copyRules),
    '',
    '## Anti-patterns to remove',
    bullets(review.antiPatterns),
    '',
    '## Open questions',
    bullets(review.openQuestions),
  )
  return lines.join('\n')
}

export function renderSecurity(review: SecurityReview): string {
  return [
    '# Security review (design-level)',
    '',
    `Status: **${review.status}**. Controls below are design requirements until the named evidence exists.`,
    '',
    '| ID | Threat | Severity | Control | Test |',
    '|---|---|---|---|---|',
    ...review.threats.map(threat =>
      `| ${threat.id} | ${threat.threat} | ${threat.severity} | ${threat.control} | ${threat.test} |`),
    '',
    '## Baseline controls',
    bullets(review.controls),
    '',
    '## dsh-secure-mesh integration',
    bullets(review.secureMesh),
    '',
    '## Required evidence',
    bullets(review.requiredEvidence),
  ].join('\n')
}

export function renderRag(blueprint: RagBlueprint): string {
  return [
    '# Stepwise RAG blueprint',
    '',
    `Framework: **${blueprint.framework}**. Steps are ordered exit criteria, not suggestions.`,
    '',
    ...blueprint.steps.map(step => [
      `## ${step.id} — ${step.name}`,
      bullets(step.actions),
      `**Exit:** ${step.exit}`,
      '',
    ].join('\n')),
    '## Chunking',
    bullets(blueprint.chunking),
    '',
    '## Retrieval',
    bullets(blueprint.retrieval),
    '',
    '## Evaluation',
    `Golden set: ${blueprint.evaluation.goldenSet}`,
    '',
    '| Metric | Target |',
    '|---|---|',
    ...blueprint.evaluation.thresholds.map(item => `| ${item.metric} | ${item.target} |`),
    '',
    `Cadence: ${blueprint.evaluation.cadence}`,
    '',
    '## Guardrails',
    bullets(blueprint.guardrails),
    '',
    '## Observability',
    bullets(blueprint.observability),
    '',
    '## Cost controls',
    bullets(blueprint.costControls),
    '',
    '## Open questions',
    bullets(blueprint.openQuestions),
  ].join('\n')
}

export function renderSubagent(plan: SubagentPlan): string {
  return [
    '# Subagent harness and loop plan',
    '',
    `## Supervisor\n${plan.supervisor.responsibility}`,
    `**Context budget:** ${plan.supervisor.contextBudget}`,
    '',
    '### Routing',
    bullets(plan.supervisor.routing),
    '',
    '### Escalation',
    bullets(plan.supervisor.escalation),
    '',
    '## Roles',
    ...plan.roles.map(role => [
      `### ${role.role}`,
      role.responsibility,
      `- Input: ${role.input}`,
      `- Output: ${role.output}`,
      `- Tools: ${role.allowedTools.join(', ')}`,
      `- Stop: ${role.stop}`,
      '',
    ].join('\n')),
    '## Loop',
    ...plan.loop.stages.map(stage => `- **${stage.stage}:** ${stage.action} _Exit:_ ${stage.exit}`),
    '',
    `Budgets: ${plan.loop.maxIterations} iterations, ${plan.loop.maxToolCalls} tool calls.`,
    '',
    `No-progress rule: ${plan.loop.noProgressRule}`,
    '',
    '### Stop conditions',
    bullets(plan.loop.stopConditions),
    '',
    '## Harness requirements',
    bullets(plan.harness),
    '',
    '## Gates',
    ...plan.gates.map(gate => `- **${gate.gate}:** ${gate.requirement}`),
    '',
    '## Failure modes',
    ...plan.failureModes.map(item => `- **${item.mode}:** ${item.guard}`),
    '',
    '## Red-team cases',
    bullets(plan.redTeam),
  ].join('\n')
}

export function renderGate(decision: GateDecision): string {
  return [
    `# Gate ${decision.stage}: ${decision.status.toUpperCase()}`,
    '',
    `Cumulative gates: ${decision.requiredGates.join(' -> ')}`,
    '',
    '## Blockers',
    decision.blockers.length === 0 ? '- None.' : bullets(decision.blockers),
    '',
    '## Required evidence',
    bullets(decision.requiredEvidence),
    '',
    '## Next actions',
    bullets(decision.nextActions),
    '',
    decision.gateG,
  ].join('\n')
}