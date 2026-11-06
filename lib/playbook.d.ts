/**
 * Deterministic full-stack engineering playbook.
 *
 * The tools in this plugin are planning instruments, not generators of
 * application code. They turn a brief into explicit scope, UX states, threat
 * controls, reliability budgets, a stepwise RAG blueprint, a subagent harness
 * and a gate decision. Keeping this logic pure makes it auditable and testable;
 * the model decides how to apply it.
 *
 * @module fullstack-engineer/playbook
 */
export type Rigor = 'lean' | 'standard' | 'regulated';
export type Risk = 'low' | 'medium' | 'high' | 'critical';
export interface PlaybookConfig {
    rigor: Rigor;
    defaultStack: string;
    maxOpenQuestions: number;
}
export interface PlanInput {
    brief: string;
    users?: string[];
    constraints?: string[];
    stack?: string;
    hasAi?: boolean;
    subagents?: boolean;
    risk?: Risk;
}
export interface FullstackPlan {
    title: string;
    summary: string;
    scope: {
        jobs: string[];
        nonGoals: string[];
        acceptance: string[];
    };
    ux: {
        flows: string[];
        patterns: string[];
        states: string[];
        accessibility: string[];
    };
    architecture: {
        stack: string;
        layers: Array<{
            layer: string;
            decision: string;
        }>;
        api: string[];
        data: string[];
        observability: string[];
    };
    security: {
        threats: Array<{
            id: string;
            threat: string;
            severity: Risk;
            control: string;
            test: string;
        }>;
        controls: string[];
    };
    reliability: {
        slos: Array<{
            name: string;
            target: string;
            measure: string;
        }>;
        failureModes: Array<{
            mode: string;
            response: string;
        }>;
        budgets: string[];
    };
    ai?: {
        assistant: string[];
        rag: string[];
        evaluation: string[];
    };
    delivery: Array<{
        phase: string;
        exit: string;
        gate: string;
    }>;
    openQuestions: string[];
    definitionOfDone: string[];
}
export interface UxReviewInput {
    flow?: string;
    screens?: string[];
    audience?: string;
}
export interface UxScreen {
    name: string;
    purpose: string;
    patterns: string[];
    states: string[];
    copy: string[];
}
export interface UxReview {
    screens: UxScreen[];
    globalPatterns: string[];
    accessibility: string[];
    copyRules: string[];
    antiPatterns: string[];
    openQuestions: string[];
}
export interface SecurityReviewInput {
    features: string[];
    dataClasses?: string[];
    roles?: string[];
    ai?: boolean;
    tenancy?: boolean;
}
export interface SecurityThreat {
    id: string;
    threat: string;
    severity: Risk;
    control: string;
    test: string;
}
export interface SecurityReview {
    status: 'design-review';
    threats: SecurityThreat[];
    controls: string[];
    secureMesh: string[];
    requiredEvidence: string[];
    blockers: string[];
}
export interface RagBlueprintInput {
    corpus: string;
    users?: string[];
    freshness?: string;
    latencyBudgetMs?: number;
    multiTenant?: boolean;
    framework?: 'langchain' | 'langgraph';
}
export interface RagStep {
    id: string;
    name: string;
    actions: string[];
    exit: string;
}
export interface RagBlueprint {
    framework: 'langchain' | 'langgraph';
    stepwise: true;
    steps: RagStep[];
    chunking: string[];
    retrieval: string[];
    evaluation: {
        goldenSet: string;
        thresholds: Array<{
            metric: string;
            target: string;
        }>;
        cadence: string;
    };
    guardrails: string[];
    observability: string[];
    costControls: string[];
    openQuestions: string[];
}
export interface SubagentInput {
    objective: string;
    roles?: string[];
    tools?: string[];
    risk?: Risk;
    maxIterations?: number;
}
export interface SubagentRole {
    role: string;
    responsibility: string;
    input: string;
    output: string;
    allowedTools: string[];
    stop: string;
}
export interface SubagentPlan {
    supervisor: {
        responsibility: string;
        contextBudget: string;
        routing: string[];
        escalation: string[];
    };
    roles: SubagentRole[];
    loop: {
        stages: Array<{
            stage: string;
            action: string;
            exit: string;
        }>;
        maxIterations: number;
        maxToolCalls: number;
        stopConditions: string[];
        noProgressRule: string;
    };
    harness: string[];
    gates: Array<{
        gate: string;
        requirement: string;
    }>;
    failureModes: Array<{
        mode: string;
        guard: string;
    }>;
    redTeam: string[];
}
export type GateStage = 'scope' | 'ux' | 'architecture' | 'security' | 'reliability' | 'rag' | 'harness' | 'release';
export interface GateInput {
    stage: GateStage;
    artifacts: Record<string, boolean>;
    risk?: Risk;
    hasAi?: boolean;
    subagents?: boolean;
}
export interface GateDecision {
    stage: GateStage;
    status: 'pass' | 'hold';
    requiredGates: string[];
    blockers: string[];
    requiredEvidence: string[];
    nextActions: string[];
    gateG: string;
}
/**
 * Build a complete delivery plan from a brief. The output is intentionally
 * opinionated: it encodes the order the gates expect, not a menu.
 */
export declare function buildPlan(input: PlanInput, config: PlaybookConfig): FullstackPlan;
/**
 * Review a flow or a list of screens for missing states and UX anti-patterns.
 */
export declare function buildUxReview(input: UxReviewInput): UxReview;
/**
 * Produce a design-level threat model. It never claims verification: the
 * requiredEvidence list names the tests that must exist before a release gate.
 */
export declare function buildSecurityReview(input: SecurityReviewInput): SecurityReview;
/**
 * Design a stepwise RAG pipeline. "Stepwise" is explicit: each stage has an
 * exit criterion so the assistant cannot skip corpus governance or evaluation.
 */
export declare function buildRagBlueprint(input: RagBlueprintInput): RagBlueprint;
/**
 * Design a supervisor + subagent harness with explicit loop budgets and gates.
 */
export declare function buildSubagentPlan(input: SubagentInput): SubagentPlan;
/**
 * Evaluate a gate from named artifacts. This is deliberately conservative:
 * missing artifacts are blockers, and evidence is described as records, not URIs.
 */
export declare function evaluateGate(input: GateInput): GateDecision;
//# sourceMappingURL=playbook.d.ts.map