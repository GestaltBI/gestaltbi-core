#!/usr/bin/env node
/**
 * Run the Everpix validation suite through the pipeline.
 *
 *   npm run build && npm run fixture:everpix && npm run demo:everpix
 *
 * Most of these checks are *meant* to fail: they encode what a healthy
 * subscription business looks like, and Everpix was not one. The check that
 * must pass is `recognition-matches-published` — it validates the `recognize`
 * op against the accrual series Everpix published, derived from cash alone.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { firstValueFrom } from 'rxjs';
import { Processor, StructureDirectory } from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const GEN = join(HERE, '..', 'fixtures', 'everpix', 'generated');

if (!existsSync(join(GEN, 'data.json'))) {
  console.error('Fixture not built. Run:  npm run fixture:everpix');
  process.exit(2);
}
const read = (f) => JSON.parse(readFileSync(join(GEN, f), 'utf8'));
const { data } = read('data.json');
const structure = read('structure.json');
const processing = read('processing.json');
const checks = read('checks.json');

processing.process.validate.options.checks = checks;

const directory = new StructureDirectory(structure);
const proc = new Processor({ columnDirectory: directory, processes: processing });
proc.workOn({ data });

// --- the processed frame -----------------------------------------------------
const rows = await firstValueFrom(proc.getProcessed('deltas', 'frame'));

const usd = (v) => (v === null || v === undefined || Number.isNaN(v) ? '—' : (v < 0 ? '-$' : '$') + Math.round(Math.abs(v)).toLocaleString());
const pad = (s, n, right = true) => (right ? String(s).padStart(n) : String(s).padEnd(n));

console.log('\n\x1b[1mEverpix — recognized revenue vs. AWS, Sep 2012 – Oct 2013\x1b[0m');
console.log('  ' + pad('month', 8, false) + pad('cash', 10) + pad('recognized', 12) + pad('published', 11) + pad('AWS', 10) + pad('margin(cash)', 14) + pad('margin(accr)', 14) + pad('deferred', 11) + pad('TiB', 8));
console.log('  ' + '-'.repeat(98));
for (const r of rows) {
  const line =
    pad(r.month_label, 8, false) + pad(usd(r.cash_total), 10) + pad(usd(r.rec_total), 12) +
    pad(usd(r.rec_total_published), 11) + pad(usd(r.aws_cost), 10) +
    pad(usd(r.margin_cash), 14) + pad(usd(r.margin_accrual), 14) +
    pad(usd(r.deferred_yearly), 11) + pad(r.s3_tib === null ? '—' : r.s3_tib.toFixed(0), 8);
  const bad = r.margin_accrual !== null && r.margin_accrual < 0;
  console.log('  ' + (bad ? `\x1b[31m${line}\x1b[0m` : line));
}

// --- verdicts ----------------------------------------------------------------
const verdicts = await firstValueFrom(proc.getProcessed('validate', 'checks'));

const GLYPH = { pass: '\x1b[32mPASS\x1b[0m', fail: '\x1b[31mFAIL\x1b[0m', warn: '\x1b[33mWARN\x1b[0m', skip: '\x1b[90mSKIP\x1b[0m' };
console.log('\n\x1b[1mValidation suite\x1b[0m');
for (const v of verdicts) {
  console.log(`\n  ${GLYPH[v.status]}  ${v.label ?? v.id}   \x1b[90m(${v.type} · ${v.id})\x1b[0m`);
  console.log(`        ${v.summary}`);
  if (v.offenders?.length) {
    const shown = v.offenders.slice(0, 4).map((o) => {
      const at = o.at ?? '?';
      const rest = Object.entries(o).filter(([k]) => k !== 'at')
        .map(([k, val]) => {
          if (typeof val !== 'number') return `${k}=${val}`;
          if (k === 'gap') return `${k}=${(val * 100).toFixed(1)}%`;
          return `${k}=${Number.isInteger(val) || Math.abs(val) >= 100 ? Math.round(val).toLocaleString() : val.toFixed(3)}`;
        })
        .join(' ');
      return `${at} ${rest}`;
    });
    for (const s of shown) console.log(`        \x1b[90m· ${s}\x1b[0m`);
    if (v.offenders.length > 4) console.log(`        \x1b[90m· … ${v.offenders.length - 4} more\x1b[0m`);
  }
}

const tally = verdicts.reduce((a, v) => ({ ...a, [v.status]: (a[v.status] ?? 0) + 1 }), {});
console.log(`\n  ${Object.entries(tally).map(([k, n]) => `${n} ${k}`).join(' · ')}\n`);

const opCheck = verdicts.find((v) => v.id === 'recognition-matches-published');
if (opCheck?.status !== 'pass') {
  console.error('recognize op failed to reproduce the published accrual series');
  process.exit(1);
}
console.log('\x1b[90m  The failures above are the finding, not a bug: they are what a business\n  with compounding storage costs and no acquisition channel looks like.\x1b[0m\n');
