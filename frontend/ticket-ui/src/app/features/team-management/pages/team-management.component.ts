import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AssignmentService,
  TeamResponse,
  TeamRequest,
  AgentProfileResponse,
  AgentSkillRequest,
  AgentSkillResponse
} from '../../../core/services/assignment.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService, UserResponse } from '../../../core/services/auth.service';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

const CATEGORY_LIST: string[] = [
  'ACCOUNT_ACCESS',
  'BILLING',
  'TECHNICAL',
  'ORDER',
  'DELIVERY',
  'SECURITY',
  'INFORMATION',
  'OTHER'
];

const PRESET_SKILLS: string[] = [
  'JAVA',
  'ANGULAR',
  'BILLING',
  'NETWORK',
  'SECURITY',
  'DATABASE',
  'OTHER'
];

type CategoryBadgeMap = Record<string, string>;

@Component({
  selector: 'app-team-management',
  standalone: true,
  imports: [CommonModule, FormsModule, AlertComponent, TranslatePipe],
  template: `
    <div class="teams-page">
      <header class="page-header">
        <div>
          <h1 class="page-title">{{ 'TEAM_MANAGEMENT.PAGE_TITLE' | translate }}</h1>
          <p class="page-subtitle">{{ 'TEAM_MANAGEMENT.PAGE_SUBTITLE' | translate }}</p>
        </div>
        @if (isAdmin()) {
          <button class="btn btn-primary" (click)="openTeamModal()">
            <span class="btn-icon">+</span>
            {{ 'TEAM_MANAGEMENT.NEW_TEAM' | translate }}
          </button>
        }
      </header>

      @if (globalAlert()) {
        <app-alert [type]="globalAlert()!.type">
          {{ globalAlert()!.message }}
        </app-alert>
      }

      <div class="content-grid">
        <!-- LEFT : Teams list -->
        <section class="teams-col">
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">{{ 'TEAM_MANAGEMENT.TEAMS_TITLE' | translate:{count: teams().length} }}</h2>
            </div>

            @if (loading.teams) {
              <div class="loading">{{ 'TEAM_MANAGEMENT.LOADING_TEAMS' | translate }}</div>
            }

            <div class="teams-list">
              @for (team of teams(); track team.id) {
                <div
                  class="team-card"
                  [class.active]="selectedTeamId() === team.id"
                  (click)="selectTeam(team.id)"
                >
                  <div class="team-card-header">
                    <div class="team-name">{{ team.name }}</div>
                    @if (isAdmin()) {
                      <div class="team-actions">
                        <button class="icon-btn" title="{{ 'TEAM_MANAGEMENT.EDIT' | translate }}" (click)="openTeamModal(team, $event)">✎</button>
                        <button class="icon-btn danger" title="{{ 'TEAM_MANAGEMENT.DELETE' | translate }}" (click)="openDeleteTeamModal(team, $event)">🗑</button>
                      </div>
                    }
                  </div>

                  <div class="team-badges">
                    @for (cat of team.managedCategories; track cat) {
                      <span [class]="'badge badge-' + getBadgeStyle(cat)">{{ cat }}</span>
                    }
                  </div>

                  <div class="team-meta">
                    <span class="meta-item">👥 {{ team.agentCount }} {{ 'TEAM_MANAGEMENT.AGENTS_SUFFIX' | translate }}</span>
                    @if (team.managerName) {
                      <span class="meta-item">👤 {{ team.managerName }}</span>
                    } @else {
                      <span class="meta-item">👤 {{ 'TEAM_MANAGEMENT.NO_MANAGER_ASSIGNED' | translate }}</span>
                    }
                  </div>
                </div>
              } @empty {
                @if (!loading.teams) {
                  <div class="empty">{{ 'TEAM_MANAGEMENT.NO_TEAMS' | translate }}</div>
                }
              }
            </div>
          </div>
        </section>

        <!-- RIGHT : Team detail -->
        <section class="detail-col">
          <div class="card">
            @if (!selectedTeam()) {
              <div class="empty-detail">
                <div class="empty-detail-icon">👥</div>
                <h3>{{ 'TEAM_MANAGEMENT.SELECT_TEAM_PROMPT' | translate }}</h3>
                <p>{{ 'TEAM_MANAGEMENT.SELECT_TEAM_HELP' | translate }}</p>
              </div>
            } @else {
              <div class="detail-header">
                <div>
                  <h2 class="card-title">{{ selectedTeam()!.name }}</h2>
                  <div class="team-badges">
                    @for (cat of selectedTeam()!.managedCategories; track cat) {
                      <span [class]="'badge badge-' + getBadgeStyle(cat)">{{ cat }}</span>
                    }
                  </div>
                  @if (selectedTeam()!.managerName) {
                    <p class="manager-info">{{ 'TEAM_MANAGEMENT.MANAGER_LABEL' | translate }}: <b>{{ selectedTeam()!.managerName }}</b></p>
                  } @else {
                    <p class="manager-info">{{ 'TEAM_MANAGEMENT.MANAGER_LABEL' | translate }}: <b>{{ 'TEAM_MANAGEMENT.NO_MANAGER_ASSIGNED' | translate }}</b></p>
                  }
                </div>

                @if (isAdmin()) {
                  <div class="add-agent-row">
                    <select
                      [disabled]="loading.addAgent || availableAgents().length === 0"
                      [(ngModel)]="pendingAgentId"
                      class="input"
                    >
                      <option [ngValue]="null">
                        @if (loading.availableAgents) { {{ 'TEAM_MANAGEMENT.LOADING_AGENTS' | translate }} }
                        @else if (availableAgents().length === 0) { {{ 'TEAM_MANAGEMENT.NO_AGENT_AVAILABLE' | translate }} }
                        @else { {{ 'TEAM_MANAGEMENT.SELECT_AGENT' | translate }} }
                      </option>
                      @for (u of availableAgents(); track u.id) {
                        <option [ngValue]="u.id">{{ u.fullName }} ({{ u.email }})</option>
                      }
                    </select>
                    <button
                      class="btn btn-primary"
                      [disabled]="!pendingAgentId() || loading.addAgent"
                      (click)="addAgentToTeam()"
                    >
                      @if (loading.addAgent) { {{ 'TEAM_MANAGEMENT.ADDING_AGENT' | translate }} } @else { {{ 'TEAM_MANAGEMENT.ADD_AGENT' | translate }} }
                    </button>
                  </div>
                }
              </div>

              @if (loading.teamAgents) {
                <div class="loading">{{ 'TEAM_MANAGEMENT.LOADING_TEAM_AGENTS' | translate }}</div>
              }

              <div class="agents-list">
                @for (agent of teamAgents(); track agent.id) {
                  <div class="agent-card">
                    <div class="agent-header">
                      <div class="agent-identity">
                        <div [class]="'status-dot ' + (agent.isOnline ? 'online' : 'offline')"></div>
                        <div>
                          <div class="agent-name">
                            {{ userById(agent.userId)?.fullName || ('TEAM_MANAGEMENT.AGENT_PLACEHOLDER' | translate:{ id: agent.userId.slice(0, 6) }) }}
                          </div>
                          <div class="agent-email">
                            {{ userById(agent.userId)?.email || agent.userId }}
                          </div>
                        </div>
                      </div>
                      <div class="agent-actions">
                        <button class="btn btn-ghost" (click)="openSkillsModal(agent)">{{ 'TEAM_MANAGEMENT.EDIT_SKILLS' | translate }}</button>
                        @if (canManageSelectedTeam()) {
                          <button
                            class="btn btn-danger-ghost"
                            [disabled]="loading.removeAgent[agent.id]"
                            (click)="removeAgentFromTeam(agent)"
                          >
                            {{ 'TEAM_MANAGEMENT.REMOVE_FROM_TEAM' | translate }}
                          </button>
                        }
                      </div>
                    </div>

                    <div class="agent-stats">
                      <span class="stat">
                        <span class="stat-label">{{ 'TEAM_MANAGEMENT.STATUS_LABEL' | translate }}</span>
                        <span [class]="'stat-value ' + (agent.isOnline ? 'ok' : 'dim')">
                          {{ agent.isOnline ? ('TEAM_MANAGEMENT.ONLINE' | translate) : ('TEAM_MANAGEMENT.OFFLINE' | translate) }}
                        </span>
                      </span>
                      <span class="stat">
                        <span class="stat-label">{{ 'TEAM_MANAGEMENT.MAX_TICKETS' | translate }}</span>
                        <span class="stat-value">{{ agent.maxConcurrentTickets }}</span>
                      </span>
                    </div>

                    <div class="skills-block">
                      <div class="skills-title">{{ 'TEAM_MANAGEMENT.SKILLS' | translate }}</div>
                      @if (agent.skills.length === 0) {
                        <div class="skills-empty">{{ 'TEAM_MANAGEMENT.NO_SKILLS' | translate }}</div>
                      }
                      <div class="skills-grid">
                        @for (skill of agent.skills; track skill.id) {
                          <div class="skill-pill">
                            <span class="skill-name">{{ skill.skillName }}</span>
                            <span class="skill-stars">
                              @for (n of [1,2,3,4,5]; track n) {
                                <span [class]="'star ' + (n <= skill.level ? 'filled' : '')">★</span>
                              }
                            </span>
                          </div>
                        }
                      </div>
                    </div>
                  </div>
                } @empty {
                  @if (!loading.teamAgents) {
                    <div class="empty">{{ 'TEAM_MANAGEMENT.NO_TEAM_AGENTS' | translate }}</div>
                  }
                }
              </div>
            }
          </div>
        </section>
      </div>

      <!-- MODAL : NEW / EDIT TEAM -->
      @if (teamModal.open) {
        <div class="modal-backdrop" (click)="closeTeamModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <header class="modal-header">
              <h3>
                {{ teamModal.team ? ('TEAM_MANAGEMENT.EDIT_TEAM' | translate) : ('TEAM_MANAGEMENT.NEW_TEAM' | translate) }}
              </h3>
              <button class="icon-btn" (click)="closeTeamModal()">✕</button>
            </header>
            <div class="modal-body">
              @if (teamModal.alert) {
                <app-alert [type]="teamModal.alert.type">{{ teamModal.alert.message }}</app-alert>
              }

              <label class="form-label">{{ 'TEAM_MANAGEMENT.TEAM_NAME_LABEL' | translate }}</label>
              <input
                class="input"
                [(ngModel)]="teamModal.form.name"
                placeholder="{{ 'TEAM_MANAGEMENT.TEAM_NAME_PLACEHOLDER' | translate }}"
                [disabled]="teamModal.loading"
              />

              <label class="form-label" style="margin-top: 1rem;">{{ 'TEAM_MANAGEMENT.TEAM_MANAGER_LABEL' | translate }}</label>
              <select
                class="input"
                [(ngModel)]="teamModal.form.managerId"
                [disabled]="teamModal.loading"
              >
                <option value="">{{ 'TEAM_MANAGEMENT.SELECT_MANAGER' | translate }}</option>
                @for (m of availableManagers(); track m.id) {
                  <option [value]="m.id">{{ m.fullName }} ({{ m.email }})</option>
                }
              </select>

              <label class="form-label" style="margin-top: 1rem;">{{ 'TEAM_MANAGEMENT.MANAGED_CATEGORIES' | translate }}</label>
              <div class="checkbox-grid">
                @for (cat of CATEGORY_LIST; track cat) {
                  <label class="checkbox-row">
                    <input
                      type="checkbox"
                      [disabled]="teamModal.loading"
                      [checked]="teamModal.form.managedCategories.includes(cat)"
                      (change)="toggleCategory(cat)"
                    />
                    <span [class]="'badge badge-' + getBadgeStyle(cat)">{{ cat }}</span>
                  </label>
                }
              </div>
            </div>
            <footer class="modal-footer">
              <button class="btn btn-ghost" [disabled]="teamModal.loading" (click)="closeTeamModal()">{{ 'APP.CANCEL' | translate }}</button>
              <button
                class="btn btn-primary"
                [disabled]="teamModal.loading || !canSaveTeam()"
                (click)="saveTeam()"
              >
                {{ teamModal.loading ? ('LOADING' | translate) : ('SAVE' | translate) }}
              </button>
            </footer>
          </div>
        </div>
      }

      <!-- MODAL : DELETE TEAM -->
      @if (deleteTeamModal.open && deleteTeamModal.team) {
        <div class="modal-backdrop" (click)="closeDeleteTeamModal()">
          <div class="modal small" (click)="$event.stopPropagation()">
            <header class="modal-header">
              <h3>{{ 'TEAM_MANAGEMENT.DELETE_TEAM' | translate }}</h3>
              <button class="icon-btn" (click)="closeDeleteTeamModal()">✕</button>
            </header>
            <div class="modal-body">
              @if (deleteTeamModal.alert) {
                <app-alert [type]="deleteTeamModal.alert.type">{{ deleteTeamModal.alert.message }}</app-alert>
              }
              @if (deleteTeamModal.team.agentCount > 0) {
                <div class="danger-block">
                  {{ 'TEAM_MANAGEMENT.DELETE_TEAM_WARNING' | translate:{count: deleteTeamModal.team.agentCount} }}
                </div>
              }
              <p>{{ 'TEAM_MANAGEMENT.DELETE_TEAM_CONFIRM' | translate:{name: deleteTeamModal.team.name} }}</p>
            </div>
            <footer class="modal-footer">
              <button class="btn btn-ghost" [disabled]="deleteTeamModal.loading" (click)="closeDeleteTeamModal()">{{ 'APP.CANCEL' | translate }}</button>
              <button
                class="btn btn-danger"
                [disabled]="deleteTeamModal.loading || deleteTeamModal.team.agentCount > 0"
                (click)="confirmDeleteTeam()"
              >
                {{ deleteTeamModal.loading ? ('DING' | translate) : ('TEAM_MANAGEMENT.DELETE' | translate) }}
              </button>
            </footer>
          </div>
        </div>
      }

      <!-- MODAL : EDIT SKILLS -->
      @if (skillsModal.open && skillsModal.agent) {
        <div class="modal-backdrop" (click)="closeSkillsModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <header class="modal-header">
              <div>
                <h3>{{ 'TEAM_MANAGEMENT.AGENT_SKILLS' | translate }}</h3>
                <p class="modal-subtitle">
                  {{ userById(skillsModal.agent.userId)?.fullName || skillsModal.agent.userId }}
                </p>
              </div>
              <button class="icon-btn" (click)="closeSkillsModal()">✕</button>
            </header>
            <div class="modal-body">
              @if (skillsModal.alert) {
                <app-alert [type]="skillsModal.alert.type">{{ skillsModal.alert.message }}</app-alert>
              }

              <div class="skills-list-edit">
                @if (skillsModal.agent.skills.length === 0) {
                  <div class="empty">{{ 'TEAM_MANAGEMENT.NO_SKILLS' | translate }}</div>
                }
                @for (skill of skillsModal.agent.skills; track skill.id) {
                  <div class="skill-edit-row">
                    <div class="skill-pill">
                      <span class="skill-name">{{ skill.skillName }}</span>
                      <span class="skill-stars">
                        @for (n of [1,2,3,4,5]; track n) {
                          <span [class]="'star ' + (n <= skill.level ? 'filled' : '')">★</span>
                        }
                      </span>
                    </div>
                    <button
                      class="icon-btn danger"
                      [disabled]="skillsModal.loading || loading.deleteSkill[skill.id]"
                      (click)="confirmDeleteSkill(skill)"
                    >🗑</button>
                  </div>
                }
              </div>

              <div class="divider"></div>

              <label class="form-label">{{ 'TEAM_MANAGEMENT.ADD_SKILL_LABEL' | translate }}</label>
              <div class="row-inputs">
                <select class="input" [(ngModel)]="skillsModal.form.skillName" [disabled]="skillsModal.loading">
                  @for (s of PRESET_SKILLS; track s) {
                    <option [value]="s">{{ s }}</option>
                  }
                </select>
                <select class="input" [(ngModel)]="skillsModal.form.level" [disabled]="skillsModal.loading">
                  <option [ngValue]="1">{{ 'TEAM_MANAGEMENT.SKILL_LEVEL_1' | translate }}</option>
                  <option [ngValue]="2">{{ 'TEAM_MANAGEMENT.SKILL_LEVEL_2' | translate }}</option>
                  <option [ngValue]="3">{{ 'TEAM_MANAGEMENT.SKILL_LEVEL_3' | translate }}</option>
                  <option [ngValue]="4">{{ 'TEAM_MANAGEMENT.SKILL_LEVEL_4' | translate }}</option>
                  <option [ngValue]="5">{{ 'TEAM_MANAGEMENT.SKILL_LEVEL_5' | translate }}</option>
                </select>
                <button
                  class="btn btn-primary"
                  [disabled]="skillsModal.loading || !skillsModal.form.skillName"
                  (click)="confirmAddSkill()"
                >
                  {{ skillsModal.loading ? ('APP.ADDING' | translate) : ('TEAM_MANAGEMENT.ADD_SKILL' | translate) }}
                </button>
              </div>
            </div>
            <footer class="modal-footer">
              <button class="btn btn-ghost" [disabled]="skillsModal.loading" (click)="closeSkillsModal()">{{ 'TEAM_MANAGEMENT.CLOSE' | translate }}</button>
            </footer>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .teams-page{max-width:1400px;margin:0 auto;padding:32px 24px;display:flex;flex-direction:column;gap:24px}
    .page-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
    .page-title{font-family:'Space Grotesk',sans-serif;font-size:32px;color:var(--text-primary);margin:0 0 4px;font-weight:700}
    .page-subtitle{margin:0;color:var(--text-secondary);font-size:15px}
    .btn{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;border:none;transition:all .2s ease}
    .btn:disabled{opacity:.5;cursor:not-allowed}
    .btn-icon{font-weight:700;font-size:16px}
    .btn-primary{background:linear-gradient(135deg,var(--accent-blue),var(--accent-violet));color:#fff}
    .btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 24px rgba(79,70,229,.35)}
    .btn-danger{background:#EF4444;color:#fff}
    .btn-danger:hover:not(:disabled){background:#DC2626}
    .btn-danger-ghost{background:transparent;color:#EF4444;border:1px solid rgba(239,68,68,.25)}
    .btn-danger-ghost:hover:not(:disabled){background:rgba(239,68,68,.08)}
    .btn-ghost{background:transparent;color:var(--text-secondary);border:1px solid var(--border)}
    .btn-ghost:hover:not(:disabled){background:var(--bg-secondary);color:var(--text-primary)}
    .content-grid{display:grid;grid-template-columns:380px 1fr;gap:24px;align-items:flex-start}
    .card{background-color:var(--surface);border:1px solid var(--border);border-radius:24px;padding:24px;box-shadow:0 12px 32px rgba(15,23,42,.04)}
    .card-header{margin-bottom:20px;display:flex;align-items:center;justify-content:space-between}
    .card-title{margin:0;font-size:20px;font-weight:700;color:var(--text-primary);font-family:'Space Grotesk',sans-serif}
    .teams-list{display:flex;flex-direction:column;gap:12px}
    .team-card{padding:16px;border-radius:18px;border:1px solid var(--border);background:var(--surface);cursor:pointer;transition:all .2s ease}
    .team-card:hover{border-color:var(--accent-violet);transform:translateY(-1px)}
    .team-card.active{border-color:var(--accent-violet);background:linear-gradient(135deg,rgba(99,102,241,.08),rgba(139,92,246,.08));box-shadow:0 0 0 1px rgba(139,92,246,.25)}
    .team-card-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
    .team-name{font-size:16px;font-weight:700;color:var(--text-primary)}
    .team-actions{display:flex;gap:4px}
    .icon-btn{width:32px;height:32px;border-radius:10px;border:none;background:var(--bg-secondary);color:var(--text-secondary);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:14px;transition:all .15s ease}
    .icon-btn:hover{background:rgba(139,92,246,.12);color:var(--accent-violet)}
    .icon-btn.danger:hover{background:rgba(239,68,68,.1);color:#EF4444}
    .icon-btn:disabled{opacity:.4;cursor:not-allowed}
    .team-badges{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
    .badge{display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:.3px;text-transform:uppercase}
    .badge-ACCOUNT_ACCESS{background:rgba(59,130,246,.12);color:#3B82F6}
    .badge-BILLING{background:rgba(16,185,129,.12);color:#10B981}
    .badge-TECHNICAL{background:rgba(99,102,241,.12);color:#6366F1}
    .badge-ORDER{background:rgba(245,158,11,.12);color:#F59E0B}
    .badge-DELIVERY{background:rgba(168,85,247,.12);color:#A855F7}
    .badge-SECURITY{background:rgba(239,68,68,.12);color:#EF4444}
    .badge-INFORMATION{background:rgba(6,182,212,.12);color:#06B6D4}
    .badge-OTHER{background:rgba(100,116,139,.12);color:#64748B}
    .team-meta{display:flex;align-items:center;gap:14px;color:var(--text-secondary);font-size:13px;flex-wrap:wrap}
    .manager-info{margin:8px 0 0;font-size:13px;color:var(--text-secondary)}
    .loading,.empty{padding:24px 8px;text-align:center;color:var(--text-secondary);font-size:14px}
    .empty-detail{padding:60px 24px;text-align:center;color:var(--text-secondary)}
    .empty-detail-icon{font-size:56px;margin-bottom:16px}
    .empty-detail h3{margin:0 0 8px;color:var(--text-primary);font-family:'Space Grotesk',sans-serif;font-weight:700}
    .detail-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:24px;flex-wrap:wrap}
    .add-agent-row{display:flex;gap:8px;min-width:320px;max-width:100%;flex-wrap:wrap}
    .input{padding:10px 14px;border-radius:12px;border:1px solid var(--border);background:var(--surface);color:var(--text-primary);font-size:14px;outline:none;transition:border-color .2s ease;flex:1;min-width:220px}
    .input:focus{border-color:var(--accent-violet);box-shadow:0 0 0 3px rgba(139,92,246,.15)}
    .agents-list{display:flex;flex-direction:column;gap:14px}
    .agent-card{padding:18px;border:1px solid var(--border);border-radius:20px;background:var(--bg-secondary)}
    .agent-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap}
    .agent-identity{display:flex;align-items:center;gap:12px}
    .status-dot{width:12px;height:12px;border-radius:50%;flex:0 0 auto}
    .status-dot.online{background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.2)}
    .status-dot.offline{background:#94a3b8;box-shadow:0 0 0 3px rgba(148,163,184,.2)}
    .agent-name{font-size:15px;font-weight:700;color:var(--text-primary)}
    .agent-email{font-size:13px;color:var(--text-secondary)}
    .agent-actions{display:flex;gap:8px;flex-wrap:wrap}
    .agent-stats{display:flex;gap:24px;margin-bottom:14px;flex-wrap:wrap}
    .stat{display:flex;flex-direction:column;gap:2px}
    .stat-label{font-size:11px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.5px}
    .stat-value{font-size:14px;font-weight:600;color:var(--text-primary)}
    .stat-value.ok{color:#22c55e}
    .stat-value.dim{color:var(--text-secondary)}
    .skills-block{margin-top:6px}
    .skills-title{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--text-secondary);margin-bottom:8px}
    .skills-empty{font-size:13px;color:var(--text-secondary);margin-bottom:6px}
    .skills-grid{display:flex;flex-wrap:wrap;gap:8px}
    .skill-pill{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:var(--surface);border:1px solid var(--border);font-size:13px;font-weight:600;color:var(--text-primary)}
    .skill-stars{display:inline-flex;gap:1px;font-size:12px;letter-spacing:.5px}
    .star{color:rgba(148,163,184,.35)}
    .star.filled{color:#F59E0B}
    .modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(4px);z-index:100;display:flex;align-items:center;justify-content:center;padding:24px}
    .modal{background:var(--surface);border:1px solid var(--border);border-radius:24px;width:100%;max-width:560px;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 30px 80px rgba(15,23,42,.3)}
    .modal.small{max-width:440px}
    .modal-header{display:flex;align-items:flex-start;justify-content:space-between;padding:22px 24px 16px;border-bottom:1px solid var(--border)}
    .modal-header h3{margin:0;font-family:'Space Grotesk',sans-serif;font-size:20px;color:var(--text-primary);font-weight:700}
    .modal-subtitle{margin:4px 0 0;font-size:13px;color:var(--text-secondary)}
    .modal-body{padding:20px 24px;overflow-y:auto;flex:1}
    .modal-footer{padding:16px 24px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}
    .form-label{display:block;font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:8px}
    .checkbox-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .checkbox-row{display:inline-flex;align-items:center;gap:10px;padding:8px 12px;border-radius:12px;border:1px solid var(--border);cursor:pointer;font-size:12px;user-select:none}
    .checkbox-row input{cursor:pointer}
    .row-inputs{display:flex;gap:8px;flex-wrap:wrap}
    .skills-list-edit{display:flex;flex-direction:column;gap:8px;margin-bottom:8px}
    .skill-edit-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 4px}
    .divider{height:1px;background:var(--border);margin:20px 0}
    .danger-block{padding:14px 16px;border-radius:12px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);color:#ef4444;margin-bottom:14px;font-size:14px}
    @media (max-width:1100px){.content-grid{grid-template-columns:1fr}}
    @media (max-width:560px){.teams-page{padding:20px 16px}.checkbox-grid{grid-template-columns:1fr}.modal{border-radius:20px}}
  `]
})
export class TeamManagementComponent implements OnInit {
  private readonly assignmentService = inject(AssignmentService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);

