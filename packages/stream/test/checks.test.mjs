import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCheck, runChecks, allPassed, StructureDirectory } from '../dist/index.js';

const rows = (vals, key = 'v') => vals.map((v, i) => ({ month: `2013-${String(i + 1).padStart(2, '0')}-01`, [key]: v }));
const opts = { orderBy: 'month' };

test('monotonic: passes on a non-decreasing series', () => {
  const v = runCheck({ id: 'm', type: 'monotonic', measure: 'v' }, rows([1, 1, 2, 5]), opts);
  assert.equal(v.status, 'pass');
  assert.equal(v.n, 3);
});

test('monotonic: strict rejects a flat step', () => {
  const v = runCheck({ id: 'm', type: 'monotonic', measure: 'v', strict: true }, rows([1, 1, 2]), opts);
  assert.equal(v.status, 'fail');
  assert.equal(v.offenders.length, 1);
});

test('monotonic: names the period that broke the order', () => {
  const v = runCheck({ id: 'm', type: 'monotonic', measure: 'v' }, rows([5, 4, 6]), opts);
  assert.equal(v.status, 'fail');
  assert.equal(v.offenders[0].at, '2013-02-01');
  assert.equal(v.offenders[0].delta, -1);
});

test('monotonic: evaluates in date order, not input order', () => {
  const shuffled = [
    { month: '2013-03-01', v: 3 },
    { month: '2013-01-01', v: 1 },
    { month: '2013-02-01', v: 2 },
  ];
  assert.equal(runCheck({ id: 'm', type: 'monotonic', measure: 'v' }, shuffled, opts).status, 'pass');
});

test('sign: counts periods and reports the shortfall', () => {
  const v = runCheck({ id: 's', type: 'sign', measure: 'v', expect: '>0' }, rows([1, -2, 3]), opts);
  assert.equal(v.status, 'fail');
  assert.equal(v.hits, 2);
  assert.equal(v.n, 3);
});

test('sign: atLeast relaxes the requirement', () => {
  const v = runCheck({ id: 's', type: 'sign', measure: 'v', expect: '>0', atLeast: 2 }, rows([1, -2, 3]), opts);
  assert.equal(v.status, 'pass');
});

test('sign: nulls are excluded, not counted as failures', () => {
  const v = runCheck({ id: 's', type: 'sign', measure: 'v', expect: '>0' }, rows([1, null, 3]), opts);
  assert.equal(v.status, 'pass');
  assert.equal(v.n, 2);
});

test('covers: flags periods where the measure falls short', () => {
  const data = [
    { month: '2013-01-01', rev: 10, cost: 5 },
    { month: '2013-02-01', rev: 4, cost: 9 },
  ];
  const v = runCheck({ id: 'c', type: 'covers', measure: 'rev', by: 'cost' }, data, opts);
  assert.equal(v.status, 'fail');
  assert.equal(v.offenders[0].shortfall, -5);
});

test('covers: refuses to compare measures with different units', () => {
  const structure = {
    columns: [
      { column: 'rev', tags: ['uatu:measure', 'uatu:measure:unit:usd'] },
      { column: 'storage', tags: ['uatu:measure', 'uatu:measure:unit:tib'] },
    ],
  };
  const v = runCheck(
    { id: 'c', type: 'covers', measure: 'rev', by: 'storage' },
    [{ month: '2013-01-01', rev: 10, storage: 5 }],
    { orderBy: 'month', columnDirectory: new StructureDirectory(structure) },
  );
  assert.equal(v.status, 'skip');
  assert.match(v.reason, /unit mismatch/);
});

test('divergence: warn and fail bands', () => {
  const data = [
    { month: '2013-01-01', a: 100, b: 100 },
    { month: '2013-02-01', a: 100, b: 80 },
  ];
  assert.equal(runCheck({ id: 'd', type: 'divergence', a: 'a', b: 'b', warn: 0.1, fail: 0.5 }, data, opts).status, 'warn');
  assert.equal(runCheck({ id: 'd', type: 'divergence', a: 'a', b: 'b', warn: 0.05, fail: 0.1 }, data, opts).status, 'fail');
  assert.equal(runCheck({ id: 'd', type: 'divergence', a: 'a', b: 'b', warn: 0.9 }, data, opts).status, 'pass');
});

test('divergence: opposite signs read as a large gap', () => {
  const data = [{ month: '2013-01-01', a: 10629, b: -4648 }];
  const v = runCheck({ id: 'd', type: 'divergence', a: 'a', b: 'b', warn: 0.15 }, data, opts);
  assert.ok(v.observed > 1.4);
});

test('window_complete: a point cohort only needs the window from its own date', () => {
  const data = [{ month: '2013-10-01', r: 0.9 }];
  const v = runCheck(
    { id: 'w', type: 'window_complete', measure: 'r', cohortDate: 'month', windowDays: 30, asOf: '2013-11-06' },
    data, opts,
  );
  assert.equal(v.status, 'pass');
});

test('window_complete: a monthly cohort is measured from the end of the month', () => {
  const data = [
    { month: '2013-09-01', r: 0.37 },
    { month: '2013-10-01', r: 0.89 },
  ];
  const v = runCheck(
    { id: 'w', type: 'window_complete', measure: 'r', cohortDate: 'month', span: 'month', windowDays: 30, asOf: '2013-11-06' },
    data, opts,
  );
  assert.equal(v.status, 'fail');
  assert.equal(v.offenders.length, 1);
  assert.equal(v.offenders[0].at, '2013-10-01');
});

test('ratio_bounds: reports values that leave the band', () => {
  const v = runCheck({ id: 'r', type: 'ratio_bounds', measure: 'v', min: 0.5 }, rows([0.8, 0.45, 0.33]), opts);
  assert.equal(v.status, 'fail');
  assert.equal(v.offenders.length, 2);
});

test('checks skip cleanly rather than throwing', () => {
  assert.equal(runCheck({ id: 'x', type: 'monotonic', measure: 'nope' }, rows([1, 2]), opts).status, 'skip');
  assert.equal(runCheck({ id: 'x', type: 'sign', measure: 'v', expect: '>0' }, [], opts).status, 'skip');
  assert.equal(runCheck({ id: 'x', type: 'bogus' }, rows([1]), opts).status, 'skip');
});

test('allPassed treats warn as non-fatal but fail as fatal', () => {
  const vs = runChecks(
    [
      { id: 'a', type: 'sign', measure: 'v', expect: '>0' },
      { id: 'b', type: 'monotonic', measure: 'v' },
    ],
    rows([1, 2, 3]), opts,
  );
  assert.equal(allPassed(vs), true);
  assert.equal(allPassed([{ status: 'warn' }]), true);
  assert.equal(allPassed([{ status: 'fail' }]), false);
});
