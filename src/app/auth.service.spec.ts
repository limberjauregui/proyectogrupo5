import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [AuthService] });
    service = TestBed.inject(AuthService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should not be authenticated on init', () => {
    expect(service.isAuthenticated).toBeFalse();
    expect(service.role).toBeNull();
    expect(service.username).toBeNull();
  });

  it('should login supervisor with correct credentials', () => {
    expect(service.login('admin', 'admin123')).toBeTrue();
    expect(service.isAuthenticated).toBeTrue();
    expect(service.role).toBe('supervisor');
    expect(service.username).toBe('admin');
  });

  it('should login transportista with correct credentials', () => {
    expect(service.login('driver', 'driver123')).toBeTrue();
    expect(service.role).toBe('transportista');
  });

  it('should login cliente with correct credentials', () => {
    expect(service.login('cliente', 'cliente123')).toBeTrue();
    expect(service.role).toBe('cliente');
  });

  it('should return false for wrong password', () => {
    expect(service.login('admin', 'wrongpass')).toBeFalse();
    expect(service.isAuthenticated).toBeFalse();
  });

  it('should return false for unknown user', () => {
    expect(service.login('ghost', 'anypassword')).toBeFalse();
  });

  it('should be case-insensitive for username', () => {
    expect(service.login('ADMIN', 'admin123')).toBeTrue();
    expect(service.username).toBe('admin');
  });

  it('should logout and clear session', () => {
    service.login('admin', 'admin123');
    service.logout();
    expect(service.isAuthenticated).toBeFalse();
    expect(service.role).toBeNull();
    expect(service.username).toBeNull();
  });

  it('should redirect supervisor to /dashboard', () => {
    service.login('admin', 'admin123');
    expect(service.getRedirectRoute()).toBe('/dashboard');
  });

  it('should redirect transportista to /trazabilidad', () => {
    service.login('driver', 'driver123');
    expect(service.getRedirectRoute()).toBe('/trazabilidad');
  });

  it('should redirect cliente to /catalogo', () => {
    service.login('cliente', 'cliente123');
    expect(service.getRedirectRoute()).toBe('/catalogo');
  });

  it('should validate current password correctly', () => {
    service.login('admin', 'admin123');
    expect(service.checkCurrentPassword('admin123')).toBeTrue();
    expect(service.checkCurrentPassword('wrong')).toBeFalse();
  });

  it('should update password and allow login with new password', () => {
    service.login('admin', 'admin123');
    service.updatePasswordForCurrentUser('NewPass1');
    service.logout();
    expect(service.login('admin', 'NewPass1')).toBeTrue();
  });

  it('should reject old password after update', () => {
    service.login('admin', 'admin123');
    service.updatePasswordForCurrentUser('NewPass1');
    service.logout();
    expect(service.login('admin', 'admin123')).toBeFalse();
  });
});
