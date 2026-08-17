import { Component, inject, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  template: `
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <div class="logo-icon">🎫</div>
          <span class="logo-text">TicketFlow</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        @for (item of navItems(); track item.route) {
          <a
                        [routerLink]="item.route"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
            class="nav-item"
          >
            <span class="nav-icon">{{ item.icon }}</span>
            <span class="nav-label">{{ item.labelKey | translate }}</span>
          </a>
        }
      
      </nav>

      <div class="sidebar-footer">
        <button class="nav-item" (click)="goToNotifications()">
          <span class="nav-icon">🔔</span>
          <span class="nav-label">{{ 'APP.NAV.NOTIFICATIONS' | translate }}</span>
        </button>
        <a
                    routerLink="/escalations"
          routerLinkActive="active"
          class="nav-item"
        >
          <span class="nav-icon">⚠️</span>
          <span class="nav-label">{{ 'APP.NAV.ESCALATIONS' | translate }}</span>
        </a>
        <a
                    routerLink="/settings"
          routerLinkActive="active"
          class="nav-item"
        >
          <span class="nav-icon">⚙</span>
          <span class="nav-label">{{ 'APP.NAV.SETTINGS' | translate }}</span>
        </a>
      </div>

      <div class="sidebar-logout">
        <button class="nav-item logout-btn" (click)="onLogout()">
          <span class="nav-icon">🚪</span>
          <span class="nav-label">{{ 'APP.NAV.LOGOUT' | translate }}</span>
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 280px;
      height: 100vh;
      background-color: var(--surface);
      border-inline-end: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      padding: 24px 20px;
      position: sticky;
      top: 0;
    }

    .sidebar-header {
      margin-bottom: 32px;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-violet));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }

    .logo-text {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 22px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .sidebar-nav {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .nav-item {
      width: 100%;
      padding: 12px 16px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--text-secondary);
      font-size: 15px;
      font-weight: 500;
      transition: all 0.2s ease;
      text-decoration: none;
      text-align: start;
    }

    .nav-item:hover {
      background-color: var(--bg-secondary);
      color: var(--text-primary);
    }

    .nav-item.active {
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-violet));
      color: white;
    }

    .nav-icon {
      font-size: 20px;
      display: flex;
      align-items: center;
    }

    .sidebar-footer {
      display: flex;
      flex-direction: column;
      gap: 4px;
      border-top: 1px solid var(--border);
      padding-top: 16px;
      margin-bottom: 16px;
    }

    .sidebar-logout {
      border-top: 1px solid var(--border);
      padding-top: 16px;
    }

    .logout-btn {
      color: #EF4444;
    }

    .logout-btn:hover {
      background-color: rgba(239, 68, 68, 0.1);
      color: #EF4444;
    }

    @media (max-width: 980px) {
      .sidebar {
        position: fixed;
        inset-inline-start: -280px;
        top: 0;
        z-index: 1000;
        transition: inset-inline-start 0.3s ease;
      }

      .sidebar.open {
        inset-inline-start: 0;
      }
    }
  `]
})
export class SidebarComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  navItems = computed(() => {
    const items = [
      { icon: '🏠', labelKey: 'APP.NAV.DASHBOARD', route: '/dashboard' },
      { icon: '🎫', labelKey: 'APP.NAV.TICKETS', route: '/tickets' }
    ];

    const user = this.authService.currentUser();
    if (user?.role === 'AGENT') {
      items.push({ icon: '👥', labelKey: 'APP.NAV.TEAM', route: '/team' });
    }

    items.push({ icon: '📊', labelKey: 'APP.NAV.ANALYTICS', route: '/analytics' });
    items.push({ icon: '🤖', labelKey: 'APP.NAV.AI_ASSISTANT', route: '/ai' });

    if (user?.role === 'MANAGER' || user?.role === 'ADMIN') {
      items.splice(2, 0, { icon: '🧩', labelKey: 'APP.NAV.TEAM_MANAGEMENT', route: '/teams' });
    }
    if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
      items.push({ icon: '👤', labelKey: 'APP.NAV.USERS', route: '/users' });
    }

    return items;
  });

  goToNotifications() {
    this.router.navigate(['/dashboard']).then(() => {
      window.dispatchEvent(new CustomEvent('app:open-notifications'));
    });
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}