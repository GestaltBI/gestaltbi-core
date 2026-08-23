import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Processor, Enhance, Geojsonify, Deviation, StructureDirectory } from '../dist/index.js';
import { of } from 'rxjs';

const structure = {
  columns: [
    { column: 'month', type: 'date', tags: ['uatu:dimension', 'uatu:dimension:time'] },
    { column: 'revenue', type: 'number', tags: ['uatu:measure'] },
  ],
};

const directory = () => new StructureDirectory(structure);

const rows = () => [
  { id: 1, month: '2013-01-01', revenue: 10 },
  { id: 2, month: '2013-02-01', revenue: 20 },
];

const processes = {
  process: {
    passthrough: { op: 'clear' },
  },
};

const build = () =>
  new Processor({ columnDirectory: directory(), processes, fetcher: () => of(null) });

// ------------------------------------------------------- workOn re-emission ---

test('workOn feeds a stream that was opened before any data arrived', () => {
  const proc = build();

  // The host subscribes first — this is the normal order in a UI, where a view
  // is built from a route change and the data is still being fetched.
  const seen = [];
  proc.getProcessed('passthrough', 'early').subscribe((d) => seen.push(d));
  assert.equal(seen.length, 0, 'nothing to emit yet');

  proc.workOn({ data: rows() });

  assert.equal(seen.length, 1, 'workOn must reach a stream that is already open');
  assert.equal(seen[0].length, 2);
});

test('workOn re-emits into streams already carrying data', () => {
  const proc = build();
  proc.workOn({ data: rows() });

  const seen = [];
  proc.getProcessed('passthrough', 'reload').subscribe((d) => seen.push(d));
  assert.equal(seen.length, 1, 'seeded from the frame already held');

  // Re-importing a file has to reach the views that are already on screen.
  proc.workOn({ data: [...rows(), { id: 3, month: '2013-03-01', revenue: 30 }] });

  assert.equal(seen.length, 2);
  assert.equal(seen[1].length, 3);
});

test('a structure with no usable hierarchy fails the cube, not the pipeline', () => {
  const broken = { getColumnsFor: () => [], getDataStructureFor: () => ({ columns: [] }),
    getDimensionHierarchies: () => { throw new Error('no hierarchy'); } };
  const proc = new Processor({ columnDirectory: broken, processes, fetcher: () => of(null) });

  const seen = [];
  proc.getProcessed('passthrough', 'nocube').subscribe((d) => seen.push(d));
  proc.workOn({ data: rows() });

  assert.equal(seen.length, 1, 'ops that never touch the cube still run');
  assert.throws(() => proc.liveCube(), /no hierarchy|no OLAP cube/);
});

// ------------------------------------------------------- detached op context ---

test('an op built without a context runs instead of throwing', () => {
  // Deviation/GeoDeviation take an optional context and hand it to the ops they
  // build; a host that has none to give must still get a working op.
  const data = rows();
  const enhance = new Enhance({
    columns: [{ column: 'doubled', calculate: 'expr', expr: ['*', 'revenue', 2] }],
  });
  const out = enhance.run([data, {}]);
  assert.deepEqual(out.map((r) => r.doubled), [20, 40]);
});

test('a context-less op reading the directory degrades to "no columns"', () => {
  // cumsum resolves its ordering column through the directory; with none, it
  // must fall back rather than dereference undefined.
  const data = rows();
  const enhance = new Enhance({
    columns: [{ column: 'cum', calculate: 'func', func: 'cumsum', on: ['revenue'] }],
  });
  assert.doesNotThrow(() => enhance.run([data, {}]));
  assert.equal(data[data.length - 1].cum, 30);
});

test('Deviation composes without a context', () => {
  const seen = [];
  new Deviation(
    of([{ 'smartbi:product_code': 'A', revenue: 10 }]),
    of([{ 'smartbi:product_code': 'A', revenue: 4 }]),
    ['left', 'right'],
    [{ column: 'delta', calculate: 'expr', expr: ['-', 'left:revenue', 'right:revenue'] }],
  )
    .getStream()
    .subscribe((d) => seen.push(d));

  assert.equal(seen.length, 1);
  assert.equal(seen[0][0].delta, 6);
});

test('Geojsonify ranges work on a context-less instance', () => {
  const collection = {
    features: [{ properties: { revenue: 5 } }, { properties: { revenue: 11 } }],
  };
  new Geojsonify({}).extractGeoJsonRange(collection);
  assert.deepEqual(collection.properties.revenue, { min: 5, max: 11 });
});
