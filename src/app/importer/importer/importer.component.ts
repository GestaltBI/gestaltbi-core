import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { ImporterService } from './../importer.service';

@Component({
  standalone: false,
  selector: 'sbi-importer',
  templateUrl: './importer.component.html',
  styleUrls: ['./importer.component.css'],
})
export class ImporterComponent implements OnInit {
  fileToUpload: File = null;

  data;

  constructor(private importer: ImporterService, private router: Router) {}

  ngOnInit(): void {}

  handleFileInput(event: any): void {
    const files = event.target.files;
    this.fileToUpload = files.item(0);

    this.importer.dataLoaded.subscribe((data) => {
      this.data = data;
    });

    this.importer.getData(this.fileToUpload);
  }

  parseFile(): void {
    console.log(this.fileToUpload);
  }

  open(): void {
    this.router.navigate(['/data/long/map']);
  }
}
