import { TestBed } from '@angular/core/testing';
import { AlertService } from './alert.service';
import { ProductService } from './product.service';
import { SolicitudService } from './solicitud.service';
import { TraceService } from './trace.service';
import { OrderService } from './order.service';

describe('OrderService', () => {
  let service: OrderService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [AlertService, ProductService, SolicitudService, TraceService, OrderService],
    });
    service = TestBed.inject(OrderService);
  });

  it('should be created and load default orders', () => {
    expect(service).toBeTruthy();
    expect(service.getOrders().length).toBeGreaterThan(0);
  });

  it('should create a custom order with default transportista', () => {
    const order = service.createCustomOrder({ clienteId: 'cliente', destino: 'Prueba', products: [] });
    expect(order).toBeTruthy();
    expect(order.transportistaId).toBe('t1');
    expect(service.findOrderByCode(order.code)).toEqual(order);
  });

  it('should advance order status from Pendiente to En preparación to En camino to Entregado', () => {
    const order = service.createCustomOrder({ clienteId: 'cliente', products: [] });
    expect(order.estado).toBe('Pendiente');
    expect(service.updateOrderStatus(order.id)?.estado).toBe('En preparación');
    expect(service.updateOrderStatus(order.id)?.estado).toBe('En camino');
    expect(service.updateOrderStatus(order.id)?.estado).toBe('Entregado');
  });

  it('should delete an order and remove it from the list', () => {
    const order = service.createCustomOrder({ clienteId: 'cliente', products: [] });
    expect(service.deleteOrder(order.id)).toBeTrue();
    expect(service.findOrderByCode(order.code)).toBeUndefined();
  });

  it('should return orders for a transportista', () => {
    const orders = service.getOrdersForTransportista('driver');
    expect(orders.every((item) => item.transportistaId === 'driver')).toBeTrue();
  });

  it('should return empty array for unknown transportista', () => {
    expect(service.getOrdersForTransportista('ghost_xyz')).toEqual([]);
  });

  it('should assign a transportista to an order', () => {
    const order = service.createCustomOrder({ clienteId: 'cliente', products: [] });
    service.assignTransportista(order.id, 't2');
    expect(service.findOrderByCode(order.code)?.transportistaId).toBe('t2');
  });

  it('should set a specific status when provided', () => {
    const order = service.createCustomOrder({ clienteId: 'cliente', products: [] });
    service.updateOrderStatus(order.id, 'Cancelado');
    expect(service.findOrderByCode(order.code)?.estado).toBe('Cancelado');
  });

  it('should return null when updating non-existent order', () => {
    expect(service.updateOrderStatus(999999)).toBeNull();
  });

  it('should return transportistas with required fields', () => {
    const ts = service.getTransportistas();
    expect(ts.length).toBeGreaterThan(0);
    ts.forEach(t => { expect(t.id).toBeTruthy(); expect(t.name).toBeTruthy(); });
  });

  it('should generate 4 KPI items', () => {
    const kpis = service.getKpis();
    expect(kpis.length).toBe(4);
    kpis.forEach(k => { expect(k.label).toBeTruthy(); expect(typeof k.value).toBe('number'); });
  });

  it('should update order details without changing status', () => {
    const order = service.createCustomOrder({ clienteId: 'cliente', products: [] });
    service.updateOrderDetails(order.id, { destino: 'Hospital Test' });
    expect(service.findOrderByCode(order.code)?.destino).toBe('Hospital Test');
    expect(service.findOrderByCode(order.code)?.estado).toBe('Pendiente');
  });

  it('should return false when deleting non-existent order', () => {
    expect(service.deleteOrder(999999)).toBeFalse();
  });
});
