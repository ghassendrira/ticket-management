import { Component, inject, computed, signal } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../../core/services/auth.service';
import { AppHeaderBarComponent, type NavItem } from '../../../shared/components/app-header-bar/app-header-bar.component';
import { IconComponent, type IconName } from '../../../shared/components/icon/icon.component';

/* Maps the exact labelKey/icon routing from original SidebarComponent, preserving logic & roles. */
const LABEL_KEY_TO_ICON: Record<string, IconName> = {
  'APP.NAV.DASHBOARD': 'dashboard',
  'APP.NAV.TICKETS': 'ticket',
  'APP.NAV.TEAM': 'users',
  'APP.NAV.TEAM_MANAGEMENT': 'team-management' as any,
  'APP.NAV.AI_ASSISTANT': 'sparkles',
  'APP.NAV.DOCUMENTS': 'documents',
  'APP.NAV.CATEGORIES': 'tag',
  'APP.NAV.ANALYTICS': 'chart-bar',
  'APP.NAV.USERS': 'users',
};

const DEFAULT_ICON: IconName = 'circle';

interface SidebarLink {
  labelKey: string;
  route: string;
  icon: IconName;
  role?: Array<'AGENT' | 'MANAGER' | 'ADMIN'>;
  footer?: boolean;
  action?: 'notifications' | 'logout';
  danger?: boolean;
}

