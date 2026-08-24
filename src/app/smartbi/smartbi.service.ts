import { HttpClient } from '@angular/common/http';
import { EventEmitter, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

import { ConfigSourceService } from '../core/config-source.service';
import { ImporterService } from './../importer/importer.service';
import { AggregatorService } from './../processor/aggregator.service';
import { DataService } from './../processor/data.service';
import { FilterService } from './../processor/filter.service';
import { ProcessorService } from './../processor/processor.service';
import { RegistryService } from './../sbi-registry/registry.service';

@Injectable({
  providedIn: 'root',
})
export class SmartbiService {
  mode: string;
  view: string;

  /**
   * Path prefix used by changeMode/changeView when building routerLinks.
   * Default `['/data']` for the bundled config; flipped to
   * `['/gh', org, repo]` (or with a ref) by GhSourceGuard so that sidebar
   * navigation preserves the `/gh/...` URL structure.
   */
  prefix: any[] = ['/data'];

  toggleLeft: EventEmitter<void> = new EventEmitter<void>();
  toggleRight: EventEmitter<void> = new EventEmitter<void>();

  constructor(
    private http: HttpClient, //
    private reg: RegistryService,
    private ps: ProcessorService,
    private ds: DataService,
    private fs: FilterService,
    private as: AggregatorService,
    private i: ImporterService,
    private cs: ConfigSourceService,
  ) {}

  /** One fetch per config source, so every consumer sees the same curation. */
  private modesCache: { base: string; modes$: Observable<any[]> } | null = null;

  /**
   * The analyses this configuration offers.
   *
   * `modes.json` is either the bare array it has always been, or an object
   * wrapping that array so the file has somewhere to put settings that are not
   * about a single mode:
   *
   * ```json
   * { "exclude": ["map"], "modes": [ { "type": "button", "id": "long", ... } ] }
   * ```
   *
   * Reading it is also what installs the view exclusions, and the result is
   * shared — so anything that asks for views after asking for modes is asking
   * a registry that already knows what this dataset has no use for.
   */
  getModes(): Observable<any[]> {
    const base = this.cs.base;
    if (this.modesCache?.base !== base) {
      this.modesCache = {
        base,
        modes$: this.http.get(this.cs.url('modes.json')).pipe(
          map((raw) => this.readModes(raw)),
          shareReplay({ bufferSize: 1, refCount: false }),
        ),
      };
    }
    return this.modesCache.modes$;
  }

  /** Normalise both file shapes, and tell the registry what to leave out. */
  private readModes(raw: any): any[] {
    const modes: any[] = Array.isArray(raw) ? raw : (raw?.modes ?? []);
    const global = this.viewList(Array.isArray(raw) ? null : raw?.exclude);

    const byMode = new Map<string, string[]>();
    for (const entry of modes) {
      const views = this.viewList(entry?.exclude);
      if (entry?.id && views.length) {
        byMode.set(entry.id, views);
      }
    }

    this.reg.setExcludedViews(global, byMode);
    return modes;
  }

  /** `"map"` and `["map", "graph"]` are both reasonable things to write. */
  private viewList(value: any): string[] {
    if (typeof value === 'string') return [value];
    return Array.isArray(value) ? value.filter((v) => typeof v === 'string') : [];
  }

  setMode(mode: string) {
    this.mode = mode;
    this.ps.setMode(mode);
  }

  setView(view: string) {
    this.view = view;
  }

  setPrefix(prefix: any[]) {
    this.prefix = prefix;
  }

  throwToggleLeft() {
    this.toggleLeft.emit();
  }

  throwToggleRight() {
    this.toggleRight.emit();
  }

  componentFor(mode, vis) {
    return this.reg.componentFor(mode, vis);
  }

  viewsFor(mode: string): string[] {
    return this.reg.viewsFor(mode);
  }

  /** Dataset-independent tools, shown regardless of what modes.json lists. */
  get tools() {
    return this.reg.tools;
  }

  /**
   * Route to a mode, keeping the current view where that mode has one.
   *
   * Modes no longer all offer the same views — a narrative has no table, a
   * cross-tab has no map — so carrying the current view across blindly linked
   * straight at an unregistered pair, which resolves to EmptyComponent. Fall
   * back to whatever the target mode actually provides.
   */
  changeMode(mode: string) {
    const views = this.reg.viewsFor(mode);
    const view = views.includes(this.view) ? this.view : (views[0] ?? this.view);
    return [...this.prefix, mode, view];
  }

  changeView(view: string) {
    return [...this.prefix, this.mode, view];
  }

  loadMock(file) {
    this.i.dataLoaded.subscribe((data) => {
      this.ps.workOn(data);
    });
    this.i.launchMock(file);
    this.as.prepareDimensions();
  }
}