  readonly CATEGORY_LIST = CATEGORY_LIST;
  readonly PRESET_SKILLS = PRESET_SKILLS;
  readonly currentUser = this.authService.currentUser;
  private readonly translate = inject(TranslateService);

  readonly teams = signal<TeamResponse[]>([]);
  readonly selectedTeamId = signal<string | null>(null);
  readonly selectedTeam = signal<TeamResponse | null>(null);
  readonly teamAgents = signal<AgentProfileResponse[]>([]);

  readonly users = signal<UserResponse[]>([]);
  readonly userMap = signal<Record<string, UserResponse>>({});
  readonly availableAgents = signal<UserResponse[]>([]);
  readonly availableManagers = signal<UserResponse[]>([]);
  readonly pendingAgentId = signal<string | null>(null);

  readonly globalAlert = signal<{ type: 'success' | 'error' | 'info' | 'warning'; message: string } | null>(null);

  readonly loading = {
    teams: false,
    teamAgents: false,
    availableAgents: false,
    addAgent: false,
    removeAgent: {} as Record<string, boolean>,
    skills: {} as Record<string, boolean>,
    deleteSkill: {} as Record<string, boolean>
  };

  readonly teamModal = {
    open: false,
    team: null as TeamResponse | null,
    loading: false,
    form: {
      name: '',
      managedCategories: [] as string[],
      managerId: ''
    },
    alert: null as { type: 'success' | 'error' | 'info' | 'warning'; message: string } | null
  };

