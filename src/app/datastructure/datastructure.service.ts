import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  type ColumnDirectory,
  type StructureColumn,
  StructureDirectory,
  type StructureDoc,
  tags,
} from '@gestaltbi/stream';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

import { ConfigSourceService } from '../core/config-source.service';

export class ColumnStructure {
  label: string;
  type: string;
  tags: string[];
  multi: boolean;
  required: boolean;
}

/**
 * The app's {@link ColumnDirectory}: `structure.json` plus the translation
 * table, in the shape `@gestaltbi/stream` expects.
 *
 * Tag lookups delegate to the package's {@link StructureDirectory} so the two
 * cannot drift — this service adds only what the client needs on top: label
 * translation, and the geographic dimension hierarchy, which is richer than the
 * flat one-level-per-dimension default the package ships.
 */
@Injectable({
  providedIn: 'root',
})
export class DatastructureService implements ColumnDirectory {
  datastructure: StructureDoc;

  lang: any;

  private dir: StructureDirectory | undefined;

  constructor(
    private http: HttpClient, //
    private cs: ConfigSourceService,
  ) {
    // Reload whenever the config source changes (e.g. /gh/<org>/<repo>).
    // APP_INITIALIZER handles the first load; this kicks in for subsequent
    // source switches.
    let initial = true;
    this.cs.source$.subscribe(() => {
      if (initial) {
        initial = false;
        return;
      }
      this.autoload();
    });
  }

  autoload(): Promise<any> {
    return Promise.all([
      firstValueFrom(this.http.get(this.cs.url('it.json'))).then((data) => {
        this.lang = data;
      }),
      firstValueFrom(this.http.get<StructureDoc>(this.cs.url('structure.json'))).then((data) => {
        this.load(data);
      }),
    ]);
  }

  load(data: StructureDoc): void {
    this.datastructure = data;
    this.dir = new StructureDirectory(data);
  }

  getLabel(code): string {
    if (this.lang && Object.keys(this.lang).indexOf(code) > 0) {
      return this.lang[code] as string;
    }
    return code as string;
  }

  getFull(code): ColumnStructure | string {
    const label = this.getLabel(code);
    const column = this.dir?.getColumn(code);
    if (column) {
      (column as any).label = label;
      return column as unknown as ColumnStructure;
    }
    return label;
  }

  getDataStructure(): StructureDoc {
    return this.datastructure;
  }

  /** Every tag in use, plus every column code — both are valid lookup keys. */
  getTags(): string[] {
    if (!this.dir) {
      return [];
    }
    return [...new Set([...this.datastructure.columns.map((c) => c.column), ...this.dir.getTags()])];
  }

  /**
   * Columns carrying `tag`. A column code is also a valid key and resolves to
   * itself, so `processing.json` can name either a tag or a single column
   * wherever a tag is expected.
   */
  getColumnsFor(tag: string, translate = false): string[] {
    if (!this.dir) {
      return [];
    }
    const self = this.dir.getColumn(tag) ? [tag] : [];
    return [...self, ...this.dir.getColumnsFor(tag)];
  }

  getTypeFor(col, lang?: string) {
    return this.dir?.getColumn(col)?.type;
  }

  getDataStructureFor(tag: string): StructureDoc {
    const columns: StructureColumn[] = (this.datastructure?.columns ?? []).filter(
      (x) => (x.tags || []).includes(tag) || x.column === tag,
    );
    return {
      type: 'structure',
      version: '1.0',
      name: this.datastructure?.name + '__derived',
      columns,
    };
  }

  langMap(language: string): any {
    return this.http.get(this.cs.url(language + '.json')).pipe(
      map((data) => {
        const ret = this.getDataStructureFor('sbi:i:mappable');
        ret.columns.forEach((col) => {
          col.label = data[col.column];
        });
        return ret;
      }),
    );
  }

  /**
   * Dimension hierarchies for the OLAP cube.
   *
   * One flat level per plain dimension, then the geographic drill-down the map
   * views navigate: address → city → postcode → region → country.
   */
  getDimensionHierarchies() {
    const ret = {
      dimensionHierarchies: [],
    };

    this.getColumnsFor(tags.DIMENSION).forEach((col) => {
      ret.dimensionHierarchies.push({
        dimensionTable: {
          dimension: col,
          keyProps: [col],
        },
      });
    });

    ret.dimensionHierarchies.push({
      dimensionTable: {
        dimension: 'geo',
        keyProps: this.getColumnsFor(tags.GEO),
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
