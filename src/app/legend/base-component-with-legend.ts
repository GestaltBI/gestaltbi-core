import { BaseComponent } from '../shared/base-component';
import { Measure } from '../shared/measure';

export abstract class BaseComponentWithLegend extends BaseComponent {
  selectedMeasure: Measure;

  updateSelectedMeasure(measure): void {
    this.selectedMeasure = measure;
  }
}
