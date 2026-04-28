import { Observable } from 'rxjs';

export interface IAggregatorService {
  initialize(data): void;
  getDimensions(): any[];
  getDimensionMembers(dimension: string): any[];
}
