/**
 * Minimal stand-in for `@deepseek-ai/dsh-tools`, used only to run this
 * plugin's tests without the harness checkout.
 *
 * Mirrors the parts of the tool pipeline the mesh hooks into:
 *
 *   materialize -> tools/pre-execute waterfall -> guards
 *     -> tool body -> tools/post-execute waterfall -> tools/result observers
 *
 * plus argument-free `defineTool`, `register`, `schemas`, and `guard`.
 * It is a fixture, not a reimplementation: there is no schema validation,
 * presentation layer, PTC mode, cancellation, or result timeout. The
 * authoritative suite runs against the real packages (`npm test`).
 *
 * @module tests/support/stubs/tools
 */

/** Identity wrapper: the stub does not compile or validate schemas. */
export function defineTool(options) {
  return options
}

/** Text blocks joined as the model-facing message. */
function textContent(blocks) {
  return blocks.map(block => (block.type === 'text' ? block.text : '')).join('\n')
}

class ToolRuntimeService {
  constructor(ctx) {
    this.ctx = ctx
    this.tools = new Map()
    this.guards = []
  }

  /** Register one tool definition. */
  register(tool) {
    if (this.tools.has(tool.name)) throw new Error(`tool "${tool.name}" is already registered`)
    this.tools.set(tool.name, tool)
    return this.ctx.addDisposer(() => this.tools.delete(tool.name))
  }

  /** Model-facing schemas. Only `name` is exercised by these tests. */
  schemas() {
    return [...this.tools.values()].map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }))
  }

  /** Register a monotonic execution guard. */
  guard(guard) {
    this.guards.push(guard)
    return this.ctx.addDisposer(() => {
      const index = this.guards.indexOf(guard)
      if (index >= 0) this.guards.splice(index, 1)
    })
  }

  /**
   * Run one tool call through the pipeline.
   *
   * @param {{ callId: string, name: string, arguments: unknown, signal: AbortSignal, agent?: object }} input
   * @returns {Promise<object>} a ToolExecutionResult-shaped result.
   */
  async execute(input) {
    const tool = this.tools.get(input.name)
    const exec = Object.freeze({
      callId: input.callId,
      rootCallId: input.rootCallId ?? input.callId,
      name: input.name,
      arguments: input.arguments,
      signal: input.signal,
      ...(input.agent === undefined ? {} : { agent: input.agent }),
      ...(input.parent === undefined ? {} : { parent: input.parent }),
    })

    if (tool === undefined) return this.failure(`unknown tool "${input.name}"`, 'UNKNOWN_TOOL')

    const pre = await this.runPre(exec)
    if (pre.kind === 'deny') return this.failure(pre.reason ?? 'denied', pre.info?.code ?? 'DENIED')
    if (pre.kind === 'cancel') return this.failure('tool call cancelled', 'CANCELLED')
    if (pre.kind === 'ask') {
      const outcome = await this.ask(exec, pre)
      if (outcome !== 'allowed-once') {
        return this.failure(
          `not approved (${outcome}): ${pre.reason ?? 'the secure-mesh approval gate'}`,
          `APPROVAL_${outcome.toUpperCase().replaceAll('-', '_')}`,
        )
      }
    }

    // Guards run after every pre-execute listener; a denial here is monotonic.
    for (const guard of this.guards) {
      const reason = guard(exec)
      if (reason !== undefined) return this.failure(reason, 'GUARDED')
    }

    let result
    try {
      const runContext = {
        ...exec,
        deferContext() {},
        concludeTurn() {},
      }
      const value = await tool.execute(exec.arguments, runContext)
      result = {
        isError: false,
        value,
        content: tool.output.render(exec.arguments, value),
      }
    } catch (error) {
      result = this.failureResult(error)
    }

    const post = await this.runPost(exec, result)

    if (post.kind === 'block') {
      const content = post.feedback ?? []
      result = {
        isError: true,
        error: { message: textContent(content), info: { code: 'BLOCKED' } },
        content,
      }
    } else {
      const content = post.content ?? result.content
      if (result.isError) {
        result = { ...result, content }
      } else {
        // A policy that replaced the canonical value owns the projection.
        const value = 'value' in post ? post.value : result.value
        result = {
          isError: false,
          value,
          content,
          ...(post.additionalContexts === undefined ? {} : { additionalContexts: post.additionalContexts }),
        }
      }
    }

    for (const observer of this.ctx.listeners('tools/result')) observer(exec, result)
    return result
  }

  /** Ordered `tools/pre-execute` waterfall; the terminal decision allows. */
  async runPre(exec) {
    const listeners = this.ctx.listeners('tools/pre-execute')
    const step = async (index) => {
      if (index >= listeners.length) return { kind: 'allow' }
      return listeners[index](exec, () => step(index + 1))
    }
    return step(0)
  }

  /** Ordered `tools/post-execute` waterfall; the terminal decision accepts. */
  async runPost(exec, result) {
    const listeners = this.ctx.listeners('tools/post-execute')
    const step = async (index) => {
      if (index >= listeners.length) return { kind: 'accept' }
      return listeners[index](exec, result, () => step(index + 1))
    }
    return step(0)
  }

  /** Route an `ask` decision to the approval service; fail closed on any doubt. */
  async ask(exec, decision) {
    const approval = this.ctx.get('approval')
    if (approval === undefined || exec.agent === undefined) return 'unavailable'

    try {
      return await approval.request({
        agent: exec.agent,
        toolName: exec.name,
        callId: exec.callId,
        ...(decision.reason === undefined ? {} : { reason: decision.reason }),
        ...(decision.displayReason === undefined ? {} : { displayReason: decision.displayReason }),
        signal: exec.signal,
      })
    } catch {
      return 'unavailable'
    }
  }

  /** Build a model-facing failure result. */
  failure(message, code) {
    return {
      isError: true,
      error: { message, info: { code } },
      content: [{ type: 'text', text: message }],
    }
  }

  /** Normalize a thrown tool body into a failure result. */
  failureResult(error) {
    const message = error instanceof Error ? error.message : String(error)
    return this.failure(message, 'TOOL_ERROR')
  }
}

export default {
  name: 'tools',
  apply(ctx) {
    ctx.provide('tools', new ToolRuntimeService(ctx))
  },
}
