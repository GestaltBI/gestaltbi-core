import type { Op, OpContext } from './op.js';

/** Constructor signature expected by the registry. */
export type OpConstructor = new (opts: any, ctx: OpContext) => Op;

/**
 * Maps op-name strings (as referenced from `processing.json`) to op classes.
 * Pre-populated with the eleven built-in ops by `Processor`'s default constructor;
 * callers can register additional custom ops at runtime.
 */
export class OpRegistry {
  private registry = new Map<string, OpConstructor>();

  register(name: string, op: OpConstructor): void {
    this.registry.set(name, op);
  }

  has(name: string): boolean {
    return this.registry.has(name);
  }

  get(name: string): OpConstructor | undefined {
    return this.registry.get(name);
  }

  /** Construct an op instance bound to the supplied context. */
  instantiate(name: string, opts: any, ctx: OpContext): Op | null {
    const ctor = this.registry.get(name);
    if (!ctor) return null;
    return new ctor(opts, ctx);
  }
}
