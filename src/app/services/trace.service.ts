import { Injectable } from '@angular/core';
import type { TraceStep } from '../data.service';

@Injectable({ providedIn: 'root' })
export class TraceService {
  private readonly TRACE_KEY = 'mock_trace_v1';
  private readonly SIGNATURES_KEY = 'mock_signatures_v1';

  constructor() {
    // reset handled centrally by DataService
  }

  private resetIfVersionChanged(): void {
    // no-op; DataService coordinates data_version resets
  }

  private readTraceMap(): Record<string, TraceStep[]> {
    try {
      const raw = localStorage.getItem(this.TRACE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private saveTraceMap(map: Record<string, TraceStep[]>): void {
    localStorage.setItem(this.TRACE_KEY, JSON.stringify(map));
  }

  getTrace(orderCode: string): TraceStep[] {
    const map = this.readTraceMap();

    if (!map[orderCode]) {
      map[orderCode] = this.getDefaultTrace(orderCode);
      this.saveTraceMap(map);
    }

    return map[orderCode];
  }

  getTraceForOrder(orderCode: string): TraceStep[] {
    return this.getTrace(orderCode);
  }

  addTraceStep(orderCode: string, step: TraceStep['step'], notes?: string): TraceStep {
    const map = this.readTraceMap();

    if (!map[orderCode]) {
      map[orderCode] = this.getDefaultTrace(orderCode);
    }

    const newStep: TraceStep = {
      id: Date.now(),
      orderCode,
      step,
      timestamp: new Date().toISOString(),
      notes,
    };

    map[orderCode].push(newStep);
    this.saveTraceMap(map);

    return newStep;
  }

  removeTracesForOrder(orderCode: string): void {
    const map = this.readTraceMap();
    if (map[orderCode]) {
      delete map[orderCode];
      this.saveTraceMap(map);
    }
  }

  // A2: FIX - Avoid Date.now() ID collisions by using decremental timestamps
  private getDefaultTrace(orderCode: string): TraceStep[] {
    const base = Date.now();
    const steps: TraceStep[] = [];
    const stepCount = 3;

    const traceSteps: Array<{ step: TraceStep['step']; hours: number; notes: string }> = [
      {
        step: 'preparado',
        hours: 6,
        notes: `La orden ${orderCode} fue registrada en el sistema.`,
      },
      {
        step: 'recogido',
        hours: 4,
        notes: 'Productos verificados y embalados.',
      },
      {
        step: 'en ruta',
        hours: 2,
        notes: 'La unidad salió hacia el punto de entrega.',
      },
    ];

    for (let i = 0; i < traceSteps.length; i++) {
      const { step, hours, notes } = traceSteps[i];
      steps.push({
        id: base - (stepCount - i) * 1000, // Decremental: base-3000, base-2000, base-1000
        orderCode,
        step,
        timestamp: new Date(base - hours * 3600000).toISOString(),
        notes,
      });
    }

    return steps;
  }

  saveSignature(orderCode: string, signature: string): boolean {
    try {
      const raw = localStorage.getItem(this.SIGNATURES_KEY);
      const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};

      map[orderCode] = signature;
      localStorage.setItem(this.SIGNATURES_KEY, JSON.stringify(map));
      return true;
    } catch {
      try {
        const map: Record<string, string> = {};
        map[orderCode] = signature;
        localStorage.setItem(this.SIGNATURES_KEY, JSON.stringify(map));
        return true;
      } catch {
        return false;
      }
    }
  }

  getSignature(orderCode: string): string | null {
    try {
      const raw = localStorage.getItem(this.SIGNATURES_KEY);

      if (!raw) {
        return null;
      }

      const map = JSON.parse(raw) as Record<string, string>;
      return map[orderCode] ?? null;
    } catch {
      return null;
    }
  }
}