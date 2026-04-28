import { Inject } from '@angular/core';

import { AbstractOp } from '../op';

@Inject({})
export class Enhance extends AbstractOp {
  public run(df: any): any {
    const data = df[0];
    data.map((row) => {
      this.options.columns.forEach((c) => {
        this.operate(row, c, df[0]);
      });
    });

    return data;
  }

  operate(row, op, df) {
    switch (op.calculate) {
      case 'func':
        this.funcCall(df, op.column, op.func, op.on);
        break;
      case 'diff':
        op.columns.forEach((column, i) => {
          let expr = JSON.stringify(op.diff);
          op.sequence.forEach((seq, j) => {
            const limit = i < j ? op.limits[0] : op.limits[1];
            expr = expr.replace('T:' + seq, limit + ':' + seq);
          });
          expr = JSON.parse(expr);
          const val = this.hydrate(row, expr);
          console.log(val);
          row[column] = val;
        });
        break;
      case 'expr':
      default:
        row[op.column] = this.hydrate(row, op.expr);
        break;
    }
  }

  funcCall(df, column, func, options) {
    switch (func) {
      case 'cumsum':
        const scol = options[0];
        const acc = df
          .sort((a, b) => {
            const da = new Date(a['uatu:date']);
            const db = new Date(b['uatu:date']);
            if (da < db) {
              return -1;
            } else if (da > db) {
              return 1;
            } else {
              return 0;
            }
          })
          .reduce((res: any[], row, i) => {
            res.push(row[scol]);
            row[column] = res.reduce((a, b) => a + b, 0);
            return res;
          }, []);
        break;
    }
  }

  hydrate(row, field) {
    if (Array.isArray(field)) {
      return this.polish([field[0], this.hydrate(row, field[1]), this.hydrate(row, field[2])]);
    } else if (!isNaN(field)) {
      return field;
    } else {
      if (Object.keys(row).indexOf(field) >= 0) {
        return row[field];
      } else {
        return this.neuter(field[0]);
      }
    }
  }

  neuter(op) {
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

  polish(expr) {
    switch (expr[0]) {
      case '-':
        return expr[1] - expr[2];
      case '+':
        return expr[1] + expr[2];
      case '*':
        return expr[1] * expr[2];
      case '/':
        return expr[1] / expr[2];
    }
  }
}
