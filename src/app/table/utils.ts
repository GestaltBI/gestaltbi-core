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

  public currencyFormatter(params) {
    try {
      return '€' + params.value.toFixed(2);
    } catch (ex) {
      return '';
    }
  }
  public percentageFormatter(params) {
    try {
      return params.value.toFixed(1) + '%';
    } catch (ex) {
      return '';
    }
  }
  public noopFormatter(params) {
    try {
      return params.value;
    } catch (ex) {
      return '';
    }
  }
  public amountFormatter(params) {
    try {
      return params.value.toFixed(0);
    } catch (ex) {
      return '';
    }
  }
  public floatamountFormatter(params) {
    try {
      return params.value.toFixed(2);
    } catch (ex) {
      return '';
    }
  }
  public dateFormatter(params) {
    try {
      const d = new Date(params.value);
      return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
    } catch (ex) {
      return '';
    }
  }
}
