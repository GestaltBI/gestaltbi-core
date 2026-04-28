import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { SmartbiService } from './../../smartbi.service';

@Component({
  standalone: false,
  selector: 'sbi-l-sidenav',
  templateUrl: './l-sidenav.component.html',
})
export class LSidenavComponent implements OnInit {
  modes$: Observable<any>;

  constructor(public sbi: SmartbiService) {}

  ngOnInit(): void {
    this.modes$ = this.sbi.getModes();
  }

  onPick() {
    // Routing happens via the routerLink directive on the row itself.
    // We just close the sidenav once the user has made a choice.
    this.sbi.throwToggleLeft();
  }
}
