import { Component, OnInit } from '@angular/core';

@Component({
  standalone: false,
  selector: 'sbi-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
})
export class MainComponent implements OnInit {
  // mapOptions: TimedmapOptions = new TimedmapOptions('map_debug', 44.494888, 11.342616, 3); // center to Bologna
  constructor() {}

  ngOnInit(): void {}
}
