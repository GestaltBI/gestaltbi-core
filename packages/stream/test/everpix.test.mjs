import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { firstValueFrom } from 'rxjs';
import { Processor, StructureDirectory } from '../dist/index.js';

const GEN = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'everpix', 'generated');
const built = existsSync(join(GEN, 'data.json'));

describe('Everpix fixture', { skip: built ? false : 'fixture not built — run `npm run fixture:everpix`' }, () => {
  const read = (f) => JSON.parse(readFileSync(join(GEN, f), 'utf8'));

  const run = async (target) => {
    const { data } = read('data.json');
    const processing = read('processing.json');
    processing.process.validate.options.checks = read('checks.json');
    const proc = new Processor({ columnDirectory: new StructureDirectory(read('structure.json')), processes: processing });
    proc.workOn({ data });
    return firstValueFrom(proc.getProcessed(target, target));
  };
  const verdict = (vs, id) => vs.find((v) => v.id === id);

  test('the dataset covers Sep 2012 – Oct 2013', async () => {
    const rows = await run('deltas');
    assert.equal(rows.length, 14);
    assert.equal(rows[0].month_label, 'Sep-12');
    assert.equal(rows.at(-1).month_label, 'Oct-13');
  });

  test('recognize reproduces the published accrual series from cash alone', async () => {
    const rows = await run('deltas');
    for (const r of rows) {
      const err = Math.abs(r.rec_total - r.rec_total_published) / r.rec_total_published;
      assert.ok(err < 1e-6, `${r.month_label}: computed ${r.rec_total} vs published ${r.rec_total_published}`);
    }
  });

  test('deferred balance equals cumulative cash minus cumulative recognized', async () => {
    const rows = await run('deltas');
    let cash = 0, rec = 0;
    for (const r of rows) {
      cash += r.cash_yearly;
      rec += r.rec_yearly;
      assert.ok(Math.abs(r.deferred_yearly - (cash - rec)) < 1e-6, r.month_label);
    }
    // The obligation Everpix still owed on annual plans at the shutdown announcement.
    assert.ok(Math.abs(rows.at(-1).deferred_yearly - 126681) < 1, rows.at(-1).deferred_yearly);
  });

  test('cash and accrual disagree about the final quarter', async () => {
    const rows = await run('deltas');
    const oct = rows.at(-1);
    assert.ok(oct.margin_cash > 10000, `cash margin ${oct.margin_cash}`);
    assert.ok(oct.margin_accrual < 0, `accrual margin ${oct.margin_accrual}`);
  });

  test('September 2012 has no AWS figure, so its margin is null rather than a windfall', async () => {
    const rows = await run('deltas');
    assert.equal(rows[0].aws_cost, null);
    assert.equal(rows[0].margin_accrual, null);
  });

  describe('validation suite', () => {
    test('the recognition check passes — this is what validates the op', async () => {
      const vs = await run('validate');
      assert.equal(verdict(vs, 'recognition-matches-published').status, 'pass');
    });

    test('gross margin is negative in every one of the 13 measured months', async () => {
      const v = verdict(await run('validate'), 'gross-margin-positive');
      assert.equal(v.status, 'fail');
      assert.equal(v.hits, 0);
      assert.equal(v.n, 13);
    });

    test('revenue never covers AWS', async () => {
      const v = verdict(await run('validate'), 'revenue-covers-cost');
      assert.equal(v.status, 'fail');
      assert.equal(v.hits, 0);
    });

    test('storage is monotonic across all 12 steps', async () => {
      const v = verdict(await run('validate'), 'storage-is-a-ratchet');
      assert.equal(v.status, 'pass');
      assert.equal(v.n, 12);
    });

    test('the cash and accrual bases diverge past the fail band', async () => {
      const v = verdict(await run('validate'), 'cash-vs-accrual');
      assert.equal(v.status, 'fail');
      assert.ok(v.observed > 1.8, `worst gap ${v.observed}`);
    });

    test('the October 2013 retention cohort is flagged as an incomplete window', async () => {
      const v = verdict(await run('validate'), 'retention-window-complete');
      assert.equal(v.status, 'fail');
      assert.equal(v.offenders.length, 1);
      assert.equal(v.offenders[0].at, '2013-10-01');
      assert.equal(v.offenders[0].observedDays, 5);
    });

    test('power-user conversion leaves the band in the final months', async () => {
      const v = verdict(await run('validate'), 'conversion-holds');
      assert.equal(v.status, 'fail');
      assert.equal(v.offenders.at(-1).at, '2013-10-01');
    });
  });
});
