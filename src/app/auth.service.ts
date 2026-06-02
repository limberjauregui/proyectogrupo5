import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type UserRole = 'supervisor' | 'transportista' | 'cliente';

export interface UserSession {
  username: string;
  role: UserRole;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly storageKey = 'auth_session';
  private sessionSubject = new BehaviorSubject<UserSession | null>(this.loadSession());

  session$ = this.sessionSubject.asObservable();

  get session(): UserSession | null {
    return this.sessionSubject.value;
  }

  get isAuthenticated(): boolean {
    return !!this.session;
  }

  get role(): UserRole | null {
    return this.session?.role ?? null;
  }

  get username(): string | null {
    return this.session?.username ?? null;
  }

  login(username: string, password: string): boolean {
    const role = this.getRoleByCredentials(username, password);
    if (!role) {
      return false;
    }

    const session: UserSession = {
      username: username.trim().toLowerCase(),
      role,
    };

    this.saveSession(session);
    return true;
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
    this.sessionSubject.next(null);
  }

  getRedirectRoute(): string {
    return this.getRouteForRole(this.role);
  }

  getRouteForRole(role: UserRole | null): string {
    switch (role) {
      case 'supervisor':
        return '/dashboard';
      case 'transportista':
        return '/ordenes';
      case 'cliente':
        return '/catalogo';
      default:
        return '/login';
    }
  }

  private readonly PASSWORDS_KEY = 'mock_user_passwords_v1';

  // ⚠️ DEMO ONLY: passwords are stored in plain text in localStorage.
  // Replace with a secure authentication backend and hashed passwords before production.
  private loadPasswords(): Record<string, string> {
    try {
      const raw = localStorage.getItem(this.PASSWORDS_KEY);
      if (!raw) {
        const defaults: Record<string, string> = {
          admin: 'admin123',
          driver: 'driver123',
          cliente: 'cliente123',
        };
        localStorage.setItem(this.PASSWORDS_KEY, JSON.stringify(defaults));
        return defaults;
      }
      return JSON.parse(raw) as Record<string, string>;
    } catch {
      return { admin: 'admin123', driver: 'driver123', cliente: 'cliente123' };
    }
  }

  private savePasswords(passwords: Record<string, string>): void {
    localStorage.setItem(this.PASSWORDS_KEY, JSON.stringify(passwords));
  }

  private getPasswordForUser(username: string): string | null {
    const normalized = username.trim().toLowerCase();
    const passwords = this.loadPasswords();
    return passwords[normalized] ?? null;
  }

  checkCurrentPassword(password: string): boolean {
    if (!this.username) {
      return false;
    }
    const stored = this.getPasswordForUser(this.username);
    return stored ? stored === password : false;
  }

  updatePasswordForCurrentUser(newPassword: string): boolean {
    if (!this.username) {
      return false;
    }
    const normalized = this.username.trim().toLowerCase();
    const passwords = this.loadPasswords();
    passwords[normalized] = newPassword;
    this.savePasswords(passwords);
    return true;
  }

  private getRoleByCredentials(username: string, password: string): UserRole | null {
    const normalized = `${username}`.trim().toLowerCase();
    const storedPassword = this.getPasswordForUser(normalized);
    if (storedPassword && storedPassword === password) {
      switch (normalized) {
        case 'admin':
          return 'supervisor';
        case 'driver':
          return 'transportista';
        case 'cliente':
          return 'cliente';
      }
    }
    return null;
  }

  private loadSession(): UserSession | null {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as UserSession;
      if (!parsed?.username || !parsed?.role) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private saveSession(session: UserSession): void {
    localStorage.setItem(this.storageKey, JSON.stringify(session));
    this.sessionSubject.next(session);
  }
}
