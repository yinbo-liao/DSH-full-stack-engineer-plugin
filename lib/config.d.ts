/** Configuration surface for the full-stack engineering playbook. */
export declare const PLUGIN_NAME = "fullstack-engineer";
export type Rigor = 'lean' | 'standard' | 'regulated';
export interface FullstackConfig {
    rigor?: Rigor;
    defaultStack?: string;
    prompt?: boolean;
    plan?: boolean;
    uxReview?: boolean;
    securityReview?: boolean;
    ragBlueprint?: boolean;
    subagentPlan?: boolean;
    gate?: boolean;
    maxOpenQuestions?: number;
}
export type ResolvedConfig = Required<FullstackConfig>;
export declare const Config: any;
export declare function resolveConfig(config: FullstackConfig): ResolvedConfig;
//# sourceMappingURL=config.d.ts.map