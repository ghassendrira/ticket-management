import { Component, inject, OnInit, signal } from '@angular/core';
import { SidebarComponent } from '../components/sidebar.component';
import { HeaderComponent } from '../components/header.component';
import { AuthService } from '../../../core/services/auth.service';
import { TicketService, TicketResponse } from '../../../core/services/ticket.service';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [SidebarComponent, HeaderComponent, TranslatePipe],
  template: `
    <div class="dashboard-layout">
      <app-sidebar />
      <div class="dashboard-main">
        <app-dashboard-header />
        <main class="dashboard-content">
          <!-- Greeting Section -->
          <section class="greeting-section">
            <h1 class="greeting-title">{{ 'DASHBOARD.GREETING' | translate }}, {{ currentUser()?.fullName || 'there' }} 👋</h1>
            <p class="greeting-subtitle">{{ 'DASHBOARD.TICKETS_WAITING' | translate:{count: myTicketsCount()} }}</p>
          </section>

          <!-- KPI Cards -->
          <section class="kpi-grid">
            @if (currentUser()?.role === 'AGENT') {
              <div class="kpi-card primary-card">
                <div class="kpi-header">
                  <span class="kpi-label">{{ 'DASHBOARD.MY_TICKETS' | translate }}</span>
                </div>
                <div class="kpi-value">{{ myTicketsCount() }}</div>
                <div class="kpi-footer">{{ 'DASHBOARD.ACTIVE' | translate }}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-header">
                  <span class="kpi-label">{{ 'DASHBOARD.PENDING' | translate }}</span>
                </div>
                <div class="kpi-value">{{ pendingCount() }}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-header">
                  <span class="kpi-label">{{ 'DASHBOARD.RESOLVED_TODAY' | translate }}</span>
                </div>
                <div class="kpi-value">{{ resolvedTodayCount() }}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-header">
                  <span class="kpi-label">{{ 'DASHBOARD.AVG_RESOLUTION' | translate }}</span>
                </div>
                <div class="kpi-value">{{ avgResolutionTime() }}</div>
              </div>
            } @else {
              <div class="kpi-card primary-card">
                <div class="kpi-header">
                  <span class="kpi-label">{{ 'DASHBOARD.MY_TICKETS' | translate }}</span>
                  <span class="kpi-trend positive">{{ 'DASHBOARD.PLUS_TODAY' | translate:{count: 4} }}</span>
                </div>
                <div class="kpi-value">{{ myTicketsCount() }}</div>
                <div class="kpi-footer">{{ 'DASHBOARD.ACTIVE' | translate }}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-header">
                  <span class="kpi-label">{{ 'DASHBOARD.OPEN_TICKETS' | translate }}</span>
                </div>
                <div class="kpi-value">{{ openTicketsCount() }}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-header">
                  <span class="kpi-label">{{ 'DASHBOARD.RESOLVED_MONTH' | translate }}</span>
                </div>
                <div class="kpi-value">124</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-header">
                  <span class="kpi-label">{{ 'DASHBOARD.IN_PROGRESS' | translate }}</span>
                </div>
                <div class="kpi-value">{{ inProgressCount() }}</div>
              </div>
              <div class="kpi-card danger-card">
                <div class="kpi-header">
                  <span class="kpi-label">{{ 'DASHBOARD.OVERDUE' | translate }}</span>
                </div>
                <div class="kpi-value">6</div>
              </div>
            }
          </section>

          @if (currentUser()?.role !== 'AGENT') {
            <!-- Main Grid -->
            <div class="main-grid">
              <!-- Chart Section -->
              <section class="card chart-card">
                <div class="card-header">
                  <h3 class="card-title">{{ 'DASHBOARD.TICKETS_PER_DAY' | translate }}</h3>
                  <div class="chart-toggle">
                    <button class="toggle-btn active">{{ 'DASHBOARD.DAYS_7' | translate }}</button>
                    <button class="toggle-btn">{{ 'DASHBOARD.DAYS_30' | translate }}</button>
                  </div>
                </div>
                <div class="chart-container">
                  <div class="chart-placeholder">
                    {{ 'DASHBOARD.CHART_PLACEHOLDER' | translate }}
                  </div>
                </div>
              </section>

              <!-- Right Column Widgets -->
              <div class="right-column">
                <!-- Quick Actions -->
                <section class="card quick-actions-card">
                  <h3 class="card-title">{{ 'DASHBOARD.QUICK_ACTIONS' | translate }}</h3>
                  <div class="quick-actions-grid">
                    <button class="action-btn primary">
                      <span class="action-icon">+</span>
                      <span class="action-label">{{ 'DASHBOARD.NEW_TICKET' | translate }}</span>
                    </button>
                    <button class="action-btn">
                      <span class="action-icon">👤</span>
                      <span class="action-label">{{ 'DASHBOARD.INVITE_USER' | translate }}</span>
                    </button>
                    <button class="action-btn">
                      <span class="action-icon">📁</span>
                      <span class="action-label">{{ 'DASHBOARD.CREATE_CATEGORY' | translate }}</span>
                    </button>
                    <button class="action-btn">
                      <span class="action-icon">🤖</span>
                      <span class="action-label">{{ 'DASHBOARD.AI_SUMMARY' | translate }}</span>
                    </button>
                  </div>
                </section>

                <!-- Ticket Distribution -->
                <section class="card distribution-card">
                  <h3 class="card-title">{{ 'DASHBOARD.TICKET_DISTRIBUTION' | translate }}</h3>
                  <div class="distribution-list">
                    <div class="distribution-item">
                      <div class="distribution-info">
                        <span class="dot critical"></span>
                        <span class="distribution-label">{{ 'PRIORITY.CRITICAL' | translate }}</span>
                      </div>
                      <span class="distribution-value">8</span>
                    </div>
                    <div class="distribution-item">
                      <div class="distribution-info">
                        <span class="dot high"></span>
                        <span class="distribution-label">{{ 'PRIORITY.HIGH' | translate }}</span>
                      </div>
                      <span class="distribution-value">15</span>
                    </div>
                    <div class="distribution-item">
                      <div class="distribution-info">
                        <span class="dot medium"></span>
                        <span class="distribution-label">{{ 'PRIORITY.MEDIUM' | translate }}</span>
                      </div>
                      <span class="distribution-value">24</span>
                    </div>
                    <div class="distribution-item">
                      <div class="distribution-info">
                        <span class="dot low"></span>
                        <span class="distribution-label">{{ 'PRIORITY.LOW' | translate }}</span>
                      </div>
                      <span class="distribution-value">10</span>
                    </div>
                  </div>
                </section>

                <!-- AI Insights -->
                <section class="card ai-card">
                  <div class="ai-header">
                    <div class="ai-icon">🤖</div>
                    <div>
                      <h3 class="card-title">{{ 'DASHBOARD.AI_INSIGHTS' | translate }}</h3>
                      <p class="ai-subtitle">{{ 'DASHBOARD.SMART_RECOMMENDATIONS' | translate }}</p>
                    </div>
                  </div>
                  <ul class="insights-list">
                    <li class="insight-item">
                      <span class="insight-icon">⚠️</span>
                      <span class="insight-text">{{ 'DASHBOARD.INSIGHT_DUPLICATES' | translate }}</span>
                    </li>
                    <li class="insight-item">
                      <span class="insight-icon">📈</span>
                      <span class="insight-text">{{ 'DASHBOARD.INSIGHT_DB_ISSUES' | translate }}</span>
                    </li>
                    <li class="insight-item">
                      <span class="insight-icon">⏰</span>
                      <span class="insight-text">{{ 'DASHBOARD.INSIGHT_SLA' | translate }}</span>
                    </li>
                  </ul>
                </section>
              </div>
            </div>
          }

          <!-- Bottom Section -->
          <div class="bottom-grid">
            <!-- Recent Tickets -->
            <section class="card recent-tickets-card">
              <div class="card-header">
                <h3 class="card-title">{{ 'DASHBOARD.RECENT_TICKETS' | translate }}</h3>
                <div class="card-actions">
                  <button class="icon-btn">🔍</button>
                  <button class="icon-btn">⚡</button>
                </div>
              </div>
              <div class="table-container">
                <table class="tickets-table">
                  <thead>
                    <tr>
                      <th>{{ 'DASHBOARD.TICKET_ID' | translate }}</th>
                      <th>{{ 'TICKET.TITLE' | translate }}</th>
                      <th>{{ 'TICKET.PRIORITY' | translate }}</th>
                      <th>{{ 'TICKET.STATUS' | translate }}</th>
                      <th>{{ 'DASHBOARD.ASSIGNEE' | translate }}</th>
                      <th>{{ 'DASHBOARD.DATE' | translate }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (ticket of recentTickets(); track ticket.id) {
                      <tr class="ticket-row" (click)="viewTicket(ticket.id)">
                        <td class="ticket-id">{{ ticket.requestId || ticket.id.substring(0, 8) }}</td>
                        <td class="ticket-title">{{ ticket.title }}</td>
                        <td>
                          <span class="priority-badge" [class]="ticket.priority.toLowerCase()">
                            {{ getPriorityLabel(ticket.priority) | translate }}
                          </span>
                        </td>
                        <td>
                          <span class="status-badge" [class]="ticket.status.toLowerCase()">
                            {{ getStatusLabel(ticket.status) | translate }}
                          </span>
                        </td>
                        <td class="ticket-assignee">
                          <span class="assignee-avatar">{{ ticket.assignedAgentName?.charAt(0) || 'U' }}</span>
                          {{ ticket.assignedAgentName || ('TICKET.UNASSIGNED' | translate) }}
                        </td>
                        <td>{{ formatDate(ticket.createdAt) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>

            @if (currentUser()?.role !== 'AGENT') {
              <!-- Team Workload -->
              <section class="card workload-card">
                <h3 class="card-title">{{ 'DASHBOARD.TEAM_WORKLOAD' | translate }}</h3>
                <div class="workload-list">
                  @for (member of team; track member.name) {
                    <div class="workload-item">
                      <div class="workload-info">
                        <span class="workload-avatar">{{ member.name.charAt(0) }}</span>
                        <div class="workload-details">
                          <span class="workload-name">{{ member.name }}</span>
                          <span class="workload-count">{{ member.tickets }} {{ 'DASHBOARD.TICKETS_SUFFIX' | translate }}</span>
                        </div>
                      </div>
                      <div class="workload-bar-container">
                        <div class="workload-bar" [style.width.%]="member.load"></div>
                      </div>
                    </div>
                  }
                </div>
              </section>
            }
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-layout {
      display: flex;
      min-height: 100vh;
    }

    .dashboard-main {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .dashboard-content {
      padding: 32px;
      background-color: var(--bg);
    }

    /* Greeting Section */
    .greeting-section {
      margin-bottom: 32px;
    }

    .greeting-title {
      font-size: 32px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 8px 0;
    }

    .greeting-subtitle {
      font-size: 16px;
      color: var(--text-secondary);
      margin: 0;
    }

    /* KPI Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }

    .kpi-card {
      background-color: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 24px;
      transition: all 0.2s ease;
      cursor: pointer;
    }

    .kpi-card:hover {
      box-shadow: 0 8px 24px var(--shadow);
      transform: translateY(-2px);
    }

    .kpi-card.primary-card {
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-violet));
      color: white;
      border: none;
    }

    .kpi-card.primary-card .kpi-label,
    .kpi-card.primary-card .kpi-footer {
      color: rgba(255, 255, 255, 0.8);
    }

    .kpi-card.danger-card .kpi-value {
      color: #EF4444;
    }

    .kpi-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .kpi-label {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .kpi-trend {
      font-size: 12px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 8px;
    }

    .kpi-trend.positive {
      background-color: rgba(34, 197, 94, 0.1);
      color: #22C55E;
    }

    .kpi-value {
      font-size: 36px;
      font-weight: 700;
      color: var(--text-primary);
      font-family: 'Space Grotesk', sans-serif;
      margin-bottom: 8px;
    }

    .kpi-footer {
      font-size: 13px;
      color: var(--text-secondary);
    }

    /* Cards */
    .card {
      background-color: var(--surface);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 24px;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .card-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .card-actions {
      display: flex;
      gap: 8px;
    }

    .icon-btn {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background-color: transparent;
      color: var(--text-secondary);
      font-size: 16px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .icon-btn:hover {
      background-color: var(--bg-secondary);
      color: var(--text-primary);
    }

    /* Main Grid */
    .main-grid {
      display: grid;
      grid-template-columns: 1fr 400px;
      gap: 24px;
      margin-bottom: 24px;
    }

    /* Chart Card */
    .chart-card {
      min-height: 350px;
    }

    .chart-toggle {
      display: flex;
      gap: 4px;
      background-color: var(--bg-secondary);
      padding: 4px;
      border-radius: 10px;
    }

    .toggle-btn {
      padding: 6px 16px;
      border: none;
      background-color: transparent;
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 500;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .toggle-btn.active {
      background-color: var(--surface);
      color: var(--text-primary);
      box-shadow: 0 2px 8px var(--shadow);
    }

    .chart-container {
      height: 280px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .chart-placeholder {
      color: var(--text-secondary);
      font-size: 14px;
    }

    /* Right Column */
    .right-column {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Quick Actions */
    .quick-actions-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 20px 16px;
      background-color: var(--bg-secondary);
      border: 1px solid transparent;
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      color: var(--text-primary);
    }

    .action-btn:hover {
      border-color: var(--accent-violet);
      background-color: var(--surface);
      transform: translateY(-2px);
    }

    .action-btn.primary {
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-violet));
      color: white;
    }

    .action-btn.primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(139, 92, 246, 0.3);
    }

    .action-icon {
      font-size: 24px;
    }

    .action-label {
      font-size: 13px;
      font-weight: 500;
    }

    /* Ticket Distribution */
    .distribution-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .distribution-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .distribution-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .dot.critical { background-color: #EF4444; }
    .dot.high { background-color: #F97316; }
    .dot.medium { background-color: #EAB308; }
    .dot.low { background-color: #22C55E; }

    .distribution-label {
      font-size: 14px;
      color: var(--text-primary);
      font-weight: 500;
    }

    .distribution-value {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
      font-family: 'Space Grotesk', sans-serif;
    }

    /* AI Insights */
    .ai-header {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    }

    .ai-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--accent-cyan), var(--accent-blue));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }

    .ai-subtitle {
      font-size: 13px;
      color: var(--text-secondary);
      margin: 4px 0 0 0;
    }

    .insights-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .insight-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background-color: var(--bg-secondary);
      border-radius: 12px;
    }

    .insight-icon {
      font-size: 18px;
    }

    .insight-text {
      font-size: 14px;
      color: var(--text-primary);
    }

    /* Bottom Grid */
    .bottom-grid {
      display: grid;
      grid-template-columns: 1fr 400px;
      gap: 24px;
    }

    /* Recent Tickets Table */
    .table-container {
      overflow-x: auto;
    }

    .tickets-table {
      width: 100%;
      border-collapse: collapse;
    }

    .tickets-table th {
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 12px 0;
      border-bottom: 1px solid var(--border);
    }

    .ticket-row {
      border-bottom: 1px solid var(--border);
      transition: background-color 0.2s ease;
      cursor: pointer;
    }

    .ticket-row:hover {
      background-color: var(--bg-secondary);
    }

    .tickets-table td {
      padding: 16px 0;
      font-size: 14px;
      color: var(--text-primary);
    }

    .ticket-id {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      color: var(--text-secondary);
    }

    .ticket-title {
      font-weight: 500;
    }

    .priority-badge, .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }

    .priority-badge.low {
      background-color: rgba(34, 197, 94, 0.1);
      color: #22c55e;
    }

    .priority-badge.medium {
      background-color: rgba(234, 179, 8, 0.1);
      color: #eab308;
    }

    .priority-badge.high {
      background-color: rgba(249, 115, 22, 0.1);
      color: #f97316;
    }

    .priority-badge.critical {
      background-color: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }

    .status-badge.new {
      background-color: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
    }

    .status-badge.assigned {
      background-color: rgba(96, 165, 250, 0.1);
      color: #60a5fa;
    }

    .status-badge.in_progress {
      background-color: rgba(139, 92, 246, 0.1);
      color: #8b5cf6;
    }

    .status-badge.pending {
      background-color: rgba(250, 204, 21, 0.1);
      color: #facc15;
    }

    .status-badge.resolved {
      background-color: rgba(34, 197, 94, 0.1);
      color: #22c55e;
    }

    .status-badge.closed {
      background-color: rgba(107, 114, 128, 0.1);
      color: #6b7280;
    }

    .status-badge.reopened {
      background-color: rgba(249, 115, 22, 0.1);
      color: #f97316;
    }

    .status-badge.cancelled {
      background-color: rgba(156, 163, 175, 0.1);
      color: #9ca3af;
    }

    .ticket-assignee {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .assignee-avatar {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: linear-gradient(135deg, var(--accent-violet), var(--accent-cyan));
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      font-weight: 600;
    }

    /* Team Workload */
    .workload-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .workload-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .workload-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .workload-avatar {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-violet));
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 14px;
      font-weight: 600;
    }

    .workload-details {
      display: flex;
      flex-direction: column;
    }

    .workload-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .workload-count {
      font-size: 12px;
      color: var(--text-secondary);
    }

    .workload-bar-container {
      width: 100%;
      height: 8px;
      background-color: var(--bg-secondary);
      border-radius: 4px;
      overflow: hidden;
    }

    .workload-bar {
      height: 100%;
      background: linear-gradient(90deg, var(--accent-blue), var(--accent-violet));
      border-radius: 4px;
      transition: width 0.6s ease;
    }

    @media (max-width: 1200px) {
      .main-grid,
      .bottom-grid {
        grid-template-columns: 1fr;
      }

      .right-column {
        order: -1;
      }
    }

    @media (max-width: 980px) {
      .dashboard-content {
        padding: 20px 16px;
      }

      .kpi-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .greeting-title {
        font-size: 24px;
      }
    }

    @media (max-width: 640px) {
      .kpi-grid {
        grid-template-columns: 1fr;
      }

      .quick-actions-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class OverviewComponent implements OnInit {
  private authService = inject(AuthService);
  private ticketService = inject(TicketService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;
  tickets = signal<TicketResponse[]>([]);

  team = [
    { name: 'Ahmed', tickets: 17, load: 85 },
    { name: 'Nour', tickets: 11, load: 55 },
    { name: 'Sara', tickets: 14, load: 70 },
    { name: 'Ali', tickets: 8, load: 40 },
    { name: 'Youssef', tickets: 12, load: 60 }
  ];

  ngOnInit() {
    this.loadTickets();
  }

  loadTickets() {
    this.ticketService.getAllTickets().subscribe({
      next: tickets => {
        this.tickets.set(tickets);

      },
      error: err => {
        console.error('Failed to load tickets:', err);
      }
    });
  }

  myTicketsCount() {
    return this.tickets().filter(t => t.status !== 'CLOSED').length;
  }

  pendingCount() {
    return this.tickets().filter(t => t.status === 'PENDING').length;
  }

  openTicketsCount() {
    return this.tickets().filter(t => t.status === 'NEW' || t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS').length;
  }

  inProgressCount() {
    return this.tickets().filter(t => t.status === 'IN_PROGRESS').length;
  }

  resolvedTodayCount() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.tickets().filter(t => {
      const updatedAt = new Date(t.updatedAt);
      return t.status === 'RESOLVED' && updatedAt >= today;
    }).length;
  }

  avgResolutionTime() {
    return 'N/A';
  }

  recentTickets() {
    return this.tickets().slice(0, 5);
  }

  viewTicket(id: string) {
    this.router.navigate(['/tickets', id]);
  }

  getPriorityLabel(priority: string): string {
    return 'PRIORITY.' + priority;
  }

  getStatusLabel(status: string): string {
    return 'STATUS.' + status;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}