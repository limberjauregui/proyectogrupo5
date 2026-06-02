import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonBadge,
  IonButton,
  IonContent,
  IonIcon,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonToast,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline,
  alertCircleOutline,
  informationCircleOutline,
  closeCircleOutline,
  volumeHighOutline,
  volumeMuteOutline,
  trashOutline,
  checkmarkDoneOutline,
} from 'ionicons/icons';
import { DataService, AlertItem } from '../../data.service';
import { AuthService } from '../../auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonIcon,
    IonBadge,
    IonSelect,
    IonSelectOption,
    IonToast,
  ],
  templateUrl: 'alertas.page.html',
  styleUrls: ['alertas.page.scss'],
})
export class AlertasPage implements OnInit {
  alerts: AlertItem[] = [];
  filtered: AlertItem[] = [];
  
  toastOpen = false;
  toastMessage = '';
  
  typeFilter: 'TODAS' | 'CRÍTICA' | 'ADVERTENCIA' | 'INFORMACIÓN' | 'TEMPERATURA' = 'TODAS';
  statusFilter: 'TODAS' | 'LEÍDAS' | 'NO_LEÍDAS' = 'TODAS';
  
  soundOn = true;
  private audioContext: AudioContext | null = null;

  constructor(private dataService: DataService, public authService: AuthService, private router: Router) {
    addIcons({
      checkmarkCircleOutline,
      alertCircleOutline,
      informationCircleOutline,
      closeCircleOutline,
      volumeHighOutline,
      volumeMuteOutline,
      trashOutline,
      checkmarkDoneOutline,
    });
  }

  ngOnInit() {
    this.loadAlerts();
  }

  loadAlerts() {
    this.alerts = this.dataService.getAlerts();
    if (this.alerts.length === 0) {
      const orders = this.dataService.getOrders();
      orders.filter((order) => order.estado === 'Incidencia')
        .forEach((order) => this.dataService.addAlert({
          type: 'CRÍTICA',
          message: `Incidencia reportada en ${order.code}: requiere atención urgente.`,
          related: { type: 'orden', id: order.code },
          date: new Date().toISOString(),
          read: false,
        }));

      this.dataService.getProducts().filter((product) => this.dataService.getStockState(product) === 'CRÍTICO')
        .slice(0, 2)
        .forEach((product) => this.dataService.addAlert({
          type: 'ADVERTENCIA',
          message: `Stock crítico detectado en ${product.name}: ${product.stock} uds restantes.`,
          related: { type: 'producto', id: String(product.id) },
          date: new Date().toISOString(),
          read: false,
        }));

      this.alerts = this.dataService.getAlerts();
    }
    this.applyFilters();
  }

  applyFilters() {
    let list = [...this.alerts];
    
    // Filter for cliente: only alerts related to their solicitudes/órdenes
    if (this.authService.role === 'cliente') {
      const clienteUsername = this.authService.username;
      const clienteSolicitudes = this.dataService.getSolicitudes()
        .filter(s => s.clienteId === clienteUsername)
        .map(s => s.code);
      
      const clienteOrdenes = this.dataService.getOrders()
        .filter(o => o.clienteId === clienteUsername)
        .map(o => o.code);
      
      list = list.filter(a => {
        // Show alerts related to their solicitudes
        if (a.related?.type === 'pedido' && clienteSolicitudes.includes(a.related.id)) {
          return true;
        }
        // Show alerts related to their órdenes
        if (a.related?.type === 'orden' && clienteOrdenes.includes(a.related.id)) {
          return true;
        }
        return false;
      });
    }
    
    // Filter for transportista: only alerts related to their orders
    if (this.authService.role === 'transportista') {
      const transportistaOrders = this.dataService.getOrders()
        .filter(o => o.transportistaId === this.authService.username)
        .map(o => o.code);
      
      list = list.filter(a => {
        // Show alerts related to their orders
        if (a.related?.type === 'orden' && transportistaOrders.includes(a.related.id)) {
          return true;
        }
        // Show alerts related to them directly
        if (a.related?.type === 'transportista' && a.related.id === this.authService.username) {
          return true;
        }
        // Show alerts related to their vehicle
        if (a.related?.type === 'vehículo') {
          return true;
        }
        return false;
      });
    }
    
    if (this.typeFilter !== 'TODAS') {
      list = list.filter(a => a.type === this.typeFilter);
    }
    
    if (this.statusFilter === 'LEÍDAS') {
      list = list.filter(a => a.read);
    } else if (this.statusFilter === 'NO_LEÍDAS') {
      list = list.filter(a => !a.read);
    }

    this.filtered = list;
  }

  get unreadCount(): number {
    return this.filtered.filter(a => !a.read).length;
  }

  get unreadCountForCurrentUser(): number {
    if (this.authService.role === 'transportista') {
      const myOrders = this.dataService.getOrdersForTransportista(this.authService.username || '')
        .map(o => o.code);
      return this.dataService.getAlerts().filter(a =>
        !a.read && (
          (a.related?.type === 'orden' && myOrders.includes(a.related.id)) ||
          (a.related?.type === 'transportista' && a.related.id === this.authService.username) ||
          a.related?.type === 'vehículo'
        )
      ).length;
    }
    if (this.authService.role === 'cliente') {
      const myOrders = this.dataService.getOrders()
        .filter(o => o.clienteId === this.authService.username)
        .map(o => o.code);
      return this.dataService.getAlerts().filter(a =>
        !a.read && a.related?.type === 'orden' && myOrders.includes(a.related.id)
      ).length;
    }
    return this.dataService.getAlerts().filter(a => !a.read).length;
  }

