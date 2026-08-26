import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Processor, OpRegistry, AbstractOp, StructureDirectory, Join, Union } from '../dist/index.js';
import { firstValueFrom, of } from 'rxjs';

/**
 * `require` is a dataflow edge.
 *
 * These are the tests that hold it: a process reads what it required, a stage
 * several branches share runs once, and a graph that cannot be honoured says so
 * rather than quietly doing something else.
 */

const directory = () => new StructureDirectory({ columns: [] });

/** Stamps its own name onto every row, so a frame records the path it took. */
const marker = (name, log) =>
  class extends AbstractOp {
    run(df) {
      log.push(name);
      return (df[0] ?? []).map((r) => ({ ...r, path: [...(r.path ?? []), name] }));
    }
  };

function build(processes, log = [], extra = {}) {
  const registry = new OpRegistry();
  for (const n of ['x', 'b', 'c', 'a', 'd']) registry.register(n, marker(n, log));
  registry.register('join', Join);
  registry.register('union', Union);
  for (const [k, v] of Object.entries(extra)) registry.register(k, v);

  const proc = new Processor({ columnDirectory: directory(), processes, registry, fetcher: () => of({}) });
  return { proc, log };
}

const DIAMOND = { process: {
  x: { op: 'x' },
  b: { op: 'b', require: ['x'] },
  c: { op: 'c', require: ['x'] },
  a: { op: 'a', require: ['b'] },
}};

describe('a process reads what it required', () => {
  test('a branch reads its own upstream, not whatever ran before it', async () => {
    const { proc } = build(DIAMOND);
    proc.workOn({ data: [{ id: 1 }] });
    const c = await firstValueFrom(proc.getProcessed('c'));
    assert.deepEqual(c[0].path, ['x', 'c'], 'c required x, so c must read x');
  });

  test('a chain still runs in order', async () => {
    const { proc } = build(DIAMOND);
    proc.workOn({ data: [{ id: 1 }] });
    const a = await firstValueFrom(proc.getProcessed('a'));
    assert.deepEqual(a[0].path, ['x', 'b', 'a']);
  });

  test('a process with no require reads the raw frame', async () => {
    const { proc } = build(DIAMOND);
    proc.workOn({ data: [{ id: 1 }] });
    const x = await firstValueFrom(proc.getProcessed('x'));
    assert.deepEqual(x[0].path, ['x']);
  });

  test('a stage two branches share is executed once', async () => {
    const log = [];
    const { proc } = build({ process: {
      x: { op: 'x' },
      b: { op: 'b', require: ['x'] },
      c: { op: 'c', require: ['x'] },
      a: { op: 'union', require: ['b', 'c'] },
    }}, log);
    proc.workOn({ data: [{ id: 1 }] });
    await firstValueFrom(proc.getProcessed('a'));
    assert.equal(log.filter((n) => n === 'x').length, 1, 'x is required twice but must run once');
  });

  test('two identifiers keep their own streams', async () => {
    const { proc } = build(DIAMOND);
    proc.workOn({ data: [{ id: 1 }] });
    const first = await firstValueFrom(proc.getProcessed('a', 'A'));
    const second = await firstValueFrom(proc.getProcessed('c', 'B'));
    assert.deepEqual(first[0].path, ['x', 'b', 'a']);
    assert.deepEqual(second[0].path, ['x', 'c']);
  });

  test('a settings carrier with no op is transparent', async () => {
    const { proc } = build({ process: {
      x: { op: 'x' },
      conf_thing: { op: 'noop', options: { currency: 'EUR' } },
      a: { op: 'a', require: ['x'] },
    }});
    proc.workOn({ data: [{ id: 1 }] });
    assert.deepEqual((await firstValueFrom(proc.getProcessed('a')))[0].path, ['x', 'a']);
    assert.deepEqual(proc.getProcessInfo('conf_thing'), { currency: 'EUR' });
  });
});

describe('a graph that cannot be honoured says so', () => {
  test('a cycle is named rather than overflowing the stack', () => {
    const { proc } = build({ process: {
      a: { op: 'a', require: ['b'] },
      b: { op: 'b', require: ['a'] },
    }});
    proc.workOn({ data: [{ id: 1 }] });
    assert.throws(() => proc.getProcessed('a'), /cycle: a -> b -> a/);
  });

  test('wiring two inputs into a one-input op is an error, not a dropped branch', () => {
    const { proc } = build({ process: {
      x: { op: 'x' },
      b: { op: 'b', require: ['x'] },
      a: { op: 'a', require: ['x', 'b'] },
    }});
    proc.workOn({ data: [{ id: 1 }] });
    assert.throws(() => proc.getProcessed('a'), /wires 2 inputs into op "a", which reads 1/);
  });

  test('an unknown process yields nothing rather than throwing', async () => {
    const { proc } = build(DIAMOND);
    proc.workOn({ data: [{ id: 1 }] });
    const out = await firstValueFrom(proc.getProcessed('nope'));
    assert.deepEqual(out, [{ id: 1 }], 'the raw frame, untouched');
  });
});