  readonly deleteTeamModal = {
    open: false,
    team: null as TeamResponse | null,
    loading: false,
    alert: null as { type: 'success' | 'error' | 'info' | 'warning'; message: string } | null
  };

  readonly skillsModal = {
    open: false,
    agent: null as AgentProfileResponse | null,
    loading: false,
    form: { skillName: 'JAVA', level: 3 } as AgentSkillRequest,
    alert: null as { type: 'success' | 'error' | 'info' | 'warning'; message: string } | null
  };

  ngOnInit() {
    void this.loadAll();
  }

  async loadAll() {
    this.loading.teams = true;
    this.loading.availableAgents = this.isAdmin();
    try {
      const teamsPromise = firstValueFrom(this.assignmentService.getTeams());
      const agentsPromise = this.isAdmin()
        ? firstValueFrom(this.userService.getUsers(undefined, 'AGENT', true))
        : Promise.resolve([] as UserResponse[]);
      const managersPromise = this.isAdmin()
        ? firstValueFrom(this.assignmentService.getAvailableManagers())
        : Promise.resolve([] as UserResponse[]);

      const [teams, agents, managers] = await Promise.all([
        teamsPromise,
        agentsPromise,
        managersPromise
      ]);

      this.teams.set(teams);
      this.users.set(agents);
      this.availableManagers.set(managers);

      const map: Record<string, UserResponse> = {};
      agents.forEach(u => (map[u.id] = u));
      managers.forEach(u => (map[u.id] = u));
      this.userMap.set(map);

      await this.refreshAvailableAgents();

      const selectedId = this.selectedTeamId();
      if (selectedId && teams.some(team => team.id === selectedId)) {
        await this.selectTeam(selectedId);
      } else if (teams.length > 0) {
        await this.selectTeam(teams[0].id);
      } else {
        this.selectedTeamId.set(null);
        this.selectedTeam.set(null);
        this.teamAgents.set([]);
      }
    } catch (e: any) {
      this.setGlobalAlert('error', this.translate.instant('TEAM_MANAGEMENT.ALERT_LOAD_DATA_FAILED'));
      console.error(e);
    } finally {
      this.loading.teams = false;
      this.loading.availableAgents = false;
    }
  }

