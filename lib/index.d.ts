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
import type { Context } from '@deepseek-ai/cordis';
import { Config } from './config.js';
import type { FullstackConfig } from './config.js';
export declare const name = "fullstack-engineer";
export declare const inject: readonly ["tools", "systemPrompt"];
export { Config };
export type { FullstackConfig };
export * from './playbook.js';
export { buildPromptSection } from './prompt.js';
export { createGateTool, createPlanTool, createRagTool, createSecurityTool, createSubagentTool, createUxTool, } from './tools.js';
/**
 * Compose the playbook into one harness context.
 *
 * Registrations are Cordis effects: disposing the plugin fiber removes the tools
 * and the prompt section, so profile reloads cannot accumulate stale tools.
 */
export declare function apply(ctx: Context, config: FullstackConfig): void;
//# sourceMappingURL=index.d.ts.map