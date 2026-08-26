import { AbstractOp } from '../op.js';

/**
 * Reserved: registered as `heatmap`, but not implemented.
 *
 * It inherits the pass-through `run`, so a graph naming it gets its input
 * back unchanged rather than an error. Named here so a config written
 * against it keeps loading.
 */
export class Heatmap extends AbstractOp {}