  async refreshAvailableAgents() {
    if (!this.isAdmin()) {
      this.availableAgents.set([]);
      return;
    }

    try {
      const allUsers = this.users();
      this.availableAgents.set(allUsers);
    } catch (e) {
      console.error('Failed to load available agents', e);
    }
  }

  userById(userId: string): UserResponse | undefined {
    return this.userMap()[userId];
  }

  isAdmin(): boolean {
    const user = this.currentUser();
    return user?.role === 'ADMIN';
  }

  isManager(): boolean {
    const user = this.currentUser();
    return user?.role === 'MANAGER';
  }

  canManageSelectedTeam(): boolean {
    if (this.isAdmin()) return true;
    const team = this.selectedTeam();
    const user = this.currentUser();
    if (!team || !user) return false;
    return team.managerId === user.id;
  }

  async selectTeam(teamId: string) {
    this.selectedTeamId.set(teamId);
    const found = this.teams().find(t => t.id === teamId) || null;
    this.selectedTeam.set(found);

    if (!teamId) {
      this.teamAgents.set([]);
      return;
    }

    this.loading.teamAgents = true;
    try {
      const agents = await firstValueFrom(this.assignmentService.getTeamAgents(teamId));
      this.teamAgents.set(agents);
      
      const missingIds = agents
        .map(a => a.userId)
        .filter(id => !this.userMap()[id]);

      if (missingIds.length > 0) {
        // Fetch each missing user individually and catch 500 errors so one bad ID doesn't crash everything
        const userPromises = missingIds.map(async id => {
          try {
            return await firstValueFrom(this.userService.getUserById(id));
          } catch (err) {
            console.warn(`Could not fetch user details for ID: ${id}`, err);
            return null;
          }
        });

        const fetchedUsers = await Promise.all(userPromises);
        const map = { ...this.userMap() };
        fetchedUsers.forEach(u => {
          if (u) map[u.id] = u;
        });
        this.userMap.set(map);
      }
    } catch (e) {
      this.setGlobalAlert('error', this.translate.instant('TEAM_MANAGEMENT.ALERT_LOAD_TEAM_AGENTS_FAILED'));
    } finally {
      this.loading.teamAgents = false;
    }
  }

