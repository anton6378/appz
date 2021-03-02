import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GlogAlertViewComponent } from './glog-alert-view.component';

describe('GlogAlertViewComponent', () => {
  let component: GlogAlertViewComponent;
  let fixture: ComponentFixture<GlogAlertViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GlogAlertViewComponent ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GlogAlertViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
