export class Utils {
  private formatters = new Map<string, any>();

  public pimp(coldefs: any) {
    coldefs.forEach((element) => {
      element.valueFormatter = this.getFormatter(element.formatter, this.currencyFormatter);
      if (element.children) {
        element.children.forEach((column) => {
          column.valueFormatter = this.getFormatter(column.formatter, this.currencyFormatter);
        });
      }
    });
    return coldefs;
  }

  constructor() {
    this.formatters.set('currency', this.currencyFormatter);
    this.formatters.set('percent', this.percentageFormatter);
    this.formatters.set('noop', this.noopFormatter);
    this.formatters.set('amount', this.amountFormatter);
    this.formatters.set('floatamount', this.floatamountFormatter);
    this.formatters.set('date', this.dateFormatter);
  }

  public getFormatter(name, def = this.noopFormatter) {
    if (this.formatters.has(name)) {
      return this.formatters.get(name);
    } else {
      return def;
    }
  }

  /**
   * A cell the source left empty must read as empty.
   *
   * `format`'s cleanNumber turns a blank cell into NaN, and NaN.toFixed(2) is
   * the string "NaN" — so a gap in the data was rendering as "€NaN", which
   * reads as a value rather than as an absence.
   */
  private static num(params): number | null {
    const v = params?.value;
    if (v === null || v === undefined || v === '') {
      return null;
    }
    const n = typeof v === 'number' ? v : parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }

  public currencyFormatter(params) {
    const n = Utils.num(params);
    return n === null ? '' : '€' + n.toFixed(2);
  }
  public percentageFormatter(params) {
    const n = Utils.num(params);
    return n === null ? '' : n.toFixed(1) + '%';
  }
  public noopFormatter(params) {
    const v = params?.value;
    return v === null || v === undefined ? '' : v;
  }
  public amountFormatter(params) {
    const n = Utils.num(params);
    return n === null ? '' : n.toFixed(0);
  }
  public floatamountFormatter(params) {
    const n = Utils.num(params);
    return n === null ? '' : n.toFixed(2);
  }
  public dateFormatter(params) {
    const d = new Date(params?.value);
    if (!Number.isFinite(+d)) {
      return '';
    }
    return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
  }
}
