// App Routes - Using functional guards (Angular 15+)
import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';
import { roleGuard } from './role.guard';
import { notFoundGuard } from './not-found.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['supervisor'] },
  },
  {
    path: 'catalogo',
    loadComponent: () => import('./pages/catalogo/catalogo.page').then((m) => m.CatalogoPage),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['supervisor', 'cliente'] },
  },
  {
    path: 'solicitudes',
    loadComponent: () => import('./pages/solicitudes/solicitudes.page').then((m) => m.SolicitudesPage),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['supervisor', 'cliente'] },
  },
  {
    path: 'solicitud/:id',
    loadComponent: () => import('./pages/solicitud-detail/solicitud-detail.page').then((m) => m.SolicitudDetailPage),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['supervisor', 'cliente'] },
  },
  {
    path: 'inventario',
    loadComponent: () => import('./pages/inventario/inventario.page').then((m) => m.InventarioPage),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['supervisor'] },
  },
  {
    path: 'ordenes',
    loadComponent: () => import('./pages/ordenes/ordenes.page').then((m) => m.OrdenesPage),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['supervisor', 'transportista'] },
  },
  {
    path: 'trazabilidad',
    loadComponent: () => import('./pages/trazabilidad/trazabilidad.page').then((m) => m.TrazabilidadPage),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['supervisor', 'transportista'] },
  },
  {
    path: 'mas',
    loadComponent: () => import('./pages/mas/mas.page').then((m) => m.MasPage),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['supervisor', 'transportista', 'cliente'] },
  },
  {
    path: 'alertas',
    loadComponent: () => import('./pages/alertas/alertas.page').then((m) => m.AlertasPage),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['supervisor', 'transportista', 'cliente'] },
  },
  {
    path: 'historial',
    loadComponent: () => import('./pages/historial/historial.page').then((m) => m.HistorialPage),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['supervisor', 'transportista'] },
  },
  {
    path: 'reportes',
    loadComponent: () => import('./pages/reportes/reportes.page').then((m) => m.ReportesPage),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['supervisor'] },
  },
  {
    path: 'mapa',
    loadComponent: () => import('./pages/mapa/mapa.page').then((m) => m.MapaPage),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['supervisor', 'transportista'] },
  },
  {
    path: 'scanner',
    loadComponent: () => import('./pages/scanner/scanner.page').then((m) => m.ScannerPage),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['supervisor', 'transportista'] },
  },
  {
    path: 'transportistas',
    loadComponent: () => import('./pages/transportistas/transportistas.page').then((m) => m.TransportistasPage),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['supervisor'] },
  },
  {
    path: '**',
    canActivate: [notFoundGuard],
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
];
