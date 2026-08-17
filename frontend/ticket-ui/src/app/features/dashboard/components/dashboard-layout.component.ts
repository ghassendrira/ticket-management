import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { HeaderComponent } from './header.component';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent],
  template: `
    <div class="dashboard-layout">
      <app-sidebar />
      <div class="dashboard-main">
        <app-dashboard-header />
        <main class="dashboard-content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-layout {
      display: flex;
      min-height: 100vh;
    }

    :host-context([dir="rtl"]) .dashboard-layout {
      flex-direction: row-reverse;
    }

    .dashboard-main {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .dashboard-content {
      flex: 1;
      padding: 32px;
      background-color: var(--bg);
      overflow-y: auto;
    }

    @media (max-width: 980px) {
      .dashboard-content {
        padding: 20px 16px;
      }
    }
  `]
})
export class DashboardLayoutComponent {}
