import { AbstractOp } from '../op.js';
import { runChecks, type Check, type Verdict } from '../checks.js';

/**
 * Runs validation checks over the upstream frame.
 *
 * Unlike every other op, `assert` is normally **terminal**: it returns an array
 * of {@link Verdict} records rather than data rows, so the host can render them
 * as pass/fail cards. Set `passthrough: true` to return the rows untouched and
 * read the verdicts off {@link Assert.getVerdicts} instead — useful when you
 * want a check in the middle of a graph.
 *
 * ```json
 * { "op": "assert", "require": ["margin"], "options": { "checks": [
 *     { "id": "gross-margin-positive", "type": "sign",
 *       "measure": "margin_accrual", "expect": ">0" }
 * ] } }
 * ```
 */
export class Assert extends AbstractOp {
  private verdicts: Verdict[] = [];

  public run(df: any): any {
    const rows: any[] = df[0] ?? [];
    const checks: Check[] = this.options?.checks ?? [];
    this.verdicts = runChecks(checks, rows, {
      columnDirectory: this.columnDirectory,
      orderBy: this.options?.orderBy,
    });
    return this.options?.passthrough ? rows : this.verdicts;
  }

  /** Verdicts from the most recent {@link run}. */
  public getVerdicts(): Verdict[] {
    return this.verdicts;
  }
}
