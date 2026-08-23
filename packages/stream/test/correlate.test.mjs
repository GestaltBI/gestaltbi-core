import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Correlate } from '../dist/index.js';
import { ctx, frame } from './helpers.mjs';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} !== ${b}`);

const structure = {
  columns: [
    { column: 'segment', type: 'string', tags: ['uatu:dimension'] },
    { column: 'channel', type: 'string', tags: ['uatu:dimension'] },
    { column: 'revenue', type: 'number', tags: ['uatu:measure'] },
    { column: 'cost', type: 'number', tags: ['uatu:measure'] },
  ],
};

const pick = (out, a, b) => out.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a));

// ------------------------------------------------------- measure x measure ---

test('correlate: a perfect straight line is r = 1, and its mirror is -1', () => {
  const up = [
    { revenue: 1, cost: 2 },
    { revenue: 2, cost: 4 },
    { revenue: 3, cost: 6 },
  ];
  const out = new Correlate({ include: ['measure-measure'] }, ctx(structure)).run(frame(up));
  near(pick(out, 'revenue', 'cost').coefficient, 1);
  assert.equal(pick(out, 'revenue', 'cost').strength, 'strong');

  const down = up.map((r) => ({ revenue: r.revenue, cost: -r.cost }));
  const rev = new Correlate({ include: ['measure-measure'] }, ctx(structure)).run(frame(down));
  near(pick(rev, 'revenue', 'cost').coefficient, -1);
});

test('correlate: spearman catches a monotonic curve that pearson understates', () => {
  const rows = [
    { revenue: 1, cost: 1 },
    { revenue: 2, cost: 4 },
    { revenue: 3, cost: 9 },
    { revenue: 4, cost: 16 },
  ];
  const p = new Correlate({ include: ['measure-measure'] }, ctx(structure)).run(frame(rows));
  const s = new Correlate({ include: ['measure-measure'], method: 'spearman' }, ctx(structure)).run(frame(rows));

  near(pick(s, 'revenue', 'cost').coefficient, 1, 1e-12);
  assert.ok(pick(p, 'revenue', 'cost').coefficient < 1);
  assert.ok(pick(p, 'revenue', 'cost').coefficient > 0.98);
});

test('correlate: a column that never varies is skipped, not scored', () => {
  const rows = [
    { revenue: 5, cost: 1 },
    { revenue: 5, cost: 2 },
    { revenue: 5, cost: 3 },
  ];
  const out = new Correlate({ include: ['measure-measure'] }, ctx(structure)).run(frame(rows));
  const r = pick(out, 'revenue', 'cost');
  assert.equal(r.coefficient, null);
  assert.match(r.reason, /never varies/);
});

test('correlate: too few complete rows is a skip, not a coincidence', () => {
  const rows = [
    { revenue: 1, cost: 2 },
    { revenue: 2, cost: null },
    { revenue: 3, cost: '' },
  ];
  const out = new Correlate({ include: ['measure-measure'], minPairs: 3 }, ctx(structure)).run(frame(rows));
  assert.equal(pick(out, 'revenue', 'cost').coefficient, null);
});

// ----------------------------------------------------- dimension x measure ---

test('correlate: a dimension that fully separates a measure has eta = 1', () => {
  const rows = [
    { segment: 'SMB', revenue: 10 },
    { segment: 'SMB', revenue: 10 },
    { segment: 'ENT', revenue: 20 },
    { segment: 'ENT', revenue: 20 },
  ];
  const out = new Correlate({ include: ['dimension-measure'] }, ctx(structure)).run(frame(rows));
  const r = pick(out, 'segment', 'revenue');
  near(r.coefficient, 1);
  assert.equal(r.method, 'eta');
  assert.match(r.summary, /100% of the variance/);
});

test('correlate: a dimension that explains nothing has eta = 0', () => {
  const rows = [
    { segment: 'SMB', revenue: 10 },
    { segment: 'SMB', revenue: 20 },
    { segment: 'ENT', revenue: 10 },
    { segment: 'ENT', revenue: 20 },
  ];
  const out = new Correlate({ include: ['dimension-measure'] }, ctx(structure)).run(frame(rows));
  near(pick(out, 'segment', 'revenue').coefficient, 0);
});

// --------------------------------------------------- dimension x dimension ---

test("correlate: two dimensions that determine each other give Cramer's V = 1", () => {
  const rows = [
    { segment: 'SMB', channel: 'web' },
    { segment: 'SMB', channel: 'web' },
    { segment: 'ENT', channel: 'field' },
    { segment: 'ENT', channel: 'field' },
  ];
  const out = new Correlate({ include: ['dimension-dimension'] }, ctx(structure)).run(frame(rows));
  const r = pick(out, 'segment', 'channel');
  near(r.coefficient, 1);
  assert.equal(r.method, 'cramersV');
});

test('correlate: independent dimensions give V = 0', () => {
  const rows = [
    { segment: 'SMB', channel: 'web' },
    { segment: 'SMB', channel: 'field' },
    { segment: 'ENT', channel: 'web' },
    { segment: 'ENT', channel: 'field' },
  ];
  const out = new Correlate({ include: ['dimension-dimension'] }, ctx(structure)).run(frame(rows));
  near(pick(out, 'segment', 'channel').coefficient, 0);
});

test('correlate: a dimension with too many levels is skipped', () => {
  const rows = Array.from({ length: 20 }, (_, i) => ({ segment: `s${i}`, channel: i % 2 ? 'web' : 'field' }));
  const out = new Correlate({ include: ['dimension-dimension'], maxLevels: 5 }, ctx(structure)).run(frame(rows));
  const r = pick(out, 'segment', 'channel');
  assert.equal(r.coefficient, null);
  assert.match(r.reason, /over the cap/);
});

// ------------------------------------------------------------------ shaping ---

test('correlate: results come back strongest first', () => {
  const rows = [
    { segment: 'a', channel: 'x', revenue: 1, cost: 1 },
    { segment: 'a', channel: 'y', revenue: 2, cost: 5 },
    { segment: 'b', channel: 'x', revenue: 3, cost: 2 },
    { segment: 'b', channel: 'y', revenue: 4, cost: 9 },
  ];
  const out = new Correlate({}, ctx(structure)).run(frame(rows));
  const scored = out.filter((r) => r.coefficient !== null).map((r) => Math.abs(r.coefficient));
  assert.deepEqual(scored, [...scored].sort((x, y) => y - x));
});

test('correlate: honours an explicit pair list, a floor and a limit', () => {
  const rows = [
    { segment: 'a', channel: 'x', revenue: 1, cost: 1 },
    { segment: 'a', channel: 'y', revenue: 2, cost: 2 },
    { segment: 'b', channel: 'x', revenue: 3, cost: 3 },
  ];
  const pairs = new Correlate({ pairs: [['revenue', 'cost']] }, ctx(structure)).run(frame(rows));
  assert.equal(pairs.length, 1);
  near(pairs[0].coefficient, 1);

  const floored = new Correlate({ minCoefficient: 0.99 }, ctx(structure)).run(frame(rows));
  assert.ok(floored.every((r) => r.coefficient === null || Math.abs(r.coefficient) >= 0.99));

  const limited = new Correlate({ limit: 1 }, ctx(structure)).run(frame(rows));
  assert.equal(limited.length, 1);
});

test('correlate: an empty frame yields nothing rather than throwing', () => {
  assert.deepEqual(new Correlate({}, ctx(structure)).run(frame([])), []);
});