  get criticalCount(): number {
    return this.filtered.filter(a => a.type === 'CRÍTICA' && !a.read).length;
  }

  get warningCount(): number {
    return this.filtered.filter(a => a.type === 'ADVERTENCIA' && !a.read).length;
  }

  get infoCount(): number {
    return this.filtered.filter(a => a.type === 'INFORMACIÓN' && !a.read).length;
  }

  getAlertIcon(type: AlertItem['type']): string {
    return type === 'CRÍTICA' ? 'alert-circle-outline' :
           type === 'ADVERTENCIA' ? 'warning-outline' :
           type === 'TEMPERATURA' ? 'thermometer-outline' : 'information-circle-outline';
  }

  getAlertClass(type: AlertItem['type']): string {
    return type === 'CRÍTICA' ? 'alert-critical' :
           type === 'ADVERTENCIA' ? 'alert-warning' :
           type === 'TEMPERATURA' ? 'alert-temperature' : 'alert-info';
  }

  markAsRead(alert: AlertItem) {
    this.dataService.markAlertRead(alert.id);
    alert.read = true;
    this.toastMessage = '✓ Alerta marcada como leída';
    this.toastOpen = true;
    this.applyFilters();
  }

  markAllRead(): void {
    this.alerts.forEach(a => {
      this.dataService.markAlertRead(a.id);
      a.read = true;
    });
    this.toastMessage = '✓ Todas las alertas marcadas como leídas';
    this.toastOpen = true;
    this.applyFilters();
  }

  handleAlert(alert: AlertItem) {
    this.markAsRead(alert);
    if (this.authService.role === 'cliente') {
      if (alert.related?.type === 'pedido') {
        const solicitud = this.dataService.getSolicitudes().find((s) => s.code === alert.related?.id);
        if (solicitud) {
          this.router.navigate(['/solicitud', solicitud.id]);
        } else {
          this.router.navigate(['/solicitudes']);
        }
      } else if (alert.related?.type === 'orden') {
        const order = this.dataService.findOrderByCode(alert.related.id);
        if (order?.solicitudId) {
          this.router.navigate(['/solicitud', order.solicitudId]);
        } else {
          this.router.navigate(['/solicitudes']);
        }
      } else {
        this.router.navigate(['/solicitudes']);
      }
    } else {
      // If the alert is related to a specific order, open the Ordenes page with query param
      if (alert.related?.type === 'orden' && alert.related.id) {
        this.router.navigate(['/ordenes'], { queryParams: { order: alert.related.id } });
      } else {
        this.router.navigate(['/ordenes']);
      }
    }

    this.toastMessage = `✓ Alerta atendida: ${alert.message.substring(0, 30)}...`;
    this.toastOpen = true;
  }

  deleteAlert(alert: AlertItem): void {
    const removed = this.dataService.deleteAlert(alert.id);
    if (removed) {
      const idx = this.alerts.findIndex((x) => x.id === alert.id);
      if (idx > -1) {
        this.alerts.splice(idx, 1);
      }
      this.toastMessage = '✓ Alerta eliminada';
    } else {
      this.toastMessage = 'No se pudo eliminar la alerta';
    }
    this.toastOpen = true;
    this.applyFilters();
  }

  private getAudioContext(): AudioContext | null {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {
        this.audioContext = null;
      }
    }
    return this.audioContext;
  }

  private playTone(frequency: number, duration: number = 0.12): void {
    const context = this.getAudioContext();
    if (!context) return;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    gain.connect(context.destination);
    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.01);
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.stop(context.currentTime + duration + 0.02);
  }

  toggleSound(): void {
    this.soundOn = !this.soundOn;
    const context = this.getAudioContext();
    if (!context) {
      this.toastMessage = this.soundOn
        ? 'Alertas activadas (sin sonido: navegador no soporta audio)'
        : 'Alertas silenciadas';
      this.toastOpen = true;
      return;
    }

    // El navegador puede bloquear AudioContext hasta que el usuario interactúa.
    // resume() lo desbloquea explícitamente.
    const resumeAndPlay = () => {
      if (this.soundOn) {
        this.playTone(880, 0.12);
        this.toastMessage = '🔔 Alertas sonoras activadas';
      } else {
        this.playTone(220, 0.08);
        this.toastMessage = '🔕 Alertas sonoras silenciadas';
      }
      this.toastOpen = true;
    };

    if (context.state === 'suspended') {
      context.resume().then(() => {
        resumeAndPlay();
      }).catch(() => {
        this.toastMessage = this.soundOn
          ? '🔔 Alertas activadas (audio bloqueado por el navegador)'
          : '🔕 Alertas silenciadas';
        this.toastOpen = true;
      });
    } else {
      resumeAndPlay();
    }
  }
}
