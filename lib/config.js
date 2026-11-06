/** Configuration surface for the full-stack engineering playbook. */
import Schema from '@deepseek-ai/schemastery';
export const PLUGIN_NAME = 'fullstack-engineer';
export const Config = Schema.object({
    rigor: Schema.string()
        .default('standard')
        .description('lean | standard | regulated; regulated adds approval and audit expectations.'),
    defaultStack: Schema.string()
        .default('FastAPI + PostgreSQL + React')
        .description('Default stack when the brief does not choose one.'),
    prompt: Schema.boolean().default(true).description('Contribute the engineering contract to the system prompt.'),
    plan: Schema.boolean().default(true).description('Register fullstack_plan.'),
    uxReview: Schema.boolean().default(true).description('Register fullstack_ux_review.'),
    securityReview: Schema.boolean().default(true).description('Register fullstack_security_review.'),
    ragBlueprint: Schema.boolean().default(true).description('Register fullstack_rag_blueprint.'),
    subagentPlan: Schema.boolean().default(true).description('Register fullstack_subagent_plan.'),
    gate: Schema.boolean().default(true).description('Register fullstack_gate.'),
    maxOpenQuestions: Schema.natural()
        .default(8)
        .description('Cap on open questions returned by the planner (3-20).'),
});
export function resolveConfig(config) {
    const rigor = config.rigor ?? 'standard';
    if (!['lean', 'standard', 'regulated'].includes(rigor)) {
        throw new Error(`fullstack-engineer: rigor must be lean, standard or regulated (got ${rigor})`);
    }
    const defaultStack = (config.defaultStack ?? 'FastAPI + PostgreSQL + React').trim();
    if (defaultStack === '')
        throw new Error('fullstack-engineer: defaultStack must not be empty');
    const maxOpenQuestions = config.maxOpenQuestions ?? 8;
    if (!Number.isInteger(maxOpenQuestions) || maxOpenQuestions < 3 || maxOpenQuestions > 20) {
        throw new Error('fullstack-engineer: maxOpenQuestions must be an integer between 3 and 20');
    }
    return {
        rigor,
        defaultStack,
        prompt: config.prompt ?? true,
        plan: config.plan ?? true,
        uxReview: config.uxReview ?? true,
        securityReview: config.securityReview ?? true,
        ragBlueprint: config.ragBlueprint ?? true,
        subagentPlan: config.subagentPlan ?? true,
        gate: config.gate ?? true,
        maxOpenQuestions,
    };
}
//# sourceMappingURL=config.js.map