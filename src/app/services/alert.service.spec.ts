import { TestBed } from '@angular/core/testing';
import { AlertService } from './alert.service';

describe('AlertService', () => {
  let service: AlertService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [AlertService] });
    service = TestBed.inject(AlertService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should load default alerts and sort them by date', () => {
    const alerts = service.getAlerts();
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts).toEqual(alerts.slice().sort((a, b) => +new Date(b.date) - +new Date(a.date)));
  });

  it('should mark alert as read', () => {
    const [alert] = service.getAlerts();
    expect(alert.read).toBeFalse();

    const updated = service.markAlertRead(alert.id);
    expect(updated?.read).toBeTrue();
  });

  it('should delete an alert', () => {
    const initialCount = service.getAlerts().length;
    const [alert] = service.getAlerts();
    expect(service.deleteAlert(alert.id)).toBeTrue();
    expect(service.getAlerts().length).toBe(initialCount - 1);
  });

  it('should add a new alert', () => {
    const initialCount = service.getAlerts().length;
    const newAlert = service.addAlert({ type: 'INFORMACIÓN', message: 'Prueba' });
    expect(newAlert).toBeTruthy();
    expect(service.getAlerts().length).toBe(initialCount + 1);
  });

  it('should return false when deleting non-existent alert', () => {
    expect(service.deleteAlert(999999)).toBeFalse();
  });

  it('should return null when marking non-existent alert as read', () => {
    expect(service.markAlertRead(999999)).toBeNull();
  });

  it('should default type to INFORMACIÓN when not specified', () => {
    const alert = service.addAlert({ message: 'Sin tipo' });
    expect(alert.type).toBe('INFORMACIÓN');
  });

  it('should default read to false for new alerts', () => {
    const alert = service.addAlert({ type: 'ADVERTENCIA', message: 'Test' });
    expect(alert.read).toBeFalse();
  });

  it('should support TEMPERATURA type with severity', () => {
    const alert = service.addAlert({ type: 'TEMPERATURA', message: 'Alta temp', severity: 'ALTA' });
    expect(alert.type).toBe('TEMPERATURA');
    expect(alert.severity).toBe('ALTA');
  });

  it('should place new alert at the top (sorted desc by date)', () => {
    const alert = service.addAlert({ type: 'CRÍTICA', message: 'Reciente' });
    expect(service.getAlerts()[0].id).toBe(alert.id);
  });
});
