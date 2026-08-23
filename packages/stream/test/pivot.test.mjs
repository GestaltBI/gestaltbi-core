import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pivot } from '../dist/index.js';
import { ctx, frame } from './helpers.mjs';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !== ${b}`);

const structure = {
  columns: [
    { column: 'product', type: 'string', tags: ['uatu:dimension'] },
    { column: 'region', type: 'string', tags: ['uatu:dimension'] },
    { column: 'revenue', type: 'number', tags: ['uatu:measure'] },
  ],
};

const sales = () => [
  { product: 'A', region: 'N', revenue: 10, units: 1 },
  { product: 'A', region: 'S', revenue: 20, units: 2 },
  { product: 'B', region: 'N', revenue: 30, units: 3 },
  { product: 'A', region: 'N', revenue: 5, units: 4 },
];

const by = (out, key, value) => out.find((r) => r[key] === value);

test('pivot: cross-tabulates a measure over two dimensions', () => {
  const p = new Pivot({ rows: ['product'], columns: ['region'], measure: 'revenue' }, ctx(structure));
  const out = p.run(frame(sales()));

  assert.equal(out.length, 2);
  assert.deepEqual(p.getColumns(), ['N', 'S']);
  assert.equal(by(out, 'product', 'A').N, 15);
  assert.equal(by(out, 'product', 'A').S, 20);
  assert.equal(by(out, 'product', 'B').N, 30);
});

test('pivot: a combination with no rows is null, not zero', () => {
  const out = new Pivot({ rows: ['product'], columns: ['region'], measure: 'revenue' }, ctx(structure)).run(
    frame(sales()),
  );
  // B never sold in the South. That is an absence, not a zero.
  assert.equal(by(out, 'product', 'B').S, null);
});

test('pivot: totals close both ways', () => {
  const out = new Pivot(
    { rows: ['product'], columns: ['region'], measure: 'revenue', totals: true },
    ctx(structure),
  ).run(frame(sales()));

  assert.equal(by(out, 'product', 'A').Total, 35);
  assert.equal(by(out, 'product', 'B').Total, 30);
  const grand = by(out, 'product', 'Total');
  assert.equal(grand.N, 45);
  assert.equal(grand.S, 20);
  assert.equal(grand.Total, 65);
});

test('pivot: the total of averages is not the average of averages', () => {
  const out = new Pivot(
    { rows: ['product'], columns: ['region'], measure: 'revenue', type: 'avg', totals: true },
    ctx(structure),
  ).run(frame(sales()));

  near(by(out, 'product', 'A').N, 7.5); // (10 + 5) / 2
  near(by(out, 'product', 'B').N, 30);
  // Averaging the two cells would give 18.75. The column holds three values.
  near(by(out, 'product', 'Total').N, 15);
});

test('pivot: counts without a measure', () => {
  const out = new Pivot({ rows: ['product'], columns: ['region'], type: 'count' }, ctx(structure)).run(
    frame(sales()),
  );
  assert.equal(by(out, 'product', 'A').N, 2);
  assert.equal(by(out, 'product', 'A').S, 1);
  assert.equal(by(out, 'product', 'B').N, 1);
});

test('pivot: ratio cells divide once, they do not average rates', () => {
  const rows = [
    { product: 'A', region: 'N', win: 1, tries: 10 },
    { product: 'A', region: 'N', win: 8, tries: 10 },
  ];
  const out = new Pivot(
    { rows: ['product'], columns: ['region'], type: 'ratio', numerator: 'win', denominator: 'tries' },
    ctx(structure),
  ).run(frame(rows));
  // 9/20, not the mean of 0.1 and 0.8.
  near(out[0].N, 0.45);
});

test('pivot: caps the column axis and says what it folded away', () => {
  const rows = [
    { product: 'A', region: 'N', revenue: 1 },
    { product: 'A', region: 'N', revenue: 1 },
    { product: 'A', region: 'S', revenue: 2 },
    { product: 'A', region: 'S', revenue: 2 },
    { product: 'A', region: 'E', revenue: 4 },
  ];
  const p = new Pivot({ rows: ['product'], columns: ['region'], measure: 'revenue', columnLimit: 2 }, ctx(structure));
  const out = p.run(frame(rows));

  assert.equal(p.getOmitted(), 1);
  assert.deepEqual(p.getColumns(), ['N', 'S', 'Other']);
  assert.equal(out[0].Other, 4, 'the tail is folded in, not dropped');
  assert.equal(out[0].N + out[0].S + out[0].Other, 10);
});

test('pivot: rows default to the dimensions the structure declares', () => {
  const p = new Pivot({ columns: ['region'], measure: 'revenue' }, ctx(structure));
  const out = p.run(frame(sales()));
  // `product` is the only dimension left once `region` is spent on the columns.
  assert.deepEqual(Object.keys(out[0])[0], 'product');
  assert.equal(out.length, 2);
});

test('pivot: an empty dimension value gets a label rather than vanishing', () => {
  const rows = [
    { product: 'A', region: '', revenue: 7 },
    { product: 'A', region: 'N', revenue: 3 },
  ];
  const p = new Pivot({ rows: ['product'], columns: ['region'], measure: 'revenue' }, ctx(structure));
  const out = p.run(frame(rows));
  assert.ok(p.getColumns().includes('(blank)'));
  assert.equal(out[0]['(blank)'], 7);
});

test('pivot: with no column axis it is a plain group-by', () => {
  const out = new Pivot({ rows: ['product'], measure: 'revenue' }, ctx(structure)).run(frame(sales()));
  assert.equal(by(out, 'product', 'A').revenue, 35);
  assert.equal(by(out, 'product', 'B').revenue, 30);
});

test('pivot: an empty frame yields no rows rather than throwing', () => {
  const out = new Pivot({ rows: ['product'], columns: ['region'], measure: 'revenue' }, ctx(structure)).run(
    frame([]),
  );
  assert.deepEqual(out, []);
});

test('pivot: blank cells do not poison a sum', () => {
  const rows = [
    { product: 'A', region: 'N', revenue: 10 },
    { product: 'A', region: 'N', revenue: '' },
  ];
  const out = new Pivot({ rows: ['product'], columns: ['region'], measure: 'revenue' }, ctx(structure)).run(
    frame(rows),
  );
  assert.equal(out[0].N, 10);
});
