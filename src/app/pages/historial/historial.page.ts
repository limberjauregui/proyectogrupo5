import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonBadge,
  IonButton,
  IonContent,
  IonIcon,
  IonSearchbar,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonToast,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronDownOutline,
  chevronUpOutline,
  downloadOutline,
  documentTextOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  warningOutline,
  refreshOutline,
  funnelOutline
} from 'ionicons/icons';
import { DataService, OrderItem } from '../../data.service';
import { AuthService } from '../../auth.service';
import { Router } from '@angular/router';

interface HistoryRecord {
  id: string;
  type: 'ENTREGA' | 'INCIDENCIA' | 'INVENTARIO' | 'ESTADO';
  title: string;
  subtitle: string;
  date: string;
  status: 'COMPLETADO' | 'CANCELADO' | 'CON INCIDENCIA' | 'AJUSTADO';
  driver: string;
  details?: { label: string; value: string }[];
  timeline?: { step: string; timestamp: string; notes?: string }[];
  signatureUrl?: string;
  expanded?: boolean;
}

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonBadge,
    IonButton,
    IonIcon,
    IonSearchbar,
    IonToast,
    IonSelect,
    IonSelectOption,
  ],
  templateUrl: 'historial.page.html',
  styleUrls: ['historial.page.scss'],
})
export class HistorialPage implements OnInit {
  query = '';
  typeFilter = 'TODOS';
  statusFilter = 'TODOS';
  driverFilter = 'TODOS';
  
  toastOpen = false;
  toastMessage = '';
  
  historyRecords: HistoryRecord[] = [];
  filtered: HistoryRecord[] = [];

  // KPIs
  kpis = {
    totalDeliveries: 0,
    incidentsCount: 0,
    avgTime: '42 min'
  };

  constructor(private dataService: DataService, private authService: AuthService, private router: Router) {
    addIcons({
      chevronDownOutline,
      chevronUpOutline,
      downloadOutline,
      documentTextOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      warningOutline,
      refreshOutline,
      funnelOutline
    });
  }

  ngOnInit() {
    this.loadHistory();
  }

  loadHistory() {
    // 1. Cargar Órdenes completadas / canceladas / incidencias
    let orders = this.dataService.getOrders();
    // If transportista, show only their orders
    if (this.authService.role === 'transportista') {
      const username = this.authService.username || '';
      orders = orders.filter(o => o.transportistaId === username);
    }
    const records: HistoryRecord[] = [];

    orders.forEach(o => {
      const traces = this.dataService.getTraceForOrder(o.code);
      const signatureUrl = this.dataService.getSignature(o.code);

      if (o.estado === 'Entregado') {
        records.push({
          id: o.code,
          type: 'ENTREGA',
          title: `Entrega a ${o.cliente}`,
          subtitle: `Finalizado correctamente en punto asignado`,
          date: o.fecha,
          status: 'COMPLETADO',
          driver: o.transportista || 'Laura Rojas',
          details: [
            { label: 'Prioridad', value: o.prioridad },
            { label: 'Operador', value: o.transportista || 'N/A' },
            { label: 'Firma', value: signatureUrl ? 'Registrada' : 'Pendiente' }
          ],
          timeline: traces.map((t) => ({ step: t.step, timestamp: t.timestamp, notes: t.notes })),
          signatureUrl: signatureUrl ?? undefined,
          expanded: false
        });
      } else if (o.estado === 'Incidencia') {
        records.push({
          id: o.code,
          type: 'INCIDENCIA',
          title: `Incidencia en ${o.cliente}`,
          subtitle: `Orden con reporte de desviación o inspección`,
          date: o.fecha,
          status: 'CON INCIDENCIA',
          driver: o.transportista || 'N/A',
          details: [
            { label: 'Prioridad', value: o.prioridad },
            { label: 'Estado actual', value: o.estado },
            { label: 'Firma', value: signatureUrl ? 'Registrada' : 'No disponible' }
          ],
          timeline: traces.map((t) => ({ step: t.step, timestamp: t.timestamp, notes: t.notes })),
          signatureUrl: signatureUrl ?? undefined,
          expanded: false
        });
      } else if (o.estado === 'Cancelado') {
        records.push({
          id: o.code,
          type: 'ENTREGA',
          title: `Cancelación - ${o.cliente}`,
          subtitle: `Orden cancelada por requerimiento del cliente`,
          date: o.fecha,
          status: 'CANCELADO',
          driver: o.transportista || 'Carlos Medina',
          details: [
            { label: 'Prioridad', value: o.prioridad },
            { label: 'Motivo', value: 'Anulado por Administración' }
          ],
          timeline: traces.map((t) => ({ step: t.step, timestamp: t.timestamp, notes: t.notes })),
          signatureUrl: signatureUrl ?? undefined,
          expanded: false
        });
      }
    });

    // 2. Movimientos de inventario
    const movements = this.dataService.getInventoryMovements();
    movements.forEach(m => {
      const p = this.dataService.getProductById(m.productId);
      records.push({
        id: `INV-${m.id.toString().slice(-4)}`,
        type: 'INVENTARIO',
        title: `Movimiento: ${p?.name || 'Producto'}`,
        subtitle: `${m.reason} (${m.delta > 0 ? '+' : ''}${m.delta} u)`,
        date: m.date,
        status: 'AJUSTADO',
        driver: 'Supervisor',
        details: [
          { label: 'Ajuste', value: `${m.delta} unidades` },
          { label: 'Motivo', value: m.reason },
          { label: 'Código Barras', value: p?.code || 'N/A' }
        ],
        expanded: false
      });
    });

    // 3. Alertas e incidencias reales
    let alerts = this.dataService.getAlerts();
    if (this.authService.role === 'transportista') {
      const myCodes = orders.map(o => o.code);
      alerts = alerts.filter(a => (a.related?.type === 'orden' && myCodes.includes(a.related.id)) || (a.related?.type === 'transportista' && a.related.id === this.authService.username));
    }
    alerts.forEach(alert => {
      records.push({
        id: `ALT-${alert.id}`,
        type: 'INCIDENCIA',
        title: alert.message,
        subtitle: alert.related?.type === 'orden' ? `Orden ${alert.related.id}` : 'Alerta del sistema',
        date: alert.date,
        status: alert.type === 'CRÍTICA' ? 'CON INCIDENCIA' : 'COMPLETADO',
        driver: alert.related?.type === 'orden' ? this.dataService.getOrders().find(o => o.code === alert.related?.id)?.transportista || 'N/A' : 'Sistema',
        details: [
          { label: 'Tipo de alerta', value: alert.type },
          { label: 'Relacionado con', value: alert.related?.type || 'N/A' },
          { label: 'Estado lectura', value: alert.read ? 'Leída' : 'Pendiente' }
        ],
        expanded: false
      });
    });

    // Ordenar de más reciente a más antiguo
    this.historyRecords = records.sort((a, b) => +new Date(b.date) - +new Date(a.date));
    
    // Calcular KPIs
    this.calculateKPIs();
    
    this.applyFilters();
  }

