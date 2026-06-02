import { TestBed } from '@angular/core/testing';
import { TraceService } from './trace.service';

describe('TraceService', () => {
  let service: TraceService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [TraceService] });
    service = TestBed.inject(TraceService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should return trace steps for a specific order', () => {
    const traces = service.getTraceForOrder('ORD-1098');
    expect(traces.length).toBeGreaterThan(0);
    expect(traces.every((trace) => trace.orderCode === 'ORD-1098')).toBeTrue();
  });

  it('should add a trace step', () => {
    const before = service.getTraceForOrder('ORD-1098').length;
    const created = service.addTraceStep('ORD-1098', 'en ruta', 'Paso de prueba');
    expect(created).toBeTruthy();
    expect(service.getTraceForOrder('ORD-1098').length).toBe(before + 1);
  });

  it('should save and retrieve a signature', () => {
    const result = service.saveSignature('ORD-1098', 'data-url');
    expect(result).toBeTrue();
    expect(service.getSignature('ORD-1098')).toBe('data-url');
  });

  it('should return null for missing signature', () => {
    expect(service.getSignature('ORD-SIN-FIRMA')).toBeNull();
  });

  it('should return empty array for order with no traces', () => {
    expect(service.getTraceForOrder('ORD-INEXISTENTE')).toEqual([]);
  });

  it('should set notes on trace step when provided', () => {
    const trace = service.addTraceStep('ORD-NOTAS', 'en ruta', 'Nota específica');
    expect(trace.notes).toBe('Nota específica');
  });

  it('should auto-generate timestamp on new trace step', () => {
    const before = Date.now();
    const trace = service.addTraceStep('ORD-TS', 'preparado');
    expect(new Date(trace.timestamp).getTime()).toBeGreaterThanOrEqual(before);
  });

  it('should overwrite signature when saving twice for same order', () => {
    service.saveSignature('ORD-DOBLE', 'url-v1');
    service.saveSignature('ORD-DOBLE', 'url-v2');
    expect(service.getSignature('ORD-DOBLE')).toBe('url-v2');
  });

  it('should accumulate multiple trace steps for the same order', () => {
    service.addTraceStep('ORD-MULTI', 'preparado', 'Paso 1');
    service.addTraceStep('ORD-MULTI', 'recogido', 'Paso 2');
    service.addTraceStep('ORD-MULTI', 'en ruta', 'Paso 3');
    expect(service.getTraceForOrder('ORD-MULTI').length).toBe(3);
  });
});
