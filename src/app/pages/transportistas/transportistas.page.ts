import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonIcon,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonInput,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  locationOutline,
  documentTextOutline,
  searchOutline,
  chevronDownOutline,
  chatbubblesOutline,
  snowOutline,
  carOutline,
  createOutline,
  callOutline,
  mailOutline,
  navigateOutline,
  starOutline,
  timeOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  trashOutline,
  closeOutline
} from 'ionicons/icons';

interface Transportista {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  status: 'En ruta' | 'Disponible' | 'Descanso' | 'Inactivo';
  speciality: string;
  vehicleModel: string;
  plate: string;
  zone: string;
  phone: string;
  email: string;
  rating: number;
  gps: string;
  deliveries: number;
  onTime: string;
  incidents: number;
  lastUpdate: string;
  tempControlled: boolean;
}

@Component({
  selector: 'app-transportistas',
  templateUrl: './transportistas.page.html',
  styleUrls: ['./transportistas.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonIcon, CommonModule, FormsModule,
    IonModal, IonHeader, IonToolbar, IonTitle, IonButton,
    IonInput, IonSelect, IonSelectOption
  ],
})
export class TransportistasPage implements OnInit {
  activeFilter: string = 'Todos';
  filters = ['Todos', 'Disponible', 'En ruta', 'Descanso', 'Inactivo'];

  transportistas: Transportista[] = [
    {
      id: 'TR-092',
      name: 'Laura Rojas',
      initials: 'LR',
      avatarColor: '#0f766e',
      status: 'En ruta',
      speciality: 'Cadena frío',
      vehicleModel: 'Moto Honda CB500',
      plate: 'ABC-123',
      zone: 'Zona Sur',
      phone: '+51 999 111 222',
      email: 'laura.rojas@vitalflow.pe',
      rating: 4.8,
      gps: '-12.0531, -77.0490',
      deliveries: 142,
      onTime: '96%',
      incidents: 3,
      lastUpdate: 'hace 2 min',
      tempControlled: true,
    },
    {
      id: 'TR-105',
      name: 'Carlos Vega',
      initials: 'CV',
      avatarColor: '#7c3aed',
      status: 'Disponible',
      speciality: 'Carga general',
      vehicleModel: 'Camioneta Toyota Hilux',
      plate: 'DEF-456',
      zone: 'Zona Norte',
      phone: '+51 999 333 444',
      email: 'carlos.vega@vitalflow.pe',
      rating: 4.5,
      gps: '-12.0810, -77.0512',
      deliveries: 98,
      onTime: '91%',
      incidents: 1,
      lastUpdate: 'hace 15 min',
      tempControlled: false,
    },
    {
      id: 'TR-088',
      name: 'Mario Torres',
      initials: 'MT',
      avatarColor: '#f59e0b',
      status: 'Descanso',
      speciality: 'Medicamentos',
      vehicleModel: 'Van Mercedes Sprinter',
      plate: 'GHI-789',
      zone: 'Zona Este',
      phone: '+51 999 555 666',
      email: 'mario.torres@vitalflow.pe',
      rating: 4.6,
      gps: 'Sin señal',
      deliveries: 210,
      onTime: '94%',
      incidents: 5,
      lastUpdate: 'hace 1 h',
      tempControlled: true,
    },
    {
      id: 'TR-077',
      name: 'Ana Pacheco',
      initials: 'AP',
      avatarColor: '#3b82f6',
      status: 'Inactivo',
      speciality: 'Urgencias',
      vehicleModel: 'Furgoneta Renault Master',
      plate: 'JKL-012',
      zone: 'Zona Oeste',
      phone: '+51 999 777 888',
      email: 'ana.pacheco@vitalflow.pe',
      rating: 4.9,
      gps: 'Sin señal',
      deliveries: 325,
      onTime: '98%',
      incidents: 0,
      lastUpdate: 'hace 3 h',
      tempControlled: false,
    },
  ];

  constructor() {
    addIcons({
      addOutline, locationOutline, documentTextOutline, searchOutline,
      chevronDownOutline, chatbubblesOutline, snowOutline, carOutline,
      createOutline, callOutline, mailOutline, navigateOutline, starOutline,
      timeOutline, checkmarkCircleOutline, alertCircleOutline,
      trashOutline, closeOutline
    });
  }

  ngOnInit() {}

  // --- Filters and Search ---
  search: string = '';

  get filteredTransportistas(): Transportista[] {
    let list = this.transportistas;
    if (this.activeFilter !== 'Todos') {
      list = list.filter(t => t.status === this.activeFilter);
    }
    if (this.search.trim()) {
      const q = this.search.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q) || t.vehicleModel.toLowerCase().includes(q) || t.phone.includes(q));
    }
    return list;
  }

  get totalFlota(): number { return this.transportistas.length; }
  get disponibles(): number { return this.transportistas.filter(t => t.status === 'Disponible').length; }
  get enRuta(): number { return this.transportistas.filter(t => t.status === 'En ruta').length; }
  get avgRating(): string {
    if (this.transportistas.length === 0) return '0.0';
    const avg = this.transportistas.reduce((s, t) => s + t.rating, 0) / this.transportistas.length;
    return avg.toFixed(1);
  }

  setFilter(f: string) { this.activeFilter = f; }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      'En ruta': 'status-en-ruta',
      'Disponible': 'status-disponible',
      'Descanso': 'status-descanso',
      'Inactivo': 'status-inactivo',
    };
    return map[status] ?? '';
  }

  getStatusDot(status: string): string {
    const map: Record<string, string> = {
      'En ruta': 'dot-en-ruta',
      'Disponible': 'dot-disponible',
      'Descanso': 'dot-descanso',
      'Inactivo': 'dot-inactivo',
    };
    return map[status] ?? '';
  }

  stars(rating: number): number[] {
    return Array(Math.floor(rating)).fill(0);
  }

  // --- CRUD Logic ---
  showModal = false;
  isEditing = false;
  editingId: string | null = null;
  form: Partial<Transportista> = {};

  openCreateModal() {
    this.isEditing = false;
    this.editingId = null;
    this.form = {
      status: 'Disponible',
      rating: 5.0,
      deliveries: 0,
      incidents: 0,
      onTime: '100%',
      tempControlled: false,
      lastUpdate: 'Justo ahora',
      gps: 'Sin señal'
    };
    this.showModal = true;
  }

  openEditModal(t: Transportista) {
    this.isEditing = true;
    this.editingId = t.id;
    this.form = { ...t };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  saveTransportista() {
    if (!this.form.name || !this.form.phone) return;
    
    // Auto generate initials
    const parts = this.form.name.split(' ');
    this.form.initials = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2);
    this.form.initials = this.form.initials.toUpperCase();

    if (this.isEditing && this.editingId) {
      const index = this.transportistas.findIndex(x => x.id === this.editingId);
      if (index !== -1) {
        this.transportistas[index] = { ...this.transportistas[index], ...this.form as Transportista };
      }
    } else {
      this.form.id = `TR-${Date.now().toString().slice(-3)}`;
      this.form.avatarColor = '#14b8a6'; // Default color
      this.transportistas.push(this.form as Transportista);
    }
    this.closeModal();
  }

  deleteTransportista(id: string) {
    this.transportistas = this.transportistas.filter(x => x.id !== id);
  }
}
