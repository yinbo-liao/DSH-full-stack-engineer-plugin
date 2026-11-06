/**
 * Test-only resolver for the real DSH harness packages.
 *
 * Point `DSH_HARNESS` at a DeepSeek Harness checkout whose
 * `apps/cli/node_modules` contains the built harness packages. The plugin's
 * production code still imports the bare package names; this loader only makes
 * those packages resolvable from this repository during integration tests.
 */
import { createRequire } from 'node:module'
import { registerHooks } from 'node:module'
import { pathToFileURL } from 'node:url'

const harness = process.env.DSH_HARNESS ?? 'Y:/DSH/deepseek-harness'
const requireFromHarness = createRequire(pathToFileURL(`${harness}/apps/cli/package.json`))

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@deepseek-ai/')) {
      try {
        return { url: pathToFileURL(requireFromHarness.resolve(specifier)).href, shortCircuit: true }
      } catch {
        // Fall through to the normal resolver; a missing package should fail loudly.
      }
    }
    return nextResolve(specifier, context)
  },
})