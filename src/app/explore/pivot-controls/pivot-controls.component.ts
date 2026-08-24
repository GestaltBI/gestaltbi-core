import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { dimensionColumns, type AggKind } from '@gestaltbi/stream';

import { DatastructureService } from '../../datastructure/datastructure.service';

/** What the user has chosen to put on each axis. */
export interface PivotSelection {
  rows: string;
  columns: string | null;
  measure: string;
  type: AggKind;
}

interface Choice {
  code: string;
  label: string;
}

/**
 * The axes bar: what goes down the side, what goes across the top, which
 * measure fills the cells and how it is folded.
 *
 * Every choice is drawn from the loaded structure, so this works for any config
 * repo without knowing a single column name.
 */
@Component({
  standalone: false,
  selector: 'sbi-pivot-controls',
  templateUrl: './pivot-controls.component.html',
  styleUrls: ['./pivot-controls.component.scss'],
})
export class PivotControlsComponent implements OnInit {
  /** Aggregations offered for the cells. `count` needs no measure. */
  @Input() types: AggKind[] = ['sum', 'avg', 'median', 'min', 'max', 'count', 'countDistinct'];

  @Output() selectionChange = new EventEmitter<PivotSelection>();

  dimensions: Choice[] = [];
  measures: Choice[] = [];

  selection: PivotSelection = { rows: '', columns: null, measure: '', type: 'sum' };

  private route = inject(ActivatedRoute);

  constructor(private dss: DatastructureService) {}

  ngOnInit(): void {
    // `uatu:dimension:time` and friends are refinements of `uatu:dimension`, so
    // a dataset whose only axis is time still has one to pivot on. Continuous
    // ones are dropped: latitude is tagged a geo dimension and is a coordinate,
    // and cross-tabulating by it would make one column per distinct reading.
    this.dimensions = this.label(dimensionColumns(this.dss).filter((code) => this.categorical(code)));
    this.measures = this.label(this.dss.getColumnsFor('uatu:measure') ?? []);

    // The advisor routes here with the axes it recommended. Anything it did not
    // name falls back to the same defaults a cold visit gets.
    const q = this.route.snapshot.queryParamMap;
    const known = (code: string | null, among: Choice[]) =>
      code && among.some((c) => c.code === code) ? code : null;

    this.selection = {
      rows: known(q.get('rows'), this.dimensions) ?? this.dimensions[0]?.code ?? '',
      // A second dimension across the top is the whole point; fall back to a
      // plain group-by when the structure only describes one.
      columns: known(q.get('columns'), this.dimensions) ?? this.dimensions[1]?.code ?? null,
      measure: known(q.get('measure'), this.measures) ?? this.measures[0]?.code ?? '',
      type: (this.types.includes(q.get('agg') as any) ? q.get('agg') : 'sum') as AggKind,
    };

    // The host binds this straight into its children, and its view has already
    // been checked by the time our ngOnInit runs — announce after the pass.
    setTimeout(() => this.emit());
  }

  /** Cells need no measure when they are counting rows. */
  get needsMeasure(): boolean {
    return this.selection.type !== 'count';
  }

  pick(field: keyof PivotSelection, value: any): void {
    this.selection = { ...this.selection, [field]: value };
    this.emit();
  }

  /** "None" is a real choice for the column axis: it degenerates to a group-by. */
  pickColumns(value: string): void {
    this.pick('columns', value === '' ? null : value);
  }

  private emit(): void {
    this.selectionChange.emit({ ...this.selection });
  }

  /** An axis has to have levels. A number line does not. */
  private categorical(code: string): boolean {
    const type = String(this.dss.getTypeFor(code) ?? '');
    return !type.startsWith('number') && type !== 'int' && type !== 'float';
  }

  private label(codes: string[]): Choice[] {
    return codes
      .filter((code, i, all) => all.indexOf(code) === i)
      .map((code) => ({ code, label: this.dss.getLabel(code) }));
  }
}
