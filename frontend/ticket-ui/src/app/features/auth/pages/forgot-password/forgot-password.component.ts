import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    InputComponent,
    AlertComponent,
    NavbarComponent
  ],
  template: `
    <app-navbar />
    <div class="auth-page">
      <div class="auth-container">
        <div class="auth-card">
          <h2 class="auth-title">Mot de passe oublié</h2>
          <p class="auth-subtitle">Entrez votre email pour recevoir un lien de réinitialisation</p>

          @if (successMessage()) {
            <app-alert type="success">{{ successMessage() }}</app-alert>
          }

          @if (errorMessage()) {
            <app-alert type="error">{{ errorMessage() }}</app-alert>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
              <app-input
                type="email"
                label="Email"
                placeholder="vous@exemple.com"
                [formControl]="form.controls.email"
                [errorMessage]="getErrorMessage('email')"
              />

            <app-button type="submit" [loading]="loading()" [disabled]="form.invalid">
              Envoyer le lien
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
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  form = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.email])
  });

  loading = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  getErrorMessage(controlName: string): string | undefined {
    const control = this.form.get(controlName);
    if (!control || !control.touched || !control.errors) {
      return undefined;
    }
    if (control.errors['required']) return 'Ce champ est requis';
    if (control.errors['email']) return 'Email invalide';
    return undefined;
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    this.authService.forgotPassword(this.form.value.email!).subscribe({
      next: () => {
        this.successMessage.set('Un lien de réinitialisation a été envoyé à votre email');
      },
      error: () => {
        this.errorMessage.set('Erreur lors de l\'envoi du lien');
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }
}
