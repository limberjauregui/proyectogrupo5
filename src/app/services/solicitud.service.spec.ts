import { TestBed } from '@angular/core/testing';
import { AlertService } from './alert.service';
import { ProductService } from './product.service';
import { SolicitudService } from './solicitud.service';

describe('SolicitudService', () => {
  let service: SolicitudService;
  let productService: ProductService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [AlertService, ProductService, SolicitudService] });
    service = TestBed.inject(SolicitudService);
    productService = TestBed.inject(ProductService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should create a new solicitud and retrieve it by cliente', () => {
    const solicitud = service.createSolicitud('cliente', [{ productId: 1, qty: 1 }]);
    expect(solicitud).toBeTruthy();
    expect(service.getSolicitudesByCliente('cliente')).toContain(solicitud);
  });

  it('should approve a solicitud and deduct stock when available', () => {
    const product = productService.getProductById(1);
    expect(product).toBeTruthy();

    const solicitud = service.createSolicitud('cliente', [{ productId: 1, qty: 1 }]);
    expect(solicitud.stockDeducted).toBeFalse();

    const approved = service.updateSolicitudStatus(solicitud.id, 'Aprobada');
    expect(approved).toBeTruthy();
    expect(approved?.estado).toBe('Aprobada');
    expect(approved?.stockDeducted).toBeTrue();
    expect(productService.getProductById(1)?.stock).toBe((product?.stock ?? 0) - 1);
  });
});
