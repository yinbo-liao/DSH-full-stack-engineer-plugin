/**
 * The six model-facing tools. They are pure planning instruments: no filesystem,
 * network or process access, so they are safe to expose in any profile.
 *
 * @module fullstack-engineer/tools
 */
import { defineTool } from '@deepseek-ai/dsh-tools';
import { buildPlan, buildRagBlueprint, buildSecurityReview, buildSubagentPlan, buildUxReview, evaluateGate, } from './playbook.js';
import { renderGate, renderPlan, renderRag, renderSecurity, renderSubagent, renderUx } from './render.js';
const JSON_OUTPUT = { type: 'json', description: 'Structured playbook value; render as Markdown.' };
function list(value) {
    if (value === undefined)
        return [];
    return value
        .split(/[\n,;]+/)
        .map(item => item.trim())
        .filter(item => item !== '');
}
function artifacts(value) {
    return Object.fromEntries(list(value).map(item => [item, true]));
}
function text(value) {
    return [{ type: 'text', text: String(value) }];
}
export function createPlanTool(config) {
    return defineTool({
        name: 'fullstack_plan',
        description: 'Turn a web-application brief into full-scope delivery artifacts: jobs, non-goals, acceptance, UX flows/states, '
            + 'architecture, security threats, reliability SLOs, RAG/assistant design when applicable, gates and definition of done. '
            + 'Call this before writing code for a new product or a significant feature.',
        parameters: {
            brief: { type: 'string', required: true, description: 'The product/feature brief in the user\'s words.' },
            users: { type: 'string', description: 'Comma-separated user/role list.' },
            constraints: { type: 'string', description: 'Comma-separated constraints: stack, deadline, regulation, integrations.' },
            stack: { type: 'string', description: 'Explicit stack. Defaults to the plugin config.' },
            has_ai: { type: 'boolean', description: 'True when an AI assistant/RAG is in scope.' },
            subagents: { type: 'boolean', description: 'True when a multi-agent/subagent harness is in scope.' },
            risk: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Impact/risk classification.' },
        },
        output: {
            schema: JSON_OUTPUT,
            render: (_args, value) => text(renderPlan(value)),
        },
        async execute(args) {
            return buildPlan({
                brief: args.brief,
                ...(args.users === undefined ? {} : { users: list(args.users) }),
                ...(args.constraints === undefined ? {} : { constraints: list(args.constraints) }),
                ...(args.stack === undefined ? {} : { stack: args.stack }),
                ...(args.has_ai === undefined ? {} : { hasAi: args.has_ai }),
                ...(args.subagents === undefined ? {} : { subagents: args.subagents }),
                ...(args.risk === undefined ? {} : { risk: args.risk }),
            }, config);
        },
    });
}
export function createUxTool() {
    return defineTool({
        name: 'fullstack_ux_review',
        description: 'Review a flow or screen list for UX pattern fit, missing states (loading/empty/partial/error/offline/permission), '
            + 'accessibility, copy rules and anti-patterns. Use before UI implementation and at the UX gate.',
        parameters: {
            flow: { type: 'string', description: 'Flow string, e.g. "login -> dashboard -> review -> result".' },
            screens: { type: 'string', description: 'Comma/newline-separated screen names. Overrides flow splitting.' },
            audience: { type: 'string', description: 'Primary audience/context.' },
        },
        output: {
            schema: JSON_OUTPUT,
            render: (_args, value) => text(renderUx(value)),
        },
        async execute(args) {
            return buildUxReview({
                ...(args.flow === undefined ? {} : { flow: args.flow }),
                ...(args.screens === undefined ? {} : { screens: list(args.screens) }),
                ...(args.audience === undefined ? {} : { audience: args.audience }),
            });
        },
    });
}
export function createSecurityTool() {
    return defineTool({
        name: 'fullstack_security_review',
        description: 'Produce a design-level threat model for a web application: object authorization, tenant isolation, injection, SSRF, '
            + 'secrets, CSRF/session, audit, and AI prompt-injection/RAG-ACL/tool-abuse when ai=true. Returns controls, tests and '
            + 'the secure-mesh integration rules. Does not claim verification.',
        parameters: {
            features: { type: 'string', required: true, description: 'Comma-separated features in scope.' },
            data_classes: { type: 'string', description: 'Comma-separated data classes, e.g. PII, payment, credentials.' },
            roles: { type: 'string', description: 'Comma-separated actor roles.' },
            ai: { type: 'boolean', description: 'True when an AI assistant/RAG is in scope.' },
            tenancy: { type: 'boolean', description: 'True when multiple tenants share the deployment.' },
        },
        output: {
            schema: JSON_OUTPUT,
            render: (_args, value) => text(renderSecurity(value)),
        },
        async execute(args) {
            return buildSecurityReview({
                features: list(args.features),
                ...(args.data_classes === undefined ? {} : { dataClasses: list(args.data_classes) }),
                ...(args.roles === undefined ? {} : { roles: list(args.roles) }),
                ...(args.ai === undefined ? {} : { ai: args.ai }),
                ...(args.tenancy === undefined ? {} : { tenancy: args.tenancy }),
            });
        },
    });
}
export function createRagTool() {
    return defineTool({
        name: 'fullstack_rag_blueprint',
        description: 'Design a stepwise (Langkah) RAG assistant using LangChain or LangGraph: source/ACL inventory, ingestion, parsing, '
            + 'chunking, embeddings/index, hybrid retrieval + rerank, grounded generation with citations, golden-set evaluation, '
            + 'guardrails, observability and cost controls. Each step has an explicit exit criterion.',
        parameters: {
            corpus: { type: 'string', required: true, description: 'Corpus/source description, owners and formats.' },
            users: { type: 'string', description: 'Comma-separated assistant user groups.' },
            freshness: { type: 'string', description: 'Required freshness, e.g. "daily" or "on publish".' },
            latency_budget_ms: { type: 'integer', description: 'p95 end-to-end latency budget in milliseconds.' },
            multi_tenant: { type: 'boolean', description: 'True when retrieval must be tenant-isolated.' },
            framework: { type: 'string', enum: ['langchain', 'langgraph'], description: 'Orchestration framework.' },
        },
        output: {
            schema: JSON_OUTPUT,
            render: (_args, value) => text(renderRag(value)),
        },
        async execute(args) {
            return buildRagBlueprint({
                corpus: args.corpus,
                ...(args.users === undefined ? {} : { users: list(args.users) }),
                ...(args.freshness === undefined ? {} : { freshness: args.freshness }),
                ...(args.latency_budget_ms === undefined ? {} : { latencyBudgetMs: args.latency_budget_ms }),
                ...(args.multi_tenant === undefined ? {} : { multiTenant: args.multi_tenant }),
                ...(args.framework === undefined ? {} : { framework: args.framework }),
            });
        },
    });
}
export function createSubagentTool() {
    return defineTool({
        name: 'fullstack_subagent_plan',
        description: 'Design a supervisor + subagent application: typed role contracts, allowed tools, loop stages, iteration/tool/token '
            + 'budgets, no-progress and stop rules, harness requirements (approvals, audit, evidence), gates, failure modes and '
            + 'red-team cases. Use before building a multi-agent workflow.',
        parameters: {
            objective: { type: 'string', required: true, description: 'What the agent system must deliver.' },
            roles: { type: 'string', description: 'Comma-separated role names; defaults to supervisor/product/ux/backend/frontend/security/verifier.' },
            tools: { type: 'string', description: 'Comma-separated tool patterns available to workers.' },
            risk: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Impact/risk classification.' },
            max_iterations: { type: 'integer', description: 'Per-run iteration cap (clamped 2-20).' },
        },
        output: {
            schema: JSON_OUTPUT,
            render: (_args, value) => text(renderSubagent(value)),
        },
        async execute(args) {
            return buildSubagentPlan({
                objective: args.objective,
                ...(args.roles === undefined ? {} : { roles: list(args.roles) }),
                ...(args.tools === undefined ? {} : { tools: list(args.tools) }),
                ...(args.risk === undefined ? {} : { risk: args.risk }),
                ...(args.max_iterations === undefined ? {} : { maxIterations: args.max_iterations }),
            });
        },
    });
}
export function createGateTool() {
    return defineTool({
        name: 'fullstack_gate',
        description: 'Evaluate a delivery gate from named artifacts. Returns pass/hold, missing artifacts, required evidence records and '
            + 'next actions. Evidence means producer/commit/scope/freshness records, never a URI alone. GATE_G is expansion-only.',
        parameters: {
            stage: {
                type: 'string',
                required: true,
                enum: ['scope', 'ux', 'architecture', 'security', 'reliability', 'rag', 'harness', 'release'],
                description: 'Gate stage to evaluate.',
            },
            artifacts: {
                type: 'string',
                description: 'Comma-separated satisfied artifact names, e.g. "brief,jobs,nonGoals,acceptance".',
            },
            risk: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Impact/risk classification.' },
            has_ai: { type: 'boolean', description: 'Include RAG in the cumulative gates.' },
            subagents: { type: 'boolean', description: 'Include harness in the cumulative gates.' },
        },
        output: {
            schema: JSON_OUTPUT,
            render: (_args, value) => text(renderGate(value)),
        },
        async execute(args) {
            return evaluateGate({
                stage: args.stage,
                artifacts: artifacts(args.artifacts),
                ...(args.risk === undefined ? {} : { risk: args.risk }),
                ...(args.has_ai === undefined ? {} : { hasAi: args.has_ai }),
                ...(args.subagents === undefined ? {} : { subagents: args.subagents }),
            });
        },
    });
}
//# sourceMappingURL=tools.js.map