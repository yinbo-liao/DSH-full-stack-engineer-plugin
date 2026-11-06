/**
 * Minimal stand-in for `@deepseek-ai/cordis`, used only to run this plugin's
 * tests without the harness checkout.
 *
 * Implements the surface the mesh and its tests touch: service provision and
 * resolution (`ctx.provide` / `ctx.get` / property access), plugin composition,
 * ordered event listeners, and fiber disposal. It is deliberately not a
 * general-purpose container: no inject, isolation, intercept, accessors, or
 * dynamic service availability.
 *
 * Every behavior here is a test fixture, not a claim about the real runtime.
 * The authoritative suite runs against the real packages (`npm test`).
 *
 * @module tests/support/stubs/cordis
 */

/** Create the context proxy and its backing state. */
class ContextImpl {
  constructor() {
    this._services = new Map()
    this._listeners = new Map()
    this._disposers = []
    this._frames = []
    this._disposed = false
    this.logs = []

    this.logger = {
      warn: (message) => this.logs.push(message),
      info: (message) => this.logs.push(message),
      error: (message) => this.logs.push(message),
    }

    this.fiber = { dispose: () => this.dispose() }

    return new Proxy(this, {
      get(target, property, receiver) {
        if (property in target) return Reflect.get(target, property, receiver)
        return target._services.get(property)
      },
      set(target, property, value, receiver) {
        return Reflect.set(target, property, value, receiver)
      },
    })
  }

  /** Run a disposer when the current fiber (or the root) unloads. */
  addDisposer(disposer) {
    const frame = this._frames[this._frames.length - 1]
    if (frame === undefined) this._disposers.push(disposer)
    else frame.push(disposer)
    return disposer
  }

  /** Register a service implementation owned by the current fiber. */
  provide(name, value) {
    if (this._services.has(name)) throw new Error(`service "${name}" is already provided`)
    this._services.set(name, value)
    return this.addDisposer(() => {
      if (this._services.get(name) === value) this._services.delete(name)
    })
  }

  /** Read a provided service. */
  get(name) {
    return this._services.get(name)
  }

  /** Replace a provided service value. */
  set(name, value) {
    if (!this._services.has(name)) throw new Error(`service "${name}" is not provided`)
    this._services.set(name, value)
  }

  /** Subscribe to an event; listeners run in registration order. */
  on(event, listener) {
    const listeners = this._listeners.get(event) ?? []
    listeners.push(listener)
    this._listeners.set(event, listeners)
    return this.addDisposer(() => {
      const current = this._listeners.get(event)
      if (current === undefined) return
      const index = current.indexOf(listener)
      if (index >= 0) current.splice(index, 1)
    })
  }

  /** Listeners registered for one event, in registration order. */
  listeners(event) {
    return [...(this._listeners.get(event) ?? [])]
  }

  /** Fire a non-waterfall event. */
  emit(event, ...args) {
    for (const listener of this.listeners(event)) listener(...args)
  }

  /** Load a plugin (function or `{ apply }` object/namespace) into this context. */
  async plugin(plugin, config) {
    const definition = plugin?.default ?? plugin
    const frame = []
    this._frames.push(frame)

    try {
      if (typeof definition === 'function') {
        await definition(this, config)
      } else if (definition !== null && typeof definition === 'object' && typeof definition.apply === 'function') {
        await definition.apply(this, config)
      } else {
        throw new Error('invalid plugin: expected a function or an object with apply()')
      }
    } finally {
      this._frames.pop()
    }

    return {
      dispose: () => {
        for (const disposer of frame.reverse()) disposer()
      },
    }
  }

  /** Unload the context: run every disposer, newest first. */
  dispose() {
    if (this._disposed) return
    this._disposed = true
    for (const disposer of this._disposers.reverse()) disposer()
    this._disposers = []
    this._listeners.clear()
    this._services.clear()
  }
}

/** Context container exposed to plugins and tests. */
export class Context extends ContextImpl {}
