import { AbstractOp } from '../op.js';

export class ClearEmpty extends AbstractOp {
  public run(df: any): any {
    return df[0].filter((x: any) => x.id !== '');
  }
}
