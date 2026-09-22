import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomerIdentityService } from '../../../core/services/customer-identity.service';
import { AuthService } from '../../../core/services/auth.service';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { HomeIdentityPanelComponent } from './home-identity-panel.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HomeIdentityPanelComponent, IconComponent],
  template: `
    <section class="home-page">
      <div class="home-page__container">
        <header class="home-hero">
          <span class="home-hero__pill">Support client intelligent</span>

          <div class="home-hero__icon" aria-hidden="true">
            <app-icon name="bot" size="xl" />
          </div>

          <div class="home-hero__copy">
            <h1>Trouvez une réponse fiable avant d'ouvrir un ticket</h1>
            <p>
              Posez une question et laissez l'assistant documentaire retrouver la meilleure source
              avant d'escalader vers le support.
            </p>
          </div>
        </header>

        <form class="home-search" role="search" aria-label="Recherche d’aide" (ngSubmit)="goToChat()">
          <div class="home-search__shell">
            <span class="home-search__icon" aria-hidden="true">
              <app-icon name="search" size="md" />
            </span>

            <input
              id="quick-question"
              class="home-search__input"
              type="search"
              name="question"
              [(ngModel)]="question"
              placeholder="Ex : Comment réinitialiser mon mot de passe ?"
            >

            <button class="home-search__submit" type="submit" aria-label="Rechercher">
              <app-icon name="search" size="sm" aria-hidden="true" />
              <span class="home-search__submit-label">Rechercher</span>
            </button>
          </div>
        </form>

        <div class="home-shortcuts" aria-label="Suggestions rapides">
          <button class="home-shortcut" type="button" (click)="useShortcut('mot de passe')">
            <app-icon name="lock" size="sm" aria-hidden="true" />
            <span>Mot de passe</span>
          </button>

          <button class="home-shortcut" type="button" (click)="useShortcut('commandes')">
            <app-icon name="sparkles" size="sm" aria-hidden="true" />
            <span>Commandes</span>
          </button>

          <button class="home-shortcut" type="button" (click)="useShortcut('support')">
            <app-icon name="headset" size="sm" aria-hidden="true" />
            <span>Support</span>
          </button>
        </div>

        <div class="home-identity" *ngIf="!hasLinkedEmail()">
          <app-home-identity-panel />
        </div>

        <div class="home-links" aria-label="Accès rapides">
          <a class="home-link-card" routerLink="/chat" aria-label="Poser une question dans le chat">
            <span class="home-link-card__tile" aria-hidden="true">
              <app-icon name="chat-bubble" size="md" />
            </span>
            <div class="home-link-card__content">
              <span class="home-link-card__title">Poser une question</span>
              <span class="home-link-card__description">Démarrer une recherche guidée dans le chat</span>
            </div>
          </a>

          <a class="home-link-card" routerLink="/historique" aria-label="Voir mon historique">
            <span class="home-link-card__tile" aria-hidden="true">
              <app-icon name="history" size="md" />
            </span>
            <div class="home-link-card__content">
              <span class="home-link-card__title">Mon historique</span>
              <span class="home-link-card__description">Retrouver mes conversations et suivis récents</span>
            </div>
          </a>

          <a
            *ngIf="isLoggedIn(); else loginCard"
            class="home-link-card"
            routerLink="/chat"
            aria-label="Contacter le support"
          >
            <span class="home-link-card__tile" aria-hidden="true">
              <app-icon name="headset" size="md" />
            </span>
            <div class="home-link-card__content">
              <span class="home-link-card__title">Contacter le support</span>
              <span class="home-link-card__description">Obtenir une aide humaine si la réponse ne suffit pas</span>
            </div>
          </a>

          <ng-template #loginCard>
            <a class="home-link-card" routerLink="/login" aria-label="Se connecter">
              <span class="home-link-card__tile" aria-hidden="true">
                <app-icon name="login" size="md" />
              </span>
              <div class="home-link-card__content">
                <span class="home-link-card__title">Se connecter</span>
                <span class="home-link-card__description">Accéder à votre espace avant de contacter le support</span>
              </div>
            </a>
          </ng-template>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .home-page {
        position: relative;
        min-height: calc(100vh - var(--header-height));
        padding-block: clamp(3rem, 12vh, 7rem) var(--space-10);
        padding-inline: clamp(1rem, 4vw, 1.5rem);
        overflow: clip;
      }

      .home-page::before {
        content: '';
        position: absolute;
        inset: 0 auto auto 50%;
        width: min(44rem, 92vw);
        height: min(44rem, 92vw);
        transform: translateX(-50%);
        background:
          radial-gradient(
            circle,
            color-mix(in srgb, var(--brand-500) 18%, transparent) 0%,
            color-mix(in srgb, var(--brand-400) 10%, transparent) 38%,
            transparent 72%
          );
        pointer-events: none;
        z-index: 0;
      }

      .home-page__container {
        position: relative;
        z-index: 1;
        width: min(100%, 45rem);
        margin-inline: auto;
        display: grid;
        gap: var(--space-6);
      }

      .home-hero {
        display: grid;
        justify-items: center;
        gap: var(--space-4);
        text-align: center;
      }

      .home-hero__pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 2rem;
        padding-inline: var(--space-3);
        border-radius: var(--radius-full);
        background: color-mix(in srgb, var(--brand-500) 10%, var(--surface));
        border: 1px solid color-mix(in srgb, var(--brand-500) 16%, var(--border-default));
        color: var(--brand-600);
        font-size: 0.8125rem;
        font-weight: var(--fw-medium);
        letter-spacing: 0.01em;
      }

      :root[data-theme='dark'] .home-hero__pill {
        color: var(--brand-700);
        background: color-mix(in srgb, var(--brand-500) 20%, var(--surface));
        border-color: color-mix(in srgb, var(--brand-500) 28%, var(--border-default));
      }

      .home-hero__icon {
        width: 4rem;
        height: 4rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 1.25rem;
        color: var(--text-on-brand);
        background: var(--gradient-brand-strong);
        box-shadow:
          var(--shadow-lg),
          inset 0 1px 0 color-mix(in srgb, var(--surface) 28%, transparent);
      }

      .home-hero__copy {
        display: grid;
        justify-items: center;
        gap: var(--space-3);
      }

      .home-hero__copy h1 {
        max-width: 13ch;
        margin: 0;
        font-size: clamp(1.75rem, 5vw, 2.75rem);
        font-weight: var(--fw-semibold);
        line-height: 1.06;
        letter-spacing: -0.03em;
        text-wrap: balance;
      }

      .home-hero__copy p {
        max-width: 35rem;
        margin: 0;
        color: var(--text-secondary);
        font-size: 1.0625rem;
        line-height: 1.6;
        text-wrap: pretty;
      }

      .home-search {
        width: 100%;
      }

      .home-search__shell {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        min-height: 3.5rem;
        padding: 0.375rem 0.375rem 0.375rem 1rem;
        border: 1px solid var(--border-default);
        border-radius: var(--radius-full);
        background: var(--surface);
        box-shadow: var(--shadow-sm);
        transition:
          border-color var(--transition-fast),
          box-shadow var(--transition-fast),
          transform var(--transition-fast),
          background-color var(--transition-fast);
      }

      .home-search__shell:focus-within {
        border-color: color-mix(in srgb, var(--brand-500) 56%, var(--border-default));
        box-shadow: var(--shadow-focus), var(--shadow-md);
        transform: translateY(-1px);
      }

      .home-search__icon {
        color: var(--text-secondary);
      }

      .home-search__input {
        flex: 1 1 auto;
        min-width: 0;
        border: 0;
        background: transparent;
        color: var(--text-primary);
        font-size: 1rem;
      }

      .home-search__input::placeholder {
        color: var(--text-secondary);
      }

      .home-search__input:focus {
        outline: 0;
        box-shadow: none;
      }

      .home-search__submit {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-2);
        min-width: 2.75rem;
        min-height: 2.75rem;
        padding-inline: var(--space-4);
        border-radius: var(--radius-full);
        background: var(--brand-600);
        color: var(--text-on-brand);
        box-shadow: var(--shadow-sm);
        transition:
          transform var(--transition-fast),
          background-color var(--transition-fast),
          box-shadow var(--transition-fast);
      }

      .home-search__submit:hover {
        background: var(--brand-700);
        box-shadow: var(--shadow-md);
        transform: translateY(-1px);
      }

      .home-search__submit:focus-visible {
        outline: 0;
      }

      .home-search__submit-label {
        white-space: nowrap;
      }

      .home-shortcuts {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: var(--space-2);
      }

      .home-shortcut {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-2);
        min-height: 2.75rem;
        padding-inline: var(--space-4);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-full);
        background: color-mix(in srgb, var(--surface) 92%, var(--surface-subtle));
        color: var(--text-primary);
        font-size: 0.9375rem;
        font-weight: var(--fw-medium);
        box-shadow: var(--shadow-xs);
        transition:
          transform var(--transition-fast),
          border-color var(--transition-fast),
          background-color var(--transition-fast),
          box-shadow var(--transition-fast),
          color var(--transition-fast);
      }

      .home-shortcut:hover {
        transform: translateY(-1px);
        border-color: color-mix(in srgb, var(--brand-500) 28%, var(--border-default));
        background: color-mix(in srgb, var(--brand-500) 10%, var(--surface));
        color: var(--brand-600);
        box-shadow: var(--shadow-sm);
      }

      .home-shortcut:focus-visible {
        outline: 0;
        box-shadow: var(--shadow-focus), var(--shadow-sm);
      }

      .home-identity {
        width: 100%;
        padding-top: var(--space-2);
      }

      .home-links {
        display: grid;
        gap: var(--space-3);
      }

      .home-link-card {
        display: grid;
        grid-template-columns: auto 1fr;
        align-items: center;
        gap: var(--space-3);
        min-height: 7.25rem;
        padding: var(--space-4);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-xl);
        background: color-mix(in srgb, var(--surface) 94%, var(--surface-subtle));
        box-shadow: var(--shadow-sm);
        color: var(--text-primary);
        text-decoration: none;
        transition:
          transform var(--transition-fast),
          border-color var(--transition-fast),
          box-shadow var(--transition-fast),
          background-color var(--transition-fast);
      }

      .home-link-card:hover {
        transform: translateY(-2px);
        border-color: color-mix(in srgb, var(--brand-500) 24%, var(--border-default));
        background: color-mix(in srgb, var(--brand-500) 7%, var(--surface));
        box-shadow: var(--shadow-md);
      }

      .home-link-card:focus-visible {
        outline: 0;
        box-shadow: var(--shadow-focus), var(--shadow-md);
      }

      .home-link-card__tile {
        width: 2.5rem;
        height: 2.5rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-lg);
        background: color-mix(in srgb, var(--brand-500) 12%, var(--surface));
        color: var(--brand-600);
      }

      .home-link-card__content {
        min-width: 0;
        display: grid;
        gap: var(--space-1);
        text-align: left;
      }

      .home-link-card__title {
        font-size: 1rem;
        font-weight: var(--fw-semibold);
        line-height: 1.3;
      }

      .home-link-card__description {
        color: var(--text-secondary);
        font-size: 0.9375rem;
        line-height: 1.45;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      @media (min-width: 640px) {
        .home-links {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }

      @media (max-width: 479px) {
        .home-search__shell {
          padding-left: 0.875rem;
        }

        .home-search__submit {
          width: 2.75rem;
          padding-inline: 0;
        }

        .home-search__submit-label {
          display: none;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .home-search__shell:focus-within,
        .home-search__submit:hover,
        .home-shortcut:hover,
        .home-link-card:hover {
          transform: none;
        }
      }
    `
  ]
})
export class HomePageComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly customerIdentityService = inject(CustomerIdentityService);

  protected readonly isLoggedIn = this.authService.isAuthenticated;
  protected readonly hasLinkedEmail = () => !!this.customerIdentityService.email();

  question = '';

  goToChat(): void {
    void this.router.navigate(['/chat'], {
      queryParams: this.question.trim() ? { question: this.question.trim() } : undefined
    });
  }

  useShortcut(shortcut: string): void {
    this.question = `J'ai une question concernant ${shortcut}.`;
    this.goToChat();
  }
}
