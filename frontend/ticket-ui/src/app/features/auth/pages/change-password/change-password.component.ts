import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { PasswordInputComponent } from '../../components/password-input/password-input.component';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    InputComponent,
    PasswordInputComponent,
    AlertComponent,
    NavbarComponent
  ],
  template: `
    <app-navbar />
    <div class="auth-page">
      <div class="auth-container">
        <div class="auth-left">
          <div class="brand-section">
            <div class="brand-logo">TicketFlow</div>
            <h1 class="brand-title">Changez votre mot de passe</h1>
            <p class="brand-subtitle">Vous devez définir un nouveau mot de passe pour continuer</p>
          </div>
        </div>
        <div class="auth-right">
          <div class="auth-card">
            <h2 class="auth-title">Changement de mot de passe</h2>
            <p class="auth-subtitle">Veuillez choisir un nouveau mot de passe sécurisé</p>

            @if (errorMessage()) {
              <app-alert type="error">{{ errorMessage() }}</app-alert>
            }

            <form [formGroup]="changePasswordForm" (ngSubmit)="onSubmit()" class="auth-form">
              <app-input
                type="text"
                label="Nom d'utilisateur"
                placeholder="Nom d'utilisateur"
                formControlName="username"
                [errorMessage]="getErrorMessage('username')"
              />

              <app-password-input
                label="Mot de passe actuel"
                placeholder="Entrez votre mot de passe actuel"
                formControlName="currentPassword"
                [errorMessage]="getErrorMessage('currentPassword')"
              />

              <app-password-input
                label="Nouveau mot de passe"
                placeholder="Entrez votre nouveau mot de passe"
                formControlName="newPassword"
                [errorMessage]="getErrorMessage('newPassword')"
              />

              <app-button type="submit" [loading]="loading()" [disabled]="changePasswordForm.invalid">
                Changer le mot de passe
              </app-button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      background-color: var(--bg);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      padding-top: 100px;
    }

    .auth-container {
      width: 100%;
      max-width: 1000px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
    }

    .auth-left {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .brand-section {
      text-align: center;
    }

    .brand-logo {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 3rem;
      font-weight: 700;
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-violet), var(--accent-cyan));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 1.5rem;
    }

    .brand-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 2rem;
      color: var(--text-primary);
      margin-bottom: 0.75rem;
    }

    .brand-subtitle {
      color: var(--text-secondary);
      font-size: 1.1rem;
    }

    .auth-right {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .auth-card {
      background-color: var(--surface);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 2.5rem;
      width: 100%;
      max-width: 450px;
      box-shadow: 0 20px 60px var(--shadow);
    }

    .auth-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.75rem;
      color: var(--text-primary);
      margin-bottom: 0.5rem;
    }

    .auth-subtitle {
      color: var(--text-secondary);
      margin-bottom: 1.5rem;
      font-size: 0.95rem;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    @media (max-width: 980px) {
      .auth-container {
        grid-template-columns: 1fr;
      }
      .auth-left {
        display: none;
      }
    }
  `]
})
export class ChangePasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  changePasswordForm = this.fb.group({
    username: this.fb.control('', [Validators.required]),
    currentPassword: this.fb.control('', [Validators.required]),
    newPassword: this.fb.control('', [Validators.required, Validators.minLength(8)])
  });

  loading = signal(false);
  errorMessage = signal<string | null>(null);

  ngOnInit() {
    const user = this.authService.currentUser();
    if (user) {
      this.changePasswordForm.patchValue({
        username: user.username
      });
    }
  }

  getErrorMessage(controlName: string): string | undefined {
    const control = this.changePasswordForm.get(controlName);
    if (!control || !control.touched || !control.errors) {
      return undefined;
    }
    if (control.errors['required']) return 'Ce champ est requis';
    if (control.errors['minlength']) return 'Le mot de passe doit contenir au moins 8 caractères';
    return undefined;
  }

  onSubmit() {
    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.changePassword({
      username: this.changePasswordForm.value.username!,
      currentPassword: this.changePasswordForm.value.currentPassword!,
      newPassword: this.changePasswordForm.value.newPassword!
    }).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.errorMessage.set('Mot de passe actuel incorrect');
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }
}
