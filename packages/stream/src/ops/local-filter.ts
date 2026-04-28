import { AbstractFilter } from './abstract-filter.js';

export class LocalFilter extends AbstractFilter {
  public run(df: any): any {
    if (this.options.identifier) {
      const filter = this.ctx.getFilter(this.options.identifier);
      return df[0].filter((x: any) => this.doFilter(x, filter));
    }
    return df[0];
  }
}
