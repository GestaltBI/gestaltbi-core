import { AbstractOp } from '../op.js';

/**
 * Drops rows with no identity.
 *
 * A CSV with a trailing newline, or a sheet exported with padding, arrives
 * with rows whose `id` is empty. They are not observations, and counting
 * them shifts every total.
 */
export class ClearEmpty extends AbstractOp {
  public run(df: any): any {
    return df[0].filter((x: any) => x.id !== '');
  }
}
