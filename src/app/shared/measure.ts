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

    if (typeof data === 'object' && data.label !== undefined) {
      this.column = data;
      return;
    }

    if (typeof data === 'object' && data.label === undefined) {
      const cl = new ColumnStructure();
      cl.label = code;
      this.column = cl;
      return;
    }
  }
}
