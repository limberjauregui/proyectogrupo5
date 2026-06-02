import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonBadge,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  airplaneOutline,
  checkmarkDoneOutline,
  locationOutline,
  mapOutline,
  warningOutline,
  carOutline,
  timeOutline,
  personOutline,
  pinOutline,
  removeOutline,
  addOutline,
  refreshOutline,
  layersOutline,
  navigateOutline,
  thermometerOutline,
  callOutline,
  closeOutline,
  locateOutline,
  gitBranchOutline,
  alertCircleOutline,
} from 'ionicons/icons';
import { MapService, MapMarker, MapRoute } from '../../services/map.service';
import { DataService } from '../../data.service';
import * as L from 'leaflet';

interface MapStat {
  label: string;
  value: string;
  icon: string;
}

interface ActiveDelivery {
  code: string;
  destination: string;
  driver: string;
  status: 'En ruta' | 'Activa' | 'Retrasada' | 'Completada';
  eta: string;
  x: number;
  y: number;
  lat?: number;
  lng?: number;
  temp?: string;
  phone?: string;
}

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonIcon,
    IonBadge,
    IonToast,
  ],
  templateUrl: 'mapa.page.html',
  styleUrls: ['mapa.page.scss'],
})
export class MapaPage implements OnInit, AfterViewInit, OnDestroy {
  toastOpen = false;
  toastMessage = '';
  @ViewChild('sheetRef') sheetRef?: ElementRef<HTMLElement>;
  selectedDelivery: ActiveDelivery | null = null;
  closeOutline = closeOutline;
  sheetOffset = 0;
  sheetPointerStartY = 0;
  sheetDragging = false;
  sheetDragThreshold = 120;
  sheetDragMax = 320;
  mapZoom = 12;
  showRoutes = true;
  showTemperatureAlerts = true;
  mapLoadError = false;
  highlightedRouteId: string | null = null;
  highlightedMarkerId: string | null = null;
  isGpsActive = false;

  vehiclePosition = {
    id: 'VEHICLE_CURRENT',
    lat: -12.0482,
    lng: -77.0406,
    title: 'Vehículo del transportista',
    driver: 'Unidad de Ruta',
    temp: '4.5°C',
    status: 'active' as 'active',
  };

  stats: MapStat[] = [
    { label: 'Entregas activas', value: '0', icon: airplaneOutline },
    { label: 'En ruta', value: '0', icon: mapOutline },
    { label: 'Retrasadas', value: '0', icon: warningOutline },
    { label: 'Completadas', value: '0', icon: checkmarkDoneOutline },
  ];

  activeDeliveries: ActiveDelivery[] = [];

  private mapInitialized = false;
  private updateInterval: any;

  constructor(private mapService: MapService, private dataService: DataService) {
    addIcons({
      airplaneOutline,
      checkmarkDoneOutline,
      locationOutline,
      mapOutline,
      warningOutline,
      carOutline,
      timeOutline,
      personOutline,
      pinOutline,
      removeOutline,
      addOutline,
      refreshOutline,
      layersOutline,
      navigateOutline,
      thermometerOutline,
      callOutline,
      closeOutline,
      locateOutline,
      gitBranchOutline,
      alertCircleOutline,
    });
  }

  ngOnInit() {
    this.loadDeliveryData();
    this.updateInterval = setInterval(() => {
      this.updateDeliveryPositions();
    }, 5000);
  }

  private loadDeliveryData(): void {
    const orders = this.dataService.getOrders();
    this.activeDeliveries = orders
      .filter((order) => order.estado !== 'Entregado' && order.estado !== 'Cancelado')
      .map((order) => {
        const [lat, lng] = this.getStableDeliveryCoordinates(order.code, order.destino || '');
        const orderEta = order.fechaEntrega ? new Date(order.fechaEntrega) : null;
        const status = order.estado === 'Entregado'
          ? 'Completada'
          : orderEta && orderEta.getTime() < Date.now()
          ? 'Retrasada'
          : order.estado === 'En camino'
          ? 'En ruta'
          : 'Activa';
        const driver = this.dataService.getUsers().find((u) => u.id === order.transportistaId)?.name || order.transportista || 'Sin asignar';
        return {
          code: order.code,
          destination: order.destino || 'Destino no registrado',
          driver,
          status,
          eta: order.fechaEntrega ? this.formatEta(order.fechaEntrega) : 'N/A',
          x: 50,
          y: 50,
          lat,
          lng,
          temp: order.requiresColdChain ? '4.8°C' : '6.2°C',
          phone: '+51 999 000 000',
        } as ActiveDelivery;
      });

    const activeCount = this.activeDeliveries.length;
    const inRouteCount = this.activeDeliveries.filter((d) => d.status === 'En ruta').length;
    const delayedCount = this.activeDeliveries.filter((d) => d.status === 'Retrasada').length;
    const completedCount = orders.filter((order) => order.estado === 'Entregado').length;
    this.stats = [
      { label: 'Entregas activas', value: String(activeCount), icon: airplaneOutline },
      { label: 'En ruta', value: String(inRouteCount), icon: mapOutline },
      { label: 'Retrasadas', value: String(delayedCount), icon: warningOutline },
      { label: 'Completadas', value: String(completedCount), icon: checkmarkDoneOutline },
    ];
    this.selectedDelivery = this.activeDeliveries[0] || null;
    this.sheetOffset = 0;
  }

