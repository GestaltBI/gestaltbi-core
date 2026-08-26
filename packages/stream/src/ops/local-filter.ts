import { AbstractFilter } from './abstract-filter.js';

/**
 * Applies the filter belonging to one stream.
 *
 * Keyed by `options.identifier`, so two views reading the same graph can
 * narrow their own copy without disturbing each other.
 */
export class LocalFilter extends AbstractFilter {
  public run(df: any): any {
    if (this.options.identifier) {
      const filter = this.ctx.getFilter(this.options.identifier);
      return df[0].filter((x: any) => this.doFilter(x, filter));
    }
    return df[0];
  }
}
