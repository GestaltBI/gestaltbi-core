import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Recognize, DiffCalc, Cohort, Aggregate, Enhance, Assert } from '../dist/index.js';
import { ctx, frame, timeStructure } from './helpers.mjs';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !== ${b}`);
const m = (n) => Array.from({ length: n }, (_, i) => ({ month: `2013-${String(i + 1).padStart(2, '0')}-01` }));

// --------------------------------------------------------------- recognize ---
test('recognize: spreads an amount straight-line across its term', () => {
  const rows = m(6).map((r, i) => ({ ...r, cash: i === 0 ? 1200 : 0 }));
  new Recognize({ amount: 'cash', date: 'month', term: 12, into: 'rec' }, ctx(timeStructure)).run(frame(rows));
  rows.forEach((r) => near(r.rec, 100));
});

test('recognize: term of 1 is the identity — cash equals accrual', () => {
  const rows = m(4).map((r, i) => ({ ...r, cash: (i + 1) * 10 }));
  new Recognize({ amount: 'cash', date: 'month', term: 1, into: 'rec' }, ctx(timeStructure)).run(frame(rows));
  rows.forEach((r) => near(r.rec, r.cash));
});

test('recognize: overlapping cohorts accumulate', () => {
  const rows = m(3).map((r) => ({ ...r, cash: 300 }));
  new Recognize({ amount: 'cash', date: 'month', term: 3, into: 'rec' }, ctx(timeStructure)).run(frame(rows));
  near(rows[0].rec, 100);
  near(rows[1].rec, 200);
  near(rows[2].rec, 300);
});

test('recognize: deferred balance is cumulative cash minus cumulative recognized', () => {
  const rows = m(5).map((r, i) => ({ ...r, cash: 120 * (i + 1) }));
  new Recognize({ amount: 'cash', date: 'month', term: 12, into: 'rec', deferredInto: 'deferred' }, ctx(timeStructure)).run(frame(rows));
  let cash = 0, rec = 0;
  rows.forEach((r) => { cash += r.cash; rec += r.rec; near(r.deferred, cash - rec); });
});

test('recognize: amount scheduled past the frame is reported as spill, not dropped silently', () => {
  const rows = m(3).map((r, i) => ({ ...r, cash: i === 0 ? 1200 : 0 }));
  const op = new Recognize({ amount: 'cash', date: 'month', term: 12, into: 'rec' }, ctx(timeStructure));
  op.run(frame(rows));
  near(op.getSpill(), 900);
});

test('recognize: works on rows supplied out of date order', () => {
  const rows = [
    { month: '2013-03-01', cash: 0 },
    { month: '2013-01-01', cash: 300 },
    { month: '2013-02-01', cash: 0 },
  ];
  new Recognize({ amount: 'cash', date: 'month', term: 3, into: 'rec' }, ctx(timeStructure)).run(frame(rows));
  rows.forEach((r) => near(r.rec, 100));
});

test('recognize: rejects an unknown method rather than guessing', () => {
  assert.throws(
    () => new Recognize({ amount: 'c', date: 'month', method: 'sum-of-digits' }, ctx(timeStructure)).run(frame(m(1))),
    /unsupported method/,
  );
});

// ---------------------------------------------------------------- diffcalc ---
test('diffcalc: first period is null, not zero', () => {
  const rows = m(3).map((r, i) => ({ ...r, v: [10, 15, 12][i] }));
  new DiffCalc({ date: 'month', measures: [{ column: 'v', kind: 'flow' }] }, ctx(timeStructure)).run(frame(rows));
  assert.equal(rows[0].v_delta, null);
  assert.equal(rows[1].v_delta, 5);
  near(rows[1].v_pct, 0.5);
  assert.equal(rows[2].v_delta, -3);
});

test('diffcalc: a stock first difference is the flow that produced it', () => {
  const rows = m(3).map((r, i) => ({ ...r, tib: [10, 27, 64][i] }));
  new DiffCalc({ date: 'month', measures: [{ column: 'tib', kind: 'stock', flowInto: 'tib_added' }] }, ctx(timeStructure)).run(frame(rows));
  assert.equal(rows[1].tib_added, 17);
  assert.equal(rows[2].tib_added, 37);
});

test('diffcalc: lag supports year-over-year', () => {
  const rows = m(14).map((r, i) => ({ ...r, v: i }));
  new DiffCalc({ date: 'month', measures: [{ column: 'v', lag: 12, suffix: '_yoy' }] }, ctx(timeStructure)).run(frame(rows));
  assert.equal(rows[11].v_delta_yoy, null);
  assert.equal(rows[12].v_delta_yoy, 12);
});

test('diffcalc: picks up stock and flow columns from tags when none are configured', () => {
  const structure = {
    columns: [
      { column: 'month', tags: ['uatu:dimension', 'uatu:dimension:time'] },
      { column: 'level', tags: ['uatu:measure', 'uatu:measure:stock'] },
    ],
  };
  const rows = m(2).map((r, i) => ({ ...r, level: i * 5 }));
  new DiffCalc({ date: 'month' }, ctx(structure)).run(frame(rows));
  assert.equal(rows[1].level_delta, 5);
});

test('diffcalc: division by a zero baseline yields null, not Infinity', () => {
  const rows = m(2).map((r, i) => ({ ...r, v: i === 0 ? 0 : 4 }));
  new DiffCalc({ date: 'month', measures: [{ column: 'v' }] }, ctx(timeStructure)).run(frame(rows));
  assert.equal(rows[1].v_pct, null);
});

// ------------------------------------------------------------------ cohort ---
test('cohort: buckets by first appearance and counts periods since', () => {
  const rows = [
    { user: 'a', d: '2013-01-15' },
    { user: 'a', d: '2013-03-02' },
    { user: 'b', d: '2013-02-20' },
  ];
  new Cohort({ subject: 'user', date: 'd', period: 'month' }, ctx()).run(frame(rows));
  assert.equal(rows[0].cohort, '2013-01');
  assert.equal(rows[0].periods_since, 0);
  assert.equal(rows[1].cohort, '2013-01');
  assert.equal(rows[1].periods_since, 2);
  assert.equal(rows[2].cohort, '2013-02');
  assert.equal(rows[2].periods_since, 0);
});

test('cohort: window guard nulls measures for cohorts that are not fully observed', () => {
  const rows = [
    { user: 'a', d: '2013-09-05', retained: 0.37 },
    { user: 'b', d: '2013-10-20', retained: 1.0 },
  ];
  new Cohort(
    { subject: 'user', date: 'd', period: 'month', window: { days: 30, asOf: '2013-11-06', mask: ['retained'] } },
    ctx(),
  ).run(frame(rows));
  assert.equal(rows[0].retained, 0.37);
  assert.equal(rows[0].cohort_incomplete, false);
  assert.equal(rows[1].retained, null);
  assert.equal(rows[1].cohort_incomplete, true);
});

// --------------------------------------------------------------- aggregate ---
test('aggregate: a ratio is the rate of the union, not the mean of the rates', () => {
  const structure = {
    columns: [{
      column: 'rate', tags: ['uatu:aggregable'],
      aggregation: [{ target: 'rate', type: 'ratio', numerator: 'subs', denominator: 'users' }],
    }],
  };
  const rows = [
    { g: 'x', subs: 1, users: 10 },   // 10%
    { g: 'x', subs: 90, users: 100 }, // 90%
  ];
  const [out] = new Aggregate({ groupby: ['g'] }, ctx(structure)).run(frame(rows));
  near(out.rate, 91 / 110);                       // the true rate: 82.7%
  assert.ok(Math.abs(out.rate - 0.5) > 0.3);      // not the 50% an average would give
});

test('aggregate: ratio with a zero denominator yields null rather than Infinity', () => {
  const structure = {
    columns: [{ column: 'rate', tags: ['uatu:aggregable'], aggregation: [{ target: 'rate', type: 'ratio', numerator: 'n', denominator: 'd' }] }],
  };
  const [out] = new Aggregate({ groupby: ['g'] }, ctx(structure)).run(frame([{ g: 'x', n: 5, d: 0 }]));
  assert.equal(out.rate, null);
});

test('aggregate: median sorts before taking the middle value', () => {
  const structure = {
    columns: [{ column: 'v', tags: ['uatu:aggregable'], aggregation: [{ target: 'v', type: 'median' }] }],
  };
  const rows = [9, 1, 5].map((v) => ({ g: 'x', v }));
  const [out] = new Aggregate({ groupby: ['g'] }, ctx(structure)).run(frame(rows));
  assert.equal(out.v, 5);
});

// ----------------------------------------------------------------- enhance ---
test('enhance: nullSafe stops a missing cost reading as a healthy margin', () => {
  const rows = [{ rev: 642, cost: null }];
  new Enhance({ nullSafe: true, columns: [{ column: 'margin', expr: ['-', 'rev', 'cost'] }] }, ctx()).run(frame(rows));
  assert.equal(rows[0].margin, null);
});

test('enhance: default behaviour is unchanged — a missing operand is still the identity', () => {
  const rows = [{ rev: 642, cost: null }];
  new Enhance({ columns: [{ column: 'margin', expr: ['-', 'rev', 'cost'] }] }, ctx()).run(frame(rows));
  assert.equal(rows[0].margin, 642);
});

test('enhance: cumsum accumulates in date order, not input order', () => {
  const rows = [
    { month: '2013-03-01', v: 3 },
    { month: '2013-01-01', v: 1 },
    { month: '2013-02-01', v: 2 },
  ];
  new Enhance(
    { columns: [{ calculate: 'func', func: 'cumsum', column: 'running', on: ['v', 'month'] }] },
    ctx(timeStructure),
  ).run(frame(rows));
  const byMonth = Object.fromEntries(rows.map((r) => [r.month, r.running]));
  assert.equal(byMonth['2013-01-01'], 1);
  assert.equal(byMonth['2013-02-01'], 3);
  assert.equal(byMonth['2013-03-01'], 6);
});

// ------------------------------------------------------------------ assert ---
test('assert: returns verdicts by default and rows under passthrough', () => {
  const rows = m(3).map((r, i) => ({ ...r, v: i }));
  const checks = [{ id: 'up', type: 'monotonic', measure: 'v', orderBy: 'month' }];
  const verdicts = new Assert({ checks }, ctx(timeStructure)).run(frame(rows));
  assert.equal(verdicts[0].status, 'pass');

  const op = new Assert({ checks, passthrough: true }, ctx(timeStructure));
  assert.equal(op.run(frame(rows)), rows);
  assert.equal(op.getVerdicts()[0].status, 'pass');
});

test('assert: no checks configured is a no-op, not a crash', () => {
  assert.deepEqual(new Assert({}, ctx()).run(frame([{ a: 1 }])), []);
});

// ----------------------------------------------- sample-config compatibility ---
// Config repos authored for gestaltbi-core rename the date column to the
// canonical code `uatu:date` via mapping.json and tag it `uatu:timedimension`.
// Ops must work against that vocabulary as well as the one gestalt-infer emits.
const legacyStructure = {
  columns: [
    { column: 'uatu:date', type: 'date', tags: ['sbi:i:mappable', 'uatu:date', 'gcx:date', 'uatu:timedimension'] },
    { column: 'v', type: 'number', tags: ['uatu:measure'] },
  ],
};
const legacyRows = () => [
  { 'uatu:date': '2013-03-01', v: 3 },
  { 'uatu:date': '2013-01-01', v: 1 },
  { 'uatu:date': '2013-02-01', v: 2 },
];

test('enhance cumsum still orders by the canonical uatu:date column', () => {
  const rows = legacyRows();
  new Enhance(
    { columns: [{ calculate: 'func', func: 'cumsum', column: 'running', on: ['v'] }] },
    ctx(legacyStructure),
  ).run(frame(rows));
  const got = Object.fromEntries(rows.map((r) => [r['uatu:date'], r.running]));
  assert.deepEqual(got, { '2013-01-01': 1, '2013-02-01': 3, '2013-03-01': 6 });
});

test('enhance cumsum orders by uatu:date even with no structure loaded', () => {
  const rows = legacyRows();
  new Enhance(
    { columns: [{ calculate: 'func', func: 'cumsum', column: 'running', on: ['v'] }] },
    ctx(),
  ).run(frame(rows));
  const got = Object.fromEntries(rows.map((r) => [r['uatu:date'], r.running]));
  assert.deepEqual(got, { '2013-01-01': 1, '2013-02-01': 3, '2013-03-01': 6 });
});

test('diffcalc resolves the time column from the legacy tag vocabulary', () => {
  const rows = legacyRows();
  new DiffCalc({ measures: [{ column: 'v' }] }, ctx(legacyStructure)).run(frame(rows));
  const got = Object.fromEntries(rows.map((r) => [r['uatu:date'], r.v_delta]));
  assert.equal(got['2013-01-01'], null);
  assert.equal(got['2013-02-01'], 1);
  assert.equal(got['2013-03-01'], 1);
});

test('recognize resolves the time column from the legacy tag vocabulary', () => {
  const rows = legacyRows().map((r) => ({ ...r, cash: 300 }));
  new Recognize({ amount: 'cash', term: 3, into: 'rec' }, ctx(legacyStructure)).run(frame(rows));
  const got = Object.fromEntries(rows.map((r) => [r['uatu:date'], Math.round(r.rec)]));
  assert.deepEqual(got, { '2013-01-01': 100, '2013-02-01': 200, '2013-03-01': 300 });
});

test('enhance cumsum honours options.cumulateOn, the key sample-config ships', () => {
  const rows = [
    { when: '2013-03-01', v: 3 },
    { when: '2013-01-01', v: 1 },
    { when: '2013-02-01', v: 2 },
  ];
  new Enhance(
    { cumulateOn: ['when'], columns: [{ calculate: 'func', func: 'cumsum', column: 'running', on: ['v'] }] },
    ctx(),
  ).run(frame(rows));
  const got = Object.fromEntries(rows.map((r) => [r.when, r.running]));
  assert.deepEqual(got, { '2013-01-01': 1, '2013-02-01': 3, '2013-03-01': 6 });
});

test('enhance nullSafe treats NaN as missing, as format produces for empty cells', () => {
  const rows = [{ rev: 642, cost: NaN }];
  new Enhance({ nullSafe: true, columns: [{ column: 'margin', expr: ['-', 'rev', 'cost'] }] }, ctx()).run(frame(rows));
  assert.equal(rows[0].margin, null);
});

test('aggregate keeps the type of the columns it grouped by', () => {
  // The group key is a joined string; writing it back turned a Date into its
  // toString, and every later check that ordered by that column silently
  // compared "Fri…" against "Mon…" instead of comparing dates.
  const rows = [
    { month: new Date('2013-02-01'), amount: 1 },
    { month: new Date('2013-01-01'), amount: 2 },
    { month: new Date('2013-01-01'), amount: 3 },
  ];
  const structure = {
    columns: [
      { column: 'month', type: 'date', tags: ['uatu:dimension', 'uatu:dimension:time'] },
      {
        column: 'amount', type: 'number', tags: ['uatu:measure', 'uatu:aggregable'],
        aggregation: [{ target: 'amount:sum', type: 'sum' }],
      },
    ],
  };
  const out = new Aggregate({ groupby: ['month'] }, ctx(structure)).run(frame(rows));
  assert.equal(out.length, 2);
  assert.ok(out.every((r) => r.month instanceof Date), 'the group key must stay a Date');
  const jan = out.find((r) => r.month.getUTCMonth() === 0);
  assert.equal(jan['amount:sum'], 5);
});
