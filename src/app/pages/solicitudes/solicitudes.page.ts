import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonList, IonItem, IonLabel, IonButton, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonSelect, IonSelectOption, IonToast, IonSearchbar, IonBadge, IonChip, IonIcon, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth.service';
import { DataService, SolicitudItem, ProductItem } from '../../data.service';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';

@Component({
  selector: 'app-solicitudes',
  standalone: true,
  imports: [CommonModule, RouterModule, IonContent, IonHeader, IonToolbar, IonTitle, IonList, IonItem, IonLabel, IonButton, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonSelect, IonSelectOption, IonToast, IonSearchbar, IonBadge, IonChip, IonIcon, IonRefresher, IonRefresherContent, FormsModule],
  templateUrl: './solicitudes.page.html',
  styleUrls: ['./solicitudes.page.scss'],
})
export class SolicitudesPage implements OnInit {
  solicitudes: SolicitudItem[] = [];
  filtered: SolicitudItem[] = [];
  estadoFilter: SolicitudItem['estado'] | 'Todos' = 'Todos';
  searchText: string = '';
  expandedId: number | null = null;
  toastOpen = false;
  toastMessage = '';
  productos: ProductItem[] = [];

  constructor(private auth: AuthService, private data: DataService, private router: Router) {
    addIcons({ chevronForwardOutline });
  }

  ngOnInit(): void {
    this.load();
    this.productos = this.data.getProducts();
  }

  load() {
    if (!this.auth.username) {
      this.solicitudes = [];
      this.filtered = [];
      return;
    }
    // BUG-5: supervisors must see all solicitudes; clients see only their own
    if (this.auth.role === 'supervisor') {
      this.solicitudes = this.data.getSolicitudes();
    } else {
      this.solicitudes = this.data.getSolicitudesByCliente(this.auth.username);
    }
    this.applyFilter();
  }

  applyFilter() {
    let result = [...this.solicitudes];

    // Filtrar por estado
    if (this.estadoFilter !== 'Todos') {
      result = result.filter((s) => s.estado === this.estadoFilter);
    }

    // Filtrar por búsqueda (código o producto)
    if (this.searchText.trim()) {
      const query = this.searchText.toLowerCase();
      result = result.filter((s) => {
        const codigoMatch = s.code.toLowerCase().includes(query);
        const productMatch = s.items.some((item) => {
          const product = this.productos.find((p) => p.id === item.productId);
          return product && (product.name.toLowerCase().includes(query) || product.code.toLowerCase().includes(query));
        });
        return codigoMatch || productMatch;
      });
    }

    this.filtered = result;
  }

  onSearchChange() {
    this.applyFilter();
  }

  onFilterChange() {
    this.applyFilter();
  }

  toggleExpand(id: number) {
    this.expandedId = this.expandedId === id ? null : id;
  }

  viewDetail(s: SolicitudItem) {
    this.router.navigateByUrl(`/solicitud/${s.id}`);
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

  getProductName(productId: number): string {
    const product = this.productos.find((p) => p.id === productId);
    return product ? product.name : `Producto ${productId}`;
  }

  refresh(event: any) {
    this.load();
    this.toastMessage = 'Solicitudes actualizadas';
    this.toastOpen = true;
    setTimeout(() => event.detail.complete(), 500);
  }

  canCancelSolicitud(s: SolicitudItem): boolean {
    return s.estado === 'Pendiente de aprobación';
  }

  cancelSolicitud(s: SolicitudItem) {
    if (!this.canCancelSolicitud(s)) return;
    this.data.updateSolicitudStatus(s.id, 'Cancelada');
    this.toastMessage = 'Solicitud cancelada';
    this.toastOpen = true;
    this.load();
  }
}
