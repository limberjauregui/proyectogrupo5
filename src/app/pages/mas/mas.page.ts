import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonItem,
  IonInput,
  IonToast,
  IonModal,
  IonBadge,
  IonHeader,
  IonToolbar,
  IonTitle,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  navigateOutline,
  notificationsOutline,
  timeOutline,
  documentTextOutline,
  mapOutline,
  qrCodeOutline,
  closeOutline,
  personOutline,
  lockClosedOutline,
  logOutOutline,
  saveOutline,
  createOutline,
  keyOutline,
  businessOutline,
  mailOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { AuthService } from '../../auth.service';
import { DataService } from '../../data.service';

@Component({
  selector: 'app-mas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonContent,
    IonButton,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonItem,
    IonInput,
    IonToast,
    IonModal,
    IonBadge,
    IonHeader,
    IonToolbar,
    IonTitle,
  ],
  templateUrl: 'mas.page.html',
  styleUrls: ['mas.page.scss'],
})
export class MasPage implements OnInit {
  activeTab: 'modulos' | 'perfil' = 'modulos';
  
  toastOpen = false;
  toastMessage = '';
  
  // Perfil mock data
  profileData = {
    name: '',
    role: '',
    company: '',
    email: '',
    lastAccess: '',
    vehicle: '',
    assignedZone: '',
    rating: '4.9/5',
  } as {
    name: string;
    role: string;
    company: string;
    email: string;
    lastAccess: string;
    vehicle: string;
    assignedZone: string;
    rating: string;
    state?: 'Disponible' | 'En ruta' | 'Descanso' | 'Inactivo';
  };

  // Modales
  showEditProfileModal = false;
  showChangePasswordModal = false;

  // Form Fields
  editName = '';
  editEmail = '';
  editCompany = '';

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  passwordError = '';

  hasUppercase(value: string): boolean {
    return /[A-Z]/.test(value || '');
  }

  hasNumber(value: string): boolean {
    return /[0-9]/.test(value || '');
  }

  getPasswordColor(valid: boolean): string {
    return valid ? 'var(--ion-color-success)' : 'var(--ion-color-danger)';
  }

  getPasswordIcon(valid: boolean): string {
    return valid ? 'checkmark-circle-outline' : 'close-circle-outline';
  }

  constructor(public authService: AuthService, private dataService: DataService, private router: Router) {
    addIcons({
      navigateOutline,
      notificationsOutline,
      timeOutline,
      documentTextOutline,
      mapOutline,
      qrCodeOutline,
      closeOutline,
      personOutline,
      lockClosedOutline,
      logOutOutline,
      saveOutline,
      createOutline,
      keyOutline,
      businessOutline,
      mailOutline,
      shieldCheckmarkOutline,
    });
  }

  ngOnInit() {
    this.loadProfile();
  }

  get isTransportista(): boolean {
    return this.authService.role === 'transportista';
  }

  get isCliente(): boolean {
    return this.authService.role === 'cliente';
  }

  get isSupervisor(): boolean {
    return this.authService.role === 'supervisor';
  }

  // === CLIENTE STATS ===
  get clienteSolicitudes() {
    if (!this.authService.username) return [];
    return this.dataService.getSolicitudesByCliente(this.authService.username);
  }

  get activeSolicitudes(): number {
    return this.clienteSolicitudes.filter((s) => ['Pendiente de aprobación', 'Aprobada', 'En preparación', 'En camino'].includes(s.estado)).length;
  }

  get deliveredSolicitudes(): number {
    return this.clienteSolicitudes.filter((s) => s.estado === 'Entregada').length;
  }

  get pendingSolicitudes(): number {
    return this.clienteSolicitudes.filter((s) => s.estado === 'Pendiente de aprobación').length;
  }

  get rejectedSolicitudes(): number {
    return this.clienteSolicitudes.filter((s) => s.estado === 'Rechazada').length;
  }

