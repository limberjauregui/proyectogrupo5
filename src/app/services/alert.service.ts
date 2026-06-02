import { Injectable } from '@angular/core';
import type { AlertItem } from '../data.service';

@Injectable({ providedIn: 'root' })
export class AlertService {
  private readonly ALERTS_KEY = 'mock_alerts_v1';
  private alerts: AlertItem[] = [];

  constructor() {
    this.alerts = this.loadAlerts();
  }

  private resetIfVersionChanged(): void {
    // no-op: central data_version handling moved to DataService
  }

  private loadAlerts(): AlertItem[] {
    try {
      const raw = localStorage.getItem(this.ALERTS_KEY);

      if (!raw) {
        const defaultAlerts: AlertItem[] = [
          {
            id: 1,
            type: 'CRÍTICA',
            message: 'ORD-1098: Temperatura fuera de rango (6.5°C)',
            related: { type: 'orden', id: 'ORD-1098' },
            date: new Date(Date.now() - 3600000 * 0.5).toISOString(),
            read: false,
          },
          {
            id: 2,
            type: 'ADVERTENCIA',
            message: 'ORD-1124: Llegaste al punto de entrega hace 15 min. Confirma entrega',
            related: { type: 'orden', id: 'ORD-1124' },
            date: new Date(Date.now() - 900000).toISOString(),
            read: false,
          },
          {
            id: 3,
            type: 'INFORMACIÓN',
            message: 'Nueva orden asignada: ORD-1128 (Baja prioridad)',
            related: { type: 'orden', id: 'ORD-1128' },
            date: new Date(Date.now() - 3600000 * 1.5).toISOString(),
            read: false,
          },
          {
            id: 4,
            type: 'ADVERTENCIA',
            message: 'ORD-1127: Demora de 20 minutos estimada por congestión vial',
            related: { type: 'orden', id: 'ORD-1127' },
            date: new Date(Date.now() - 3600000 * 2).toISOString(),
            read: true,
          },
          {
            id: 5,
            type: 'CRÍTICA',
            message: 'ORD-1120: Cliente ausente en dirección registrada',
            related: { type: 'orden', id: 'ORD-1120' },
            date: new Date(Date.now() - 3600000 * 3).toISOString(),
            read: false,
          },
          {
            id: 6,
            type: 'INFORMACIÓN',
            message: 'Mantenimiento preventivo programado: 15 de junio',
            related: { type: 'vehículo', id: 'veh-001' },
            date: new Date(Date.now() - 3600000 * 24).toISOString(),
            read: true,
          },
          {
            id: 7,
            type: 'ADVERTENCIA',
            message: 'ORD-1126: Entrega completada. Firma confirmada',
            related: { type: 'orden', id: 'ORD-1126' },
            date: new Date(Date.now() - 3600000 * 48).toISOString(),
            read: true,
          },
          {
            id: 8,
            type: 'INFORMACIÓN',
            message: 'Reporte de puntualidad: 92% este mes',
            related: { type: 'transportista', id: 'driver' },
            date: new Date(Date.now() - 3600000 * 72).toISOString(),
            read: true,
          },
          {
            id: 9,
            type: 'CRÍTICA',
            message: 'ORD-1121: Producto dañado reportado durante entrega',
            related: { type: 'orden', id: 'ORD-1121' },
            date: new Date(Date.now() - 3600000 * 96).toISOString(),
            read: true,
          },
          {
            id: 10,
            type: 'ADVERTENCIA',
            message: 'ORD-1125: Dirigirse a Consultorio Dental - Acceso por entrada lateral',
            related: { type: 'orden', id: 'ORD-1125' },
            date: new Date(Date.now() - 900000).toISOString(),
            read: false,
          },
          {
            id: 11,
            type: 'CRÍTICA',
            message: 'Producto Jeringas 5ml con stock crítico',
            related: { type: 'producto', id: '4' },
            date: new Date().toISOString(),
            read: false,
          },
          {
            id: 12,
            type: 'ADVERTENCIA',
            message: 'Stock bajo: Guantes de nitrilo solo 48 unidades',
            related: { type: 'producto', id: '2' },
            date: new Date(Date.now() - 3600000).toISOString(),
            read: false,
          },
          {
            id: 13,
            type: 'INFORMACIÓN',
            message: 'Reporte diario de ventas disponible',
            related: { type: 'reporte', id: 'daily' },
            date: new Date(Date.now() - 3600000 * 2).toISOString(),
            read: true,
          },
        ];

        localStorage.setItem(this.ALERTS_KEY, JSON.stringify(defaultAlerts));
        return defaultAlerts;
      }

      return JSON.parse(raw) as AlertItem[];
    } catch {
      return [];
    }
  }

  private saveAlerts(): void {
    localStorage.setItem(this.ALERTS_KEY, JSON.stringify(this.alerts));
  }

  getAlerts(): AlertItem[] {
    return [...this.alerts].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }

  markAlertRead(alertId: number) {
    const alert = this.alerts.find((item) => item.id === alertId);

    if (!alert) {
      return null;
    }

    alert.read = true;
    this.saveAlerts();
    return alert;
  }

  deleteAlert(alertId: number): boolean {
    const idx = this.alerts.findIndex((item) => item.id === alertId);

    if (idx === -1) {
      return false;
    }

    this.alerts.splice(idx, 1);
    this.saveAlerts();
    return true;
  }

  addAlert(alert: Partial<AlertItem>): AlertItem {
    const newAlert: AlertItem = {
      id: Date.now(),
      type: alert.type || 'INFORMACIÓN',
      message: alert.message || 'Alerta registrada',
      related: alert.related,
      date: new Date().toISOString(),
      read: alert.read ?? false,
    };

    this.alerts.unshift(newAlert);
    this.saveAlerts();
    return newAlert;
  }
}