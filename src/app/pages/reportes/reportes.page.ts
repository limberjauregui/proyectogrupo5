import { Component, OnInit } from '@angular/core';
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
import { alertCircleOutline, barChartOutline, checkmarkDoneOutline, cubeOutline, downloadOutline, documentTextOutline, statsChartOutline, timeOutline, trendingUpOutline } from 'ionicons/icons';
import { DataService } from '../../data.service';

interface ReportMetric {
  label: string;
  value: string;
  trend: string;
  icon: string;
  colorClass: string;
}

interface RankingRow {
  name: string;
  deliveries: number;
  punctuality: number;
  score: number;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonBadge, IonToast],
  templateUrl: 'reportes.page.html',
  styleUrls: ['reportes.page.scss'],
})
export class ReportesPage implements OnInit {
  selectedPeriod: 'Semana' | 'Mes' | 'Trimestre' | 'Año' = 'Mes';
  toastOpen = false;
  toastMessage = '';

  metrics: ReportMetric[] = [];
  transportistas: { name: string; value: number; color: string }[] = [];
  ranking: RankingRow[] = [];

  lineLabels = ['Dic/24', 'Ene/25', 'Feb/25', 'Mar/25', 'Abr/25', 'May/25'];
  lineDataCompleted = [88, 92, 95, 98, 103, 108];
  lineDataDelayed = [12, 10, 9, 8, 7, 9];

  categories = [
    { name: 'Medicamentos', value: 235, color: '#10b981' },
    { name: 'Sueros', value: 170, color: '#f59e0b' },
    { name: 'Equipos', value: 95, color: '#ef4444' },
    { name: 'Cadena frío', value: 130, color: '#6366f1' },
    { name: 'Insumos', value: 70, color: '#0ea5e9' },
  ];

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    this.loadMetrics();
  }

  loadMetrics(): void {
    const kpis = this.dataService.getKpis();
    this.metrics = [
      { label: 'Órdenes activas', value: `${kpis[0].value}`, trend: '+1.3%', icon: cubeOutline, colorClass: 'positive' },
      { label: 'Entregas completadas', value: `${kpis[1].value}`, trend: '+4.5%', icon: checkmarkDoneOutline, colorClass: 'positive' },
      { label: 'Alertas críticas', value: `${kpis[2].value}`, trend: '-12.5%', icon: alertCircleOutline, colorClass: kpis[2].value > 0 ? 'negative' : 'positive' },
      { label: 'Productos urgentes', value: `${kpis[3].value}`, trend: '+3.1%', icon: trendingUpOutline, colorClass: 'positive' },
    ];

    const transportistas = this.dataService.getTransportistas();
    const orders = this.dataService.getOrders();
    const colors = ['#10b981', '#f59e0b', '#8b5cf6', '#14b8a6', '#f97316'];

    this.transportistas = transportistas
      .map((t, index) => ({
        name: t.name,
        value: orders.filter((o) => o.transportistaId === t.id).length,
        color: colors[index % colors.length],
      }))
      .sort((a, b) => b.value - a.value);

    this.ranking = this.transportistas.slice(0, 5).map((item) => ({
      name: item.name,
      deliveries: item.value,
      punctuality: 85 + Math.min(15, item.value),
      score: Math.min(5, 3.8 + item.value * 0.06),
    }));
  }

  setPeriod(value: 'Semana' | 'Mes' | 'Trimestre' | 'Año'): void {
    this.selectedPeriod = value;
    this.toastMessage = `Periodo cambiado a ${value}`;
    this.toastOpen = true;
  }

  exportCsv(): void {
    const headers = ['Métrica', 'Valor', 'Tendencia'];
    const rows = [headers, ...this.metrics.map((metric) => [metric.label, metric.value, metric.trend])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'reportes.csv';
    anchor.click();
    URL.revokeObjectURL(url);
    this.toastMessage = 'CSV descargado correctamente';
    this.toastOpen = true;
  }

  exportPdf(): void {
    const printContent = document.createElement('div');
    printContent.innerHTML = `
      <h1>Reportes ejecutivos</h1>
      <h2>Resumen clave</h2>
      <ul>
        ${this.metrics.map((metric) => `<li><strong>${metric.label}:</strong> ${metric.value} (${metric.trend})</li>`).join('')}
      </ul>
      <h2>Top transportistas</h2>
      <table border="1" cellpadding="6" cellspacing="0">
        <thead><tr><th>#</th><th>Transportista</th><th>Entregas</th><th>Puntualidad</th><th>Calificación</th></tr></thead>
        <tbody>
          ${this.ranking.map((row, index) => `<tr><td>${index + 1}</td><td>${row.name}</td><td>${row.deliveries}</td><td>${row.punctuality}%</td><td>${row.score.toFixed(1)}</td></tr>`).join('')}
        </tbody>
      </table>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Reportes ejecutivos</title></head><body>');
      printWindow.document.write(printContent.innerHTML);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      this.toastMessage = 'PDF listo para imprimir';
      this.toastOpen = true;
    }
  }

  get completedLinePoints(): string {
    return this.getLinePoints(this.lineDataCompleted);
  }

  get delayedLinePoints(): string {
    return this.getLinePoints(this.lineDataDelayed);
  }

  get categoryMax(): number {
    return Math.max(...this.categories.map((category) => category.value));
  }

  get donutSegments() {
    const total = this.transportistas.reduce((sum, item) => sum + item.value, 0);
    const circumference = 2 * Math.PI * 40;
    let offset = 0;
    return this.transportistas.map((segment) => {
      const percentage = segment.value / Math.max(total, 1);
      const dash = percentage * circumference;
      const result = {
        ...segment,
        dashArray: `${dash} ${circumference - dash}`,
        offset,
      };
      offset -= dash;
      return result;
    });
  }

  getLinePoints(values: number[]): string {
    const width = 520;
    const height = 150;
    const padding = 40;
    const max = Math.max(...values) + 20;
    const step = width / (values.length - 1);
    return values
      .map((value, index) => {
        const x = padding + index * step;
        const y = height - (value / max) * (height - padding) + 40;
        return `${x},${y}`;
      })
      .join(' ');
  }

  calcY(value: number, values: number[]): number {
    const height = 150;
    const padding = 40;
    const max = Math.max(...values) + 20;
    return height - (value / max) * (height - padding) + 40;
  }

  downloadOutline = downloadOutline;
  documentTextOutline = documentTextOutline;
}