  private getStableDeliveryCoordinates(code: string, destination: string): [number, number] {
    const baseLat = -12.0464;
    const baseLng = -77.0428;
    const digits = parseInt(code.replace(/\D/g, ''), 10) || 1000;
    const latOffset = (((digits % 100) - 50) / 1000) * 0.1;
    const lngOffset = ((((digits / 100) % 100) - 50) / 1000) * 0.1;
    return [baseLat + latOffset, baseLng + lngOffset];
  }

  private formatEta(fechaEntrega: string): string {
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

  ngAfterViewInit() {
    // Inicializar mapa después de que la vista esté completamente renderizada
    setTimeout(() => {
      this.initializeMap();
    }, 300);
  }

  ionViewWillLeave() {
    this.mapService.destroyMap();
    this.mapInitialized = false;
  }

  ngOnDestroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    window.removeEventListener('resize', this.onWindowResize);
  }

  initializeMap(): void {
    if (this.mapInitialized) return;

    try {
      // Verificar que el contenedor existe en el DOM
      const container = document.getElementById('mapContainer');
      if (!container) {
        console.error('Contenedor del mapa no encontrado');
        this.mapLoadError = true;
        this.toastMessage = '⚠️ El contenedor del mapa no está disponible.';
        this.toastOpen = true;
        return;
      }

      // Lima, Perú como centro
      const centerLima: [number, number] = [-12.0464, -77.0428];

      // Inicializar Leaflet
      this.mapService.initializeMap('mapContainer', centerLima, 12);
      this.mapInitialized = true;
      this.mapLoadError = false;

      // Revalidar tamaño para evitar fragmentación de tiles
      this.mapService.invalidateSize();
      window.addEventListener('resize', this.onWindowResize);

      // Agregar marcadores
      this.addMarkersToMap();

      // Agregar rutas simuladas
      this.addRoutesToMap();

      // Intentar obtener la ubicación del dispositivo
      this.addCurrentLocationMarker();

      // Seleccionar el primer delivery por defecto
      this.selectedDelivery = this.activeDeliveries[0];
      if (this.selectedDelivery && this.selectedDelivery.lat && this.selectedDelivery.lng) {
        this.highlightSelectedDelivery(this.selectedDelivery);
      }
      this.fitMapToOperation();
    } catch (error) {
      console.error('Error inicializando mapa:', error);
      this.mapLoadError = true;
      this.toastMessage = '⚠️ No se pudo cargar el mapa. Modo simplificado activado.';
      this.toastOpen = true;
    }
  }

  private addMarkersToMap(): void {
    // Vehículo / transportista mock o GPS real
    const vehicleMarker: MapMarker = {
      id: this.vehiclePosition.id,
      lat: this.vehiclePosition.lat,
      lng: this.vehiclePosition.lng,
      title: this.vehiclePosition.title,
      icon: 'delivery',
      status: 'active',
      temp: this.vehiclePosition.temp,
      driver: this.vehiclePosition.driver,
    };
    this.mapService.addMarker(vehicleMarker);

    // Base warehouse
    const warehouse: MapMarker = {
      id: 'WAREHOUSE-001',
      lat: -12.0464,
      lng: -77.0428,
      title: 'Centro de Distribución Principal',
      icon: 'warehouse',
      status: 'active',
    };
    this.mapService.addMarker(warehouse);

    // Pedidos y destinos
    this.activeDeliveries.forEach((delivery) => {
      if (delivery.lat && delivery.lng) {
        const destination: MapMarker = {
          id: delivery.code,
          lat: delivery.lat,
          lng: delivery.lng,
          title: `${delivery.code} · ${delivery.destination}`,
          icon: 'hospital',
          status: delivery.status === 'Retrasada' ? 'delayed' : 'active',
          temp: delivery.temp,
          driver: delivery.driver,
        };
        this.mapService.addMarker(destination);
      }
    });
  }

