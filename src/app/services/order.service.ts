import { Injectable } from '@angular/core';
import type { OrderItem, Transportista, KpiItem, DeliveryItem, TraceStep } from '../data.service';
import { AlertService } from './alert.service';
import { ProductService } from './product.service';
import { TraceService } from './trace.service';
import { SolicitudService } from './solicitud.service';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly ORDERS_KEY = 'mock_orders_v1';
  private orders: OrderItem[] = [];

  private transportistas: Transportista[] = [
    { id: 't1', name: 'Laura Rojas', phone: '+51 999 000 111' },
    { id: 't2', name: 'Carlos Medina', phone: '+51 999 000 222' },
    { id: 't3', name: 'Ana García', phone: '+51 999 000 333' },
  ];

  private users = [
    { id: 'admin', name: 'Supervisor', role: 'supervisor' },
    { id: 'driver', name: 'Transportista', role: 'transportista' },
    { id: 'cliente', name: 'Cliente demo', role: 'cliente' },
  ];

  constructor(
    private alertService: AlertService,
    private traceService: TraceService,
    private productService: ProductService,
    private solicitudService: SolicitudService
  ) {
    // reset handled centrally by DataService
    this.orders = this.loadOrders();
  }

  private resetIfVersionChanged(): void {
    // no-op: central data_version handling moved to DataService
  }

  private saveOrders(): void {
    localStorage.setItem(this.ORDERS_KEY, JSON.stringify(this.orders));
  }

  private loadOrders(): OrderItem[] {
    try {
      const raw = localStorage.getItem(this.ORDERS_KEY);

      if (!raw) {
        const defaultOrders: OrderItem[] = [
          {
            id: 201,
            code: 'ORD-1098',
            clienteId: 'cliente',
            solicitudId: 101,
            estado: 'En camino',
            prioridad: 'Alta',
            transportistaId: 'driver',
            fecha: new Date(Date.now() - 3600000 * 5).toISOString(),
            destino: 'Hospital Central de Emergencias, Av. Brasil 350',
            fechaEntrega: new Date(Date.now() + 3600000 * 2).toISOString(),
            contactName: 'Dra. Ana Salas',
            contactPhone: '987654321',
            deliveryType: 'Refrigerado',
            requiresColdChain: true,
            assignedVehicle: 'F-350 Refrigerada',
            assignedZone: 'Lima Sur',
            products: [
              { code: 'MSK-001', name: 'Mascarillas N95', qty: 5 },
              { code: 'ALC-003', name: 'Alcohol 70%', qty: 2 },
            ],
          },
          {
            id: 204,
            code: 'ORD-1120',
            clienteId: 'cliente',
            solicitudId: 102,
            estado: 'Pendiente',
            prioridad: 'Alta',
            transportistaId: 'driver',
            fecha: new Date(Date.now() - 3600000).toISOString(),
            destino: 'Clínica Metropolitana, Calle Comercio 250',
            fechaEntrega: new Date(Date.now() + 3600000 * 4).toISOString(),
            contactName: 'Sra. Victoria Núñez',
            contactPhone: '986112233',
            deliveryType: 'Refrigerado',
            requiresColdChain: true,
            assignedVehicle: 'F-350 Refrigerada',
            assignedZone: 'Lima Centro',
            products: [{ code: 'GLV-002', name: 'Guantes de nitrilo', qty: 10 }],
          },
          {
            id: 205,
            code: 'ORD-1121',
            clienteId: 'cliente',
            solicitudId: 103,
            estado: 'Entregado',
            prioridad: 'Media',
            transportistaId: 'driver',
            fecha: new Date(Date.now() - 3600000 * 48).toISOString(),
            destino: 'Farmacia La Salud, Jr. San Martín 89',
            fechaEntrega: new Date(Date.now() - 3600000 * 42).toISOString(),
            contactName: 'Sr. Ricardo López',
            contactPhone: '987001122',
            deliveryType: 'Normal',
            requiresColdChain: false,
            assignedVehicle: 'F-350 Refrigerada',
            assignedZone: 'Lima Norte',
            products: [{ code: 'JRG-004', name: 'Jeringas 5ml', qty: 12 }],
          },
          {
            id: 206,
            code: 'ORD-1122',
            clienteId: 'cliente',
            solicitudId: 104,
            estado: 'En preparación',
            prioridad: 'Media',
            transportistaId: 'driver',
            fecha: new Date(Date.now() - 3600000 * 3).toISOString(),
            destino: 'Laboratorio Biológico del Sur, Av. Costanera 567',
            fechaEntrega: new Date(Date.now() + 3600000 * 8).toISOString(),
            products: [
              { code: 'BTQ-010', name: 'Botiquín básico', qty: 3 },
              { code: 'MSK-001', name: 'Mascarillas N95', qty: 8 },
            ],
          },
        ];

        localStorage.setItem(this.ORDERS_KEY, JSON.stringify(defaultOrders));
        return defaultOrders;
      }

      return JSON.parse(raw) as OrderItem[];
    } catch {
      return [];
    }
  }

  getOrders(): OrderItem[] {
    return this.orders.map((order) => ({
      ...order,
      cliente: this.users.find((user) => user.id === order.clienteId)?.name ?? order.clienteId,
      transportista:
        this.transportistas.find((driver) => driver.id === order.transportistaId)?.name ??
        order.transportistaId ??
        '',
    }));
  }

  // A2: FIX - Unify enrichment logic: both methods now enrich with cliente + transportista names
  getOrdersForTransportista(transportistaId: string): OrderItem[] {
    return this.orders
      .filter((order) => order.transportistaId === transportistaId)
      .map((order) => ({
        ...order,
        cliente: this.users.find((user) => user.id === order.clienteId)?.name ?? order.clienteId,
        transportista:
          this.transportistas.find((driver) => driver.id === order.transportistaId)?.name ??
          order.transportistaId ??
          '',
      }));
  }

  createOrderFromSolicitud(
    solicitudId: number,
    prioridad: OrderItem['prioridad'] = 'Media',
    transportistaId?: string
  ): OrderItem | null {
    const solicitud = this.solicitudService.getSolicitudes().find((item) => item.id === solicitudId);

    if (!solicitud) {
      return null;
    }

    const id = Date.now();
    const code = `ORD-${id.toString().slice(-6)}`;

    const order: OrderItem = {
      id,
      code,
      clienteId: solicitud.clienteId,
      solicitudId,
      estado: 'Pendiente',
      prioridad,
      transportistaId,
      fecha: new Date().toISOString(),
    };

    this.orders.unshift(order);
    this.saveOrders();

    this.traceService.addTraceStep(order.code, 'preparado', 'Orden creada desde solicitud');
    return order;
  }

  createCustomOrder(order: Partial<OrderItem>): OrderItem {
    const id = Date.now();
    const code = `ORD-${id.toString().slice(-6)}`;

    const newOrder: OrderItem = {
      id,
      code,
      clienteId: order.clienteId || 'cliente',
      estado: order.estado || 'Pendiente',
      prioridad: order.prioridad || 'Media',
      transportistaId: order.transportistaId || 't1',
      fecha: new Date().toISOString(),
      destino: order.destino || 'Av. Javier Prado 1010',
      fechaEntrega: order.fechaEntrega || new Date(Date.now() + 86400000).toISOString(),
      products: order.products || [],
    };

    this.orders.unshift(newOrder);
    this.saveOrders();

    const step: TraceStep['step'] =
      newOrder.estado === 'En camino'
        ? 'en ruta'
        : newOrder.estado === 'Entregado'
          ? 'entregado'
          : 'preparado';

    this.traceService.addTraceStep(newOrder.code, step, `Orden creada manualmente. Estado inicial: ${newOrder.estado}`);

    return newOrder;
  }

  updateOrderStatus(orderId: number, status?: OrderItem['estado']): OrderItem | null {
    const order = this.orders.find((item) => item.id === orderId);

    if (!order) {
      return null;
    }

    if (status) {
      order.estado = status;
    } else {
      if (order.estado === 'Pendiente') order.estado = 'En preparación';
      else if (order.estado === 'En preparación') order.estado = 'En camino';
      else if (order.estado === 'En camino') order.estado = 'Entregado';
    }

    this.saveOrders();

    const step: TraceStep['step'] =
      order.estado === 'Entregado'
        ? 'entregado'
        : order.estado === 'En camino'
          ? 'en ruta'
          : order.estado === 'Llegué al punto'
            ? 'llegada'
            : 'preparado';

    this.traceService.addTraceStep(order.code, step, `Estado cambiado a ${order.estado}`);

    return order;
  }

  updateOrderDetails(orderId: number, updates: Partial<OrderItem>): OrderItem | null {
    const order = this.orders.find((item) => item.id === orderId);

    if (!order) {
      return null;
    }

    if (updates.prioridad) order.prioridad = updates.prioridad;
    if (updates.transportistaId !== undefined) order.transportistaId = updates.transportistaId;
    if (updates.destino) order.destino = updates.destino;
    if (updates.fechaEntrega) order.fechaEntrega = updates.fechaEntrega;

    this.saveOrders();
    return order;
  }

  deleteOrder(orderId: number): boolean {
    const index = this.orders.findIndex((item) => item.id === orderId);

    if (index === -1) {
      return false;
    }

    const [removed] = this.orders.splice(index, 1);
    this.saveOrders();
    this.traceService.removeTracesForOrder(removed.code);

    return true;
  }

  assignTransportista(orderId: number, transportistaId: string): OrderItem | null {
    const order = this.orders.find((item) => item.id === orderId);

    if (!order) {
      return null;
    }

    order.transportistaId = transportistaId;
    this.saveOrders();

    return order;
  }

  getTransportistas(): Transportista[] {
    return [...this.transportistas];
  }

  getUsers() {
    return [...this.users];
  }

  findOrderByCode(code: string): OrderItem | undefined {
    return this.orders.find((order) => order.code === code);
  }

  getKpis(): KpiItem[] {
    const activeOrders = this.orders.filter((order) =>
      ['Pendiente', 'En preparación', 'En camino'].includes(order.estado)
    ).length;

    const completedOrders = this.orders.filter((order) => order.estado === 'Entregado').length;

    const criticalAlerts = this.alertService
      .getAlerts()
      .filter((alert) => alert.type === 'CRÍTICA' && !alert.read).length;

    const urgentProducts = this.productService
      .getProducts()
      .filter((product) => this.productService.getStockState(product) === 'CRÍTICO').length;

    return [
      { label: 'ÓRDENES ACTIVAS', value: activeOrders, detail: 'Pendientes y en ruta' },
      { label: 'ENTREGAS COMPLETADAS', value: completedOrders, detail: 'Últimos registros' },
      { label: 'ALERTAS CRÍTICAS', value: criticalAlerts, detail: 'Requieren atención' },
      { label: 'PRODUCTOS URGENTES', value: urgentProducts, detail: 'Bajo stock' },
    ];
  }

  getUrgentDeliveries(): DeliveryItem[] {
    return this.orders
      .filter((order) => order.estado !== 'Entregado' && order.estado !== 'Cancelado' && order.prioridad === 'Alta')
      .sort((a, b) => {
        const aTime = a.fechaEntrega ? new Date(a.fechaEntrega).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.fechaEntrega ? new Date(b.fechaEntrega).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      })
      .slice(0, 3)
      .map((order) => ({
        id: order.id,
        address: order.destino || 'Destino no registrado',
        status: order.estado === 'En camino' ? 'En ruta' : order.estado === 'Entregado' ? 'Entregado' : 'Pendiente',
        eta: this.formatEta(order.fechaEntrega),
        transportista:
          this.transportistas.find((driver) => driver.id === order.transportistaId)?.name ||
          order.transportista ||
          'Sin asignar',
      }));
  }

  getDeliveries(): DeliveryItem[] {
    return this.orders.map((order) => ({
      id: order.id,
      address: order.destino || 'Destino no registrado',
      status: order.estado === 'En camino' ? 'En ruta' : order.estado === 'Entregado' ? 'Entregado' : 'Pendiente',
      eta: this.formatEta(order.fechaEntrega),
      transportista:
        this.transportistas.find((driver) => driver.id === order.transportistaId)?.name ||
        order.transportista ||
        'Sin asignar',
    }));
  }

  private formatEta(fechaEntrega?: string): string {
    if (!fechaEntrega) {
      return 'N/A';
    }

    const eta = new Date(fechaEntrega);
    const diff = eta.getTime() - Date.now();

    if (diff <= 0) {
      return 'Retrasado';
    }

    const minutes = Math.round(diff / 60000);

    if (minutes < 60) {
      return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;

    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
  }
}