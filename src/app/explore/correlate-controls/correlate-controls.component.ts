import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import type { PairKind } from '@gestaltbi/stream';

/** What the user has asked to be measured, and how strictly. */
export interface CorrelateSelection {
  method: 'pearson' | 'spearman';
  minCoefficient: number;
  include: PairKind[];
}

@Component({
  standalone: false,
  selector: 'sbi-correlate-controls',
  templateUrl: './correlate-controls.component.html',
  styleUrls: ['./correlate-controls.component.scss'],
})
export class CorrelateControlsComponent implements OnInit {
  @Output() selectionChange = new EventEmitter<CorrelateSelection>();

  readonly methods: Array<'pearson' | 'spearman'> = ['pearson', 'spearman'];

  /** Conventional bands, so the floor reads as a judgement rather than a number. */
  readonly floors = [
    { value: 0, key: 'all' },
    { value: 0.2, key: 'weak' },
    { value: 0.4, key: 'moderate' },
    { value: 0.7, key: 'strong' },
  ];

  readonly families: Array<{ value: PairKind; key: string }> = [
    { value: 'measure-measure', key: 'measureMeasure' },
    { value: 'dimension-measure', key: 'dimensionMeasure' },
    { value: 'dimension-dimension', key: 'dimensionDimension' },
  ];

  selection: CorrelateSelection = {
    // Spearman by default: it catches a relationship that bends, and business
    // series bend more often than they run straight.
    method: 'spearman',
    minCoefficient: 0.2,
    include: ['measure-measure', 'dimension-measure', 'dimension-dimension'],
  };

  ngOnInit(): void {
    setTimeout(() => this.emit());
  }

  pick(field: keyof CorrelateSelection, value: any): void {
    this.selection = { ...this.selection, [field]: value };
    this.emit();
  }

  private emit(): void {
    this.selectionChange.emit({ ...this.selection, include: [...this.selection.include] });
  }
}
