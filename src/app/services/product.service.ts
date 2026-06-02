import { Injectable } from '@angular/core';
import type { ProductItem, InventoryMovement, StockState } from '../data.service';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly PRODUCTS_KEY = 'mock_products_v1';
  private products: ProductItem[] = [];
  private movements: InventoryMovement[] = [];

  constructor() {
    // reset handled centrally by DataService
    this.products = this.loadProducts();
    this.movements = this.loadMovements();
  }

  private resetIfVersionChanged(): void {
    // no-op: central data_version handling moved to DataService
  }

  private readonly MOVEMENTS_KEY = 'mock_movements_v1';

  private emojiToDataUrl(emoji: string): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <text y=".9em" font-size="85" text-anchor="middle" x="50">${emoji}</text>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  private loadMovements(): InventoryMovement[] {
    try {
      const raw = localStorage.getItem(this.MOVEMENTS_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as InventoryMovement[];
    } catch {
      return [];
    }
  }

  private saveMovements(): void {
    localStorage.setItem(this.MOVEMENTS_KEY, JSON.stringify(this.movements));
  }

  private loadProducts(): ProductItem[] {
    try {
      const raw = localStorage.getItem(this.PRODUCTS_KEY);
      if (!raw) {
        const defaultProducts: ProductItem[] = [
          { id: 1, name: 'Mascarillas N95', category: 'Protección', stock: 120, price: 18.5, code: 'MSK-001', minStock: 20, proveedor: 'VitalCorp S.A.C.', lote: 'L-908A', vencimiento: '2028-12-31', requiereFrio: false, imageUrl: this.emojiToDataUrl('😷') },
          { id: 2, name: 'Guantes de nitrilo', category: 'Desechables', stock: 48, price: 9.9, code: 'GLV-002', minStock: 30, proveedor: 'FlexiGlove Peru', lote: 'G-771B', vencimiento: '2027-06-30', requiereFrio: false, imageUrl: this.emojiToDataUrl('🧤') },
          { id: 3, name: 'Alcohol 70%', category: 'Limpieza', stock: 20, price: 12.0, code: 'ALC-003', minStock: 15, proveedor: 'FarmaQuimica', lote: 'A-223X', vencimiento: '2029-01-15', requiereFrio: false, imageUrl: this.emojiToDataUrl('🧴') },
          { id: 4, name: 'Jeringas 5ml', category: 'Inyectables', stock: 8, price: 6.2, code: 'JRG-004', minStock: 20, proveedor: 'InjectCorp Ltd.', lote: 'J-504D', vencimiento: '2028-09-22', requiereFrio: false, imageUrl: this.emojiToDataUrl('💉') },
          { id: 5, name: 'Botiquín básico', category: 'Emergencia', stock: 32, price: 145.0, code: 'BTK-005', minStock: 5, proveedor: 'Medikal Solutions', lote: 'B-101Z', vencimiento: '2030-05-10', requiereFrio: false, imageUrl: this.emojiToDataUrl('📦') },
        ];
        localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(defaultProducts));
        return defaultProducts;
      }
      return JSON.parse(raw) as ProductItem[];
    } catch {
      return [];
    }
  }

  private saveProducts(): void {
    localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(this.products));
  }

  // A1: FIX - Do NOT reload from localStorage on every call; trust in-memory state
  // saveProducts() already persists to localStorage, and loadProducts() only happens at init
  getProducts(): ProductItem[] {
    return [...this.products];
  }

  getProductById(id: number): ProductItem | undefined {
    return this.products.find((p) => p.id === id);
  }

  addProduct(product: Partial<ProductItem>): ProductItem {
    const id = Date.now();
    const newProduct: ProductItem = {
      id,
      name: product.name || 'Insumo Médico',
      category: product.category || 'Varios',
      stock: product.stock !== undefined ? product.stock : 0,
      price: product.price !== undefined ? product.price : 0,
      code: product.code || `MED-${id.toString().slice(-4)}`,
      minStock: product.minStock !== undefined ? product.minStock : 10,
      proveedor: product.proveedor || 'Proveedor General',
      lote: product.lote || `LT-${id.toString().slice(-4)}`,
      vencimiento: product.vencimiento || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      requiereFrio: product.requiereFrio !== undefined ? product.requiereFrio : false,
      imageUrl: product.imageUrl,
    };
    this.products.unshift(newProduct);
    this.saveProducts();
    return newProduct;
  }

  updateProduct(product: ProductItem): ProductItem | undefined {
    const idx = this.products.findIndex((p) => p.id === product.id);
    if (idx === -1) return undefined;
    this.products[idx] = { ...product };
    this.saveProducts();
    return this.products[idx];
  }

  deleteProduct(productId: number): boolean {
    const idx = this.products.findIndex((p) => p.id === productId);
    if (idx === -1) {
      return false;
    }
    this.products.splice(idx, 1);
    this.saveProducts();
    return true;
  }

  searchProducts(query: string): ProductItem[] {
    const q = query.trim().toLowerCase();
    if (!q) {
      return this.getProducts();
    }
    return this.products.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
  }

  filterProductsByCategory(category: string): ProductItem[] {
    return this.products.filter((p) => p.category === category);
  }

  getStockState(product: ProductItem): StockState {
    if (product.stock <= (product.minStock ?? 10)) {
      return 'CRÍTICO';
    }
    if (product.stock <= ((product.minStock ?? 10) * 2)) {
      return 'MEDIO';
    }
    return 'SUFICIENTE';
  }

  adjustStock(productId: number, delta: number, reason = 'Ajuste manual'): InventoryMovement | null {
    const product = this.getProductById(productId);
    if (!product) {
      return null;
    }
    // BUG-2: prevent negative stock
    if (product.stock + delta < 0) return null;
    product.stock += delta;
    this.saveProducts();
    const movement: InventoryMovement = {
      id: Date.now(),
      productId,
      delta,
      reason,
      date: new Date().toISOString(),
    };
    this.movements.unshift(movement);
    this.saveMovements();
    return movement;
  }

  getInventoryMovements(): InventoryMovement[] {
    return [...this.movements];
  }

  findProductByCode(code: string): ProductItem | undefined {
    return this.products.find((p) => p.code.toLowerCase() === code.toLowerCase());
  }
}
