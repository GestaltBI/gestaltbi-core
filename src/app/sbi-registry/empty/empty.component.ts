import { Component, OnInit } from '@angular/core';

@Component({
  standalone: false,
  selector: 'sbi-empty',
  templateUrl: './empty.component.html',
  styleUrls: ['./empty.component.scss'],
})
export class EmptyComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}
}
