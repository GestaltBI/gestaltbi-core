import { StructureDirectory } from '../dist/index.js';

/** Minimal OpContext for constructing an op directly in a test. */
export const ctx = (structure = { columns: [] }) => ({
  columnDirectory: new StructureDirectory(structure),
  fetcher: () => ({ subscribe: () => {} }),
  getFilter: () => ({}),
});

/** Ops receive `[upstreamRows, externalResources]`. */
export const frame = (rows) => [rows, {}];

export const months = (n, start = '2013-01-01') => {
  const out = [];
  const d = new Date(start);
  for (let i = 0; i < n; i++) {
    out.push({ month: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + i, 1)).toISOString().slice(0, 10) });
  }
  return out;
};

export const timeStructure = {
  columns: [{ column: 'month', type: 'date', tags: ['uatu:dimension', 'uatu:dimension:time'] }],
};
