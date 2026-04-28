import {
  AfterViewChecked,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  Input,
  OnInit,
  QueryList,
  ViewChild,
} from '@angular/core';
import { MatTabGroup } from '@angular/material/tabs';

import { CarouselItemComponent } from './carousel-item.component';

@Component({
  standalone: false,
  selector: 'sbi-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss'],
})
export class CarouselComponent implements OnInit, AfterViewChecked {
  @ViewChild('tabGroup')
  public tabGroup: MatTabGroup;

  @Input() maxWidth: number;

  @ContentChildren(CarouselItemComponent, { descendants: true })
  public children: QueryList<CarouselItemComponent>;

  public selectedIndex = 0;
  public showLeftArrow = false;
  public showRightArrow = true;

  constructor(private readonly cdRef: ChangeDetectorRef) {}

  ngOnInit(): void {}

  ngAfterViewChecked(): void {
    this.cdRef.detectChanges();
  }

  getItems(): CarouselItemComponent[] {
    return this.children.toArray();
  }

  onSelectedIndexChange(index: number): void {
    const tabCount = this.tabGroup._tabs.length;
    this.showLeftArrow = index !== 0;
    this.showRightArrow = index !== tabCount - 1;
  }

  scrollLeft(): void {
    this.selectedIndex = this.selectedIndex - 1;
  }

  scrollRight(): void {
    this.selectedIndex = this.selectedIndex + 1;
  }
}
