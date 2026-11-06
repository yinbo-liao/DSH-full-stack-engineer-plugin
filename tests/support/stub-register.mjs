/**
 * Module hook that swaps the `@deepseek-ai/*` harness packages for the local
 * stand-ins in `tests/support/stubs/`.
 *
 * Use it in front of the test runner:
 *
 *   node --import ./tests/support/stub-register.mjs --test tests/*.test.mjs
 *
 * The hook rewrites bare specifiers only; the plugin and the tests themselves
 * are loaded unchanged from `lib/` and `tests/`, so the same assertions run
 * against the stub pipeline and against the real packages (`npm test`).
 *
 * @module tests/support/stub-register
 */

import { registerHooks } from 'node:module'

/** Harness packages replaced by local fixtures. */
const STUBS = new Map([
  ['@deepseek-ai/cordis', new URL('./stubs/cordis.mjs', import.meta.url).href],
  ['@deepseek-ai/dsh-system-prompt', new URL('./stubs/systemPrompt.mjs', import.meta.url).href],
  ['@deepseek-ai/dsh-tools', new URL('./stubs/tools.mjs', import.meta.url).href],
  ['@deepseek-ai/schemastery', new URL('./stubs/schemastery.mjs', import.meta.url).href],
])

registerHooks({
  resolve(specifier, context, nextResolve) {
    const stub = STUBS.get(specifier)
    if (stub !== undefined) return { url: stub, shortCircuit: true }
    return nextResolve(specifier, context)
  },
})
