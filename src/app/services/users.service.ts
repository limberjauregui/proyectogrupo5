import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../core/supabase.client';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: 'supervisor' | 'transportista' | 'cliente';
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private usersSubject = new BehaviorSubject<UserAccount[]>([]);
  users$ = this.usersSubject.asObservable();

  // NOTA: Para crear cuentas SIN desloguear al supervisor actual, 
  // requerimos usar el Service Role Key. 
  // Por defecto, leer de environment o usar una variable.
  // IMPORTANTE: En producción, esto debería estar en un backend o Edge Function.
  private supabaseAdmin = createClient(
    'https://smhdkhxopwybsxmdxdwu.supabase.co', // Replace with environment URL
    'sb_secret_RhAqw_4dGwM7aRWGVL3y4A_BHecFcxH' // Replace with environment SERVICE ROLE KEY
  );

  constructor() {
    this.loadUsers();
  }

  async loadUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*');
      
      if (!error && data) {
        this.usersSubject.next(data as UserAccount[]);
      }
    } catch (e) {
      console.error('Error cargando usuarios', e);
    }
  }

  async createAccount(email: string, password: string, name: string, role: string): Promise<{success: boolean; error?: string}> {
    try {
      // 1. Create user in Supabase Auth (Admin API avoids signing in the new user)
      const { data: authData, error: authError } = await this.supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true // Auto-confirm for demo purposes
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'User creation failed.' };
      }

      // 2. Insert into 'users' public table
      const { error: dbError } = await this.supabaseAdmin
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email,
            name,
            role
          }
        ]);

      if (dbError) {
        // Rollback (delete auth user) could go here in a robust system
        return { success: false, error: dbError.message };
      }

      // 3. Refresh list
      await this.loadUsers();

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error desconocido' };
    }
  }
}
