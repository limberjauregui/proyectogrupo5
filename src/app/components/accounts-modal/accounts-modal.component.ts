import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import { UsersService } from '../../services/users.service';

import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonContent, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
  IonSpinner
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import { closeOutline, saveOutline, checkmarkCircleOutline, alertCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-accounts-modal',
  templateUrl: './accounts-modal.component.html',
  styleUrls: ['./accounts-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
    IonContent, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
    IonSpinner
  ]
})
export class AccountsModalComponent implements OnInit {
  accountForm!: FormGroup;
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private modalCtrl: ModalController,
    private usersService: UsersService,
    private toastCtrl: ToastController
  ) {
    addIcons({ closeOutline, saveOutline, checkmarkCircleOutline, alertCircleOutline });
  }

  ngOnInit() {
    this.accountForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['cliente', [Validators.required]]
    });
  }

  close() {
    this.modalCtrl.dismiss();
  }

  async onSubmit() {
    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { email, password, name, role } = this.accountForm.value;

    const result = await this.usersService.createAccount(email, password, name, role);

    this.isSubmitting = false;

    if (result.success) {
      this.successMessage = 'Cuenta creada exitosamente.';
      
      const toast = await this.toastCtrl.create({
        message: 'Cuenta creada y guardada en base de datos.',
        duration: 2000,
        color: 'success',
        position: 'top',
        icon: 'checkmark-circle-outline'
      });
      await toast.present();

      // Cierre automático en 2 segundos si es éxito
      setTimeout(() => {
        this.modalCtrl.dismiss({ created: true });
      }, 2000);
      
    } else {
      this.errorMessage = result.error || 'Ocurrió un error al crear la cuenta.';
      
      const toast = await this.toastCtrl.create({
        message: this.errorMessage,
        duration: 3000,
        color: 'danger',
        position: 'top',
        icon: 'alert-circle-outline'
      });
      await toast.present();
    }
  }
}
