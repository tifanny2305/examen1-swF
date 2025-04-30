import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExportAngularComponent } from './export-angular.component';

describe('ExportAngularComponent', () => {
  let component: ExportAngularComponent;
  let fixture: ComponentFixture<ExportAngularComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExportAngularComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExportAngularComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
