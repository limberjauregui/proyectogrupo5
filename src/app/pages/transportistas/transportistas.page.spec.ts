import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TransportistasPage } from './transportistas.page';

describe('TransportistasPage', () => {
  let component: TransportistasPage;
  let fixture: ComponentFixture<TransportistasPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TransportistasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
