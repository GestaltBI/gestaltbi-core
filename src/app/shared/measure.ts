import { ColumnStructure } from '../datastructure/datastructure.service';

export class Measure {
  code: string;
  column: ColumnStructure;

  constructor(data: ColumnStructure | string, code: string) {
    this.code = code;
    if (typeof data === 'string') {
      const cl = new ColumnStructure();
      cl.label = data;
      this.column = cl;
      return;
    }

    if (data && typeof data === 'object' && data.label !== undefined) {
      this.column = data;
      return;
    }

    // Anything else still gets a usable column. A conf block that names no
    // measure, or names one the structure does not describe, used to leave
    // `column` undefined and take the whole view down on the first `.label`.
    const cl = new ColumnStructure();
    cl.label = code ?? '';
    this.column = cl;
  }
}
