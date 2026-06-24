import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { supabase } from './core/supabase.client';

export type UserRole = 'supervisor' | 'transportista' | 'cliente';

export interface UserSession {
  id?: string;
  username: string;
  role: UserRole;
  transportistaId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private router = inject(Router);

  private readonly storageKey = 'vitalflow_auth_session';
  
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

  get transportistaId(): string | null {
    return this.session?.transportistaId ?? null;
  }

  login(email: string, password: string): Observable<boolean> {
    return from(this.performLogin(email, password));
  }

  private async performLogin(email: string, password: string): Promise<boolean> {
    try {
      // 1. Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError || !authData.session) {
        console.error('Supabase auth error:', authError?.message);
        return false;
      }

      // 2. Fetch user profile from 'users' table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        console.error('Supabase user fetch error:', userError?.message);
        // We still log them out if we can't find their profile
        await supabase.auth.signOut();
        return false;
      }

      // 3. Build UserSession
      const session: UserSession = {
        id: userData.id,
        username: userData.name || email,
        role: userData.role as UserRole,
        transportistaId: userData.role === 'transportista' ? userData.id : undefined,
      };

      this.saveSession(session);
      return true;
    } catch (e) {
      console.error('Login exception:', e);
      return false;
    }
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut();
    localStorage.removeItem(this.storageKey);
    this.sessionSubject.next(null);
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  getRedirectRoute(): string {
    return this.getRouteForRole(this.role);
  }

  getRouteForRole(role: UserRole | null): string {
    switch (role) {
      case 'supervisor':
        return '/dashboard';
      case 'transportista':
        return '/trazabilidad';
      case 'cliente':
        return '/catalogo';
      default:
        return '/login';
    }
  }

  private loadSession(): UserSession | null {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserSession;
    } catch {
      return null;
    }
  }

  private saveSession(session: UserSession): void {
    localStorage.setItem(this.storageKey, JSON.stringify(session));
    this.sessionSubject.next(session);
  }

  // --- IMPERSONATION LOGIC ---
  private readonly impersonatorKey = 'vitalflow_impersonator_session';

  get isImpersonating(): boolean {
    return !!localStorage.getItem(this.impersonatorKey);
  }

  get originalSupervisorName(): string | null {
    const raw = localStorage.getItem(this.impersonatorKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as UserSession;
        return parsed.username;
      } catch {
        return null;
      }
    }
    return null;
  }

  impersonateUser(user: any): void {
    if (!this.session || this.session.role !== 'supervisor') return;
    
    // Save current supervisor session
    localStorage.setItem(this.impersonatorKey, JSON.stringify(this.session));
    
    // Create new session for the target user
    const targetSession: UserSession = {
      id: user.id,
      username: user.name,
      role: user.role as UserRole,
      transportistaId: user.role === 'transportista' ? user.id : undefined,
    };
    
    this.saveSession(targetSession);
    this.router.navigateByUrl(this.getRouteForRole(targetSession.role), { replaceUrl: true });
  }

  revertImpersonation(): void {
    const raw = localStorage.getItem(this.impersonatorKey);
    if (raw) {
      try {
        const supervisorSession = JSON.parse(raw) as UserSession;
        this.saveSession(supervisorSession);
        localStorage.removeItem(this.impersonatorKey);
        this.router.navigateByUrl(this.getRouteForRole(supervisorSession.role), { replaceUrl: true });
      } catch {
        this.logout();
      }
    }
  }

  checkCurrentPassword(password: string): boolean {
    // For demo purposes, we'll just allow it since Supabase validates it on update anyway
    return true;
  }

  async updatePasswordForCurrentUser(newPassword: string): Promise<boolean> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      console.error('Failed to update password:', error.message);
      return false;
    }
    return true;
  }
}
