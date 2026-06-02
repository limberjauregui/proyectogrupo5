import { Injectable } from '@angular/core';
import jsQR from 'jsqr';

export interface QRScanResult {
  code: string;
  type: 'pedido' | 'producto' | 'cliente' | 'none';
  timestamp: Date;
  rawData?: string;
}

@Injectable({
  providedIn: 'root'
})
export class QRScannerService {
  private scanHistory: QRScanResult[] = [];
  private maxHistorySize = 50;
  private videoStream: MediaStream | null = null;
  private isMobileDevice = this.detectMobileDevice();

  /**
   * Detecta si es un dispositivo móvil
   */
  private detectMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Inicia la cámara para escanear QR
   */
  async startCamera(videoElement: HTMLVideoElement, constraints?: MediaStreamConstraints): Promise<void> {
    try {
      const defaultConstraints: MediaStreamConstraints = {
        video: {
          facingMode: this.isMobileDevice ? 'environment' : 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      this.videoStream = await navigator.mediaDevices.getUserMedia(constraints || defaultConstraints);
      videoElement.srcObject = this.videoStream;
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      videoElement.muted = true;
      await videoElement.play();
    } catch (error) {
      console.error('Error al acceder a la cámara:', error);
      throw error;
    }
  }

  /**
   * Captura un frame del video y lo analiza para detectar QR
   */
  scanFromVideo(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement): QRScanResult | null {
    try {
      const context = canvasElement.getContext('2d');
      if (!context) return null;

      // Dibujar el frame del video en el canvas
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;
      context.drawImage(videoElement, 0, 0);

      // Obtener datos de imagen
      const imageData = context.getImageData(0, 0, canvasElement.width, canvasElement.height);

      // Usar jsQR para decodificar
      const code = jsQR(imageData.data, imageData.width, imageData.height) as any;

      if (code) {
        const result = this.parseQRData(code.data);
        this.addToHistory(result);
        return result;
      }

      return null;
    } catch (error) {
      console.error('Error escaneando QR:', error);
      return null;
    }
  }

  /**
   * Analiza un archivo de imagen para detectar QR
   */
  async scanFromImage(file: File): Promise<QRScanResult | null> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) {
            resolve(null);
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          context.drawImage(img, 0, 0);

          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height) as any;

          if (code) {
            const result = this.parseQRData(code.data);
            this.addToHistory(result);
            resolve(result);
          } else {
            resolve(null);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Parsea los datos del QR para determinar su tipo
   */
  private parseQRData(data: string): QRScanResult {
    const trimmedData = data.trim().toUpperCase();

    let type: 'pedido' | 'producto' | 'cliente' | 'none' = 'none';

    // Detectar tipo de código
    if (trimmedData.startsWith('ORD-') || trimmedData.match(/^ORD-\d{4}$/i)) {
      type = 'pedido';
    } else if (trimmedData.match(/^[A-Z]{3}-\d{3}$/i)) {
      type = 'producto';
    } else if (trimmedData.startsWith('CLI-') || trimmedData.match(/^\d{8,}$/)) {
      type = 'cliente';
    }

    return {
      code: trimmedData,
      type,
      timestamp: new Date(),
      rawData: data
    };
  }

  /**
   * Detiene la cámara
   */
  stopCamera(): void {
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }
  }

  /**
   * Agrega un resultado al historial
   */
  private addToHistory(result: QRScanResult): void {
    this.scanHistory.unshift(result);
    if (this.scanHistory.length > this.maxHistorySize) {
      this.scanHistory = this.scanHistory.slice(0, this.maxHistorySize);
    }

    // Guardar en localStorage
    try {
      localStorage.setItem('qr_scan_history', JSON.stringify(this.scanHistory));
    } catch (error) {
      console.warn('No se pudo guardar en localStorage:', error);
    }
  }

  /**
   * Obtiene el historial de escaneos
   */
  getScanHistory(): QRScanResult[] {
    if (this.scanHistory.length === 0) {
      try {
        const stored = localStorage.getItem('qr_scan_history');
        if (stored) {
          this.scanHistory = JSON.parse(stored).map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp)
          }));
        }
      } catch (error) {
        console.warn('Error cargando historial:', error);
      }
    }

    return this.scanHistory;
  }

  /**
   * Limpia el historial de escaneos
   */
  clearHistory(): void {
    this.scanHistory = [];
    try {
      localStorage.removeItem('qr_scan_history');
    } catch (error) {
      console.warn('Error limpiando historial:', error);
    }
  }

  /**
   * Exporta el historial en formato JSON
   */
  exportHistory(): string {
    return JSON.stringify(this.getScanHistory(), null, 2);
  }

  /**
   * Exporta el historial en formato CSV
   */
  exportHistoryAsCSV(): string {
    const history = this.getScanHistory();
    const headers = ['Código', 'Tipo', 'Fecha', 'Hora'];
    const rows = history.map(item => [
      item.code,
      item.type,
      item.timestamp.toLocaleDateString('es-PE'),
      item.timestamp.toLocaleTimeString('es-PE')
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return csv;
  }
}
