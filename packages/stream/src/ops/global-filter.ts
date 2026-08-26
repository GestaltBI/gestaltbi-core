import { AbstractFilter } from './abstract-filter.js';

/**
 * Applies the filter every stream shares.
 *
 * Use it above the fork point, for the constraints that belong to the whole
 * page — the period under study, the company being looked at.
 */
export class GlobalFilter extends AbstractFilter {
  public run(df: any): any {
    const filter = this.ctx.getFilter();
    if (filter) {
      return df[0].filter((x: any) => this.doFilter(x, filter));
    }
    return df[0];
  }
}