  getBadgeStyle(category: string): string {
    return category;
  }

  setGlobalAlert(type: 'success' | 'error' | 'info' | 'warning', message: string) {
    this.globalAlert.set({ type, message });
    setTimeout(() => {
      if (this.globalAlert()?.message === message) {
        this.globalAlert.set(null);
      }
    }, 5000);
  }

  openTeamModal(team?: TeamResponse, event?: Event) {
    if (!this.isAdmin()) return;
    event?.stopPropagation();
    if (team) {
      this.teamModal.team = team;
      this.teamModal.form = {
        name: team.name,
        managedCategories: [...team.managedCategories],
        managerId: team.managerId || ''
      };
    } else {
      this.teamModal.team = null;
      this.teamModal.form = {
        name: '',
        managedCategories: [],
        managerId: ''
      };
    }
    this.teamModal.alert = null;
    this.teamModal.open = true;
  }

  closeTeamModal() {
    this.teamModal.open = false;
    this.teamModal.team = null;
    this.teamModal.alert = null;
  }

  toggleCategory(cat: string) {
    const cats = this.teamModal.form.managedCategories;
    const index = cats.indexOf(cat);
    if (index > -1) {
      cats.splice(index, 1);
    } else {
      cats.push(cat);
    }
  }

  canSaveTeam(): boolean {
    return !!this.teamModal.form.name.trim() && this.teamModal.form.managedCategories.length > 0;
  }

