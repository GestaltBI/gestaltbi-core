import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';

import { ImporterService } from './../importer.service';

@Component({
  standalone: false,
  selector: 'sbi-importbtn',
  templateUrl: './importbtn.component.html',
  styleUrls: ['./importbtn.component.scss'],
})
export class ImportbtnComponent implements OnInit {
  fileToUpload: File = null;

  data;

  @Output() dataLoaded: EventEmitter<any> = new EventEmitter<any>();
  @Output() dataError: EventEmitter<any> = new EventEmitter<any>();

  constructor(private importer: ImporterService, private router: Router) {}

  ngOnInit(): void {}

  handleFileInput(event: any): void {
    const files = event.target.files;
    this.importer.dataLoaded.subscribe((data) => {
      this.dataLoaded.emit(data);
    });
    this.fileToUpload = files.item(0);
    this.importer.getData(this.fileToUpload);
  }

  parseFile(): void {
    console.log(this.fileToUpload);
  }

  open(): void {
    this.router.navigate(['/data/long/map']);
  }
}
