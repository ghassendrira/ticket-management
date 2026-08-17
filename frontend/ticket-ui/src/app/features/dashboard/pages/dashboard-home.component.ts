import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, map } from 'rxjs';
import { AuthService, UserResponse } from '../../../core/services/auth.service';
import {
  TicketService,
  TicketResponse,
  Priority,
  TicketStatus,
  DailyTicketStats,
  CategoryStats
} from '../../../core/services/ticket.service';
import {
  AssignmentService,
  AgentProfileResponse,
  TeamResponse
} from '../../../core/services/assignment.service';
import { UserService } from '../../../core/services/user.service';
import { NewTicketModalComponent } from '../../tickets/components/new-ticket-modal.component';
import { CanvasLineChartComponent } from '../components/canvas-line-chart.component';
import { CanvasDonutChartComponent } from '../components/canvas-donut-chart.component';
import { TranslatePipe } from '@ngx-translate/core';

interface WorkloadRow {
  userId: string;
  name: string;
  tickets: number;
  load: number;
}

type WorkloadSort = 'MOST' | 'LEAST' | 'NAME_AZ';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NewTicketModalComponent,
    CanvasLineChartComponent,
    CanvasDonutChartComponent,
    TranslatePipe
  ],
  template: `
    <!-- Greeting Section -->
    <section class="greeting-section">
      <h1 class="greeting-title">{{ 'DASHBOARD.GREETING' | translate }}, {{ displayName() }} 👋</h1>
      <p class="greeting-subtitle">{{ 'DASHBOARD.TICKETS_WAITING' | translate:{count: myTicketsCount()} }}</p>
    </section>
    
    @if (currentRole() === 'AGENT') {
      <!-- AGENT: Minimal dashboard -->
      <div class="charts-row">
        <section class="card chart-card">
          <div class="card-header">
            <h3 class="card-title">📈 {{ 'DASHBOARD.MY_TICKETS' | translate }}</h3>
            <div class="chart-toggle">
              <button class="toggle-btn" [class.active]="chartPeriod() === 7" (click)="setChartPeriod(7)" [disabled]="loadingChart()">{{ 'DASHBOARD.DAYS_7' | translate }}</button>
              <button class="toggle-btn" [class.active]="chartPeriod() === 30" (click)="setChartPeriod(30)" [disabled]="loadingChart()">{{ 'DASHBOARD.DAYS_30' | translate }}</button>
              <button class="toggle-btn" [class.active]="chartPeriod() === 90" (click)="setChartPeriod(90)" [disabled]="loadingChart()">{{ 'DASHBOARD.DAYS_90' | translate }}</button>
            </div>
          </div>
          <div class="chart-container">
            @if (loadingChart()) {
              <div class="chart-loading"><div class="spinner"></div><span class="loading-label">Loading chart…</span></div>
            } @else {
              <app-canvas-line-chart [data]="chartData()" />
            }
          </div>
        </section>

        <section class="card donut-card">
          <div class="card-header"><h3 class="card-title">🍩 {{ 'DASHBOARD.MY_TICKETS_BY_CATEGORY' | translate }}</h3></div>
          <div class="donut-container">
            @if (loadingCategory()) {
              <div class="chart-loading"><div class="spinner"></div><span class="loading-label">Loading…</span></div>
            } @else {
              <app-canvas-donut-chart [data]="categoryData()" />
            }
          </div>
        </section>
      </div>

      <div class="bottom-grid">
        <section class="card recent-tickets-card" style="width:100%">
          <div class="card-header">
            <h3 class="card-title">🎫 {{ 'DASHBOARD.RECENT_TICKETS' | translate }}</h3>
            <div>
              <button class="link-btn" (click)="goToMyTickets()">{{ 'DASHBOARD.VIEW_ALL_MY_TICKETS' | translate }}</button>
            </div>
          </div>
          <div class="table-container">
            <table class="tickets-table">
              <thead>
                <tr>
                  <th>{{ 'DASHBOARD.TICKET_ID' | translate }}</th>
                  <th>{{ 'LIST.TITLE' | translate }}</th>
                  <th>{{ 'TICKET.PRIORITY' | translate }}</th>
                  <th>{{ 'TICKET.STATUS' | translate }}</th>
                  <th>{{ 'TICKET.CATEGORY' | translate }}</th>
                  <th>{{ 'DASHBOARD.DATE' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (ticket of recentTickets(); track ticket.id) {
                  <tr class="ticket-row">
                    <td class="ticket-id">{{ ticket.requestId || ticket.id.substring(0, 8) }}</td>
                    <td class="ticket-title">{{ ticket.title }}</td>
                    <td><span class="priority-badge" [class]="ticket.priority.toLowerCase()">{{ getPriorityLabel(ticket.priority) | translate }}</span></td>
                    <td><span class="status-badge" [class]="ticket.status.toLowerCase()">{{ getStatusLabel(ticket.status) | translate }}</span></td>
                    <td>{{ 'CATEGORY.' + ticket.category | translate }}</td>
                    <td>{{ formatDate(ticket.createdAt) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>
    }

    @if (currentRole() !== 'AGENT') {
    <!-- KPI Cards -->
    <section class="kpi-grid">
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
        <div class="kpi-value">{{ resolvedThisMonthCount() }}</div>
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
        <div class="kpi-value">{{ overdueCount() }}</div>
      </div>
    </section>

    <!-- Charts Row: Line + Donut -->
    <div class="charts-row">
      <!-- Line Chart -->
      <section class="card chart-card">
        <div class="card-header">
          <h3 class="card-title">Tickets created vs resolved</h3>
          <div class="chart-toggle">
            <button
              class="toggle-btn"
              [class.active]="chartPeriod() === 7"
              (click)="setChartPeriod(7)"
              [disabled]="loadingChart()">
              {{ 'DASHBOARD.DAYS_7' | translate }}
            </button>
            <button
              class="toggle-btn"
              [class.active]="chartPeriod() === 30"
              (click)="setChartPeriod(30)"
              [disabled]="loadingChart()">
              {{ 'DASHBOARD.DAYS_30' | translate }}
            </button>
            <button
              class="toggle-btn"
              [class.active]="chartPeriod() === 90"
              (click)="setChartPeriod(90)"
              [disabled]="loadingChart()">
              {{ 'DASHBOARD.DAYS_90' | translate }}
            </button>
          </div>
        </div>
        <div class="chart-container">
          @if (loadingChart()) {
            <div class="chart-loading">
              <div class="spinner"></div>
              <span class="loading-label">Loading chart…</span>
            </div>
          } @else {
            <app-canvas-line-chart [data]="chartData()" />
          }
        </div>
      </section>

      <!-- Donut Chart (shows for all roles; Agent will see agent-only data) -->
      <section class="card donut-card">
        <div class="card-header">
          <h3 class="card-title">
            @if (currentRole() === 'AGENT') {
              {{ 'DASHBOARD.MY_TICKETS_BY_CATEGORY' | translate }}
            } @else {
              Par catégorie
            }
          </h3>
        </div>
        <div class="donut-container">
          @if (loadingCategory()) {
            <div class="chart-loading">
              <div class="spinner"></div>
              <span class="loading-label">Loading…</span>
            </div>
          } @else {
            <app-canvas-donut-chart [data]="categoryData()" />
          }
        </div>
      </section>
    </div>

    <!-- Main Grid -->
    <div class="main-grid">
      <!-- Right Column Widgets become full width below charts -->
      <div class="right-column full-width-widgets">
        <!-- Quick Actions -->
        <section class="card quick-actions-card">
          <h3 class="card-title">{{ 'DASHBOARD.QUICK_ACTIONS' | translate }}</h3>
          <div class="quick-actions-grid">
            <button class="action-btn primary" (click)="showCreateModal.set(true)">
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
              <span class="distribution-value">{{ criticalCount() }}</span>
            </div>
            <div class="distribution-item">
              <div class="distribution-info">
                <span class="dot high"></span>
                <span class="distribution-label">{{ 'PRIORITY.HIGH' | translate }}</span>
              </div>
              <span class="distribution-value">{{ highCount() }}</span>
            </div>
            <div class="distribution-item">
              <div class="distribution-info">
                <span class="dot medium"></span>
                <span class="distribution-label">{{ 'PRIORITY.MEDIUM' | translate }}</span>
              </div>
              <span class="distribution-value">{{ mediumCount() }}</span>
            </div>
            <div class="distribution-item">
              <div class="distribution-info">
                <span class="dot low"></span>
                <span class="distribution-label">{{ 'PRIORITY.LOW' | translate }}</span>
              </div>
              <span class="distribution-value">{{ lowCount() }}</span>
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

    <!-- Bottom Section -->
    <div class="bottom-grid">
      <section class="card recent-tickets-card">
        <div class="card-header">
          <h3 class="card-title">{{ 'DASHBOARD.RECENT_TICKETS' | translate }}</h3>
          <div>
            <button class="link-btn" (click)="goToMyTickets()">{{ 'DASHBOARD.VIEW_ALL_MY_TICKETS' | translate }}</button>
          </div>
        </div>
        <div class="table-container">
          <table class="tickets-table">
            <thead>
              <tr>
                <th>{{ 'DASHBOARD.TICKET_ID' | translate }}</th>
                <th>{{ 'LIST.TITLE' | translate }}</th>
                <th>{{ 'TICKET.PRIORITY' | translate }}</th>
                <th>{{ 'TICKET.STATUS' | translate }}</th>
                <th>{{ 'DASHBOARD.ASSIGNEE' | translate }}</th>
                <th>{{ 'DASHBOARD.DATE' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (ticket of recentTickets(); track ticket.id) {
                <tr class="ticket-row">
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
                    <span class="assignee-avatar">{{ (ticket.assignedAgentName || 'U').charAt(0) }}</span>
                    {{ ticket.assignedAgentName || ('DASHBOARD.UNASSIGNED' | translate) }}
                  </td>
                  <td>{{ formatDate(ticket.createdAt) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      @if (currentRole() !== 'AGENT') {
        <section class="card workload-card">
        <div class="card-header workload-header">
          <h3 class="card-title">{{ 'DASHBOARD.TEAM_WORKLOAD' | translate }}</h3>
        </div>

        <div class="workload-controls">
          <div class="search-wrapper">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              class="search-input"
              [placeholder]="'DASHBOARD.SEARCH_AGENT' | translate"
              [ngModel]="agentSearch()"
              (ngModelChange)="agentSearch.set($event)"
            >
          </div>
          <div class="sort-toggle">
            <button
              class="toggle-btn"
              [class.active]="agentSort() === 'MOST'"
              (click)="agentSort.set('MOST')">
              {{ 'DASHBOARD.SORT_MOST_TICKETS' | translate }}
            </button>
            <button
              class="toggle-btn"
              [class.active]="agentSort() === 'LEAST'"
              (click)="agentSort.set('LEAST')">
              {{ 'DASHBOARD.SORT_LEAST_TICKETS' | translate }}
            </button>
            <button
              class="toggle-btn"
              [class.active]="agentSort() === 'NAME_AZ'"
              (click)="agentSort.set('NAME_AZ')">
              {{ 'DASHBOARD.SORT_NAME_AZ' | translate }}
            </button>
          </div>
        </div>

        <div class="workload-list">
          @if (loadingWorkload()) {
            <div class="workload-empty">
              <div class="spinner"></div>
            </div>
          } @else if (visibleAgents().length === 0) {
            <div class="workload-empty">
              <span class="empty-text">{{ workloadEmptyMessage() | translate }}</span>
            </div>
          } @else {
            @for (member of visibleAgents(); track member.userId) {
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
          }
        </div>
        </section>
      }
    </div>

    }
    @if (showCreateModal()) {
      <app-new-ticket-modal
        (closed)="showCreateModal.set(false)"
        (ticketCreated)="loadTickets()"
      />
    }
  `,
  styles: [`
    .greeting-section { margin-bottom: 32px; }
    .greeting-title { font-size: 32px; font-weight: 700; color: var(--text-primary); margin: 0 0 8px 0; }
    .greeting-subtitle { font-size: 16px; color: var(--text-secondary); margin: 0; }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .kpi-card {
      background-color: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 24px;
    }

    .kpi-card.primary-card {
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-violet));
      color: white;
      border: none;
    }

    .kpi-card.primary-card .kpi-label,
    .kpi-card.primary-card .kpi-footer { color: rgba(255,255,255,0.8); }

    .kpi-card.danger-card .kpi-value { color: #ef4444; }
    .kpi-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .kpi-label { font-size: 14px; font-weight: 500; color: var(--text-secondary); }
    .kpi-trend { font-size: 12px; font-weight: 600; padding: 4px 8px; border-radius: 8px; }
    .kpi-trend.positive { background-color: rgba(34,197,94,0.1); color: #22c55e; }
    .kpi-value { font-size: 36px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
    .kpi-footer { font-size: 13px; color: var(--text-secondary); }

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
      margin-bottom: 16px;
    }

    .card-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    /* Charts row */
    .charts-row {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }

    .chart-card, .donut-card {
      min-height: 380px;
    }

    .chart-container, .donut-container {
      width: 100%;
      min-height: 320px;
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
      background: transparent;
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 500;
      border-radius: 8px;
      cursor: pointer;
    }

    .toggle-btn.active {
      background: var(--surface);
      color: var(--text-primary);
      box-shadow: 0 2px 8px var(--shadow);
    }

    .toggle-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .chart-loading {
      min-height: 300px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: var(--text-secondary);
    }

    .spinner {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 3px solid var(--border);
      border-top-color: var(--accent-violet, #8b5cf6);
      animation: chart-spin 0.9s linear infinite;
    }

    @keyframes chart-spin { to { transform: rotate(360deg); } }

    .main-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }

    .right-column {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
    }

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
      color: var(--text-primary);
    }

    .action-btn.primary {
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-violet));
      color: white;
    }

    .action-icon { font-size: 24px; }
    .action-label { font-size: 13px; font-weight: 500; }

    .distribution-list { display: flex; flex-direction: column; gap: 16px; }
    .distribution-item { display: flex; justify-content: space-between; align-items: center; }
    .distribution-info { display: flex; align-items: center; gap: 12px; }
    .dot { width: 12px; height: 12px; border-radius: 50%; }
    .dot.critical { background-color: #ef4444; }
    .dot.high { background-color: #f97316; }
    .dot.medium { background-color: #eab308; }
    .dot.low { background-color: #22c55e; }
    .distribution-label { font-size: 14px; color: var(--text-primary); font-weight: 500; }
    .distribution-value { font-size: 18px; font-weight: 700; color: var(--text-primary); }

    .ai-header { display: flex; gap: 12px; margin-bottom: 20px; }
    .ai-icon {
      width: 44px; height: 44px; border-radius: 12px;
      background: linear-gradient(135deg, var(--accent-cyan), var(--accent-blue));
      display: flex; align-items: center; justify-content: center; font-size: 20px;
    }
    .ai-subtitle { font-size: 13px; color: var(--text-secondary); margin: 4px 0 0 0; }
    .insights-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
    .insight-item {
      display: flex; align-items: center; gap: 12px; padding: 12px;
      background-color: var(--bg-secondary); border-radius: 12px;
    }

    .bottom-grid {
      display: grid;
      grid-template-columns: 1fr 400px;
      gap: 24px;
    }

    .table-container { overflow-x: auto; }
    .tickets-table { width: 100%; border-collapse: collapse; }
    .tickets-table th {
      text-align: left; font-size: 12px; font-weight: 600; color: var(--text-secondary);
      text-transform: uppercase; padding: 12px 0; border-bottom: 1px solid var(--border);
    }
    .tickets-table td { padding: 16px 0; font-size: 14px; color: var(--text-primary); border-bottom: 1px solid var(--border); }
    .ticket-id { font-family: monospace; color: var(--text-secondary); }
    .ticket-title { font-weight: 500; }
    .priority-badge, .status-badge {
      display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
    }
    .priority-badge.low { background-color: rgba(34,197,94,0.1); color: #22c55e; }
    .priority-badge.medium { background-color: rgba(234,179,8,0.1); color: #eab308; }
    .priority-badge.high { background-color: rgba(249,115,22,0.1); color: #f97316; }
    .priority-badge.critical { background-color: rgba(239,68,68,0.1); color: #ef4444; }
    .status-badge.new { background-color: rgba(59,130,246,0.1); color: #3b82f6; }
    .status-badge.assigned { background-color: rgba(96,165,250,0.1); color: #60a5fa; }
    .status-badge.in_progress { background-color: rgba(139,92,246,0.1); color: #8b5cf6; }
    .status-badge.resolved { background-color: rgba(34,197,94,0.1); color: #22c55e; }
    .ticket-assignee { display: flex; align-items: center; gap: 8px; }
    .assignee-avatar {
      width: 28px; height: 28px; border-radius: 8px;
      background: linear-gradient(135deg, var(--accent-violet), var(--accent-cyan));
      display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: 600;
    }

    /* ===== Workload Card: fixed height, scrollable inner list ===== */
    .workload-card {
      display: flex;
      flex-direction: column;
      height: 420px;
    }

    .workload-header {
      margin-bottom: 12px;
    }

    .workload-controls {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
      flex-shrink: 0;
    }

    .workload-controls .search-wrapper {
      display: flex;
      align-items: center;
      gap: 10px;
      background-color: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 8px 14px;
      transition: all 0.2s ease;
    }

    .workload-controls .search-wrapper:focus-within {
      border-color: var(--accent-violet);
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    }

    .workload-controls .search-icon {
      font-size: 14px;
      color: var(--text-secondary);
    }

    .workload-controls .search-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-primary);
      font-size: 13px;
      font-family: inherit;
    }

    .workload-controls .search-input::placeholder {
      color: var(--text-secondary);
    }

    .workload-controls .sort-toggle {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      background-color: var(--bg-secondary);
      padding: 4px;
      border-radius: 10px;
    }

    .workload-controls .sort-toggle .toggle-btn {
      padding: 6px 10px;
      font-size: 12px;
      white-space: nowrap;
    }

    .workload-list {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-right: 4px;
    }

    .workload-list::-webkit-scrollbar { width: 6px; }
    .workload-list::-webkit-scrollbar-track { background: transparent; }
    .workload-list::-webkit-scrollbar-thumb {
      background: var(--border);
      border-radius: 3px;
    }
    .workload-list::-webkit-scrollbar-thumb:hover {
      background: var(--text-secondary);
    }

    .workload-empty {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 12px;
      min-height: 120px;
    }

    .empty-text {
      font-size: 14px;
      color: var(--text-secondary);
      text-align: center;
    }

    .workload-item { display: flex; flex-direction: column; gap: 8px; }
    .workload-info { display: flex; align-items: center; gap: 12px; }
    .workload-avatar {
      width: 36px; height: 36px; border-radius: 10px;
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-violet));
      display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;
    }
    .workload-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .workload-count { font-size: 12px; color: var(--text-secondary); }
    .workload-bar-container { width: 100%; height: 8px; background: var(--bg-secondary); border-radius: 4px; overflow: hidden; }
    .workload-bar { height: 100%; background: linear-gradient(90deg, var(--accent-blue), var(--accent-violet)); border-radius: 4px; }

    @media (max-width: 1200px) {
      .charts-row { grid-template-columns: 1fr; }
      .right-column { grid-template-columns: 1fr; }
      .bottom-grid { grid-template-columns: 1fr; }
      .workload-card { height: 420px; }
    }
  `]
})
export class DashboardHomeComponent implements OnInit {
  authService = inject(AuthService);
  ticketService = inject(TicketService);
  assignmentService = inject(AssignmentService);
  userService = inject(UserService);