  async saveTeam() {
    this.teamModal.loading = true;
    try {
      const req: TeamRequest = {
        name: this.teamModal.form.name,
        managedCategories: this.teamModal.form.managedCategories,
        managerId: this.teamModal.form.managerId || ''
      };

      if (this.teamModal.team) {
        await firstValueFrom(this.assignmentService.updateTeam(this.teamModal.team.id, req));
        this.setGlobalAlert('success', this.translate.instant('TEAM_MANAGEMENT.ALERT_TEAM_UPDATED'));
      } else {
        await firstValueFrom(this.assignmentService.createTeam(req));
        this.setGlobalAlert('success', this.translate.instant('TEAM_MANAGEMENT.ALERT_TEAM_CREATED'));
      }

      this.closeTeamModal();
      await this.loadAll();
    } catch (e) {
      this.teamModal.alert = { type: 'error', message: this.translate.instant('TEAM_MANAGEMENT.ALERT_SAVE_TEAM_FAILED') };
    } finally {
      this.teamModal.loading = false;
    }
  }

  openDeleteTeamModal(team: TeamResponse, event: Event) {
    event.stopPropagation();
    this.deleteTeamModal.team = team;
    this.deleteTeamModal.alert = null;
    this.deleteTeamModal.open = true;
  }

  closeDeleteTeamModal() {
    this.deleteTeamModal.open = false;
  }

