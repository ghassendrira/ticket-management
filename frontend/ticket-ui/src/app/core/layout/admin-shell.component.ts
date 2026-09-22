import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { ThemeService } from '../services/theme.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    path: '/admin/dashboard',
    label: 'Tableau de bord',
    icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z'
  },
  {
    path: '/admin/documents',
    label: 'Documents',
    icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8 13h8v1H8v-1zm0 3h8v1H8v-1zm0-6h4v1H8v-1z'
  },
  {
    path: '/admin/analytics',
    label: 'Analytiques IA',
    icon: 'M16 6l2.29 2.29l-4.88 4.88l-4-4L2 16.59L3.41 18l6-6l4 4l6.3-6.29L22 12V6z'
  },
  {
    path: '/admin/categories',
    label: 'Categories',
    icon: 'M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2s-.9-2-2-2zM1 2v2h2l3.6 7.59l-1.35 2.44c-.16.28-.25.61-.25.97a2 2 0 0 0 2 2h12v-2H7.42a.25.25 0 0 1-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2s2-.9 2-2s-.9-2-2-2z'
  }
];

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="admin-layout" [class.mobile-open]="mobileMenuOpen()">
      <aside class="sidebar" [attr.aria-hidden]="!isDesktop() && !mobileMenuOpen()">
        <div class="sidebar-header">
          <div class="brand">
            <div class="brand-logo">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L2 7l10 5l10-5l-10-5z"></path>
                <path d="M2 17l10 5l10-5"></path>
                <path d="M2 12l10 5l10-5"></path>
              </svg>
            </div>
            <div class="brand-text">
              <span class="brand-name fw-semibold">RAG Admin</span>
              <span class="brand-sub fs-xs muted">Console IA</span>
            </div>
          </div>
        </div>

        <nav class="sidebar-nav" aria-label="Navigation principale">
          <span class="nav-title fs-xs text-muted fw-semibold">MENU</span>
          <a
            *ngFor="let item of navItems"
            routerLink="{{ item.path }}"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: item.path === '/admin/dashboard' }"
            class="nav-item"
            (click)="onNavClick()"
          >
            <span class="nav-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path [attr.d]="item.icon"></path>
              </svg>
            </span>
            <span class="nav-label">{{ item.label }}</span>
            <span class="nav-indicator"></span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <button class="theme-toggle-btn" type="button" (click)="toggleTheme()" aria-label="Basculer le theme">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path [attr.d]="isDarkTheme() ? lightIconPath : darkIconPath"></path>
            </svg>
            <span>{{ isDarkTheme() ? 'Theme sombre' : 'Theme clair' }}</span>
          </button>

          <div class="user-block">
            <div class="user-avatar">
              <span>A</span>
            </div>
            <div class="user-info">
              <span class="user-name fw-medium fs-sm">Administrateur</span>
              <button class="logout-link fs-xs" type="button" (click)="logout()">
                Se deconnecter
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div class="sidebar-overlay" *ngIf="mobileMenuOpen() && !isDesktop()" (click)="closeMobileMenu()"></div>

      <div class="main-area">
        <header class="topbar">
          <button
            class="mobile-menu-btn btn-icon"
            type="button"
            (click)="toggleMobileMenu()"
            aria-label="Ouvrir le menu"
            aria-expanded="mobileMenuOpen()"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          <div class="topbar-title-group">
            <h1 class="topbar-title fw-semibold">Console d'administration</h1>
            <span class="topbar-sub muted fs-sm">Pilotage du systeme RAG et assistance IA</span>
          </div>

          <div class="topbar-actions">
            <span class="pill status-pill">
              <span class="live-dot"></span>
              Systeme operationnel
            </span>

            <button
              class="theme-toggle-icon btn-icon"
              type="button"
              (click)="toggleTheme()"
              aria-label="Basculer le theme"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path [attr.d]="isDarkTheme() ? lightIconPath : darkIconPath"></path>
              </svg>
            </button>
          </div>
        </header>

        <main class="content-area">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      .admin-layout {
        min-height: 100vh;
        background: var(--bg-page);
        display: grid;
        grid-template-columns: var(--sidebar-width) 1fr;
        transition: grid-template-columns var(--transition-base);
      }

      .sidebar {
        position: sticky;
        top: 0;
        height: 100vh;
        background: var(--bg-card);
        border-right: 1px solid var(--border-color);
        display: flex;
        flex-direction: column;
        z-index: 40;
      }

      .sidebar-header {
        padding: var(--spacing-5) var(--spacing-5) var(--spacing-4);
        border-bottom: 1px solid var(--border-color);
      }

      .brand {
        display: flex;
        align-items: center;
        gap: var(--spacing-3);
      }

      .brand-logo {
        width: 40px;
        height: 40px;
        display: grid;
        place-items: center;
        border-radius: var(--radius-lg);
        background: var(--gradient-primary);
        color: white;
        box-shadow: var(--shadow-primary);
      }

      .brand-text {
        display: flex;
        flex-direction: column;
        line-height: 1.1;
      }

      .brand-name {
        font-size: 1rem;
        color: var(--text-primary);
      }

      .brand-sub {
        letter-spacing: 0.02em;
      }

      .sidebar-nav {
        padding: var(--spacing-5) var(--spacing-4);
        display: grid;
        gap: var(--spacing-1);
        flex: 1;
        align-content: start;
      }

      .nav-title {
        padding: 0 var(--spacing-3) var(--spacing-3);
        letter-spacing: 0.08em;
      }

      .nav-item {
        display: flex;
        align-items: center;
        gap: var(--spacing-3);
        padding: var(--spacing-3) var(--spacing-3);
        border-radius: var(--radius-lg);
        color: var(--text-secondary);
        font-size: 0.9rem;
        font-weight: 500;
        position: relative;
        transition: all var(--transition-fast);
      }

      .nav-item:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
      }

      .nav-item.active {
        background: var(--primary-100);
        color: var(--primary);
        font-weight: 600;
      }

      .nav-icon {
        display: grid;
        place-items: center;
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }

      .nav-indicator {
        position: absolute;
        left: -16px;
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 24px;
        border-radius: 0 var(--radius-full) var(--radius-full) 0;
        background: transparent;
        transition: background var(--transition-base);
      }

      .nav-item.active .nav-indicator {
        background: var(--primary);
      }

      .sidebar-footer {
        padding: var(--spacing-4);
        border-top: 1px solid var(--border-color);
        display: grid;
        gap: var(--spacing-4);
      }

      .theme-toggle-btn {
        display: flex;
        align-items: center;
        gap: var(--spacing-3);
        padding: var(--spacing-3);
        border-radius: var(--radius-lg);
        background: var(--bg-muted);
        color: var(--text-secondary);
        font-size: 0.85rem;
        font-weight: 500;
        width: 100%;
        transition: all var(--transition-fast);
        border: 1px solid transparent;
      }

      .theme-toggle-btn:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
        border-color: var(--border-color);
      }

      .user-block {
        display: flex;
        align-items: center;
        gap: var(--spacing-3);
        padding: var(--spacing-3);
      }

      .user-avatar {
        width: 38px;
        height: 38px;
        display: grid;
        place-items: center;
        border-radius: var(--radius-full);
        background: var(--gradient-primary);
        color: white;
        font-weight: 700;
        font-size: 0.95rem;
        flex-shrink: 0;
      }

      .user-info {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .user-name {
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .logout-link {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: var(--danger);
        background: none;
        border: none;
        padding: 2px 0;
        cursor: pointer;
        font-weight: 500;
        transition: opacity var(--transition-fast);
      }

      .logout-link:hover { opacity: 0.8; }

      .main-area {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .topbar {
        position: sticky;
        top: 0;
        z-index: 30;
        display: flex;
        align-items: center;
        gap: var(--spacing-4);
        padding: var(--spacing-4) var(--spacing-6);
        background: color-mix(in srgb, var(--bg-page) 85%, transparent);
        border-bottom: 1px solid var(--border-color);
        backdrop-filter: blur(12px);
        min-height: var(--topbar-height);
      }

      .mobile-menu-btn { display: none; }

      .topbar-title-group {
        display: flex;
        flex-direction: column;
        line-height: 1.2;
        flex: 1;
        min-width: 0;
      }

      .topbar-title {
        font-size: 1rem;
        margin: 0;
      }

      .topbar-actions {
        display: flex;
        align-items: center;
        gap: var(--spacing-3);
      }

      .status-pill {
        background: var(--accent-100);
        color: var(--accent);
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-2);
      }

      .live-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: currentColor;
        animation: pulse-ring 2s infinite;
        position: relative;
      }

      .theme-toggle-icon { display: none; }

      .content-area {
        flex: 1;
        padding: var(--spacing-8) var(--spacing-6);
      }

      .sidebar-overlay {
        display: none;
      }

      @media (max-width: 1024px) {
        .admin-layout {
          grid-template-columns: 1fr;
        }

        .sidebar {
          position: fixed;
          inset: 0 auto 0 0;
          width: var(--sidebar-width);
          transform: translateX(-100%);
          transition: transform var(--transition-base);
          box-shadow: var(--shadow-xl);
        }

        .admin-layout.mobile-open .sidebar {
          transform: translateX(0);
        }

        .sidebar-overlay {
          display: block;
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.5);
          z-index: 35;
          backdrop-filter: blur(2px);
          animation: fadeIn var(--transition-fast);
        }

        .mobile-menu-btn { display: inline-flex; }
        .theme-toggle-icon { display: inline-flex; }
        .theme-toggle-btn { display: none; }

        .content-area {
          padding: var(--spacing-6) var(--spacing-4);
        }

        .topbar {
          padding: var(--spacing-3) var(--spacing-4);
        }
      }

      @media (max-width: 640px) {
        .topbar-sub { display: none; }
        .status-pill { display: none; }
      }
    `
  ]
})
export class AdminShellComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);

  protected readonly navItems = NAV_ITEMS;
  protected readonly isDarkTheme = this.themeService.isDark;
  protected readonly darkIconPath = 'M21 12.79A9 9 0 1 1 11.21 3A7 7 0 0 0 21 12.79z';
  protected readonly lightIconPath =
    'M12 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1zm6.36 2.64a1 1 0 0 1 1.41 1.41l-.7.7a1 1 0 1 1-1.41-1.41l.7-.7zM12 7a5 5 0 1 1 0 10a5 5 0 0 1 0-10zm9 4a1 1 0 1 1 0 2h-1a1 1 0 1 1 0-2h1zm-4.64 6.36.7.7a1 1 0 0 1-1.41 1.41l-.7-.7a1 1 0 1 1 1.41-1.41zM12 19a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1zm-4.95-1.64a1 1 0 0 1 0 1.41l-.7.7a1 1 0 1 1-1.41-1.41l.7-.7a1 1 0 0 1 1.41 0zM5 11a1 1 0 1 1 0 2H4a1 1 0 1 1 0-2h1zm2.05-5.36.7.7A1 1 0 0 1 6.34 7.75l-.7-.7a1 1 0 0 1 1.41-1.41z';

  readonly mobileMenuOpen = signal(false);
  readonly isDesktop = signal(window.innerWidth > 1024);

  @HostListener('window:resize')
  onResize() {
    this.isDesktop.set(window.innerWidth > 1024);
    if (this.isDesktop()) {
      this.mobileMenuOpen.set(false);
    }
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.set(!this.mobileMenuOpen());
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  onNavClick(): void {
    if (!this.isDesktop()) {
      this.mobileMenuOpen.set(false);
    }
  }

  logout(): void {
    this.authService.logoutAdmin();
    void this.router.navigate(['/']);
  }

  protected toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
