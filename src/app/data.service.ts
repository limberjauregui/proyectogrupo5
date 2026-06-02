import { Injectable } from '@angular/core';
import { AlertService } from './services/alert.service';
import { OrderService } from './services/order.service';
import { ProductService } from './services/product.service';
import { SolicitudService } from './services/solicitud.service';
import { TraceService } from './services/trace.service';

export type StockState = 'CRÍTICO' | 'MEDIO' | 'SUFICIENTE';

export interface ProductItem {
  id: number;
  name: string;
  category: string;
  stock: number;
  price: number;
  code: string;
  minStock?: number;
  proveedor?: string;
  lote?: string;
  vencimiento?: string;
  requiereFrio?: boolean;
  imageUrl?: string;
}

export interface SolicitudItem {
  id: number;
  code: string;
  clienteId: string;
  items: { productId: number; qty: number }[];
  estado: 'Pendiente de aprobación' | 'Aprobada' | 'En preparación' | 'En camino' | 'Entregada' | 'Rechazada' | 'Cancelada';
  fecha: string;
  totalItems: number;
  stockDeducted?: boolean;
}

export interface OrderItem {
  id: number;
  code: string;
  clienteId: string;
  solicitudId?: number;
  estado: 'Pendiente' | 'En preparación' | 'En camino' | 'Llegué al punto' | 'Entregado' | 'Cancelado' | 'Incidencia';
  prioridad: 'Alta' | 'Media' | 'Baja';
  transportistaId?: string;
  fecha: string;
  destino?: string;
  fechaEntrega?: string;
  contactName?: string;
  contactPhone?: string;
  deliveryType?: 'Normal' | 'Refrigerado' | 'Urgente';
  requiresColdChain?: boolean;
  assignedVehicle?: string;
  assignedZone?: string;
  products?: { code: string; name: string; qty: number }[];
  cliente?: string;
  transportista?: string;
}

export interface Transportista {
  id: string;
  name: string;
  phone?: string;
}

export interface InventoryMovement {
  id: number;
  productId: number;
  delta: number;
  reason: string;
  date: string;
}

export interface AlertItem {
  id: number;
  type: 'CRÍTICA' | 'ADVERTENCIA' | 'INFORMACIÓN' | 'TEMPERATURA';
  message: string;
  related?: { type: 'pedido' | 'producto' | 'orden' | 'transportista' | 'vehículo' | 'reporte'; id: string };
  date: string;
  read?: boolean;
  severity?: 'ALTA' | 'MEDIA' | 'BAJA';
}

export interface TraceStep {
  id: number;
  orderCode: string;
  step: 'preparado' | 'recogido' | 'en ruta' | 'llegada' | 'entregado';
  timestamp: string;
  notes?: string;
}

export interface KpiItem {
  label: string;
  value: number;
  detail: string;
}

export interface DeliveryItem {
  id: number;
  address: string;
  status: 'Pendiente' | 'En ruta' | 'Entregado';
  eta: string;
  transportista: string;
}

@Injectable({
  providedIn: 'root',
})
export class DataService {
  constructor(
    private productService: ProductService,
    private orderService: OrderService,
    private solicitudService: SolicitudService,
    private alertService: AlertService,
    private traceService: TraceService
  ) {
    this.resetDataVersionIfNeeded();
  }

  // WARN-2: centralized data version reset — clears known mock keys when version changes
  private resetDataVersionIfNeeded(): void {
    const DATA_VERSION = 'v2.1';
    const stored = localStorage.getItem('data_version');
    if (stored !== DATA_VERSION) {
      const keys = [
        'mock_orders_v1',
        'mock_solicitudes_v1',
        'mock_products_v1',
        'mock_alerts_v1',
        'mock_trace_v1',
        'mock_signatures_v1',
        'mock_movements_v1',
        'mock_user_passwords_v1',
      ];
      for (const k of keys) localStorage.removeItem(k);
      localStorage.setItem('data_version', DATA_VERSION);
    }
  }

