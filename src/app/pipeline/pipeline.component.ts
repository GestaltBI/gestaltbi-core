import { Component, OnDestroy, OnInit } from '@angular/core';
import { type Graph, type GraphNode, type NodeKind,readGraph } from '@gestaltbi/editor';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { ConfigSourceService } from '../core/config-source.service';
import { ProcessorService } from '../processor/processor.service';
import { RegistryService } from '../sbi-registry/registry.service';

/** Box geometry. Lanes are taller than they are wide, so labels have room. */
const COL = 250;
const ROW = 116;
const W = 190;
const H = 74;

interface Placed extends GraphNode {
  x: number;
  y: number;
}

/**
 * How this data is being processed, drawn.
 *
 * Every config describes a pipeline, and until now the only way to read one was
 * to open `processing.json` and hold thirty entries in your head. This draws it:
 * what happens to the rows, in what order, and which stage the view you were
 * just looking at actually reads from.
 *
 * Read-only on purpose. The shape comes from `@gestaltbi/editor`, which is also
 * what an editable canvas would be built on — so this view and that one can
 * never disagree about what a config means.
 */
@Component({
  standalone: false,
  selector: 'sbi-pipeline',
  templateUrl: './pipeline.component.html',
  styleUrls: ['./pipeline.component.scss'],
})
export class PipelineComponent implements OnInit, OnDestroy {
  graph: Graph | undefined;

  private sub: Subscription | undefined;
  nodes: Placed[] = [];
  edges: { d: string; from: string; to: string }[] = [];

  width = 0;
  height = 0;

  /** The node the reader is asking about, or none. */
  selected: Placed | undefined;

  /** Kinds actually present, so the legend explains this graph and no other. */
  kinds: NodeKind[] = [];

  constructor(
    private ps: ProcessorService,
    private reg: RegistryService,
    private cs: ConfigSourceService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    // Follow the config rather than waiting on `ready`: that promise resolves
    // on the first fetch, which is the bundled graph even when the route is
    // /gh/<org>/<repo>, because the source switches after startup.
    this.sub = this.ps.processes$.subscribe((config) => this.draw(config));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get empty(): boolean {
    return !!this.graph && this.nodes.length === 0;
  }

  /** Where this config is loaded from, so a reader knows whose pipeline this is. */
  get source(): string {
    return this.cs.base;
  }

  select(node: Placed): void {
    this.selected = this.selected?.id === node.id ? undefined : node;
  }

  /** A leaf is what a view subscribes to, which is the useful thing to say. */
  readBy(node: Placed): string[] {
    if (!node.leaf) return [];
    return this.reg.viewsFor(this.ps.mode ?? '').length ? [node.id] : [node.id];
  }

  /** Prefer this host's own words for an op; fall back to the package's. */
  describe(node: GraphNode): string {
    const key = `pipeline.op.${node.op}`;
    const translated = this.translate.instant(key);
    return translated === key ? node.summary : translated;
  }

  kindLabel(kind: NodeKind): string {
    const key = `pipeline.kind.${kind}`;
    const translated = this.translate.instant(key);
    return translated === key ? kind : translated;
  }

  private draw(config: any): void {
    const graph = readGraph(config);
    this.graph = graph;

    this.nodes = graph.nodes.map((n) => ({
      ...n,
      x: n.depth * COL,
      y: n.lane * ROW,
    }));

    const at = new Map(this.nodes.map((n) => [n.id, n]));
    this.edges = graph.edges.flatMap((e) => {
      const from = at.get(e.from);
      const to = at.get(e.to);
      if (!from || !to) return [];
      const x1 = from.x + W;
      const y1 = from.y + H / 2;
      const x2 = to.x;
      const y2 = to.y + H / 2;
      const bend = Math.max(28, (x2 - x1) / 2);
      return [{ d: `M${x1},${y1} C${x1 + bend},${y1} ${x2 - bend},${y2} ${x2},${y2}`, from: e.from, to: e.to }];
    });

    this.width = graph.depth * COL - (COL - W);
    this.height = graph.lanes * ROW - (ROW - H);
    this.kinds = [...new Set(graph.nodes.map((n) => n.kind))];
  }
}
