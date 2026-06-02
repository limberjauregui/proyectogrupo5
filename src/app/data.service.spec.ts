import { TestBed } from '@angular/core/testing';
import { DataService } from './data.service';
import { AlertService } from './services/alert.service';
import { OrderService } from './services/order.service';
import { ProductService } from './services/product.service';
import { SolicitudService } from './services/solicitud.service';
import { TraceService } from './services/trace.service';

describe('DataService', () => {
  let service: DataService;
  let productService: jasmine.SpyObj<ProductService>;
  let orderService: jasmine.SpyObj<OrderService>;
  let solicitudService: jasmine.SpyObj<SolicitudService>;
  let alertService: jasmine.SpyObj<AlertService>;
  let traceService: jasmine.SpyObj<TraceService>;

  beforeEach(() => {
    productService = jasmine.createSpyObj('ProductService', [
      'getProducts',
      'getProductById',
      'addProduct',
      'updateProduct',
      'deleteProduct',
      'searchProducts',
      'filterProductsByCategory',
      'getStockState',
      'adjustStock',
      'getInventoryMovements',
    ]);
    orderService = jasmine.createSpyObj('OrderService', [
      'getOrders',
      'getOrdersForTransportista',
      'createOrderFromSolicitud',
      'createCustomOrder',
      'updateOrderStatus',
      'updateOrderDetails',
      'deleteOrder',
      'assignTransportista',
      'getTransportistas',
      'getUsers',
      'findOrderByCode',
      'getKpis',
      'getUrgentDeliveries',
      'getDeliveries',
    ]);
    solicitudService = jasmine.createSpyObj('SolicitudService', [
      'createSolicitud',
      'getSolicitudesByCliente',
      'getSolicitudes',
      'updateSolicitudStatus',
    ]);
    alertService = jasmine.createSpyObj('AlertService', ['getAlerts', 'markAlertRead', 'deleteAlert', 'addAlert']);
    traceService = jasmine.createSpyObj('TraceService', ['getTraceForOrder', 'addTraceStep', 'saveSignature', 'getSignature']);

    TestBed.configureTestingModule({
      providers: [
        DataService,
        { provide: ProductService, useValue: productService },
        { provide: OrderService, useValue: orderService },
        { provide: SolicitudService, useValue: solicitudService },
        { provide: AlertService, useValue: alertService },
        { provide: TraceService, useValue: traceService },
      ],
    });

    service = TestBed.inject(DataService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should delegate getProducts to ProductService', () => {
    const expected = [{ id: 1, name: 'Test', category: 'Test', stock: 1, price: 1, code: 'T1' }];
    productService.getProducts.and.returnValue(expected as any);

    expect(service.getProducts()).toBe(expected);
    expect(productService.getProducts).toHaveBeenCalled();
  });

  it('should delegate createSolicitud to SolicitudService', () => {
    const expected = { id: 1, code: 'SOL-1', clienteId: 'cliente', items: [], estado: 'Pendiente de aprobación', fecha: '', totalItems: 0 };
    solicitudService.createSolicitud.and.returnValue(expected as any);

    expect(service.createSolicitud('cliente', [])).toBe(expected as any);
    expect(solicitudService.createSolicitud).toHaveBeenCalledWith('cliente', []);
  });

  it('should delegate getAlerts to AlertService', () => {
    const expected = [{ id: 1, type: 'INFORMACIÓN', message: 'OK', date: '', read: false }];
    alertService.getAlerts.and.returnValue(expected as any);

    expect(service.getAlerts()).toBe(expected as any);
    expect(alertService.getAlerts).toHaveBeenCalled();
  });

  it('should delegate saveSignature to TraceService', () => {
    traceService.saveSignature.and.returnValue(true);

    expect(service.saveSignature('ORD-1', 'data-url')).toBeTrue();
    expect(traceService.saveSignature).toHaveBeenCalledWith('ORD-1', 'data-url');
  });
});
