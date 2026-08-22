import { AbstractOp } from '../op.js';
import { resolveTimeColumn } from '../resolve.js';

/**
 * Cohort axis: bucket rows by the period a subject first appeared, and stamp
 * how many periods have elapsed since.
 *
 * Retention and conversion curves need "periods since first event" as a real
 * dimension; `aggregate` can only group by columns that already exist, so this
 * op creates them.
 *
 * ```json
 * { "op": "cohort", "options": {
 *     "subject": "user_id", "date": "event_date",
 *     "period": "month",
 *     "into": { "cohort": "cohort_month", "since": "periods_since" },
 *     "window": { "days": 30, "asOf": "2013-11-06", "mask": ["retained"] } } }
 * ```
 *
 * `window` is the guard that stops a half-observed cohort reading as a perfect
 * one: any cohort younger than `days` as of `asOf` has the listed measures set
 * to `null` and is flagged `incomplete`. Without it a cohort formed yesterday
 * shows 100% 30-day retention, which is an artefact, not a result.
 */
export class Cohort extends AbstractOp {
  public run(df: any): any {
    const rows: any[] = df[0] ?? [];
    if (!rows.length) return rows;

    const o = this.options ?? {};
    const dateCol = resolveTimeColumn(this.columnDirectory, rows, o.date);
    if (!dateCol) throw new Error('cohort: no options.date and no time column found');
    const subjectCol: string | undefined = o.subject;
    const period: string = o.period ?? 'month';
    const cohortInto: string = o.into?.cohort ?? 'cohort';
    const sinceInto: string = o.into?.since ?? 'periods_since';
    const incompleteInto: string = o.into?.incomplete ?? 'cohort_incomplete';

    // First-seen period per subject. With no subject column each row is its own cohort.
    const firstSeen = new Map<string, number>();
    if (subjectCol) {
      for (const r of rows) {
        const s = String(r[subjectCol]);
        const t = +new Date(r[dateCol]);
        if (!Number.isFinite(t)) continue;
        if (!firstSeen.has(s) || t < (firstSeen.get(s) as number)) firstSeen.set(s, t);
      }
    }

    for (const r of rows) {
      const t = new Date(r[dateCol]);
      if (!Number.isFinite(+t)) {
        r[cohortInto] = null;
        r[sinceInto] = null;
        continue;
      }
      const origin = subjectCol ? new Date(firstSeen.get(String(r[subjectCol])) as number) : t;
      r[cohortInto] = this.bucket(origin, period);
      r[sinceInto] = this.elapsed(origin, t, period);
    }

    const w = o.window;
    if (w?.days && w?.asOf) {
      const asOf = +new Date(w.asOf);
      const mask: string[] = w.mask ?? [];
      for (const r of rows) {
        const origin = this.unbucket(r[cohortInto], period);
        if (origin === null) continue;
        // Measure from the END of the bucket: someone who joined on 31 October
        // has only been observed for six days on 6 November, even though the
        // October bucket starts thirty-six days back.
        const observedDays = (asOf - this.bucketEnd(origin, period)) / 86400000;
        const incomplete = observedDays < w.days;
        r[incompleteInto] = incomplete;
        if (incomplete) for (const m of mask) r[m] = null;
      }
    }

    return rows;
  }

  private bucket(d: Date, period: string): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    if (period === 'year') return `${y}`;
    if (period === 'quarter') return `${y}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
    if (period === 'day') return `${y}-${m}-${day}`;
    if (period === 'week') {
      const t = new Date(Date.UTC(y, d.getUTCMonth(), d.getUTCDate()));
      t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7)); // ISO Monday
      return t.toISOString().slice(0, 10);
    }
    return `${y}-${m}`;
  }

  /** First instant after a bucket that starts at `start` (ms). */
  private bucketEnd(start: number, period: string): number {
    const d = new Date(start);
    const y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate();
    switch (period) {
      case 'year': return Date.UTC(y + 1, m, day);
      case 'quarter': return Date.UTC(y, m + 3, day);
      case 'week': return start + 7 * 86400000;
      case 'day': return start + 86400000;
      default: return Date.UTC(y, m + 1, day);
    }
  }

  /** Inverse of {@link bucket} — the first instant of a bucket, or null. */
  private unbucket(label: any, period: string): number | null {
    if (!label) return null;
    const s = String(label);
    if (period === 'year') return Date.UTC(+s, 0, 1);
    if (period === 'quarter') {
      const [y, q] = s.split('-Q');
      return Date.UTC(+y, (+q - 1) * 3, 1);
    }
    const t = +new Date(s.length === 7 ? `${s}-01` : s);
    return Number.isFinite(t) ? t : null;
  }

  private elapsed(from: Date, to: Date, period: string): number {
    if (period === 'year') return to.getUTCFullYear() - from.getUTCFullYear();
    if (period === 'quarter')
      return (to.getUTCFullYear() - from.getUTCFullYear()) * 4 + (Math.floor(to.getUTCMonth() / 3) - Math.floor(from.getUTCMonth() / 3));
    if (period === 'day') return Math.floor((+to - +from) / 86400000);
    if (period === 'week') return Math.floor((+to - +from) / (7 * 86400000));
    return (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
  }

  private firstTimeColumn(rows: any[]): string {
    const cols = this.columnDirectory?.getColumnsFor('uatu:dimension:time') ?? [];
    if (cols.length) return cols[0];
    const guess = Object.keys(rows[0] ?? {}).find((k) => rows[0][k] instanceof Date);
    if (!guess) throw new Error('cohort: no options.date and no uatu:dimension:time column');
    return guess;
  }
}
