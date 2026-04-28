import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

import { SmartbiService } from './../../smartbi.service';

@Component({
  standalone: false,
  selector: 'sbi-l-sidenav',
  templateUrl: './l-sidenav.component.html',
})
export class LSidenavComponent implements OnInit {
  modes$: Observable<any>;

  constructor(private router: Router, private sbi: SmartbiService) {}

  ngOnInit(): void {
    this.modes$ = this.sbi.getModes();
  }

  goto(mode: string) {
    this.router.navigate(this.sbi.changeMode(mode));
    this.sbi.throwToggleLeft();
  }
}
