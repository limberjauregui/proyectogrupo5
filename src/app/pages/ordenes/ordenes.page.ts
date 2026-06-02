import { Component, OnInit, ViewChild, ChangeDetectionStrategy, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonButton,
  IonToast,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonModal,
  IonAlert,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  qrCodeOutline,
  downloadOutline,
  listOutline,
  gridOutline,
  albumsOutline,
  searchOutline,
  chevronDownOutline,
  alertCircleOutline,
  trashOutline,
  calendarOutline,
  locationOutline,
  cubeOutline,
  timeOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
} from 'ionicons/icons';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../auth.service';
import { DataService, OrderItem, TraceStep } from '../../data.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-ordenes',
  templateUrl: './ordenes.page.html',
  styleUrls: ['./ordenes.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonButton,
    IonToast,
    IonIcon,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonModal,
    IonAlert,
    IonInput,
    IonSelect,
    IonSelectOption,
    FormsModule,
    CommonModule,
  ],
})
export class OrdenesPage implements OnInit {
  orders: OrderItem[] = [];
  toastOpen = false;
  toastMessage = '';
  // filters
  search = '';
  statusFilter: string = 'Todos';
  priorityFilter: string = 'Todos';
  transportistas: any[] = [];
  // modal detail
  selectedOrder: OrderItem | null = null;
  traceSteps: TraceStep[] = [];

  showDeleteConfirm = false;
  orderToDelete: OrderItem | null = null;

  private destroyRef = inject(DestroyRef);

  constructor(public authService: AuthService, private dataService: DataService, private route: ActivatedRoute, private router: Router) {
    addIcons({
      addOutline, qrCodeOutline, downloadOutline, listOutline, gridOutline, albumsOutline,
      searchOutline, chevronDownOutline, alertCircleOutline, trashOutline,
      calendarOutline, locationOutline, cubeOutline, timeOutline, checkmarkCircleOutline, closeCircleOutline,
    });
  }

