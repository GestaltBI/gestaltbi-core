import { CdkPortalOutlet, ComponentPortal } from '@angular/cdk/portal';
import {
  AfterViewInit,
  Component,
  ContentChild,
  ContentChildren,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';

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
export class FilterComponent implements OnInit, AfterViewInit {
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
  ) {}

  ngOnInit(): void {
    if (this.isGlobal) {
      this.ar.paramMap.subscribe((params) => {
        console.log(params);
        this.mode = params.get('mode');
        this.vis = params.get('vis');
        this.portal?.attached.subscribe((_) => {
          this.portalFilter = (this.portal.attachedRef as any).instance;
        });
        this.selectedPortal = new ComponentPortal(this.frs.for(this.mode, this.vis, this.filterScope));
      });
    }
    setTimeout((_) => {
      if (this.isGlobal) {
        this.portalFilter.configure(this.gfs.getFilter());
      } else {
        this.children.configure(this.gfs.getFilter(this.localState));
      }
    }, 50);
  }

  ngAfterViewInit() {
    if (this.isGlobal) {
      this.portalFilter = (this.portal.attachedRef as any).instance;
    }

    setTimeout((_) => {
      const d = document.getElementsByClassName('clickme');
      for (let c = 0; c < d.length; c++) {
        (d.item(c) as any).click();
      }
    }, 1200);
  }

  get isGlobal() {
    return null === this.localFilter || undefined === this.localFilter;
  }

  set(value) {
    if (this.isGlobal) {
      this.portalFilter.configure(value);
    } else {
      this.children.configure(value);
    }
  }

  save() {
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