  tickets = signal<TicketResponse[]>([]);
  showCreateModal = signal(false);

  chartPeriod = signal<7 | 30 | 90>(7);
  chartData = signal<DailyTicketStats[]>([]);
  loadingChart = signal(false);

  categoryData = signal<CategoryStats[]>([]);
  loadingCategory = signal(false);
  
  router = inject(Router);

  currentRole = computed(() => this.authService.currentUser()?.role || '');

  // ==== Team Workload: real data, search, sort, role-scoped ====
  agentUsers = signal<UserResponse[]>([]);
  agentProfiles = signal<AgentProfileResponse[]>([]);
  managerTeams = signal<TeamResponse[]>([]);
  loadingWorkload = signal(false);
  agentSearch = signal('');
  agentSort = signal<WorkloadSort>('MOST');

  managerHasNoTeam = computed(() => this.currentRole() === 'MANAGER' && this.managerTeams().length === 0);
  managerHasNoAgents = computed(() => this.currentRole() === 'MANAGER' && this.managerTeams().length > 0 && this.agentProfiles().length === 0);
  workloadEmptyMessage = computed(() => {
    if (this.managerHasNoTeam()) return 'DASHBOARD.NO_TEAM_ASSIGNED';
    if (this.managerHasNoAgents()) return 'DASHBOARD.NO_AGENTS_IN_TEAM';
    return 'DASHBOARD.NO_AGENTS';
  });

