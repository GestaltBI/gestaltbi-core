import { ComponentFixture, TestBed, async } from '@angular/core/testing';

import { SyncdiffComponent } from './syncdiff.component';

describe('SyncdiffComponent', () => {
  let component: SyncdiffComponent;
  let fixture: ComponentFixture<SyncdiffComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [SyncdiffComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SyncdiffComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
