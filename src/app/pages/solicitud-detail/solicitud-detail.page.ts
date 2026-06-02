import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonSelect, IonSelectOption, IonToast, IonBadge, IonChip } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { DataService, SolicitudItem, OrderItem, Transportista, ProductItem } from '../../data.service';
import { AuthService } from '../../auth.service';

interface ProductDetail {
  productId: number;
  qty: number;
  name?: string;
  code?: string;
  category?: string;
  price?: number;
}

interface StateHistory {
  estado: string;
  fecha: string;
}

@Component({
  selector: 'app-solicitud-detail',
  standalone: true,
  imports: [CommonModule, IonContent, IonHeader, IonToolbar, IonTitle, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonSelect, IonSelectOption, IonToast, IonBadge, IonChip, FormsModule],
  templateUrl: './solicitud-detail.page.html',
  styleUrls: ['./solicitud-detail.page.scss'],
})
export class SolicitudDetailPage implements OnInit {
  solicitud: SolicitudItem | null = null;
  linkedOrder: OrderItem | null = null;
  transportistas: Transportista[] = [];
  selectedTransportista?: string;
  toastOpen = false;
  toastMessage = '';
  productDetails: ProductDetail[] = [];
  stateHistory: StateHistory[] = [];
  products: ProductItem[] = [];

  constructor(private route: ActivatedRoute, private data: DataService, private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id')) || undefined;
    if (id) this.load(id);
    this.transportistas = this.data.getTransportistas();
    this.products = this.data.getProducts();
  }

  load(id: number) {
    const s = this.data.getSolicitudes().find((x) => x.id === id);
    if (!s) {
      this.toastMessage = 'Solicitud no encontrada';
      this.toastOpen = true;
      return;
    }
    this.solicitud = s;
    this.enrichProductDetails();
    this.loadStateHistory();
    this.loadLinkedOrder();
  }

  enrichProductDetails(): void {
    if (!this.solicitud) return;
    this.productDetails = this.solicitud.items.map((item) => {
      const product = this.products.find((p) => p.id === item.productId);
      return {
        productId: item.productId,
        qty: item.qty,
        name: product?.name,
        code: product?.code,
        category: product?.category,
        price: product?.price,
      };
    });
  }

  loadStateHistory(): void {
    if (!this.solicitud) return;
    // Simulamos un historial de cambios basado en el estado actual
    // En un caso real, esto vendría del backend
    const historyKey = `solicitud_history_${this.solicitud.id}`;
    try {
      const history = JSON.parse(localStorage.getItem(historyKey) || '[]') as StateHistory[];
      this.stateHistory = history.length > 0 ? history : [{ estado: this.solicitud.estado, fecha: this.solicitud.fecha }];
    } catch {
      this.stateHistory = [{ estado: this.solicitud.estado, fecha: this.solicitud.fecha }];
    }
  }

  isSupervisor(): boolean {
    return this.auth.role === 'supervisor';
  }

  isCliente(): boolean {
    return this.auth.role === 'cliente';
  }

  canCancel(): boolean {
    return this.isCliente() && this.solicitud?.estado === 'Pendiente de aprobación';
  }

  canConfirmDelivery(): boolean {
    return this.isCliente() && this.solicitud?.estado === 'Entregada';
  }

  canViewTraceability(): boolean {
    return this.isCliente() && !!this.linkedOrder;
  }

  private loadLinkedOrder(): void {
    if (!this.solicitud) {
      this.linkedOrder = null;
      return;
    }
    this.linkedOrder = this.data.getOrders().find((o) => o.solicitudId === this.solicitud?.id) ?? null;
  }

  getTransportistaName(): string {
    if (!this.linkedOrder?.transportistaId) {
      return 'No asignado';
    }
    return this.transportistas.find((t) => t.id === this.linkedOrder?.transportistaId)?.name || this.linkedOrder.transportistaId;
  }

  getOrderEta(): string {
    if (!this.linkedOrder?.fechaEntrega) {
      return 'No definida';
    }
    return new Date(this.linkedOrder.fechaEntrega).toLocaleString();
  }

  getStateColor(estado: string): string {
    switch (estado) {
      case 'Pendiente de aprobación':
        return 'warning';
      case 'Aprobada':
        return 'success';
      case 'En preparación':
        return 'warning';
      case 'En camino':
        return 'primary';
      case 'Entregada':
        return 'success';
      case 'Rechazada':
        return 'danger';
      case 'Cancelada':
        return 'medium';
      default:
        return 'medium';
    }
  }

  approve() {
    if (!this.solicitud) return;
    this.data.updateSolicitudStatus(this.solicitud.id, 'Aprobada');
    this.addToStateHistory('Aprobada');
    this.toastMessage = 'Solicitud aprobada';
    this.toastOpen = true;
    this.load(this.solicitud.id);
  }

  reject() {
    if (!this.solicitud) return;
    this.data.updateSolicitudStatus(this.solicitud.id, 'Rechazada');
    this.addToStateHistory('Rechazada');
    this.toastMessage = 'Solicitud rechazada';
    this.toastOpen = true;
    this.load(this.solicitud.id);
  }

  cancelSolicitud() {
    if (!this.solicitud) return;
    this.data.updateSolicitudStatus(this.solicitud.id, 'Cancelada');
    this.addToStateHistory('Cancelada');
    this.toastMessage = 'Solicitud cancelada';
    this.toastOpen = true;
    setTimeout(() => {
      this.router.navigateByUrl('/solicitudes');
    }, 1600);
  }

  confirmDelivery() {
    if (!this.solicitud) return;
    this.toastMessage = 'Recepción confirmada';
    this.toastOpen = true;
    // Aquí podría hacerse una firma digital, foto, etc.
  }

  viewTraceability() {
    if (!this.solicitud) return;
    // Navegar a la página de trazabilidad con la solicitud
    this.router.navigateByUrl(`/trazabilidad?solicitud=${this.solicitud.id}`);
  }

  assignTransportista() {
    if (!this.solicitud || !this.selectedTransportista) return;
    const order = this.data.createOrderFromSolicitud(this.solicitud.id, 'Media', this.selectedTransportista);
    if (order) {
      this.data.updateSolicitudStatus(this.solicitud.id, 'En camino');
      this.addToStateHistory('En camino');
      this.toastMessage = `Orden ${order.code} creada y asignada`;
      this.toastOpen = true;
      // Abrir la página de Órdenes pasando el código para que se muestre el modal
      this.router.navigate(['/ordenes'], { queryParams: { order: order.code } });
    }
  }

  private addToStateHistory(estado: string): void {
    if (!this.solicitud) return;
    const historyKey = `solicitud_history_${this.solicitud.id}`;
    try {
      const history = JSON.parse(localStorage.getItem(historyKey) || '[]') as StateHistory[];
      history.push({ estado, fecha: new Date().toISOString() });
      localStorage.setItem(historyKey, JSON.stringify(history));
    } catch {
      localStorage.setItem(historyKey, JSON.stringify([{ estado, fecha: new Date().toISOString() }]));
    }
  }

  getTotalAmount(): number {
    return this.productDetails.reduce((sum, item) => {
      const itemPrice = item.price || 0;
      return sum + itemPrice * item.qty;
    }, 0);
  }

  goBack() {
    this.router.navigateByUrl('/solicitudes');
  }
}