  private ticketCountsByAgent = computed(() => {
    const counts = new Map<string, number>();
    for (const t of this.tickets()) {
      if (!t.assignedAgentId) continue;
      counts.set(t.assignedAgentId, (counts.get(t.assignedAgentId) ?? 0) + 1);
    }
    return counts;
  });

  private visibleUserIds = computed(() => {
    const role = this.currentRole();
    if (role === 'ADMIN') {
      return new Set(this.agentUsers().map(u => u.id));
    }
    if (role === 'MANAGER') {
      return new Set(this.agentProfiles().map(p => p.userId));
    }
    // AGENT: only show current user (me)
    const me = this.authService.currentUser();
    return me ? new Set([me.id]) : new Set<string>();
  });

  private allAgentsWorkload = computed((): WorkloadRow[] => {
    const counts = this.ticketCountsByAgent();
    const userById = new Map(this.agentUsers().map(u => [u.id, u]));
    const profileByUserId = new Map(this.agentProfiles().map(p => [p.userId, p]));

    const rows: WorkloadRow[] = [];
    const visibleIds = this.visibleUserIds();

    for (const userId of visibleIds) {
      const user = userById.get(userId);
      const profile = profileByUserId.get(userId);
      const baseName = user?.fullName || user?.username || profile?.fullName || userId.slice(0, 8);
      if (!user && !profile) {
        rows.push({
          userId,
          name: 'Unknown',
          tickets: counts.get(userId) ?? 0,
          load: 0
        });
        continue;
      }
      const tickets = counts.get(userId) ?? 0;
      const max = profile?.maxConcurrentTickets ?? 10;
      const load = Math.max(0, Math.min(100, Math.round((tickets / Math.max(1, max)) * 100)));
      rows.push({ userId, name: baseName, tickets, load });
    }

    if (rows.length === 0) {
      // Fallback for dev/demo when no backend data yet, keep sample list scoped by role
      const demo: WorkloadRow[] = [
        { userId: 'demo-1', name: 'Ahmed', tickets: 17, load: 85 },
        { userId: 'demo-2', name: 'Nour', tickets: 11, load: 55 },
        { userId: 'demo-3', name: 'Sara', tickets: 14, load: 70 },
        { userId: 'demo-4', name: 'Ali', tickets: 8, load: 40 },
        { userId: 'demo-5', name: 'Youssef', tickets: 12, load: 60 },
        { userId: 'demo-6', name: 'Lina', tickets: 6, load: 30 },
        { userId: 'demo-7', name: 'Khalid', tickets: 15, load: 75 },
        { userId: 'demo-8', name: 'Maya', tickets: 9, load: 45 },
        { userId: 'demo-9', name: 'Omar', tickets: 5, load: 25 },
        { userId: 'demo-10', name: 'Hajar', tickets: 13, load: 65 },
      ];
      const role = this.currentRole();
      if (role === 'AGENT') {
        const me = this.authService.currentUser();
        return me ? demo.filter(d => d.name === me.fullName || d.userId === me.id).length
          ? demo.filter(d => d.name === me.fullName || d.userId === me.id)
          : [demo[0]]
          : [];
      }
      // MANAGER: show first 6 as demo team subset; ADMIN: see all
      return role === 'MANAGER' ? demo.slice(0, 6) : demo;
    }

    // If non-admin rows all have 0 tickets demo-fallback would be blank, so we leave rows unchanged
    return rows;
  });

