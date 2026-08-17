import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { PasswordInputComponent } from '../../components/password-input/password-input.component';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';
import { passwordStrengthValidator, passwordMatchValidator } from '../../validators/password.validator';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
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
            <div class="brand-logo">Triage</div>
            <h1 class="brand-title">Rejoignez-nous</h1>
            <p class="brand-subtitle">Commencez à optimiser votre support dès aujourd'hui</p>
          </div>
        </div>
        <div class="auth-right">
          <div class="auth-card">
            <h2 class="auth-title">Créer un compte</h2>
            <p class="auth-subtitle">C'est gratuit et rapide</p>

            @if (errorMessage()) {
              <app-alert type="error">{{ errorMessage() }}</app-alert>
            }

            <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="auth-form">
            <div class="name-fields">
              <app-input
                label="Prénom"
                placeholder="John"
                [formControl]="registerForm.controls.firstName"
                [errorMessage]="getErrorMessage('firstName')"
              />
              <app-input
                label="Nom"
                placeholder="Doe"
                [formControl]="registerForm.controls.lastName"
                [errorMessage]="getErrorMessage('lastName')"
              />
            </div>

            <app-input
              type="email"
              label="Email"
              placeholder="vous@exemple.com"
              [formControl]="registerForm.controls.email"
              [errorMessage]="getErrorMessage('email')"
            />

            <app-password-input
              label="Mot de passe"
              placeholder="Créez un mot de passe"
              [formControl]="registerForm.controls.password"
              [errorMessage]="getPasswordErrorMessage()"
            />

            <app-password-input
              label="Confirmer le mot de passe"
              placeholder="Confirmez votre mot de passe"
              [formControl]="registerForm.controls.confirmPassword"
              [errorMessage]="getConfirmPasswordErrorMessage()"
            />

              <app-button type="submit" [loading]="loading()" [disabled]="registerForm.invalid">
                Créer un compte
              </app-button>
            </form>

            <div class="auth-switch">
              Déjà un compte?
              <a routerLink="/auth/login" class="switch-link">Se connecter</a>
            </div>
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

    .name-fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
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
      color: var(--text-secondary);
      font-size: 0.95rem;
    }

    @media (max-width: 980px) {
      .auth-container {
        grid-template-columns: 1fr;
      }
      .auth-left {
        display: none;
      }
      .name-fields {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm = this.fb.group({
    firstName: this.fb.control('', [Validators.required]),
    lastName: this.fb.control('', [Validators.required]),
    email: this.fb.control('', [Validators.required, Validators.email]),
    password: this.fb.control('', [Validators.required, passwordStrengthValidator]),
    confirmPassword: this.fb.control('', [Validators.required])
  }, { validators: passwordMatchValidator });

  loading = signal(false);
  errorMessage = signal<string | null>(null);

  getErrorMessage(controlName: string): string | undefined {
    const control = this.registerForm.get(controlName);
    if (!control || !control.touched || !control.errors) {
      return undefined;
    }
    if (control.errors['required']) return 'Ce champ est requis';
    if (control.errors['email']) return 'Email invalide';
    return undefined;
  }

  getPasswordErrorMessage(): string | undefined {
    const control = this.registerForm.get('password');
    if (!control || !control.touched || !control.errors) {
      return undefined;
    }
    if (control.errors['required']) return 'Ce champ est requis';
    if (control.errors['minLength']) return '8 caractères minimum';
    return 'Mot de passe trop faible';
  }

  getConfirmPasswordErrorMessage(): string | undefined {
    const control = this.registerForm.get('confirmPassword');
    if (!control || !control.touched) {
      return undefined;
    }
    if (control.errors?.['required']) return 'Ce champ est requis';
    if (this.registerForm.errors?.['passwordMismatch']) {
      return 'Les mots de passe ne correspondent pas';
    }
    return undefined;
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.register({
      firstName: this.registerForm.value.firstName!,
      lastName: this.registerForm.value.lastName!,
      email: this.registerForm.value.email!,
      password: this.registerForm.value.password!
    }).subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: () => {
        this.errorMessage.set('Erreur lors de la création du compte');
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }
}
