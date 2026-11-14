/**
 * v0.2 delivery controls: goal artifact, evidence-backed evaluation and
 * baseline comparison.
 *
 * The point of this module is to make "done" falsifiable. A goal names its
 * acceptance criteria and the evidence each one needs; an evaluation refuses to
 * turn missing checks into passes; a comparison refuses to call a regression an
 * improvement.
 *
 * Scores are still self-reported inputs. The tool records the evidence names
 * alongside them, but it does not pretend to verify a test result. That is the
 * verifier/CI's job.
 *
 * @module fullstack-engineer/evaluation
 */
import type { PlaybookConfig, Risk } from './playbook.js';
export declare const EVAL_WEIGHTS: {
    readonly functional: 30;
    readonly regression: 15;
    readonly security: 15;
    readonly performance: 15;
    readonly maintainability: 10;
    readonly architecture: 10;
    readonly documentation: 5;
};
export type EvalCategory = keyof typeof EVAL_WEIGHTS;
export type EvalStatus = 'passed' | 'failed' | 'not_run';
export interface GoalInput {
    id?: string;
    outcome: string;
    scope?: string[];
    constraints?: string[];
    risks?: string[];
    baseline?: string;
    hasAi?: boolean;
    subagents?: boolean;
    risk?: Risk;
}
export interface AcceptanceCriterion {
    id: string;
    criterion: string;
    verification: string;
    evidence: string[];
}
export interface GoalArtifact {
    goalId: string;
    status: 'draft';
    outcome: string;
    scope: string[];
    nonGoals: string[];
    constraints: string[];
    risks: string[];
    baseline: string;
    acceptance: AcceptanceCriterion[];
    rollback: string[];
    requiredEvidence: string[];
    suggestedPath: string;
    generatedAt: string;
}
export interface EvaluationCheck {
    category: EvalCategory;
    name: string;
    status: EvalStatus;
    score?: number;
    evidence?: string[];
}
export interface EvaluationResult {
    goalId: string;
    verification: 'self-reported';
    decision: 'accept' | 'rework' | 'reject' | 'not_run';
    overallScore: number | null;
    categories: Array<{
        category: EvalCategory;
        weight: number;
        score: number | null;
        status: EvalStatus;
        checks: number;
    }>;
    gates: {
        allCategoriesMeasured: boolean;
        allCategoriesAbove70: boolean;
        functionalAtLeast90: boolean;
        securityAtLeast90: boolean;
        overallAtLeast85: boolean;
        allChecksPassed: boolean;
        evidenceComplete: boolean;
    };
    blockers: string[];
    missing: string[];
    requiredEvidence: string[];
}
export interface ComparisonMetrics {
    acceptance: Record<string, boolean>;
    p95Ms?: number;
    apiCompatible?: boolean;
    criticalFindings?: number;
    highFindings?: number;
}
export interface ComparisonResult {
    goalId: string;
    verification: 'self-reported';
    decision: 'accept' | 'rework' | 'not_run';
    acceptanceRegressions: string[];
    performanceRegressionPct: number | null;
    apiCompatible: boolean | null;
    newCriticalFindings: number;
    newHighFindings: number;
    blockers: string[];
    missing: string[];
}
/**
 * Build a goal artifact. Persisting it is the host's job (with an approval or
 * write tool); this function only returns the validated document.
 */
export declare function buildGoal(input: GoalInput, config: PlaybookConfig): GoalArtifact;
/** Validate the JSON argument accepted by `fullstack_evaluate`. */
export declare function normalizeChecks(value: unknown): EvaluationCheck[];
/**
 * Evaluate a goal against checks. Missing checks remain `not_run`; they can
 * never become a pass. A passed check without evidence blocks the result.
 */
export declare function evaluateSubmission(goalId: string, checks: EvaluationCheck[]): EvaluationResult;
/** Compare candidate metrics against a baseline. A >20% p95 regression blocks. */
export declare function compareCandidate(goalId: string, candidateValue: unknown, baselineValue: unknown): ComparisonResult;
//# sourceMappingURL=evaluation.d.ts.map