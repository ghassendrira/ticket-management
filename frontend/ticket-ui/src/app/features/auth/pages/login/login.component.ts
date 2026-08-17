import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../../core/services/auth.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { PasswordInputComponent } from '../../components/password-input/password-input.component';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
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
            <div class="brand-logo">{{ 'AUTH.LOGIN.BRAND' | translate }}</div>
            <h1 class="brand-title">{{ 'AUTH.LOGIN.TAGLINE' | translate }}</h1>
            <p class="brand-subtitle">{{ 'AUTH.LOGIN.SUBTAGLINE' | translate }}</p>
          </div>
        </div>
        <div class="auth-right">
          <div class="auth-card">
            <h2 class="auth-title">{{ 'AUTH.LOGIN.CONNECT_BTN' | translate }}</h2>
            <p class="auth-subtitle">{{ 'AUTH.LOGIN.WELCOME_BACK' | translate }}</p>

            @if (errorMessage()) {
              <app-alert type="error">{{ errorMessage() }}</app-alert>
            }

            <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="auth-form">
              <app-input
                type="text"
                [label]="'Username' | translate"
                [placeholder]="'Username' | translate"
                formControlName="usernameOrEmail"
                [errorMessage]="getErrorMessage('usernameOrEmail')"
              />

              <app-password-input
                [label]="'Password' | translate"
                [placeholder]="'Password' | translate"
                formControlName="password"
                [errorMessage]="getErrorMessage('password')"
              />

              <div class="form-footer">
              </div>

              <app-button type="submit" [loading]="loading()" [disabled]="loginForm.invalid">
                {{ 'LOGIN' | translate }}
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

    .form-footer {
      display: flex;
      justify-content: flex-end;
    }

    .forgot-link, .switch-link {
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
    }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  readonly translate = inject(TranslateService);

  loginForm = this.fb.group({
    usernameOrEmail: this.fb.control('', [Validators.required]),
    password: this.fb.control('', [Validators.required])
  });

  loading = signal(false);
  errorMessage = signal<string | null>(null);

  getErrorMessage(controlName: string): string | undefined {
    const control = this.loginForm.get(controlName);
    if (!control || !control.touched || !control.errors) {
      return undefined;
    }
    if (control.errors['required']) return this.translate.instant('AUTH.LOGIN.REQUIRED');
    return undefined;
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.login({
      usernameOrEmail: this.loginForm.value.usernameOrEmail!,
      password: this.loginForm.value.password!
    }).subscribe({
      next: () => {
      },
      error: () => {
        this.errorMessage.set(this.translate.instant('AUTH.LOGIN.INVALID_CREDENTIALS'));
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }
}