  private addRoutesToMap(): void {
    if (!this.showRoutes) return;

    const vehiclePoint: [number, number] = [this.vehiclePosition.lat, this.vehiclePosition.lng];

    this.activeDeliveries.forEach((delivery, index) => {
      if (delivery.lat && delivery.lng) {
        const route: MapRoute = {
          id: `ROUTE-${delivery.code}`,
          coords: [
            vehiclePoint,
            [delivery.lat - 0.007, delivery.lng - 0.007],
            [delivery.lat, delivery.lng],
          ],
          color: this.getRouteColor(delivery.status),
          weight: 3,
          dashArray: delivery.status === 'En ruta' ? undefined : '5, 5',
        };
        this.mapService.addRoute(route);
      }
    });
  }

  private getRouteColor(status: string): string {
    if (status === 'Retrasada') return '#ef4444';
    if (status === 'En ruta') return '#3b82f6';
    if (status === 'Completada') return '#10b981';
    return '#8b5cf6';
  }

  private updateDeliveryPositions(): void {
    // Actualizar posiciones simuladas de entregas
    this.activeDeliveries.forEach((delivery) => {
      if (delivery.lat && delivery.lng && delivery.status === 'En ruta') {
        // Movimiento aleatorio muy pequeño
        const newLat = delivery.lat + (Math.random() - 0.5) * 0.0001;
        const newLng = delivery.lng + (Math.random() - 0.5) * 0.0001;

        this.mapService.updateMarkerPosition(delivery.code, newLat, newLng);
        delivery.lat = newLat;
        delivery.lng = newLng;
      }
    });
  }

  showLocation(): void {
    const target = this.selectedDelivery && this.selectedDelivery.lat && this.selectedDelivery.lng
      ? [this.selectedDelivery.lat, this.selectedDelivery.lng] as [number, number]
      : [this.vehiclePosition.lat, this.vehiclePosition.lng] as [number, number];
    this.mapService.centerMap(target, 15);
    this.mapService.invalidateSize();
    this.toastMessage = this.selectedDelivery
      ? `📍 Centrado en ${this.selectedDelivery.code}`
      : '📍 Centrado en el vehículo';
    this.toastOpen = true;
  }

  /** Centra SIEMPRE en la posición del vehículo (GPS real o mock) */
  centerOnVehicle(): void {
    const target: [number, number] = [this.vehiclePosition.lat, this.vehiclePosition.lng];
    this.mapService.centerMap(target, 15);
    this.mapService.invalidateSize();
    this.toastMessage = '🚗 Centrado en el vehículo del transportista';
    this.toastOpen = true;
  }

  /** Alias para el template (botón GPS flotante) */
  centerMap(): void {
    this.centerOnVehicle();
  }

  /** Alias para el template (botón Refresh flotante) */
  refreshMap(): void {
    this.refreshMapData();
  }

  /** Toggle GPS activo - intenta obtener posición real */
  toggleGps(): void {
    this.isGpsActive = !this.isGpsActive;
    if (this.isGpsActive) {
      this.addCurrentLocationMarker();
      this.toastMessage = '📡 GPS activado — buscando posición real';
    } else {
      this.vehiclePosition.lat = -12.0482;
      this.vehiclePosition.lng = -77.0406;
      this.toastMessage = '📡 GPS desactivado — usando posición mock';
    }
    this.toastOpen = true;
  }

  closeSheet(): void {
    this.selectedDelivery = null;
    this.sheetOffset = 0;
    this.sheetDragging = false;
  }

  onSheetPointerDown(event: PointerEvent): void {
    if (!this.sheetRef?.nativeElement) return;
    this.sheetDragging = true;
    this.sheetPointerStartY = event.clientY;
    this.sheetRef.nativeElement.setPointerCapture(event.pointerId);
  }

  onSheetPointerMove(event: PointerEvent): void {
    if (!this.sheetDragging) return;
    const deltaY = event.clientY - this.sheetPointerStartY;
    this.sheetOffset = Math.min(Math.max(0, deltaY), this.sheetDragMax);
  }

  onSheetPointerUp(event?: PointerEvent): void {
    if (!this.sheetDragging) return;
    this.sheetDragging = false;
    if (this.sheetOffset > this.sheetDragThreshold) {
      this.closeSheet();
      return;
    }
    this.sheetOffset = 0;
  }

  private highlightSelectedDelivery(delivery: ActiveDelivery): void {
    this.clearHighlights();
    const routeId = `ROUTE-${delivery.code}`;
    this.highlightedRouteId = routeId;
    this.highlightedMarkerId = delivery.code;
    this.mapService.setRouteStyle(routeId, { color: '#facc15', weight: 5, opacity: 1, dashArray: undefined });
    this.mapService.updateMarkerIcon(delivery.code, 'delivery', delivery.status === 'Retrasada' ? 'delayed' : 'active');
    if (delivery.lat && delivery.lng) {
      this.mapService.fitBounds([
        [this.vehiclePosition.lat, this.vehiclePosition.lng],
        [delivery.lat, delivery.lng],
      ]);
    }
  }

