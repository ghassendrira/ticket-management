import { Component, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService, Notification } from '../../../core/services/notification.service';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { LanguageSwitcherComponent } from '../../../shared/components/language-switcher/language-switcher.component';

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RelativeTimePipe, LanguageSwitcherComponent, TranslatePipe],
  template: `
    <header class="header">
      <div class="header-left">
        <nav class="header-nav">
          @for (item of navItems; track item.route) {
            <a 
              [routerLink]="item.route"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
              class="header-nav-item"
            >
              {{ item.label | translate }}
            </a>
          }
        </nav>
      </div>

      <div class="header-right">
        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input 
            type="text" 
            class="search-input" 
            [placeholder]="'DASHBOARD.SEARCH_PLACEHOLDER' | translate"
          >
        </div>
        <app-language-switcher variant="dashboard" />
        <button class="header-btn" (click)="themeService.toggleTheme()" aria-label="Toggle theme">
          @if (themeService.currentTheme() === 'dark') {
            ☀️
          } @else {
            🌙
          }
        </button>
        <div class="notification-wrapper">
          <button 
            class="header-btn notification-btn" 
            aria-label="Notifications"
            (click)="notificationService.toggleOpen()"
          >
            🔔
            @if (notificationService.unreadCount() > 0) {
              <span class="notification-badge">{{ notificationService.unreadCount() }}</span>
            }
          </button>
          @if (notificationService.isOpen()) {
            <div class="notification-dropdown">
              <div class="dropdown-header">
                <h3 class="dropdown-title">{{ 'HEADER.NOTIFICATIONS_TITLE' | translate }}</h3>
                @if (notificationService.unreadCount() > 0) {
                  <button class="mark-all-btn" (click)="notificationService.markAllAsRead()">
                    {{ 'HEADER.NOTIFICATIONS_MARK_READ' | translate }}
                  </button>
                }
              </div>
              <div class="dropdown-content">
                @for (notification of notificationService.notifications(); track notification.id) {
                  <div 
                    class="notification-item"
                    [class.unread]="!notification.isRead"
                    (click)="notificationService.handleNotificationClick(notification)"
                  >
                    <div class="notification-content">
                      <div class="notification-title">{{ notification.title }}</div>
                      <div class="notification-message">{{ notification.message }}</div>
                      <div class="notification-time">{{ notification.createdAt | relativeTime }}</div>
                    </div>
                    @if (!notification.isRead) {
                      <div class="unread-dot"></div>
                    }
                  </div>
                } @empty {
                  <div class="empty-state">{{ 'HEADER.NOTIFICATIONS_EMPTY' | translate }}</div>
                }
              </div>
            </div>
          }
        </div>
        <div class="user-profile">
          <div class="user-avatar">{{ avatarInitial() }}</div>
          <div class="user-info">
            <span class="user-name">{{ displayName() }}</span>
            <span class="user-role">{{ displayRole() }}</span>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .header {
      background-color: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 16px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 32px;
    }

    .header-nav {
      display: flex;
      gap: 8px;
    }

    .header-nav-item {
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-secondary);
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .header-nav-item:hover {
      color: var(--text-primary);
    }

    .header-nav-item.active {
      background-color: var(--bg-secondary);
      color: var(--text-primary);
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .search-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      background-color: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding-block: 10px;
      padding-inline: 16px;
      transition: all 0.2s ease;
    }

    .search-bar:focus-within {
      border-color: var(--accent-violet);
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    }

    .search-icon {
      font-size: 16px;
      color: var(--text-secondary);
    }

    .search-input {
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-primary);
      font-size: 14px;
      width: 240px;
      font-family: inherit;
      text-align: start;
    }

    .search-input::placeholder {
      color: var(--text-secondary);
    }

    .header-btn {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background-color: transparent;
      color: var(--text-primary);
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .header-btn:hover {
      background-color: var(--bg-secondary);
    }

    .notification-wrapper {
      position: relative;
    }

    .notification-btn {
      position: relative;
    }

    .notification-badge {
      position: absolute;
      top: -4px;
      inset-inline-end: -4px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background-color: #EF4444;
      color: white;
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .notification-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      inset-inline-end: 0;
      width: 380px;
      max-height: 480px;
      background-color: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .dropdown-header {
      padding: 16px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .dropdown-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .mark-all-btn {
      font-size: 12px;
      color: var(--accent-violet);
      background: none;
      border: none;
      cursor: pointer;
      font-weight: 500;
    }

    .mark-all-btn:hover {
      text-decoration: underline;
    }

    .dropdown-content {
      overflow-y: auto;
      flex: 1;
    }

    .notification-item {
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .notification-item:hover {
      background-color: var(--bg-secondary);
    }

    .notification-item.unread {
      background-color: rgba(139, 92, 246, 0.05);
    }

    .notification-content {
      flex: 1;
    }

    .notification-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .notification-message {
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 8px;
      line-height: 1.4;
    }

    .notification-time {
      font-size: 12px;
      color: var(--text-muted);
    }

    .unread-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--accent-violet);
      flex-shrink: 0;
      margin-top: 6px;
    }

    .empty-state {
      padding: 48px 16px;
      text-align: center;
      color: var(--text-secondary);
      font-size: 14px;
    }

    .user-profile {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--accent-violet), var(--accent-cyan));
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      text-align: start;
    }

    :host-context([dir="rtl"]) .header {
      flex-direction: row-reverse;
    }

    :host-context([dir="rtl"]) .header-right,
    :host-context([dir="rtl"]) .search-bar,
    :host-context([dir="rtl"]) .user-profile,
    :host-context([dir="rtl"]) .notification-item {
      flex-direction: row-reverse;
    }

    .user-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .user-role {
      font-size: 12px;
      color: var(--text-secondary);
    }

    @media (max-width: 1200px) {
      .search-input {
        width: 160px;
      }
    }

    @media (max-width: 980px) {
      .header {
        padding: 16px;
      }

      .header-nav {
        display: none;
      }

      .search-input {
        width: 120px;
      }
    }

    @media (max-width: 640px) {
      .search-bar {
        display: none;
      }
      .notification-dropdown {
        width: 320px;
      }
    }
  `]
})
export class HeaderComponent {
  themeService = inject(ThemeService);
  authService = inject(AuthService);
  notificationService = inject(NotificationService);

  navItems = [
    { label: 'Overview', route: '/dashboard' },
    { label: 'Tickets', route: '/tickets' },
    { label: 'Teams', route: '/team' },
    { label: 'Analytics', route: '/analytics' },
    { label: 'AI Assistant', route: '/ai' }
  ];

  avatarInitial = computed(() => {
    const user = this.authService.currentUser();
    if (user?.fullName) {
      return user.fullName.charAt(0).toUpperCase();
    }
    if (user?.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return '?';
  });

  displayName = computed(() => {
    const user = this.authService.currentUser();
    return user?.fullName || user?.username || 'User';
  });

  displayRole = computed(() => {
    const user = this.authService.currentUser();
    if (!user?.role) {
      return 'User';
    }
    return user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase();
  });
}
