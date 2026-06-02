import { Injectable } from '@angular/core';
import type { SolicitudItem } from '../data.service';
import { AlertService } from './alert.service';
import { ProductService } from './product.service';

@Injectable({ providedIn: 'root' })
export class SolicitudService {
  private readonly SOLICITUD_KEY = 'mock_solicitudes_v1';
  private solicitudes: SolicitudItem[] = [];

  constructor(
    private alertService: AlertService,
    private productService: ProductService
  ) {
        // reset handled centrally by DataService
    this.solicitudes = this.loadSolicitudes();
  }

  private resetIfVersionChanged(): void {
    // no-op: central data_version handling moved to DataService
  }

  private saveSolicitudes(): void {
    localStorage.setItem(this.SOLICITUD_KEY, JSON.stringify(this.solicitudes));
  }

  private loadSolicitudes(): SolicitudItem[] {
    try {
      const raw = localStorage.getItem(this.SOLICITUD_KEY);

      if (!raw) {
        const defaultSolicitudes: SolicitudItem[] = [
          {
            id: 101,
            code: 'SOL-101',
            clienteId: 'cliente',
            items: [
              { productId: 1, qty: 5 },
              { productId: 2, qty: 10 },
            ],
            estado: 'Aprobada',
            fecha: new Date(Date.now() - 3600000 * 24).toISOString(),
            totalItems: 15,
            stockDeducted: true,
          },
          {
            id: 102,
            code: 'SOL-102',
            clienteId: 'cliente',
            items: [{ productId: 3, qty: 2 }],
            estado: 'Pendiente de aprobación',
            fecha: new Date().toISOString(),
            totalItems: 2,
            stockDeducted: false,
          },
          {
            id: 103,
            code: 'SOL-103',
            clienteId: 'cliente',
            items: [{ productId: 4, qty: 12 }],
            estado: 'En camino',
            fecha: new Date(Date.now() - 3600000 * 12).toISOString(),
            totalItems: 12,
            stockDeducted: true,
          },
          {
            id: 104,
            code: 'SOL-104',
            clienteId: 'cliente',
            items: [{ productId: 5, qty: 1 }],
            estado: 'Entregada',
            fecha: new Date(Date.now() - 3600000 * 48).toISOString(),
            totalItems: 1,
            stockDeducted: true,
          },
        ];

        localStorage.setItem(this.SOLICITUD_KEY, JSON.stringify(defaultSolicitudes));
        return defaultSolicitudes;
      }

      return JSON.parse(raw) as SolicitudItem[];
    } catch {
      return [];
    }
  }

  createSolicitud(clienteId: string, items: { productId: number; qty: number }[]): SolicitudItem {
    const id = Date.now();
    const code = `SOL-${id.toString().slice(-6)}`;
    const totalItems = items.reduce((sum, item) => sum + item.qty, 0);

    const solicitud: SolicitudItem = {
      id,
      code,
      clienteId,
      items,
      estado: 'Pendiente de aprobación',
      fecha: new Date().toISOString(),
      totalItems,
      stockDeducted: false,
    };

    this.solicitudes.unshift(solicitud);
    this.saveSolicitudes();

    this.alertService.addAlert({
      type: 'INFORMACIÓN',
      message: `Nueva solicitud ${solicitud.code} registrada y pendiente de aprobación.`,
      related: { type: 'pedido', id: solicitud.code },
      read: false,
    });

    return solicitud;
  }

  getSolicitudesByCliente(clienteId: string): SolicitudItem[] {
    return this.solicitudes.filter((item) => item.clienteId === clienteId);
  }

  getSolicitudes(): SolicitudItem[] {
    return [...this.solicitudes];
  }

  updateSolicitudStatus(solicitudId: number, status: SolicitudItem['estado']): SolicitudItem | null {
    const solicitud = this.solicitudes.find((item) => item.id === solicitudId);

    if (!solicitud) {
      return null;
    }

    const originalStatus = solicitud.estado;
    solicitud.estado = status;

    // A2: FIX - Approve: deduct stock if not already deducted
    if (status === 'Aprobada' && !solicitud.stockDeducted) {
      const insufficient = solicitud.items.filter((item) => {
        const product = this.productService.getProductById(item.productId);
        return !product || product.stock < item.qty;
      });

      if (insufficient.length === 0) {
        solicitud.items.forEach((item) =>
          this.productService.adjustStock(item.productId, -item.qty, `Solicitud ${solicitud.code} aprobada`)
        );
        solicitud.stockDeducted = true;
      }
    }

    // A2: FIX - Rejected or Cancelled: revert stock if already deducted
    if ((status === 'Cancelada' || status === 'Rechazada') && solicitud.stockDeducted) {
      solicitud.items.forEach((item) =>
        this.productService.adjustStock(item.productId, item.qty, `Solicitud ${solicitud.code} ${status.toLowerCase()}`)
      );
      solicitud.stockDeducted = false;
    }

    this.saveSolicitudes();

    if (originalStatus !== status) {
      const messages: Record<SolicitudItem['estado'], string> = {
        'Pendiente de aprobación': `Solicitud ${solicitud.code} registrada y en espera de aprobación.`,
        Aprobada: `Solicitud ${solicitud.code} ha sido aprobada. El inventario ya está reservado.`,
        'En preparación': `Solicitud ${solicitud.code} está en preparación.`,
        'En camino': `Solicitud ${solicitud.code} está en camino hacia tu ubicación.`,
        Entregada: `Solicitud ${solicitud.code} ha sido entregada.`,
        Rechazada: `Solicitud ${solicitud.code} ha sido rechazada.`,
        Cancelada: `Solicitud ${solicitud.code} ha sido cancelada.`,
      };

      this.alertService.addAlert({
        type: status === 'Rechazada' ? 'CRÍTICA' : status === 'Cancelada' ? 'ADVERTENCIA' : 'INFORMACIÓN',
        message: messages[status] || `Solicitud ${solicitud.code} actualizada a ${status}.`,
        related: { type: 'pedido', id: solicitud.code },
        read: false,
      });
    }

    return solicitud;
  }
}