import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonBadge,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonToast,
  IonTitle,
  IonToolbar,
  IonSelect,
  IonSelectOption,
  IonModal,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkOutline,
  refreshOutline,
  warningOutline,
  playOutline,
  checkmarkDoneOutline,
  alertCircleOutline,
  createOutline,
  personOutline,
  thermometerOutline,
  locationOutline,
  timeOutline,
  carOutline,
  closeOutline,
  pencilOutline,
  saveOutline,
  shieldCheckmarkOutline,
  trendingUpOutline,
  trendingDownOutline,
  flashOutline,
  navigateOutline,
} from 'ionicons/icons';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../auth.service';
import { ActivatedRoute } from '@angular/router';
import { DataService, OrderItem, TraceStep, AlertItem } from '../../data.service';
import { TemperatureService } from '../../services/temperature.service';

interface TimelineStep {
  key: 'preparado' | 'recogido' | 'en ruta' | 'llegada' | 'entregado';
  title: string;
  icon: string;
  description: string;
  timestamp: string;
  completed: boolean;
  active: boolean;
  location?: string;
}

interface TempReading {
  time: string;
  value: number;
  alert: boolean;
}

@Component({
  selector: 'app-trazabilidad',
  templateUrl: './trazabilidad.page.html',
  styleUrls: ['./trazabilidad.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonToolbar, IonTitle, IonBadge, IonButton, IonIcon,
    IonToast, IonSelect, IonSelectOption, IonModal, IonItem, IonLabel,
    IonInput, IonTextarea, CommonModule, FormsModule,
  ],
})
export class TrazabilidadPage implements OnInit, OnDestroy {
  orders: OrderItem[] = [];
  selectedOrder: OrderItem | null = null;

  toastOpen = false;
  toastMessage = '';

  // Modales
  showSignatureModal = false;
  showIncidentModal = false;

  // Firma
  signatureName = '';
  signatureDataUrl = '';
  // Canvas signature
  @ViewChild('signatureCanvas') signatureCanvas!: ElementRef<HTMLCanvasElement>;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private drawing = false;
  private lastX = 0;
  private lastY = 0;
  canvasSupported = true;

  // Incidencia
  incidentType = 'demora';
  incidentDescription = '';

  // Cadena de frío
  tempMin = 2.4;
  tempAvg = 4.2;
  tempMax = 5.8;
  tempCurrent = 4.1;
  tempAlert = false;
  tempLimit = 6.0;

  // ETA dinámico
  etaMinutes = 25;
  etaSeconds = 0;
  etaInterval: any;
  tempInterval: any;

  // Temperatura histórica (últimas 10 lecturas para gráfico SVG)
  tempHistory: TempReading[] = [];
  readonly CHART_W = 420;
  readonly CHART_H = 80;
  readonly TEMP_MIN_Y = 0;
  readonly TEMP_MAX_Y = 9;

  private destroyRef = inject(DestroyRef);
  private temperatureService = inject(TemperatureService);

  constructor(public authService: AuthService, private dataService: DataService, private route: ActivatedRoute) {
    addIcons({
      checkmarkOutline, refreshOutline, warningOutline, playOutline,
      checkmarkDoneOutline, alertCircleOutline, createOutline, personOutline,
      thermometerOutline, locationOutline, timeOutline, carOutline, closeOutline,
      pencilOutline, saveOutline, shieldCheckmarkOutline, trendingUpOutline,
      trendingDownOutline, flashOutline, navigateOutline,
    });
  }

