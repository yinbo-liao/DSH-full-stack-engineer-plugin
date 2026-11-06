/**
 * Minimal stand-in for the default export of `@deepseek-ai/dsh-system-prompt`.
 *
 * Provides the `systemPrompt` service with the two operations the mesh uses:
 * `section()` to contribute a prompt section and `assemble()` for tests to
 * read the result.
 *
 * @module tests/support/stubs/systemPrompt
 */

export default {
  name: 'system-prompt',
  apply(ctx) {
    const sections = new Map()

    ctx.provide('systemPrompt', {
      /**
       * Contribute one section.
       * @param {{ name: string, order?: number, text: string }} entry
       * @returns {() => void} disposer
       */
      section({ name, order = 0, text }) {
        sections.set(name, { name, order, text })
        return () => sections.delete(name)
      },

      /** Assemble the current sections in order. */
      assemble() {
        const ordered = [...sections.values()]
          .sort((left, right) => left.order - right.order)
          .map(section => ({ name: section.name, order: section.order, text: section.text }))
        return { sections: ordered }
      },
    })
  },
}
