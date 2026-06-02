import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  qrCodeOutline,
  searchOutline,
  barcodeOutline,
  documentTextOutline,
  alertCircleOutline,
  cubeOutline,
  checkmarkCircleOutline,
  timeOutline,
  trashOutline,
  arrowForwardOutline,
  closeOutline,
  flashOutline,
  cameraOutline,
  downloadOutline,
  refreshOutline,
  imageOutline,
} from 'ionicons/icons';
import { DataService } from '../../data.service';
import { QRScannerService, QRScanResult } from '../../services/qr-scanner.service';
import { AuthService } from '../../auth.service';

interface ScanResult {
  type: 'pedido' | 'producto' | 'none';
  title: string;
  subtitle: string;
  properties: { label: string; value: string }[];
  relatedOrderCode?: string;
}

interface ScanHistoryEntry {
  code: string;
  type: 'pedido' | 'producto' | 'none';
  timestamp: Date;
  result: ScanResult;
}

@Component({
  selector: 'app-scanner',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonBadge,
    IonToast,
  ],
  templateUrl: 'scanner.page.html',
  styleUrls: ['scanner.page.scss'],
})
export class ScannerPage implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  scanQuery = '';
  toastOpen = false;
  toastMessage = '';
  result: ScanResult | null = null;

  // Escaneo en vivo
  cameraActive = false;
  cameraScanningInterval: any;
  hasCameraSupport = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  cameraErrorMessage = '';

  // Scanning state machine
  scanState: 'idle' | 'scanning' | 'success' | 'error' = 'idle';

  // Scan history
  scanHistory: ScanHistoryEntry[] = [];
  qrHistory: QRScanResult[] = [];

  // Modo de escaneo
  scanMode: 'manual' | 'camera' | 'file' = 'manual';

  // Sugerencias
  suggestedCodes = ['MSK-001', 'GLV-002', 'ALC-003', 'ORD-1098', 'ORD-1105'];

  constructor(
    private dataService: DataService,
    private router: Router,
    private qrScannerService: QRScannerService,
    private authService: AuthService
  ) {
    addIcons({
      qrCodeOutline,
      searchOutline,
      documentTextOutline,
      barcodeOutline,
      alertCircleOutline,
      cubeOutline,
      checkmarkCircleOutline,
      timeOutline,
      trashOutline,
      arrowForwardOutline,
      closeOutline,
      flashOutline,
      cameraOutline,
      downloadOutline,
      refreshOutline,
      imageOutline,
    });

    this.hasCameraSupport = navigator.mediaDevices !== undefined;
  }

  ngOnInit() {
    this.loadHistory();
    this.qrHistory = this.qrScannerService.getScanHistory();
  }

  ionViewWillLeave() {
    this.stopCamera();
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  private loadHistory(): void {
    try {
      const raw = sessionStorage.getItem('scan_history');
      if (raw)
        this.scanHistory = JSON.parse(raw).map((h: any) => ({
          ...h,
          timestamp: new Date(h.timestamp),
        }));
    } catch {}
  }

  // ═══════════════════════════════════════
  // MODO MANUAL: Búsqueda por código
  // ═══════════════════════════════════════

  searchCode(): void {
    const code = this.scanQuery.trim().toUpperCase();
    if (!code) {
      this.showToast('⚠️ Ingresa un código válido para iniciar.');
      return;
    }

    this.scanState = 'scanning';

    setTimeout(() => {
      // 1. Buscar en Órdenes
      const order =
        this.dataService.findOrderByCode(code) ||
        this.dataService.getOrders().find((o) => o.code.toUpperCase() === code);
      if (order) {
        // If user is transportista, only allow orders assigned to them
        const isDriver = this.authService.role === 'transportista';
        const username = this.authService.username || '';
        if (isDriver && order.transportistaId !== username) {
          this.result = {
            type: 'none',
            title: '❌ Orden no asignada',
            subtitle: `La orden ${order.code} no está asignada a tu usuario.`,
            properties: [{ label: 'Código', value: order.code }],
          };
          this.scanState = 'error';
          this.showToast('❌ Esta orden no está asignada a ti');
          this.addToHistory(code, this.result);
          return;
        }
        this.result = {
          type: 'pedido',
          title: '✓ Orden Localizada',
          subtitle: 'Pedido activo en la cadena de distribución',
          properties: [
            { label: 'Código de Orden', value: order.code },
            { label: 'Cliente Destinatario', value: order.cliente || order.clienteId },
            { label: 'Prioridad de Despacho', value: order.prioridad },
            { label: 'Estado Operativo', value: order.estado },
            {
              label: 'Fecha Solicitud',
              value: new Date(order.fecha).toLocaleDateString('es-PE'),
            },
          ],
        };
        this.scanState = 'success';
        this.showToast('✓ Orden encontrada con éxito');
        this.addToHistory(code, this.result);
        return;
      }

      // 2. Buscar en Productos
      const product =
        this.dataService.findProductByCode(code) ||
        this.dataService.getProducts().find((p) => p.code.toUpperCase() === code);
      if (product) {
        const isDriver = this.authService.role === 'transportista';
        const assignedOrders = isDriver
          ? this.dataService.getOrders().filter((o) => o.transportistaId === this.authService.username)
          : [];
        const matchedOrder = assignedOrders.find((o) =>
          (o.products || []).some((p) => p.code.toUpperCase() === product.code.toUpperCase())
        );

        if (isDriver && !matchedOrder) {
          this.result = {
            type: 'none',
            title: '❌ Insumo fuera de tus entregas',
            subtitle: 'Este producto no está asignado a ninguna de tus órdenes actuales.',
            properties: [{ label: 'Código', value: product.code }],
          };
          this.scanState = 'error';
          this.showToast('❌ Producto no asociado a tus entregas');
          this.addToHistory(code, this.result);
          return;
        }

        this.result = {
          type: 'producto',
          title: matchedOrder ? '✓ Insumo asignado a tu orden' : '✓ Insumo Localizado',
          subtitle: matchedOrder
            ? `Este insumo pertenece a la orden ${matchedOrder.code}`
            : 'Ficha de inventario y stock disponible',
          properties: [
            { label: 'Código SKU', value: product.code },
            { label: 'Nombre Insumo', value: product.name },
            { label: 'Categoría', value: product.category },
            { label: 'Stock en Almacén', value: `${product.stock} unidades` },
            { label: 'Precio Unitario', value: `S/ ${product.price.toFixed(2)}` },
            { label: 'Estado Stock', value: this.dataService.getStockState(product) },
          ],
          relatedOrderCode: matchedOrder?.code,
        };
        this.scanState = 'success';
        this.showToast('✓ Insumo localizado');
        this.addToHistory(code, this.result);
        return;
      }

      // 3. No encontrado
      this.result = {
        type: 'none',
        title: '❌ Código No Registrado',
        subtitle: 'El código no coincide con ninguna orden o insumo activo.',
        properties: [{ label: 'Búsqueda Ingresada', value: code }],
      };
      this.scanState = 'error';
      this.showToast('❌ Código no reconocido en la base de datos');
      this.addToHistory(code, this.result);
    }, 600);
  }

  // ═══════════════════════════════════════
  // MODO CÁMARA: Escaneo en vivo
  // ═══════════════════════════════════════

  async startCamera(): Promise<void> {
    if (!this.hasCameraSupport) {
      this.cameraErrorMessage = 'No se pudo acceder a la cámara. Puedes usar búsqueda manual o escanear desde imagen.';
      this.showToast(this.cameraErrorMessage);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };
      this.cameraErrorMessage = '';
      await this.qrScannerService.startCamera(this.videoElement.nativeElement, constraints);
      await new Promise<void>((resolve, reject) => {
        const video = this.videoElement.nativeElement;
        if (video.readyState >= 2) {
          resolve();
          return;
        }
        const onLoaded = () => {
          video.removeEventListener('loadedmetadata', onLoaded);
          resolve();
        };
        video.addEventListener('loadedmetadata', onLoaded);
        setTimeout(() => reject(new Error('La cámara no cargó a tiempo')), 5000);
      });
      this.cameraActive = true;
      this.cameraErrorMessage = '';
      this.startCameraScanning();
      this.showToast('📷 Cámara iniciada - Acerca un código QR');
    } catch (error: any) {
      const name = error?.name || error?.message || '';
      if (name.includes('NotAllowed') || name.includes('PermissionDenied')) {
        this.cameraErrorMessage = 'Permiso denegado para acceder a la cámara. Verifica los permisos del navegador.';
      } else if (name.includes('NotFound') || name.includes('No device') || name.includes('Overconstrained')) {
        this.cameraErrorMessage = 'No se encontró ninguna cámara disponible. Comprueba el hardware o la conexión.';
      } else if (name.includes('NotReadable') || name.includes('TrackStartError')) {
        this.cameraErrorMessage = 'La cámara está ocupada o no puede iniciarse en este momento.';
      } else {
        this.cameraErrorMessage = 'No se pudo acceder a la cámara. Usa búsqueda manual o escanear desde imagen.';
      }
      this.cameraActive = false;
      this.showToast(this.cameraErrorMessage);
      console.error('Error al iniciar cámara:', error);
    }
  }

  private startCameraScanning(): void {
    let consecutiveEmptyFrames = 0;
    const maxEmptyFrames = 30; // ~1 segundo a 30fps

    this.cameraScanningInterval = setInterval(() => {
      const video = this.videoElement.nativeElement;
      if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }

      const scanResult = this.qrScannerService.scanFromVideo(
        video,
        this.canvasElement.nativeElement
      );

      if (scanResult && scanResult.code) {
        // QR encontrado
        consecutiveEmptyFrames = 0;

        // Procesar el código
        this.scanQuery = scanResult.code;
        this.searchCode();

        // Parar escaneo brevemente para evitar duplicados
        this.stopCameraScanning();
        setTimeout(() => {
          if (this.cameraActive) {
            this.startCameraScanning();
          }
        }, 2000);
      } else {
        consecutiveEmptyFrames++;
      }
    }, 100); // Escanear cada 100ms (~10fps)
  }

  private stopCameraScanning(): void {
    if (this.cameraScanningInterval) {
      clearInterval(this.cameraScanningInterval);
      this.cameraScanningInterval = null;
    }
  }

  stopCamera(): void {
    this.stopCameraScanning();
    this.qrScannerService.stopCamera();
    this.cameraActive = false;
    this.showToast('📷 Cámara desactivada');
  }

  toggleCamera(): void {
    if (!this.hasCameraSupport) {
      this.cameraErrorMessage = 'No hay cámara accesible en este navegador. Usa búsqueda manual o escaneo desde imagen.';
      this.showToast(this.cameraErrorMessage);
      return;
    }

    if (this.cameraActive) {
      this.stopCamera();
    } else {
      this.startCamera();
    }
  }

  // ═══════════════════════════════════════
  // MODO ARCHIVO: Escaneo desde imagen
  // ═══════════════════════════════════════

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.scanState = 'scanning';
    this.showToast('📸 Analizando imagen...');

    try {
      const qrResult = await this.qrScannerService.scanFromImage(file);

      if (qrResult) {
        this.scanQuery = qrResult.code;
        this.searchCode();
        this.showToast(`✓ QR detectado: ${qrResult.code}`);
      } else {
        this.result = {
          type: 'none',
          title: '❌ No se detectó QR',
          subtitle: 'La imagen no contiene un código QR válido',
          properties: [{ label: 'Archivo', value: file.name }],
        };
        this.scanState = 'error';
        this.showToast('❌ No se encontró código QR en la imagen');
      }
    } catch (error) {
      this.showToast('❌ Error al procesar la imagen');
      console.error(error);
    }

    // Limpiar input
    input.value = '';
  }

  // ═══════════════════════════════════════
  // HISTORIAL Y UTILIDADES
  // ═══════════════════════════════════════

  private addToHistory(code: string, result: ScanResult): void {
    const entry: ScanHistoryEntry = {
      code,
      type: result.type,
      timestamp: new Date(),
      result,
    };
    this.scanHistory.unshift(entry);
    if (this.scanHistory.length > 20) {
      this.scanHistory = this.scanHistory.slice(0, 20);
    }
    try {
      sessionStorage.setItem('scan_history', JSON.stringify(this.scanHistory));
    } catch {}
  }

  reloadFromHistory(entry: ScanHistoryEntry): void {
    this.scanQuery = entry.code;
    this.result = entry.result;
    this.scanState = entry.type === 'none' ? 'error' : 'success';
  }

  clearHistory(): void {
    this.scanHistory = [];
    this.qrHistory = [];
    this.qrScannerService.clearHistory();
    sessionStorage.removeItem('scan_history');
    this.showToast('✓ Historial limpiado');
  }

  exportHistory(): void {
    const csv = this.qrScannerService.exportHistoryAsCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `qr_history_${new Date().getTime()}.csv`;
    link.click();
    this.showToast('✓ Historial exportado como CSV');
  }

  resetScan(): void {
    this.scanState = 'idle';
    this.result = null;
    this.scanQuery = '';
  }

  navigateTo(result: ScanResult): void {
    if (result.type === 'pedido') {
      const orderCode = result.properties.find(p => p.label === 'Código de Orden')?.value || result.properties[0]?.value;
      this.router.navigate(['/trazabilidad'], { queryParams: { order: orderCode } });
      return;
    }
    if (result.type === 'producto' && result.relatedOrderCode) {
      this.router.navigate(['/trazabilidad'], { queryParams: { order: result.relatedOrderCode } });
      return;
    }
    if (result.type === 'producto') {
      this.router.navigate(['/inventario']);
      return;
    }
  }

  setQuery(code: string): void {
    this.scanQuery = code;
    this.searchCode();
  }

  showToast(message: string): void {
    this.toastMessage = message;
    this.toastOpen = true;
  }

  getHistoryTypeClass(type: string): string {
    if (type === 'pedido') return 'hist-order';
    if (type === 'producto') return 'hist-product';
    return 'hist-none';
  }

  getHistoryTypeName(type: string): string {
    if (type === 'pedido') return 'Orden';
    if (type === 'producto') return 'Producto';
    return 'No hallado';
  }

  timeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'ahora mismo';
    if (diffMin < 60) return `hace ${diffMin}m`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `hace ${diffHour}h`;
    return `hace ${Math.floor(diffHour / 24)}d`;
  }

  simulateScan(): void {
    this.scanState = 'scanning';
    setTimeout(() => {
      const randomCodes = ['ORD-1098', 'ORD-1105', 'ORD-1108', 'MSK-001', 'GLV-002', 'ALC-003'];
      const randomIndex = Math.floor(Math.random() * randomCodes.length);
      this.scanQuery = randomCodes[randomIndex];
      this.searchCode();
    }, 1500);
  }

  onScanModeChange(event: any): void {
    this.scanMode = event.detail.value;
    this.stopCamera();
    this.resetScan();
  }
}