  private clearHighlights(): void {
    if (this.highlightedRouteId) {
      const previousDelivery = this.activeDeliveries.find((d) => `ROUTE-${d.code}` === this.highlightedRouteId);
      if (previousDelivery) {
        this.mapService.setRouteStyle(this.highlightedRouteId, {
          color: this.getRouteColor(previousDelivery.status),
          weight: 3,
          opacity: 0.8,
          dashArray: previousDelivery.status === 'En ruta' ? undefined : '5, 5',
        });
      }
      this.highlightedRouteId = null;
    }
    if (this.highlightedMarkerId) {
      const previousDelivery = this.activeDeliveries.find((d) => d.code === this.highlightedMarkerId);
      if (previousDelivery) {
        this.mapService.updateMarkerIcon(previousDelivery.code, 'hospital', previousDelivery.status === 'Retrasada' ? 'delayed' : 'active');
      }
      this.highlightedMarkerId = null;
    }
  }

  private addCurrentLocationMarker(): void {
    if (!navigator.geolocation) {
      console.warn('Geolocalización no soportada, usando ubicación mock');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.vehiclePosition.lat = position.coords.latitude;
        this.vehiclePosition.lng = position.coords.longitude;
        this.mapService.addMarker({
          id: this.vehiclePosition.id,
          lat: this.vehiclePosition.lat,
          lng: this.vehiclePosition.lng,
          title: this.vehiclePosition.title,
          icon: 'delivery',
          status: 'active',
          driver: this.vehiclePosition.driver,
          temp: this.vehiclePosition.temp,
        });
      },
      (error) => {
        console.warn('No se pudo obtener ubicación GPS, usando mock:', error);
        // Ya se agregó el vehículo mock en addMarkersToMap
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
      }
    );
  }

  private onWindowResize = (): void => {
    this.mapService.invalidateSize();
  };

  selectDelivery(delivery: ActiveDelivery): void {
    this.selectedDelivery = delivery;
    this.sheetOffset = 0;
    this.highlightSelectedDelivery(delivery);
    this.mapService.centerMap([delivery.lat!, delivery.lng!], 15);
    this.toastMessage = `Ruta resaltada para ${delivery.code}`;
    this.toastOpen = true;
  }

  zoomIn(): void {
    if (this.mapLoadError) {
      this.toastMessage = 'El mapa no está disponible.';
      this.toastOpen = true;
      return;
    }
    const zoom = this.mapService.getMapZoom();
    this.mapService.setMapZoom(zoom + 1);
    this.mapZoom = zoom + 1;
  }

  zoomOut(): void {
    if (this.mapLoadError) {
      this.toastMessage = 'El mapa no está disponible.';
      this.toastOpen = true;
      return;
    }
    const zoom = this.mapService.getMapZoom();
    this.mapService.setMapZoom(zoom - 1);
    this.mapZoom = zoom - 1;
  }

  toggleRoutes(): void {
    this.showRoutes = !this.showRoutes;
    this.mapService.clearAllRoutes();
    if (this.showRoutes) {
      this.addRoutesToMap();
    }
    this.toastMessage = this.showRoutes ? '✓ Rutas visibles' : '✗ Rutas ocultas';
    this.toastOpen = true;
  }

  refreshMapData(): void {
    if (this.mapLoadError) {
      this.initializeMap();
      return;
    }
    this.mapService.clearAllMarkers();
    this.mapService.clearAllRoutes();
    this.addMarkersToMap();
    if (this.showRoutes) {
      this.addRoutesToMap();
    }
    if (this.selectedDelivery) {
      this.highlightSelectedDelivery(this.selectedDelivery);
    }
    this.fitMapToOperation();
    this.toastMessage = '🔄 Datos del mapa actualizados y recientes';
    this.toastOpen = true;
  }

  private fitMapToOperation(): void {
    const points: [number, number][] = [
      [this.vehiclePosition.lat, this.vehiclePosition.lng],
      ...this.activeDeliveries
        .filter((d) => d.lat !== undefined && d.lng !== undefined)
        .map((d) => [d.lat as number, d.lng as number] as [number, number]),
    ];
    if (points.length > 1) {
      this.mapService.fitBounds(points);
    } else {
      this.mapService.centerMap([this.vehiclePosition.lat, this.vehiclePosition.lng], 13);
    }
  }

  getStatusClass(status: string): string {
    if (status === 'Retrasada') return 'delay';
    if (status === 'En ruta') return 'route';
    if (status === 'Completada') return 'complete';
    return 'active';
  }

  isTempCritical(temp?: string): boolean {
    if (!temp) return false;
    const parsed = parseFloat(temp.replace('°C', '').trim());
    return !Number.isNaN(parsed) && parsed > 5.0;
  }
}

