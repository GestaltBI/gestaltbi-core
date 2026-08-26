import { AbstractOp } from '../op.js';

/**
 * The predicate shared by the filter ops.
 *
 * A filter is an object keyed by column: an array means "one of these", and
 * an object means a comparison — `between`, `gt`, `lt` and friends. Absent
 * or empty entries match everything, so a partly-filled filter narrows
 * rather than excludes.
 */
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
