import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonIcon,
  IonButton,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonToast,
  IonModal,
  IonAlert,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  qrCodeOutline,
  addOutline,
  downloadOutline,
  searchOutline,
  chevronDownOutline,
  pencilOutline,
  trashOutline,
  addCircleOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
} from 'ionicons/icons';
import { DataService, ProductItem, InventoryMovement, StockState } from '../../data.service';

@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.page.html',
  styleUrls: ['./inventario.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonIcon,
    IonButton,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonToast,
    IonModal,
    IonAlert,
    IonInput,
    IonSelect,
    IonSelectOption,
    FormsModule,
    CommonModule,
  ],
})
export class InventarioPage implements OnInit {
  products: ProductItem[] = [];
  filtered: ProductItem[] = [];
  toastOpen = false;
  toastMessage = '';
  
  // filters
  search = '';
  categoryFilter = '';
  stockStateFilter = '';
  categories: string[] = [];
  
  // modal for edit/create
  showEditModal = false;
  editingProduct: ProductItem | null = null;
  editForm: Partial<ProductItem> = {};
  
  // movements detail
  showMovementsModal = false;
  selectedProductId: number | null = null;
  movements: InventoryMovement[] = [];
  
  // adjustment
  showAdjustModal = false;
  adjustProduct: ProductItem | null = null;
  adjustDelta = 0;
  adjustReason = '';

  showDeleteProductConfirm = false;
  productToDelete: ProductItem | null = null;