  calculateKPIs() {
    const completed = this.historyRecords.filter(r => r.status === 'COMPLETADO');
    const incidents = this.historyRecords.filter(r => r.status === 'CON INCIDENCIA' || r.type === 'INCIDENCIA');
    const deliveredOrders = this.dataService.getOrders().filter(o => o.estado === 'Entregado' && o.fecha && o.fechaEntrega);
    const durations = deliveredOrders
      .map((order) => {
        if (!order.fechaEntrega || !order.fecha) {
          return null;
        }
        return (new Date(order.fechaEntrega).getTime() - new Date(order.fecha).getTime()) / 60000;
      })
      .filter((duration): duration is number => duration !== null && duration > 0);

    this.kpis.totalDeliveries = completed.length;
    this.kpis.incidentsCount = incidents.length;
    this.kpis.avgTime = durations.length > 0
      ? `${Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)} min`
      : 'N/A';
  }

  applyFilters() {
    let list = [...this.historyRecords];
    
    // Filtro por Query
    const q = this.query.trim().toLowerCase();
    if (q) {
      list = list.filter(r => 
        r.id.toLowerCase().includes(q) || 
        r.title.toLowerCase().includes(q) || 
        r.subtitle.toLowerCase().includes(q)
      );
    }
    
    // Filtro de Tipo
    if (this.typeFilter !== 'TODOS') {
      list = list.filter(r => r.type === this.typeFilter);
    }
    
    // Filtro de Estado
    if (this.statusFilter !== 'TODOS') {
      list = list.filter(r => r.status === this.statusFilter);
    }
    
    // Filtro de Transportista
    if (this.driverFilter !== 'TODOS') {
      list = list.filter(r => r.driver.toLowerCase().includes(this.driverFilter.toLowerCase()));
    }

    this.filtered = list;
  }

  toggleExpand(record: HistoryRecord) {
    record.expanded = !record.expanded;
  }

  viewOrderById(id: string) {
    // Navegar a la página de órdenes con query param para abrir modal
    this.router.navigate(['/ordenes'], { queryParams: { order: id } });
  }

  exportCsv() {
    // Generación dinámica y descarga de CSV basada en los registros filtrados
    const headers = ['Código/ID', 'Tipo', 'Título', 'Estado', 'Operador', 'Fecha'];
    const rows = [
      headers,
      ...this.filtered.map(r => [r.id, r.type, r.title, r.status, r.driver, r.date.split('T')[0]])
    ];
    
    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `historial_suministros_${Date.now()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    
    this.toastMessage = '✓ Archivo CSV descargado correctamente';
    this.toastOpen = true;
  }

  exportPdf() {
    this.toastMessage = '✓ Preparando documento PDF para imprimir...';
    this.toastOpen = true;
    
    setTimeout(() => {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Historial Logístico</title>
              <style>
                body { font-family: sans-serif; padding: 20px; color: #1e293b; }
                h1 { color: #0f766e; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
                th { background-color: #f1f5f9; }
                .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
                .success { background-color: #dcfce7; color: #15803d; }
                .danger { background-color: #fee2e2; color: #b91c1c; }
              </style>
            </head>
            <body>
              <h1>Historial de Operaciones Médicas</h1>
              <p>Fecha de reporte: ${new Date().toLocaleDateString()}</p>
              <h3>KPIs del Periodo:</h3>
              <ul>
                <li>Entregas Finalizadas: ${this.kpis.totalDeliveries}</li>
                <li>Incidencias Totales: ${this.kpis.incidentsCount}</li>
                <li>Tiempo de Tránsito Promedio: ${this.kpis.avgTime}</li>
              </ul>
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Tipo</th>
                    <th>Título</th>
                    <th>Estado</th>
                    <th>Responsable</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.filtered.map(r => `
                    <tr>
                      <td><strong>${r.id}</strong></td>
                      <td>${r.type}</td>
                      <td>${r.title}</td>
                      <td><span class="badge ${r.status === 'COMPLETADO' ? 'success' : 'danger'}">${r.status}</span></td>
                      <td>${r.driver}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }, 1000);
  }
}
