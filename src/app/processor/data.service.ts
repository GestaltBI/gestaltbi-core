import { EventEmitter, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ProcessorService } from './processor.service';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  public refresh: EventEmitter<any> = new EventEmitter<any>();

  constructor(
    private processor: ProcessorService, //
  ) {
    this.processor.setDataService(this);
  }

  public triggerRefresh() {
    this.refresh.emit();
  }

  public getProcessed(phase?: string, identifier?: string): Observable<any> {
    return this.processor.getProcessed(phase, identifier);
  }

  public getProcessInfo(phase?: string): Observable<any> {
    return this.processor.getProcessInfo(phase);
  }
}
