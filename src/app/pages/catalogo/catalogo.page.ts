import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonToast,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { IonInput, IonSearchbar } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth.service';
import { DataService, ProductItem } from '../../data.service';

@Component({
  selector: 'app-catalogo',
  templateUrl: './catalogo.page.html',
  styleUrls: ['./catalogo.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonButton,
    IonIcon,
    IonToast,
    IonInput,
    IonSearchbar,
    FormsModule,
    CommonModule,
  ],
})
export class CatalogoPage implements OnInit {
  products: ProductItem[] = [];
  filtered: ProductItem[] = [];
  categories: string[] = [];
  search = '';
  selectedCategory = '';
  // cart: productId -> qty
  cart: Record<number, number> = {};
  toastOpen = false;
  toastMessage = '';

  constructor(public authService: AuthService, private dataService: DataService, private router: Router) {}

  ngOnInit() {
    this.products = this.dataService.getProducts();
    this.filtered = [...this.products];
    this.categories = Array.from(new Set(this.products.map((p) => p.category)));
  }

  get isCliente(): boolean {
    return this.authService.role === 'cliente';
  }

  getActionLabel(): string {
    return this.isCliente ? 'Solicitar' : 'Ver inventario';
  }

  onAction(product: ProductItem): void {
    if (!this.isCliente) {
      this.router.navigateByUrl('/inventario', { replaceUrl: true });
      return;
    }

    const current = this.cart[product.id] ?? 0;
    if (current <= 0) {
      this.toastMessage = 'Ingresa una cantidad válida antes de agregar al resumen';
      this.toastOpen = true;
      return;
    }

    if (current > product.stock) {
      this.toastMessage = `Stock insuficiente para ${product.name}`;
      this.toastOpen = true;
      return;
    }

    this.toastMessage = `${product.name} agregado al resumen (${current})`;
    this.toastOpen = true;
  }

  onQtyChange(product: ProductItem, qty: number) {
    const value = Math.floor(Number(qty) || 0);
    if (value <= 0) {
      delete this.cart[product.id];
    } else if (value > product.stock) {
      this.cart[product.id] = product.stock;
    } else {
      this.cart[product.id] = value;
    }
  }

  get cartCount(): number {
    return Object.values(this.cart).reduce((s, v) => s + v, 0);
  }

  applySearch() {
    const q = this.search.trim().toLowerCase();
    this.filtered = this.products.filter((p) => {
      const matchesCat = this.selectedCategory ? p.category === this.selectedCategory : true;
      const matchesQ = !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }

  clearFilters() {
    this.search = '';
    this.selectedCategory = '';
    this.applySearch();
  }

  openResumen() {
    if (!this.authService.username) {
      this.toastMessage = 'Debes iniciar sesión como cliente para solicitar';
      this.toastOpen = true;
      return;
    }

    const items = Object.entries(this.cart).map(([id, qty]) => ({ productId: Number(id), qty }));
    if (items.length === 0) {
      this.toastMessage = 'El resumen está vacío';
      this.toastOpen = true;
      return;
    }

    const insufficient = items.filter((it) => {
      const p = this.dataService.getProductById(it.productId);
      return !p || it.qty > p.stock;
    });
    if (insufficient.length) {
      const names = insufficient
        .map((it) => this.dataService.getProductById(it.productId)?.name ?? it.productId)
        .join(', ');
      this.toastMessage = `Stock insuficiente para: ${names}`;
      this.toastOpen = true;
      return;
    }

    const solicitud = this.dataService.createSolicitud(this.authService.username ?? 'cliente', items);
    this.products = this.dataService.getProducts();
    this.applySearch();
    this.cart = {};
    this.toastMessage = `Solicitud ${solicitud.code} registrada correctamente`;    
    this.toastOpen = true;
  }
}
