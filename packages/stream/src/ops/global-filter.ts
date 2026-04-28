import { AbstractFilter } from './abstract-filter.js';

export class GlobalFilter extends AbstractFilter {
  public run(df: any): any {
    const filter = this.ctx.getFilter();
    if (filter) {
      return df[0].filter((x: any) => this.doFilter(x, filter));
    }
    return df[0];
  }
}
