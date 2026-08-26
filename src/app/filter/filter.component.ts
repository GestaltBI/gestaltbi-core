import { CdkPortalOutlet, ComponentPortal } from '@angular/cdk/portal';
import {
  AfterViewInit,
  Component,
  ContentChild,
  ContentChildren,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

import { ImporterService } from './../importer/importer.service';
import { ProcessorService } from './../processor/processor.service';

import { FilterService as ProcessFilterService } from './../processor/filter.service';
import { BasefilterComponent } from './basefilter/basefilter.component';
import { FilterStateService } from './filter-state.service';
import { Filter } from './filter.interface';
import { FilterRegistryService } from './filter.registry.service';

@Component({
  standalone: false,
  selector: 'sbi-filter',
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.scss'],
})
export class FilterComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() filterScope = 'local';

  @Input() filterType = '';
  @Input() filterParams: any;

  @Input() localFilter: string;
  @Input() localState: string;

  @ViewChild('search') private search: ElementRef;

  mode: string;
  vis: string;

  @ContentChild(BasefilterComponent) children: BasefilterComponent;

  selectedPortal: ComponentPortal<Filter>; // mode, vis, local: boolean

  @ViewChild(CdkPortalOutlet) portal: CdkPortalOutlet;

  portalFilter: BasefilterComponent;

  constructor(
    private ar: ActivatedRoute, //
    private frs: FilterRegistryService,
    private pfs: ProcessFilterService,
    private gfs: FilterStateService,
    private ps: ProcessorService,
    private importer: ImporterService,
  ) {}

  private applied: Subscription | undefined;

  ngOnInit(): void {
    if (this.isGlobal) {
      this.ar.paramMap.subscribe((params) => {
        this.mode = params.get('mode');
        this.vis = params.get('vis');
        this.portal?.attached.subscribe((_) => {
          this.portalFilter = (this.portal.attachedRef as any).instance;
        });
        // A mode may have nothing to filter — the pipeline view draws the
        // config, not the data. Portalling `undefined` throws, and then every
        // later call finds `portalFilter` unset, so check before attaching.
        const filter = this.frs.for(this.mode, this.vis, this.filterScope);
        this.selectedPortal = filter ? new ComponentPortal(filter) : undefined;
      });
    }
    setTimeout((_) => {
      if (this.isGlobal) {
        this.portalFilter?.configure(this.gfs.getFilter());
      } else {
        this.children?.configure(this.gfs.getFilter(this.localState));
      }
    }, 50);
  }

  ngAfterViewInit() {
    if (this.isGlobal) {
      this.portalFilter = (this.portal?.attachedRef as any)?.instance;
    }

    // Apply the declared defaults (e.g. <sbi-periodfilter span="first">) so a
    // panel actually shows the period its date pickers advertise. This used to
    // be done by clicking elements with a `clickme` class, which no template
    // carries any more — leaving every two-period view comparing a period
    // against itself, i.e. rendering zeros.
    //
    // It has to run *after* the data has landed, because a period filter
    // derives its window from the range actually present, and *after* the views
    // have called getProcessed(), because that resets the stored filter for its
    // identifier. Hence: wait for the frame, then out-wait the 1000ms the
    // visualization components sit on.
    if (this.isGlobal) {
      return;
    }
    if (this.ps.loaded) {
      this.applyDeclaredDefaults();
    } else {
      this.applied = this.importer.dataLoaded.pipe(take(1)).subscribe(() => this.applyDeclaredDefaults());
    }
  }

  ngOnDestroy(): void {
    this.applied?.unsubscribe();
  }

  private applyDeclaredDefaults(): void {
    setTimeout(() => this.save(), 1200);
  }

  get isGlobal() {
    return null === this.localFilter || undefined === this.localFilter;
  }

  /** True when this bar has a filter to drive. */
  get active(): boolean {
    return this.isGlobal ? !!this.portalFilter : !!this.children;
  }

  set(value) {
    if (this.isGlobal) {
      this.portalFilter?.configure(value);
    } else {
      this.children?.configure(value);
    }
  }

  save() {
    if (!this.active) return;
    if (this.isGlobal) {
      const filter = this.portalFilter.save();
      this.gfs.setFilter(filter);
      this.pfs.setFilter(filter);
    } else {
      const filter = this.children.save();
      this.gfs.setFilter(filter, this.localState);
      this.pfs.setFilter(filter, this.localFilter);
    }
  }

  reset() {
    if (this.isGlobal) {
      const filter = this.portalFilter.reset();
      this.gfs.setFilter(filter);
      this.pfs.setFilter(filter);
    } else {
      const filter = this.children.reset();
      this.gfs.setFilter(filter, this.localState);
      this.pfs.setFilter(filter, this.localFilter);
    }
  }
}
