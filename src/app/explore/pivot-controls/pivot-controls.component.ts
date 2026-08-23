import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import type { AggKind } from '@gestaltbi/stream';

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

  constructor(private dss: DatastructureService) {}

  ngOnInit(): void {
    this.dimensions = this.choices('uatu:dimension');
    this.measures = this.choices('uatu:measure');

    this.selection = {
      rows: this.dimensions[0]?.code ?? '',
      // A second dimension across the top is the whole point; fall back to a
      // plain group-by when the structure only describes one.
      columns: this.dimensions[1]?.code ?? null,
      measure: this.measures[0]?.code ?? '',
      type: 'sum',
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

  private choices(tag: string): Choice[] {
    return (this.dss.getColumnsFor(tag) ?? [])
      .filter((code, i, all) => all.indexOf(code) === i)
      .map((code) => ({ code, label: this.dss.getLabel(code) }));
  }
}
