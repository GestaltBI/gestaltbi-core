import { ComponentFixture, TestBed, async } from '@angular/core/testing';

import { SyncchangeComponent } from './syncchange.component';

describe('SyncchangeComponent', () => {
  let component: SyncchangeComponent;
  let fixture: ComponentFixture<SyncchangeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [SyncchangeComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SyncchangeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