  visibleAgents = computed((): WorkloadRow[] => {
    const q = this.agentSearch().trim().toLowerCase();
    let rows = q.length > 0
      ? this.allAgentsWorkload().filter(r => r.name.toLowerCase().includes(q))
      : this.allAgentsWorkload();

    const sort = this.agentSort();
    const sorted = [...rows];
    if (sort === 'MOST') sorted.sort((a, b) => b.tickets - a.tickets || a.name.localeCompare(b.name));
    else if (sort === 'LEAST') sorted.sort((a, b) => a.tickets - b.tickets || a.name.localeCompare(b.name));
    else sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  });

  setChartPeriod(period: 7 | 30 | 90) {
    if (this.chartPeriod() === period) return;
    this.chartPeriod.set(period);
    this.loadChartData();
  }

  loadChartData() {
    this.loadingChart.set(true);

    // Agent: compute chart from local tickets (agent-only)
    if (this.currentRole() === 'AGENT') {
      try {
        const period = this.chartPeriod();
        const data = this.computeAgentDailyStats(period);
        this.chartData.set(data);
      } catch (err) {
        console.error('Failed to compute agent chart data:', err);
        this.chartData.set([]);
      }
      this.loadingChart.set(false);
      return;
    }

    // Non-agent: use analytics API
    const apiPeriod = (this.chartPeriod() === 90 ? 30 : this.chartPeriod()) as 7 | 30;
    this.ticketService.getTicketsCreatedVsResolved(apiPeriod).subscribe({
      next: data => {
        this.chartData.set(data || []);
        this.loadingChart.set(false);
      },
      error: err => {
        console.error('Failed to load chart data:', err);
        this.chartData.set([]);
        this.loadingChart.set(false);
      }
    });
  }

