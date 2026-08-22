/**
 * Check predicates — the validation vocabulary.
 *
 * A check consumes a processed dataframe and returns a {@link Verdict}: a
 * pass/fail record naming the periods that broke it. Checks never mutate the
 * frame. `Assert` (see `ops/assert.ts`) is the op that runs them inside a
 * process graph; you can also call {@link runCheck} directly.
 */

import { unitOf } from './tags.js';
import { resolveTimeColumn } from './resolve.js';
import type { ColumnDirectory } from './column-directory.js';

export type CheckStatus = 'pass' | 'fail' | 'warn' | 'skip';

export interface Verdict {
  id: string;
  type: string;
  status: CheckStatus;
  /** One-line, human-readable result. Safe to render straight into a card. */
  summary: string;
  label?: string;
  measure?: string;
  /** Periods actually evaluated (nulls excluded). */
  n?: number;
  /** Periods satisfying the predicate. */
  hits?: number;
  observed?: number;
  expected?: string;
  /** The rows that broke it, capped by `offenderLimit`. */
  offenders?: any[];
  /** Set when the check could not run (missing column, no rows, unit mismatch). */
  reason?: string;
}

export interface BaseCheck {
  id: string;
  type: string;
  label?: string;
  /** Column to sort by before evaluating. Defaults to the directory's first time dimension. */
  orderBy?: string;
  /** Max offender rows to carry in the verdict (default 12). */
  offenderLimit?: number;
}

export interface MonotonicCheck extends BaseCheck {
  type: 'monotonic';
  measure: string;
  direction?: 'increasing' | 'decreasing';
  /** Require strict change between periods (default false — flat is allowed). */
  strict?: boolean;
}

export interface SignCheck extends BaseCheck {
  type: 'sign';
  measure: string;
  expect: '>0' | '>=0' | '<0' | '<=0';
  /** Periods that must satisfy it: a count, or 'all' (default). */
  atLeast?: number | 'all';
}

export interface CoversCheck extends BaseCheck {
  type: 'covers';
  /** The measure that must be at least as large as `by`. */
  measure: string;
  by: string;
  atLeast?: number | 'all';
}

export interface DivergenceCheck extends BaseCheck {
  type: 'divergence';
  a: string;
  b: string;
  /** Relative gap |a-b| / max(|a|,|b|) above which to warn / fail. */
  warn?: number;
  fail?: number;
}

export interface WindowCompleteCheck extends BaseCheck {
  type: 'window_complete';
  measure: string;
  /** Column holding the period/cohort start date. */
  cohortDate: string;
  /** Measurement window in days (e.g. 30 for a 30-day-active metric). */
  windowDays: number;
  /** Observation date. Cohorts younger than the window as of this date are incomplete. */
  asOf: string | Date;
  /**
   * How wide the cohort bucket is. A *monthly* cohort is not fully observed
   * until the window has elapsed past the **end** of the month — someone who
   * signed up on 31 October is only six days old on 6 November even though the
   * bucket starts 36 days back. Default `'day'` treats each row as a point in
   * time, which is the old behaviour.
   */
  span?: 'day' | 'week' | 'month' | 'quarter' | 'year' | number;
}

export interface RatioBoundsCheck extends BaseCheck {
  type: 'ratio_bounds';
  measure: string;
  min?: number;
  max?: number;
}

export type Check =
  | MonotonicCheck
  | SignCheck
  | CoversCheck
  | DivergenceCheck
  | WindowCompleteCheck
  | RatioBoundsCheck;

