/**
 * dsh-fullstack-engineer — a full-stack delivery playbook for DeepSeek Harness.
 *
 * The plugin contributes a prompt contract and six pure planning tools:
 *
 * | Tool | Artifact |
 * |---|---|
 * | `fullstack_plan` | scope, UX, architecture, security, reliability, delivery, DoD |
 * | `fullstack_ux_review` | flows, states, patterns, accessibility, copy |
 * | `fullstack_security_review` | design-level threat model and required tests |
 * | `fullstack_rag_blueprint` | stepwise LangChain/LangGraph RAG and evaluation |
 * | `fullstack_subagent_plan` | supervisor/subagent contracts, harness and loop budgets |
 * | `fullstack_gate` | pass/hold gate decision from named artifacts |
 *
 * Everything is deterministic and side-effect free: the tools read no files, make
 * no network calls and execute no processes. They provide the engineering contract;
 * the host's tools and `dsh-secure-mesh` enforce actions.
 *
 * @module dsh-fullstack-engineer
 */
import { Config, PLUGIN_NAME, resolveConfig } from './config.js';
import { buildPromptSection } from './prompt.js';
import { createGateTool, createPlanTool, createRagTool, createSecurityTool, createSubagentTool, createUxTool, } from './tools.js';
export const name = PLUGIN_NAME;
export const inject = ['tools', 'systemPrompt'];
export { Config };
export * from './playbook.js';
export { buildPromptSection } from './prompt.js';
export { createGateTool, createPlanTool, createRagTool, createSecurityTool, createSubagentTool, createUxTool, } from './tools.js';
/**
 * Compose the playbook into one harness context.
 *
 * Registrations are Cordis effects: disposing the plugin fiber removes the tools
 * and the prompt section, so profile reloads cannot accumulate stale tools.
 */
export function apply(ctx, config) {
    const resolved = resolveConfig(config);
    const tools = [];
    if (resolved.plan)
        tools.push(createPlanTool(resolved));
    if (resolved.uxReview)
        tools.push(createUxTool());
    if (resolved.securityReview)
        tools.push(createSecurityTool());
    if (resolved.ragBlueprint)
        tools.push(createRagTool());
    if (resolved.subagentPlan)
        tools.push(createSubagentTool());
    if (resolved.gate)
        tools.push(createGateTool());
    for (const tool of tools)
        ctx.tools.register(tool);
    if (resolved.prompt) {
        ctx.systemPrompt.section({
            name: 'fullstack-engineer:playbook',
            order: 940,
            text: buildPromptSection(resolved),
        });
    }
    ctx.logger.info(`fullstack-engineer loaded (${resolved.rigor}): ${tools.length} tools, prompt=${resolved.prompt}`);
}
//# sourceMappingURL=index.js.map