  loadCategoryData() {
    this.loadingCategory.set(true);
    if (this.currentRole() === 'AGENT') {
      try {
        const data = this.computeAgentCategoryStats();
        this.categoryData.set(data);
      } catch (err) {
        console.error('Failed to compute agent category stats:', err);
        this.categoryData.set([]);
      }
      this.loadingCategory.set(false);
      return;
    }

    this.ticketService.getTicketsByCategory().subscribe({
      next: data => {
        this.categoryData.set(data || []);
        this.loadingCategory.set(false);
      },
      error: err => {
        console.error('Failed to load category stats:', err);
        this.categoryData.set([]);
        this.loadingCategory.set(false);
      }
    });
  }

  greeting = computed(() => {
    return 'DASHBOARD.GREETING';
  });

  displayName = computed(() => {
    const user = this.authService.currentUser();
    return user?.fullName || user?.username || 'User';
  });

  myTicketsCount = computed(() => {
    const user = this.authService.currentUser();
    if (!user?.id) return 0;
    return this.tickets().filter(t => t.assignedAgentId === user.id).length;
  });

  openTicketsCount = computed(() => {
    const openStatuses: TicketStatus[] = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'PENDING', 'REOPENED'];
    return this.tickets().filter(t => openStatuses.includes(t.status)).length;
  });

  resolvedThisMonthCount = computed(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return this.tickets().filter(t => {
      if (t.status !== 'RESOLVED') return false;
      return new Date(t.updatedAt) >= monthStart;
    }).length;
  });

  inProgressCount = computed(() => this.tickets().filter(t => t.status === 'IN_PROGRESS').length);
  overdueCount = computed(() => 0);
  criticalCount = computed(() => this.tickets().filter(t => t.priority === 'CRITICAL').length);
  highCount = computed(() => this.tickets().filter(t => t.priority === 'HIGH').length);
  mediumCount = computed(() => this.tickets().filter(t => t.priority === 'MEDIUM').length);
  lowCount = computed(() => this.tickets().filter(t => t.priority === 'LOW').length);

  recentTickets = computed(() =>
    (() => {
      const role = this.currentRole();
      const all = [...this.tickets()];
      const me = this.authService.currentUser();
      const filtered = role === 'AGENT' && me?.id
        ? all.filter(t => t.assignedAgentId === me.id)
        : all;
      return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
    })()
  );

  goToMyTickets() {
    this.router.navigate(['/tickets'], { queryParams: { mine: true } });
  }

  private computeAgentDailyStats(period: 7 | 30 | 90): DailyTicketStats[] {
    const me = this.authService.currentUser();
    if (!me?.id) return [];
    const days = period;
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (days - 1));

    const buckets: Record<string, { created: number; resolved: number }> = {};
    // initialize
    for (let i = 0; i < days; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { created: 0, resolved: 0 };
    }

    const tickets = this.tickets().filter(t => t.assignedAgentId === me.id);
    for (const t of tickets) {
      try {
        const createdKey = new Date(t.createdAt).toISOString().slice(0, 10);
        if (createdKey in buckets) buckets[createdKey].created++;
        if (t.status === 'RESOLVED' && t.updatedAt) {
          const resolvedKey = new Date(t.updatedAt).toISOString().slice(0, 10);
          if (resolvedKey in buckets) buckets[resolvedKey].resolved++;
        }
      } catch (e) {
        // ignore parse errors
      }
    }

    return Object.keys(buckets).sort().map(d => ({ date: d, created: buckets[d].created, resolved: buckets[d].resolved }));
  }

  private computeAgentCategoryStats() {
    const me = this.authService.currentUser();
    if (!me?.id) return [];
    const tickets = this.tickets().filter(t => t.assignedAgentId === me.id);
    const counts = new Map<string, number>();
    let total = 0;
    for (const t of tickets) {
      const cat = t.category || 'OTHER';
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
      total++;
    }
    const items = Array.from(counts.entries()).map(([category, count]) => ({ category, count, percentage: Math.round((count / Math.max(1, total)) * 100) }));
    return items;
  }

  ngOnInit() {
    this.loadTickets();
    this.loadChartData();
    this.loadCategoryData();
    this.loadWorkloadData();
  }

  loadTickets() {
    this.ticketService.getAllTickets().subscribe({
      next: tickets => {
        this.tickets.set(tickets || []);
        // Recompute agent-scoped charts/categories after tickets arrive
        if (this.currentRole() === 'AGENT') {
          this.loadChartData();
          this.loadCategoryData();
        }
      },
      error: err => console.error('Failed to load tickets:', err)
    });
  }

  loadWorkloadData() {
    this.loadingWorkload.set(true);
    const role = this.currentRole();

    const agentProfiles$ = this.assignmentService.getAgents().pipe(map(a => a || []));
    const agentUsers$ = this.userService.getUsers(undefined, 'AGENT').pipe(map(u => u || []));

    if (role === 'MANAGER') {
      const teams$ = this.assignmentService.getTeams().pipe(map(t => t || []));
      teams$.subscribe({
        next: (teams) => {
          this.managerTeams.set(teams);
          this.agentUsers.set([]);

          if (!teams.length) {
            this.agentProfiles.set([]);
            this.loadingWorkload.set(false);
            return;
          }

          const teamAgentCalls = teams.map(team =>
            this.assignmentService.getTeamAgents(team.id).pipe(map(a => a || []))
          );

          forkJoin(teamAgentCalls).subscribe({
            next: teamAgentLists => {
              const allTeamAgents = teamAgentLists.flat();
              this.agentProfiles.set(allTeamAgents);
              this.loadingWorkload.set(false);
            },
            error: err => {
              console.error('Failed to load manager team agents:', err);
              this.agentProfiles.set([]);
              this.loadingWorkload.set(false);
            }
          });
        },
        error: err => {
          console.error('Failed to load manager teams:', err);
          this.agentProfiles.set([]);
          this.agentUsers.set([]);
          this.managerTeams.set([]);
          this.loadingWorkload.set(false);
        }
      });
    } else {
      forkJoin([agentProfiles$, agentUsers$]).subscribe({
        next: ([profiles, users]) => {
          this.agentProfiles.set(profiles);
          this.agentUsers.set(users);
          this.managerTeams.set([]);
          this.loadingWorkload.set(false);
        },
        error: err => {
          console.error('Failed to load workload data:', err);
          this.agentProfiles.set([]);
          this.agentUsers.set([]);
          this.managerTeams.set([]);
          this.loadingWorkload.set(false);
        }
      });
    }
  }

  getPriorityLabel(priority: Priority): string {
    return 'PRIORITY.' + priority;
  }

  getStatusLabel(status: TicketStatus): string {
    return 'STATUS.' + status;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
