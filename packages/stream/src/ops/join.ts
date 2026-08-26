import { AbstractOp } from '../op.js';

/**
 * Which key to match on, which rows to keep, and what to carry across.
 */
export interface JoinOptions {
  /** Key column. Use `[left, right]` when the two sides name it differently. */
  on: string | [string, string];
  /** `left` keeps every left row; `inner` keeps only the matched ones. Default `left`. */
  type?: 'left' | 'inner';
  /** Prefix for columns coming from the right, so a shared name does not overwrite. */
  prefix?: string;
  /** Right-hand columns to bring across. Default: all but the key. */
  columns?: string[];
}

/**
 * Bring the columns of one frame onto the rows of another, matched on a key.
 *
 * A left join by default, because the usual reason to reach for this is
 * enrichment — targets onto actuals, a lookup table onto transactions — and
 * losing the rows that did not match would quietly change every total computed
 * downstream. `inner` is there when the match itself is the question.
 *
 * A right-hand key with several rows is a fan-out waiting to happen, so only
 * the first match is taken: a join that silently multiplies row counts breaks
 * every sum below it, and is the classic way a dashboard starts overstating.
 */
export class Join extends AbstractOp {
  public override readonly inputs = 2;

  public override runAll(inputs: any[]): any {
    const o: JoinOptions = this.options ?? {};
    const left = Array.isArray(inputs?.[0]) ? inputs[0] : [];
    const right = Array.isArray(inputs?.[1]) ? inputs[1] : [];
    if (!o.on) return left;

    const [leftKey, rightKey] = Array.isArray(o.on) ? o.on : [o.on, o.on];
    const prefix = o.prefix ?? '';

    const index = new Map<string, any>();
    for (const row of right) {
      const key = String(row?.[rightKey] ?? '');
      // First match wins — see the note above about multiplying rows.
      if (!index.has(key)) index.set(key, row);
    }

    const carried = (row: any): string[] =>
      o.columns ?? Object.keys(row).filter((c) => c !== rightKey);

    const out: any[] = [];
    for (const row of left) {
      const match = index.get(String(row?.[leftKey] ?? ''));
      if (!match) {
        if ((o.type ?? 'left') === 'left') out.push(row);
        continue;
      }
      const merged = { ...row };
      for (const c of carried(match)) merged[prefix + c] = match[c];
      out.push(merged);
    }
    return out;
  }
}
