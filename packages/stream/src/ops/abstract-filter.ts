import { AbstractOp } from '../op.js';

export abstract class AbstractFilter extends AbstractOp {
  protected doFilter(x: any, filter: any): boolean {
    let go = true;
    for (const k of Object.keys(filter)) {
      let canFilter = true;
      if (filter[k]) {
        if (Array.isArray(filter[k]) && filter[k].length > 0) {
          canFilter = filter[k].indexOf(x[k]) >= 0;
        } else {
          const op = Object.keys(filter[k])[0];
          switch (op) {
            case 'between':
              const values = filter[k].between;
              canFilter = x[k] >= values[0] && x[k] <= values[1];
              break;
            default:
              break;
          }
        }
      }
      go = go && canFilter;
    }
    return go;
  }
}
