import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Correlate, DIMENSION_TAGS, Pivot, StructureDirectory, dimensionColumns } from '../dist/index.js';
import { ctx, frame } from './helpers.mjs';

/**
 * The shape of a real config: the only axis is time, and it is tagged with the
 * refinement rather than the base tag. Reading `uatu:dimension` alone made this
 * dataset look like it had no dimensions at all.
 */
const timeOnly = {
  columns: [
    { column: 'month', type: 'date', tags: ['uatu:dimension:time'] },
    { column: 'revenue', type: 'number', tags: ['uatu:measure'] },
  ],
};

const mixed = {
  columns: [
    { column: 'month', type: 'date', tags: ['uatu:dimension', 'uatu:dimension:time'] },
    { column: 'city', type: 'string', tags: ['uatu:dimension:geo'] },
    { column: 'signup_month', type: 'string', tags: ['uatu:dimension:cohort'] },
    { column: 'segment', type: 'string', tags: ['uatu:dimension'] },
    { column: 'revenue', type: 'number', tags: ['uatu:measure'] },
  ],
};

test('the refinement tags are dimension tags', () => {
  assert.deepEqual(DIMENSION_TAGS, [
    'uatu:dimension',
    'uatu:dimension:time',
    'uatu:dimension:geo',
    'uatu:dimension:cohort',
  ]);
});

test('a column tagged only with a refinement still counts as a dimension', () => {
  assert.deepEqual(dimensionColumns(new StructureDirectory(timeOnly)), ['month']);
});

test('a column carrying base and refinement is listed once', () => {
  const cols = dimensionColumns(new StructureDirectory(mixed));
  assert.equal(cols.filter((c) => c === 'month').length, 1);
  assert.deepEqual([...cols].sort(), ['city', 'month', 'segment', 'signup_month']);
});

test('no directory at all is no dimensions, not a throw', () => {
  assert.deepEqual(dimensionColumns(undefined), []);
});

test('the cube gets a hierarchy for geo and cohort dimensions too', () => {
  const h = new StructureDirectory(mixed).getDimensionHierarchies();
  const dims = h.dimensionHierarchies.map((d) => d.dimensionTable.dimension).sort();
  assert.deepEqual(dims, ['city', 'month', 'segment', 'signup_month']);
});

test('pivot defaults its rows to a dataset whose only axis is time', () => {
  const rows = [
    { month: '2013-01-01', revenue: 10 },
    { month: '2013-01-01', revenue: 5 },
    { month: '2013-02-01', revenue: 20 },
  ];
  const out = new Pivot({ measure: 'revenue', type: 'sum' }, ctx(timeOnly)).run(frame(rows));
  assert.equal(out.length, 2, 'one row per month');
  assert.equal(out.find((r) => r.month === '2013-01-01').revenue, 15);
});

test('correlate scores a refinement-only dimension against a measure', () => {
  const rows = [
    { month: '2013-01-01', revenue: 10 },
    { month: '2013-01-01', revenue: 10 },
    { month: '2013-02-01', revenue: 20 },
    { month: '2013-02-01', revenue: 20 },
  ];
  const out = new Correlate({ include: ['dimension-measure'] }, ctx(timeOnly)).run(frame(rows));
  const pair = out.find((r) => r.a === 'month' && r.b === 'revenue');
  assert.ok(pair, 'the time dimension must be offered as a dimension');
  assert.ok(Math.abs(pair.coefficient - 1) < 1e-9);
});
