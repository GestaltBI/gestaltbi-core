import { Component, Input, OnInit } from '@angular/core';

import { ImporterService } from './../importer.service';

@Component({
  standalone: false,
  selector: 'sbi-datamodel',
  templateUrl: './datamodel.component.html',
  styleUrls: ['./datamodel.component.css'],
})
export class DatamodelComponent implements OnInit {
  @Input() columns;

  structure;

  constructor(private importer: ImporterService) {}

  ngOnInit(): void {
    this.importer.getStructure().subscribe((data) => {
      console.log(data);
      this.structure = data;
    });
  }
}
