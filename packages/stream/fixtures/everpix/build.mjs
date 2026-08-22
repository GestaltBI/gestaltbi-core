#!/usr/bin/env node
/**
 * Build the Everpix fixture from the public Everpix-Intelligence dataset.
 *
 *   EVERPIX_DIR=/path/to/Everpix-Intelligence node fixtures/everpix/build.mjs
 *
 * Emits into ./generated (gitignored — the dataset carries no license grant,
 * so it is read from your own checkout rather than vendored here):
 *   data.json        one row per month, Sep 2012 – Oct 2013
 *   structure.json   column codes, types and tags
 *   processing.json  the process graph
 *   checks.json      the validation suite
 *
 * Source: https://github.com/everpix/Everpix-Intelligence (frozen 6 Nov 2013)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'generated');
const SRC = process.env.EVERPIX_DIR || '/srv/everpix/Everpix-Intelligence';

if (!existsSync(join(SRC, 'Internal Metrics'))) {
  console.error(`Everpix dataset not found at ${SRC}\nSet EVERPIX_DIR to your checkout of everpix/Everpix-Intelligence.`);
  process.exit(2);
}

// --- tiny RFC4180-ish CSV reader (the dataset has no embedded newlines) -----
function readCsv(rel) {
  const text = readFileSync(join(SRC, rel), 'utf8').replace(/^﻿/, '');
  const [head, ...body] = text.trim().split(/\r?\n/);
  const cols = splitLine(head);
  return body.filter(Boolean).map((line) => {
    const cells = splitLine(line);
    return Object.fromEntries(cols.map((c, i) => [c, cells[i]]));
  });
}
function splitLine(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}
const IM = (f) => join('Internal Metrics', f);
const byDate = (rows, key = 'Date') => Object.fromEntries(rows.map((r) => [r[key], r]));
const num = (v) => { if (v === undefined || v === null || v === '') return null; const n = parseFloat(v); return Number.isFinite(n) ? n : null; };

// --- the fourteen months the KPI series cover --------------------------------
const MONTHS = ['Sep-12','Oct-12','Nov-12','Dec-12','Jan-13','Feb-13','Mar-13','Apr-13','May-13','Jun-13','Jul-13','Aug-13','Sep-13','Oct-13'];
const MONTH_NO = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12 };
const iso = (m) => { const [mm, yy] = m.split('-'); return `20${yy}-${String(MONTH_NO[mm]).padStart(2,'0')}-01`; };

const users   = byDate(readCsv(IM('KPIs (Users).csv')));
const newU    = byDate(readCsv(IM('KPIs (New Users).csv')));
const subs    = byDate(readCsv(IM('KPIs (Subscribers - Peak During Month).csv')));
const cash    = byDate(readCsv(IM('KPIs (Sales Volume - Minus Processing Fees and Refunds).csv')));
const rec     = byDate(readCsv(IM('KPIs (Revenues in Sales Recognition Basis - Minus Processing Fees and Refunds).csv')));
const aws     = byDate(readCsv(IM('KPIs (AWS Costs - Production System Only).csv')));
const s3      = byDate(readCsv(IM('System AWS Costs (S3 TiB per Month).csv')));
const rate    = byDate(readCsv(IM('KPIs (User Subscription Rate).csv')));
const freeAct = byDate(readCsv(IM('KPIs (Free Users Visiting Website or iOS App - % of Monthly Signup Cohorts).csv')));
const subAct  = byDate(readCsv(IM('KPIs (Subscribed Users Visiting Website or iOS App - % of Monthly Signup Cohorts).csv')));
const photos  = byDate(readCsv(IM('KPIs (New Photos Synced - Millions).csv')));
const traffic = byDate(readCsv(join('External Metrics', 'Monthly Website Traffic.csv')), 'Month Index');

const press = {};
for (const r of readCsv('Press Coverage.csv')) {
  const p = (r.Date || '').split(/\s+/);
  if (p.length === 3) { const k = `${p[1]}-${p[2]}`; press[k] = (press[k] || 0) + 1; }
}

const rows = MONTHS.map((m) => ({
  month: iso(m),
  month_label: m,
  signups: num(users[m]?.Signups),
  new_users: num(newU[m]?.Count),
  subscribers: num(subs[m]?.Count),
  cash_yearly: num(cash[m]?.['Stripe Yearly']),
  cash_monthly_stripe: num(cash[m]?.['Stripe Monthly']),
  cash_monthly_apple: num(cash[m]?.['Apple Monthly']),
  // Published accrual series — the ground truth `recognize` is checked against.
  rec_yearly_published: num(rec[m]?.['Stripe Yearly']),
  rec_monthly_stripe_published: num(rec[m]?.['Stripe Monthly']),
  rec_monthly_apple_published: num(rec[m]?.['Apple Monthly']),
  aws_cost: num(aws[m]?.Cost),
  s3_tib: s3[m] ? (num(s3[m].Normal) ?? 0) + (num(s3[m].RRS) ?? 0) : null,
  new_photos_m: num(photos[m]?.Delta),
  sub_rate_all: num(rate[m]?.All),
  sub_rate_1k: num(rate[m]?.['1000+ Photos']),
  sub_rate_10k: num(rate[m]?.['10000+ Photos']),
  free_active_30d: num(freeAct[m]?.['Last 30 Days']),
  sub_active_30d: num(subAct[m]?.['Last 30 Days']),
  visits: num(traffic[m]?.Visits),
  press_articles: press[m] ?? 0,
}));

// --- structure ---------------------------------------------------------------
const D = 'uatu:dimension', T = 'uatu:dimension:time', M = 'uatu:measure';
const FLOW = 'uatu:measure:flow', STOCK = 'uatu:measure:stock', RATIO = 'uatu:measure:ratio';
const CASH = 'uatu:measure:basis:cash', ACCRUAL = 'uatu:measure:basis:accrual';
const of = (c) => `uatu:measure:of:${c}`, unit = (u) => `uatu:measure:unit:${u}`;
const AGG = 'uatu:aggregable';

const col = (column, type, tags, label, aggregation) => ({ column, type, tags, label, ...(aggregation ? { aggregation } : {}) });
const usdFlow = (extra = []) => [M, FLOW, unit('usd'), ...extra];

const structure = {
  type: 'structure', version: '1', name: 'everpix',
  columns: [
    col('month', 'date', [D, T], 'Month'),
    col('month_label', 'string', [D], 'Month label'),

    col('signups', 'number', [M, STOCK, unit('count')], 'Users (cumulative)'),
    col('subscribers', 'number', [M, STOCK, unit('count')], 'Subscribers'),
    col('new_users', 'number', [M, FLOW, unit('count'), AGG], 'New users', [{ target: 'new_users', type: 'sum' }]),
    col('new_photos_m', 'number', [M, FLOW, unit('count'), AGG], 'New photos (millions)', [{ target: 'new_photos_m', type: 'sum' }]),
    col('s3_tib', 'number', [M, STOCK, unit('tib')], 'Storage under management (TiB)'),

    col('cash_yearly', 'number', usdFlow([CASH, of('subscription_revenue'), AGG]), 'Cash sales — Stripe yearly', [{ target: 'cash_yearly', type: 'sum' }]),
    col('cash_monthly_stripe', 'number', usdFlow([CASH, of('subscription_revenue'), AGG]), 'Cash sales — Stripe monthly', [{ target: 'cash_monthly_stripe', type: 'sum' }]),
    col('cash_monthly_apple', 'number', usdFlow([CASH, of('subscription_revenue'), AGG]), 'Cash sales — Apple monthly', [{ target: 'cash_monthly_apple', type: 'sum' }]),

    col('rec_yearly_published', 'number', usdFlow([ACCRUAL, of('subscription_revenue')]), 'Recognized — Stripe yearly (published)'),
    col('rec_monthly_stripe_published', 'number', usdFlow([ACCRUAL, of('subscription_revenue')]), 'Recognized — Stripe monthly (published)'),
    col('rec_monthly_apple_published', 'number', usdFlow([ACCRUAL, of('subscription_revenue')]), 'Recognized — Apple monthly (published)'),

    col('aws_cost', 'number', usdFlow([AGG]), 'AWS production cost', [{ target: 'aws_cost', type: 'sum' }]),

    col('sub_rate_all', 'number', [M, RATIO, AGG], 'Subscription rate — all users', [{ target: 'sub_rate_all', type: 'ratio', numerator: 'subscribers', denominator: 'signups' }]),
    col('sub_rate_1k', 'number', [M, RATIO], 'Subscription rate — 1,000+ photos'),
    col('sub_rate_10k', 'number', [M, RATIO], 'Subscription rate — 10,000+ photos'),
    col('free_active_30d', 'number', [M, RATIO], 'Free users active in last 30 days'),
    col('sub_active_30d', 'number', [M, RATIO], 'Subscribers active in last 30 days'),

    col('visits', 'number', [M, FLOW, unit('count')], 'Website visits'),
    col('press_articles', 'number', [M, FLOW, unit('count')], 'Press articles'),

    // Written by the graph.
    col('cash_total', 'number', usdFlow([CASH, of('subscription_revenue')]), 'Cash sales — total'),
    col('rec_total', 'number', usdFlow([ACCRUAL, of('subscription_revenue')]), 'Recognized revenue — total (computed)'),
    col('rec_total_published', 'number', usdFlow([ACCRUAL, of('subscription_revenue')]), 'Recognized revenue — total (published)'),
    col('deferred_yearly', 'number', [M, STOCK, unit('usd')], 'Deferred revenue — annual plans'),
    col('margin_cash', 'number', usdFlow([CASH]), 'Gross margin over AWS — cash basis'),
    col('margin_accrual', 'number', usdFlow([ACCRUAL]), 'Gross margin over AWS — accrual basis'),
  ],
};

// --- process graph -----------------------------------------------------------
const processing = {
  process: {
    parse: { op: 'format', options: { dateTag: 'uatu:dimension:time', dateFormat: 'YYYY-MM-DD' } },

    // Matching principle: spread each month's cash across the term it serves.
    recognize_yearly: {
      op: 'recognize', require: ['parse'],
      options: { amount: 'cash_yearly', date: 'month', term: 12, into: 'rec_yearly', deferredInto: 'deferred_yearly' },
    },
    recognize_monthly_stripe: {
      op: 'recognize', require: ['recognize_yearly'],
      options: { amount: 'cash_monthly_stripe', date: 'month', term: 1, into: 'rec_monthly_stripe' },
    },
    recognize_monthly_apple: {
      op: 'recognize', require: ['recognize_monthly_stripe'],
      options: { amount: 'cash_monthly_apple', date: 'month', term: 1, into: 'rec_monthly_apple' },
    },

    totals: {
      op: 'enhance', require: ['recognize_monthly_apple'],
      options: {
        nullSafe: true,
        columns: [
          { column: 'cash_total', expr: ['+', ['+', 'cash_yearly', 'cash_monthly_stripe'], 'cash_monthly_apple'] },
          { column: 'rec_total', expr: ['+', ['+', 'rec_yearly', 'rec_monthly_stripe'], 'rec_monthly_apple'] },
          { column: 'rec_total_published', expr: ['+', ['+', 'rec_yearly_published', 'rec_monthly_stripe_published'], 'rec_monthly_apple_published'] },
        ],
      },
    },
    margins: {
      op: 'enhance', require: ['totals'],
      options: {
        nullSafe: true,
        columns: [
          { column: 'margin_cash', expr: ['-', 'cash_total', 'aws_cost'] },
          { column: 'margin_accrual', expr: ['-', 'rec_total', 'aws_cost'] },
        ],
      },
    },
    deltas: {
      op: 'diffcalc', require: ['margins'],
      options: {
        date: 'month',
        measures: [
          { column: 's3_tib', kind: 'stock', flowInto: 's3_tib_added' },
          { column: 'signups', kind: 'stock', flowInto: 'signups_added' },
          { column: 'rec_total', kind: 'flow' },
        ],
      },
    },
    validate: { op: 'assert', require: ['deltas'], options: { orderBy: 'month', checks: null } },
  },
};

// --- the validation suite ----------------------------------------------------
const checks = [
  { id: 'recognition-matches-published', type: 'divergence', label: 'recognize op reproduces the published accrual series',
    a: 'rec_total', b: 'rec_total_published', warn: 0.001, fail: 0.01 },
  { id: 'gross-margin-positive', type: 'sign', label: 'Recognized revenue covers AWS',
    measure: 'margin_accrual', expect: '>0' },
  { id: 'revenue-covers-cost', type: 'covers', label: 'Revenue ≥ production cost, every month',
    measure: 'rec_total', by: 'aws_cost' },
  { id: 'storage-is-a-ratchet', type: 'monotonic', label: 'Storage never falls',
    measure: 's3_tib', direction: 'increasing' },
  { id: 'cash-vs-accrual', type: 'divergence', label: 'Cash and accrual bases agree',
    a: 'margin_cash', b: 'margin_accrual', warn: 0.15, fail: 0.5 },
  { id: 'conversion-holds', type: 'ratio_bounds', label: 'Power-user conversion stays above 50%',
    measure: 'sub_rate_10k', min: 0.5 },
  { id: 'retention-window-complete', type: 'window_complete', label: '30-day retention has a full window',
    measure: 'free_active_30d', cohortDate: 'month', span: 'month', windowDays: 30, asOf: '2013-11-06' },
];

mkdirSync(OUT, { recursive: true });
const w = (name, obj) => { writeFileSync(join(OUT, name), JSON.stringify(obj, null, 2) + '\n'); console.log(`  ${name} (${JSON.stringify(obj).length.toLocaleString()} bytes)`); };
console.log(`Everpix fixture from ${SRC}`);
w('data.json', { data: rows });
w('structure.json', structure);
w('processing.json', processing);
w('checks.json', checks);
console.log(`  ${rows.length} monthly rows, ${structure.columns.length} columns, ${checks.length} checks`);
