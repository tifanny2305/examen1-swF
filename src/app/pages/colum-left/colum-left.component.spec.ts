import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ColumLeftComponent } from './colum-left.component';

describe('ColumLeftComponent', () => {
  let component: ColumLeftComponent;
  let fixture: ComponentFixture<ColumLeftComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColumLeftComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ColumLeftComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