  async confirmDeleteTeam() {
    const team = this.deleteTeamModal.team;
    if (!team) return;

    this.deleteTeamModal.loading = true;
    try {
      await firstValueFrom(this.assignmentService.deleteTeam(team.id));
      this.setGlobalAlert('success', this.translate.instant('TEAM_MANAGEMENT.ALERT_TEAM_DELETED'));
      this.closeDeleteTeamModal();
      await this.loadAll();
    } catch (e) {
      this.deleteTeamModal.alert = { type: 'error', message: this.translate.instant('TEAM_MANAGEMENT.ALERT_DELETE_TEAM_FAILED') };
    } finally {
      this.deleteTeamModal.loading = false;
    }
  }

  async addAgentToTeam() {
    const teamId = this.selectedTeamId();
    const agentUserId = this.pendingAgentId();
    if (!teamId || !agentUserId) return;

    this.loading.addAgent = true;
    try {
      await firstValueFrom(this.assignmentService.addAgentToTeam(teamId, agentUserId));
      this.pendingAgentId.set(null);
      this.setGlobalAlert('success', this.translate.instant('TEAM_MANAGEMENT.ALERT_AGENT_ADDED'));
      await this.selectTeam(teamId);
      await this.refreshAvailableAgents();
    } catch (e) {
      this.setGlobalAlert('error', this.translate.instant('TEAM_MANAGEMENT.ALERT_ADD_AGENT_FAILED'));
    } finally {
      this.loading.addAgent = false;
    }
  }