  constructor(private dataService: DataService) {
    addIcons({
      qrCodeOutline, addOutline, downloadOutline, searchOutline,
      chevronDownOutline, pencilOutline, trashOutline, addCircleOutline,
      checkmarkCircleOutline, closeCircleOutline,
    });
  }

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    this.products = this.dataService.getProducts();
    this.filtered = [...this.products];
    this.categories = Array.from(new Set(this.products.map(p => p.category)));
    this.applyFilters();
  }

  applyFilters() {
    let list = [...this.products];

    // search
    if (this.search.trim()) {
      const q = this.search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
    }

    // category filter
    if (this.categoryFilter) {
      list = list.filter(p => p.category === this.categoryFilter);
    }

    // stock state filter
    if (this.stockStateFilter) {
      list = list.filter(p => this.getStockState(p) === this.stockStateFilter);
    }

    this.filtered = list;
  }

  getStockState(product: ProductItem): StockState {
    return this.dataService.getStockState(product);
  }

  getStockColor(product: ProductItem): string {
    const state = this.getStockState(product);
    if (state === 'CRÍTICO') return 'danger';
    if (state === 'MEDIO') return 'warning';
    return 'success';
  }

  getStockBadgeClass(product: ProductItem): string {
    const state = this.getStockState(product);
    return state === 'CRÍTICO' ? 'stock-critical' :
           state === 'MEDIO' ? 'stock-medium' : 'stock-good';
  }

  openCreateModal() {
    this.editingProduct = null;
    this.editForm = {
      id: Date.now(),
      name: '',
      category: '',
      stock: 0,
      price: 0,
      code: `PRD-${Date.now().toString().slice(-6)}`,
      minStock: 10,
    };
    this.showEditModal = true;
  }

  openEditModal(product: ProductItem) {
    this.editingProduct = product;
    this.editForm = { ...product };
    this.showEditModal = true;
  }

  saveProduct() {
    if (!this.editForm.name || !this.editForm.category) {
      this.toastMessage = 'Completa todos los campos requeridos';
      this.toastOpen = true;
      return;
    }

    if (this.editingProduct) {
      const updated = this.dataService.updateProduct({
        ...(this.editingProduct as ProductItem),
        ...this.editForm,
      } as ProductItem);
      if (updated) {
        this.toastMessage = `✓ Producto actualizado: ${updated.name}`;
      }
    } else {
      const added = this.dataService.addProduct(this.editForm);
      this.toastMessage = `✓ Producto creado: ${added.name}`;
    }

    this.toastOpen = true;
    this.showEditModal = false;
    this.loadProducts();
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toastMessage = 'Solo se permiten archivos de imagen.';
      this.toastOpen = true;
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.toastMessage = 'La imagen no puede superar 2MB.';
      this.toastOpen = true;
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.editForm.imageUrl = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.editForm.imageUrl = undefined;
  }

  deleteProduct(product: ProductItem) {
    this.productToDelete = product;
    this.showDeleteProductConfirm = true;
  }

  confirmDeleteProduct() {
    if (!this.productToDelete) return;
    const removed = this.dataService.deleteProduct(this.productToDelete.id);
    if (removed) {
      this.toastMessage = `✓ Producto eliminado: ${this.productToDelete.name}`;
      this.toastOpen = true;
      this.loadProducts();
    }
    this.showDeleteProductConfirm = false;
    this.productToDelete = null;
  }

  cancelDeleteProduct() {
    this.showDeleteProductConfirm = false;
    this.productToDelete = null;
  }

  openAdjustModal(product: ProductItem) {
    this.adjustProduct = product;
    this.adjustDelta = 0;
    this.adjustReason = 'Ajuste manual';
    this.showAdjustModal = true;
  }

  saveAdjustment() {
    if (!this.adjustProduct) return;

    const movement = this.dataService.adjustStock(
      this.adjustProduct.id,
      this.adjustDelta,
      this.adjustReason
    );

    if (movement) {
      this.toastMessage = `✓ Stock ajustado: ${this.adjustReason}`;
      this.toastOpen = true;
      this.showAdjustModal = false;
      this.loadProducts();
    }
  }

  openMovementsModal(product: ProductItem) {
    this.selectedProductId = product.id;
    this.movements = this.dataService.getInventoryMovements()
      .filter(m => m.productId === product.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    this.showMovementsModal = true;
  }

  exportInventory() {
    const csv = this.generateInventoryCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventario_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    this.toastMessage = 'Exportación CSV descargada';
    this.toastOpen = true;
  }

  private generateInventoryCSV(): string {
    // WARN-4: include Min Stock column
    const headers = ['Código', 'Nombre', 'Categoría', 'Stock', 'Precio', 'Min Stock', 'Estado'];
    const rows = this.filtered.map(p => [
      p.code,
      p.name,
      p.category,
      p.stock,
      p.price.toFixed(2),
      p.minStock ?? 10,
      this.getStockState(p),
    ]);
    return [headers, ...rows].map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  importCSV(files: FileList | null) {
    if (!files || files.length === 0) {
      this.toastMessage = 'No se seleccionó archivo';
      this.toastOpen = true;
      return;
    }

    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const imported = this.parseCsvToProducts(text);
      if (imported.length > 0) {
        imported.forEach((item) => this.dataService.addProduct(item));
        this.loadProducts();
        this.toastMessage = `Importados ${imported.length} productos`;        
      } else {
        this.toastMessage = 'No se importaron productos';
      }
      this.toastOpen = true;
    };
    reader.readAsText(file, 'utf-8');
  }

  private parseCsvToProducts(csv: string): Partial<ProductItem>[] {
    const lines = csv.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length <= 1) return [];
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    return lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const row: any = {};
      headers.forEach((key, index) => {
        row[key] = values[index];
      });
      const minStockVal = Number(row['min stock'] ?? row['minstock'] ?? row['min'] ?? row['min_stock'] ?? 10);
      return {
        code: row['código'] || row['codigo'] || `PRD-${Date.now().toString().slice(-4)}`,
        name: row['nombre'] || 'Producto importado',
        category: row['categoría'] || row['categoria'] || 'Varios',
        stock: Number(row['stock'] || 0),
        price: Number(row['precio'] || 0),
        minStock: isNaN(minStockVal) ? 10 : minStockVal,
      };
    });
  }

  closeModals() {
    this.showEditModal = false;
    this.showMovementsModal = false;
    this.showAdjustModal = false;
  }
}
