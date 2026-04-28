import { Component, EventEmitter, Input, OnInit, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BehaviorSubject, Observable } from 'rxjs';

import { DatastructureService } from './../../datastructure/datastructure.service';
import { AggregatorService } from './../../processor/aggregator.service';

@Component({
  standalone: false,
  selector: 'sbi-dimselect',
  templateUrl: './dimselect.component.html',
  styleUrls: ['./dimselect.component.scss'],
  providers: [
    {
      // <================================================ ADD THIS
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DimselectComponent),
      multi: true,
    },
  ],
})
export class DimselectComponent implements OnInit, ControlValueAccessor {
  @Input() field;
  optionsLoaded: EventEmitter<any> = new EventEmitter<any>();
  //options: any[];
  isLoading = false;
  isOpen = false;

  counter = 0;

  savedValue: any;

  private _value: any;
  // Whatever name for this (myValue) you choose here, use it in the .html file.
  public get myValue(): string {
    return this._value;
  }
  public set myValue(v: string) {
    if (v !== this._value) {
      this._value = v;
      this.onChange(v);
    }
  }

  constructor(
    private as: AggregatorService, //
    private dss: DatastructureService,
  ) {}

  ngOnInit(): void {
    this.isLoading = false;
    /*setTimeout((_) => {
      this.getOptions();
    }, 50);*/
  }

  public get label() {
    return this.dss.getLabel(this.field);
  }

  get options() {
    return this.as.getDimensionMembers(this.field);
  }

  openChanged(event) {
    this.isOpen = event;
    this.isLoading = event;
    if (event) {
      this.savedValue = event.value;
    }
  }

  onChange = (_) => {};
  onTouched = () => {};

  writeValue(value: any): void {
    this.myValue = value;
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  setDisabledState?(isDisabled: boolean): void {
    throw new Error('Method not implemented.');
  }
}
