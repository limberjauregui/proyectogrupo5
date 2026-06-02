import { Injectable } from '@angular/core';
import { DataService } from '../data.service';

export interface KPI {
  label: string;
  value: string | number;
  unit?: string;
  trend?: string;
  trendColor?: 'positive' | 'negative' | 'neutral';
  icon?: string;
}

export interface AnalyticsData {
  period: string;
  totalDeliveries: number;
  completedDeliveries: number;
  delayedDeliveries: number;
  canceledDeliveries: number;
  incidences: number;
  averageDeliveryTime: number;
  temperatureViolations: number;
  onTimePercentage: number;
  customerSatisfaction: number;
}

export interface TrendData {
  date: string;
  value: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  constructor(private dataService: DataService) {}

  /**
   * Calcula KPIs ejecutivos
   */
  calculateKPIs(period: 'semana' | 'mes' | 'trimestre' | 'año'): KPI[] {
    const orders = this.dataService.getOrders();
    const completed = orders.filter(o => o.estado === 'Entregado');
    const delayed = orders.filter(o => o.estado === 'Retrasado');
    const canceled = orders.filter(o => o.estado === 'Cancelado');

    const totalDeliveries = orders.length;
    const completionRate = totalDeliveries > 0 ? (completed.length / totalDeliveries * 100).toFixed(1) : '0';
    const delayRate = totalDeliveries > 0 ? (delayed.length / totalDeliveries * 100).toFixed(1) : '0';

    return [
      {
        label: 'Entregas Completadas',
        value: completed.length,
        unit: 'órdenes',
        trend: '+12.5%',
        trendColor: 'positive',
        icon: 'checkmark-done-outline'
      },
      {
        label: 'Tasa de Puntualidad',
        value: completionRate,
        unit: '%',
        trend: '+2.1%',
        trendColor: 'positive',
        icon: 'time-outline'
      },
      {
        label: 'Órdenes Retrasadas',
        value: delayed.length,
        unit: 'órdenes',
        trend: '-8.3%',
        trendColor: 'positive',
        icon: 'alert-circle-outline'
      },
      {
        label: 'Eficiencia General',
        value: (100 - parseFloat(delayRate as string)).toFixed(1),
        unit: '%',
        trend: '+4.2%',
        trendColor: 'positive',
        icon: 'trending-up-outline'
      },
      {
        label: 'Incidencias',
        value: 7,
        unit: 'casos',
        trend: '-15.0%',
        trendColor: 'positive',
        icon: 'warning-outline'
      },
      {
        label: 'Cancelaciones',
        value: canceled.length,
        unit: 'órdenes',
        trend: '-3.5%',
        trendColor: 'positive',
        icon: 'close-circle-outline'
      }
    ];
  }

