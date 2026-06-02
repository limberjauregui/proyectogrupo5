import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import {
  IonApp,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTitle,
  IonToolbar,
  IonToast,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  home,
  bag,
  cubeOutline,
  cube,
  listOutline,
  navigateOutline,
  logOut,
  logOutOutline,
  moonOutline,
  sunnyOutline,
  notificationsOutline,
  documentTextOutline,
  carOutline,
  ellipsisHorizontal,
  timeOutline,
  mapOutline,
  qrCodeOutline,
  closeOutline,
  volumeHighOutline,
  volumeMuteOutline,
  checkmarkDoneOutline,
  refreshOutline,
  alertCircleOutline,
  warningOutline,
  informationCircleOutline,
  trashOutline
} from 'ionicons/icons';
import { AuthService } from './auth.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [
    CommonModule,
    IonApp,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonIcon,
    IonContent,
    IonRouterOutlet,
    IonTabBar,
    IonTabButton,
    IonToast,
    RouterModule,
  ],
})
export class AppComponent implements OnInit {
  selectedTab: string | null = null;
  isDarkMode = false;
  toastOpen = false;
  toastMessage = '';

  constructor(public authService: AuthService, private router: Router) {
    addIcons({ 
      home, bag, cubeOutline, cube, listOutline, navigateOutline, logOut, logOutOutline,
      moonOutline, sunnyOutline, notificationsOutline, documentTextOutline, carOutline, ellipsisHorizontal,
      timeOutline, mapOutline, qrCodeOutline, closeOutline
      , volumeHighOutline, volumeMuteOutline, checkmarkDoneOutline,
      refreshOutline, alertCircleOutline, warningOutline,
      informationCircleOutline, trashOutline
    });

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.selectedTab = event.urlAfterRedirects;
      }
    });
  }

  ngOnInit() {
    this.updateSelectedTab();
    this.loadThemePreference();
  }

  loadThemePreference(): void {
    const pref = localStorage.getItem('theme_preference');
    if (pref === 'dark') {
      this.isDarkMode = true;
      document.documentElement.classList.add('ion-palette-dark');
      document.body.classList.add('dark-mode');
    } else if (pref === 'light') {
      this.isDarkMode = false;
      document.documentElement.classList.remove('ion-palette-dark');
      document.body.classList.remove('dark-mode');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.isDarkMode = prefersDark;
      if (prefersDark) {
        document.documentElement.classList.add('ion-palette-dark');
        document.body.classList.add('dark-mode');
      }
    }
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.documentElement.classList.add('ion-palette-dark');
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme_preference', 'dark');
      this.toastMessage = 'Modo oscuro activado';
    } else {
      document.documentElement.classList.remove('ion-palette-dark');
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme_preference', 'light');
      this.toastMessage = 'Modo claro activado';
    }
    this.toastOpen = true;
  }

  get navItems(): NavItem[] {
    const role = this.authService.role;
    if (role === 'supervisor') {
      return [
        { path: '/dashboard', label: 'Dashboard', icon: 'cube-outline' },
        { path: '/ordenes', label: 'Órdenes', icon: 'cube' },
        { path: '/inventario', label: 'Inventario', icon: 'document-text-outline' },
        { path: '/transportistas', label: 'Transportistas', icon: 'car-outline' },
        { path: '/mas', label: 'Más', icon: 'ellipsis-horizontal' },
      ];
    }

    if (role === 'transportista') {
      return [
        { path: '/ordenes',      label: 'Mis entregas', icon: 'cube-outline'         },
        { path: '/trazabilidad', label: 'Trazabilidad', icon: 'navigate-outline'     },
        { path: '/historial',    label: 'Historial',    icon: 'time-outline'         },
        { path: '/scanner',      label: 'Escáner QR',   icon: 'qr-code-outline'      },
        { path: '/alertas',      label: 'Alertas',      icon: 'alert-circle-outline' },
        { path: '/mas',          label: 'Perfil',       icon: 'ellipsis-horizontal'  },
      ];
    }

    if (role === 'cliente') {
      return [
        { path: '/catalogo', label: 'Catálogo', icon: 'bag' },
        { path: '/solicitudes', label: 'Mis solicitudes', icon: 'list-outline' },
        { path: '/alertas', label: 'Alertas', icon: 'alert-circle-outline' },
        { path: '/mas', label: 'Perfil', icon: 'ellipsis-horizontal' }
      ];
    }

    return [];
  }

  onTabChange(path: string): void {
    this.selectedTab = path;
    this.router.navigateByUrl(path, { replaceUrl: false });
  }

  private updateSelectedTab(): void {
    const currentUrl = this.router.url;
    this.selectedTab = currentUrl;
  }

  getPageTitle(): string {
    if (this.selectedTab?.includes('/dashboard')) return 'Dashboard';
    if (this.selectedTab?.includes('/transportistas')) return 'Transportistas';
    if (this.selectedTab?.includes('/ordenes')) return 'Mis entregas';
    if (this.selectedTab?.includes('/inventario')) return 'Inventario';
    if (this.selectedTab?.includes('/catalogo')) return 'Catálogo';
    if (this.selectedTab?.includes('/trazabilidad')) return 'Trazabilidad';
    if (this.selectedTab?.includes('/scanner')) return 'Escáner QR';
    if (this.selectedTab?.includes('/historial')) return 'Historial';
    if (this.selectedTab?.includes('/alertas')) return 'Alertas';
    if (this.selectedTab?.includes('/mas')) return 'Perfil';
    return 'Sistema';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
