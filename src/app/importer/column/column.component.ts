import { Component, Input, OnInit } from '@angular/core';

@Component({
  standalone: false,
  selector: 'sbi-column',
  templateUrl: './column.component.html',
  styleUrls: ['./column.component.scss'],
})
export class ColumnComponent implements OnInit {
  @Input() name: string;
  @Input() structure;

  constructor() {}

  ngOnInit(): void {}
}