describe('re-emission', () => {
  test('a new frame reaches a resolved leaf', async () => {
    const { proc } = build(DIAMOND);
    proc.workOn({ data: [{ id: 1 }] });
    const stream = proc.getProcessed('a');
    assert.equal((await firstValueFrom(stream)).length, 1);

    proc.workOn({ data: [{ id: 1 }, { id: 2 }] });
    const after = await firstValueFrom(stream);
    assert.equal(after.length, 2, 'importing a new file must reach views already on screen');
    assert.deepEqual(after[1].path, ['x', 'b', 'a']);
  });
});

describe('union', () => {
  const twoBranches = { process: {
    x: { op: 'x' },
    b: { op: 'b', require: ['x'] },
    c: { op: 'c', require: ['x'] },
    u: { op: 'union', require: ['b', 'c'], options: { sourceInto: 'branch', sourceLabels: ['left', 'right'] } },
  }};

  test('stacks every input and records where each row came from', async () => {
    const { proc } = build(twoBranches);
    proc.workOn({ data: [{ id: 1 }, { id: 2 }] });
    const out = await firstValueFrom(proc.getProcessed('u'));
    assert.equal(out.length, 4);
    assert.deepEqual(out.map((r) => r.branch), ['left', 'left', 'right', 'right']);
    assert.deepEqual(out[0].path, ['x', 'b']);
    assert.deepEqual(out[2].path, ['x', 'c']);
  });

  test('distinctOn drops rows already seen', async () => {
    const { proc } = build({ process: {
      x: { op: 'x' },
      b: { op: 'b', require: ['x'] },
      c: { op: 'c', require: ['x'] },
      u: { op: 'union', require: ['b', 'c'], options: { distinctOn: ['id'] } },
    }});
    proc.workOn({ data: [{ id: 1 }, { id: 2 }] });
    assert.equal((await firstValueFrom(proc.getProcessed('u'))).length, 2);
  });
});

describe('join', () => {
  const rows = [{ sku: 'a', sold: 3 }, { sku: 'b', sold: 5 }, { sku: 'z', sold: 1 }];
  const lookup = [{ sku: 'a', name: 'Anvil', tier: 1 }, { sku: 'b', name: 'Bolt', tier: 2 }];

  const graph = (options) => ({ process: {
    left: { op: 'passLeft' },
    right: { op: 'passRight' },
    j: { op: 'join', require: ['left', 'right'], options },
  }});
  const stubs = {
    passLeft: class extends AbstractOp { run() { return rows; } },
    passRight: class extends AbstractOp { run() { return lookup; } },
  };

  test('brings the right-hand columns across, keeping unmatched left rows', async () => {
    const { proc } = build(graph({ on: 'sku' }), [], stubs);
    proc.workOn({ data: [{}] });
    const out = await firstValueFrom(proc.getProcessed('j'));
    assert.equal(out.length, 3, 'a left join must not lose the unmatched row');
    assert.equal(out[0].name, 'Anvil');
    assert.equal(out[2].name, undefined);
  });

  test('inner keeps only what matched', async () => {
    const { proc } = build(graph({ on: 'sku', type: 'inner' }), [], stubs);
    proc.workOn({ data: [{}] });
    assert.equal((await firstValueFrom(proc.getProcessed('j'))).length, 2);
  });

  test('a prefix keeps a shared column name from overwriting', async () => {
    const { proc } = build(graph({ on: 'sku', prefix: 'ref:', columns: ['name'] }), [], stubs);
    proc.workOn({ data: [{}] });
    const out = await firstValueFrom(proc.getProcessed('j'));
    assert.equal(out[0]['ref:name'], 'Anvil');
    assert.equal(out[0].tier, undefined, 'columns limits what is carried');
  });

  test('a duplicated key does not multiply rows', async () => {
    const dupes = class extends AbstractOp { run() { return [{ sku: 'a', name: 'one' }, { sku: 'a', name: 'two' }]; } };
    const { proc } = build(graph({ on: 'sku' }), [], { ...stubs, passRight: dupes });
    proc.workOn({ data: [{}] });
    const out = await firstValueFrom(proc.getProcessed('j'));
    assert.equal(out.length, 3, 'row count is the left frame, whatever the right side holds');
    assert.equal(out[0].name, 'one');
  });
});
