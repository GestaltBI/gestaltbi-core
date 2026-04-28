import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';

export class ColumnStructure {
  label: string;
  type: string;
  tags: string[];
  multi: boolean;
  required: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class DatastructureService {
  datastructure: any;

  coltags: Map<string, string[]> = new Map<string, string[]>();

  lang: any;

  constructor(
    private http: HttpClient, //
  ) {
    console.log('new shit');
  }

  autoload(): Promise<any> {
    return Promise.all([
      this.http
        .get('assets/it.json')
        .toPromise()
        .then((data) => {
          this.lang = data;
          //return data;
        }),
      this.http
        .get('assets/structure.json')
        .toPromise()
        .then((data) => {
          this.datastructure = data;
          //return data;
        }),
    ]).then((x) => {
      console.log('done dling');
      this.prepareData();
      console.log('done preparing');
    });
  }

  load(data: any): void {
    this.datastructure = data;
    this.prepareData();
  }

  getLabel(code): string {
    if (false) {
      this.autoload().then((x) => {
        return this.getLabel(code);
      });
    } else {
      if (Object.keys(this.lang).indexOf(code) > 0) {
        return this.lang[code] as string;
      } else {
        return code as string;
      }
    }
  }

  getFull(code): ColumnStructure | string {
    if (false) {
      this.autoload().then((x) => {
        return this.getFull(code);
      });
    } else {
      const label = this.getLabel(code);
      const ret: [ColumnStructure] = this.datastructure.columns.filter((x) => x.column === code);
      if (ret.length > 0) {
        ret[0].label = label;
        return ret[0] as ColumnStructure;
      }
      return label;
    }
  }

  prepareData(): void {
    this.coltags.clear();
    this.datastructure.columns.forEach((column) => {
      this.coltags.set(column.column, [column.column]);
      column.tags.forEach((tag) => {
        if (!this.coltags.has(tag)) {
          this.coltags.set(tag, []);
        }
        this.coltags.get(tag).push(column.column);
      });
    });
  }

  getDataStructure(): any {
    return this.datastructure;
  }

  getTags(): string[] {
    return Array.from(this.coltags.keys());
  }

  getColumnsFor(tag: string, translate = false): string[] {
    if (!this.coltags.has(tag)) {
      return [];
    }
    return this.coltags.get(tag);
  }

  getTypeFor(col, lang?: string) {
    return this.datastructure.columns.filter((x) => x.column === col)[0].type;
  }

  getDataStructureFor(tag: string): any {
    const ret: any = {
      type: 'structure',
      version: '1.0',
    };
    ret.name = this.datastructure.name + '__derived';
    ret.columns = this.datastructure.columns.filter((x) => {
      return x.tags.includes(tag) || x.column === tag;
    });
    return ret;
  }

  langMap(language: string): any {
    return this.http.get('assets/' + language + '.json').pipe(
      map((data) => {
        const ret = this.getDataStructureFor('sbi:i:mappable');
        ret.columns.forEach((col) => {
          col.label = data[col.column];
        });
        return ret;
      }),
    );
  }

  getDimensionHierarchies() {
    const ret = {
      dimensionHierarchies: [],
    };

    this.getColumnsFor('uatu:dimension').forEach((col) => {
      ret.dimensionHierarchies.push({
        dimensionTable: {
          dimension: col,
          keyProps: [col],
        },
      });
    });

    const ll = this.getColumnsFor('uatu:dimension:geo');
    ret.dimensionHierarchies.push({
      dimensionTable: {
        dimension: 'geo',
        keyProps: ll,
      },
    });

    ret.dimensionHierarchies.push({
      dimensionTable: {
        dimension: 'address',
        keyProps: this.getColumnsFor('gcx:street'),
      },
      level: [
        {
          dimensionTable: {
            dimension: 'city',
            keyProps: this.getColumnsFor('gcx:city'),
          },
          level: [
            {
              dimensionTable: {
                dimension: 'postcode',
                keyProps: this.getColumnsFor('gcx:postcode'),
              },
              level: [
                {
                  dimensionTable: {
                    dimension: 'region',
                    keyProps: this.getColumnsFor('gcx:region'),
                  },
                  level: [
                    {
                      dimensionTable: {
                        dimension: 'country',
                        keyProps: this.getColumnsFor('gcx:country'),
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    return ret;
  }
}
