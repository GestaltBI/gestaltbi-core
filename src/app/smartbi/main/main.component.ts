import { ComponentPortal, Portal } from '@angular/cdk/portal';
import { AfterViewChecked, Component, OnInit, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { ActivatedRoute, Router } from '@angular/router';

import { GraphService } from './../../graph/graph.service';
import { ImporterService } from './../../importer/importer.service';
import { ProcessorService } from './../../processor/processor.service';
import { SmartbiService } from './../smartbi.service';

@Component({
  standalone: false,
  selector: 'sbi-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
})
export class MainComponent implements OnInit, AfterViewChecked {
  bottomPortal: Portal<any>;

  selectedPortal: Portal<any>;

  @ViewChild('lside') lside: MatSidenav;
  @ViewChild('rside') rside: MatSidenav;

  lSidenavOpen = false;
  filterBarOpen = false;
  firstRun = true;

  constructor(
    private ar: ActivatedRoute, //
    private is: ImporterService,
    public sbi: SmartbiService,
    private ps: ProcessorService,
    private gs: GraphService,
  ) {}

  ngOnInit(): void {
    this.is.dataLoaded.subscribe((data) => {
      this.ps.workOn(data);
    });
    if (!this.ps.loaded) {
      this.is.launch(false, 'assets/mocks/data.csv');
    }
    this.sbi.toggleLeft.subscribe((data) => {
      this.lside.toggle();
    });
    this.sbi.toggleRight.subscribe((data) => {
      this.rside.toggle();
    });
    this.ar.paramMap.subscribe((params) => {
      const mode = params.get('mode');
      const vis = params.get('vis');
      this.sbi.setMode(mode);
      this.sbi.setView(vis);
      const cp = this.sbi.componentFor(mode, vis);
      setTimeout(() => {
        this.selectedPortal = new ComponentPortal(cp);
      }, 0);
    });
  }

  toggle() {
    this.filterBarOpen = !this.filterBarOpen;
  }

  ngAfterViewChecked() {
    if (this.firstRun) {
      this.firstRun = false;
      setTimeout((_) => {
        this.toggle();
      }, 550);
    }
  }
}
