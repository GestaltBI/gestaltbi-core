import { AbstractOp } from '../op.js';
import { resolveTimeColumn } from '../resolve.js';

/**
 * Adds derived columns.
 *
 * Each entry names the column to write and how to compute it: `expr` for a
 * Polish-notation expression over other columns, or `func` for a windowed
 * function such as `cumsum` accumulated along `cumulateOn`. With `nullSafe`
 * a missing input yields an absent result rather than a spurious zero.
 */
export class Enhance extends AbstractOp {
  public run(df: any): any {
    const data = df[0];
    data.map((row: any) => {
      this.options.columns.forEach((c: any) => {
        this.operate(row, c, df[0]);
      });
    });

    return data;
  }

  operate(row: any, op: any, df: any): void {
    switch (op.calculate) {
      case 'func':
        this.funcCall(df, op.column, op.func, op.on);
        break;
      case 'diff':
        op.columns.forEach((column: string, i: number) => {
          let expr: any = JSON.stringify(op.diff);
          op.sequence.forEach((seq: string, j: number) => {
            const limit = i < j ? op.limits[0] : op.limits[1];
            expr = expr.replace('T:' + seq, limit + ':' + seq);
          });
          expr = JSON.parse(expr);
          row[column] = this.hydrate(row, expr);
        });
        break;
      case 'expr':
      default:
        row[op.column] = this.hydrate(row, op.expr);
        break;
    }
  }

  funcCall(df: any[], column: string, func: string, options: any[]): void {
    switch (func) {
      case 'cumsum': {
        const scol = options[0];
        // `options[1]` names the ordering column explicitly; otherwise resolve
        // it, which still lands on the canonical `uatu:date` code that
        // `mapping.json` produces.
        // `on[1]` names the ordering column explicitly; `options.cumulateOn`
        // is the key sample-config already ships for this. Failing both,
        // resolve it — which still lands on the canonical `uatu:date` code.
        const dcol = resolveTimeColumn(this.columnDirectory, df, options[1] ?? this.options?.cumulateOn?.[0]);
        df.sort((a, b) => {
          if (!dcol) return 0;
          const da = +new Date(a[dcol]);
          const db = +new Date(b[dcol]);
          if (!Number.isFinite(da) || !Number.isFinite(db)) return 0;
          return da - db;
        }).reduce((res: number[], row: any) => {
          res.push(row[scol]);
          row[column] = res.reduce((a, b) => a + b, 0);
          return res;
        }, []);
        break;
      }
    }
  }

  hydrate(row: any, field: any): any {
    if (Array.isArray(field)) {
      return this.polish([field[0], this.hydrate(row, field[1]), this.hydrate(row, field[2])]);
    } else if (!isNaN(field)) {
      return field;
    } else {
      if (Object.keys(row).indexOf(field) >= 0) {
        const v = row[field];
        // With `nullSafe`, a missing operand poisons the expression instead of
        // reading as the identity. `revenue - null` must not look like margin.
        // `format`'s cleanNumber turns an empty cell into NaN, so NaN counts as
        // missing here too — otherwise it silently poisons the arithmetic.
        if (this.options?.nullSafe && (v === null || v === undefined || v === '' || (typeof v === 'number' && Number.isNaN(v))))
          return null;
        return v;
      } else {
        return this.options?.nullSafe ? null : this.neuter(field[0]);
      }
    }
  }

  neuter(op: string): number {
    switch (op) {
      case '+':
      case '-':
        return 0;
      case '*':
      case '/':
        return 1;
      default:
        return 0;
    }
  }

  polish(expr: any[]): number | null {
    if (this.options?.nullSafe && (expr[1] === null || expr[2] === null)) return null;
    switch (expr[0]) {
      case '-':
        return expr[1] - expr[2];
      case '+':
        return expr[1] + expr[2];
      case '*':
        return expr[1] * expr[2];
      case '/':
        return expr[1] / expr[2];
      default:
        return 0;
    }
  }
}
