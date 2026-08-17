import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { PasswordInputComponent } from '../../components/password-input/password-input.component';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';
import { passwordStrengthValidator, passwordMatchValidator } from '../../validators/password.validator';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    PasswordInputComponent,
    AlertComponent,
    NavbarComponent
  ],
  template: `
    <app-navbar />
    <div class="auth-page">
      <div class="auth-container">
        <div class="auth-card">
          <h2 class="auth-title">Réinitialiser le mot de passe</h2>
          <p class="auth-subtitle">Choisissez un nouveau mot de passe</p>

          @if (successMessage()) {
            <app-alert type="success">{{ successMessage() }}</app-alert>
          }

          @if (errorMessage()) {
            <app-alert type="error">{{ errorMessage() }}</app-alert>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
            <app-password-input
              label="Nouveau mot de passe"
              placeholder="Créez un mot de passe"
              [formControl]="form.controls.password"
              [errorMessage]="getPasswordErrorMessage()"
            />

            <app-password-input
              label="Confirmer le mot de passe"
              placeholder="Confirmez votre mot de passe"
              [formControl]="form.controls.confirmPassword"
              [errorMessage]="getConfirmPasswordErrorMessage()"
            />

            <app-button type="submit" [loading]="loading()" [disabled]="form.invalid">
              Réinitialiser le mot de passe
            </app-button>
          </form>

          <div class="auth-switch">
            <a routerLink="/auth/login" class="switch-link">Retour à la connexion</a>
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
      max-width: 450px;
    }

    .auth-card {
      background-color: var(--surface);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 2.5rem;
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

    .switch-link {
      color: var(--accent-violet);
      text-decoration: none;
      font-weight: 500;
      font-size: 0.9rem;
    }

    .auth-switch {
      margin-top: 1.5rem;
      text-align: center;
    }
  `]
})
export class ResetPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  form = this.fb.group({
    password: this.fb.control('', [Validators.required, passwordStrengthValidator]),
    confirmPassword: this.fb.control('', [Validators.required])
  }, { validators: passwordMatchValidator });

  loading = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  getPasswordErrorMessage(): string | undefined {
    const control = this.form.get('password');
    if (!control || !control.touched || !control.errors) {
      return undefined;
    }
    if (control.errors['required']) return 'Ce champ est requis';
    return 'Mot de passe trop faible';
  }

  getConfirmPasswordErrorMessage(): string | undefined {
    const control = this.form.get('confirmPassword');
    if (!control || !control.touched) {
      return undefined;
    }
    if (control.errors?.['required']) return 'Ce champ est requis';
    if (this.form.errors?.['passwordMismatch']) {
      return 'Les mots de passe ne correspondent pas';
    }
    return undefined;
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.errorMessage.set('Token invalide');
      return;
    }

    this.loading.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    this.authService.resetPassword(token, this.form.value.password!).subscribe({
      next: () => {
        this.successMessage.set('Mot de passe réinitialisé avec succès');
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      },
      error: () => {
        this.errorMessage.set('Erreur lors de la réinitialisation');
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }
}
