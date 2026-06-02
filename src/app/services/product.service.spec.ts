import { TestBed } from '@angular/core/testing';
import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [ProductService] });
    service = TestBed.inject(ProductService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should load default products', () => {
    const products = service.getProducts();
    expect(products.length).toBeGreaterThan(0);
    expect(products.some((item) => item.code === 'MSK-001')).toBeTrue();
  });

  it('should add and retrieve a product by id', () => {
    const newProduct = service.addProduct({ name: 'Producto Test', category: 'Test', stock: 10, price: 5, code: 'TEST-01' });
    expect(service.getProductById(newProduct.id)).toEqual(newProduct);
  });

  it('should adjust stock and record a movement', () => {
    const product = service.getProducts()[0];
    const previousStock = product.stock;
    const movement = service.adjustStock(product.id, -1, 'Ajuste de prueba');

    expect(movement).toBeTruthy();
    expect(service.getProductById(product.id)?.stock).toBe(previousStock - 1);
    expect(movement?.delta).toBe(-1);
  });

  it('should search products by code or name', () => {
    const result = service.searchProducts('MSK-001');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return undefined for non-existent product id', () => {
    expect(service.getProductById(999999)).toBeUndefined();
  });

  it('should update a product and persist the change', () => {
    const product = service.getProducts()[0];
    service.updateProduct({ ...product, name: 'Nombre Modificado' });
    expect(service.getProductById(product.id)?.name).toBe('Nombre Modificado');
  });

  it('should delete a product and remove it from the list', () => {
    const product = service.getProducts()[0];
    expect(service.deleteProduct(product.id)).toBeTrue();
    expect(service.getProductById(product.id)).toBeUndefined();
  });

  it('should return false when deleting non-existent product', () => {
    expect(service.deleteProduct(999999)).toBeFalse();
  });

  it('should return CRÍTICO when stock equals minStock', () => {
    const p = service.addProduct({ name: 'T', category: 'T', stock: 5, price: 1, code: 'T-99', minStock: 5 });
    expect(service.getStockState(p)).toBe('CRÍTICO');
  });

  it('should return SUFICIENTE when stock is well above minStock', () => {
    const p = service.addProduct({ name: 'T', category: 'T', stock: 100, price: 1, code: 'T-98', minStock: 10 });
    expect(service.getStockState(p)).toBe('SUFICIENTE');
  });

  it('should find a product by code', () => {
    const found = service.findProductByCode('MSK-001');
    expect(found).toBeTruthy();
    expect(found?.code).toBe('MSK-001');
  });

  it('should return undefined for unknown product code', () => {
    expect(service.findProductByCode('XXXX-000')).toBeUndefined();
  });

  it('should filter products by category', () => {
    const products = service.getProducts();
    const category = products[0].category;
    const filtered = service.filterProductsByCategory(category);
    expect(filtered.length).toBeGreaterThan(0);
    filtered.forEach(p => expect(p.category).toBe(category));
  });

  it('should record movement with correct delta and reason', () => {
    const product = service.getProducts()[0];
    service.adjustStock(product.id, 10, 'Reposición');
    const movements = service.getInventoryMovements();
    const m = movements.find(mv => mv.productId === product.id && mv.reason === 'Reposición');
    expect(m).toBeTruthy();
    expect(m?.delta).toBe(10);
  });
});
