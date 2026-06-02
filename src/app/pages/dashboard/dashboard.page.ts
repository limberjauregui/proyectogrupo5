import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonToast,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonBadge,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  refreshOutline,
  calendarOutline,
  carOutline,
  checkmarkCircleOutline,
  warningOutline,
  shieldCheckmarkOutline,
  thermometerOutline,
  timeOutline,
  closeOutline,
  alertCircleOutline,
  cubeOutline,
  documentTextOutline,
} from 'ionicons/icons';
import { AuthService } from '../../auth.service';
import { DataService, KpiItem, DeliveryItem, AlertItem, ProductItem } from '../../data.service';
import { TemperatureService } from '../../services/temperature.service';
import { DestroyRef, inject } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonButton,
    IonIcon,
    IonToast,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonBadge,
    IonItem,
    IonLabel,
    IonList,
    CommonModule,
  ],
})
export class DashboardPage implements OnInit {
  kpis: KpiItem[] = [];
  upcomingDeliveries: DeliveryItem[] = [];
  dailyDeliveries: DeliveryItem[] = [];
  criticalAlerts: AlertItem[] = [];
  lowStockProducts: ProductItem[] = [];
  coldChainSummary = { min: 0, avg: 0, max: 0, status: 'Sin registros' };
  activeRange = '7D';
  chartPath = '';
  chartAreaPath = '';
  isRefreshing = false;
  private destroyRef = inject(DestroyRef);
  private temperatureService = inject(TemperatureService);
  private coldChainTemps: number[] | null = null;
  private coldChainCount = 0;

  toastOpen = false;
  toastMessage = '';
  showControlDiarioModal = false;

  constructor(
    public authService: AuthService,
    private dataService: DataService,
    private router: Router
  ) {
    addIcons({
      refreshOutline,
      calendarOutline,
      carOutline,
      checkmarkCircleOutline,
      warningOutline,
      shieldCheckmarkOutline,
      thermometerOutline,
      timeOutline,
      closeOutline,
      alertCircleOutline,
      cubeOutline,
      documentTextOutline,
    });
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.kpis = this.dataService.getKpis();
    this.upcomingDeliveries = this.dataService.getUrgentDeliveries();
    this.dailyDeliveries = this.dataService.getDeliveries();
    this.criticalAlerts = this.dataService.getAlerts().filter((alert) => alert.type === 'CRÍTICA');
    this.lowStockProducts = this.dataService
      .getProducts()
      .filter((product) => this.dataService.getStockState(product) === 'CRÍTICO')
      .slice(0, 4);

    this.coldChainSummary = this.buildColdChainSummary();
    this.buildChartData();
  }

  private buildColdChainSummary() {
    const coldOrders = this.dataService
      .getOrders()
      .filter((order) => order.requiresColdChain && order.estado !== 'Entregado');

    if (coldOrders.length === 0) {
      return { min: 0, avg: 0, max: 0, status: 'Sin registros' };
    }
    // WARN-3: stabilize generated temperatures while the set of cold orders is unchanged
    if (!this.coldChainTemps || this.coldChainCount !== coldOrders.length) {
      this.coldChainTemps = coldOrders.map((o) => this.temperatureService.getCurrentTemp(o.code));
      this.coldChainCount = coldOrders.length;
    }
    const temperatures = this.coldChainTemps;
    const min = Math.min(...temperatures);
    const max = Math.max(...temperatures);
    const avg = temperatures.reduce((a, b) => a + b, 0) / temperatures.length;

    let status = 'Estable';

    if (avg > 7.0) {
      status = 'Crítico';
    } else if (avg > 5.5) {
      status = 'En riesgo';
    }

    return {
      min: parseFloat(min.toFixed(1)),
      avg: parseFloat(avg.toFixed(1)),
      max: parseFloat(max.toFixed(1)),
      status,
    };
  }

  private buildChartData(days: number = 7) {
    const orders = this.dataService.getOrders();

    const dayArray = Array.from({ length: days }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - index));
      date.setHours(0, 0, 0, 0);
      return date;
    });

    const counts = dayArray.map((day) => {
      return orders.filter((order) => {
        if (!order.fechaEntrega) {
          return false;
        }

        const orderDate = new Date(order.fechaEntrega);
        orderDate.setHours(0, 0, 0, 0);

        return orderDate.getTime() === day.getTime();
      }).length;
    });

    // IMP-5: provide minimal headroom for chart scale
    const maxCount = Math.max(...counts, 2);

    const points = counts.map((count, index) => {
      const x = 50 + index * (400 / days);
      const y = 170 - (count / maxCount) * 120;

      return { x, y };
    });

    this.chartPath = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x},${point.y}`)
      .join(' ');

    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];

    this.chartAreaPath = `${this.chartPath} L ${lastPoint.x},170 L ${firstPoint.x},170 Z`;
  }

  get roleLabel(): string {
    return this.authService.role === 'supervisor' ? 'Supervisor' : 'Usuario';
  }

  navigate(url: string): void {
    this.router.navigateByUrl(url, { replaceUrl: true });
  }

  setRange(range: string) {
    this.activeRange = range;
    const mapping: Record<string, number> = { '7D': 7, '30D': 30, '90D': 90 };
    const days = (mapping[range] ?? Number(range)) || 7;
    this.buildChartData(days);
  }

  refreshData() {
    this.isRefreshing = true;

    setTimeout(() => {
      this.loadData();
      this.isRefreshing = false;
      this.toastMessage = 'Dashboard actualizado';
      this.toastOpen = true;
    }, 800);
  }

  openControlDiario() {
    this.showControlDiarioModal = true;
  }

  closeControlDiario() {
    this.showControlDiarioModal = false;
  }
}