/**
 * Minimal stand-in for the default export of `@deepseek-ai/schemastery`.
 *
 * `src/config.ts` builds a schema at import time. The mesh applies every
 * default itself in `resolveConfig`, so this stub only has to be chainable:
 * `Schema.object(...)` / `boolean()` / `string()` / `natural()` / `array(...)`
 * with `.default()` and `.description()`. It does not validate.
 *
 * @module tests/support/stubs/schemastery
 */

/** Build a chainable schema placeholder. */
function builder(kind, inner) {
  const schema = (value) => {
    if (value !== undefined) return value
    return schema.meta.default
  }
  schema.kind = kind
  schema.inner = inner
  schema.meta = { default: undefined, description: '' }
  schema.default = (value) => {
    schema.meta.default = value
    return schema
  }
  schema.description = (text) => {
    schema.meta.description = text
    return schema
  }
  return schema
}

const Schema = {
  any: () => builder('any'),
  boolean: () => builder('boolean'),
  string: () => builder('string'),
  number: () => builder('number'),
  natural: () => builder('natural'),
  array: (inner) => builder('array', inner),
  object: (shape) => builder('object', shape),
  union: (variants) => builder('union', variants),
}

export default Schema
