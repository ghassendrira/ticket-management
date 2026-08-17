import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import {
  AssignmentService,
  MyTeamResponse,
  TeamResponse,
  AgentProfileResponse
} from '../../../core/services/assignment.service';
import {
  TicketService,
  TicketResponse,
  TicketStatus,
  TeamMemberWorkloadResponse,
  TeamActivityResponse
} from '../../../core/services/ticket.service';

interface MemberDisplay {
  userId: string;
  fullName: string;
  role: string;
  isOnline: boolean | null;
  activeTicketsCount: number;
  maxConcurrentTickets: number | null;
  isCurrentUser: boolean;
  initial: string;
}

interface WorkloadDisplay {
  userId: string;
  name: string;
  tickets: number;
  load: number;
  isCurrentUser: boolean;
}

interface ActivityDisplay {
  id: string;
  eventType: string;
  message: string;
  ticketId?: string;
  ticketTitle?: string;
  actorName: string;
  timestamp: string;
  relativeTime: string;
}

@Component({
  selector: 'app-agent-team',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="agent-team-page">
      <!-- HEADER CARD -->
      <section class="header-card card">
        <div class="header-content">
          <div class="header-main">
            <span class="header-badge">{{ 'AGENT_TEAM.PAGE_BADGE' | translate }}</span>
            <h1 class="header-title">{{ 'AGENT_TEAM.MY_TEAM' | translate }}</h1>
            @if (selectedTeam() && selectedTeam()!.managerName) {
              <p class="manager-line">{{ 'Manager' | translate }}: <b>{{ selectedTeam()!.managerName }}</b></p>
            }
          </div>

          @if (loading.team()) {
            <div class="loading-shimmer">
              <div class="shimmer-line w-40"></div>
              <div class="shimmer-line w-60"></div>
            </div>
          } @else if (!selectedTeam()) {
              <div class="no-team-state">
              <div class="no-team-icon">👥</div>
              <p class="no-team-text">{{ 'AGENT_TEAM.NO_TEAM' | translate }}</p>
              <div class="info-item">
                <span class="info-label">{{ 'AGENT_TEAM.MANAGER' | translate }}</span>
                <span class="info-value">
                  <span class="manager-avatar">{{ (selectedTeam()!.managerName || 'M').charAt(0) }}</span>
                  {{ selectedTeam()!.managerName || ('AGENT_TEAM.NO_MANAGER' | translate) }}
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ 'AGENT_TEAM.AGENTS' | translate }}</span>
                <span class="info-value pill">{{ selectedTeam()!.agentCount }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ 'AGENT_TEAM.OPEN_TICKETS' | translate }}</span>
                <span class="info-value pill highlight">{{ teamOpenTickets() }}</span>
              </div>
            </div>

            @if (teams().length > 1) {
              <div class="team-selector">
                <label>{{ 'AGENT_TEAM.SELECT_TEAM_PROMPT' | translate }}</label>
                <select
                  [ngModel]="selectedTeamId"
                  (ngModelChange)="onTeamSelect($event)"
                  class="team-select"
                >
                  @for (t of teams(); track t.id) {
                    <option [value]="t.id">{{ t.name }}</option>
                  }
                </select>
              </div>
            }
          }
        </div>
      </section>

      @if (selectedTeam()) {
        <!-- KPI CARDS -->
        <section class="kpi-row">
          <div class="kpi-card card">
            <div class="kpi-icon blue">🎫</div>
            <div class="kpi-info">
              <span class="kpi-label">{{ 'AGENT_TEAM.KPI_TEAM_OPEN' | translate }}</span>
              @if (loading.workload()) {
                <div class="shimmer-line w-20 mt-4"></div>
              } @else {
                <span class="kpi-value">{{ teamOpenTickets() }}</span>
              }
            </div>
          </div>
          <div class="kpi-card card">
            <div class="kpi-icon violet">📋</div>
            <div class="kpi-info">
              <span class="kpi-label">{{ 'AGENT_TEAM.KPI_MY_OPEN' | translate }}</span>
              @if (loading.tickets()) {
                <div class="shimmer-line w-20 mt-4"></div>
              } @else {
                <span class="kpi-value">{{ myOpenTickets() }}</span>
              }
            </div>
          </div>
          <div class="kpi-card card">
            <div class="kpi-icon green">⏱️</div>
            <div class="kpi-info">
              <span class="kpi-label">{{ 'AGENT_TEAM.KPI_AVG_RESOLVE' | translate }}</span>
              <span class="kpi-value">{{ avgResolveTime() }}</span>
            </div>
          </div>
        </section>

        <!-- TWO-COLUMN SECTION: Members + Workload -->
        <section class="two-column">
          <!-- LEFT: Team Members -->
          <div class="column">
            <div class="card">
              <div class="card-header-row">
                <h2 class="card-title">{{ 'AGENT_TEAM.TEAM_MEMBERS' | translate }}</h2>
                <span class="card-count">{{ membersDisplay().length }}</span>
              </div>

              @if (loading.workload()) {
                <div class="loading-list">
                  @for (i of [1,2,3,4]; track i) {
                    <div class="loading-row">
                      <div class="shimmer-avatar"></div>
                      <div class="shimmer-lines">
                        <div class="shimmer-line w-60"></div>
                        <div class="shimmer-line w-40"></div>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="members-list">
                  @for (member of membersDisplay(); track member.userId) {
                    <div class="member-row" [class.current-user]="member.isCurrentUser">
                      <div class="member-avatar"
                           [class.online]="member.isOnline === true"
                           [class.offline]="member.isOnline === false">
                        {{ member.initial }}
                      </div>
                      <div class="member-info">
                        <div class="member-name-row">
                          <span class="member-name">
                            {{ member.fullName }}
                            @if (member.isCurrentUser) {
                              <span class="you-badge">{{ 'AGENT_TEAM.YOU' | translate }}</span>
                            }
                          </span>
                          <span [class]="'role-badge role-' + member.role.toLowerCase()">
                            {{ member.role === 'MANAGER'
                                ? ('AGENT_TEAM.ROLE_MANAGER' | translate)
                                : ('AGENT_TEAM.ROLE_AGENT' | translate) }}
                          </span>
                        </div>
                        @if (member.isOnline !== null) {
                          <span class="presence-text"
                                [class.online]="member.isOnline"
                                [class.offline]="!member.isOnline">
                            {{ member.isOnline
                                ? ('AGENT_TEAM.ONLINE' | translate)
                                : ('AGENT_TEAM.OFFLINE' | translate) }}
                          </span>
                        }
                      </div>
                      <div class="member-tickets">
                        <span class="tickets-count">{{ member.activeTicketsCount }}</span>
                        <span class="tickets-label">{{ 'AGENT_TEAM.ACTIVE_TICKETS' | translate }}</span>
                      </div>
                    </div>
                  } @empty {
                    <div class="empty-list">{{ 'AGENT_TEAM.NO_MEMBERS' | translate }}</div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- RIGHT: Team Workload -->
          <div class="column">
            <div class="card">
              <div class="card-header-row">
                <h2 class="card-title">{{ 'AGENT_TEAM.TEAM_WORKLOAD' | translate }}</h2>
                <span class="card-subtitle">{{ 'AGENT_TEAM.WORKLOAD_SUBTITLE' | translate }}</span>
              </div>

              @if (loading.workload()) {
                <div class="loading-list">
                  @for (i of [1,2,3,4]; track i) {
                    <div class="loading-row">
                      <div class="shimmer-lines flex-1">
                        <div class="shimmer-line w-60 mb-8"></div>
                        <div class="shimmer-line w-full h-8"></div>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="workload-list">
                  @for (item of workloadDisplay(); track item.userId) {
                    <div class="workload-item" [class.current-user]="item.isCurrentUser">
                      <div class="workload-info">
                        <span class="workload-name">
                          {{ item.name }}
                          @if (item.isCurrentUser) {
                            <span class="you-badge small">{{ 'AGENT_TEAM.YOU' | translate }}</span>
                          }
                        </span>
                        <span class="workload-count">
                          {{ item.tickets }} {{ 'AGENT_TEAM.TICKETS_SUFFIX' | translate }}
                        </span>
                      </div>
                      <div class="workload-bar-container">
                        <div
                          class="workload-bar"
                          [class.high]="item.load >= 80"
                          [class.medium]="item.load >= 50 && item.load < 80"
                          [style.width.%]="item.load"
                        ></div>
                      </div>
                    </div>
                  } @empty {
                    <div class="empty-list">{{ 'AGENT_TEAM.NO_WORKLOAD_DATA' | translate }}</div>
                  }
                </div>
              }
            </div>
          </div>
        </section>

        <!-- TEAM ACTIVITY -->
        <section class="card activity-card">
          <div class="card-header-row">
            <h2 class="card-title">{{ 'AGENT_TEAM.TEAM_ACTIVITY' | translate }}</h2>
            <span class="card-subtitle">{{ 'AGENT_TEAM.ACTIVITY_SUBTITLE' | translate }}</span>
          </div>

          @if (loading.activity()) {
            <div class="loading-list">
              @for (i of [1,2,3]; track i) {
                <div class="loading-row">
                  <div class="shimmer-dot"></div>
                  <div class="shimmer-lines flex-1">
                    <div class="shimmer-line w-80"></div>
                    <div class="shimmer-line w-40 mt-4"></div>
                  </div>
                </div>
              }
            </div>
          } @else if (activityDisplay().length === 0) {
            <div class="empty-state">
              <div class="empty-icon">📭</div>
              <p>{{ 'AGENT_TEAM.NO_ACTIVITY' | translate }}</p>
            </div>
          } @else {
            <div class="activity-list">
              @for (event of activityDisplay(); track event.id) {
                <div class="activity-item">
                  <div class="activity-dot" [class]="getEventDotClass(event.eventType)"></div>
                  <div class="activity-content">
                    <p class="activity-message"
                       (click)="openTicket(event.ticketId)"
                       [class.clickable]="!!event.ticketId">
                      {{ event.message }}
                    </p>
                    <div class="activity-meta">
                      <span class="activity-actor">{{ event.actorName }}</span>
                      <span class="activity-dot-sep">•</span>
                      <span class="activity-time">{{ event.relativeTime }}</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </section>
      }
    </div>
  `,
  styles: [`
    .agent-team-page {
      max-width: 1400px;
      margin: 0 auto;
      padding: 32px 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 24px;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.04);
    }

    .card-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      gap: 12px;
    }

    .card-title {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
      font-family: 'Space Grotesk', sans-serif;
    }

    .card-count {
      background: var(--bg-secondary);
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 999px;
    }

    .card-subtitle {
      font-size: 12px;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .header-card {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.05));
      border-color: rgba(139, 92, 246, 0.2);
    }

    .header-content { display: flex; flex-direction: column; gap: 20px; }
    .header-main { display: flex; flex-direction: column; gap: 8px; }

    .header-badge {
      display: inline-flex;
      padding: 6px 12px;
      border-radius: 999px;
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-violet));
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      width: fit-content;
    }

    .header-title {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      color: var(--text-primary);
      font-family: 'Space Grotesk', sans-serif;
    }

    .header-info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px 24px;
    }

    .info-item { display: flex; flex-direction: column; gap: 6px; }
    .info-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-value {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .info-value.team-name { font-size: 18px; }
    .info-value.pill {
      display: inline-flex;
      padding: 4px 14px;
      border-radius: 999px;
      background: var(--bg-secondary);
      width: fit-content;
      font-size: 14px;
    }
    .info-value.pill.highlight {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.15));
      color: var(--accent-violet);
    }

    .manager-avatar {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-violet));
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
    }

    .team-selector {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 320px;
    }
    .team-selector label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
    }
    .team-select {
      padding: 10px 14px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text-primary);
      font-size: 14px;
      font-weight: 500;
    }

    .no-team-state {
      padding: 24px;
      text-align: center;
      background: var(--bg-secondary);
      border-radius: 18px;
    }
    .no-team-icon { font-size: 40px; margin-bottom: 8px; }
    .no-team-text { margin: 0; color: var(--text-secondary); font-size: 15px; }

    .kpi-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    .kpi-card {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .kpi-icon {
      width: 52px;
      height: 52px;
      border-radius: 16px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      flex-shrink: 0;
    }
    .kpi-icon.blue { background: rgba(59, 130, 246, 0.15); }
    .kpi-icon.violet { background: rgba(139, 92, 246, 0.15); }
    .kpi-icon.green { background: rgba(34, 197, 94, 0.15); }
    .kpi-info { display: flex; flex-direction: column; gap: 4px; }
    .kpi-label { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
    .kpi-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-primary);
      font-family: 'Space Grotesk', sans-serif;
      line-height: 1;
    }

    .two-column {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      align-items: start;
    }
    .column { display: flex; flex-direction: column; }

    .members-list, .workload-list, .activity-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .member-row {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      border-radius: 16px;
      background: var(--bg-secondary);
    }
    .member-row.current-user {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(139, 92, 246, 0.06));
      border: 1px solid rgba(139, 92, 246, 0.25);
    }

    .member-avatar {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-violet));
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 15px;
      position: relative;
      flex-shrink: 0;
    }
    .member-avatar::after {
      content: '';
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid var(--surface);
      background: #cbd5e1;
    }
    .member-avatar.online::after { background: #22c55e; }
    .member-avatar.offline::after { background: #94a3b8; }

    .member-info { flex: 1; min-width: 0; }
    .member-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 4px;
    }
    .member-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .you-badge {
      display: inline-flex;
      padding: 2px 8px;
      border-radius: 999px;
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-violet));
      color: #fff;
      font-size: 10px;
      font-weight: 600;
    }
    .you-badge.small { padding: 1px 7px; }

    .role-badge {
      display: inline-flex;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .role-badge.role-manager { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
    .role-badge.role-agent { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }

    .presence-text { font-size: 12px; font-weight: 500; }
    .presence-text.online { color: #22c55e; }
    .presence-text.offline { color: var(--text-secondary); }

    .member-tickets {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }
    .tickets-count {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
      font-family: 'Space Grotesk', sans-serif;
    }
    .tickets-label {
      font-size: 10px;
      color: var(--text-secondary);
      text-transform: uppercase;
    }

    .workload-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 14px 16px;
      border-radius: 16px;
      background: var(--bg-secondary);
    }
    .workload-item.current-user {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(139, 92, 246, 0.06));
      border: 1px solid rgba(139, 92, 246, 0.25);
    }
    .workload-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .workload-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .workload-count {
      font-size: 12px;
      color: var(--text-secondary);
      font-weight: 500;
    }
    .workload-bar-container {
      width: 100%;
      height: 10px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 5px;
      overflow: hidden;
    }
    .workload-bar {
      height: 100%;
      background: linear-gradient(90deg, var(--accent-blue), var(--accent-violet));
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    .workload-bar.high { background: linear-gradient(90deg, #f97316, #ef4444); }
    .workload-bar.medium { background: linear-gradient(90deg, #eab308, #f97316); }

    .empty-state {
      padding: 48px 24px;
      text-align: center;
      color: var(--text-secondary);
    }
    .empty-icon { font-size: 40px; margin-bottom: 8px; }
    .empty-list {
      padding: 24px;
      text-align: center;
      color: var(--text-secondary);
      font-size: 13px;
    }

    .activity-item {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 14px 16px;
      border-radius: 16px;
      background: var(--bg-secondary);
    }
    .activity-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-top: 6px;
      flex-shrink: 0;
      background: var(--text-secondary);
    }
    .activity-dot.created { background: #3b82f6; }
    .activity-dot.assigned { background: #6366f1; }
    .activity-dot.reassigned { background: #a855f7; }
    .activity-dot.status { background: #8b5cf6; }
    .activity-dot.escalation { background: #ef4444; }

    .activity-content { flex: 1; min-width: 0; }
    .activity-message {
      margin: 0 0 6px;
      font-size: 14px;
      color: var(--text-primary);
      line-height: 1.4;
    }
    .activity-message.clickable { cursor: pointer; }
    .activity-message.clickable:hover { color: var(--accent-violet); }
    .activity-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--text-secondary);
    }

    .loading-shimmer { display: flex; flex-direction: column; gap: 10px; }
    .loading-list { display: flex; flex-direction: column; gap: 14px; }
    .loading-row {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
    }
    .shimmer-line {
      height: 14px;
      border-radius: 6px;
      background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--border) 50%, var(--bg-secondary) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
    }
    .shimmer-line.w-full { width: 100%; }
    .shimmer-line.w-80 { width: 80%; }
    .shimmer-line.w-60 { width: 60%; }
    .shimmer-line.w-40 { width: 40%; }
    .shimmer-line.w-20 { width: 20%; }
    .shimmer-line.mt-4 { margin-top: 4px; }
    .shimmer-line.mb-8 { margin-bottom: 8px; }
    .shimmer-line.h-8 { height: 8px; }
    .shimmer-lines { display: flex; flex-direction: column; gap: 8px; }
    .shimmer-lines.flex-1 { flex: 1; }
    .shimmer-avatar {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      flex-shrink: 0;
      background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--border) 50%, var(--bg-secondary) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
    }
    .shimmer-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
      background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--border) 50%, var(--bg-secondary) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .mt-4 { margin-top: 4px; }

    @media (max-width: 1000px) {
      .kpi-row { grid-template-columns: 1fr; }
      .two-column { grid-template-columns: 1fr; }
    }
    @media (max-width: 560px) {
      .agent-team-page { padding: 20px 16px; }
      .header-info-grid { grid-template-columns: 1fr 1fr; }
    }
  `]
})
export class AgentTeamComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly assignmentService = inject(AssignmentService);
  readonly ticketService = inject(TicketService);
  readonly translate = inject(TranslateService);
  readonly router = inject(Router);

  readonly teams = signal<TeamResponse[]>([]);
  readonly selectedTeam = signal<MyTeamResponse | null>(null);
  selectedTeamId: string | null = null;

  readonly workload = signal<TeamMemberWorkloadResponse[]>([]);
  readonly allTickets = signal<TicketResponse[]>([]);
  readonly activity = signal<TeamActivityResponse[]>([]);

  readonly loading = {
    team: signal(false),
    workload: signal(false),
    tickets: signal(false),
    activity: signal(false)
  };

  readonly currentUserId = computed(() => this.authService.currentUser()?.id);

  readonly membersDisplay = computed<MemberDisplay[]>(() => {
    const me = this.currentUserId();
    // exclude managers from the members list — manager is shown in the header
    return this.workload().filter(w => (w.role || 'AGENT') !== 'MANAGER').map(w => {
      const name = w.fullName || w.userId.slice(0, 8);
      return {
        userId: w.userId,
        fullName: name,
        role: w.role || 'AGENT',
        isOnline: w.isOnline ?? null,
        activeTicketsCount: w.activeTicketsCount ?? 0,
        maxConcurrentTickets: w.maxConcurrentTickets ?? null,
        isCurrentUser: !!me && w.userId === me,
        initial: name.charAt(0).toUpperCase()
      };
    });
  });

  readonly workloadDisplay = computed<WorkloadDisplay[]>(() => {
    const me = this.currentUserId();
    // exclude managers from workload display
    const rows = this.workload().filter(w => (w.role || 'AGENT') !== 'MANAGER').map(w => {
      const name = w.fullName || w.userId.slice(0, 8);
      const tickets = w.activeTicketsCount ?? 0;
      const max = w.maxConcurrentTickets ?? 10;
      const load = Math.max(0, Math.min(100, Math.round((tickets / Math.max(1, max)) * 100)));
      return {
        userId: w.userId,
        name,
        tickets,
        load,
        isCurrentUser: !!me && w.userId === me
      };
    });
    rows.sort((a, b) => b.tickets - a.tickets || a.name.localeCompare(b.name));
    return rows;
  });

  readonly activityDisplay = computed<ActivityDisplay[]>(() =>
    this.activity().map(e => ({
      id: e.id,
      eventType: e.eventType,
      message: e.message,
      ticketId: e.ticketId,
      ticketTitle: e.ticketTitle,
      actorName: e.actorName,
      timestamp: e.timestamp,
      relativeTime: this.formatRelativeTime(e.timestamp)
    }))
  );

  readonly teamOpenTickets = computed(() => {
    const openStatuses: TicketStatus[] = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'PENDING', 'REOPENED'];
    const role = this.authService.currentUser()?.role;
    const teamId = this.selectedTeam()?.teamId;
    if (!teamId) return 0;

    if (role === 'AGENT') {
      const teamIds = new Set(this.teams().map(t => t.id));
      return this.allTickets().filter(t => t.teamId && teamIds.has(t.teamId) && openStatuses.includes(t.status)).length;
    }

    return this.allTickets().filter(t => t.teamId === teamId && openStatuses.includes(t.status)).length;
  });

  readonly myOpenTickets = computed(() => {
    const openStatuses: TicketStatus[] = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'PENDING', 'REOPENED'];
    const me = this.currentUserId();
    if (!me) return 0;
    return this.allTickets().filter(t =>
      t.assignedAgentId === me && openStatuses.includes(t.status)
    ).length;
  });

  readonly avgResolveTime = computed(() => '—');

  ngOnInit() {
    void this.loadAll();
  }

  async loadAll() {
    this.loading.team.set(true);
    try {
      const teams = await firstValueFrom(this.assignmentService.getMyTeams()).catch(e => {
        console.error('Failed to load my-teams:', e);
        return [] as TeamResponse[];
      });

      this.teams.set(teams || []);

      if (!teams || teams.length === 0) {
        this.selectedTeam.set(null);
        this.selectedTeamId = null;
      } else {
        const first = teams[0];
        this.selectedTeamId = first.id;
        this.selectedTeam.set({
          teamId: first.id,
          teamName: first.name,
          managerId: first.managerId,
          managerName: first.managerName,
          agentCount: first.agentCount ?? 0
        });
      }
    } catch (e) {
      console.error('Failed to load my-teams:', e);
      this.teams.set([]);
      this.selectedTeam.set(null);
      this.selectedTeamId = null;
    } finally {
      this.loading.team.set(false);
    }

    const teamId = this.selectedTeam()?.teamId;
    const role = this.authService.currentUser()?.role;

    if (role === 'AGENT') {
      // aggregate workloads and activities across all teams the agent belongs to
      const teamIds = this.teams().map(t => t.id);
      if (teamIds.length === 0) return;

      this.loading.workload.set(true);
      this.loading.tickets.set(true);
      this.loading.activity.set(true);
      try {
        const workloadPromises = teamIds.map(id =>
          firstValueFrom(this.ticketService.getTeamMembersWorkload(id)).catch(e => {
            console.error('Failed to load workload for team', id, e);
            return [] as TeamMemberWorkloadResponse[];
          })
        );

        const teamAgentsPromises = teamIds.map(id =>
          firstValueFrom(this.assignmentService.getTeamAgents(id)).catch(e => {
            console.error('Failed to load agents for team', id, e);
            return [] as AgentProfileResponse[];
          })
        );

        const activityPromises = teamIds.map(id =>
          firstValueFrom(this.ticketService.getTeamActivity(id, 24)).catch(e => {
            console.error('Failed to load activity for team', id, e);
            return [] as TeamActivityResponse[];
          })
        );

        const [workloadsArr, activitiesArr, tickets] = await Promise.all([
          Promise.all(workloadPromises),
          Promise.all(activityPromises),
          firstValueFrom(this.ticketService.getAllTickets()).catch(e => {
            console.error('Failed to load tickets:', e);
            return [] as TicketResponse[];
          })
        ]);

        const map = new Map<string, TeamMemberWorkloadResponse>();
        // seed map with all agents from the assignment service so even agents with zero
        // active tickets are shown
        for (const alist of await Promise.all(teamAgentsPromises)) {
          for (const a of alist) {
            if (!a || !a.userId) continue;
            const key = a.userId;
            if (!map.has(key)) {
              map.set(key, {
                userId: a.userId,
                fullName: a.fullName ?? (a.userId ? a.userId.slice(0, 8) : ''),
                role: 'AGENT',
                activeTicketsCount: 0,
                isOnline: a.isOnline ?? null,
                maxConcurrentTickets: a.maxConcurrentTickets ?? null
              });
            }
          }
        }

        for (const wlist of workloadsArr) {
          for (const w of wlist) {
            // skip empty entries
            const key = w.userId ?? (w.fullName ? `name:${w.fullName}` : undefined);
            if (!key) continue;
            const existing = map.get(key);
            if (!existing) {
              // normalize fields
              map.set(key, {
                userId: w.userId ?? key,
                fullName: w.fullName ?? (w.userId ? w.userId.slice(0, 8) : ''),
                role: w.role ?? 'AGENT',
                activeTicketsCount: w.activeTicketsCount ?? 0,
                isOnline: w.isOnline ?? null,
                maxConcurrentTickets: w.maxConcurrentTickets ?? null
              });
            } else {
              const merged: TeamMemberWorkloadResponse = {
                userId: existing.userId,
                fullName: existing.fullName || w.fullName,
                role: existing.role || w.role,
                activeTicketsCount: (existing.activeTicketsCount ?? 0) + (w.activeTicketsCount ?? 0),
                isOnline: (existing.isOnline ?? false) || (w.isOnline ?? false),
                maxConcurrentTickets: (existing.maxConcurrentTickets && w.maxConcurrentTickets)
                  ? Math.max(existing.maxConcurrentTickets, w.maxConcurrentTickets)
                  : (existing.maxConcurrentTickets ?? w.maxConcurrentTickets ?? null)
              };
              map.set(key, merged);
            }
          }
        }

        const mergedWorkload = Array.from(map.values());

        // merge and dedupe activities by id
        const activityMap = new Map<string, TeamActivityResponse>();
        for (const arr of activitiesArr) {
          for (const act of arr) {
            if (!act || !act.id) continue;
            const existing = activityMap.get(act.id);
            if (!existing) activityMap.set(act.id, act);
            else if ((act.timestamp || '') > (existing.timestamp || '')) activityMap.set(act.id, act);
          }
        }
        const mergedActivities = Array.from(activityMap.values()).sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

        this.workload.set(mergedWorkload);
        this.allTickets.set(tickets || []);
        this.activity.set(mergedActivities || []);
      } finally {
        this.loading.workload.set(false);
        this.loading.tickets.set(false);
        this.loading.activity.set(false);
      }
    } else if (teamId) {
      await this.loadTeamData(teamId);
    }
  }

  async loadTeamData(teamId: string) {
    this.loading.workload.set(true);
    this.loading.tickets.set(true);
    this.loading.activity.set(true);

    try {
      const [workload, tickets, activity, agents] = await Promise.all([
        firstValueFrom(this.ticketService.getTeamMembersWorkload(teamId)).catch(e => {
          console.error('Failed to load workload:', e);
          return [] as TeamMemberWorkloadResponse[];
        }),
        firstValueFrom(this.ticketService.getAllTickets()).catch(e => {
          console.error('Failed to load tickets:', e);
          return [] as TicketResponse[];
        }),
        firstValueFrom(this.ticketService.getTeamActivity(teamId, 24)).catch(e => {
          console.error('Failed to load activity:', e);
          return [] as TeamActivityResponse[];
        }),
        firstValueFrom(this.assignmentService.getTeamAgents(teamId)).catch(e => {
          console.error('Failed to load team agents:', e);
          return [] as AgentProfileResponse[];
        })
      ]);

      // Merge agents and workload so agents with zero tickets are included
      const map = new Map<string, TeamMemberWorkloadResponse>();
      for (const a of agents || []) {
        if (!a || !a.userId) continue;
        map.set(a.userId, {
          userId: a.userId,
          fullName: a.fullName ?? (a.userId ? a.userId.slice(0, 8) : ''),
          role: 'AGENT',
          activeTicketsCount: 0,
          isOnline: a.isOnline ?? null,
          maxConcurrentTickets: a.maxConcurrentTickets ?? null
        });
      }

      for (const w of workload || []) {
        if (!w || !w.userId) continue;
        const existing = map.get(w.userId);
        if (!existing) {
          map.set(w.userId, {
            userId: w.userId,
            fullName: w.fullName ?? (w.userId ? w.userId.slice(0, 8) : ''),
            role: w.role ?? 'AGENT',
            activeTicketsCount: w.activeTicketsCount ?? 0,
            isOnline: w.isOnline ?? null,
            maxConcurrentTickets: w.maxConcurrentTickets ?? null
          });
        } else {
          existing.activeTicketsCount = (existing.activeTicketsCount ?? 0) + (w.activeTicketsCount ?? 0);
          existing.isOnline = (existing.isOnline ?? false) || (w.isOnline ?? false);
          existing.maxConcurrentTickets = (existing.maxConcurrentTickets && w.maxConcurrentTickets)
            ? Math.max(existing.maxConcurrentTickets, w.maxConcurrentTickets)
            : (existing.maxConcurrentTickets ?? w.maxConcurrentTickets ?? null);
          map.set(existing.userId, existing);
        }
      }

      const merged = Array.from(map.values());

      this.workload.set(merged || []);
      this.allTickets.set(tickets || []);
      this.activity.set(activity || []);
    } finally {
      this.loading.workload.set(false);
      this.loading.tickets.set(false);
      this.loading.activity.set(false);
    }
  }

  onTeamSelect(id: string) {
    this.selectedTeamId = id;
    const found = this.teams().find(t => t.id === id);
    if (!found) {
      this.selectedTeam.set(null);
      this.workload.set([]);
      this.activity.set([]);
      return;
    }

    this.selectedTeam.set({
      teamId: found.id,
      teamName: found.name,
      managerId: found.managerId,
      managerName: found.managerName,
      agentCount: found.agentCount ?? 0
    });

    void this.loadTeamData(found.id);
  }

  openTicket(ticketId?: string) {
    if (!ticketId) return;
    this.router.navigate(['/tickets', ticketId]);
  }

  getEventDotClass(eventType: string): string {
    const t = (eventType || '').toLowerCase();
    if (t.includes('created')) return 'created';
    if (t.includes('reassigned')) return 'reassigned';
    if (t.includes('assigned')) return 'assigned';
    if (t.includes('escalation')) return 'escalation';
    if (t.includes('status')) return 'status';
    return 'default';
  }

  formatRelativeTime(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return this.translate.instant('AGENT_TEAM.JUST_NOW');
      if (diffMins < 60) return this.translate.instant('AGENT_TEAM.MINUTES_AGO', { count: diffMins });
      if (diffHours < 24) return this.translate.instant('AGENT_TEAM.HOURS_AGO', { count: diffHours });
      return this.translate.instant('AGENT_TEAM.DAYS_AGO', { count: diffDays });
    } catch {
      return '';
    }
  }
}