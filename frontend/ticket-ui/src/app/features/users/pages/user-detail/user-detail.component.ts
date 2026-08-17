import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService, UserDetailsResponse } from '../../../../core/services/user.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, ButtonComponent, TranslatePipe],
  template: `
    <div class="page-container">
      <div class="page-top">
        <button class="back" (click)="goBack()">← Back to Users</button>
        <h1 class="page-heading">User Details</h1>
      </div>

      <div *ngIf="errorMessage()" class="alert error">{{ errorMessage() }}</div>

      <div *ngIf="!loading() && details()" class="hero-card">
        <div class="hero-left">
          <div class="avatar-wrap">
            <div class="avatar" [ngStyle]="avatarStyle()">{{ avatarInitials() }}</div>
            <span class="online" [class.active]="details()!.user?.active"></span>
          </div>
          <div class="hero-info">
            <div class="hero-name">{{ details()!.user?.fullName }}</div>
            <div class="hero-sub">
              <span class="role-badge large">{{ ('USERS.ROLES.' + details()!.user?.role) | translate }}</span>
              <a class="email-link" href="mailto:{{ details()!.user?.email }}">{{ details()!.user?.email }}</a>
            </div>
            <div class="hero-meta">● <span class="status-text">{{ details()!.user?.active ? ('USERS.STATUS.ACTIVE' | translate) : ('USERS.STATUS.INACTIVE' | translate) }}</span>
              <span class="meta-sep">•</span>
              User ID: <span class="meta-muted">{{ details()!.user?.id }}</span>
              <span class="meta-sep">•</span>
              {{ 'USERS.JOINED' | translate }}: <span class="meta-muted">{{ details()!.user?.createdAt | date:'mediumDate' }}</span>
            </div>
          </div>
        </div>
        <div class="hero-right">
          <div class="hero-actions">
            <app-button variant="secondary" (click)="onEdit()">✎ {{ 'USERS.EDIT' | translate }}</app-button>
            <app-button [loading]="toggling()" (click)="onToggleActive()" variant="primary">{{ details()!.user?.active ? ('USERS.LIST.DEACTIVATE' | translate) : ('USERS.LIST.ACTIVATE' | translate) }}</app-button>
          </div>
          <div class="hero-decor" aria-hidden="true"></div>
        </div>
      </div>

      <div *ngIf="!loading() && details()" class="stats-row">
        <div class="stat big" title="Assigned Tickets">
          <div class="stat-icon" style="background:linear-gradient(135deg, rgba(139,92,246,0.12), rgba(79,110,247,0.08));">🎫</div>
          <div class="stat-body">
            <div class="stat-title">{{ 'USERS.STATS.ASSIGNED' | translate }}</div>
            <div class="stat-number">{{ details()!.ticketStats.totalAssigned }}</div>
            <div class="stat-desc">↑ 12% this month</div>
          </div>
        </div>
        <div class="stat big">
          <div class="stat-icon" style="background:linear-gradient(135deg, rgba(79,110,247,0.08), rgba(34,211,238,0.06));">⚡</div>
          <div class="stat-body">
            <div class="stat-title">{{ 'USERS.STATS.ACTIVE' | translate }}</div>
            <div class="stat-number">{{ details()!.ticketStats.active }}</div>
            <div class="stat-desc">Currently working</div>
          </div>
        </div>
        <div class="stat big">
          <div class="stat-icon" style="background:linear-gradient(135deg, rgba(34,211,238,0.06), rgba(139,92,246,0.06));">✅</div>
          <div class="stat-body">
            <div class="stat-title">{{ 'USERS.STATS.RESOLVED' | translate }}</div>
            <div class="stat-number">{{ details()!.ticketStats.resolvedOrClosed }}</div>
            <div class="stat-desc">Successfully done</div>
          </div>
        </div>
        <div class="stat big">
          <div class="stat-icon" style="background:linear-gradient(135deg, rgba(255,214,165,0.12), rgba(255,238,210,0.06));">⏱️</div>
          <div class="stat-body">
            <div class="stat-title">{{ 'USERS.STATS.AVG_RESPONSE' | translate }}</div>
            <div class="stat-number">—</div>
            <div class="stat-desc">This month</div>
          </div>
        </div>
      </div>

      <div *ngIf="!loading() && details()" class="main-row">
        <section class="info-panel">
          <div class="panel-header"><h3>{{ 'USERS.INFO.TITLE' | translate }}</h3></div>
          <div class="info-rows">
            <div class="info-row"><span class="ri">👤</span><div class="label">{{ 'USERS.INFO.FULL_NAME' | translate }}</div><div class="value">{{ details()!.user?.fullName }}</div></div>
            <div class="info-row"><span class="ri">✉️</span><div class="label">{{ 'USERS.INFO.EMAIL' | translate }}</div><div class="value"><a href="mailto:{{ details()!.user?.email }}">{{ details()!.user?.email }}</a></div></div>
            <div class="info-row"><span class="ri">🏷️</span><div class="label">{{ 'USERS.INFO.ROLE' | translate }}</div><div class="value"><span class="role-badge">{{ ('USERS.ROLES.' + details()!.user?.role) | translate }}</span></div></div>
            <div class="info-row"><span class="ri">⚪</span><div class="label">{{ 'USERS.INFO.STATUS' | translate }}</div><div class="value"><span class="status-dot inline" [class.active]="details()!.user?.active"></span> {{ details()!.user?.active ? ('USERS.STATUS.ACTIVE' | translate) : ('USERS.STATUS.INACTIVE' | translate) }}</div></div>
            <div class="info-row"><span class="ri">📅</span><div class="label">{{ 'USERS.INFO.JOINED' | translate }}</div><div class="value">{{ details()!.user?.createdAt | date:'medium' }}</div></div>
            <div class="info-row"><span class="ri">⏱️</span><div class="label">{{ 'USERS.INFO.LAST_ACTIVITY' | translate }}</div><div class="value">{{ details()!.recentActivity?.[0]?.timestamp | date:'short' }}</div></div>
            <div class="info-row"><span class="ri">🎫</span><div class="label">{{ 'USERS.STATS.ASSIGNED' | translate }}</div><div class="value">{{ details()!.ticketStats.totalAssigned }}</div></div>
            <div class="info-row"><span class="ri">⚡</span><div class="label">{{ 'USERS.STATS.ACTIVE' | translate }}</div><div class="value">{{ details()!.ticketStats.active }}</div></div>
            <div class="info-row"><span class="ri">✅</span><div class="label">{{ 'USERS.STATS.RESOLVED' | translate }}</div><div class="value">{{ details()!.ticketStats.resolvedOrClosed }}</div></div>
          </div>
        </section>

        <aside class="activity-panel">
          <div class="panel-header"><h3>Recent Activity</h3><button class="view-all">View All Activity</button></div>
          <div class="timeline-wrap">
            <div class="timeline-line" aria-hidden="true"></div>
            <ol class="timeline-list">
              <li *ngFor="let a of visibleActivities()">
                <div class="tl-date">{{ a.timestamp | date:'MMM d' }}<div class="tl-time">{{ a.timestamp | date:'h:mm a' }}</div></div>
                <div class="tl-node" [ngStyle]="{'background': nodeColor(a.eventType)}"></div>
                <div class="tl-content">
                  <div class="tl-title">{{ a.message }}</div>
                  <div class="tl-sub">{{ a.ticketTitle ? '"' + a.ticketTitle + '"' : '' }}</div>
                  <div class="tl-meta">{{ a.actorName }} • {{ a.ticketId ? ('#' + a.ticketId) : '' }}</div>
                </div>
              </li>
            </ol>
          </div>
          <div class="load-more-wrap" *ngIf="details()!.recentActivity.length > activitiesLimit()">
            <button class="load-more" (click)="loadMore()">Load more ↓</button>
          </div>
        </aside>
      </div>

      <div *ngIf="loading()" class="loading">Loading...</div>
    </div>
  `,
  styles: [`
    :host{display:block}
    .page-container{width:calc(100% - 48px);max-width:1400px;margin:0 auto;padding:24px 0;color:var(--text-primary)}
    .page-top{display:flex;align-items:center;gap:18px;margin-bottom:18px}
    .back{background:none;border:none;color:var(--accent-violet);cursor:pointer;font-weight:600}
    .page-heading{font-size:28px;margin:0;color:var(--text-primary)}

    .hero-card{display:flex;justify-content:space-between;align-items:center;background:var(--surface);padding:28px;border-radius:14px;box-shadow:0 10px 30px var(--shadow);border:1px solid var(--border);position:relative;overflow:hidden;margin-bottom:20px}
    .hero-left{display:flex;align-items:center;gap:18px}
    .avatar-wrap{position:relative}
    .avatar{width:110px;height:110px;border-radius:999px;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:36px;box-shadow:0 8px 20px rgba(79,110,247,0.12)}
    .online{position:absolute;right:6px;bottom:6px;width:16px;height:16px;border-radius:50%;background:#D1D5DB;border:3px solid var(--surface)}
    .online.active{background:#34D399}
    .hero-info{min-width:420px}
    .hero-name{font-size:32px;font-weight:700}
    .hero-sub{display:flex;align-items:center;gap:12px;margin-top:6px}
    .role-badge.large{padding:8px 12px;border-radius:999px;background:var(--bg-secondary);font-weight:700}
    .email-link{color:var(--text-secondary);text-decoration:none}
    .hero-meta{margin-top:10px;color:var(--text-secondary);font-size:13px}

    .hero-right{display:flex;flex-direction:column;align-items:flex-end;gap:12px}
    .hero-actions{display:flex;gap:12px}
    .hero-decor{width:220px;height:120px;background:linear-gradient(135deg, rgba(139,92,246,0.06), rgba(79,110,247,0.04));border-radius:50px;filter:blur(24px);opacity:0.9}

    .stats-row{display:flex;gap:16px;margin-bottom:18px}
    .stat{flex:1;background:var(--surface);padding:20px;border-radius:14px;border:1px solid var(--border);display:flex;gap:12px;align-items:center;transition:transform .18s ease,box-shadow .18s ease}
    .stat:hover{transform:translateY(-4px);box-shadow:0 14px 30px rgba(11,14,26,0.06)}
    .stat.big{min-height:110px}
    .stat-icon{width:56px;height:56px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px}
    .stat-body{flex:1}
    .stat-title{font-size:14px;color:var(--text-secondary)}
    .stat-number{font-size:32px;font-weight:800;margin-top:6px}
    .stat-desc{font-size:13px;color:var(--text-secondary);margin-top:6px}

    .main-row{display:flex;gap:20px}
    .info-panel{flex:0 0 40%;background:var(--surface);padding:18px;border-radius:12px;border:1px solid var(--border);box-shadow:0 8px 20px var(--shadow)}
    .activity-panel{flex:1;background:var(--surface);padding:18px;border-radius:12px;border:1px solid var(--border);box-shadow:0 8px 20px var(--shadow);display:flex;flex-direction:column}
    .panel-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .panel-header h3{margin:0;font-size:16px}
    .view-all{background:none;border:none;color:var(--accent-blue);cursor:pointer;font-weight:700}

    .info-rows{display:flex;flex-direction:column;gap:8px}
    .info-row{display:flex;align-items:center;gap:12px;padding:10px;border-top:1px solid rgba(11,14,26,0.02)}
    .info-row:first-child{border-top:0}
    .ri{width:28px;text-align:center}
    .label{flex:0 0 160px;color:var(--text-secondary);font-size:13px}
    .value{font-weight:700}
    .status-dot.inline{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:8px;background:#D1D5DB}
    .status-dot.inline.active{background:#34D399}

    .timeline-wrap{position:relative;padding-left:24px}
    .timeline-line{position:absolute;left:40px;top:12px;bottom:12px;width:2px;background:linear-gradient(180deg,var(--bg-secondary),transparent);opacity:0.6}
    .timeline-list{list-style:none;margin:0;padding:0}
    .timeline-list li{display:grid;grid-template-columns:90px 24px 1fr;gap:12px;padding:14px 0;border-bottom:1px dashed rgba(11,14,26,0.03)}
    .tl-date{color:var(--text-secondary);font-size:13px}
    .tl-time{font-size:12px;color:var(--text-secondary);margin-top:6px}
    .tl-node{width:18px;height:18px;border-radius:50%;align-self:start;margin-left:3px;box-shadow:0 4px 10px rgba(11,14,26,0.06)}
    .tl-content{padding-bottom:6px}
    .tl-title{font-weight:700}
    .tl-sub{color:var(--text-secondary);margin-top:6px}
    .tl-meta{color:var(--text-secondary);font-size:13px;margin-top:8px}

    .load-more-wrap{display:flex;justify-content:center;padding:12px}
    .load-more{background:none;border:1px solid var(--border);padding:8px 12px;border-radius:10px;cursor:pointer}

    .alert.error{color:#B91C1C;background:rgba(185,28,28,0.06);padding:10px;border-radius:8px}

    @media (max-width:1100px){.hero-info{min-width:300px}.page-container{width:calc(100% - 32px)}}
    @media (max-width:820px){.main-row{flex-direction:column}.info-panel{flex:1}.timeline-list li{grid-template-columns:80px 20px 1fr}}
  `]
})
export class UserDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private userService = inject(UserService);
  private auth = inject(AuthService);

  details = signal<UserDetailsResponse | null>(null);
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  toggling = signal(false);
  activitiesLimit = signal(6);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Missing user id');
      this.loading.set(false);
      return;
    }
    this.userService.getUserDetails(id).subscribe({
      next: d => {
        this.details.set(d);
        this.loading.set(false);
      },
      error: err => {
        console.error('Failed to load user details', err);
        this.errorMessage.set('Failed to load user details');
        this.loading.set(false);
      }
    });
  }

  goBack() {
    this.router.navigate(['/users']);
  }

  avatarInitials() {
    const name = this.details() && this.details()!.user?.fullName;
    if (!name) return '';
    const parts = name.split(' ');
    return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
  }

  avatarStyle() {
    const name = this.details() && this.details()!.user?.fullName || '';
    const colors = this.gradientFor(name);
    return { 'background-image': `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` };
  }

  private gradientFor(input: string) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = input.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash;
    }
    const hue1 = Math.abs(hash) % 360;
    const hue2 = (hue1 + 45) % 360;
    return [`hsl(${hue1} 80% 60%)`, `hsl(${hue2} 70% 55%)`];
  }

  onEdit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.router.navigate([`/users/${id}/edit`]);
  }

  onToggleActive() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || !this.details()) return;
    const current = !!this.details()!.user?.active;
    this.toggling.set(true);
    this.userService.toggleUserStatus(id, !current).subscribe({
      next: updated => {
        this.details.set({ ...this.details()!, user: { ...updated } });
        this.toggling.set(false);
      },
      error: err => {
        console.error('Failed to toggle user status', err);
        this.errorMessage.set('Failed to change status');
        this.toggling.set(false);
      }
    });
  }

  visibleActivities() {
    const list = this.details() ? (this.details()!.recentActivity || []) : [];
    return list.slice(0, this.activitiesLimit());
  }

  activitiesToShow() { return this.activitiesLimit(); }

  loadMore() {
    const total = this.details() ? this.details()!.recentActivity.length : 0;
    const next = Math.min(total, this.activitiesLimit() + 5);
    this.activitiesLimit.set(next);
  }

  nodeColor(eventType?: string) {
    if (!eventType) return 'linear-gradient(135deg,#F3E8FF,#E9EEFF)';
    const t = (eventType || '').toLowerCase();
    if (t.includes('escalation')) return 'linear-gradient(135deg,#FFECCF,#FFF4E6)';
    if (t.includes('comment')) return 'linear-gradient(135deg,#E8F8FF,#EFF8FF)';
    if (t.includes('status')) return 'linear-gradient(135deg,#E6FFEF,#EEFFF4)';
    return 'linear-gradient(135deg,#F3E8FF,#E9EEFF)';
  }
}
