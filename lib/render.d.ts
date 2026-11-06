/** Model-facing Markdown projections of the structured playbook values. */
import type { FullstackPlan, GateDecision, RagBlueprint, SecurityReview, SubagentPlan, UxReview } from './playbook.js';
export declare function renderPlan(plan: FullstackPlan): string;
export declare function renderUx(review: UxReview): string;
export declare function renderSecurity(review: SecurityReview): string;
export declare function renderRag(blueprint: RagBlueprint): string;
export declare function renderSubagent(plan: SubagentPlan): string;
export declare function renderGate(decision: GateDecision): string;
//# sourceMappingURL=render.d.ts.map