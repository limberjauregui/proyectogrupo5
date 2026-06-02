import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrazabilidadPage } from './trazabilidad.page';

describe('TrazabilidadPage', () => {
  let component: TrazabilidadPage;
  let fixture: ComponentFixture<TrazabilidadPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TrazabilidadPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
