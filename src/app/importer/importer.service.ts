import { HttpClient } from '@angular/common/http';
import { EventEmitter, Injectable } from '@angular/core';
import { Papa, ParseResult } from 'ngx-papaparse';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

import { DatastructureService } from './../datastructure/datastructure.service';
import { DialogComponent } from './dialog/dialog.component';

@Injectable({
  providedIn: 'root',
})
export class ImporterService {
  lang = 'it';
  headersLoaded: EventEmitter<string[]> = new EventEmitter<string[]>();

  mapping;

  dataLoaded: EventEmitter<ParseResult> = new EventEmitter<ParseResult>();

  imported: EventEmitter<any> = new EventEmitter<any>();

  constructor(
    private papa: Papa, //
    private http: HttpClient,
    private ds: DatastructureService,
  ) {}

  launch(enforceMapping: boolean = false, mock?): void {
    if (mock) {
      this.launchMock(mock);
    }
  }

  launchMock(file) {
    this.http
      .get(file, {
        responseType: 'text',
      })
      .subscribe((data) => {
        const f = new File([data], 'data.csv');
        this.getData(f);
      });
  }

  getHeaders(file: File): void {
    this.papa.parse(file, {
      header: true,
      complete: (result) => {
        console.log(result);
        this.headersLoaded.emit(result.meta.fields);
      },
    });
  }

  getData(file: File): ParseResult {
    return this.papa.parse(file, {
      header: true,
      complete: (result) => {
        console.log(result);
        result.data.map((x) => {
          this.importMapping().subscribe((m) => {
            m.columns.forEach((e) => {
              if (Object.keys(x).indexOf(e.column) >= 0) {
                x[e.target] = x[e.column].replace(' �', '');
              }
            });
          });
        });
        this.dataLoaded.emit(result);
      },
    });
  }

  getStructure(): Observable<any> {
    return this.ds.langMap(this.lang);
  }

  importMapping(): Observable<any> {
    if (this.mapping) {
      return of(this.mapping);
    } else {
      return this.http.get('assets/mapping.json').pipe(
        tap((m) => {
          this.mapping = m;
        }),
      );
    }
  }
}