export interface CheckContext {
  columnDirectory?: ColumnDirectory;
  /** Fallback ordering column when a check does not name one. */
  orderBy?: string;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const num = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

const timeColumn = (ctx: CheckContext, rows?: any[]): string | undefined =>
  resolveTimeColumn(ctx.columnDirectory, rows, ctx.orderBy);

const ordered = (rows: any[], check: BaseCheck, ctx: CheckContext): any[] => {
  const key = check.orderBy ?? timeColumn(ctx, rows);
  if (!key) return rows.slice();
  return rows.slice().sort((a, b) => {
    const av = a[key], bv = b[key];
    if (av instanceof Date || bv instanceof Date) return +new Date(av) - +new Date(bv);
    if (typeof av === 'number' && typeof bv === 'number') return av - bv;
    return String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0;
  });
};

/** Label a row for an offender list: its ordering key if there is one, else its index. */
const stamp = (row: any, check: BaseCheck, ctx: CheckContext, i: number): any => {
  const key = check.orderBy ?? timeColumn(ctx, [row]);
  const at = key ? row[key] : i;
  return at instanceof Date ? at.toISOString().slice(0, 10) : at;
};

const skip = (c: Check, reason: string): Verdict => ({
  id: c.id, type: c.type, status: 'skip', summary: `skipped — ${reason}`, label: c.label, reason,
});

const cap = (c: BaseCheck, list: any[]): any[] => list.slice(0, c.offenderLimit ?? 12);

/** End of the cohort bucket that starts at `start` — exclusive upper bound. */
const spanEnd = (start: Date, span: WindowCompleteCheck['span']): Date => {
  if (typeof span === 'number') return new Date(+start + span * 86400000);
  const y = start.getUTCFullYear(), m = start.getUTCMonth(), d = start.getUTCDate();
  switch (span) {
    case 'week': return new Date(+start + 7 * 86400000);
    case 'month': return new Date(Date.UTC(y, m + 1, d));
    case 'quarter': return new Date(Date.UTC(y, m + 3, d));
    case 'year': return new Date(Date.UTC(y + 1, m, d));
    default: return start;
  }
};

const satisfies = (v: number, expect: SignCheck['expect']): boolean =>
  expect === '>0' ? v > 0 : expect === '>=0' ? v >= 0 : expect === '<0' ? v < 0 : v <= 0;

const requiredHits = (atLeast: number | 'all' | undefined, n: number): number =>
  atLeast === undefined || atLeast === 'all' ? n : atLeast;

/** Units must match (or be absent on both sides) before two measures may be compared. */
const unitFor = (col: string, ctx: CheckContext): string | undefined => {
  try {
    const s = ctx.columnDirectory?.getDataStructureFor('uatu:measure');
    const c = s?.columns?.find((x: any) => x.column === col);
    return c ? unitOf(c.tags || []) : undefined;
  } catch {
    return undefined;
  }
};

// ---------------------------------------------------------------------------
// the predicates
// ---------------------------------------------------------------------------

export function runCheck(check: Check, rows: any[], ctx: CheckContext = {}): Verdict {
  if (!Array.isArray(rows) || rows.length === 0) return skip(check, 'no rows');

  switch (check.type) {
    case 'monotonic': {
      const c = check as MonotonicCheck;
      const rs = ordered(rows, c, ctx);
      const pts = rs.map((r, i) => ({ v: num(r[c.measure]), at: stamp(r, c, ctx, i) })).filter((p) => p.v !== null);
      if (pts.length < 2) return skip(c, `fewer than 2 non-null values of "${c.measure}"`);
      const dir = c.direction ?? 'increasing';
      const offenders: any[] = [];
      for (let i = 1; i < pts.length; i++) {
        const d = (pts[i].v as number) - (pts[i - 1].v as number);
        const ok = dir === 'increasing' ? (c.strict ? d > 0 : d >= 0) : c.strict ? d < 0 : d <= 0;
        if (!ok) offenders.push({ at: pts[i].at, from: pts[i - 1].v, to: pts[i].v, delta: d });
      }
      const steps = pts.length - 1;
      return {
        id: c.id, type: c.type, label: c.label, measure: c.measure,
        status: offenders.length ? 'fail' : 'pass',
        n: steps, hits: steps - offenders.length,
        expected: `${c.strict ? 'strictly ' : ''}${dir}`,
        summary: offenders.length
          ? `"${c.measure}" broke ${dir} order in ${offenders.length} of ${steps} steps`
          : `"${c.measure}" is ${c.strict ? 'strictly ' : ''}${dir} across all ${steps} steps`,
        offenders: cap(c, offenders),
      };
    }

    case 'sign': {
      const c = check as SignCheck;
      const rs = ordered(rows, c, ctx);
      const pts = rs.map((r, i) => ({ v: num(r[c.measure]), at: stamp(r, c, ctx, i) })).filter((p) => p.v !== null);
      if (!pts.length) return skip(c, `no non-null values of "${c.measure}"`);
      const hits = pts.filter((p) => satisfies(p.v as number, c.expect)).length;
      const need = requiredHits(c.atLeast, pts.length);
      const offenders = pts.filter((p) => !satisfies(p.v as number, c.expect)).map((p) => ({ at: p.at, value: p.v }));
      return {
        id: c.id, type: c.type, label: c.label, measure: c.measure,
        status: hits >= need ? 'pass' : 'fail',
        n: pts.length, hits, expected: `${c.measure} ${c.expect} in ${need} of ${pts.length} periods`,
        summary: `${c.measure} ${c.expect} in ${hits} of ${pts.length} periods (needed ${need})`,
        offenders: cap(c, offenders),
      };
    }

    case 'covers': {
      const c = check as CoversCheck;
      const ua = unitFor(c.measure, ctx), ub = unitFor(c.by, ctx);
      if (ua && ub && ua !== ub) return skip(c, `unit mismatch: ${c.measure} is ${ua}, ${c.by} is ${ub}`);
      const rs = ordered(rows, c, ctx);
      const pts = rs
        .map((r, i) => ({ a: num(r[c.measure]), b: num(r[c.by]), at: stamp(r, c, ctx, i) }))
        .filter((p) => p.a !== null && p.b !== null);
      if (!pts.length) return skip(c, `no periods with both "${c.measure}" and "${c.by}"`);
      const hits = pts.filter((p) => (p.a as number) >= (p.b as number)).length;
      const need = requiredHits(c.atLeast, pts.length);
      const offenders = pts
        .filter((p) => (p.a as number) < (p.b as number))
        .map((p) => ({ at: p.at, [c.measure]: p.a, [c.by]: p.b, shortfall: (p.a as number) - (p.b as number) }));
      return {
        id: c.id, type: c.type, label: c.label, measure: c.measure,
        status: hits >= need ? 'pass' : 'fail',
        n: pts.length, hits, expected: `${c.measure} >= ${c.by} in ${need} of ${pts.length} periods`,
        summary: `${c.measure} covered ${c.by} in ${hits} of ${pts.length} periods (needed ${need})`,
        offenders: cap(c, offenders),
      };
    }

    case 'divergence': {
      const c = check as DivergenceCheck;
      const rs = ordered(rows, c, ctx);
      const pts = rs
        .map((r, i) => ({ a: num(r[c.a]), b: num(r[c.b]), at: stamp(r, c, ctx, i) }))
        .filter((p) => p.a !== null && p.b !== null);
      if (!pts.length) return skip(c, `no periods with both "${c.a}" and "${c.b}"`);
      const rel = pts.map((p) => {
        const scale = Math.max(Math.abs(p.a as number), Math.abs(p.b as number));
        return { at: p.at, [c.a]: p.a, [c.b]: p.b, gap: scale === 0 ? 0 : Math.abs((p.a as number) - (p.b as number)) / scale };
      });
      const worst = rel.reduce((m, r) => (r.gap > m.gap ? r : m), rel[0]);
      const failAt = c.fail ?? Infinity, warnAt = c.warn ?? Infinity;
      const status: CheckStatus = worst.gap >= failAt ? 'fail' : worst.gap >= warnAt ? 'warn' : 'pass';
      return {
        id: c.id, type: c.type, label: c.label,
        status, n: pts.length, observed: worst.gap,
        expected: c.fail !== undefined ? `gap < ${(failAt * 100).toFixed(0)}%` : `gap < ${(warnAt * 100).toFixed(0)}%`,
        summary: `worst gap between "${c.a}" and "${c.b}" is ${(worst.gap * 100).toFixed(1)}% at ${worst.at}`,
        offenders: cap(c, rel.filter((r) => r.gap >= Math.min(warnAt, failAt)).sort((x, y) => y.gap - x.gap)),
      };
    }

    case 'window_complete': {
      const c = check as WindowCompleteCheck;
      const asOf = new Date(c.asOf);
      if (!Number.isFinite(+asOf)) return skip(c, `asOf "${c.asOf}" is not a date`);
      const rs = ordered(rows, c, ctx);
      const offenders: any[] = [];
      let n = 0;
      rs.forEach((r, i) => {
        if (num(r[c.measure]) === null) return;
        const d = new Date(r[c.cohortDate]);
        if (!Number.isFinite(+d)) return;
        n++;
        const end = spanEnd(d, c.span);
        const observedDays = (+asOf - +end) / 86400000;
        if (observedDays < c.windowDays)
          offenders.push({
            at: stamp(r, c, ctx, i),
            observedDays: Math.round(observedDays),
            needDays: c.windowDays,
            value: num(r[c.measure]),
          });
      });
      if (!n) return skip(c, `no datable rows carrying "${c.measure}"`);
      return {
        id: c.id, type: c.type, label: c.label, measure: c.measure,
        status: offenders.length ? 'fail' : 'pass',
        n, hits: n - offenders.length,
        expected: `every cohort observed for ${c.windowDays}d as of ${asOf.toISOString().slice(0, 10)}`,
        summary: offenders.length
          ? `${offenders.length} of ${n} cohorts were observed for less than the ${c.windowDays}-day window — "${c.measure}" is an artefact there`
          : `all ${n} cohorts were observed for the full ${c.windowDays}-day window`,
        offenders: cap(c, offenders),
      };
    }

    case 'ratio_bounds': {
      const c = check as RatioBoundsCheck;
      const rs = ordered(rows, c, ctx);
      const pts = rs.map((r, i) => ({ v: num(r[c.measure]), at: stamp(r, c, ctx, i) })).filter((p) => p.v !== null);
      if (!pts.length) return skip(c, `no non-null values of "${c.measure}"`);
      const lo = c.min ?? -Infinity, hi = c.max ?? Infinity;
      const offenders = pts.filter((p) => (p.v as number) < lo || (p.v as number) > hi).map((p) => ({ at: p.at, value: p.v }));
      return {
        id: c.id, type: c.type, label: c.label, measure: c.measure,
        status: offenders.length ? 'fail' : 'pass',
        n: pts.length, hits: pts.length - offenders.length,
        expected: `${c.min ?? '-inf'} <= ${c.measure} <= ${c.max ?? '+inf'}`,
        summary: offenders.length
          ? `"${c.measure}" left [${c.min ?? '-inf'}, ${c.max ?? '+inf'}] in ${offenders.length} of ${pts.length} periods`
          : `"${c.measure}" stayed within [${c.min ?? '-inf'}, ${c.max ?? '+inf'}] across ${pts.length} periods`,
        offenders: cap(c, offenders),
      };
    }

    default:
      return skip(check, `unknown check type "${(check as any).type}"`);
  }
}

/** Run a list of checks. Order preserved. */
export const runChecks = (checks: Check[], rows: any[], ctx: CheckContext = {}): Verdict[] =>
  (checks || []).map((c) => runCheck(c, rows, ctx));

/** True when no verdict failed. Warnings do not fail a suite. */
export const allPassed = (verdicts: Verdict[]): boolean => !verdicts.some((v) => v.status === 'fail');