  get latestSolicitudes() {
    return this.clienteSolicitudes
      .sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha))
      .slice(0, 3);
  }

  // === TRANSPORTISTA STATS ===
  get transportistaOrders() {
    if (!this.authService.username) return [];
    return this.dataService.getOrdersForTransportista(this.authService.username);
  }

  get pendingDeliveries(): number {
    return this.transportistaOrders.filter((o) => ['Pendiente', 'En preparación'].includes(o.estado)).length;
  }

  get onRouteDeliveries(): number {
    return this.transportistaOrders.filter((o) => ['En camino', 'Llegué al punto'].includes(o.estado)).length;
  }

  get completedDeliveries(): number {
    return this.transportistaOrders.filter((o) => o.estado === 'Entregado').length;
  }

  get incidentOrders(): number {
    return this.transportistaOrders.filter((o) => o.estado === 'Incidencia').length;
  }

  get punctualityRate(): number {
    const delivered = this.transportistaOrders.filter((o) => o.estado === 'Entregado');
    if (!delivered.length) return 0;
    const onTimeCount = delivered.filter((o) => {
      const traces = this.dataService.getTraceForOrder(o.code);
      const deliveredTrace = [...traces].reverse().find((t) => t.step === 'entregado');
      if (!deliveredTrace || !o.fechaEntrega) return false;
      return new Date(deliveredTrace.timestamp).getTime() <= new Date(o.fechaEntrega).getTime();
    }).length;
    return Math.round((onTimeCount / delivered.length) * 100);
  }

  get urgentDeliveries(): number {
    return this.transportistaOrders.filter((o) => o.deliveryType === 'Urgente' || o.prioridad === 'Alta').length;
  }

  get coldChainDeliveries(): number {
    return this.transportistaOrders.filter((o) => o.requiresColdChain).length;
  }

  get latestTransportistaOrders() {
    return this.transportistaOrders
      .slice()
      .sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha))
      .slice(0, 3);
  }

  get activeAlerts(): number {
    if (!this.authService.username) return 0;
    return this.dataService.getAlerts().filter((a) =>
      a.related?.type === 'orden' &&
      a.related?.id &&
      this.transportistaOrders.some((o) => o.code === a.related?.id) &&
      !a.read
    ).length;
  }

  loadProfile() {
    const stored = localStorage.getItem('user_profile_data');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Preservar state si ya existe (evita perder el estado operativo al navegar)
      this.profileData = {
        ...parsed,
        // Si el rol es transportista y no tiene state, asignar Disponible por defecto
        state: parsed.state || (this.isTransportista ? 'Disponible' : undefined),
      };
      return;
    }

    const currentUsername = this.authService.username || 'Usuario';
    const baseName = currentUsername === 'driver' ? 'Manuel López' : currentUsername === 'cliente' ? 'Farmacia Central' : currentUsername.charAt(0).toUpperCase() + currentUsername.slice(1);

    if (this.isCliente) {
      this.profileData = {
        name: baseName,
        role: 'Cliente',
        company: 'Farmacia Central',
        email: `${currentUsername}@cliente.com`,
        lastAccess: new Date().toLocaleString(),
        vehicle: '',
        assignedZone: '',
        rating: '5.0/5',
      };
    } else if (this.isTransportista) {
      this.profileData = {
        name: baseName,
        role: 'Operador de Reparto',
        company: 'Transportes VitalFlow',
        email: `${currentUsername}@vitalflow.com`,
        lastAccess: new Date(Date.now() - 1000 * 60 * 20).toLocaleString(),
        vehicle: 'F-350 Refrigerada',
        assignedZone: 'Lima Norte',
        rating: '4.9/5',
        state: 'Disponible',
      };
    } else {
      this.profileData = {
        name: baseName,
        role: 'Supervisor de Logística',
        company: 'MedLog · VitalFlow Logistics',
        email: `${currentUsername}@vitalflow.com`,
        lastAccess: new Date(Date.now() - 1000 * 60 * 45).toLocaleString(),
        vehicle: '',
        assignedZone: '',
        rating: '4.9/5',
      };
    }

    this.saveProfile();
  }

  changeState(newState: 'Disponible' | 'En ruta' | 'Descanso' | 'Inactivo') {
    this.profileData.state = newState;
    this.saveProfile();
    this.toastMessage = `Estado cambiado a ${newState}`;
    this.toastOpen = true;
  }

  saveProfile() {
    localStorage.setItem('user_profile_data', JSON.stringify(this.profileData));
  }

  onTabChange(event: any) {
    const val = event.detail.value;
    if (val === 'modulos' || val === 'perfil') {
      this.activeTab = val;
    }
  }

  // Editar Perfil
  openEditProfile() {
    this.editName = this.profileData.name;
    this.editEmail = this.profileData.email;
    this.editCompany = this.profileData.company;
    this.showEditProfileModal = true;
  }

  submitEditProfile() {
    if (!this.editName.trim() || !this.editEmail.trim()) {
      this.toastMessage = 'Nombre y correo son requeridos.';
      this.toastOpen = true;
      return;
    }
    this.profileData.name = this.editName;
    this.profileData.email = this.editEmail;
    this.profileData.company = this.editCompany;
    this.saveProfile();
    
    this.showEditProfileModal = false;
    this.toastMessage = '✓ Perfil actualizado con éxito';
    this.toastOpen = true;
  }

  // Cambiar Contraseña
  openChangePassword() {
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.showChangePasswordModal = true;
  }

  submitChangePassword() {
    this.passwordError = '';

    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.passwordError = 'Todos los campos son requeridos.';
      this.toastMessage = this.passwordError;
      this.toastOpen = true;
      return;
    }
    if (this.newPassword.length < 8) {
      this.passwordError = 'La nueva contraseña debe tener al menos 8 caracteres.';
      this.toastMessage = this.passwordError;
      this.toastOpen = true;
      return;
    }
    if (!/[A-Z]/.test(this.newPassword)) {
      this.passwordError = 'Debe incluir al menos una letra mayúscula.';
      this.toastMessage = this.passwordError;
      this.toastOpen = true;
      return;
    }
    if (!/[0-9]/.test(this.newPassword)) {
      this.passwordError = 'Debe incluir al menos un número.';
      this.toastMessage = this.passwordError;
      this.toastOpen = true;
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'Las contraseñas nuevas no coinciden.';
      this.toastMessage = this.passwordError;
      this.toastOpen = true;
      return;
    }
    if (!this.authService.checkCurrentPassword(this.currentPassword)) {
      this.passwordError = 'La contraseña actual no es correcta.';
      this.toastMessage = this.passwordError;
      this.toastOpen = true;
      return;
    }

    const saved = this.authService.updatePasswordForCurrentUser(this.newPassword);
    if (!saved) {
      this.toastMessage = 'No se pudo actualizar la contraseña.';
      this.toastOpen = true;
      return;
    }

    this.showChangePasswordModal = false;
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.passwordError = '';
    this.toastMessage = '✓ Contraseña actualizada correctamente';
    this.toastOpen = true;
  }

  logout() {
    this.authService.logout();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