  ngOnInit() {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const orderCode = params['order'] as string | undefined;
      this.loadOrders(orderCode);
    });
  }

  loadOrders(orderCode?: string) {
    this.orders = this.dataService.getOrders();
    this.transportistas = this.dataService.getTransportistas();
    if (orderCode) {
      const selected = this.orders.find((o) => o.code === orderCode);
      if (selected) {
        this.openOrderDetail(selected);
      }
    }
  }

  get visibleOrders(): OrderItem[] {
    let list = [...this.orders];
    // role filter
    if (this.authService.role === 'transportista') {
      const userId = this.authService.username ?? '';
      list = list.filter((order) => order.transportistaId === userId);
    }
    // search
    if (this.search.trim()) {
      const q = this.search.toLowerCase();
      list = list.filter((o) => (o.code + ' ' + (o.cliente ?? '')).toLowerCase().includes(q));
    }
    // status filter
    if (this.statusFilter !== 'Todos') list = list.filter((o) => o.estado === this.statusFilter);
    if (this.priorityFilter !== 'Todos') list = list.filter((o) => o.prioridad === this.priorityFilter);
    return list;
  }

  get isSupervisor(): boolean {
    return this.authService.role === 'supervisor';
  }

  get isTransportista(): boolean {
    return this.authService.role === 'transportista';
  }

  countByStatus(status: string): number {
    return this.orders.filter(o => o.estado === status).length;
  }

  changeStatus(order: OrderItem): void {
    const next = this.dataService.updateOrderStatus(order.id);
    if (next) {
      this.toastMessage = `Estado actualizado: ${next.code} → ${next.estado}`;
      this.toastOpen = true;
      this.loadOrders();
    }
  }

  setStatus(order: OrderItem, status: OrderItem['estado']) {
    const updated = this.dataService.updateOrderStatus(order.id, status);
    if (updated) {
      this.toastMessage = `Estado puesto: ${updated.code} → ${updated.estado}`;
      this.toastOpen = true;
      this.loadOrders();
    }
  }

  assignTransportista(order: OrderItem, transportistaId: string) {
    const updated = this.dataService.assignTransportista(order.id, transportistaId);
    if (updated) {
      this.toastMessage = `Transportista asignado a ${updated.code}`;
      this.toastOpen = true;
      this.loadOrders();
    }
  }

  exportOrders() {
    const csv = this.generateOrdersCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ordenes_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    this.toastMessage = 'Exportación CSV descargada';
    this.toastOpen = true;
  }

  private generateOrdersCSV(): string {
    const headers = ['Código', 'Cliente', 'Estado', 'Prioridad', 'Transportista', 'Fecha'];
    const rows = this.visibleOrders.map(o => [
      o.code,
      o.cliente || 'N/A',
      o.estado,
      o.prioridad,
      o.transportista || 'No asignado',
      new Date(o.fecha).toLocaleDateString(),
    ]);
    return [headers, ...rows].map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  getStatusClass(status: string): string {
      return status === 'Pendiente' ? 'status-pendiente' :
        status === 'En preparación' ? 'status-preparacion' :
        status === 'En camino' ? 'status-ruta' :
        status === 'Llegué al punto' ? 'status-llegada' :
        status === 'Entregado' ? 'status-completado' :
        status === 'Incidencia' ? 'status-incidencia' : 'status-cancelado';
  }

  canPerformDriverAction(order: OrderItem): boolean {
    return this.isTransportista && order.transportistaId === this.authService.username && order.estado !== 'Entregado';
  }

  getDriverActionLabel(order: OrderItem): string {
    if (order.estado === 'Pendiente') return 'Iniciar entrega';
    if (order.estado === 'En preparación') return 'Comenzar ruta';
    if (order.estado === 'En camino') return 'Marcar llegada';
    if (order.estado === 'Llegué al punto') return 'Confirmar entrega';
    return 'Actualizar estado';
  }

  getEta(order: OrderItem): string {
    if (!order.fechaEntrega) return 'N/A';
    const now = new Date();
    const eta = new Date(order.fechaEntrega);
    const diff = eta.getTime() - now.getTime();
    if (diff < 0) return 'Retrasado';
    const mins = Math.round(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    return `${hours}h`;
  }

  quickAction(event: Event, order: OrderItem, action: string): void {
    event.stopPropagation();
    if (action === 'detail') {
      this.openOrderDetail(order);
    }
  }

  performDriverAction(eventOrOrder: Event | OrderItem, maybeOrder?: OrderItem): void {
    // Support calls from templates that pass either (event, order) or just (order)
    let order: OrderItem | undefined;
    if ((eventOrOrder as any)?.code && !maybeOrder) {
      order = eventOrOrder as OrderItem;
    } else {
      try { (eventOrOrder as Event).stopPropagation(); } catch {}
      order = maybeOrder as OrderItem;
    }
    if (!order) return;
    let message = '';
    if (order.estado === 'Pendiente') {
      this.dataService.updateOrderStatus(order.id, 'En preparación');
      message = `Orden ${order.code} en preparación`;
    } else if (order.estado === 'En preparación') {
      this.dataService.updateOrderStatus(order.id, 'En camino');
      message = `Ruta iniciada para ${order.code}`;
    } else if (order.estado === 'En camino') {
      this.dataService.updateOrderStatus(order.id, 'Llegué al punto');
      message = `Llegada registrada para ${order.code}`;
    } else if (order.estado === 'Llegué al punto') {
      this.dataService.updateOrderStatus(order.id, 'Entregado');
      message = `Entrega confirmada para ${order.code}`;
    } else {
      this.dataService.updateOrderStatus(order.id);
      message = `Estado actualizado para ${order.code}`;
    }
    this.toastMessage = message;
    this.toastOpen = true;
    this.loadOrders(order.code);
  }

  startRoute(order: OrderItem): void {
    this.dataService.updateOrderStatus(order.id, 'En camino');
    this.toastMessage = `Ruta iniciada para ${order.code}`;
    this.toastOpen = true;
    this.loadOrders(order.code);
  }

  arrivedAtPoint(order: OrderItem): void {
    this.dataService.updateOrderStatus(order.id, 'Llegué al punto');
    this.toastMessage = `Se registró llegada para ${order.code}`;
    this.toastOpen = true;
    this.loadOrders(order.code);
  }

  completeDelivery(order: OrderItem): void {
    this.dataService.updateOrderStatus(order.id, 'Entregado');
    this.toastMessage = `Entrega completada para ${order.code}`;
    this.toastOpen = true;
    this.loadOrders(order.code);
  }

  registerSignature(order: OrderItem): void {
    // updateOrderStatus will add the canonical trace step, avoid duplicating
    this.toastMessage = `Firma registrada para ${order.code}`;
    this.toastOpen = true;
    this.loadOrders(order.code);
  }

  getPriorityClass(priority: string): string {
    return priority === 'Alta' ? 'priority-alta' :
           priority === 'Media' ? 'priority-media' : 'priority-baja';
  }

  openOrderDetail(order: OrderItem) {
    // Load the freshest order record from DataService to ensure all fields are present
    const fresh = this.dataService.getOrders().find((o) => o.code === order.code);
    this.selectedOrder = fresh ? { ...fresh } : { ...order };
    this.traceSteps = this.dataService.getTraceForOrder(this.selectedOrder.code);
  }

  closeOrderDetail() {
    this.selectedOrder = null;
    this.traceSteps = [];
  }

  getClienteNombre(order: OrderItem): string {
    if (order.cliente) {
      return order.cliente;
    }
    const match = this.dataService.getOrders().find((o) => o.code === order.code);
    return match?.cliente || order.clienteId || 'Cliente demo';
  }

  getTransportistaNombre(order: OrderItem): string {
    if (order.transportista) {
      return order.transportista;
    }
    const match = this.dataService.getOrders().find((o) => o.code === order.code);
    return match?.transportista || order.transportistaId || 'Sin asignar';
  }

  getDeliveryTypeLabel(order: OrderItem): string {
    return order.deliveryType ? order.deliveryType : 'No especificado';
  }

  getStepIcon(step: TraceStep['step']): string {
    return step === 'preparado' ? 'cube-outline' :
           step === 'recogido' ? 'checkmark-circle-outline' :
           step === 'en ruta' ? 'location-outline' :
           step === 'llegada' ? 'time-outline' : 'checkmark-circle-outline';
  }

  reportIssue(order: OrderItem) {
    this.dataService.addAlert({
      type: 'CRÍTICA',
      message: `Incidencia reportada en ${order.code}`,
      related: { type: 'orden', id: order.code },
      read: false,
    });
    // marcar estado como Incidencia — updateOrderStatus añadirá la trazabilidad correspondiente
    this.dataService.updateOrderStatus(order.id, 'Incidencia');
    this.toastMessage = `Incidencia registrada para ${order.code}`;
    this.toastOpen = true;
  }

  goToTrazabilidad(order: OrderItem, action?: string) {
    const params: any = { order: order.code };
    if (action) params.action = action;
    this.router.navigate(['/trazabilidad'], { queryParams: params });
  }

  scanQr() {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      this.router.navigate(['/scanner']);
      return;
    }

    const code = window.prompt('Ingrese el código de la orden a escanear (por ejemplo ORD-1098)');
    if (!code) {
      this.toastMessage = 'Escaneo cancelado';
      this.toastOpen = true;
      return;
    }
    const order = this.orders.find((o) => o.code.toLowerCase() === code.trim().toLowerCase());
    if (!order) {
      this.toastMessage = `Orden no encontrada: ${code}`;
      this.toastOpen = true;
      return;
    }
    this.openOrderDetail(order);
    this.toastMessage = `Orden ${order.code} detectada`;
    this.toastOpen = true;
  }

  getQRCode(orderCode: string): string {
    return `█████████████████████${orderCode.slice(-4)}█████████████████`;
  }

  // --- Create / Edit Order Logic ---
  isEditMode = false;
  showCreateModal = false;
  editingOrder: any = {
    clienteId: '',
    prioridad: 'Media',
    transportistaId: ''
  };

  openCreateModal() {
    this.isEditMode = false;
    this.editingOrder = { clienteId: 'cliente', prioridad: 'Media', transportistaId: '' };
    this.showCreateModal = true;
  }

  openEditModal(order: OrderItem) {
    this.isEditMode = true;
    this.editingOrder = { 
      id: order.id,
      clienteId: order.clienteId || 'cliente', 
      prioridad: order.prioridad, 
      transportistaId: order.transportistaId || ''
    };
    this.showCreateModal = true;
  }

  closeCreateModal() {
    this.showCreateModal = false;
  }

  saveOrder() {
    if (this.isEditMode && this.editingOrder.id) {
      const updated = this.dataService.updateOrderDetails(this.editingOrder.id, {
        prioridad: this.editingOrder.prioridad,
        transportistaId: this.editingOrder.transportistaId || undefined,
      });
      if (updated) {
        this.toastMessage = `Orden ${updated.code} actualizada`;
      }
    } else {
      const newOrder = this.dataService.createCustomOrder({
        clienteId: this.editingOrder.clienteId,
        prioridad: this.editingOrder.prioridad,
        transportistaId: this.editingOrder.transportistaId || undefined,
      });
      this.toastMessage = `Orden ${newOrder.code} creada`;
    }
    this.loadOrders();
    this.closeCreateModal();
    this.toastOpen = true;
  }

  deleteOrder(order: OrderItem) {
    this.orderToDelete = order;
    this.showDeleteConfirm = true;
  }

  confirmDeleteOrder() {
    if (!this.orderToDelete) return;
    const deleted = this.dataService.deleteOrder(this.orderToDelete.id);
    this.toastMessage = deleted
      ? `Orden ${this.orderToDelete.code} eliminada`
      : `No se pudo eliminar la orden ${this.orderToDelete.code}`;
    this.toastOpen = true;
    this.showDeleteConfirm = false;
    this.orderToDelete = null;
    if (deleted) { this.loadOrders(); this.closeOrderDetail(); }
  }

  cancelDeleteOrder() {
    this.showDeleteConfirm = false;
    this.orderToDelete = null;
  }
}
