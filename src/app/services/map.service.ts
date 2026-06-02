import { Injectable } from '@angular/core';
import * as L from 'leaflet';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  icon: 'delivery' | 'warehouse' | 'hospital' | 'active';
  status?: 'active' | 'completed' | 'delayed' | 'idle';
  temp?: string;
  driver?: string;
}

export interface MapRoute {
  id: string;
  coords: [number, number][];
  color: string;
  weight?: number;
  dashArray?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private map: L.Map | null = null;
  private markers: Map<string, L.Marker> = new Map();
  private routes: Map<string, L.Polyline> = new Map();
  private layers: Map<string, L.LayerGroup> = new Map();

  initializeMap(containerId: string, center: [number, number], zoom: number = 12): L.Map {
    const peruBounds = L.latLngBounds([-18.5, -81.5], [-0.5, -68.0]);

    // Crear mapa con OpenStreetMap
    this.map = L.map(containerId, {
      center,
      zoom,
      minZoom: 11,
      maxZoom: 16,
      maxBounds: peruBounds,
      maxBoundsViscosity: 0.8,
      zoomControl: false,
      attributionControl: false,
    });

    // Capas base
    const openstreetmap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      minZoom: 3,
    });

    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles © Esri',
      maxZoom: 19
    });

    // Control de capas base
    const baseLayers = {
      'Mapa Estándar': openstreetmap,
      'Vista Satélite': satellite
    };

    openstreetmap.addTo(this.map);
    L.control.layers(baseLayers).addTo(this.map);

    // Control de zoom
    if (this.map.zoomControl) {
      this.map.zoomControl.setPosition('topright');
    }

    // Fullscreen (simulado con botón personalizado)
    this.addFullscreenControl();

    return this.map;
  }

  private addFullscreenControl(): void {
    if (!this.map) return;

    const fullscreenControl = L.Control.extend({
      options: {
        position: 'topright'
      },
      onAdd: (map: L.Map) => {
        const div = L.DomUtil.create('div', 'leaflet-control');
        div.innerHTML = '<button style="background: white; padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-weight: bold; margin: 10px 0; font-size: 14px;">📺 Pantalla</button>';
        L.DomEvent.on(div, 'click', (e) => {
          L.DomEvent.stopPropagation(e);
          const container = map.getContainer();
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => console.error('Exit fullscreen error:', err));
          } else {
            container.requestFullscreen().catch(err => console.error('Fullscreen error:', err));
          }
        });
        return div;
      }
    });

    new (fullscreenControl as any)({ position: 'topright' }).addTo(this.map);
  }

  addMarker(marker: MapMarker): L.Marker {
    if (!this.map) throw new Error('Map not initialized');

    // Si ya existe un marcador con el mismo id, eliminarlo antes de crear el nuevo
    const existing = this.markers.get(marker.id);
    if (existing && this.map) {
      this.map.removeLayer(existing);
      this.markers.delete(marker.id);
    }

    const customIcon = this.createLeafletIcon(marker);

    const leafletMarker = L.marker([marker.lat, marker.lng], { icon: customIcon })
      .bindPopup(`
        <div style="font-size: 12px;">
          <b>${marker.title}</b><br>
          ${marker.driver ? `Conductor: ${marker.driver}<br>` : ''}
          ${marker.temp ? `Temp: ${marker.temp}<br>` : ''}
          <small style="color: #666;">${marker.lat.toFixed(4)}, ${marker.lng.toFixed(4)}</small>
        </div>
      `)
      .addTo(this.map);

    this.markers.set(marker.id, leafletMarker);
    return leafletMarker;
  }

  updateMarkerPosition(markerId: string, lat: number, lng: number): void {
    const marker = this.markers.get(markerId);
    if (marker) {
      marker.setLatLng([lat, lng]);
    }
  }

  updateMarkerIcon(markerId: string, icon: 'delivery' | 'warehouse' | 'hospital' | 'active', status?: 'active' | 'completed' | 'delayed' | 'idle'): void {
    const marker = this.markers.get(markerId);
    if (!marker) return;
    const iconData: MapMarker = {
      id: markerId,
      lat: 0,
      lng: 0,
      title: markerId,
      icon,
      status,
    };
    marker.setIcon(this.createLeafletIcon(iconData));
  }

  removeMarker(markerId: string): void {
    const marker = this.markers.get(markerId);
    if (marker && this.map) {
      this.map.removeLayer(marker);
      this.markers.delete(markerId);
    }
  }

  addRoute(route: MapRoute): L.Polyline {
    if (!this.map) throw new Error('Map not initialized');

    const polyline = L.polyline(route.coords, {
      color: route.color,
      weight: route.weight || 3,
      opacity: 0.8,
      dashArray: route.dashArray || undefined,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(this.map);

    this.routes.set(route.id, polyline);
    return polyline;
  }

  removeRoute(routeId: string): void {
    const route = this.routes.get(routeId);
    if (route && this.map) {
      this.map.removeLayer(route);
      this.routes.delete(routeId);
    }
  }

  fitBounds(coords: [number, number][]): void {
    if (!this.map || coords.length === 0) return;
    const bounds = L.latLngBounds(coords);
    this.map.fitBounds(bounds, { padding: [50, 50] });
  }

  centerMap(center: [number, number], zoom?: number): void {
    if (!this.map) return;
    this.map.setView(center, zoom);
  }

  invalidateSize(): void {
    if (!this.map) return;
    setTimeout(() => this.map?.invalidateSize(), 100);
  }

  getMapZoom(): number {
    return this.map?.getZoom() || 12;
  }

  setMapZoom(zoom: number): void {
    if (this.map) {
      this.map.setZoom(zoom);
    }
  }

  clearAllMarkers(): void {
    this.markers.forEach(marker => {
      if (this.map) {
        this.map.removeLayer(marker);
      }
    });
    this.markers.clear();
  }

  clearAllRoutes(): void {
    this.routes.forEach(route => {
      if (this.map) {
        this.map.removeLayer(route);
      }
    });
    this.routes.clear();
  }

  setRouteStyle(routeId: string, style: { color?: string; weight?: number; opacity?: number; dashArray?: string }): void {
    const route = this.routes.get(routeId);
    if (!route) return;
    route.setStyle({
      color: style.color ?? '#3b82f6',
      weight: style.weight ?? 3,
      opacity: style.opacity ?? 0.8,
      dashArray: style.dashArray,
    });
  }

  private createLeafletIcon(marker: MapMarker): L.Icon | L.DivIcon {
    if (marker.id === 'VEHICLE_CURRENT') {
      return L.divIcon({
        className: 'custom-vehicle-icon',
        html: `<div style="display:flex;flex-direction:column;align-items:center;min-width:90px;">
                 <div style="background:#14b8a6;color:#fff;border-radius:18px;padding:8px 10px;font-size:0.8rem;font-weight:700;box-shadow:0 4px 12px rgba(0,0,0,0.18);">VEHÍCULO</div>
                 <div style="background:#0f172a;color:#fff;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;border:2px solid #fff; margin-top:6px;">🚚</div>
               </div>`,
        iconSize: [90, 90],
        iconAnchor: [45, 90],
        popupAnchor: [0, -90],
      });
    }

    if (marker.id.startsWith('ORD-')) {
      const fill = marker.status === 'delayed' ? '#ef4444' : '#7c3aed';
      return L.divIcon({
        className: 'custom-delivery-icon',
        html: `<div style="display:flex;flex-direction:column;align-items:center;min-width:85px;">
                 <div style="background:${fill};color:#fff;border-radius:18px;padding:6px 10px;font-size:0.8rem;font-weight:700;box-shadow:0 4px 12px rgba(0,0,0,0.18);">${marker.id}</div>
                 <div style="background:#fff;color:${fill};border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:1rem;border:2px solid ${fill}; margin-top:6px;">📍</div>
               </div>`,
        iconSize: [90, 90],
        iconAnchor: [45, 90],
        popupAnchor: [0, -90],
      });
    }

    const iconUrl = this.getMarkerIcon(marker.icon, marker.status);
    return L.icon({
      iconUrl,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });
  }

  private getMarkerIcon(type: string, status?: string): string {
    // URL base de iconos (usando emoji como fallback)
    const icons: Record<string, Record<string, string>> = {
      'delivery': {
        'active': 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        'completed': 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        'delayed': 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        'idle': 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png'
      },
      'warehouse': {
        'active': 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
        'completed': 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
        'delayed': 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
        'idle': 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png'
      },
      'hospital': {
        'active': 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
        'completed': 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
        'delayed': 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
        'idle': 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png'
      }
    };

    return icons[type]?.[status || 'active'] || 
           'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png';
  }

  // Método para agregar capas personalizadas
  createLayer(layerId: string): L.LayerGroup {
    const layer = L.layerGroup();
    if (this.map) {
      layer.addTo(this.map);
    }
    this.layers.set(layerId, layer);
    return layer;
  }

  getLayer(layerId: string): L.LayerGroup | undefined {
    return this.layers.get(layerId);
  }

  destroyMap(): void {
    if (this.map) {
      this.map.remove();
    }
    this.map = null;
    this.markers.clear();
    this.routes.clear();
    this.layers.clear();
  }
}
