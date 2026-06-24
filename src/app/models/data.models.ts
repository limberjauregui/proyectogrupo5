export type StockState = 'CRÍTICO' | 'MEDIO' | 'SUFICIENTE';

export interface ProductItem {
  id: string;
  name: string;
  product_name?: string; // from backend
  category: string;
  stock: number;
  price: number;
  code: string;
  min_stock?: number;
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
  items: { productId: string; qty: number }[];
  estado: 'Pendiente de aprobación' | 'Aprobada' | 'En preparación' | 'En camino' | 'Entregada' | 'Rechazada' | 'Cancelada';
  fecha: string;
  totalItems: number;
  stockDeducted?: boolean;
}

export type OrderStatus = string;

export interface OrderItem {
  id: number;
  code: string;
  clienteId: string;
  solicitudId?: number;
  estado: OrderStatus;
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

export interface InventoryMovement {
  id: number;
  productId: string;
  delta: number;
  reason: string;
  date: string;
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

export interface Transportista {
  id: string;
  name: string;
  phone?: string;
  vehicle?: string;
  zone?: string;
  status?: 'Activo' | 'Inactivo' | 'En ruta';
  rating?: number;
  totalDeliveries?: number;
  avatarUrl?: string;
  currentLocation?: { lat: number; lng: number };
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
