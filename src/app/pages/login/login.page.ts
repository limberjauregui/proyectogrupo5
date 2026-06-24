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

    this.authService.login(this.username, this.password).subscribe(ok => {
      this.loading = false;

      if (!ok) {
        this.errorMessage = 'Usuario o contraseña incorrectos.';
        return;
      }

      if (this.environment.production) {
        console.log('Login en modo producción');
      }

      this.router.navigateByUrl(this.authService.getRedirectRoute());
    });
  }

  quickLogin(role: 'supervisor' | 'transportista' | 'cliente'): void {
    if (role === 'supervisor') {
      this.username = 'admin@vitalflow.com';
      this.password = '123456';
    } else if (role === 'transportista') {
      this.username = 'transporte@vitalflow.com';
      this.password = '123456';
    } else {
      this.username = 'cliente@vitalflow.com';
      this.password = '123456';
    }

    this.login();
  }
}