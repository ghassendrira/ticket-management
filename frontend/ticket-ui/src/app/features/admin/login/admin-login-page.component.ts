import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-admin-login-page',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  template: `
    <div class="login-shell">
      <header class="login-topbar">
        <div class="page-shell topbar-content">
          <a routerLink="/" class="brand">Assistant IA RAG</a>
          <div class="topbar-actions">
            <button class="theme-toggle" type="button" (click)="toggleTheme()" aria-label="Basculer le theme">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path [attr.d]="isDarkTheme() ? lightIconPath : darkIconPath"></path>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <section class="centered-card-page auth-page">
        <div class="assistant-card auth-card">
          <div class="card-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                d="M17 10V8a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1zm-8 0V8a3 3 0 1 1 6 0v2H9zm3 3a1.5 1.5 0 0 1 .75 2.8V17a.75.75 0 0 1-1.5 0v-1.2A1.5 1.5 0 0 1 12 13z"
              ></path>
            </svg>
          </div>

          <div class="card-header">
            <h2>Connexion admin</h2>
            <p>Connectez-vous avec votre compte administrateur.</p>
          </div>

          <form (ngSubmit)="onSubmit()" class="login-form">
            <label>
              Email
              <input type="email" required [(ngModel)]="email" name="email" />
            </label>

            <label>
              Mot de passe
              <input type="password" required [(ngModel)]="password" name="password" />
            </label>

            <div *ngIf="error" class="error">{{ error }}</div>

            <button class="primary-button auth-button" type="submit" [disabled]="loading">
              <span *ngIf="!loading">Se connecter</span>
              <span *ngIf="loading">Chargement...</span>
            </button>
          </form>

          <div class="card-footer-links">
            <a routerLink="/">
              <span class="footer-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 4l9 8h-3v8h-5v-5H11v5H6v-8H3l9-8z"></path>
                </svg>
              </span>
              Retour accueil
            </a>
            <a routerLink="/historique">
              <span class="footer-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 5a7 7 0 1 1-6.65 9.19a1 1 0 1 1 1.9-.62A5 5 0 1 0 12 7H9.41l1.3 1.29a1 1 0 0 1-1.42 1.42L6.59 7l2.7-2.71a1 1 0 0 1 1.42 1.42L9.41 5H12zm-1 3a1 1 0 0 1 2 0v3.38l2.11 1.22a1 1 0 1 1-1 1.74l-2.61-1.5A1 1 0 0 1 11 12V8z"></path>
                </svg>
              </span>
              Historique
            </a>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .login-shell {
        min-height: 100vh;
        background: var(--bg-page);
      }

      .login-topbar {
        position: sticky;
        top: 0;
        z-index: 10;
        background: color-mix(in srgb, var(--bg-page) 82%, transparent);
        border-bottom: 0.5px solid var(--border-color);
        backdrop-filter: blur(18px);
      }

      .topbar-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 72px;
      }

      .brand {
        font-size: 0.98rem;
        font-weight: 600;
        color: var(--text-primary);
      }

      .theme-toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border: 0.5px solid var(--border-color);
        border-radius: 999px;
        background: var(--bg-card);
        color: var(--accent-color);
      }

      .theme-toggle svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
      }

      .auth-page {
        min-height: calc(100vh - 72px);
      }

      .auth-card {
        gap: 1.5rem;
      }

      .card-header {
        display: grid;
        gap: 0.6rem;
        text-align: center;
      }

      .card-header h2,
      .card-header p {
        margin: 0;
      }

      .auth-button {
        width: 100%;
        justify-content: center;
      }

      .login-form {
        display: grid;
        gap: 0.6rem;
      }

      label {
        display: grid;
        gap: 0.25rem;
        font-size: 0.95rem;
      }

      input[type='email'],
      input[type='password'] {
        padding: 0.5rem;
        border-radius: 6px;
        border: 1px solid var(--border-color);
        width: 100%;
      }

      .error {
        color: #b91c1c;
        font-size: 0.95rem;
      }
    `
  ]
})
export class AdminLoginPageComponent {
  email = '';
  password = '';
  loading = false;
  error: string | null = null;

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);

  protected readonly isDarkTheme = this.themeService.isDark;
  protected readonly darkIconPath = 'M21 12.79A9 9 0 1 1 11.21 3A7 7 0 0 0 21 12.79z';
  protected readonly lightIconPath =
    'M12 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1zm6.36 2.64a1 1 0 0 1 1.41 1.41l-.7.7a1 1 0 1 1-1.41-1.41l.7-.7zM12 7a5 5 0 1 1 0 10a5 5 0 0 1 0-10zm9 4a1 1 0 1 1 0 2h-1a1 1 0 1 1 0-2h1zm-4.64 6.36.7.7a1 1 0 0 1-1.41 1.41l-.7-.7a1 1 0 1 1 1.41-1.41zM12 19a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1zm-4.95-1.64a1 1 0 0 1 0 1.41l-.7.7a1 1 0 1 1-1.41-1.41l.7-.7a1 1 0 0 1 1.41 0zM5 11a1 1 0 1 1 0 2H4a1 1 0 1 1 0-2h1zm2.05-5.36.7.7A1 1 0 0 1 6.34 7.75l-.7-.7a1 1 0 0 1 1.41-1.41z';

  async onSubmit(): Promise<void> {
    this.error = null;
    this.loading = true;
    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.loading = false;
        void this.router.navigate(['/admin/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        if (err?.status === 401) {
          this.error = 'Email ou mot de passe incorrect';
        } else {
          this.error = 'Erreur lors de la tentative de connexion';
        }
      }
    });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
