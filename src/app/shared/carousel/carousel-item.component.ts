import { Component, Input, OnInit, TemplateRef, ViewChild } from '@angular/core';

@Component({
  standalone: false,
  selector: 'sbi-carousel-item',
  templateUrl: './carousel-item.component.html',
})
export class CarouselItemComponent implements OnInit {
  @ViewChild('templateRef') public templateRef: TemplateRef<any>;

  @Input() public icon: string;

  constructor() {}

  ngOnInit(): void {}
}
