import { HttpClient } from '@angular/common/http';
import { EventEmitter, Injectable } from '@angular/core';
import { Papa, ParseResult } from 'ngx-papaparse';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

import { ConfigSourceService } from '../core/config-source.service';
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
    private cs: ConfigSourceService,
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
      skipEmptyLines: true,
      complete: (result) => {
        this.headersLoaded.emit(result.meta.fields);
      },
    });
  }

  getData(file: File): ParseResult {
    return this.papa.parse(file, {
      header: true,
      // Without this a file ending in a newline yields a trailing row of empty
      // strings, which then travels the whole pipeline as a real record.
      skipEmptyLines: true,
      complete: (result) => {
        // Fetch the mapping once, apply it, and only then announce the data.
        // Emitting first published the raw CSV headers, so any config whose
        // data.csv is not already written in canonical column codes produced
        // views with no measures at all. Subscribing per row also fired one
        // request per record.
        this.importMapping().subscribe({
          next: (m) => {
            this.applyMapping(result.data, m);
            this.dataLoaded.emit(result);
          },
          // No mapping is a valid configuration: the bundled sample already
          // uses canonical codes as its CSV headers.
          error: () => this.dataLoaded.emit(result),
        });
      },
    });
  }

  /** Rename source columns to the canonical codes `structure.json` is written in. */
  private applyMapping(rows: any[], mapping: any): void {
    const columns: any[] = mapping?.columns ?? [];
    if (!columns.length) {
      return;
    }
    for (const row of rows) {
      for (const e of columns) {
        if (Object.prototype.hasOwnProperty.call(row, e.column)) {
          const value = row[e.column];
          // The ' �' strip is for mojibake in the bundled Italian sample.
          row[e.target] = typeof value === 'string' ? value.replace(' �', '') : value;
        }
      }
    }
  }

  getStructure(): Observable<any> {
    return this.ds.langMap(this.lang);
  }

  importMapping(): Observable<any> {
    if (this.mapping) {
      return of(this.mapping);
    } else {
      return this.http.get(this.cs.url('mapping.json')).pipe(
        tap((m) => {
          this.mapping = m;
        }),
      );
    }
  }
}
