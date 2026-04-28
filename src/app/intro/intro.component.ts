import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';

@Component({
  standalone: false,
  selector: 'sbi-intro',
  templateUrl: './intro.component.html',
  styleUrls: ['./intro.component.scss'],
})
export class IntroComponent implements OnInit {
  constructor(private readonly location: Location) {}

  ngOnInit(): void {}

  back() {
    this.location.back();
  }

  goToSiteForm() {
    window.open('https://github.com/GestaltBI', '_blank');
  }
}
