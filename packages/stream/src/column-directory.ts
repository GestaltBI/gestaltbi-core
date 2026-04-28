/**
 * Column metadata directory consumed by ops that need to look up which
 * raw columns are tagged a certain way (e.g. all date columns, all
 * geocodable address columns).
 *
 * Implement this with whatever backing store fits (a JSON document, a
 * dbt manifest, a config file). The Angular adapter wraps a service
 * that loads it from `assets/structure.json`.
 */
export interface ColumnDirectory {
  /** Returns column codes that carry the given tag. */
  getColumnsFor(tag: string): string[];

  /** Returns the structure document filtered to only columns carrying the tag. */
  getDataStructureFor(tag: string): any;

  /** Returns OLAP cube dimension hierarchies derived from tagged columns. */
  getDimensionHierarchies(): any;
}