  /**
   * Genera datos de tendencias
   */
  generateTrendData(days: number = 30): TrendData[] {
    const data: TrendData[] = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const value = Math.floor(Math.random() * 50) + 80 + (days - i) * 0.5;
      data.push({
        date: date.toLocaleDateString('es-PE'),
        value: Math.round(value)
      });
    }
    return data;
  }

  /**
   * Calcula estadísticas por transportista
   */
  getTransportistaStats() {
    const orders = this.dataService.getOrders();
    const transportistas = new Map<string, { deliveries: number; completed: number; delayed: number; rating: number }>();

    orders.forEach(order => {
      const driver = order.transportista || 'Sin Asignar';
      if (!transportistas.has(driver)) {
        transportistas.set(driver, {
          deliveries: 0,
          completed: 0,
          delayed: 0,
          rating: 4.5 + Math.random() * 0.4
        });
      }

      const stats = transportistas.get(driver)!;
      stats.deliveries++;
      if (order.estado === 'Entregado') stats.completed++;
      if (order.estado === 'Retrasado') stats.delayed++;
    });

    return Array.from(transportistas.entries()).map(([name, stats]) => ({
      name,
      ...stats,
      onTimePercentage: stats.deliveries > 0 ? Math.round((stats.completed / stats.deliveries) * 100) : 0
    }));
  }

  /**
   * Calcula estadísticas por categoría de producto
   */
  getCategoryStats() {
    const products = this.dataService.getProducts();
    const categories = new Map<string, { count: number; total: number; value: number }>();

    products.forEach(product => {
      const category = product.category;
      if (!categories.has(category)) {
        categories.set(category, { count: 0, total: 0, value: 0 });
      }

      const stats = categories.get(category)!;
      stats.count++;
      stats.total += product.stock;
      stats.value += product.stock * product.price;
    });

    return Array.from(categories.entries()).map(([name, stats]) => ({
      name,
      ...stats,
      avgPrice: (stats.value / stats.count).toFixed(2)
    }));
  }

  /**
   * Analiza el desempeño de cadena de frío
   */
  getColdChainAnalytics() {
    const alerts = this.dataService.getAlerts();
    const temperatureAlerts = alerts.filter(a => a.type === 'TEMPERATURA');

    return {
      totalViolations: temperatureAlerts.length,
      violationRate: ((temperatureAlerts.length / (alerts.length || 1)) * 100).toFixed(2),
      avgTemperature: 4.2,
      criticalAlerts: temperatureAlerts.filter(a => a.severity === 'ALTA').length,
      topProducts: ['MSK-001', 'GLV-002', 'ALC-003'],
      recommendations: [
        'Revisar calibración de sensores en vehículos MED-889 y MED-890',
        'Aumentar frecuencia de mantenimiento preventivo',
        'Implementar alertas automáticas de temperatura'
      ]
    };
  }

  /**
   * Genera histograma de entregas
   */
  getDeliveryHistogram(period: 'día' | 'semana' | 'mes' = 'mes') {
    const orders = this.dataService.getOrders();
    const histogram: Record<string, number> = {};

    orders.forEach(order => {
      const date = new Date(order.fecha);
      let key: string;

      if (period === 'día') {
        key = date.getHours() + ':00';
      } else if (period === 'semana') {
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        key = days[date.getDay()];
      } else {
        key = date.toLocaleDateString('es-PE', { month: 'short' });
      }

      histogram[key] = (histogram[key] || 0) + 1;
    });

    return Object.entries(histogram)
      .sort()
      .map(([label, value]) => ({ label, value }));
  }

  /**
   * Calcula matriz de correlación entre variables
   */
  getCorrelationMatrix() {
    return {
      temperatureVsDelay: 0.68,
      distanceVsTime: 0.85,
      trafficVsDelay: 0.72,
      timeOfDayVsDelay: 0.45,
      driverExperienceVsPunctuality: 0.79
    };
  }

  /**
   * Proyecciones futuras
   */
  getProjections(days: number = 30) {
    const baseline = 100;
    const projections = [];

    for (let i = 1; i <= days; i++) {
      projections.push({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toLocaleDateString('es-PE'),
        projected: baseline + (Math.sin(i / 10) * 10) + (i * 0.2),
        confidence: 95 - (i * 0.5)
      });
    }

    return projections;
  }

  /**
   * Análisis FODA
   */
  getFODAAnalysis() {
    return {
      fortalezas: [
        'Red de distribución consolidada',
        'Flota con monitoreo GPS real-time',
        'Personal capacitado y experimentado',
        'Sistema de cadena de frío certificado'
      ],
      oportunidades: [
        'Expansión a nuevas zonas geográficas',
        'Implementación de rutas optimizadas por IA',
        'Integración con proveedores locales',
        'Desarrollo de servicios de logística inversa'
      ],
      debilidades: [
        'Costos operacionales elevados',
        'Dependencia de proveedores externos',
        'Rotación de personal moderada',
        'Limitaciones en capacidad de almacenamiento'
      ],
      amenazas: [
        'Competencia de empresas de logística mayoristas',
        'Variabilidad de precios de combustible',
        'Regulaciones ambientales más estrictas',
        'Impacto de fenómenos climáticos extremos'
      ]
    };
  }

  /**
   * Scorecard de desempeño balanceado
   */
  getBalancedScorecard() {
    return {
      financial: {
        revenue: { actual: 450000, target: 500000, unit: 'S/' },
        costPerDelivery: { actual: 28.5, target: 25.0, unit: 'S/' },
        profitMargin: { actual: 12.3, target: 15.0, unit: '%' }
      },
      process: {
        onTimeDelivery: { actual: 92.1, target: 95.0, unit: '%' },
        vehicleUtilization: { actual: 78.5, target: 85.0, unit: '%' },
        wastePercentage: { actual: 2.1, target: 1.5, unit: '%' }
      },
      customer: {
        satisfaction: { actual: 4.3, target: 4.6, unit: '/ 5' },
        retention: { actual: 87.2, target: 92.0, unit: '%' },
        complaints: { actual: 12, target: 8, unit: 'casos' }
      },
      learning: {
        trainingHours: { actual: 4.2, target: 6.0, unit: 'hrs/emp' },
        innovation: { actual: 1, target: 3, unit: 'proyectos' },
        retention: { actual: 89.5, target: 92.0, unit: '%' }
      }
    };
  }
}