  getProducts() {
    return this.productService.getProducts();
  }

  getProductById(id: number) {
    return this.productService.getProductById(id);
  }

  findProductByCode(code: string) {
    return this.productService.findProductByCode(code);
  }

  addProduct(product: Partial<ProductItem>) {
    return this.productService.addProduct(product);
  }

  updateProduct(product: ProductItem) {
    return this.productService.updateProduct(product);
  }

  deleteProduct(productId: number) {
    return this.productService.deleteProduct(productId);
  }

  searchProducts(query: string) {
    return this.productService.searchProducts(query);
  }

  filterProductsByCategory(category: string) {
    return this.productService.filterProductsByCategory(category);
  }

  getStockState(product: ProductItem) {
    return this.productService.getStockState(product);
  }

  adjustStock(productId: number, delta: number, reason?: string) {
    return this.productService.adjustStock(productId, delta, reason);
  }

  getInventoryMovements() {
    return this.productService.getInventoryMovements();
  }

  createSolicitud(clienteId: string, items: { productId: number; qty: number }[]) {
    return this.solicitudService.createSolicitud(clienteId, items);
  }

  getSolicitudesByCliente(clienteId: string) {
    return this.solicitudService.getSolicitudesByCliente(clienteId);
  }

  getSolicitudes() {
    return this.solicitudService.getSolicitudes();
  }

  updateSolicitudStatus(id: number, status: SolicitudItem['estado']) {
    return this.solicitudService.updateSolicitudStatus(id, status);
  }

  getOrders() {
    return this.orderService.getOrders();
  }

  getOrdersForTransportista(transportistaId: string) {
    return this.orderService.getOrdersForTransportista(transportistaId);
  }

  createOrderFromSolicitud(solicitudId: number, prioridad: OrderItem['prioridad'] = 'Media', transportistaId?: string) {
    return this.orderService.createOrderFromSolicitud(solicitudId, prioridad, transportistaId);
  }

  createCustomOrder(order: Partial<OrderItem>) {
    return this.orderService.createCustomOrder(order);
  }

  updateOrderStatus(orderId: number, status?: OrderItem['estado']) {
    return this.orderService.updateOrderStatus(orderId, status);
  }

  updateOrderDetails(orderId: number, updates: Partial<OrderItem>) {
    return this.orderService.updateOrderDetails(orderId, updates);
  }

  deleteOrder(orderId: number) {
    return this.orderService.deleteOrder(orderId);
  }

  assignTransportista(orderId: number, transportistaId: string) {
    return this.orderService.assignTransportista(orderId, transportistaId);
  }

  getTransportistas() {
    return this.orderService.getTransportistas();
  }

  getUsers() {
    return this.orderService.getUsers();
  }

  findOrderByCode(code: string) {
    return this.orderService.findOrderByCode(code);
  }

  getKpis() {
    return this.orderService.getKpis();
  }

  getUrgentDeliveries() {
    return this.orderService.getUrgentDeliveries();
  }

  getDeliveries() {
    return this.orderService.getDeliveries();
  }

  getAlerts() {
    return this.alertService.getAlerts();
  }

  markAlertRead(alertId: number) {
    return this.alertService.markAlertRead(alertId);
  }

  deleteAlert(alertId: number) {
    return this.alertService.deleteAlert(alertId);
  }

  addAlert(alert: Partial<AlertItem>) {
    return this.alertService.addAlert(alert);
  }

  getTraceForOrder(orderCode: string) {
    return this.traceService.getTraceForOrder(orderCode);
  }

  addTraceStep(orderCode: string, step: TraceStep['step'], notes?: string) {
    return this.traceService.addTraceStep(orderCode, step, notes);
  }

  saveSignature(orderCode: string, dataUrl: string) {
    return this.traceService.saveSignature(orderCode, dataUrl);
  }

  getSignature(orderCode: string) {
    return this.traceService.getSignature(orderCode);
  }
}