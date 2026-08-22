import type { ColumnDirectory } from './column-directory.js';
import { DIMENSION, TIME } from './tags.js';

/** A column entry in a `structure.json` document. */
export interface StructureColumn {
  column: string;
  type?: 'string' | 'number' | 'date' | 'boolean';
  tags?: string[];
  label?: string;
  /** Consumed by `aggregate`: how this column rolls up. */
  aggregation?: Array<{
    target: string;
    type: 'sum' | 'avg' | 'last' | 'first' | 'min' | 'max' | 'median' | 'concat' | 'ratio';
    /** `ratio` only — sum these, then divide once. */
    numerator?: string;
    denominator?: string;
  }>;
}

export interface StructureDoc {
  type?: string;
  version?: string;
  name?: string;
  columns: StructureColumn[];
}

/**
 * Reference {@link ColumnDirectory} backed by a `structure.json` document.
 *
 * The Angular client wraps its own service; this exists so the package is
 * usable — and testable — on its own, with no host framework.
 */
export class StructureDirectory implements ColumnDirectory {
  readonly structure: StructureDoc;

  constructor(structure: StructureDoc) {
    if (!structure || !Array.isArray(structure.columns))
      throw new Error('StructureDirectory: structure.columns must be an array');
    this.structure = structure;
  }

  static fromJSON(text: string): StructureDirectory {
    return new StructureDirectory(JSON.parse(text));
  }

  getColumnsFor(tag: string): string[] {
    return this.structure.columns.filter((c) => (c.tags || []).includes(tag)).map((c) => c.column);
  }

  getDataStructureFor(tag: string): StructureDoc {
    return { ...this.structure, columns: this.structure.columns.filter((c) => (c.tags || []).includes(tag)) };
  }

  /** Full entry for one column code. */
  getColumn(code: string): StructureColumn | undefined {
    return this.structure.columns.find((c) => c.column === code);
  }

  /** Every tag in use, deduplicated — the raw material for an auto-built glossary. */
  getTags(): string[] {
    return [...new Set(this.structure.columns.flatMap((c) => c.tags || []))].sort();
  }

  /**
   * Dimension hierarchies in the shape `olap-cube-js` expects:
   * `{ dimensionHierarchies: [{ dimensionTable: { dimension, keyProps }, level: [] }] }`.
   *
   * One flat hierarchy per dimension column. Time dimensions are included; if a
   * structure declares no dimensions at all the cube is given an empty list
   * rather than a malformed one.
   */
  getDimensionHierarchies(): any {
    const dims = this.structure.columns.filter(
      (c) => (c.tags || []).includes(DIMENSION) || (c.tags || []).includes(TIME),
    );
    return {
      dimensionHierarchies: dims.map((c) => ({
        dimensionTable: { dimension: c.column, keyProps: [c.column] },
        level: [],
      })),
    };
  }
}
