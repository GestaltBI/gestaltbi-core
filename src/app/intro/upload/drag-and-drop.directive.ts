import { EventEmitter, HostBinding } from '@angular/core';
import { Output } from '@angular/core';
import { Directive, HostListener } from '@angular/core';

@Directive({
  standalone: false,
  selector: '[sbiDragAndDrop]',
})
export class DragAndDropDirective {
  @HostBinding('class.fileover') fileOver: boolean;

  @Output() fileDropped = new EventEmitter<any>();
  constructor() {}

  @HostListener('dragover', ['$event']) onDragOver(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    this.fileOver = true;
  }

  @HostListener('dragleave', ['$event']) public onDragLeave(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    this.fileOver = false;
  }

  @HostListener('drop', ['$event']) public ondrop(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    this.fileOver = false;
    const files = evt.dataTransfer.files;
    if (files.length > 0) {
      this.fileDropped.emit(files);
      console.log('drop');
    }
  }
}
