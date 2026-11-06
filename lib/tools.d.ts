/**
 * The six model-facing tools. They are pure planning instruments: no filesystem,
 * network or process access, so they are safe to expose in any profile.
 *
 * @module fullstack-engineer/tools
 */
import type { ToolDefinition } from '@deepseek-ai/dsh-tools';
import type { ResolvedConfig } from './config.js';
export declare function createPlanTool(config: ResolvedConfig): ToolDefinition;
export declare function createUxTool(): ToolDefinition;
export declare function createSecurityTool(): ToolDefinition;
export declare function createRagTool(): ToolDefinition;
export declare function createSubagentTool(): ToolDefinition;
export declare function createGateTool(): ToolDefinition;
//# sourceMappingURL=tools.d.ts.map