  ngOnInit() {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const orderCode = params['order'] as string | undefined;
      const action = params['action'] as string | undefined;
      this.loadOrders();
      if (orderCode && this.orders.length > 0) {
        const found = this.orders.find(o => o.code === orderCode);
        if (found) {
          this.selectedOrder = found;
          this.signatureDataUrl = this.dataService.getSignature(found.code) || '';
          if (action === 'sign') {
            // open signature modal automatically
            setTimeout(() => this.openSignature(), 50);
          }
        }
      }
    });
    this.startEtaCountdown();
    this.initTempHistory();
  }

  ngOnDestroy() {
    if (this.etaInterval) clearInterval(this.etaInterval);
    if (this.tempInterval) clearInterval(this.tempInterval);
    // Asegurar cleanup de modales y listeners al destruir el componente
    this.showSignatureModal = false;
    this.showIncidentModal = false;
    this.removeCanvasListeners();
  }

  /* ─── Data ─── */
  loadOrders() {
    const allOrders = this.dataService.getOrders();
    if (this.authService.role === 'transportista') {
      const username = this.authService.username || 'driver';
      this.orders = allOrders.filter(o => o.transportistaId === 'driver' || o.transportistaId === username);
    } else {
      this.orders = allOrders;
    }

    if (this.orders.length > 0) {
      if (this.selectedOrder) {
        const found = this.orders.find(o => o.id === this.selectedOrder!.id);
        this.selectedOrder = found || this.orders[0];
      } else {
        this.selectedOrder = this.orders[0];
      }
    } else {
      this.selectedOrder = null;
    }
    // Cargar firma asociada si existe
    if (this.selectedOrder) {
      this.signatureDataUrl = this.dataService.getSignature(this.selectedOrder.code) || '';
      this.etaMinutes = this.calculateEtaMinutes(this.selectedOrder);
      this.etaSeconds = 0;
      this.initTempHistory();
    } else {
      this.signatureDataUrl = '';
    }
  }

  onOrderChange(event: any) {
    const orderId = event.detail.value;
    this.selectedOrder = this.orders.find(o => o.id === orderId) || null;
    this.signatureDataUrl = this.selectedOrder ? (this.dataService.getSignature(this.selectedOrder.code) || '') : '';
    this.signatureName = '';
    this.etaMinutes = this.calculateEtaMinutes(this.selectedOrder);
    this.etaSeconds = 0;
    this.initTempHistory();
  }

  /* ─── Auth ─── */
  get isTransportista(): boolean {
    return this.authService.role === 'transportista';
  }

  /* ─── Timeline ─── */
  get timelineSteps(): TimelineStep[] {
    if (!this.selectedOrder) return [];
    const traces = this.dataService.getTraceForOrder(this.selectedOrder.code);
    const stepsConfig: { key: TimelineStep['key']; title: string; icon: string; desc: string; location: string }[] = [
      { key: 'preparado',  title: 'Preparado',       icon: 'flash-outline',            desc: 'Pedido empacado en contenedor refrigerado.', location: 'Centro de Distribución' },
      { key: 'recogido',   title: 'Recogido',         icon: 'car-outline',              desc: 'Cargado e inspeccionado por el transportista.', location: 'Almacén Principal' },
      { key: 'en ruta',   title: 'En Tránsito',      icon: 'navigate-outline',         desc: 'Monitoreo de temperatura y ubicación activo.', location: 'Av. Javier Prado' },
      { key: 'llegada',    title: 'Llegó al Destino', icon: 'location-outline',         desc: 'Vehículo arribó a instalaciones del cliente.', location: 'Punto de entrega' },
      { key: 'entregado',  title: 'Entregado',        icon: 'shield-checkmark-outline', desc: 'Entrega finalizada con firma digital.', location: 'Cliente final' },
    ];
    const orderStatus = this.selectedOrder.estado;
    let currentStepIndex = 0;
    if (orderStatus === 'En preparación') currentStepIndex = 1;
    else if (orderStatus === 'En camino') currentStepIndex = 2;
    else if (orderStatus === 'Llegué al punto') currentStepIndex = 3;
    const hasLlegada = traces.some(t => t.step === 'llegada');
    if (hasLlegada) currentStepIndex = 3;
    if (orderStatus === 'Entregado') currentStepIndex = 4;

    return stepsConfig.map((sc, index) => {
      const trace = traces.find(t => t.step === sc.key);
      return {
        key: sc.key,
        title: sc.title,
        icon: sc.icon,
        description: trace?.notes || sc.desc,
        location: sc.location,
        timestamp: trace ? new Date(trace.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        completed: index <= currentStepIndex,
        active: index === currentStepIndex,
      };
    });
  }

  get completedStepsCount(): number {
    return this.timelineSteps.filter(s => s.completed).length;
  }

  get progressPercent(): number {
    return Math.round((this.completedStepsCount / 5) * 100);
  }

  /* ─── Actions ─── */
  advanceStep(): void {
    if (!this.selectedOrder) return;
    const currentStatus = this.selectedOrder.estado;
    if (currentStatus === 'Pendiente') {
      this.dataService.updateOrderStatus(this.selectedOrder.id, 'En preparación');
      this.toastMessage = '📦 Pedido marcado: En preparación';
    } else if (currentStatus === 'En preparación') {
      this.dataService.updateOrderStatus(this.selectedOrder.id, 'En camino');
      this.toastMessage = '🚗 Pedido iniciado: En ruta';
    } else if (currentStatus === 'En camino') {
      this.dataService.updateOrderStatus(this.selectedOrder.id, 'Llegué al punto');
      this.toastMessage = '📍 Llegada al punto registrada';
    } else if (currentStatus === 'Llegué al punto') {
      this.toastMessage = '✅ Ya registraste la llegada. Continúa con la firma de entrega.';
    }
    this.toastOpen = true;
    this.loadOrders();
  }

  openSignature(): void {
    this.removeCanvasListeners();
    this.signatureName = '';
    this.showSignatureModal = true;
    setTimeout(() => this.initCanvas(), 50);
  }

  confirmSignature(): void {
    if (!this.selectedOrder || !this.signatureName.trim()) {
      this.toastMessage = 'Por favor, ingresa el nombre de quien recibe.';
      this.toastOpen = true;
      return;
    }

    // If canvas is supported and has drawing, use it; otherwise fallback to SVG
    try {
      let dataUrl: string | null = null;
      if (this.canvasSupported && this.signatureCanvas && this.canvasCtx) {
        const canvas = this.signatureCanvas.nativeElement;
        // Check if canvas is blank
        const blank = this.isCanvasBlank(canvas);
        if (!blank) {
          dataUrl = canvas.toDataURL('image/png');
        }
      }

      if (!dataUrl) {
        // Fallback SVG signature (keeps previous behaviour)
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="120"><rect width="100%" height="100%" fill="#fff"/><text x="20" y="40" font-family="Segoe UI, Arial" font-size="14" fill="#0f766e">Recibido por: ${this.escapeForSvg(this.signatureName)}</text><path d="M20 80 Q 80 40 140 80 T 260 60 T 380 80" stroke="#0f766e" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
        dataUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
      }

      // Guardar firma en mock storage
      this.dataService.saveSignature(this.selectedOrder.code, dataUrl);
      this.signatureDataUrl = dataUrl;
      this.showSignatureModal = false;

      // Marcar entrega y añadir trazabilidad
      this.dataService.updateOrderStatus(this.selectedOrder.id, 'Entregado');
      this.toastMessage = '✓ Entrega finalizada con firma';
      this.toastOpen = true;
      this.loadOrders();
    } catch (err) {
      // If anything fails, fallback to SVG and continue
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="120"><rect width="100%" height="100%" fill="#fff"/><text x="20" y="40" font-family="Segoe UI, Arial" font-size="14" fill="#0f766e">Recibido por: ${this.escapeForSvg(this.signatureName)}</text><path d="M20 80 Q 80 40 140 80 T 260 60 T 380 80" stroke="#0f766e" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
      const dataUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
      this.dataService.saveSignature(this.selectedOrder.code, dataUrl);
      this.signatureDataUrl = dataUrl;
      this.showSignatureModal = false;
      this.dataService.updateOrderStatus(this.selectedOrder.id, 'Entregado');
      this.toastMessage = '✓ Entrega finalizada (firma fallback)';
      this.toastOpen = true;
      this.loadOrders();
    }
  }

  private initCanvas(): void {
    try {
      const canvas = this.signatureCanvas?.nativeElement;
      if (!canvas) { this.canvasSupported = false; return; }
      // set size
      const ratio = window.devicePixelRatio || 1;
      const rectW = Math.max(300, Math.min(window.innerWidth - 40, 400));
      const rectH = 140;
      canvas.width = rectW * ratio;
      canvas.height = rectH * ratio;
      canvas.style.width = rectW + 'px';
      canvas.style.height = rectH + 'px';
      this.canvasCtx = canvas.getContext('2d');
      if (!this.canvasCtx) { this.canvasSupported = false; return; }
      this.canvasCtx.scale(ratio, ratio);
      this.canvasCtx.lineJoin = 'round';
      this.canvasCtx.lineCap = 'round';
      this.canvasCtx.lineWidth = 3;
      this.canvasCtx.strokeStyle = '#0f766e';
      // Attach pointer events
      canvas.addEventListener('pointerdown', this.onPointerDown);
      canvas.addEventListener('pointermove', this.onPointerMove);
      canvas.addEventListener('pointerup', this.onPointerUp);
      canvas.addEventListener('pointercancel', this.onPointerUp);
      window.addEventListener('pointerup', this.onPointerUp);
      window.addEventListener('pointercancel', this.onPointerUp);
      // touch-action none to allow drawing on mobile
      canvas.style.touchAction = 'none';
    } catch {
      this.canvasSupported = false;
    }
  }

  removeCanvasListeners(): void {
    if (!this.signatureCanvas) return;
    const canvas = this.signatureCanvas.nativeElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('pointercancel', this.onPointerUp);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
  }

  private onPointerDown = (ev: PointerEvent) => {
    const canvas = this.signatureCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    this.drawing = true;
    this.lastX = ev.clientX - rect.left;
    this.lastY = ev.clientY - rect.top;
  };

  private onPointerMove = (ev: PointerEvent) => {
    if (!this.drawing || !this.canvasCtx) return;
    const canvas = this.signatureCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    this.canvasCtx.beginPath();
    this.canvasCtx.moveTo(this.lastX, this.lastY);
    this.canvasCtx.lineTo(x, y);
    this.canvasCtx.stroke();
    this.lastX = x;
    this.lastY = y;
  };

  private onPointerUp = () => { this.drawing = false; };

  clearCanvas(): void {
    if (!this.signatureCanvas || !this.canvasCtx) return;
    const canvas = this.signatureCanvas.nativeElement;
    this.canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  }

  private isCanvasBlank(canvas: HTMLCanvasElement): boolean {
    try {
      const blank = document.createElement('canvas');
      blank.width = canvas.width;
      blank.height = canvas.height;
      return canvas.toDataURL() === blank.toDataURL();
    } catch {
      return true;
    }
  }

  openIncident(): void { this.incidentType = 'demora'; this.incidentDescription = ''; this.showIncidentModal = true; }

  submitIncident(): void {
    if (!this.selectedOrder) {
      this.toastMessage = 'No hay orden seleccionada.';
      this.toastOpen = true;
      return;
    }
    if (!this.incidentDescription.trim()) {
      this.toastMessage = 'La descripción es obligatoria.';
      this.toastOpen = true;
      return;
    }
    this.dataService.addAlert({
      type: 'CRÍTICA',
      message: `Incidencia en ${this.selectedOrder.code}: [${this.incidentType}] ${this.incidentDescription}`,
      related: { type: 'orden', id: this.selectedOrder.code },
      read: false,
    });
    // Set order status to Incidencia
    this.dataService.updateOrderStatus(this.selectedOrder.id, 'Incidencia');
    this.showIncidentModal = false;
    this.toastMessage = '⚠️ Incidencia reportada al supervisor';
    this.toastOpen = true;
    this.loadOrders();
  }

  private escapeForSvg(s: string) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ─── Temperature History Chart ─── */
  initTempHistory() {
    const baseline = this.selectedOrder?.requiresColdChain ? 4.5 : 6.0;
    this.tempHistory = this.temperatureService.getReadings(this.selectedOrder?.code, 10, baseline);
    const values = this.tempHistory.map((entry) => entry.value);
    this.tempCurrent = values[values.length - 1] ?? baseline;
    this.tempMin = Math.min(...values, this.tempCurrent);
    this.tempMax = Math.max(...values, this.tempCurrent);
    this.tempAvg = parseFloat((values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(1));
  }

  get tempChartPoints(): string {
    if (this.tempHistory.length === 0) return '';
    const stepX = this.CHART_W / (this.tempHistory.length - 1);
    const range = this.TEMP_MAX_Y - this.TEMP_MIN_Y;
    return this.tempHistory.map((r, i) => {
      const x = i * stepX;
      const y = this.CHART_H - ((r.value - this.TEMP_MIN_Y) / range) * this.CHART_H;
      return `${x},${y}`;
    }).join(' ');
  }

  get tempChartArea(): string {
    if (this.tempHistory.length === 0) return '';
    const pts = this.tempChartPoints;
    const firstX = 0;
    const lastX = this.CHART_W;
    return `${firstX},${this.CHART_H} ${pts} ${lastX},${this.CHART_H}`;
  }

  getChartDotX(index: number): number {
    return index * (this.CHART_W / (this.tempHistory.length - 1));
  }

  getChartDotY(val: number): number {
    const range = this.TEMP_MAX_Y - this.TEMP_MIN_Y;
    return this.CHART_H - ((val - this.TEMP_MIN_Y) / range) * this.CHART_H;
  }

  /* ─── Simulations ─── */
  startEtaCountdown(): void {
    this.etaInterval = setInterval(() => {
      if (this.selectedOrder && this.selectedOrder.estado === 'En camino') {
        this.etaMinutes = this.calculateEtaMinutes(this.selectedOrder);
      }
    }, 30000);
  }

  simulateTemperature(): void {
    // Use TemperatureService to update temperature periodically
    this.tempInterval = setInterval(() => {
      if (this.selectedOrder && this.selectedOrder.estado === 'En camino') {
        this.tempCurrent = this.temperatureService.getCurrentTemp(this.selectedOrder.code);
        this.tempAlert = this.tempCurrent > this.tempLimit;
        this.tempMin = Math.min(this.tempMin, this.tempCurrent);
        this.tempMax = Math.max(this.tempMax, this.tempCurrent);

        const now = new Date();
        this.tempHistory.push({ time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: this.tempCurrent, alert: this.tempAlert });
        if (this.tempHistory.length > 12) this.tempHistory.shift();

        const sum = this.tempHistory.reduce((a, b) => a + b.value, 0);
        this.tempAvg = parseFloat((sum / this.tempHistory.length).toFixed(1));
      }
    }, 6000);
  }

  private calculateEtaMinutes(order: OrderItem | null): number {
    if (!order?.fechaEntrega) {
      return 0;
    }
    const eta = new Date(order.fechaEntrega).getTime();
    const diff = eta - Date.now();
    if (diff <= 0) {
      return 0;
    }
    return Math.ceil(diff / 60000);
  }

  getStatusColor(status: string): string {
    if (status === 'Pendiente') return 'warning';
    if (status === 'En preparación') return 'medium';
    if (status === 'En camino') return 'primary';
    if (status === 'Entregado') return 'success';
    if (status === 'Incidencia') return 'danger';
    return 'danger';
  }

  get etaDisplay(): string {
    if (this.etaMinutes <= 0) return '< 1 min';
    if (this.etaMinutes >= 60) return `${Math.floor(this.etaMinutes / 60)}h ${this.etaMinutes % 60}min`;
    return `${this.etaMinutes} min`;
  }

  get tempTrend(): 'up' | 'down' | 'stable' {
    if (this.tempHistory.length < 3) return 'stable';
    const last = this.tempHistory[this.tempHistory.length - 1].value;
    const prev = this.tempHistory[this.tempHistory.length - 3].value;
    if (last - prev > 0.3) return 'up';
    if (prev - last > 0.3) return 'down';
    return 'stable';
  }
}
