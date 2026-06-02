import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth.service';
import { IonContent, IonHeader, IonIcon, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonHeader, IonToolbar, IonIcon],
})
export class LoginPage {
  username = '';
  password = '';
  errorMessage = '';
  loading = false;
  environment = environment;

  constructor(
    private router: Router,
    public authService: AuthService
  ) {}

  login() {
    this.errorMessage = '';
    this.loading = true;

    const ok = this.authService.login(this.username, this.password);

    setTimeout(() => {
      this.loading = false;

      if (!ok) {
        this.errorMessage = 'Usuario o contraseña incorrectos.';
        return;
      }

      if (this.environment.production) {
        console.log('Login en modo producción');
      }

      // BUG-1: redirect user according to role/home route
      this.router.navigateByUrl(this.authService.getRedirectRoute());
    }, 500);
  }

  quickLogin(role: 'supervisor' | 'transportista' | 'cliente'): void {
    if (role === 'supervisor') {
      this.username = 'admin';
      this.password = 'admin123';
    } else if (role === 'transportista') {
      this.username = 'driver';
      this.password = 'driver123';
    } else {
      this.username = 'cliente';
      this.password = 'cliente123';
    }

    this.login();
  }
}