/** Defines ALL sidebar navigation. Mirrors the original SidebarComponent order & role logic exactly. */
const SIDEBAR_LINKS: SidebarLink[] = [
  { labelKey: 'APP.NAV.DASHBOARD',         route: '/dashboard',  icon: 'dashboard' },
  { labelKey: 'APP.NAV.TICKETS',           route: '/tickets',    icon: 'ticket' },
  { labelKey: 'APP.NAV.TEAM_MANAGEMENT',   route: '/teams',      icon: 'users',        role: ['MANAGER', 'ADMIN'] },
  { labelKey: 'APP.NAV.TEAM',              route: '/team',       icon: 'headset',      role: ['AGENT'] },
  { labelKey: 'APP.NAV.AI_ASSISTANT',      route: '/ai',         icon: 'sparkles',     role: ['ADMIN', 'MANAGER'] },
  { labelKey: 'APP.NAV.DOCUMENTS',         route: '/documents',  icon: 'file-text',    role: ['ADMIN', 'MANAGER'] },
  { labelKey: 'APP.NAV.CATEGORIES',        route: '/categories', icon: 'layers',       role: ['ADMIN', 'MANAGER'] },
  { labelKey: 'APP.NAV.ANALYTICS',         route: '/analytics',  icon: 'chart-bar',    role: ['ADMIN', 'MANAGER'] },
  { labelKey: 'APP.NAV.USERS',             route: '/users',      icon: 'user',         role: ['ADMIN', 'MANAGER'] },
];
const SIDEBAR_FOOTER_LINKS: SidebarLink[] = [
  { labelKey: 'APP.NAV.NOTIFICATIONS', route: '/dashboard',  icon: 'bell',         footer: true, action: 'notifications' },
  { labelKey: 'APP.NAV.ESCALATIONS',   route: '/escalations', icon: 'flag',         footer: true },
  { labelKey: 'APP.NAV.SETTINGS',      route: '/settings',    icon: 'gear',         footer: true },
  { labelKey: 'APP.NAV.LOGOUT',        route: '',             icon: 'logout',       footer: true, action: 'logout', danger: true },
];

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe, AppHeaderBarComponent, IconComponent],
  template: `
    <div class="dashboard-layout" [class.dashboard-layout--drawer-open]="drawerOpen()">
      <a class="skip-link" href="#dashboard-content">Aller au contenu principal</a>

      <!-- DESKTOP SIDEBAR (persistent, lg+) -->
      <aside class="sidebar" aria-label="Navigation du tableau de bord" role="navigation">
        <div class="sidebar-header">
          <a routerLink="/dashboard" class="brand-link" aria-label="TicketFlow - Accueil tableau de bord">
            <span class="brand-mark" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="brand-g" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color="#4F46E5"/>
                    <stop offset="0.6" stop-color="#7C3AED"/>
                    <stop offset="1" stop-color="#06B6D4"/>
                  </linearGradient>
                </defs>
                <rect width="32" height="32" rx="9" fill="url(#brand-g)"/>
                <path d="M7 9h13a3 3 0 0 1 3 3v1H10a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V19a1 1 0 1 1 2 0v4a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5v-11a5 5 0 0 1 2-4zM21 7a3 3 0 0 1 3 3v1h-3V7z" fill="#fff"/>
              </svg>
            </span>
            <span class="brand-text">
              <strong>TicketFlow</strong>
              <em>{{ 'APP.BRAND_SUBTITLE' | translate }}</em>
            </span>
          </a>
        </div>

        <div class="sidebar-scroll">
          <nav class="sidebar-nav" aria-label="Navigation principale">
            @for (item of visibleNavItems(); track item.route + item.labelKey) {
              <ng-template [ngIf]="item.labelKey === 'APP.NAV.TEAM_MANAGEMENT' || item.labelKey === 'APP.NAV.TEAM'" />
              <a
                class="nav-item"
                [routerLink]="item.route"
                routerLinkActive="is-active"
                [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
                (click)="drawerOpen.set(false)"
              >
                <span class="nav-icon-wrap" aria-hidden="true">
                  <app-icon [name]="item.icon" size="md" />
                </span>
                <span class="nav-label">{{ item.labelKey | translate }}</span>
              </a>
            }
          </nav>

          <hr class="sidebar__hr">

          <nav class="sidebar-footer-nav" aria-label="Liens secondaires">
            @for (item of footerItems(); track item.labelKey) {
              @if (item.action === 'notifications') {
                <button
                  type="button"
                  class="nav-item"
                  (click)="goToNotifications(); drawerOpen.set(false)"
                >
                  <span class="nav-icon-wrap" aria-hidden="true">
                    <app-icon [name]="item.icon" size="md" />
                  </span>
                  <span class="nav-label">{{ item.labelKey | translate }}</span>
                </button>
              } @else if (item.action === 'logout') {
                <button
                  type="button"
                  class="nav-item nav-item--danger"
                  (click)="onLogout()"
                >
                  <span class="nav-icon-wrap" aria-hidden="true">
                    <app-icon [name]="item.icon" size="md" />
                  </span>
                  <span class="nav-label">{{ item.labelKey | translate }}</span>
                </button>
              } @else {
                <a
                  class="nav-item"
                  [routerLink]="item.route"
                  routerLinkActive="is-active"
                  (click)="drawerOpen.set(false)"
                >
                  <span class="nav-icon-wrap" aria-hidden="true">
                    <app-icon [name]="item.icon" size="md" />
                  </span>
                  <span class="nav-label">{{ item.labelKey | translate }}</span>
                </a>
              }
            }
          </nav>
        </div>

        <div class="sidebar-foot">
          <app-icon name="shield" size="sm" aria-hidden="true" class="sidebar-foot__shield" />
          <span>{{ 'APP.FOOTER_SECURE' | translate }}</span>
        </div>
      </aside>

      <!-- DRAWER BACKDROP (mobile sidebar) -->
      <div
        class="drawer-backdrop"
        *ngIf="drawerOpen()"
        aria-hidden="true"
        (click)="drawerOpen.set(false)"
      ></div>
      <!-- MOBILE SIDEBAR — drawer left (<1024px) -->
      <aside class="sidebar sidebar--drawer" [class.open]="drawerOpen()" aria-label="Navigation du tableau de bord" role="navigation">
        <div class="sidebar-header sidebar-header--drawer">
          <a routerLink="/dashboard" class="brand-link" (click)="drawerOpen.set(false)">
            <span class="brand-mark" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <use href="#brand-g" />
                <rect width="32" height="32" rx="9" fill="url(#brand-g)"/>
                <path d="M7 9h13a3 3 0 0 1 3 3v1H10a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V19a1 1 0 1 1 2 0v4a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5v-11a5 5 0 0 1 2-4zM21 7a3 3 0 0 1 3 3v1h-3V7z" fill="#fff"/>
              </svg>
            </span>
            <span class="brand-text">
              <strong>TicketFlow</strong>
              <em>{{ 'APP.BRAND_SUBTITLE' | translate }}</em>
            </span>
          </a>
          <button type="button" class="drawer-close" (click)="drawerOpen.set(false)" aria-label="Fermer le menu">
            <app-icon name="close" size="md" aria-hidden="true" />
          </button>
        </div>

        <!-- Reused nav inside drawer -->
        <div class="sidebar-scroll">
          <nav class="sidebar-nav" aria-label="Navigation principale">
            @for (item of visibleNavItems(); track item.route + item.labelKey) {
              <a
                class="nav-item"
                [routerLink]="item.route"
                routerLinkActive="is-active"
                [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
                (click)="drawerOpen.set(false)"
              >
                <span class="nav-icon-wrap" aria-hidden="true">
                  <app-icon [name]="item.icon" size="md" />
                </span>
                <span class="nav-label">{{ item.labelKey | translate }}</span>
              </a>
            }
          </nav>
          <hr class="sidebar__hr">
          <nav class="sidebar-footer-nav" aria-label="Liens secondaires">
            @for (item of footerItems(); track item.labelKey) {
              @if (item.action === 'notifications') {
                <button type="button" class="nav-item" (click)="goToNotifications(); drawerOpen.set(false)">
                  <span class="nav-icon-wrap" aria-hidden="true"><app-icon [name]="item.icon" size="md" /></span>
                  <span class="nav-label">{{ item.labelKey | translate }}</span>
                </button>
              } @else if (item.action === 'logout') {
                <button type="button" class="nav-item nav-item--danger" (click)="onLogout()">
                  <span class="nav-icon-wrap" aria-hidden="true"><app-icon [name]="item.icon" size="md" /></span>
                  <span class="nav-label">{{ item.labelKey | translate }}</span>
                </button>
              } @else {
                <a
                  class="nav-item"
                  [routerLink]="item.route"
                  routerLinkActive="is-active"
                  (click)="drawerOpen.set(false)"
                >
                  <span class="nav-icon-wrap" aria-hidden="true"><app-icon [name]="item.icon" size="md" /></span>
                  <span class="nav-label">{{ item.labelKey | translate }}</span>
                </a>
              }
            }
          </nav>
        </div>
      </aside>

      <div class="dashboard-main">
        <!-- Unified HEADER (keep business search via toggleNotifications) -->
        <app-header-bar
          variant="dashboard"
          brandTitle="TicketFlow"
          brandSubtitle="Pilotage"
          searchPlaceholder="Rechercher un ticket, client, ID…"
          (toggleMobileDrawer)="drawerOpen.set(true)"
          (toggleNotifications)="onOpenNotifications()"
          (searchSubmit)="onHeaderSearch($event)"
        />

        <main id="dashboard-content" class="dashboard-content" role="main">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-layout {
      min-height: 100vh;
      display: flex;
      background: var(--surface-base);
      color: var(--text-primary);
      width: 100%;
      max-width: 100vw;
      overflow: hidden;
    }
    :host-context([dir="rtl"]) .dashboard-layout { flex-direction: row-reverse; }

    /* =========================================================
     * SIDEBAR (desktop persistent 1024+)
     * ========================================================= */
    .sidebar {
      width: var(--sidebar-width);
      max-width: 100vw;
      flex-shrink: 0;
      background: var(--surface);
      border-inline-end: 1px solid var(--border-default);
      display: flex;
      flex-direction: column;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow: hidden;
      z-index: var(--z-docked);
    }
    .sidebar-header {
      padding: var(--space-5) var(--space-5) var(--space-4);
      border-bottom: 1px solid var(--border-subtle);
    }
    .sidebar-header--drawer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding-inline: var(--space-4);
    }
    .brand-link {
      display: inline-flex;
      align-items: center;
      gap: var(--space-3);
      text-decoration: none;
      color: var(--text-primary);
      min-width: 0;
      flex: 1;
    }
    .brand-mark {
      width: 40px; height: 40px;
      border-radius: var(--radius-md);
      overflow: hidden;
      display: inline-flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      box-shadow: var(--shadow-sm);
    }
    .brand-text {
      display: inline-flex;
      flex-direction: column;
      line-height: 1.1;
      min-width: 0;
      strong {
        font-family: var(--font-display);
        font-size: var(--fs-lg);
        font-weight: var(--fw-bold);
        letter-spacing: -0.01em;
        color: var(--text-primary);
      }
      em {
        font-style: normal;
        font-size: var(--fs-xs);
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-top: 2px;
      }
    }
    .drawer-close {
      width: 40px; height: 40px;
      border-radius: var(--radius-md);
      background: transparent;
      border: 0;
      color: var(--text-secondary);
      display: inline-flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: background var(--transition-fast), color var(--transition-fast);
      flex-shrink: 0;
      &:hover { background: var(--surface-hover); color: var(--text-primary); }
      &:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
    }

    .sidebar-scroll {
      flex: 1 1 auto;
      overflow: auto;
      padding: var(--space-3);
      scrollbar-width: thin;
      scrollbar-color: var(--neutral-300) transparent;
    }
    :root[data-theme="dark"] .sidebar-scroll { scrollbar-color: var(--neutral-500) transparent; }

    .sidebar-nav, .sidebar-footer-nav {
      display: flex;
      flex-direction: column;
      gap: var(--space-05);
    }
    .sidebar__hr {
      margin: var(--space-3) var(--space-2);
      border: 0;
      height: 1px;
      background: var(--border-subtle);
    }

    .nav-item {
      display: inline-flex;
      align-items: center;
      gap: var(--space-3);
      width: 100%;
      min-height: 44px;
      padding: 0 var(--space-3);
      border-radius: var(--radius-lg);
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-secondary);
      text-decoration: none;
      text-align: start;
      font-family: var(--font-sans);
      font-size: var(--fs-sm);
      font-weight: var(--fw-medium);
      line-height: var(--lh-normal);
      cursor: pointer;
      position: relative;
      transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--dur-75) var(--ease-out);
      &:hover { background: var(--surface-hover); color: var(--text-primary); }
      &:active { transform: translateY(0); }
      &:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
    }
    .nav-item.is-active {
      background: var(--brand-50);
      color: var(--brand-700);
      font-weight: var(--fw-semibold);
      border-color: color-mix(in srgb, var(--brand-500) 16%, transparent);
    }
    :root[data-theme="dark"] .nav-item.is-active {
      background: color-mix(in srgb, var(--brand-500) 16%, transparent);
      color: var(--brand-600);
      border-color: color-mix(in srgb, var(--brand-500) 28%, transparent);
    }
    .nav-item--danger {
      color: var(--danger-600);
      &:hover { background: var(--danger-50); color: var(--danger-700); }
    }
    :root[data-theme="dark"] .nav-item--danger {
      color: var(--danger-400);
      &:hover { background: color-mix(in srgb, var(--danger-500) 14%, transparent); color: var(--danger-300); }
    }
    .nav-icon-wrap {
      width: 24px; height: 24px;
      flex-shrink: 0;
      display: inline-flex; align-items: center; justify-content: center;
      color: currentColor;
      .nav-item.is-active & { color: inherit; }
    }
    .nav-label {
      min-width: 0;
      flex: 1 1 auto;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .sidebar-foot {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-5);
      border-top: 1px solid var(--border-subtle);
      color: var(--text-muted);
      font-size: var(--fs-xs);
    }
    .sidebar-foot__shield { color: var(--success-500); }

    /* =========================================================
     * DRAWER MOBILE SIDEBAR (hidden on >= 1024, overlay on < 1024)
     * ========================================================= */
    .drawer-backdrop {
      position: fixed;
      inset: 0;
      background: var(--surface-overlay);
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
      z-index: calc(var(--z-drawer) - 1);
      animation: fade-in var(--transition-base) var(--ease-out);
    }
    .sidebar--drawer {
      display: none;
    }

    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

    /* =========================================================
     * MAIN + CONTENT
     * ========================================================= */
    .dashboard-main {
      flex: 1 1 0%;
      min-width: 0;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      max-width: 100%;
    }
    .dashboard-content {
      flex: 1 1 auto;
      width: 100%;
      padding: var(--space-6) var(--container-padding-x) var(--space-12);
      max-width: 100%;
      min-height: calc(100vh - var(--header-height));
    }
    @media (min-width: 1440px) {
      .dashboard-content { padding: var(--space-8) clamp(1.5rem, 3vw, 2rem) var(--space-16); }
    }

    /* =========================================================
     * RESPONSIVE
     * ========================================================= */
    @media (min-width: 1024px) {
      .drawer-backdrop { display: none !important; }
    }

    @media (max-width: 1023px) {
      .sidebar { position: sticky; z-index: var(--z-docked); }
      .sidebar:not(.sidebar--drawer) { display: none; }
      .sidebar--drawer {
        display: flex;
        position: fixed;
        top: 0; bottom: 0;
        inset-inline-start: calc(-1 * var(--sidebar-width) - 8px);
        z-index: var(--z-drawer);
        background: var(--surface-raised);
        transition: inset-inline-start var(--transition-slow) var(--ease-out), transform var(--transition-slow) var(--ease-out);
        box-shadow: var(--shadow-xl);
      }
      .sidebar--drawer.open {
        inset-inline-start: 0;
      }
      .dashboard-content { padding: var(--space-4) var(--space-4) var(--space-8); }
    }

    @media (prefers-reduced-motion: reduce) {
      .drawer-backdrop { animation: none; }
      .sidebar--drawer { transition: none; }
    }
  `]
})
export class DashboardLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly drawerOpen = signal(false);

  /** Mirrors original SidebarComponent.navItems logic — same items, same role gating. */
  readonly visibleNavItems = computed<SidebarLink[]>(() => {
    const user = this.authService.currentUser();
    const result: SidebarLink[] = [];

    for (const link of SIDEBAR_LINKS) {
      // Role filter
      if (link.role && user && !link.role.includes(user.role as any)) continue;
      result.push(link);
    }
    return result;
  });

  readonly footerItems = computed<SidebarLink[]>(() => SIDEBAR_FOOTER_LINKS);

  /* === Business actions (preserved from original SidebarComponent) === */
  goToNotifications(): void {
    this.router.navigate(['/dashboard']).then(() => {
      window.dispatchEvent(new CustomEvent('app:open-notifications'));
    });
  }

  onOpenNotifications(): void {
    window.dispatchEvent(new CustomEvent('app:open-notifications'));
  }

  onLogout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }

  onHeaderSearch(query: string): void {
    if (!query) return;
    /* No business change: try to go to tickets with query (non-breaking, best effort). */
    void this.router.navigate(['/tickets'], { queryParams: { q: query } }).catch(() => {});
  }
}
