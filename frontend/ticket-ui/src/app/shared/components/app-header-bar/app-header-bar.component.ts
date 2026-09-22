import { CommonModule } from '@angular/common';
import { Component, computed, effect, EventEmitter, inject, input, OnInit, Output, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { IconComponent, type IconName } from '../icon/icon.component';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService, type UserResponse } from '../../../core/services/auth.service';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher.component';

/* =========================================================================
 * AppHeaderBarComponent — Single unified visual header
 * Configurable via inputs; used by BOTH PublicShell AND DashboardLayout.
 * Visual variants: 'public' (no sidebar, customer app), 'dashboard' (staff)
 * ========================================================================= */
export type ShellVariant = 'public' | 'dashboard';

export interface NavItem {
  label: string;          // plain or translate pipe will use key
  translate?: boolean;    // if true, label is a translate key
  link?: string | null;   // routerLink
  icon: IconName;
  external?: boolean;
  roles?: Array<'CLIENT' | 'AGENT' | 'MANAGER' | 'ADMIN'>;
  action?: () => void;
  /** Group heading (sidebar only) — no link, non clickable */
  groupHeading?: string;
  divider?: boolean;
}

@Component({
  selector: 'app-header-bar',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent, LanguageSwitcherComponent],
  template: `
    <header class="app-header app-header--{{ variant() }}" role="banner" [class.app-header--scrolled]="scrolled()">
      <div class="app-header__row container-fluid">
        <!-- LEFT: sidebar toggle (dashboard) OR brand (public) -->
        <div class="app-header__left">
          @if (variant() === 'dashboard') {
            <button
              type="button"
              class="app-header__icon-btn visible-xs"
              (click)="toggleMobileDrawer.emit()"
              aria-label="Ouvrir le menu latéral"
            >
              <app-icon name="menu" size="md" aria-hidden="true" />
            </button>
          } @else {
            <button
              type="button"
              class="app-header__icon-btn visible-xs"
              (click)="toggleMobileDrawer.emit()"
              aria-label="Ouvrir le menu de navigation"
            >
              <app-icon name="menu" size="md" aria-hidden="true" />
            </button>
          }

          <a
            class="app-header__brand"
            [routerLink]="variant() === 'dashboard' ? '/dashboard' : '/'"
            (click)="menuOpen.set(false)"
            aria-label="Retour à l'accueil"
          >
            <span class="app-header__brand-mark" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="bg1" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color="#4F46E5"/>
                    <stop offset="0.6" stop-color="#7C3AED"/>
                    <stop offset="1" stop-color="#06B6D4"/>
                  </linearGradient>
                </defs>
                <rect x="1.5" y="1.5" width="29" height="29" rx="9" fill="url(#bg1)"/>
                <path d="M10 17a5 5 0 0 1 10 0v4a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-2 0v3a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-4z" fill="#fff"/>
                <circle cx="16" cy="12" r="1.8" fill="#fff"/>
              </svg>
            </span>
            <span class="app-header__brand-text">
              <span class="app-header__brand-title">{{ brandTitle() }}</span>
              @if (showSubtitle()) {
                <span class="app-header__brand-sub hidden-xs">{{ brandSubtitle() }}</span>
              }
            </span>
          </a>

          @if (variant() === 'public' && showDesktopNav()) {
            <nav class="app-header__nav" aria-label="Navigation principale" role="navigation">
              <ul class="app-header__nav-list">
                @for (item of publicNavItems(); track item.label) {
                  <li>
                    @if (item.divider) {
                      <span class="app-header__nav-divider" aria-hidden="true"></span>
                    } @else {
                      <a
                        class="app-header__nav-link"
                        [routerLink]="item.link || null"
                        routerLinkActive="is-active"
                        [routerLinkActiveOptions]="{ exact: item.link === '/' }"
                        (click)="menuOpen.set(false)"
                        [attr.aria-current]="null"
                      >
                        <span>{{ item.label }}</span>
                      </a>
                    }
                  </li>
                }
              </ul>
            </nav>
          }
        </div>

        <!-- RIGHT: actions -->
        <div class="app-header__right">
          <!-- SEARCH (dashboard only, desktop) -->
          @if (variant() === 'dashboard' && showDesktopNav()) {
            <div class="app-header__search hidden-md-only">
              <app-icon name="search" size="sm" aria-hidden="true" class="app-header__search-icon" />
              <input
                #searchInput
                type="search"
                class="app-header__search-input"
                [placeholder]="searchPlaceholder()"
                (keyup.enter)="onSearchSubmit(searchInput.value)"
                (search)="onSearchSubmit(searchInput.value)"
                aria-label="Rechercher"
              />
              <kbd class="app-header__search-kbd hidden-xs">⏎</kbd>
            </div>
          }

          <div class="app-header__actions">
            @if (variant() === 'dashboard' && showNotificationsBell()) {
              <button
                type="button"
                class="app-header__icon-btn app-header__icon-btn--badge"
                aria-label="Notifications"
                (click)="toggleNotifications.emit()"
              >
                <app-icon name="bell" size="md" aria-hidden="true" />
                <span class="app-header__dot" aria-hidden="true"></span>
              </button>
            }

            <app-language-switcher variant="dashboard" class="hidden-xs" />

            <button
              type="button"
              class="app-header__icon-btn"
              (click)="toggleTheme()"
              [attr.aria-label]="themeService.isDark() ? 'Passer au thème clair' : 'Passer au thème sombre'"
              title="Basculer le thème"
            >
              <app-icon [name]="themeService.isDark() ? 'sun' : 'moon'" size="md" aria-hidden="true" />
            </button>

            <!-- AUTH STATE -->
            @if (user()) {
              <!-- LOGGED IN : USER MENU -->
              <div class="app-header__user-menu" [class.open]="menuOpen()">
                <button
                  type="button"
                  class="app-header__user-btn"
                  (click)="menuOpen.update(v => !v)"
                  [attr.aria-expanded]="menuOpen()"
                  aria-haspopup="menu"
                  aria-label="Menu utilisateur"
                >
                  <span class="app-header__avatar" aria-hidden="true">
                    {{ initials(user()) }}
                  </span>
                  <div class="app-header__user-text hidden-xs">
                    <span class="app-header__user-name">{{ user()?.fullName || user()?.username || 'Utilisateur' }}</span>
                    <span class="app-header__user-role">{{ roleLabel(user()) }}</span>
                  </div>
                  <app-icon name="chevron-down" size="xs" aria-hidden="true" class="app-header__user-chevron hidden-xs" />
                </button>

                <div
                  class="app-header__dropdown"
                  role="menu"
                  *ngIf="menuOpen()"
                >
                  <div class="app-header__dropdown-head">
                    <span class="app-header__avatar app-header__avatar--lg" aria-hidden="true">
                      {{ initials(user()) }}
                    </span>
                    <div class="app-header__dropdown-head-text">
                      <strong class="app-header__dropdown-name">
                        {{ user()?.fullName || user()?.username || 'Utilisateur' }}
                      </strong>
                      <small class="app-header__dropdown-email">{{ roleLabel(user()) }}</small>
                      @if (user()?.email) {
                        <small class="app-header__dropdown-email">{{ user()?.email }}</small>
                      }
                    </div>
                  </div>

                  <hr class="app-header__dropdown-divider">

                  <ul class="app-header__dropdown-list">
                    @if (variant() === 'dashboard') {
                      <li>
                        <button type="button" class="app-header__dropdown-item" routerLink="/settings" (click)="menuOpen.set(false)" role="menuitem">
                          <app-icon name="settings" size="sm" aria-hidden="true" />
                          <span>Paramètres</span>
                        </button>
                      </li>
                      <li>
                        <button type="button" class="app-header__dropdown-item" routerLink="/analytics" (click)="menuOpen.set(false)" role="menuitem" *ngIf="isStaff()">
                          <app-icon name="chart-line" size="sm" aria-hidden="true" />
                          <span>Analytique</span>
                        </button>
                      </li>
                      <hr class="app-header__dropdown-divider">
                    } @else {
                      <li>
                        <button type="button" class="app-header__dropdown-item" routerLink="/chat" (click)="menuOpen.set(false)" role="menuitem">
                          <app-icon name="chat-bubble" size="sm" aria-hidden="true" />
                          <span>Discussions</span>
                        </button>
                      </li>
                      <li>
                        <button type="button" class="app-header__dropdown-item" routerLink="/historique" (click)="menuOpen.set(false)" role="menuitem">
                          <app-icon name="history" size="sm" aria-hidden="true" />
                          <span>Historique</span>
                        </button>
                      </li>
                      <hr class="app-header__dropdown-divider">
                    }
                    <li>
                      <button type="button" class="app-header__dropdown-item app-header__dropdown-item--danger" (click)="onLogout()" role="menuitem">
                        <app-icon name="logout" size="sm" aria-hidden="true" />
                        <span>Se déconnecter</span>
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            } @else {
              <!-- LOGGED OUT : LOGIN BUTTON -->
              <a
                type="button"
                class="app-header__btn-login"
                routerLink="/login"
                routerLinkActive="is-active"
              >
                <app-icon name="login" size="sm" aria-hidden="true" />
                <span>Se connecter</span>
              </a>
            }
          </div>
        </div>
      </div>
    </header>

    <!-- FOCUS GUARD: overlay to close dropdown -->
    <div
      class="app-header__overlay"
      *ngIf="menuOpen()"
      (click)="menuOpen.set(false)"
      aria-hidden="true"
    ></div>
  `,
  styles: [`
    /* ===== BASE ===== */
    :host { display: block; position: sticky; top: 0; z-index: var(--z-header); }

    .app-header {
      position: sticky;
      top: 0;
      z-index: var(--z-header);
      background: color-mix(in srgb, var(--surface) 82%, transparent);
      backdrop-filter: saturate(180%) blur(14px);
      -webkit-backdrop-filter: saturate(180%) blur(14px);
      border-bottom: 1px solid var(--border-subtle);
      transition: box-shadow var(--transition-base), background var(--transition-base);
    }
    .app-header--scrolled { box-shadow: var(--shadow-sm); }
    :root[data-theme="dark"] .app-header { background: color-mix(in srgb, var(--surface) 88%, transparent); }

    .app-header__row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      height: var(--header-height);
      max-width: 100%;
    }
    @media (min-width: 1024px) { .app-header__row { height: var(--header-height-lg); } }

    .app-header__left, .app-header__right {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      min-width: 0;
    }
    .app-header__right { justify-content: flex-end; flex: 1; }

    /* ===== BRAND ===== */
    .app-header__brand {
      display: inline-flex;
      align-items: center;
      gap: var(--space-3);
      min-width: 0;
      text-decoration: none;
      color: var(--text-primary);
    }
    .app-header__brand-mark {
      width: 36px; height: 36px;
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: var(--radius-md);
      overflow: hidden;
      flex-shrink: 0;
      box-shadow: var(--shadow-sm);
    }
    .app-header__brand-text { display: flex; flex-direction: column; line-height: 1.1; min-width: 0; }
    .app-header__brand-title {
      font-family: var(--font-display);
      font-size: var(--fs-lg);
      font-weight: var(--fw-bold);
      letter-spacing: -0.02em;
      color: var(--text-primary);
      white-space: nowrap;
    }
    .app-header__brand-subtitle {
      font-size: var(--fs-xs);
      font-weight: var(--fw-medium);
      color: var(--text-muted);
      letter-spacing: 0.02em;
      text-transform: uppercase;
      margin-top: 1px;
    }

    /* ===== NAV (Public only) ===== */
    .app-header__nav {
      margin-left: var(--space-6);
      display: inline-flex;
    }
    .app-header__nav-list {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
    }
    .app-header__nav-link {
      display: inline-flex;
      align-items: center;
      height: 40px;
      padding: 0 var(--space-3);
      border-radius: var(--radius-md);
      font-size: var(--fs-sm);
      font-weight: var(--fw-medium);
      color: var(--text-secondary);
      white-space: nowrap;
      cursor: pointer;
      position: relative;
      transition: background var(--transition-fast), color var(--transition-fast);
      &:hover { color: var(--text-primary); background: var(--surface-hover); }
    }
    .app-header__nav-link.is-active {
      color: var(--brand-600);
      background: var(--brand-50);
      font-weight: var(--fw-semibold);
    }
    :root[data-theme="dark"] .app-header__nav-link.is-active {
      color: var(--brand-500);
      background: color-mix(in srgb, var(--brand-500) 14%, transparent);
    }

    /* ===== ICON BUTTONS ===== */
    .app-header__icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px; height: 40px;
      border-radius: var(--radius-md);
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-secondary);
      cursor: pointer;
      position: relative;
      flex-shrink: 0;
      transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
      &:hover { color: var(--text-primary); background: var(--surface-hover); }
      &:focus-visible { outline: none; box-shadow: var(--shadow-focus); color: var(--text-primary); }
    }
    .app-header__icon-btn--badge .app-header__dot {
      position: absolute;
      top: 10px; right: 10px;
      width: 8px; height: 8px;
      border-radius: var(--radius-full);
      background: var(--danger-500);
      box-shadow: 0 0 0 2px var(--surface);
    }
    @media (min-width: 1024px) {
      .app-header__icon-btn { width: 42px; height: 42px; }
    }

    /* ===== SEARCH (Dashboard only) ===== */
    .app-header__search {
      position: relative;
      display: inline-flex;
      align-items: center;
      min-width: 280px;
      max-width: 440px;
      width: 100%;
      flex: 1 1 0;
      height: 42px;
      padding-inline: var(--space-3);
      gap: var(--space-2);
      background: var(--surface-subtle);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-lg);
      transition: border-color var(--transition-fast), background var(--transition-fast), box-shadow var(--transition-fast);
      &:focus-within {
        background: var(--surface);
        border-color: var(--brand-500);
        box-shadow: var(--shadow-focus);
      }
    }
    .app-header__search-icon { color: var(--text-muted); flex-shrink: 0; }
    .app-header__search-input {
      flex: 1 1 auto; min-width: 0; height: 100%;
      background: transparent; border: 0; outline: none;
      font-size: var(--fs-sm); color: var(--text-primary);
      &::placeholder { color: var(--text-muted); }
    }
    .app-header__search-kbd {
      font-family: var(--font-mono);
      font-size: 10px;
      line-height: 1;
      padding: 4px 6px;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      color: var(--text-muted);
      background: var(--surface);
    }

    /* ===== ACTIONS GROUP ===== */
    .app-header__actions {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      flex-shrink: 0;
    }

    /* ===== LOGIN BUTTON (Logged out) ===== */
    .app-header__btn-login {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      height: 42px;
      padding: 0 var(--space-4);
      border-radius: var(--radius-md);
      background: var(--gradient-brand-strong);
      color: #fff;
      font-weight: var(--fw-semibold);
      font-size: var(--fs-sm);
      text-decoration: none;
      box-shadow: 0 2px 8px rgba(99,102,241,0.24), inset 0 1px 0 rgba(255,255,255,0.15);
      transition: transform var(--dur-150) var(--ease-out), box-shadow var(--transition-fast);
      white-space: nowrap;
      &:hover { color: #fff; transform: translateY(-1px); box-shadow: 0 6px 18px rgba(99,102,241,0.34); }
      &:focus-visible { outline: none; box-shadow: var(--shadow-focus), 0 2px 8px rgba(99,102,241,0.24); }
    }
    @media (min-width: 1024px) {
      .app-header__btn-login { height: 44px; padding: 0 var(--space-5); }
    }

    /* ===== USER MENU (Logged in) ===== */
    .app-header__user-menu { position: relative; display: inline-flex; }
    .app-header__user-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      height: 42px;
      padding: 3px var(--space-2) 3px 3px;
      border-radius: var(--radius-full);
      background: var(--surface-subtle);
      border: 1px solid var(--border-default);
      cursor: pointer;
      color: var(--text-primary);
      transition: background var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
      &:hover { background: var(--surface-hover); border-color: var(--border-strong); }
      &:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
    }
    @media (min-width: 1024px) { .app-header__user-btn { height: 44px; padding: 4px var(--space-2) 4px 4px; } }

    .app-header__avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px; height: 34px;
      border-radius: var(--radius-full);
      background: var(--gradient-brand);
      color: #fff;
      font-family: var(--font-display);
      font-size: var(--fs-sm);
      font-weight: var(--fw-bold);
      letter-spacing: 0.02em;
      flex-shrink: 0;
      overflow: hidden;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.15);
    }
    .app-header__avatar--lg { width: 48px; height: 48px; font-size: var(--fs-base); }

    .app-header__user-text { display: inline-flex; flex-direction: column; align-items: flex-start; line-height: 1.1; padding-right: 2px; }
    .app-header__user-name { font-size: var(--fs-sm); font-weight: var(--fw-semibold); color: var(--text-primary); max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .app-header__user-role { font-size: var(--fs-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-top: 1px; }
    .app-header__user-chevron { color: var(--text-muted); }

    /* ===== DROPDOWN ===== */
    .app-header__overlay {
      position: fixed;
      inset: 0;
      z-index: calc(var(--z-dropdown) - 1);
      background: transparent;
    }

    .app-header__dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: min(320px, calc(100vw - 32px));
      background: var(--surface-raised);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-lg);
      z-index: var(--z-dropdown);
      overflow: hidden;
      padding: var(--space-2);
      animation: header-popover var(--transition-base) var(--ease-out);
    }
    @keyframes header-popover {
      from { opacity: 0; transform: translateY(-4px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @media (prefers-reduced-motion: reduce) { .app-header__dropdown { animation: none; } }

    .app-header__dropdown-head {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3);
      border-radius: var(--radius-lg);
      background: var(--surface-subtle);
    }
    .app-header__dropdown-head-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .app-header__dropdown-name {
      font-family: var(--font-sans);
      font-size: var(--fs-base);
      font-weight: var(--fw-semibold);
      color: var(--text-primary);
    }
    .app-header__dropdown-email {
      font-size: var(--fs-xs);
      color: var(--text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .app-header__dropdown-divider {
      margin: var(--space-2) var(--space-1);
      border: 0;
      height: 1px;
      background: var(--border-subtle);
    }

    .app-header__dropdown-list { display: flex; flex-direction: column; }
    .app-header__dropdown-item {
      display: inline-flex;
      align-items: center;
      gap: var(--space-3);
      width: 100%;
      height: 42px;
      padding: 0 var(--space-3);
      border-radius: var(--radius-md);
      background: transparent;
      border: 0;
      color: var(--text-primary);
      text-align: left;
      font-family: var(--font-sans);
      font-size: var(--fs-sm);
      font-weight: var(--fw-medium);
      cursor: pointer;
      transition: background var(--transition-fast), color var(--transition-fast);
      &:hover { background: var(--surface-hover); }
      &:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
    }
    .app-header__dropdown-item--danger {
      color: var(--danger-600);
      font-weight: var(--fw-semibold);
      &:hover { background: var(--danger-50); color: var(--danger-700); }
    }
    :root[data-theme="dark"] .app-header__dropdown-item--danger {
      color: var(--danger-400);
      &:hover { background: color-mix(in srgb, var(--danger-500) 14%, transparent); color: var(--danger-300); }
    }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 767px) {
      .app-header__row { gap: var(--space-2); height: 60px; }
      .app-header__brand-mark { width: 32px; height: 32px; }
      .app-header__brand-title { font-size: var(--fs-base); }
    }
    @media (max-width: 380px) {
      .app-header__btn-login span { display: none; }
      .app-header__btn-login { padding: 0 var(--space-3); }
    }
  `]
})
export class AppHeaderBarComponent implements OnInit {
  readonly variant = input<ShellVariant>('public');
  readonly brandTitle = input<string>('Assistant IA RAG');
  readonly brandSubtitle = input<string>('Triage');
  readonly searchPlaceholder = input<string>('Rechercher…');
  readonly publicNavItems = input<NavItem[]>([]);
  readonly showNotificationsBell = input(true, { transform: (v: any) => v !== false });

