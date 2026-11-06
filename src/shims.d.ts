/**
 * Compile-time shims for the DSH peer packages.
 *
 * The plugin is compiled in repositories where the harness packages are not
 * installed. The emitted JavaScript still imports the real packages; these
 * declarations only describe the small surface this plugin uses. They are not
 * shipped to consumers (`files` includes lib, not src).
 */

declare module '@deepseek-ai/cordis' {
  export interface Context {
    logger: {
      info(message: string): void
      warn(message: string): void
      error(message: string): void
    }
    tools: {
      register(tool: unknown): unknown
    }
    systemPrompt: {
      section(entry: { name: string; order?: number; text: string }): unknown
    }
  }
}

declare module '@deepseek-ai/dsh-tools' {
  export interface ToolDefinition {
    readonly name: string
    readonly description: string
  }

  export interface DefineToolOptions {
    readonly name: string
    readonly description: string
    readonly parameters: Record<string, unknown>
    readonly output: {
      readonly schema: unknown
      readonly render: (args: any, value: any) => Array<{ type: 'text'; text: string }>
    }
    execute(args: any, exec: any): Promise<any>
  }

  export function defineTool(options: DefineToolOptions): ToolDefinition
}

declare module '@deepseek-ai/schemastery' {
  const Schema: any
  export default Schema
}