  async removeAgentFromTeam(agent: AgentProfileResponse) {
    const teamId = this.selectedTeamId();
    if (!teamId || !agent.userId) return;

    this.loading.removeAgent[agent.id] = true;
    try {
      await firstValueFrom(this.assignmentService.removeAgentFromTeam(teamId, agent.userId));
      this.setGlobalAlert('success', this.translate.instant('TEAM_MANAGEMENT.ALERT_AGENT_REMOVED'));
      await this.selectTeam(teamId);
      await this.refreshAvailableAgents();
    } catch (e) {
      this.setGlobalAlert('error', this.translate.instant('TEAM_MANAGEMENT.ALERT_REMOVE_AGENT_FAILED'));
    } finally {
      this.loading.removeAgent[agent.id] = false;
    }
  }

  openSkillsModal(agent: AgentProfileResponse) {
    this.skillsModal.agent = agent;
    this.skillsModal.form = { skillName: PRESET_SKILLS[0], level: 3 };
    this.skillsModal.alert = null;
    this.skillsModal.open = true;
  }

  closeSkillsModal() {
    this.skillsModal.open = false;
  }

  async confirmAddSkill() {
    const agent = this.skillsModal.agent;
    if (!agent) return;

    this.skillsModal.loading = true;
    try {
      await firstValueFrom(this.assignmentService.addSkill(agent.id, this.skillsModal.form));
      this.setGlobalAlert('success', this.translate.instant('TEAM_MANAGEMENT.ALERT_SKILL_ADDED'));
      
      if (this.selectedTeamId()) {
        await this.selectTeam(this.selectedTeamId()!);
        const updatedAgent = this.teamAgents().find(a => a.id === agent.id);
        if (updatedAgent) this.skillsModal.agent = updatedAgent;
      }
    } catch (e) {
      this.skillsModal.alert = { type: 'error', message: this.translate.instant('TEAM_MANAGEMENT.ALERT_ADD_SKILL_FAILED') };
    } finally {
      this.skillsModal.loading = false;
    }
  }

  async confirmDeleteSkill(skill: AgentSkillResponse) {
    const agent = this.skillsModal.agent;
    if (!agent) return;

    this.loading.deleteSkill[skill.id] = true;
    try {
      await firstValueFrom(this.assignmentService.deleteSkill(agent.id, skill.id));
      this.setGlobalAlert('success', this.translate.instant('TEAM_MANAGEMENT.ALERT_SKILL_REMOVED'));
      
      if (this.selectedTeamId()) {
        await this.selectTeam(this.selectedTeamId()!);
        const updatedAgent = this.teamAgents().find(a => a.id === agent.id);
        if (updatedAgent) this.skillsModal.agent = updatedAgent;
      }
    } catch (e) {
      this.skillsModal.alert = { type: 'error', message: this.translate.instant('TEAM_MANAGEMENT.ALERT_DELETE_SKILL_FAILED') };
    } finally {
      this.loading.deleteSkill[skill.id] = false;
    }
  }
}