  @Output() readonly toggleMobileDrawer = new EventEmitter<void>();
  @Output() readonly toggleNotifications = new EventEmitter<void>();
  @Output() readonly searchSubmit = new EventEmitter<string>();

  readonly auth = inject(AuthService);
  readonly themeService = inject(ThemeService);
  readonly translate = inject(TranslateService);

  readonly user = computed(() => this.auth.currentUser());
  readonly menuOpen = signal(false);
  readonly scrolled = signal(false);

  readonly showDesktopNav = computed(() => true); /* used to hide nav in desktop if needed */
  readonly showSubtitle = computed(() => this.variant() === 'dashboard');
  readonly isStaff = computed(() => {
    const u = this.user();
    return !!u && (u.role === 'AGENT' || u.role === 'MANAGER' || u.role === 'ADMIN');
  });

  ngOnInit(): void {
    if (typeof window === 'undefined') return;
    const onScroll = () => this.scrolled.set(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  onLogout(): void {
    this.menuOpen.set(false);
    this.auth.logout();
  }

  onSearchSubmit(value: string): void {
    this.searchSubmit.emit((value || '').trim());
  }

  initials(user: UserResponse | null | undefined): string {
    if (!user) return '??';
    const fromFull = (user.fullName || user.username || 'U').trim();
    const parts = fromFull.split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.map(p => p.charAt(0).toUpperCase()).join('') || fromFull.charAt(0).toUpperCase();
  }

  roleLabel(user: UserResponse | null | undefined): string {
    if (!user?.role) return 'Invité';
    switch (user.role) {
      case 'ADMIN':   return 'Administrateur';
      case 'MANAGER': return 'Manager';
      case 'AGENT':   return 'Agent support';
      case 'CLIENT':  return 'Client';
      default:        return user.role;
    }
  }
}
