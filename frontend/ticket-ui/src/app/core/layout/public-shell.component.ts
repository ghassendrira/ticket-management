import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { CustomerIdentityService } from '../services/customer-identity.service';
import { ThemeService } from '../services/theme.service';
import { AuthService } from '../services/auth.service';
import { AppHeaderBarComponent, type NavItem } from '../../shared/components/app-header-bar/app-header-bar.component';
import { UiDrawerComponent } from '../../shared/components/ui-tooltip/ui-tooltip-modal-drawer.component';
import { IconComponent, type IconName } from '../../shared/components/icon/icon.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-public-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, AppHeaderBarComponent, UiDrawerComponent, IconComponent],
  template: `
    <div class="public-shell">
      <a class="skip-link" href="#public-main">Aller au contenu principal</a>

      <!-- UNIFIED HEADER -->
      <app-header-bar
        variant="public"
        brandTitle="Assistant IA RAG"
        brandSubtitle="Triage"
        [publicNavItems]="publicNavItems()"
        (toggleMobileDrawer)="mobileDrawerOpen.set(true)"
      />

      <!-- MOBILE DRAWER: Navigation + User -->
      <app-ui-drawer
        [open]="mobileDrawerOpen()"
        position="left"
        size="md"
        title="Menu"
        subtitle="Navigation"
        (close)="mobileDrawerOpen.set(false)"
      >
        <ul class="mobile-nav-list">
          @for (item of publicNavItems(); track item.label) {
            <li>
              @if (item.divider) {
                <hr class="mobile-nav__divider">
              } @else if (item.link) {
                <a
                  class="mobile-nav-item"
                  [routerLink]="item.link"
                  routerLinkActive="is-active"
                  [routerLinkActiveOptions]="{ exact: item.link === '/' }"
                  (click)="mobileDrawerOpen.set(false)"
                >
                  <app-icon [name]="item.icon" size="md" aria-hidden="true" />
                  <span>{{ item.label }}</span>
                  <app-icon name="chevron-right" size="sm" aria-hidden="true" class="mobile-nav-item__chev" />
                </a>
              }
            </li>
          }

          <!-- EXTRA CUSTOMER IDENTITY: if customer identity linked -->
          @if (isAdminLoggedIn() && linkedEmail()) {
            <hr class="mobile-nav__divider">
            <li class="mobile-nav__identity">
              <div class="mobile-nav__identity-row">
                <app-icon name="user" size="md" aria-hidden="true" />
                <div class="mobile-nav__identity-text">
                  <strong>Connecté</strong>
                  <small>{{ linkedEmail() }}</small>
                </div>
              </div>
              <button type="button" class="mobile-nav-logout" (click)="disconnect(); mobileDrawerOpen.set(false)">
                <app-icon name="logout" size="sm" aria-hidden="true" />
                <span>Se déconnecter</span>
              </button>
            </li>
          }
        </ul>
      </app-ui-drawer>

      <main id="public-main" class="public-main" role="main">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [
    `
      .public-shell {
        min-height: 100vh;
        background: var(--surface-base);
        color: var(--text-primary);
        display: flex;
        flex-direction: column;
      }
      .public-main {
        flex: 1 1 auto;
        width: 100%;
        min-height: calc(100vh - var(--header-height));
        display: block;
      }

      /* ==========================================================
       * MOBILE DRAWER NAV LIST
       * ========================================================== */
      .mobile-nav-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        padding: var(--space-1) 0;
      }
      .mobile-nav__divider {
        margin: var(--space-3) var(--space-2);
        border: 0;
        height: 1px;
        background: var(--border-subtle);
      }
      .mobile-nav-item {
        display: inline-flex;
        align-items: center;
        gap: var(--space-3);
        width: 100%;
        min-height: 48px;
        padding: 0 var(--space-4);
        border-radius: var(--radius-lg);
        background: transparent;
        border: 1px solid transparent;
        color: var(--text-primary);
        text-decoration: none;
        font-family: var(--font-sans);
        font-size: var(--fs-base);
        font-weight: var(--fw-medium);
        line-height: var(--lh-normal);
        text-align: left;
        cursor: pointer;
        transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
        &:hover { background: var(--surface-hover); }
        &:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
      }
      .mobile-nav-item.is-active {
        background: var(--brand-50);
        color: var(--brand-700);
        font-weight: var(--fw-semibold);
        border-color: color-mix(in srgb, var(--brand-500) 16%, transparent);
      }
      :root[data-theme="dark"] .mobile-nav-item.is-active {
        background: color-mix(in srgb, var(--brand-500) 16%, transparent);
        color: var(--brand-600);
      }
      .mobile-nav-item__chev { margin-left: auto; color: var(--text-muted); }

      /* customer identity block */
      .mobile-nav__identity {
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        padding: var(--space-4);
        background: var(--surface-subtle);
        border-radius: var(--radius-lg);
      }
      .mobile-nav__identity-row {
        display: inline-flex;
        align-items: center;
        gap: var(--space-3);
      }
      .mobile-nav__identity-text {
        display: inline-flex;
        flex-direction: column;
        gap: 2px;
      }
      .mobile-nav__identity-text strong {
        font-family: var(--font-sans);
        font-size: var(--fs-sm);
        font-weight: var(--fw-semibold);
        color: var(--text-primary);
      }
      .mobile-nav__identity-text small {
        font-size: var(--fs-xs);
        color: var(--text-muted);
      }
      .mobile-nav-logout {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-2);
        min-height: 44px;
        padding: 0 var(--space-4);
        border-radius: var(--radius-md);
        background: var(--danger-50);
        color: var(--danger-700);
        border: 1px solid color-mix(in srgb, var(--danger-500) 20%, transparent);
        font-family: var(--font-sans);
        font-size: var(--fs-sm);
        font-weight: var(--fw-semibold);
        cursor: pointer;
        &:hover { background: var(--danger-100); }
        &:focus-visible { outline: none; box-shadow: var(--shadow-focus-danger); }
      }
      :root[data-theme="dark"] .mobile-nav-logout {
        background: color-mix(in srgb, var(--danger-500) 16%, transparent);
        color: var(--danger-300);
        &:hover { background: color-mix(in srgb, var(--danger-500) 26%, transparent); }
      }
    `
  ]
})
export class PublicShellComponent {
  private readonly themeService = inject(ThemeService);
  private readonly customerIdentityService = inject(CustomerIdentityService);
  private readonly authService = inject(AuthService);

  readonly mobileDrawerOpen = signal(false);

  protected readonly isDarkTheme = this.themeService.isDark;
  protected readonly linkedEmail = () => this.customerIdentityService.email();
  protected readonly isAdminLoggedIn = this.authService.isAuthenticated;

  readonly publicNavItems = computed<NavItem[]>(() => {
    const items: NavItem[] = [
      { label: 'Accueil',     link: '/',           icon: 'home' },
      { label: 'Chat',        link: '/chat',       icon: 'chat-bubble' },
      { label: 'Historique',  link: '/historique', icon: 'history' },
    ];
    if (this.isAdminLoggedIn()) {
      items.push({
        label: 'Administration',
        link: '/dashboard',
        icon: 'dashboard',
      });
    }
    return items;
  });

  protected toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  protected disconnect(): void {
    this.customerIdentityService.logout();
    this.authService.logout();
  }
}
